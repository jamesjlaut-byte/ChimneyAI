import {readFile} from "node:fs/promises";

const cases=JSON.parse(await readFile(new URL("../evals/pro-cases.json",import.meta.url),"utf8"));
const baseUrl=(process.env.CHIMNEYAI_EVAL_URL||"http://localhost:3000").replace(/\/$/,"");
const endpoint=baseUrl.endsWith("/api/chat")?baseUrl:`${baseUrl}/api/chat`;
const limit=Math.max(1,Math.min(cases.length,Number(process.env.EVAL_LIMIT)||cases.length));
const results=[];

for(const test of cases.slice(0,limit)){
  let response;
  let body;
  try{
    response=await fetch(endpoint,{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(test.request),
      signal:AbortSignal.timeout(90_000)
    });
    body=await response.json();
  }catch(error){
    results.push({id:test.id,status:"provider_blocked",reason:error instanceof Error?error.message:"Request failed"});
    continue;
  }

  if(!response.ok||!body.ok){
    results.push({id:test.id,status:"provider_blocked",reason:body.error||`HTTP ${response.status}`});
    continue;
  }

  const answer=String(body.text||"");
  const normalized=answer.toLowerCase();
  const missingGroups=(test.required_any||[]).filter(group=>!group.some(term=>normalized.includes(term.toLowerCase())));
  const forbiddenMatches=(test.forbidden_patterns||[]).filter(pattern=>new RegExp(pattern,"i").test(answer));
  results.push({
    id:test.id,
    status:missingGroups.length||forbiddenMatches.length?"quality_failed":"passed",
    missing_groups:missingGroups,
    forbidden_matches:forbiddenMatches,
    answer_excerpt:answer.slice(0,500)
  });
}

const summary={
  endpoint,
  total:results.length,
  passed:results.filter(result=>result.status==="passed").length,
  quality_failed:results.filter(result=>result.status==="quality_failed").length,
  provider_blocked:results.filter(result=>result.status==="provider_blocked").length,
  results
};

console.log(JSON.stringify(summary,null,2));
if(summary.provider_blocked)process.exitCode=2;
else if(summary.quality_failed)process.exitCode=1;
