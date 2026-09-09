import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {createChatContextBoundary} from "../lib/chat-context-boundary.ts";

test("late photo and metadata results from a previous context cannot commit",async()=>{
  const boundary=createChatContextBoundary();
  const oldPhoto=boundary.capture(),oldMetadata=boundary.capture();
  let complete;
  const decoding=new Promise(resolve=>{complete=resolve});
  let attachments=[],records=["new case evidence"];
  const restore=(async()=>{await decoding;if(oldPhoto())attachments.push("old photo");if(oldMetadata())records=["old case evidence"]})();
  boundary.invalidate();
  complete();await restore;
  assert.deepEqual(attachments,[]);
  assert.deepEqual(records,["new case evidence"]);
  const current=boundary.capture();
  assert.equal(current(),true);
  if(current())attachments.push("current case photo");
  assert.deepEqual(attachments,["current case photo"]);
});

test("ordinary renders and cancelled switches preserve valid work; repeated switches invalidate it",()=>{
  const boundary=createChatContextBoundary(),first=boundary.capture();
  assert.equal(boundary.capture()(),true);
  assert.equal(first(),true);
  boundary.invalidate();const second=boundary.capture();boundary.invalidate();
  assert.equal(first(),false);assert.equal(second(),false);assert.equal(boundary.capture()(),true);
});

test("all destructive context transitions invalidate the vault only after confirmation",()=>{
  const chat=readFileSync(new URL("../components/ChimneyChat.tsx",import.meta.url),"utf8");
  for(const name of ["startNewChat","discardActiveDraft","loadCaseIntoChat"]){
    const start=chat.indexOf(`function ${name}(`),end=chat.indexOf("\n  }",start);
    const fn=chat.slice(start,end);
    assert.ok(fn.indexOf("contextBoundary.invalidate()")>fn.indexOf("window.confirm"));
    assert.match(fn,/setVaultEpoch/);
  }
  assert.match(chat,/<SourceManifest key=\{vaultEpoch\}/);
  assert.match(chat,/if\(isCurrentVaultContext\(\)\)setSourceFiles\(records\)/);
  assert.match(chat,/isCurrentVaultContext\(\)\?attachFromVault\(attachment\):"stale"/);
});
