"use client";
import {useState} from "react";
import {fetchCloudCase,getCloudCaseRevisions,listCloudCases,restoreCloudSourceToVault,type CloudCaseRevisionSummary,type CloudCaseSummary} from "@/lib/workspace-sync";
import {compareCaseVersions,loadCases,saveCases,upsertLocalCase,type ProCase} from "@/lib/pro-cases";

export default function CloudCaseBrowser({
  onImported
}:{onImported?:(c:ProCase)=>void}){
  const [rows,setRows]=useState<CloudCaseSummary[]>([]);
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  const [loaded,setLoaded]=useState(false);
  const [selected,setSelected]=useState<ProCase|null>(null);
  const [revisions,setRevisions]=useState<CloudCaseRevisionSummary[]>([]);
  const locals=loadCases();

  async function refresh(){
    setBusy("list");setMessage("");
    try{
      const data=await listCloudCases();
      setRows(data);setLoaded(true);
      setMessage(data.length?`Loaded ${data.length} cloud case${data.length===1?"":"s"}.`:"No cloud cases found.");
    }catch(e:unknown){setMessage(e instanceof Error?e.message:"Could not load cloud cases.");}
    finally{setBusy(null)}
  }

  async function inspect(row:CloudCaseSummary){
    setBusy(row.id);setMessage("");
    try{
      const c=await fetchCloudCase(row.id);
      setSelected(c);
      setRevisions(await getCloudCaseRevisions(row.id));
    }catch(e:unknown){setMessage(e instanceof Error?e.message:"Could not load cloud case.");}
    finally{setBusy(null)}
  }

  function localMatch(c:ProCase){
    return loadCases().find(x=>x.id===c.id)||null;
  }

  function versionState(c:ProCase){
    const local=localMatch(c);
    if(!local)return "cloud only";
    return compareCaseVersions(local,c.cloud?.cloud_updated_at);
  }

  function importCloud(c:ProCase,force=false){
    const cases=loadCases();
    const local=cases.find(x=>x.id===c.id);
    const state=local?compareCaseVersions(local,c.cloud?.cloud_updated_at):"cloud_newer";
    if(local&&!force&&(state==="local_newer"||state==="conflict")){
      setMessage("Local case may contain newer work. ChimneyAI did not overwrite it. Choose Replace local only if you have reviewed the difference.");
      return;
    }
    const imported:{[K in keyof ProCase]:ProCase[K]}={...c};
    saveCases(upsertLocalCase(cases,imported));
    setMessage("Cloud case copied into this browser.");
    onImported?.(imported);
    setLoaded(x=>!x);
  }

  async function restoreSource(c:ProCase,sha:string){
    const remote=c.cloud?.remote_case_id;
    if(!remote)return;
    setBusy(sha);setMessage("");
    try{
      const result=await restoreCloudSourceToVault(remote,sha);
      setMessage(`Restored ${result.name} into the local Source File Vault and verified SHA-256.`);
      setSelected({
        ...c,
        source_files:c.source_files.map(s=>s.sha256===sha?{...s,storage_status:"persisted_browser",integrity_status:"verified",persisted_at:new Date().toISOString()}:s)
      });
    }catch(e:unknown){setMessage(e instanceof Error?e.message:"Could not restore cloud source.");}
    finally{setBusy(null)}
  }

  return <details className="cloudCaseBrowser">
    <summary><span>Cloud Case Browser</span><small>multi-device retrieval</small></summary>
    <div className="cloudCaseBody">
      <div className="cloudBrowserTop">
        <button type="button" disabled={busy==="list"} onClick={refresh}>{busy==="list"?"Loading…":"Load cloud cases"}</button>
        <span>Cloud cases are never allowed to silently overwrite newer browser work.</span>
      </div>

      {rows.length>0&&<div className="cloudCaseList">{rows.map(r=>{
        const local=locals.find(c=>c.id===r.client_case_id);
        const state=local?compareCaseVersions(local,r.content_updated_at):"cloud_newer";
        return <button type="button" className="cloudCaseRow" onClick={()=>inspect(r)} key={r.id}>
          <div><b>{r.title}</b><span>{[r.manufacturer,r.model,r.serial].filter(Boolean).join(" · ")||"No appliance identity"}</span></div>
          <div><small>{r.source_count} sources · {new Date(r.updated_at).toLocaleString()}</small><em>{local?state.replace("_"," "):"cloud only"}</em></div>
        </button>
      })}</div>}

      {selected&&<div className="cloudCaseDetail">
        <div className="cloudDetailHead">
          <div><small>CLOUD CASE</small><b>{selected.title}</b><span>{[selected.manufacturer,selected.model,selected.serial].filter(Boolean).join(" · ")}</span></div>
          <span className="cloudVersionState">{versionState(selected).replace("_"," ")}</span>
        </div>

        <div className="cloudSourceRestore">
          <b>Cloud source files</b>
          {selected.source_files.length===0?<span>No source records.</span>:selected.source_files.map(s=><div key={s.sha256}>
            <div><span>{s.file_name}</span><small>{s.role.replaceAll("_"," ")} · {s.sha256.slice(0,16)}…</small></div>
            <button type="button" disabled={busy===s.sha256} onClick={()=>restoreSource(selected,s.sha256)}>
              {busy===s.sha256?"Verifying…":"Restore + verify"}
            </button>
          </div>)}
        </div>

        <div className="cloudRevisionStrip">
          <b>Cloud revision snapshots</b>
          <span>{revisions.length?`${revisions.length} recent revision${revisions.length===1?"":"s"} available`:"No revisions loaded"}</span>
        </div>

        <div className="cloudImportActions">
          <button type="button" onClick={()=>importCloud(selected,false)}>Import safely</button>
          {localMatch(selected)&&<button type="button" className="dangerImport" onClick={()=>importCloud(selected,true)}>Replace local</button>}
        </div>
      </div>}
      {message&&<div className="cloudMessage">{message}</div>}
      <p className="cloudFoot">Cloud retrieval code requires the v39 migration plus a configured Supabase project. Without that, browser cases remain fully usable and no cloud state is fabricated.</p>
    </div>
  </details>;
}
