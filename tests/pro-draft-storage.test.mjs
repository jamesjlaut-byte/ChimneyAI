import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {clearProDraft,loadProDraft,parseProDraft,saveProDraft} from "../lib/pro-draft.ts";

const draft=parseProDraft({version:1,saved_at:"2026-09-10T00:00:00Z",text:"Unsaved question"});
function storage(raw,run,{readFailure=false,removeFailure=false}={}){
  const oldWindow=Object.getOwnPropertyDescriptor(globalThis,"window"),oldStorage=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
  let value=raw,writes=0,removes=0;
  Object.defineProperty(globalThis,"window",{configurable:true,value:{}});
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{
    getItem(){if(readFailure)throw new Error("Denied");return value},
    setItem(_key,next){writes++;value=next},
    removeItem(){if(removeFailure)throw new Error("Denied");removes++;value=null}
  }});
  try{run(()=>({value,writes,removes}))}finally{
    if(oldWindow)Object.defineProperty(globalThis,"window",oldWindow);else delete globalThis.window;
    if(oldStorage)Object.defineProperty(globalThis,"localStorage",oldStorage);else delete globalThis.localStorage;
  }
}

test("unreadable draft cannot be automatically overwritten or cleared",()=>{
  for(const raw of ["", "broken JSON", "null", "{}", '{"version":2,"saved_at":"today"}'])storage(raw,state=>{
    assert.equal(loadProDraft(),null);
    assert.throws(()=>saveProDraft(draft),/paused to preserve/);
    assert.throws(()=>clearProDraft(),/paused to preserve/);
    assert.deepEqual(state(),{value:raw,writes:0,removes:0});
  });
  storage("protected",state=>{
    assert.throws(()=>saveProDraft(draft),/paused to preserve/);
    assert.throws(()=>clearProDraft(),/paused to preserve/);
    assert.equal(state().removes,0);assert.equal(state().writes,0);
  },{readFailure:true});
});

test("valid drafts still save and clear; deliberate discard can remove malformed data",()=>{
  for(const raw of [null,JSON.stringify(draft)])storage(raw,state=>{
    saveProDraft(draft);assert.equal(loadProDraft().text,draft.text);
    clearProDraft();assert.equal(state().value,null);
  });
  storage("broken JSON",state=>{
    clearProDraft({confirmedDiscard:true});assert.equal(state().removes,1);
  });
});

test("failed explicit discard preserves stored bytes and UI resets occur only after success",()=>{
  storage("broken JSON",state=>{
    assert.throws(()=>clearProDraft({confirmedDiscard:true}),/Denied/);
    assert.equal(state().value,"broken JSON");
  },{removeFailure:true});
  const source=readFileSync(new URL("../components/ChimneyChat.tsx",import.meta.url),"utf8");
  const fn=source.slice(source.indexOf("function discardActiveDraft()"),source.indexOf("function loadCaseIntoChat("));
  assert.ok(fn.indexOf("window.confirm")<fn.indexOf("confirmedDiscard:true"));
  assert.ok(fn.indexOf("confirmedDiscard:true")<fn.indexOf("contextBoundary.invalidate()"));
  assert.match(fn,/catch\{setDraftStatus\([\s\S]*?;return\}/);
});
