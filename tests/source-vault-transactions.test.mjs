import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {test} from "node:test";
import {deleteStoredSourceFile,getStoredSourceFile,listStoredSourceFiles,writeVerifiedSourceFile} from "../lib/source-file-store.ts";

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
        get:()=>request(),getAll:()=>request(),put:()=>request(),delete:()=>request()
      }}};
      function request(){
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
