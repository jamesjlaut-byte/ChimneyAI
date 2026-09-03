"use client";
import {useEffect,useState} from "react";
import {loadCases,saveCases,upsertLocalCase,type ProCase,type SavedMessage} from "@/lib/pro-cases";
import type {ProSourceState} from "@/components/ProSourceDesk";
import type {ManualVerification} from "@/components/ManualVerificationCard";
import type {SourceProvenanceRecord} from "@/lib/source-provenance";
import {hashManualIdentity} from "@/lib/source-hash";
import {syncCaseToCloud} from "@/lib/workspace-sync";

type ChatMsg={role:"user"|"assistant";content:string};

export default function ProCaseManager({
  source,manual,messages,sourceFiles,onLoad,onClearChat
}:{
  source:ProSourceState;
  manual:ManualVerification;
  messages:ChatMsg[];
  sourceFiles:SourceProvenanceRecord[];
  onLoad:(x:{source:ProSourceState;manual:ManualVerification;question:string;messages:ChatMsg[];sourceFiles:SourceProvenanceRecord[]})=>void;
  onClearChat:()=>void;
}){
  const [cases,setCases]=useState<ProCase[]>([]);
  const [title,setTitle]=useState("");
  const [notes,setNotes]=useState("");
  const [editingId,setEditingId]=useState<string|null>(null);
  const [syncing,setSyncing]=useState<string|null>(null);
  const [syncMessage,setSyncMessage]=useState("");
  useEffect(()=>{
    const refresh=()=>setCases(loadCases());
    refresh();
    window.addEventListener("chimneyai:cases-changed",refresh);
    return()=>window.removeEventListener("chimneyai:cases-changed",refresh);
  },[]);

  function persist(next:ProCase[]){
    try{saveCases(next);setCases(next);return true}
    catch(e){setSyncMessage(e instanceof Error?e.message:"Could not save browser case data.");return false}
  }

  async function saveCurrent(){
    const now=new Date().toISOString();
    const manual_identity_hash=await hashManualIdentity({manufacturer:source.manufacturer,model:source.model,...manual});
    const savedMessages:SavedMessage[]=messages.map(m=>({...m,created_at:now}));
    const existing=editingId?cases.find(c=>c.id===editingId):undefined;
    const c:ProCase={
      id:existing?.id||crypto.randomUUID(),
      title:title.trim()||`${source.manufacturer||"Technical"} ${source.model||"case"}`.trim(),
      created_at:existing?.created_at||now,updated_at:now,
      manufacturer:source.manufacturer,model:source.model,serial:source.serial,
      appliance_type:source.fuel_type,technical_question:source.technician_question,
      notes:notes.trim(),source,manual,manual_identity_hash,messages:savedMessages,
      source_files:[...sourceFiles],cloud:existing?.cloud
    };
    const next=editingId?upsertLocalCase(cases,c):[c,...cases].slice(0,100);
    if(persist(next)){
      setSyncMessage(editingId?"Loaded case updated in this browser.":"Case saved in this browser.");
      setEditingId(null);setTitle("");setNotes("");
    }
  }

  function remove(c:ProCase){
    if(!window.confirm(`Delete “${c.title}” from this browser? This does not delete a separate cloud copy.`))return;
    if(persist(cases.filter(x=>x.id!==c.id))&&editingId===c.id){setEditingId(null);setTitle("");setNotes("")}
  }

  function loadCase(c:ProCase){
    setEditingId(c.id);setTitle(c.title);setNotes(c.notes);setSyncMessage("Case loaded. Save will update this browser copy.");
    onLoad({source:c.source,manual:c.manual,question:c.technical_question,messages:c.messages.map(({role,content})=>({role,content})),sourceFiles:c.source_files});
  }

  async function syncCloud(c:ProCase){
    setSyncing(c.id);setSyncMessage("");
    try{
      const result=await syncCaseToCloud(c);
      setSyncMessage(result.message);
      if(result.ok){
        const now=new Date().toISOString();
        const next=cases.map(x=>x.id===c.id?{
          ...x,
          cloud:{
            remote_case_id:result.remote_case_id,
            last_cloud_sync_at:now,
            cloud_updated_at:now,
            sync_state:"synced" as const
          }
        }:x);
        persist(next);
      }
    }catch(e:unknown){
      setSyncMessage(e instanceof Error?e.message:"Cloud sync failed. Browser case was not deleted.");
    }finally{setSyncing(null)}
  }

  function exportCase(c:ProCase){
    const md=[
      `# ${c.title}`,"",`Saved: ${c.updated_at}`,"",
      `## Appliance`,
      `- Manufacturer: ${c.manufacturer||"Not recorded"}`,
      `- Model: ${c.model||"Not recorded"}`,
      `- Serial: ${c.serial||"Not recorded"}`,
      `- Appliance/fuel: ${c.appliance_type||"Not recorded"}`,"",
      `## Technical question`,c.technical_question||"Not recorded","",
      `## Source record`,
      `- Type: ${c.source.source_type}`,
      `- Status: ${c.source.source_status}`,
      `- Source title: ${c.source.source_title||"Not recorded"}`,"",
      `## Manual verification`,
      `- Manual title: ${c.manual.manual_title||"Not recorded"}`,
      `- Document / part no.: ${c.manual.manual_part_number||"Not recorded"}`,
      `- Revision: ${c.manual.manual_revision||"Not recorded"}`,
      `- Effective date: ${c.manual.effective_date||"Not recorded"}`,
      `- Verified model: ${c.manual.verified_model||"Not recorded"}`,
      `- Relevant pages: ${c.manual.relevant_pages||"Not recorded"}`,
      `- Official URL: ${c.manual.official_url||"Not recorded"}`,
      `- Manual identity metadata SHA-256: ${c.manual_identity_hash||"Not recorded"}`,"",
      `## Actual source-file fingerprints`,
      ...(c.source_files.length?c.source_files.flatMap((f,i)=>[
        `### Source ${i+1}: ${f.file_name}`,
        `- Role: ${f.role}`,
        `- MIME: ${f.mime_type}`,
        `- Bytes: ${f.byte_size}`,
        `- SHA-256: ${f.sha256}`,
        `- Pages: ${f.page_count??"N/A"}`,
        `- Extracted text incomplete: ${f.text_truncated?"Yes":"No"}`,
        `- Note: ${f.note||"Not recorded"}`,""
      ]):["No actual source-file fingerprints recorded.",""]),
      `## Verification note`,c.manual.verification_note||"Not recorded","",
      `## Case notes`,c.notes||"Not recorded","",
      `## Conversation`,
      ...c.messages.flatMap(m=>[`### ${m.role==="user"?"Technician":"ChimneyAI"}`,m.content,""]),
      `---`,
      `Research record only. SHA-256 values identify the exact uploaded bytes; they do not independently establish applicability, listing conformity, field compliance, or safety.`
    ].join("\n");
    const blob=new Blob([md],{type:"text/markdown"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=`${c.title.replace(/[^a-z0-9-_]+/gi,"-").replace(/^-|-$/g,"")||"chimneyai-case"}.md`;
    a.click();URL.revokeObjectURL(url);
  }

  return <details className="caseManager">
    <summary><span>Saved Pro Cases</span><small>{cases.length} saved locally</small></summary>
    <div className="caseManagerBody">
      <div className="saveCaseGrid">
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Case title — e.g. Majestic SB100 manual research"/>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Private case notes / field context"/>
        <div className="saveCaseActions"><button type="button" onClick={saveCurrent}>{editingId?"Update loaded case":"Save new case"}</button>{editingId&&<button type="button" className="cancelCaseEdit" onClick={()=>{setEditingId(null);setTitle("");setNotes("");setSyncMessage("Update canceled.")}}>Cancel</button>}</div>
      </div>
      {cases.length===0?<p className="emptyCases">No saved cases yet.</p>:
      <div className="caseList">{cases.map(c=><div className="caseRow" key={c.id}>
        <div>
          <b>{c.title}</b>
          <span>{[c.manufacturer,c.model,c.serial].filter(Boolean).join(" · ")||"No appliance identity saved"}</span>
          <small>{c.messages.length} messages · {c.source_files.length} source fingerprints · {new Date(c.updated_at).toLocaleString()}</small>
          {c.manual_identity_hash&&<code>{c.manual_identity_hash.slice(0,18)}… metadata</code>}
        </div>
        <div className="caseActions">
          <button type="button" onClick={()=>loadCase(c)}>{editingId===c.id?"Loaded":"Load"}</button>
          <button type="button" onClick={()=>exportCase(c)}>Export</button>
          <button type="button" disabled={syncing===c.id} onClick={()=>syncCloud(c)}>{syncing===c.id?"Syncing…":"Sync cloud"}</button>
          <button type="button" className="deleteCase" onClick={()=>remove(c)}>Delete</button>
        </div>
      </div>)}</div>}
      {syncMessage&&<div className="caseSyncMessage">{syncMessage}</div>}
      <div className="caseFooter">
        <p className="casePrivacy">Browser-local case records preserve conversation text and source fingerprints. Source bytes can be persisted separately in the browser Source File Vault and re-verified against SHA-256.</p>
        <button type="button" onClick={onClearChat}>Clear current chat</button>
      </div>
    </div>
  </details>;
}
