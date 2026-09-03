"use client";
import {useEffect,useMemo,useState} from "react";
import {hashManualIdentity} from "@/lib/source-hash";
import {modelsConflict} from "@/lib/model-identity";
import {matchManufacturer} from "@/lib/manual-registry";

export type ManualVerification={
  manual_title:string;
  manual_part_number:string;
  manual_revision:string;
  effective_date:string;
  official_url:string;
  verified_model:string;
  relevant_pages:string;
  verification_note:string;
};

export const EMPTY_MANUAL:ManualVerification={
  manual_title:"",manual_part_number:"",manual_revision:"",effective_date:"",
  official_url:"",verified_model:"",relevant_pages:"",verification_note:""
};

function parseHttpsUrl(value:string){
  if(!value.trim())return false;
  try{
    const url=new URL(value);
    return url.protocol==="https:"&&Boolean(url.hostname)?url:false;
  }catch{return false;}
}

function normalizedHost(hostname:string){return hostname.toLowerCase().replace(/^www\./,"");}

export default function ManualVerificationCard({
  value,onChange,manufacturer,model
}:{value:ManualVerification;onChange:(v:ManualVerification)=>void;manufacturer:string;model:string}){
  function set<K extends keyof ManualVerification>(k:K,v:ManualVerification[K]){onChange({...value,[k]:v});}
  const [identityHash,setIdentityHash]=useState("");
  useEffect(()=>{let alive=true;hashManualIdentity({manufacturer,model,...value}).then(h=>{if(alive)setIdentityHash(h)});return()=>{alive=false}},[manufacturer,model,value]);
  const modelConflict=modelsConflict(model,value.verified_model);
  const recordedUrl=useMemo(()=>parseHttpsUrl(value.official_url),[value.official_url]);
  const officialUrlValid=Boolean(recordedUrl);
  const officialUrlInvalid=Boolean(value.official_url.trim())&&!officialUrlValid;
  const manufacturerMatch=useMemo(()=>matchManufacturer(manufacturer),[manufacturer]);
  const registeredHost=manufacturerMatch?normalizedHost(new URL(manufacturerMatch.official_manual_lookup).hostname):null;
  const recordedHost=recordedUrl?normalizedHost(recordedUrl.hostname):null;
  const hostAligned=Boolean(registeredHost&&recordedHost&&(registeredHost===recordedHost||recordedHost.endsWith(`.${registeredHost}`)));
  const completeness=useMemo(()=>{
    const checks=[
      ["Exact model",Boolean(value.verified_model.trim())&&!modelConflict],
      ["Manual title",Boolean(value.manual_title.trim())],
      ["HTTPS source URL entered",officialUrlValid],
      ["Revision / date",Boolean(value.manual_revision.trim()||value.effective_date.trim())]
    ] as const;
    return checks;
  },[value,modelConflict,officialUrlValid]);

  return <details className="verificationCard">
    <summary><span>Manual Verification Record</span><small>identity · revision · source · page</small></summary>
    <div className="verificationBody">
      <div className="verifyIdentity">
        <b>Appliance being researched</b>
        <span>{manufacturer||"Manufacturer not entered"} · {model||"Model not entered"}</span>
      </div>
      {modelConflict&&<div className="verificationConflict" role="alert">
        <b>Manual model does not match the appliance record.</b>
        <span>Source Desk: {model} · Manual record: {value.verified_model}</span>
        <p>Do not apply product-specific requirements until the exact manual applicability is established.</p>
      </div>}
      <div className="verificationGrid">
        <label>Verified model<input value={value.verified_model} onChange={e=>set("verified_model",e.target.value)} placeholder={model||"Exact model from label/manual"}/></label>
        <label>Manual title<input value={value.manual_title} onChange={e=>set("manual_title",e.target.value)} placeholder="Exact document title"/></label>
        <label>Manual part / document no.<input value={value.manual_part_number} onChange={e=>set("manual_part_number",e.target.value)} placeholder="If shown"/></label>
        <label>Revision<input value={value.manual_revision} onChange={e=>set("manual_revision",e.target.value)} placeholder="Revision letter/number"/></label>
        <label>Effective / publication date<input value={value.effective_date} onChange={e=>set("effective_date",e.target.value)} placeholder="YYYY-MM-DD or as shown"/></label>
        <label>Relevant page(s)<input value={value.relevant_pages} onChange={e=>set("relevant_pages",e.target.value)} placeholder="e.g. 17, 24-25"/></label>
      </div>
      <label className="wideVerify">Official manufacturer URL
        <input type="url" inputMode="url" autoCapitalize="none" spellCheck={false} value={value.official_url} onChange={e=>set("official_url",e.target.value)} placeholder="https://manufacturer.example/manual.pdf"/>
      </label>
      {officialUrlInvalid&&<div className="verificationUrlWarning" role="alert">Enter the complete HTTPS manufacturer URL. This checkpoint remains incomplete until the address is valid.</div>}
      {recordedUrl&&<div className={`verificationUrlReview ${manufacturerMatch&&!hostAligned?"needsReview":""}`}>
        <span>{manufacturerMatch
          ?hostAligned
            ?`Domain aligns with ChimneyAI's registered ${manufacturerMatch.name} lookup. Confirm the document, model coverage, and revision.`
            :`Domain differs from ChimneyAI's registered ${manufacturerMatch.name} lookup (${registeredHost}). Confirm it is manufacturer-controlled or reached from the official lookup before relying on it.`
          :"HTTPS format is valid, but ChimneyAI has no registered manufacturer domain match for this record. Verify source control and applicability independently."}</span>
        <a href={recordedUrl.href} target="_blank" rel="noopener noreferrer">Open recorded source ↗</a>
      </div>}
      <label className="wideVerify">Verification note
        <textarea value={value.verification_note} onChange={e=>set("verification_note",e.target.value)} rows={3}
          placeholder="What was verified, what remains uncertain, and why this manual applies to this exact appliance."/>
      </label>
      <div className="verifyChecklist">
        {completeness.map(([label,ok])=><span className={ok?"done":""} key={label}>{ok?"✓":"○"} {label}</span>)}
      </div>
      <div className="sourceHash"><small>MANUAL IDENTITY SHA-256</small><code>{identityHash||"Calculating…"}</code></div>
      <p className="verificationWarning">This hash fingerprints the recorded manual metadata, not the PDF bytes. A completed record documents the research path; it does not by itself prove field conformity.</p>
    </div>
  </details>;
}
