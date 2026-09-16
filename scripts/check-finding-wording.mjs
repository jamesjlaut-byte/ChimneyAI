// Fictional data only. Makes real model requests; review output for factual drift.
import {buildFindingWordingBrief} from "../lib/finding-wording-brief.ts";
const endpoint=new URL("/api/chat",process.env.CHIMNEYAI_EVAL_URL||"http://127.0.0.1:3187");
const cases=[
  {id:"preserve_negation",status:"observation_noted",note:"No crack observed in accessible firebox surfaces. Rear area obscured; could not inspect.",tone:"concise"},
  {id:"ambiguous_distance",status:"further_evaluation_recommended",note:"Possible flue tile crack around 8 ft. Distance not measured and reference point not recorded.",tone:"standard"}
];
for(const c of cases){
  const inspection={inspection_type:"level_1",systems:[{id:"qa",system_type:"masonry_fireplace"}],findings:[{id:"qa-f",system_id:"qa",component:c.id==="preserve_negation"?"firebox":"flue",status:c.status,raw_note:c.note}]};
  const r=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"pro",messages:[{role:"user",content:buildFindingWordingBrief(inspection,"qa-f",c.tone)}]}),signal:AbortSignal.timeout(90_000)});
  const body=await r.json();
  console.log(JSON.stringify({case:c.id,status:r.status,ok:body.ok,error:body.error,answer:body.text},null,2));
  if(!r.ok||!body.ok)process.exitCode=2;
  else if(!body.text?.includes("technician review required"))process.exitCode=1;
  else if(/\b(?:further evaluation is recommended|recommend(?:ed)? (?:repair|further evaluation))\b/i.test(body.text)){console.error("Unexpected recommendation not present in the original note.");process.exitCode=1;}
}
