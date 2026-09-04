import {MAX_CHAT_REQUEST_BYTES} from "./chat-request.ts";

type UploadPayload={attachments:Array<{kind:string;data_url?:string}>}&Record<string,unknown>;
export function estimateChatUploadBytes(payload:UploadPayload){
  let imageBytes=0;
  const attachments=payload.attachments.map(a=>{
    if(a.kind!=="image"||!a.data_url)return a;
    const encoded=a.data_url.slice(a.data_url.indexOf(",")+1);
    imageBytes+=Math.floor(encoded.length*3/4)-(encoded.endsWith("==")?2:encoded.endsWith("=")?1:0);
    return {...a,data_url:""};
  });
  // Conservative allowance for multipart part headers and boundary delimiters.
  return imageBytes+new TextEncoder().encode(JSON.stringify({...payload,attachments})).byteLength+4096;
}

// Keep the browser → server hop binary. Only the model adapter needs data URLs.
export async function encodeChatUpload(payload:UploadPayload){
  const form=new FormData();
  const attachments=[];
  for(const [index,attachment] of payload.attachments.entries()){
    if(attachment.kind==="image"&&attachment.data_url){
      if(!/^data:image\/(jpeg|png|webp|gif);base64,/.test(attachment.data_url))throw new Error("Invalid prepared photo format.");
      // Do not fetch(data:): production connect-src deliberately disallows it.
      const [header,encoded]=attachment.data_url.split(",");
      const binary=atob(encoded),bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
      const blob=new Blob([bytes],{type:header.slice(5,-7)});
      form.append(`photo-${index}`,blob,`photo-${index}`);
      attachments.push({...attachment,data_url:""});
    }else attachments.push(attachment);
  }
  form.append("metadata",JSON.stringify({...payload,attachments}));
  const response=new Response(form);
  const contentType=response.headers.get("content-type")!;
  const body=await response.blob();
  if(body.size>MAX_CHAT_REQUEST_BYTES)throw new Error("This photo batch plus conversation exceeds the 4 MB transmission budget. Send fewer photos together; your originals do not need resizing.");
  // Blob.type lowercases its value, corrupting case-sensitive browser boundaries.
  return {body,contentType};
}

export async function decodeChatUpload(req:Request):Promise<unknown>{
  const reader=req.body?.getReader();
  if(!reader)throw new Error("invalid_request");
  const chunks:Uint8Array<ArrayBuffer>[]= [];let size=0;
  while(true){
    const {done,value}=await reader.read();if(done)break;
    size+=value.byteLength;
    if(size>MAX_CHAT_REQUEST_BYTES){await reader.cancel();throw new Error("payload_too_large")}
    chunks.push(new Uint8Array(value));
  }
  const body=new Blob(chunks),type=req.headers.get("content-type")||"";
  if(!type.startsWith("multipart/form-data"))return JSON.parse(await body.text());
  const form=await new Response(body,{headers:{"content-type":type}}).formData();
  const metadata=form.get("metadata");
  if(typeof metadata!=="string")throw new Error("invalid_request");
  const payload:unknown=JSON.parse(metadata);
  if(!payload||typeof payload!=="object"||!("attachments" in payload)||!Array.isArray(payload.attachments)||payload.attachments.length>6)throw new Error("invalid_request");
  for(const [index,attachment] of payload.attachments.entries()){
    if(!attachment||typeof attachment!=="object")throw new Error("invalid_request");
    if(attachment.kind!=="image")continue;
    const file=form.get(`photo-${index}`);
    if(!(file instanceof Blob)||!/^image\/(jpeg|png|webp|gif)$/.test(file.type)||file.type!==attachment.mime_type||file.size===0)throw new Error("invalid_request");
    if(attachment.image_optimized){
      const digest=await crypto.subtle.digest("SHA-256",await file.arrayBuffer());
      const hash=Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
      if(attachment.sha256!==hash||attachment.byte_size!==file.size)throw new Error("invalid_request");
    }
    attachment.data_url=`data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  }
  return payload;
}
