"use client";
import {useEffect,useRef,useState} from "react";
import type {ChatAttachment} from "@/lib/client-attachments";
import type {SourceProvenanceRecord} from "@/lib/source-provenance";
import {provenanceFromAttachment} from "@/lib/source-provenance";
import {deleteStoredSourceFile,getStoredSourceFile,persistRawFile,putStoredSourceFile,verifyStoredSourceFile} from "@/lib/source-file-store";

export default function SourceManifest({
  attachments,records,onChange
}:{
  attachments:ChatAttachment[];
  records:SourceProvenanceRecord[];
  onChange:(r:SourceProvenanceRecord[])=>void;
}){
  const [busy,setBusy]=useState<string|null>(null);
  const [status,setStatus]=useState("");
  const restoreRef=useRef<HTMLInputElement>(null);
  const [restoreHash,setRestoreHash]=useState<string|null>(null);

  useEffect(()=>{
    let active=true;
    (async()=>{
      const next=await Promise.all(records.map(async r=>{
        const stored=await getStoredSourceFile(r.sha256);
        if(!active)return r;
        return {...r,storage_status:stored?"persisted_browser":"missing"} as SourceProvenanceRecord;
      }));
      if(active&&JSON.stringify(next)!==JSON.stringify(records))onChange(next);
    })();
    return()=>{active=false};
  // deliberate: run when hashes change, not on each status mutation
  },[records.map(r=>r.sha256).join("|")]);

  function add(a:ChatAttachment){
    if(records.some(r=>r.sha256===a.sha256))return;
    const defaultRole:SourceProvenanceRecord["role"]=
      a.mime_type==="application/pdf"?"manual":
      a.kind==="image"?"field_photo":"other";
    onChange([...records,provenanceFromAttachment(a,defaultRole)]);
  }

  function update(hash:string,patch:Partial<SourceProvenanceRecord>){
    onChange(records.map(r=>r.sha256===hash?{...r,...patch}:r));
  }

  async function persist(a:ChatAttachment){
    if(!a.original_blob){setStatus("Original bytes are not available in this session.");return}
    setBusy(a.sha256);setStatus("");
    try{
      await putStoredSourceFile({
        sha256:a.sha256,name:a.name,mime_type:a.mime_type,byte_size:a.byte_size,
        saved_at:new Date().toISOString(),blob:a.original_blob
      });
      update(a.sha256,{storage_status:"persisted_browser",persisted_at:new Date().toISOString(),integrity_status:"unchecked"});
      setStatus(`Saved exact source bytes for ${a.name} in this browser.`);
    }catch(e:any){setStatus(e?.message||"Could not persist source file.");}
    finally{setBusy(null)}
  }

  async function verify(hash:string){
    setBusy(hash);setStatus("");
    try{
      const result=await verifyStoredSourceFile(hash);
      update(hash,{integrity_status:!result.exists?"missing":result.match?"verified":"mismatch",storage_status:result.exists?"persisted_browser":"missing"});
      setStatus(!result.exists?"Stored file is missing.":result.match?"Stored bytes match the recorded SHA-256.":"WARNING: stored bytes do not match the recorded SHA-256.");
    }finally{setBusy(null)}
  }

  async function download(hash:string){
    const stored=await getStoredSourceFile(hash);
    if(!stored){setStatus("Stored source file not found in this browser.");return}
    const url=URL.createObjectURL(stored.blob);
    const a=document.createElement("a");a.href=url;a.download=stored.name;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function removeBytes(hash:string){
    await deleteStoredSourceFile(hash);
    update(hash,{storage_status:"missing",integrity_status:"missing"});
    setStatus("Persistent browser copy removed. Case provenance record retained.");
  }

  function requestRestore(hash:string){
    setRestoreHash(hash);restoreRef.current?.click();
  }

  async function restoreSelected(file:File|null){
    if(!file||!restoreHash)return;
    setBusy(restoreHash);
    try{
      await persistRawFile(file,restoreHash);
      update(restoreHash,{storage_status:"persisted_browser",persisted_at:new Date().toISOString(),integrity_status:"verified"});
      setStatus("Exact source file restored and SHA-256 verified.");
    }catch(e:any){setStatus(e?.message||"Restore failed.");}
    finally{
      setBusy(null);setRestoreHash(null);
      if(restoreRef.current)restoreRef.current.value="";
    }
  }

  return <details className="sourceManifest">
    <summary><span>Source File Vault</span><small>{records.length} source record{records.length===1?"":"s"}</small></summary>
    <div className="manifestBody">
      <input ref={restoreRef} type="file" hidden onChange={e=>restoreSelected(e.target.files?.[0]||null)}/>
      {attachments.length>0&&<div className="manifestCandidates">
        <b>Prepared attachments</b>
        {attachments.map(a=><div className="candidate" key={a.id}>
          <div>
            <span>{a.name}</span>
            <small>{a.mime_type} · {a.byte_size.toLocaleString()} bytes · SHA-256 {a.sha256.slice(0,16)}…</small>
          </div>
          <div className="candidateButtons">
            <button type="button" disabled={records.some(r=>r.sha256===a.sha256)} onClick={()=>add(a)}>
              {records.some(r=>r.sha256===a.sha256)?"Recorded":"Add to case"}
            </button>
            {records.some(r=>r.sha256===a.sha256)&&
              <button type="button" disabled={busy===a.sha256} onClick={()=>persist(a)}>Persist bytes</button>}
          </div>
        </div>)}
      </div>}

      {records.length===0?<p className="emptyManifest">No source files recorded yet.</p>:
      <div className="manifestList">{records.map(r=>{
        const attached=attachments.find(a=>a.sha256===r.sha256);
        return <div className="manifestRow" key={r.sha256}>
          <div className="manifestIdentity">
            <div className="vaultTitle"><b>{r.file_name}</b><span className={`vaultState ${r.storage_status||"missing"}`}>{(r.storage_status||"missing").replaceAll("_"," ")}</span></div>
            <code>{r.sha256}</code>
            <small>{r.byte_size.toLocaleString()} bytes{r.page_count?` · ${r.page_count} pages`:""}{r.text_truncated?" · extracted text incomplete":""}</small>
            {r.integrity_status&&<small>Integrity: <b>{r.integrity_status}</b></small>}
          </div>
          <div className="manifestControls">
            <select value={r.role} onChange={e=>update(r.sha256,{role:e.target.value as SourceProvenanceRecord["role"]})}>
              <option value="manual">Manufacturer manual</option>
              <option value="listing_label">Listing / rating label</option>
              <option value="inspection_report">Inspection report</option>
              <option value="field_photo">Field photo</option>
              <option value="other">Other source</option>
            </select>
            <input value={r.note} onChange={e=>update(r.sha256,{note:e.target.value})} placeholder="Why this source matters"/>
            <div className="vaultActions">
              {attached&&r.storage_status!=="persisted_browser"&&<button type="button" onClick={()=>persist(attached)}>Persist</button>}
              {r.storage_status==="persisted_browser"&&<>
                <button type="button" onClick={()=>verify(r.sha256)}>Verify hash</button>
                <button type="button" onClick={()=>download(r.sha256)}>Open/download</button>
                <button type="button" onClick={()=>removeBytes(r.sha256)}>Remove bytes</button>
              </>}
              {r.storage_status!=="persisted_browser"&&!attached&&<button type="button" onClick={()=>requestRestore(r.sha256)}>Restore exact file</button>}
            </div>
          </div>
        </div>
      })}</div>}
      {status&&<div className="vaultStatus">{status}</div>}
      <p className="manifestFoot">v37 stores exact source bytes in IndexedDB on this browser/device. Saved cases keep the SHA-256 reference. Clearing browser site data can remove these files, so this is not yet cloud archival storage.</p>
    </div>
  </details>;
}
