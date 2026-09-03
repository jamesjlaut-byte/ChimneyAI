"use client";
import Image from "next/image";
import {useEffect,useMemo,useRef,useState} from "react";
import {prepareAttachment,type ChatAttachment} from "@/lib/client-attachments";
import ProFieldTools from "@/components/ProFieldTools";
import ProSourceDesk,{EMPTY_PRO_SOURCE,type ProSourceState} from "@/components/ProSourceDesk";
import ManualFinder from "@/components/ManualFinder";
import ManualVerificationCard,{EMPTY_MANUAL,type ManualVerification} from "@/components/ManualVerificationCard";
import ProCaseManager from "@/components/ProCaseManager";
import SourceManifest from "@/components/SourceManifest";
import type {SourceProvenanceRecord} from "@/lib/source-provenance";
import {provenanceFromAttachment} from "@/lib/source-provenance";
import CloudWorkspace from "@/components/CloudWorkspace";
import CloudCaseBrowser from "@/components/CloudCaseBrowser";
import {modelsConflict} from "@/lib/model-identity";
import MessageContent from "@/components/MessageContent";
import {defaultSourceRole} from "@/lib/default-source-role";
import {markLastAttemptFailed,modelHistory,type ChatHistoryMessage} from "@/lib/chat-history";
import {clearProDraft,isMeaningfulProDraft,loadProDraft,saveProDraft} from "@/lib/pro-draft";

type Mode="homeowner"|"pro"; type Msg=ChatHistoryMessage;
const starterHomeowner=["Explain this inspection report to me.","What does this repair recommendation mean?","What should I ask before hiring a chimney sweep?","Can you explain what you can see in a fireplace photo?"];
const starterPro=["Help me write objective report language.","Check a fireplace opening-to-flue ratio.","Second-look these inspection photos.","Help me structure a manufacturer-manual verification."];

