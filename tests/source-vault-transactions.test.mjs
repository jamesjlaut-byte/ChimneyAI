import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {test} from "node:test";
import {deleteStoredSourceFile,getStoredSourceFile,listStoredSourceFiles,persistAttachmentBytes,persistRawFile,verifyStoredSourceFile,writeVerifiedSourceFile} from "../lib/source-file-store.ts";

// Simulate transaction events independently of request success. In particular,
// an abort can follow a successful request without firing an error event.
function vaultHarness(t,outcomes){
  let opened=0,closed=0;
  const previous=Object.getOwnPropertyDescriptor(globalThis,"indexedDB");
  Object.defineProperty(globalThis,"indexedDB",{configurable:true,value:{open(){
    opened++;
    const db={close(){closed++},transaction(){
      const outcome=outcomes.shift();
      assert.ok(outcome,"unexpected transaction");
      if(outcome.throw)throw outcome.throw;
      const tx={error:outcome.error||null,objectStore(){return {
        get:key=>request("get",key),getAll:()=>request("getAll"),put:value=>request("put",value),delete:key=>request("delete",key)
      }}};
      function request(operation,value){
        outcome.inspect?.(operation,value);
        if(outcome.requestThrow)throw outcome.requestThrow;
        const req={result:outcome.result,error:outcome.error||null};
        queueMicrotask(()=>{
          if(outcome.event==="error"){req.onerror?.();return}
          req.onsuccess?.();
          setTimeout(()=>{
            if(outcome.event==="abort")tx.onabort?.();
            else tx.oncomplete?.();
          },5);
        });
        return req;
      }
      return tx;
    }};
    const req={result:db};
    queueMicrotask(()=>req.onsuccess?.());
    return req;
  }}});
  t.after(()=>{
    if(previous)Object.defineProperty(globalThis,"indexedDB",previous);
    else delete globalThis.indexedDB;
  });
  return {assertClosed(){assert.equal(closed,opened);assert.equal(outcomes.length,0)}};
}

test("vault reads and lists reject transaction aborts after request success",{timeout:2000},async t=>{
  const harness=vaultHarness(t,[{event:"abort",result:{name:"not committed"}},{event:"abort",result:[]}]);
  await assert.rejects(getStoredSourceFile("source"),/transaction was aborted/);
  await assert.rejects(listStoredSourceFiles(),/transaction was aborted/);
  harness.assertClosed();
});

test("chat persists a 16 MiB original, not its optimized AI copy, then verifies the saved bytes",{timeout:5000},async t=>{
  const original=new Blob([new Uint8Array(16*1024*1024).fill(42)],{type:"image/jpeg"});
  const sha256=createHash("sha256").update(Buffer.from(await original.arrayBuffer())).digest("hex");
  const optimized=new Blob(["small optimized JPEG fixture"],{type:"image/jpeg"});
  const optimizedHash=createHash("sha256").update(Buffer.from(await optimized.arrayBuffer())).digest("hex");
  let saved;
  const verificationRead={};
  const harness=vaultHarness(t,[
    {result:null,inspect:(operation,key)=>{assert.equal(operation,"get");assert.equal(key,sha256)}},
    {result:sha256,inspect:(operation,record)=>{
      assert.equal(operation,"put");saved=record;verificationRead.result=structuredClone(record);
    }},
    verificationRead
  ]);
  await persistAttachmentBytes({
    id:"phone-original",prepared_at:"2026-09-09T12:00:00.000Z",
    kind:"image",name:"phone.jpg",mime_type:"image/jpeg",byte_size:optimized.size,sha256:optimizedHash,
    original_blob:original,original_sha256:sha256,original_byte_size:original.size,original_mime_type:"image/jpeg",
    image_optimized:true,data_url:`data:image/jpeg;base64,${Buffer.from(await optimized.arrayBuffer()).toString("base64")}`
  });
  assert.equal(saved.blob,original);
  assert.equal(saved.byte_size,16*1024*1024);
  assert.equal(saved.sha256,sha256);
  assert.notEqual(saved.sha256,optimizedHash);
  const verification=await verifyStoredSourceFile(sha256);
  assert.equal(verification.match,true);
  assert.equal(verification.computed,sha256);
  harness.assertClosed();
});

