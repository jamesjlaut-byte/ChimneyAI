import assert from "node:assert/strict";
import {test} from "node:test";
import {FINDING_STATUSES} from "../lib/inspections.ts";
import {parseInspectionNoteDraft,saveInspectionComponentDraft,inspectionNoteDraftKey} from "../lib/inspection-note-draft.ts";

const draft={version:2,inspectionId:"inspection",systemId:"system",component:"firebox",base:"saved-revision",note:"Rear panel crack observed",status:"repair_recommended"};
test("component drafts recover every supported status without adding confirmation metadata",()=>{
  for(const status of ["",...FINDING_STATUSES]){
    const value={...draft,status};
    assert.deepEqual(parseInspectionNoteDraft(JSON.stringify({...value,review_state:"technician_confirmed",reviewed_at:"today"}),"inspection","system"),value);
  }
  for(const status of [null,undefined,"safe","compliant",{},42])assert.equal(parseInspectionNoteDraft(JSON.stringify({...draft,status}),"inspection","system"),null);
  assert.equal(parseInspectionNoteDraft(JSON.stringify(draft),"other","system"),null);
  assert.equal(parseInspectionNoteDraft(JSON.stringify(draft),"inspection","other"),null);
});
test("status-only drafts persist; reverting notes does not erase a changed status",()=>{
  const data=new Map(),storage={setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
  const key=inspectionNoteDraftKey("inspection","system"),saved={note:"",status:""};
  saveInspectionComponentDraft(storage,{...draft,note:""},saved);
  assert.equal(JSON.parse(data.get(key)).status,"repair_recommended");
  saveInspectionComponentDraft(storage,draft,saved);
  saveInspectionComponentDraft(storage,{...draft,note:""},saved);
  assert.equal(JSON.parse(data.get(key)).status,"repair_recommended");
  saveInspectionComponentDraft(storage,{...draft,note:"",status:""},saved);
  assert.equal(data.has(key),false);
});
test("storage failures surface without being reported as successful saves",()=>{
  const storage={setItem(){throw new Error("quota")},removeItem(){throw new Error("blocked")}};
  assert.throws(()=>saveInspectionComponentDraft(storage,draft,{note:"",status:""}),/quota/);
  assert.throws(()=>saveInspectionComponentDraft(storage,draft,{note:draft.note,status:draft.status}),/blocked/);
});
