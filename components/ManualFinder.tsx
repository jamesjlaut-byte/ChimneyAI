"use client";
import {useMemo,useState} from "react";
import {matchManufacturer} from "@/lib/manual-registry";

export default function ManualFinder({manufacturer,model,onPrepareQuestion}:{manufacturer:string;model:string;onPrepareQuestion:(q:string)=>void}){
  const [open,setOpen]=useState(false);
  const match=useMemo(()=>matchManufacturer(manufacturer),[manufacturer]);
  const exactReady=Boolean(manufacturer.trim()&&model.trim());

  return <div className="manualFinder">
    <div className="manualFinderHead">
      <div><b>Official Manual Finder</b><span>Label → exact model → manufacturer source → manual</span></div>
      <button type="button" aria-expanded={open} aria-controls="manual-finder-panel" onClick={()=>setOpen(!open)}>{open?"Hide":"Open"}</button>
    </div>
    {open&&<div className="manualFinderBody" id="manual-finder-panel">
      <div className={`manualMatch ${exactReady?"ready":"waiting"}`}>
        <b>{exactReady?"Ready to verify exact model":"Exact model required"}</b>
        <span>{exactReady?`${manufacturer} · ${model}`:"Enter manufacturer and exact model in Source Desk or scan the rating/listing label."}</span>
      </div>
      {match?<div className="officialSource">
        <div><small>OFFICIAL MANUFACTURER LOOKUP · LINK CHECKED {match.verified_on}</small><b>{match.name}</b><span>{match.notes}</span></div>
        <a href={match.official_manual_lookup} target="_blank" rel="noreferrer">Open official manual lookup ↗</a>
      </div>:manufacturer?<div className="manualWarning">
        ChimneyAI does not yet have a verified official lookup registered for “{manufacturer}”. Do not substitute an unofficial manual just because the model name looks similar.
      </div>:null}
      <div className="manualWorkflow">
        <div><strong>1</strong><span>Scan/read label</span></div>
        <div><strong>2</strong><span>Confirm exact model</span></div>
        <div><strong>3</strong><span>Open official manufacturer source</span></div>
        <div><strong>4</strong><span>Upload exact installation manual</span></div>
        <div><strong>5</strong><span>Ask the installation question</span></div>
      </div>
      <button className="prepareManualQuestion" type="button" disabled={!exactReady} onClick={()=>onPrepareQuestion(
        `I am verifying ${manufacturer} model ${model}. Using only the exact uploaded manufacturer installation manual/source, identify the controlling instruction for my question. Cite the supplied [Page N] marker, distinguish the manual requirement from my field observation, and tell me if the supplied material is insufficient. Do not substitute a similar model or invent a requirement.`
      )}>Prepare source-controlled question</button>
      <p className="manualFoot">Current v33 registry intentionally starts small. A manufacturer is added only when its official manual/source workflow is known. This avoids a broad web search being mistaken for product verification.</p>
    </div>}
  </div>;
}