export default function ChimneyChat({mode}:{mode:Mode}){
  const [messages,setMessages]=useState<Msg[]>([]),[text,setText]=useState(""),[busy,setBusy]=useState(false);
  const [attachments,setAttachments]=useState<ChatAttachment[]>([]),[attachmentStatus,setAttachmentStatus]=useState("");
  const [proSource,setProSource]=useState<ProSourceState>(EMPTY_PRO_SOURCE);
  const [manualVerification,setManualVerification]=useState<ManualVerification>(EMPTY_MANUAL);
  const [sourceFiles,setSourceFiles]=useState<SourceProvenanceRecord[]>([]);
  const [draftReady,setDraftReady]=useState(mode!=="pro"),[draftStatus,setDraftStatus]=useState("");
  const inputRef=useRef<HTMLInputElement>(null),attachmentsRef=useRef(attachments);
  const requestRef=useRef<{id:number;controller:AbortController}|null>(null),nextRequestId=useRef(0);
  const starters=useMemo(()=>mode==="pro"?starterPro:starterHomeowner,[mode]);
  useEffect(()=>{attachmentsRef.current=attachments},[attachments]);
  useEffect(()=>()=>requestRef.current?.controller.abort(),[]);
  useEffect(()=>{
    if(mode!=="pro")return;
    const draft=loadProDraft();
    if(draft&&isMeaningfulProDraft(draft)){
      setText(draft.text);setMessages(draft.messages);setProSource(draft.source);
      setManualVerification(draft.manual);setSourceFiles(draft.source_files);
      setDraftStatus(`Recovered local draft from ${new Date(draft.saved_at).toLocaleString()}. Reattach session files or restore persisted files from the Source File Vault.`);
    }
    setDraftReady(true);
  },[mode]);
  useEffect(()=>{
    if(mode!=="pro"||!draftReady)return;
    const draft={text,messages,source:proSource,manual:manualVerification,source_files:sourceFiles};
    const timer=window.setTimeout(()=>{
      try{
        if(!isMeaningfulProDraft(draft)){clearProDraft();setDraftStatus("");return}
        saveProDraft(draft);
        setDraftStatus(current=>current.startsWith("Recovered")?current:"Draft saved on this device.");
      }catch{
        setDraftStatus("Draft could not be saved in this browser. Keep this page open and save an important case manually.");
      }
    },600);
    return()=>window.clearTimeout(timer);
  },[mode,draftReady,text,messages,proSource,manualVerification,sourceFiles]);
  const evidenceChecks=useMemo(()=>{
    const identityFields=[proSource.manufacturer.trim(),proSource.model.trim()];
    const identityCount=identityFields.filter(Boolean).length;
    const provenanceState=attachments.length?"documented":sourceFiles.length?"partial":"needed";
    const provenanceDetail=attachments.length
      ?`${attachments.length} attached now · ${sourceFiles.length} fingerprint record${sourceFiles.length===1?"":"s"}`
      :sourceFiles.length
        ?`${sourceFiles.length} fingerprint record${sourceFiles.length===1?"":"s"}; bytes not attached now`
        :"Attach exact source bytes";
    const sourceIdentified=proSource.source_type!=="unknown"&&Boolean(proSource.source_title.trim());
    const sourceReviewable=proSource.source_status==="uploaded"&&(attachments.length>0||proSource.source_type==="field_measurement");
    const manualFields=[manualVerification.verified_model,manualVerification.manual_title,manualVerification.relevant_pages];
    const manualCount=manualFields.filter(x=>x.trim()).length;
    const manualConflict=modelsConflict(proSource.model,manualVerification.verified_model);
    const manualReady=manualCount===3&&Boolean(proSource.model.trim())&&!manualConflict;
    const manualDetail=manualConflict
      ?`Model conflict: ${proSource.model} ≠ ${manualVerification.verified_model}`
      :manualReady
        ?`${manualVerification.verified_model} · page ${manualVerification.relevant_pages}`
        :"Verify appliance model, exact document, and page";
    return [
      {label:"Appliance identity",state:identityCount===2?"documented":identityCount?"partial":"needed",detail:identityCount===2?`${proSource.manufacturer} · ${proSource.model}`:"Manufacturer and exact model"},
      {label:"Source availability",state:provenanceState,detail:provenanceDetail},
      {label:"Controlling source",state:sourceIdentified&&sourceReviewable?"documented":sourceIdentified?"partial":"needed",detail:sourceIdentified?`${proSource.source_title} · ${proSource.source_status.replaceAll("_"," ")}`:"Identify type, title, and availability"},
      {label:"Manual applicability",state:manualReady?"documented":manualCount||manualConflict?"partial":"needed",detail:manualDetail}
    ] as const;
  },[attachments,sourceFiles,proSource,manualVerification]);

  async function addFiles(files:FileList|null){
    if(!files||busy)return;
    const selected=Array.from(files),available=6-attachments.length,sourceContext=proSource;
    if(available<=0){setAttachmentStatus("Remove an attachment before adding another. Maximum: 6.");return}
    setAttachmentStatus(`Preparing ${Math.min(selected.length,available)} attachment${Math.min(selected.length,available)===1?"":"s"}…`);
    const next=[...attachments],errors:string[]=[];
    for(const f of selected.slice(0,available)){
      try{next.push(await prepareAttachment(f))}
      catch(e){errors.push(`${f.name}: ${e instanceof Error?e.message:"Could not prepare file."}`)}
    }
    if(selected.length>available)errors.push(`${selected.length-available} file${selected.length-available===1?" was":"s were"} skipped (maximum 6).`);
    setAttachments(next);
    const added=next.length-attachments.length;
    const prepared=next.slice(attachments.length);
    if(mode==="pro"&&prepared.length){
      setSourceFiles(current=>{
        const hashes=new Set(current.map(record=>record.sha256));
        const records=prepared.flatMap(file=>{
          if(hashes.has(file.sha256))return [];
          hashes.add(file.sha256);
          const role=defaultSourceRole(file,sourceContext);
          return [provenanceFromAttachment(file,role)];
        });
        return records.length?[...current,...records]:current;
      });
    }
    const readyMessage=`${added} attachment${added===1?"":"s"} ready${mode==="pro"&&added?" and recorded in the case manifest":""}.`;
    setAttachmentStatus(errors.length?`${added?`${readyMessage} `:""}${errors.join(" ")}`:readyMessage);
    if(inputRef.current)inputRef.current.value="";
  }

  async function send(value=text){
    const cleaned=value.trim();if((!cleaned&&attachments.length===0)||busy)return;
    const userText=cleaned||`Please review the attached ${attachments.length===1?"file":"files"}.`;
    const next=[...messages,{role:"user" as const,content:userText}],currentAttachments=attachments;
    const requestMessages=modelHistory(next);
    const requestBody=JSON.stringify({
      mode,messages:requestMessages,
      attachments:currentAttachments.map(({original_blob,...a})=>a),
      source_manifest:mode==="pro"?sourceFiles.map(({
        file_name,mime_type,byte_size,sha256,page_count,text_truncated,role,note,storage_status,integrity_status
      })=>({file_name,mime_type,byte_size,sha256,page_count,text_truncated,role,note,storage_status,integrity_status})):undefined,
      pro_source:mode==="pro"?proSource:undefined,
      manual_verification:mode==="pro"?manualVerification:undefined
    });
    if(new Blob([requestBody]).size>4_000_000){
      setAttachmentStatus("This combined request is too large for production upload. Remove one or more photos, or send them separately.");
      return;
    }
    setMessages(next);setText("");setBusy(true);setAttachmentStatus("");
    const controller=new AbortController(),requestId=++nextRequestId.current;
    requestRef.current={id:requestId,controller};
    try{
      const res=await fetch("/api/chat",{method:"POST",headers:{"content-type":"application/json"},body:requestBody,signal:controller.signal});
      const body:{ok?:boolean;error?:string;text?:string}=await res.json().catch(()=>({}));
      if(requestRef.current?.id!==requestId)return;
      if(!res.ok||!body.ok){
        setText(current=>current||cleaned);
        const errorMessage=body.error==="openai_not_configured"
          ?"ChimneyAI is not connected to the model yet. Add the server API key to enable live answers."
          :body.error==="openai_quota_exceeded"
            ?"ChimneyAI's AI service needs OpenAI API credits. Your question and attachments are preserved. The site owner must add credits before live answers can resume."
            :body.error==="model_rate_limited"
              ?"ChimneyAI's AI service is temporarily busy. Your question and attachments are preserved—wait a moment and try again."
              :body.error==="request_rate_limited"
                ?"Too many questions were submitted from this connection in a short time. Your question and attachments are preserved—wait about a minute and try again."
              :"I couldn't complete that request. Your attachments are still available—please try again.";
        setMessages([...markLastAttemptFailed(next),{role:"assistant",kind:"system_error",content:errorMessage}]);
        return;
      }
      setMessages([...next,{role:"assistant",kind:"analysis",content:body.text||"I could not produce a response."}]);
      if(currentAttachments.length)setAttachmentStatus(`${currentAttachments.length} active source attachment${currentAttachments.length===1?" remains":"s remain"} available for follow-up questions.`);
    }catch{
      if(controller.signal.aborted||requestRef.current?.id!==requestId)return;
      setText(current=>current||cleaned);
      setMessages([...markLastAttemptFailed(next),{role:"assistant",kind:"system_error",content:"ChimneyAI could not reach the service. Your attachments are still available—check your connection and try again."}]);
    }finally{
      if(requestRef.current?.id===requestId){requestRef.current=null;setBusy(false)}
    }
  }

  function attachFromVault(attachment:ChatAttachment){
    const current=attachmentsRef.current;
    if(current.some(item=>item.sha256===attachment.sha256))return "duplicate" as const;
    if(current.length>=6)return "full" as const;
    const next=[...current,attachment];
    attachmentsRef.current=next;
    setAttachments(next);
    return "attached" as const;
  }

  function startNewChat(){
    const warning=mode==="pro"?"Start a new chat? Save the current Pro case first if you need this conversation.":"Start a new chat? This conversation will be cleared.";
    if(!window.confirm(warning))return;
    requestRef.current?.controller.abort();requestRef.current=null;setBusy(false);
    setMessages([]);setText("");setAttachments([]);setAttachmentStatus("");
  }

  function discardActiveDraft(){
    if(!window.confirm("Discard the active Pro draft on this device? Saved Pro Cases and Source File Vault bytes will not be deleted."))return;
    requestRef.current?.controller.abort();requestRef.current=null;setBusy(false);clearProDraft();
    setMessages([]);setText("");setAttachments([]);setAttachmentStatus("");setProSource(EMPTY_PRO_SOURCE);
    setManualVerification(EMPTY_MANUAL);setSourceFiles([]);setDraftStatus("");
  }

  return <div className={`chatExperience ${mode}`}><div className={`chatShell ${mode}`}>
    {mode==="pro"&&draftStatus&&<div className={`draftBar ${draftStatus.startsWith("Draft could not")?"draftError":""}`} role="status">
      <span>{draftStatus}</span><button type="button" onClick={discardActiveDraft}>Discard draft</button>
    </div>}
    {messages.length>0&&<div className="chatSessionBar"><span>{messages.length} message{messages.length===1?"":"s"}{messages.length>40?" · recent context used for new answers":""}</span><button type="button" onClick={startNewChat}>New chat</button></div>}
    {messages.length===0&&<div className="welcomePanel"><div className="aiOrb"><Image src="/assets/chimneyai-app-icon.png" alt="ChimneyAI app" width={76} height={76} priority/></div><h2>{mode==="pro"?"What are you working on?":"How can I help with your chimney or fireplace?"}</h2>
      <p>{mode==="pro"?"Upload field photos or report text, run calculations, and ask technical/documentation questions.":"Upload an inspection report or photo and ChimneyAI can help explain what it says or what is visibly shown."}</p>
      <div className="starterGrid">{starters.map(x=><button key={x} type="button" onClick={()=>send(x)}>{x}</button>)}</div></div>}
    <div className="messages" role="log" aria-label="ChimneyAI conversation" aria-live="polite" aria-relevant="additions text" aria-busy={busy}>{messages.map((m,i)=><div key={i} className={`message ${m.role}`}><div className="messageRole">{m.role==="user"?"You":"ChimneyAI"}</div>{mode==="pro"&&m.role==="assistant"&&m.kind!=="system_error"&&<div className="professionalReviewFlag">AI analysis · technician review required</div>}<div className="messageText">{m.role==="assistant"&&m.kind!=="system_error"?<MessageContent content={m.content}/>:m.content}</div></div>)}
      {busy&&<div className="message assistant"><div className="messageRole">ChimneyAI</div>{mode==="pro"&&<div className="professionalReviewFlag">Building evidence-aware analysis</div>}<div className="typing">Analyzing…</div></div>}</div>
    <div className="composer">
      {attachments.length>0&&<div className="attachmentTray">{attachments.map((a,i)=><div className="attachmentChip" key={`${a.name}-${i}`}><span>{a.kind==="image"?"PHOTO":"DOC"} · {a.name}{a.page_count?` · ${a.page_count} pages`:""}{a.text_truncated?" · partial text":""} · {a.sha256.slice(0,10)}…</span><button type="button" aria-label={`Remove ${a.name}`} disabled={busy} onClick={()=>setAttachments(attachments.filter((_,x)=>x!==i))}>×</button></div>)}</div>}
      {attachmentStatus&&<div className="attachmentStatus" role="status" aria-live="polite">{attachmentStatus}</div>}
      {mode==="pro"&&attachments.some(a=>a.kind==="image")&&<div className="quickActions">
        <button type="button" onClick={()=>{setProSource({...proSource,task:"label_scan",source_type:"listing_label",source_status:"uploaded"});setText("Read this label carefully. Extract only legible manufacturer, model, serial, listing/standard markings, fuel/appliance information, and other visible installation data. Identify uncertain characters and tell me exactly what source/manual is needed next.");}}>Treat photo as label scan</button>
        <button type="button" onClick={()=>setText("Second-look these field photos. Separate visible observations, possible concerns, what cannot be determined, and what I should verify/document onsite.")}>Technical photo second-look</button>
        <button type="button" onClick={()=>setText("Create a concise technical research summary from the current case. Separate: appliance identity, controlling source, verified manual identity/revision, known field facts, source requirements, unresolved conflicts/missing information, and suggested objective report language. Do not add facts that are not in the case.")}>Build research summary</button>
      </div>}
      <textarea aria-label={mode==="pro"?"Technical question or field documentation":"Chimney or fireplace question"} value={text} maxLength={20_000} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();send();}}}
        placeholder={mode==="pro"?"Ask a technical question, or attach field documentation…":"Ask a question, or attach your report/photo…"} rows={3}/>
      <div className="composerActions"><button className="attachBtn" type="button" disabled={busy} onClick={()=>inputRef.current?.click()}>＋ Attach</button>
        <input ref={inputRef} hidden type="file" multiple disabled={busy} accept="image/jpeg,image/png,image/webp,image/gif,.pdf,.txt,.md,.csv" onChange={e=>addFiles(e.target.files)}/>
        <button className="sendBtn" type="button" onClick={()=>send()} disabled={busy||(!text.trim()&&attachments.length===0)}>Send</button></div>
      <div className="composerNote">{mode==="pro"?"Active attachments stay with follow-ups until removed. Verify controlling sources and field conditions.":"Active uploads stay with follow-ups until removed. ChimneyAI cannot replace an onsite inspection or issue a safety clearance."}</div>
    </div>
  </div>
  {mode==="pro"&&<div className="proWorkspaceStack">
    <section className="evidenceReadiness" aria-label="Professional evidence readiness">
      <div className="evidenceReadinessHead"><b>Evidence readiness</b><span>No confidence score—only documented, partial, or needed evidence.</span></div>
      <div className="evidenceChecks">{evidenceChecks.map(check=><div className={`evidenceCheck ${check.state}`} key={check.label}>
        <small>{check.state}</small><b>{check.label}</b><span>{check.detail}</span>
      </div>)}</div>
    </section>
    <ProSourceDesk value={proSource} onChange={setProSource}/>
    <ManualFinder manufacturer={proSource.manufacturer} model={proSource.model} onPrepareQuestion={setText}/>
    <ManualVerificationCard value={manualVerification} onChange={setManualVerification} manufacturer={proSource.manufacturer} model={proSource.model}/>
    <SourceManifest attachments={attachments} records={sourceFiles} sourceContext={proSource} onChange={setSourceFiles} onAttach={attachFromVault}/>
    <ProFieldTools/>
    <ProCaseManager source={proSource} manual={manualVerification} messages={messages} sourceFiles={sourceFiles}
      onLoad={({source,manual,question,messages:loadedMessages,sourceFiles:loadedSourceFiles})=>{setProSource(source);setManualVerification(manual);setMessages(loadedMessages);setSourceFiles(loadedSourceFiles);if(question)setText(question)}}
      onClearChat={startNewChat}/>
    <details className="workspaceGroup cloudTools">
      <summary><span>Cloud &amp; multi-device</span><small>optional sign-in, sync, and retrieval</small></summary>
      <div className="workspaceGroupBody">
        <CloudWorkspace/>
        <CloudCaseBrowser onImported={(c)=>{setProSource(c.source);setManualVerification(c.manual);setMessages(c.messages.map(({role,content})=>({role,content})));setSourceFiles(c.source_files);if(c.technical_question)setText(c.technical_question);window.dispatchEvent(new Event("chimneyai:cases-changed"))}}/>
      </div>
    </details>
  </div>}
  </div>;
}
