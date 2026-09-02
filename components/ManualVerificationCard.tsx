"use client";
import {useEffect,useMemo,useState} from "react";
import {hashManualIdentity} from "@/lib/source-hash";

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

export default function ManualVerificationCard({
  value,onChange,manufacturer,model
}:{value:ManualVerification;onChange:(v:ManualVerification)=>void;manufacturer:string;model:string}){
  function set<K extends keyof ManualVerification>(k:K,v:ManualVerification[K]){onChange({...value,[k]:v});}
  const [identityHash,setIdentityHash]=useState("");
  useEffect(()=>{let alive=true;hashManualIdentity({manufacturer,model,...value}).then(h=>{if(alive)setIdentityHash(h)});return()=>{alive=false}},[manufacturer,model,value]);
  const completeness=useMemo(()=>{
    const checks=[
      ["Exact model",Boolean(value.verified_model.trim())],
      ["Manual title",Boolean(value.manual_title.trim())],
      ["Official source URL",Boolean(value.official_url.trim())],
      ["Revision / date",Boolean(value.manual_revision.trim()||value.effective_date.trim())]
    ] as const;
    return checks;
  },[value]);

  return <details className="verificationCard">
    <summary><span>Manual Verification Record</span><small>identity · revision · source · page</small></summary>
    <div className="verificationBody">
      <div className="verifyIdentity">
        <b>Appliance being researched</b>
        <span>{manufacturer||"Manufacturer not entered"} · {model||"Model not entered"}</span>
      </div>
      <div className="verificationGrid">
        <label>Verified model<input value={value.verified_model} onChange={e=>set("verified_model",e.target.value)} placeholder={model||"Exact model from label/manual"}/></label>
        <label>Manual title<input value={value.manual_title} onChange={e=>set("manual_title",e.target.value)} placeholder="Exact document title"/></label>
        <label>Manual part / document no.<input value={value.manual_part_number} onChange={e=>set("manual_part_number",e.target.value)} placeholder="If shown"/></label>
        <label>Revision<input value={value.manual_revision} onChange={e=>set("manual_revision",e.target.value)} placeholder="Revision letter/number"/></label>
        <label>Effective / publication date<input value={value.effective_date} onChange={e=>set("effective_date",e.target.value)} placeholder="YYYY-MM-DD or as shown"/></label>
        <label>Relevant page(s)<input value={value.relevant_pages} onChange={e=>set("relevant_pages",e.target.value)} placeholder="e.g. 17, 24-25"/></label>
      </div>
      <label className="wideVerify">Official manufacturer URL
        <input value={value.official_url} onChange={e=>set("official_url",e.target.value)} placeholder="Paste exact official manual/source URL"/>
      </label>
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
