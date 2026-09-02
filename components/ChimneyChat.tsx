"use client";
import {useMemo,useRef,useState} from "react";
import {prepareAttachment,type ChatAttachment} from "@/lib/client-attachments";
import ProFieldTools from "@/components/ProFieldTools";
import ProSourceDesk,{EMPTY_PRO_SOURCE,type ProSourceState} from "@/components/ProSourceDesk";
import ManualFinder from "@/components/ManualFinder";
import ManualVerificationCard,{EMPTY_MANUAL,type ManualVerification} from "@/components/ManualVerificationCard";
import ProCaseManager from "@/components/ProCaseManager";
import SourceManifest from "@/components/SourceManifest";
import type {SourceProvenanceRecord} from "@/lib/source-provenance";
import CloudWorkspace from "@/components/CloudWorkspace";
import CloudCaseBrowser from "@/components/CloudCaseBrowser";

type Mode="homeowner"|"pro"; type Msg={role:"user"|"assistant";content:string};
const starterHomeowner=["Explain this inspection report to me.","What does this repair recommendation mean?","What should I ask before hiring a chimney sweep?","Can you explain what you can see in a fireplace photo?"];
const starterPro=["Help me write objective report language.","Check a fireplace opening-to-flue ratio.","Second-look these inspection photos.","Help me structure a manufacturer-manual verification."];