test("guided preview survives actual chat persistence and raw-file restoration",{timeout:2000},async t=>{
  const original=new File(["original HEIC fixture bytes"],"field.heic",{type:"image/heic"});
  const sha256=createHash("sha256").update(Buffer.from(await original.arrayBuffer())).digest("hex");
  const preview=new Blob(["guided inspection preview"],{type:"image/jpeg"});
  const existing={sha256,name:original.name,mime_type:original.type,byte_size:original.size,
    saved_at:"2026-09-01T12:00:00.000Z",blob:original,preview_blob:preview};
  // Structured clones represent reopening IndexedDB records, rather than sharing
  // the same in-memory Blob instance. No put transaction should be necessary.
  const harness=vaultHarness(t,[{result:structuredClone(existing)},{result:structuredClone(existing)}]);
  const chat=await persistAttachmentBytes({id:"restored-photo",prepared_at:"2026-09-09T12:00:00.000Z",kind:"image",name:original.name,mime_type:"image/jpeg",
    byte_size:100,sha256:"a".repeat(64),image_optimized:true,original_blob:original,
    original_sha256:sha256,original_byte_size:original.size,original_mime_type:original.type});
  const restored=await persistRawFile(new File([original],"source-file",{type:"application/octet-stream"}),sha256);
  for(const result of [chat,restored]){
    assert.equal(result.status,"already_present");
    assert.equal(await result.file.preview_blob.text(),await preview.text());
    assert.equal(result.file.name,original.name);
    assert.equal(result.file.mime_type,original.type);
    assert.equal(result.file.saved_at,existing.saved_at);
    assert.equal(await result.file.blob.text(),await original.text());
  }
  harness.assertClosed();
});

test("chat rejects substituted originals and optimized-only attachments before any vault access",{timeout:2000},async t=>{
  const original=Buffer.from("original evidence"),altered=Buffer.from(original);altered[0]^=1;
  const sha256=createHash("sha256").update(original).digest("hex");
  const harness=vaultHarness(t,[]);
  const attachment={id:"tampered-photo",prepared_at:"2026-09-09T12:00:00.000Z",kind:"image",name:"photo.jpg",mime_type:"image/jpeg",byte_size:10,
    sha256:"a".repeat(64),original_sha256:sha256,original_byte_size:original.length,
    image_optimized:true,data_url:"data:image/jpeg;base64,YWJj"};
  await assert.rejects(persistAttachmentBytes({...attachment,original_blob:new Blob([altered])}),/do not match the target SHA-256/);
  await assert.rejects(persistAttachmentBytes(attachment),/original bytes.*not available/);
  await assert.rejects(persistRawFile(new File([altered],"replacement.jpg"),sha256),/do not match the target SHA-256/);
  harness.assertClosed();
});

test("aborted vault saves release the write queue for a successful retry",{timeout:2000},async t=>{
  const harness=vaultHarness(t,[{result:null},{event:"abort"},{result:null},{result:"key"}]);
  const blob=new Blob(["original evidence"]);
  const sha256=createHash("sha256").update(Buffer.from(await blob.arrayBuffer())).digest("hex");
  const incoming={sha256,blob,byte_size:blob.size,name:"photo.jpg",mime_type:"image/jpeg"};
  const failed=writeVerifiedSourceFile(incoming);
  const retry=writeVerifiedSourceFile(incoming);
  await assert.rejects(failed,/transaction was aborted/);
  assert.equal((await retry).status,"created");
  harness.assertClosed();
});

test("vault preserves storage error details and closes failed connections",{timeout:2000},async t=>{
  const quota=new DOMException("Device storage is full","QuotaExceededError");
  const unavailable=new DOMException("Database connection unavailable","InvalidStateError");
  const harness=vaultHarness(t,[
    {event:"abort",error:quota},
    {event:"error",error:quota},
    {throw:unavailable},
    {requestThrow:unavailable}
  ]);
  await assert.rejects(deleteStoredSourceFile("source"),error=>error===quota);
  await assert.rejects(getStoredSourceFile("source"),error=>error===quota);
  await assert.rejects(listStoredSourceFiles(),error=>error===unavailable);
  await assert.rejects(deleteStoredSourceFile("source"),error=>error===unavailable);
  harness.assertClosed();
});

test("committed vault reads, lists and deletes complete and close connections",{timeout:2000},async t=>{
  const record={name:"preserved photo"};
  const harness=vaultHarness(t,[{result:record},{result:[record]},{result:undefined}]);
  assert.equal(await getStoredSourceFile("source"),record);
  assert.deepEqual(await listStoredSourceFiles(),[record]);
  await deleteStoredSourceFile("source");
  harness.assertClosed();
});
