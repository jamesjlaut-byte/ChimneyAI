"use client";
import {useEffect,useRef,useState} from "react";
import {prepareAttachment,type ChatAttachment} from "@/lib/client-attachments";
import type {SourceProvenanceRecord} from "@/lib/source-provenance";
import {provenanceFromAttachment} from "@/lib/source-provenance";
import {deleteStoredSourceFile,getStoredSourceFile,persistRawFile,putStoredSourceFile,verifyStoredSourceFile} from "@/lib/source-file-store";
import {defaultSourceRole,type SourceRoleContext} from "@/lib/default-source-role";

export default function SourceManifest({
  attachments,records,sourceContext,onChange,onAttach
}:{
  attachments:ChatAttachment[];
  records:SourceProvenanceRecord[];
  sourceContext?:SourceRoleContext;
  onChange:(r:SourceProvenanceRecord[])=>void;
  onAttach:(attachment:ChatAttachment)=>"attached"|"duplicate"|"full";
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
        const availableInSession=attachments.some(a=>a.sha256===r.sha256);
        return {...r,storage_status:stored?"persisted_browser":availableInSession?"session_only":"missing"} as SourceProvenanceRecord;
      }));
      if(active&&JSON.stringify(next)!==JSON.stringify(records))onChange(next);
    })();
    return()=>{active=false};
  // Deliberately rerun only when record or active-attachment identities change.
  // onChange is created by the parent render and including it would turn status normalization into a loop.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[records.map(r=>r.sha256).join("|"),attachments.map(a=>a.sha256).join("|")]);

  function add(a:ChatAttachment){
    if(records.some(r=>r.sha256===a.sha256))return;
    onChange([...records,provenanceFromAttachment(a,defaultSourceRole(a,sourceContext))]);
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
    }catch(e:unknown){setStatus(e instanceof Error?e.message:"Could not persist source file.");}
    finally{setBusy(null)}
  }

  async function verify(hash:string){
    setBusy(hash);setStatus("");
    try{
      const result=await verifyStoredSourceFile(hash);
      update(hash,{integrity_status:!result.exists?"missing":result.match?"verified":"mismatch",storage_status:result.exists?"persisted_browser":"missing"});
      setStatus(!result.exists?"Stored file is missing.":result.match?"Stored bytes match the recorded SHA-256.":"WARNING: stored bytes do not match the recorded SHA-256.");
    }catch(e:unknown){setStatus(e instanceof Error?e.message:"Could not verify the stored source file.");}
    finally{setBusy(null)}
  }

  async function download(hash:string){
    setBusy(hash);setStatus("");
    try{
      const stored=await getStoredSourceFile(hash);
      if(!stored){setStatus("Stored source file not found in this browser.");return}
      const url=URL.createObjectURL(stored.blob);
      const a=document.createElement("a");a.href=url;a.download=stored.name;a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(e:unknown){setStatus(e instanceof Error?e.message:"Could not open the stored source file.");}
    finally{setBusy(null)}
  }

  async function attachStoredSource(record:SourceProvenanceRecord){
    setBusy(record.sha256);setStatus("");
    try{
      const verification=await verifyStoredSourceFile(record.sha256);
      if(!verification.exists){
        update(record.sha256,{storage_status:"missing",integrity_status:"missing"});
        setStatus("Stored source bytes are missing from this browser.");
        return;
      }
      if(!verification.match){
        update(record.sha256,{storage_status:"persisted_browser",integrity_status:"mismatch"});
        setStatus("WARNING: stored bytes do not match the recorded SHA-256 and were not added to chat.");
        return;
      }
      const stored=verification.stored;
      if(!stored)throw new Error("Stored source file could not be reopened.");
      const file=new File([stored.blob],record.file_name,{type:record.mime_type});
      const prepared=await prepareAttachment(file);
      if(prepared.sha256!==record.sha256)throw new Error("Reprepared source does not match the recorded SHA-256.");
      const result=onAttach(prepared);
      update(record.sha256,{storage_status:"persisted_browser",integrity_status:"verified"});
      setStatus(result==="attached"
        ?`${record.file_name} was re-verified, prepared, and added to active chat sources.`
        :result==="duplicate"
          ?`${record.file_name} is already active in chat.`
          :"Remove an active attachment before adding this source. Maximum: 6.");
    }catch(e:unknown){setStatus(e instanceof Error?e.message:"Could not prepare the stored source for chat.");}
    finally{setBusy(null)}
  }

  async function removeBytes(hash:string){
    if(!window.confirm("Remove the stored file bytes from this browser? The case fingerprint record will remain."))return;
    setBusy(hash);setStatus("");
    try{
      await deleteStoredSourceFile(hash);
      update(hash,{storage_status:"missing",integrity_status:"missing"});
      setStatus("Persistent browser copy removed. Case provenance record retained.");
    }catch(e:unknown){setStatus(e instanceof Error?e.message:"Could not remove stored source bytes.");}
    finally{setBusy(null)}
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
    }catch(e:unknown){setStatus(e instanceof Error?e.message:"Restore failed.");}
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
            <select aria-label={`Source role for ${r.file_name}`} value={r.role} onChange={e=>update(r.sha256,{role:e.target.value as SourceProvenanceRecord["role"]})}>
              <option value="manual">Manufacturer manual</option>
              <option value="listing_label">Listing / rating label</option>
              <option value="inspection_report">Inspection report</option>
              <option value="field_photo">Field photo</option>
              <option value="other">Other source</option>
            </select>
            <input aria-label={`Source note for ${r.file_name}`} value={r.note} onChange={e=>update(r.sha256,{note:e.target.value})} placeholder="Why this source matters"/>
            <div className="vaultActions">
              {attached&&r.storage_status!=="persisted_browser"&&<button type="button" onClick={()=>persist(attached)}>Persist</button>}
              {r.storage_status==="persisted_browser"&&<>
                {!attached&&<button type="button" disabled={busy===r.sha256} onClick={()=>attachStoredSource(r)}>{busy===r.sha256?"Preparing…":"Use in chat"}</button>}
                <button type="button" disabled={busy===r.sha256} onClick={()=>verify(r.sha256)}>Verify hash</button>
                <button type="button" disabled={busy===r.sha256} onClick={()=>download(r.sha256)}>Open/download</button>
                <button type="button" disabled={busy===r.sha256} onClick={()=>removeBytes(r.sha256)}>Remove bytes</button>
              </>}
              {r.storage_status!=="persisted_browser"&&!attached&&<button type="button" onClick={()=>requestRestore(r.sha256)}>Restore exact file</button>}
            </div>
          </div>
        </div>
      })}</div>}
      {status&&<div className="vaultStatus" role="status" aria-live="polite">{status}</div>}
      <p className="manifestFoot">Pro uploads are recorded here automatically with a SHA-256 fingerprint. “Persist bytes” separately stores the exact file in IndexedDB on this browser/device. Clearing browser site data can remove those files, so this is not cloud archival storage.</p>
    </div>
  </details>;
}
