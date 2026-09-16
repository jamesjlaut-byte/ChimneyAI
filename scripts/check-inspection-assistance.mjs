// Uses fictional data only. This makes a real model request; review the answer,
// not just the HTTP status. Run with CHIMNEYAI_EVAL_URL to select a deployment.
import {buildInspectionAiBrief} from "../lib/inspection-ai-brief.ts";

const inspection={updated_at:"2026-09-15T12:00:00Z",inspection_type:"level_1",systems:[{id:"qa",system_type:"masonry_fireplace",manufacturer:"",model:""}],findings:[{id:"f",system_id:"qa",component:"flue",status:"unable_to_inspect",raw_note:"Fictional QA case: flue access unavailable. No interior scan performed."}],photos:[]};
const endpoint=new URL("/api/chat",process.env.CHIMNEYAI_EVAL_URL||"http://127.0.0.1:3187");
const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode:"pro",messages:[{role:"user",content:buildInspectionAiBrief(inspection)}]}),signal:AbortSignal.timeout(90_000)});
const body=await response.json();
const answer=typeof body.text==="string"?body.text:"";
const words=answer.trim()?answer.trim().split(/\s+/).length:0;
console.log(JSON.stringify({status:response.status,ok:body.ok,error:body.error,words,answer,manual_review:"Confirm: <=3 steps; unavailable flue remains a limitation; no invented observations, required scan, or automatic Level 2 escalation."},null,2));
if(!response.ok||!body.ok)process.exitCode=2;
else if(!words||words>220)process.exitCode=1;
