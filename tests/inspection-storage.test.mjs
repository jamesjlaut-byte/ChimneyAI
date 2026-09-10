import assert from "node:assert/strict";
import {test} from "node:test";
import {normalizeInspection,saveInspections} from "../lib/inspections.ts";

function withStorage(raw,run,{readError=false,writeError=false}={}){
  const priorWindow=Object.getOwnPropertyDescriptor(globalThis,"window");
  const priorStorage=Object.getOwnPropertyDescriptor(globalThis,"localStorage");
  let stored=raw,writes=0;
  Object.defineProperty(globalThis,"window",{configurable:true,value:{}});
  Object.defineProperty(globalThis,"localStorage",{configurable:true,value:{
    getItem(){if(readError)throw new Error("Access denied");return stored},
    setItem(_key,value){if(writeError)throw new Error("Quota exceeded");writes++;stored=value}
  }});
  try{run(()=>({stored,writes}))}finally{
    if(priorWindow)Object.defineProperty(globalThis,"window",priorWindow);else delete globalThis.window;
    if(priorStorage)Object.defineProperty(globalThis,"localStorage",priorStorage);else delete globalThis.localStorage;
  }
}

const inspection=normalizeInspection({version:1,id:"test",created_at:"2026-09-09T00:00:00Z",updated_at:"2026-09-09T00:00:00Z",
  customer:{id:"customer"},property:{id:"property",customer_id:"customer"},technician:{id:"tech"},systems:[]});
assert.ok(inspection);

test("unreadable or malformed inspection storage cannot be overwritten",()=>{
  for(const raw of ["", "broken JSON", "null", "{}", '[{"id":"incomplete"}]',JSON.stringify([inspection,{id:"broken"}]),JSON.stringify([inspection,inspection])]){
    withStorage(raw,state=>{
      assert.throws(()=>saveInspections([inspection]),/Nothing was overwritten/);
      assert.deepEqual(state(),{stored:raw,writes:0});
    });
  }
  withStorage("protected data",state=>{
    assert.throws(()=>saveInspections([inspection]),/Nothing was overwritten/);
    assert.equal(state().writes,0);
  },{readError:true});
});

test("new and valid inspection collections still save",()=>{
  for(const raw of [null,"[]",JSON.stringify([inspection])])withStorage(raw,state=>{
    saveInspections([inspection]);
    assert.equal(state().writes,1);
    assert.deepEqual(JSON.parse(state().stored),[inspection]);
  });
});

test("failed writes retain the previous inspection collection",()=>{
  const raw=JSON.stringify([inspection]);
  withStorage(raw,state=>{
    assert.throws(()=>saveInspections([inspection]),/storage is full or unavailable/);
    assert.deepEqual(state(),{stored:raw,writes:0});
  },{writeError:true});
});
