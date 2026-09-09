import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

// Component wiring guards complement the browser case-switch test. These do
// not simulate React scheduling or establish physical-device acceptance.
const chat=readFileSync(new URL("../components/ChimneyChat.tsx",import.meta.url),"utf8");
const load=chat.slice(chat.indexOf("function loadCaseIntoChat"),chat.indexOf("return <div className={`chatExperience"));

test("local and cloud case activation share the attachment/request reset boundary",()=>{
  assert.match(chat,/onLoad=\{loadCaseIntoChat\}/);
  assert.match(chat,/const opened=loadCaseIntoChat\(\{source:c.source/);
  assert.match(load,/if\(preparing\).*return false/);
  assert.ok(load.indexOf("window.confirm")<load.indexOf("controller.abort"));
  assert.match(load,/controller.abort\(\);requestRef.current=null;setBusy\(false\)/);
  assert.match(load,/attachmentsRef.current=\[\];setAttachments\(\[\]\)/);
  assert.match(load,/setText\(loaded.question\)/,"empty loaded question must clear the old question too");
  assert.doesNotMatch(load,/deleteStoredSourceFile|clearProDraft/);
});

test("cancelled local activation cannot change the case being edited",()=>{
  const manager=readFileSync(new URL("../components/ProCaseManager.tsx",import.meta.url),"utf8");
  const fn=manager.slice(manager.indexOf("function loadCase(c:"),manager.indexOf("async function syncCloud"));
  assert.ok(fn.indexOf("if(!loaded)")<fn.indexOf("setEditingId(c.id)"));
  assert.match(chat,/if\(opened\)setCaseManagerEpoch/);
  assert.match(chat,/<ProCaseManager key=\{caseManagerEpoch\}/,"cloud activation must reset the prior local edit target");
});

test("new-chat and discard actions cannot race an unfinished photo preparation",()=>{
  for(const name of ["startNewChat","discardActiveDraft"]){
    const fn=chat.slice(chat.indexOf(`function ${name}()`));
    assert.match(fn,/^function \w+\(\)\{\s+if\(preparing\)\{[^}]*return\}/);
  }
  const cloud=readFileSync(new URL("../components/CloudCaseBrowser.tsx",import.meta.url),"utf8");
  assert.match(cloud,/opened===false\?"Cloud case copied into Saved Pro Cases. The active conversation was not replaced."/);
});
