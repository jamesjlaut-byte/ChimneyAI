import {test} from "node:test";
import assert from "node:assert/strict";
import {encodeChatUpload,decodeChatUpload,estimateChatUploadBytes} from "../lib/chat-upload.ts";
import {createHash} from "node:crypto";
import {parseChatRequest,MAX_CHAT_REQUEST_BYTES} from "../lib/chat-request.ts";

test("six binary photo uploads survive multipart transport without base64 overhead",async()=>{
  const data_url=`data:image/jpeg;base64,${Buffer.alloc(550000,42).toString("base64")}`;
  const payload={mode:"pro",messages:[{role:"user",content:"Test"}],attachments:Array.from({length:6},(_,i)=>({kind:"image",name:`photo${i}.jpg`,mime_type:"image/jpeg",data_url}))};
  const {body,contentType}=await encodeChatUpload(payload);
  assert.ok(body.size<3_400_000);
  assert.ok(estimateChatUploadBytes(payload)>=body.size);
  assert.match(body.type,/multipart\/form-data;\s*boundary=/);
  const decoded=await decodeChatUpload(new Request("http://localhost/api/chat",{method:"POST",headers:{"content-type":contentType},body}));
  assert.equal(parseChatRequest(decoded).success,true);
  assert.deepEqual(decoded,payload);
});

test("multipart encoder enforces the actual 4 MB boundary before transmission",async()=>{
  const payload=bytes=>({mode:"pro",messages:[{role:"user",content:"Boundary test"}],attachments:[{
    kind:"image",name:"photo.jpg",mime_type:"image/jpeg",data_url:`data:image/jpeg;base64,${Buffer.alloc(bytes,42).toString("base64")}`
  }]});
  const sample=await encodeChatUpload(payload(3));
  const framing=sample.body.size-3;
  const exact=await encodeChatUpload(payload(MAX_CHAT_REQUEST_BYTES-framing));
  assert.equal(exact.body.size,MAX_CHAT_REQUEST_BYTES);
  const decoded=await decodeChatUpload(new Request("http://localhost/api/chat",{method:"POST",headers:{"content-type":exact.contentType},body:exact.body}));
  // Transport accepts this body; the separate per-image schema ceiling rejects it safely.
  assert.equal(parseChatRequest(decoded).success,false);
  await assert.rejects(encodeChatUpload(payload(MAX_CHAT_REQUEST_BYTES-framing+1)),/transmission budget/);
});

test("image schema validates base64 padding and rejects malformed input without throwing",()=>{
  const parse=data_url=>parseChatRequest({mode:"pro",messages:[{role:"user",content:"Test"}],attachments:[{kind:"image",name:"photo.jpg",mime_type:"image/jpeg",data_url}]});
  for(const encoded of ["YQ==","YWI=","YWJj","+/8="])assert.equal(parse(`data:image/jpeg;base64,${encoded}`).success,true);
  for(const encoded of ["","A","AAA","====","A===","AA=A","AA==AAAA","YW Jj","YWJj\n"])assert.equal(parse(`data:image/jpeg;base64,${encoded}`).success,false);
  assert.equal(parse(`data:image/jpeg;base64,${"A".repeat(5_400_000)}`).success,false);
  assert.equal(parse(`data:image/jpeg;base64,${"A".repeat(4_400_000)}!`).success,false);
});

test("six photos with Unicode metadata remain below the client estimate",async()=>{
  const payload={mode:"pro",messages:[{role:"user",content:"Inspect cheminée 🧱\n".repeat(100)}],attachments:Array.from({length:6},(_,i)=>({
    kind:"image",name:`煙突-${i}-🧱.jpg`,mime_type:"image/jpeg",data_url:`data:image/jpeg;base64,${Buffer.alloc(550000+i,42).toString("base64")}`
  }))};
  const upload=await encodeChatUpload(payload);
  assert.ok(estimateChatUploadBytes(payload)>=upload.body.size);
  assert.ok(estimateChatUploadBytes(payload)<MAX_CHAT_REQUEST_BYTES);
  const decoded=await decodeChatUpload(new Request("http://localhost/api/chat",{method:"POST",headers:{"content-type":upload.contentType},body:upload.body}));
  assert.deepEqual(decoded,payload);
});

test("optimized image fingerprint describes transmitted bytes, not original",async()=>{
  const bytes=Buffer.from([255,216,255,217]);
  const photo={kind:"image",name:"phone.heic",mime_type:"image/jpeg",image_optimized:true,byte_size:bytes.length,sha256:createHash("sha256").update(bytes).digest("hex"),original_byte_size:12*1024*1024,original_sha256:"a".repeat(64),original_mime_type:"image/heic",data_url:`data:image/jpeg;base64,${bytes.toString("base64")}`};
  const payload={mode:"pro",messages:[{role:"user",content:"Test"}],attachments:[photo]};
  const upload=await encodeChatUpload(payload);
  const decoded=await decodeChatUpload(new Request("http://localhost/api/chat",{method:"POST",body:upload.body,headers:{"content-type":upload.contentType}}));
  assert.equal(parseChatRequest(decoded).success,true);
  const bad=await encodeChatUpload({...payload,attachments:[{...photo,sha256:photo.original_sha256}]});
  await assert.rejects(decodeChatUpload(new Request("http://localhost/api/chat",{method:"POST",body:bad.body,headers:{"content-type":bad.contentType}})),/invalid_request/);
});
test("streamed oversized bodies are rejected even without content-length",async()=>{
  const req=new Request("http://localhost/api/chat",{method:"POST",body:new Blob([new Uint8Array(MAX_CHAT_REQUEST_BYTES+1)])});
  await assert.rejects(decodeChatUpload(req),/payload_too_large/);
});

test("a single detailed photo can use the full binary image budget",async()=>{
  const data_url=`data:image/jpeg;base64,${Buffer.alloc(3_300_000,42).toString("base64")}`;
  const payload={mode:"pro",messages:[{role:"user",content:"Test"}],attachments:[{kind:"image",name:"detailed.jpg",mime_type:"image/jpeg",data_url}]};
  const {body,contentType}=await encodeChatUpload(payload);
  const decoded=await decodeChatUpload(new Request("http://localhost/api/chat",{method:"POST",body,headers:{"content-type":contentType}}));
  assert.equal(parseChatRequest(decoded).success,true);
});
test("legacy JSON stays supported and missing multipart photos fail",async()=>{
  const payload={mode:"homeowner",messages:[{role:"user",content:"Question"}]};
  assert.deepEqual(await decodeChatUpload(new Request("http://localhost/api/chat",{method:"POST",body:JSON.stringify(payload)})),payload);
  const form=new FormData();form.append("metadata",JSON.stringify({attachments:[{kind:"image",mime_type:"image/jpeg"}]}));
  await assert.rejects(decodeChatUpload(new Request("http://localhost/api/chat",{method:"POST",body:form})),/invalid_request/);
});

test("case-sensitive browser multipart boundaries survive Blob transport",async()=>{
  const boundary="WebKitFormBoundaryAbCdEf";
  const metadata=JSON.stringify({attachments:[]});
  const body=new Blob([`--${boundary}\r\nContent-Disposition: form-data; name="metadata"\r\n\r\n${metadata}\r\n--${boundary}--\r\n`]);
  const decoded=await decodeChatUpload(new Request("http://localhost/api/chat",{method:"POST",body,headers:{"content-type":`multipart/form-data; boundary=${boundary}`}}));
  assert.deepEqual(decoded,{attachments:[]});
});