export default function ChimneyChat({mode}:{mode:Mode}){
  const [messages,setMessages]=useState<Msg[]>([]),[text,setText]=useState(""),[busy,setBusy]=useState(false);
  const [attachments,setAttachments]=useState<ChatAttachment[]>([]),[attachmentStatus,setAttachmentStatus]=useState("");
  const [proSource,setProSource]=useState<ProSourceState>(EMPTY_PRO_SOURCE);
  const [manualVerification,setManualVerification]=useState<ManualVerification>(EMPTY_MANUAL);
  const [sourceFiles,setSourceFiles]=useState<SourceProvenanceRecord[]>([]);
  const inputRef=useRef<HTMLInputElement>(null);const starters=useMemo(()=>mode==="pro"?starterPro:starterHomeowner,[mode]);

  async function addFiles(files:FileList|null){
    if(!files)return;setAttachmentStatus("Preparing attachment…");
    try{
      const next=[...attachments];
      for(const f of Array.from(files).slice(0,6-next.length))next.push(await prepareAttachment(f));
      setAttachments(next);setAttachmentStatus("");
    }catch(e){setAttachmentStatus(e instanceof Error?e.message:"Could not prepare attachment.");}
    if(inputRef.current)inputRef.current.value="";
  }

  async function send(value=text){
    const cleaned=value.trim();if((!cleaned&&attachments.length===0)||busy)return;
    const userText=cleaned||`Please review the attached ${attachments.length===1?"file":"files"}.`;
    const next=[...messages,{role:"user" as const,content:userText}];setMessages(next);setText("");setBusy(true);
    const currentAttachments=attachments;setAttachments([]);
    const res=await fetch("/api/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
        mode,messages:next,
        attachments:currentAttachments.map(({original_blob,...a})=>a),
        pro_source:mode==="pro"?proSource:undefined,
        manual_verification:mode==="pro"?manualVerification:undefined
      })});
    const body=await res.json().catch(()=>({}));setBusy(false);
    if(!res.ok||!body.ok){setMessages([...next,{role:"assistant",content:body.error==="openai_not_configured"?"ChimneyAI is not connected to the model yet. Add the server API key to enable live answers.":"I couldn't complete that request right now."}]);return;}
    setMessages([...next,{role:"assistant",content:body.text}]);
  }

  return <div className={`chatShell ${mode}`}>
    {mode==="pro"&&<>
      <CloudWorkspace/>
      <CloudCaseBrowser onImported={(c)=>{setProSource(c.source);setManualVerification(c.manual);setMessages(c.messages.map(({role,content})=>({role,content})));setSourceFiles(c.source_files);if(c.technical_question)setText(c.technical_question);window.dispatchEvent(new Event("chimneyai:cases-changed"))}}/>
      <ProSourceDesk value={proSource} onChange={setProSource}/>
      <ManualFinder manufacturer={proSource.manufacturer} model={proSource.model} onPrepareQuestion={setText}/>
      <ManualVerificationCard value={manualVerification} onChange={setManualVerification} manufacturer={proSource.manufacturer} model={proSource.model}/>
      <SourceManifest attachments={attachments} records={sourceFiles} onChange={setSourceFiles}/>
      <ProCaseManager source={proSource} manual={manualVerification} messages={messages} sourceFiles={sourceFiles}
        onLoad={({source,manual,question,messages:loadedMessages,sourceFiles:loadedSourceFiles})=>{setProSource(source);setManualVerification(manual);setMessages(loadedMessages);setSourceFiles(loadedSourceFiles);if(question)setText(question)}}
        onClearChat={()=>setMessages([])}/>
      <ProFieldTools/>
    </>}
    {messages.length===0&&<div className="welcomePanel"><div className="aiOrb">AI</div><h2>{mode==="pro"?"What are you working on?":"How can I help with your chimney or fireplace?"}</h2>
      <p>{mode==="pro"?"Upload field photos or report text, run calculations, and ask technical/documentation questions.":"Upload an inspection report or photo and ChimneyAI can help explain what it says or what is visibly shown."}</p>
      <div className="starterGrid">{starters.map(x=><button key={x} type="button" onClick={()=>send(x)}>{x}</button>)}</div></div>}
    <div className="messages">{messages.map((m,i)=><div key={i} className={`message ${m.role}`}><div className="messageRole">{m.role==="user"?"You":"ChimneyAI"}</div><div className="messageText">{m.content}</div></div>)}
      {busy&&<div className="message assistant"><div className="messageRole">ChimneyAI</div><div className="typing">Analyzing…</div></div>}</div>
    <div className="composer">
      {attachments.length>0&&<div className="attachmentTray">{attachments.map((a,i)=><div className="attachmentChip" key={`${a.name}-${i}`}><span>{a.kind==="image"?"PHOTO":"DOC"} · {a.name} · {a.sha256.slice(0,10)}…</span><button onClick={()=>setAttachments(attachments.filter((_,x)=>x!==i))}>×</button></div>)}</div>}
      {attachmentStatus&&<div className="attachmentStatus">{attachmentStatus}</div>}
      {mode==="pro"&&attachments.some(a=>a.kind==="image")&&<div className="quickActions">
        <button type="button" onClick={()=>{setProSource({...proSource,task:"label_scan",source_type:"listing_label",source_status:"uploaded"});setText("Read this label carefully. Extract only legible manufacturer, model, serial, listing/standard markings, fuel/appliance information, and other visible installation data. Identify uncertain characters and tell me exactly what source/manual is needed next.");}}>Treat photo as label scan</button>
        <button type="button" onClick={()=>setText("Second-look these field photos. Separate visible observations, possible concerns, what cannot be determined, and what I should verify/document onsite.")}>Technical photo second-look</button>
        <button type="button" onClick={()=>setText("Create a concise technical research summary from the current case. Separate: appliance identity, controlling source, verified manual identity/revision, known field facts, source requirements, unresolved conflicts/missing information, and suggested objective report language. Do not add facts that are not in the case.")}>Build research summary</button>
      </div>}
      <textarea value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
        placeholder={mode==="pro"?"Ask a technical question, or attach field documentation…":"Ask a question, or attach your report/photo…"} rows={3}/>
      <div className="composerActions"><button className="attachBtn" type="button" onClick={()=>inputRef.current?.click()}>＋ Attach</button>
        <input ref={inputRef} hidden type="file" multiple accept="image/*,.pdf,.txt,.md,.csv" onChange={e=>addFiles(e.target.files)}/>
        <button className="sendBtn" onClick={()=>send()} disabled={busy||(!text.trim()&&attachments.length===0)}>Send</button></div>
      <div className="composerNote">{mode==="pro"?"Photo/document analysis supports professional judgment; verify controlling sources and field conditions.":"Uploads can be explained, but ChimneyAI cannot replace an onsite inspection or issue a safety clearance."}</div>
    </div>
  </div>;
}