import assert from "node:assert/strict";
import {test} from "node:test";
import {buildFindingWordingBrief,WORDING_TONES} from "../lib/finding-wording-brief.ts";
import {parseChatRequest} from "../lib/chat-request.ts";

const inspection={inspection_type:"level_1",customer:{first_name:"PRIVATE CUSTOMER"},property:{street_address:"PRIVATE ADDRESS"},systems:[{id:"first",system_type:"masonry_fireplace"},{id:"second",system_type:"wood_stove"}],findings:[{id:"f",system_id:"first",component:"flue",status:"further_evaluation_recommended",raw_note:"Possible crack around 8 ft; location not measured. No interior access.",ai_suggestion:"UNCONFIRMED AI",technician_observation:"OTHER WORDING",review_state:"not_requested"},{id:"other",system_id:"second",component:"appliance",raw_note:"SECOND SYSTEM NOTE"}]};
test("wording briefs preserve the full original note, status and uncertainty for every tone",()=>{
  const before=JSON.stringify(inspection);
  for(const tone of WORDING_TONES){
    const brief=buildFindingWordingBrief(inspection,"f",tone);
    const payload=JSON.parse(brief.split("SAVED OBSERVATION DATA:\n")[1]);
    assert.equal(payload.original_saved_note,inspection.findings[0].raw_note);
    assert.equal(payload.technician_selected_status,"further_evaluation_recommended");
    assert.match(brief,/DRAFT — technician review required/);
    assert.ok(brief.includes(`Tone: ${tone}.`));
    for(const excluded of ["PRIVATE CUSTOMER","PRIVATE ADDRESS","UNCONFIRMED AI","OTHER WORDING","SECOND SYSTEM NOTE"])assert.ok(!brief.includes(excluded));
    assert.equal(parseChatRequest({mode:"pro",messages:[{role:"user",content:brief}]}).success,true);
  }
  assert.equal(JSON.stringify(inspection),before);
});
test("wording refuses missing, cross-system, empty and stale component selections",()=>{
  for(const id of ["missing","other"])assert.equal(buildFindingWordingBrief(inspection,id,"standard"),null);
  assert.equal(buildFindingWordingBrief({...inspection,systems:[]},"f","standard"),null);
  assert.equal(buildFindingWordingBrief(inspection,"f","invented"),null);
  for(const changed of [{raw_note:"  "},{component:"not_on_checklist"}])assert.equal(buildFindingWordingBrief({...inspection,findings:[{...inspection.findings[0],...changed}]},"f","standard"),null);
});
test("large wording notes are never silently truncated to fit a request",()=>{
  const long="No crack observed. ".repeat(270);
  const brief=buildFindingWordingBrief({...inspection,findings:[{...inspection.findings[0],raw_note:long}]},"f","detailed");
  assert.equal(JSON.parse(brief.split("SAVED OBSERVATION DATA:\n")[1]).original_saved_note,long);
  assert.throws(()=>buildFindingWordingBrief({...inspection,findings:[{...inspection.findings[0],raw_note:"\u0000".repeat(5000)}]},"f","concise"),/without cutting information/);
});
