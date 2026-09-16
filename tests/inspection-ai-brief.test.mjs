import assert from "node:assert/strict";
import {test} from "node:test";
import {buildInspectionAiBrief} from "../lib/inspection-ai-brief.ts";
import {getInspectionChecklist} from "../lib/inspection-checklists.ts";
import {parseChatRequest} from "../lib/chat-request.ts";

const base={updated_at:"2026-09-15T12:00:00Z",inspection_type:"level_2",customer:{first_name:"PRIVATE CUSTOMER"},property:{street_address:"PRIVATE ADDRESS"},technician:{name:"PRIVATE TECH"},systems:[{id:"one",system_type:"masonry_fireplace",manufacturer:"",model:""},{id:"two",system_type:"wood_stove",manufacturer:"OTHER SYSTEM",model:""}],findings:[{id:"f",system_id:"one",component:"firebox",status:"repair_recommended",raw_note:"Crack observed in rear firebox.",ai_suggestion:"UNCONFIRMED AI"},{id:"g",system_id:"one",component:"flue",status:"unable_to_inspect",raw_note:"Access unavailable"},{id:"h",system_id:"two",component:"firebox",status:"satisfactory",raw_note:"OTHER SYSTEM NOTE"}],photos:[{system_id:"two",finding_ids:["f"]}],measurements:[{value:999}]};
const data=brief=>JSON.parse(brief.split("SAVED INSPECTION DATA:\n")[1]);
test("brief scopes saved observations to first system without customer or AI suggestion fields",()=>{
  const brief=buildInspectionAiBrief(base),snapshot=data(brief);
  for(const excluded of ["PRIVATE CUSTOMER","PRIVATE ADDRESS","PRIVATE TECH","UNCONFIRMED AI","OTHER SYSTEM NOTE","999"])assert.ok(!brief.includes(excluded));
  assert.equal(snapshot.other_systems_not_included,1);
  const firebox=snapshot.components.find(c=>c.component==="Firebox");
  assert.equal(firebox.saved_technician_note,"Crack observed in rear firebox.");
  assert.equal(firebox.linked_photo_records,0);
  assert.equal(firebox.recommended_photo_missing,true);
  assert.equal(snapshot.components.find(c=>c.component==="Flue interior").recommended_photo_missing,false);
  assert.equal(snapshot.components[0].status,"not_documented");
  assert.match(brief,/metadata only/);
  assert.match(brief,/untrusted field data/);
  assert.ok(parseChatRequest({mode:"pro",messages:[{role:"user",content:brief}]}).success);
});
test("linked photo metadata resolves gaps without pretending the image was analyzed",()=>{
  const snapshot=data(buildInspectionAiBrief({...base,photos:[{system_id:"one",finding_ids:["f"]}]}));
  const firebox=snapshot.components.find(c=>c.component==="Firebox");
  assert.equal(firebox.linked_photo_records,1);assert.equal(firebox.recommended_photo_missing,false);
});
test("long escaped notes stay inside chat limits with truncation disclosed",()=>{
  const findings=getInspectionChecklist("masonry_fireplace","level_2").map((c,i)=>({id:String(i),system_id:"one",component:c.id,status:"monitor",raw_note:"\u0000".repeat(5000)}));
  const brief=buildInspectionAiBrief({...base,findings});
  assert.ok(brief.length<20000);
  assert.ok(data(brief).components.every(c=>c.note_truncated));
  assert.ok(parseChatRequest({mode:"pro",messages:[{role:"user",content:brief}]}).success);
  assert.equal(buildInspectionAiBrief({...base,systems:[]}),null);
});
