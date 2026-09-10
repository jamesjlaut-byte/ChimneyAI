import assert from "node:assert/strict";
import {test} from "node:test";
import {MAX_LOCAL_INSPECTIONS,normalizeInspection,saveInspections,serializeInspections,upsertInspection} from "../lib/inspections.ts";

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

test("invalid incoming collections fail atomically instead of dropping records",()=>{
  const raw=JSON.stringify([inspection]);
  for(const incoming of [[{id:inspection.id}],[inspection,{id:"broken"}],[inspection,inspection]]){
    assert.throws(()=>serializeInspections(incoming),/collection was not saved/);
    withStorage(raw,state=>{
      assert.throws(()=>saveInspections(incoming),/collection was not saved/);
      assert.deepEqual(state(),{stored:raw,writes:0});
    });
  }
});

test("51st inspection is rejected without silently evicting unsigned history",()=>{
  const full=Array.from({length:MAX_LOCAL_INSPECTIONS},(_,index)=>({...inspection,id:`inspection-${index}`}));
  const before=JSON.stringify(full),newInspection={...inspection,id:"new-inspection"};
  assert.throws(()=>upsertInspection(full,newInspection),/50-inspection limit/);
  assert.equal(JSON.stringify(full),before);
  assert.throws(()=>serializeInspections([...full,newInspection]),/50-inspection limit/);
  withStorage(before,state=>{
    assert.throws(()=>saveInspections([...full,newInspection]),/50-inspection limit/);
    assert.deepEqual(state(),{stored:before,writes:0});
  });
});

test("existing inspections remain editable at capacity and the 50th record saves",()=>{
  const full=Array.from({length:MAX_LOCAL_INSPECTIONS},(_,index)=>({...inspection,id:`inspection-${index}`}));
  const updated={...full[0],updated_at:"2026-09-10T00:00:00.000Z"};
  const next=upsertInspection(full,updated,full[0]);
  assert.equal(next.length,MAX_LOCAL_INSPECTIONS);
  assert.deepEqual(new Set(next.map(item=>item.id)),new Set(full.map(item=>item.id)));
  withStorage(JSON.stringify(full),state=>{
    saveInspections(next);
    assert.equal(JSON.parse(state().stored)[0].updated_at,updated.updated_at);
    assert.equal(JSON.parse(state().stored).length,MAX_LOCAL_INSPECTIONS);
  });
  const partial=full.slice(0,-1),last=full.at(-1);
  withStorage(JSON.stringify(partial),state=>{
    saveInspections(upsertInspection(partial,last));
    assert.equal(JSON.parse(state().stored).length,MAX_LOCAL_INSPECTIONS);
  });
});

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
