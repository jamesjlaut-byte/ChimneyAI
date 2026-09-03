"use client";
import {useEffect,useMemo,useRef,useState,type FormEvent} from "react";
import InspectionPhotoCapture from "@/components/InspectionPhotoCapture";
import {firstIncompleteChecklistIndex,getInspectionChecklist,missingChecklistItems} from "@/lib/inspection-checklists";
import {recommendedPhotoGaps} from "@/lib/inspection-photo";
import {inspectionNoteDraftKey,loadInspectionNoteDraft,MAX_DRAFT_NOTE_LENGTH} from "@/lib/inspection-note-draft";
import {loadInspections,normalizeInspection,saveInspections,upsertInspection,type FindingStatus,type Inspection} from "@/lib/inspections";

const STATUS_OPTIONS:ReadonlyArray<{value:FindingStatus;label:string}>=[
  {value:"satisfactory",label:"Satisfactory"},{value:"monitor",label:"Monitor"},{value:"observation_noted",label:"Observation noted"},
  {value:"maintenance_recommended",label:"Maintenance recommended"},{value:"repair_recommended",label:"Repair recommended"},
  {value:"further_evaluation_recommended",label:"Further evaluation recommended"},{value:"unable_to_inspect",label:"Unable to inspect"},{value:"not_applicable",label:"Not applicable"}
];

export default function InspectionRunner({inspection,onChange,onDirtyChange}:{inspection:Inspection;onChange:(inspection:Inspection)=>void;onDirtyChange?:(dirty:boolean)=>void}){
  const system=inspection.systems[0];
  const componentHeading=useRef<HTMLHeadingElement>(null),focusComponent=useRef(false);
  const checklist=useMemo(()=>system?getInspectionChecklist(system.system_type,inspection.inspection_type):[],[system,inspection.inspection_type]);
  const [step,setStep]=useState(()=>{
    const draft=system?.id?loadInspectionNoteDraft(inspection.id,system.id):null;
    const draftStep=draft?checklist.findIndex(item=>item.id===draft.component):-1;
    return draftStep>=0?draftStep:firstIncompleteChecklistIndex(checklist,inspection.findings.filter(finding=>finding.system_id===system?.id).map(finding=>finding.component));
  }),[findingStatus,setFindingStatus]=useState<FindingStatus|"">(""),[note,setNote]=useState(""),[message,setMessage]=useState("");
  const [conflictingDraft,setConflictingDraft]=useState<string|null>(null);
  const current=checklist[step];
  const existing=current&&system?inspection.findings.find(finding=>finding.system_id===system.id&&finding.component===current.id):undefined;
  const noteBase=JSON.stringify([existing?.id||"",existing?.updated_at||"",existing?.status||"",existing?.raw_note||""]);
  const checklistIds=new Set(checklist.map(item=>item.id));
  const systemFindings=inspection.findings.filter(finding=>finding.system_id===system?.id&&checklistIds.has(finding.component));
  const findingsByComponent=new Map(systemFindings.map(finding=>[finding.component,finding]));
  const completed=new Set(systemFindings.map(finding=>finding.component)).size;
  const missing=missingChecklistItems(checklist,systemFindings.map(finding=>finding.component));
  const systemPhotos=inspection.photos.filter(photo=>photo.system_id===system?.id);
  const photoGaps=recommendedPhotoGaps(checklist,systemFindings,systemPhotos);
  const hasUnsavedChanges=findingStatus!==(existing?.status||"")||note!==(existing?.raw_note||"");

  useEffect(()=>{onDirtyChange?.(hasUnsavedChanges)},[hasUnsavedChanges,onDirtyChange]);
  useEffect(()=>{
    if(!hasUnsavedChanges)return;
    const warnBeforeExit=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue=""};
    window.addEventListener("beforeunload",warnBeforeExit);
    return()=>window.removeEventListener("beforeunload",warnBeforeExit);
  },[hasUnsavedChanges]);
  useEffect(()=>{if(focusComponent.current){componentHeading.current?.focus();focusComponent.current=false}},[step]);

  useEffect(()=>{
    setFindingStatus(existing?.status||"");setNote(existing?.raw_note||"");setMessage("");
    setConflictingDraft(null);
    const draft=system?.id?loadInspectionNoteDraft(inspection.id,system.id):null;
    if(draft?.component===current?.id){
      if(draft.base===noteBase){setNote(draft.note);setMessage("Recovered an unsaved note from this tab. Review it and save the component.")}
      else{setConflictingDraft(draft.note);setMessage("The saved finding changed. Your older draft is shown below and was not applied.")}
    }
  },[existing?.id,existing?.status,existing?.raw_note,current?.id,inspection.id,system?.id,noteBase]);

  function editNote(value:string){
    setNote(value);
    if(!system||!current)return;
    try{
      const key=inspectionNoteDraftKey(inspection.id,system.id);
      if(value===(existing?.raw_note||""))sessionStorage.removeItem(key);
      else sessionStorage.setItem(key,JSON.stringify({version:1,inspectionId:inspection.id,systemId:system.id,component:current.id,base:noteBase,note:value}));
    }catch{setMessage("Tab draft storage is unavailable. Keep this page open and save the component before leaving.")}
  }

  function goToStep(nextStep:number){
    if(hasUnsavedChanges){setMessage("Save this component before moving to another step.");return}
    setStep(nextStep);
  }

  function reviewNextPhoto(){
    if(hasUnsavedChanges){setMessage("Save this component before moving to another step.");return}
    const nextStep=checklist.findIndex(item=>item.id===photoGaps[0]?.id);
    if(nextStep<0)return;
    if(nextStep===step){componentHeading.current?.focus();return}
    focusComponent.current=true;goToStep(nextStep);
  }

  function saveFinding(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!system||!current||!findingStatus)return;
    const now=new Date().toISOString();
    const nextFinding={
      id:existing?.id||`finding-${crypto.randomUUID()}`,system_id:system.id,component:current.id,raw_note:note,
      technician_observation:note,ai_suggestion:"",ai_confidence:null,review_state:"not_requested" as const,reviewed_by:null,reviewed_at:null,
      status:findingStatus,recommendation:existing?.recommendation||"",source_sha256:existing?.source_sha256||[],photo_ids:existing?.photo_ids||[],
      measurement_ids:existing?.measurement_ids||[],created_at:existing?.created_at||now,updated_at:now
    };
    const candidate=normalizeInspection({...inspection,status:inspection.status==="draft"||inspection.status==="ready_for_review"?"in_progress":inspection.status,findings:[...inspection.findings.filter(finding=>finding.id!==nextFinding.id),nextFinding],updated_at:now});
    if(!candidate){setMessage("This component could not be saved. Review the inspection setup and try again.");return}
    try{
      saveInspections(upsertInspection(loadInspections(),candidate,inspection));
      try{sessionStorage.removeItem(inspectionNoteDraftKey(inspection.id,system.id))}catch{/* The inspection save already succeeded. */}
      setConflictingDraft(null);onChange(candidate);setMessage("Component saved on this device.");
      if(step<checklist.length-1)setStep(value=>value+1);
    }catch(error){setMessage(error instanceof Error?error.message:"This component could not be saved in this browser.")}
  }

  function markReadyForReview(){
    if(missing.length||hasUnsavedChanges||inspection.status!=="in_progress")return;
    const candidate=normalizeInspection({...inspection,status:"ready_for_review",updated_at:new Date().toISOString()});
    if(!candidate){setMessage("The inspection could not be prepared for review.");return}
    try{saveInspections(upsertInspection(loadInspections(),candidate,inspection));onChange(candidate);setMessage("Inspection marked ready for technician review.")}
    catch(error){setMessage(error instanceof Error?error.message:"The inspection could not be prepared for review.")}
  }

  if(!system||!current)return null;
  return <section className="inspectionRunner" aria-labelledby="inspection-runner-title">
    <div className="inspectionRunnerHead"><div><small>Guided component review</small><b id="inspection-runner-title">{system.display_name}</b></div><span>{completed} of {checklist.length} documented</span></div>
    <div className="inspectionProgress" aria-label={`${completed} of ${checklist.length} components documented`}><span style={{width:`${Math.round(completed/checklist.length*100)}%`}} /></div>
    <details className="inspectionStepList"><summary>Review steps <small>{completed===checklist.length?"All documented":"Tap to revisit a component"}</small></summary><div>{checklist.map((item,index)=>{const saved=findingsByComponent.get(item.id),photoCount=saved?systemPhotos.filter(photo=>photo.finding_ids.includes(saved.id)).length:0;return <button type="button" key={item.id} className={index===step?"active":""} aria-current={index===step?"step":undefined} onClick={()=>goToStep(index)}><span>{index+1}. {item.label}</span><small>{saved?`${STATUS_OPTIONS.find(option=>option.value===saved.status)?.label}${photoCount?` · ${photoCount} photo${photoCount===1?"":"s"}`:""}`:"Not documented"}</small></button>})}</div></details>
    <form onSubmit={saveFinding}>
      <div className="inspectionStepMeta"><span>Step {step+1} of {checklist.length}</span>{current.photoRecommended?<em>Photo recommended</em>:<em>Photo optional</em>}</div>
      <h3 ref={componentHeading} tabIndex={-1}>{current.label}</h3>
      <fieldset><legend>Technician-selected status</legend><div className="inspectionStatusGrid">{STATUS_OPTIONS.map(option=><label key={option.value} className={findingStatus===option.value?"selected":""}><input required type="radio" name={`status-${current.id}`} value={option.value} checked={findingStatus===option.value} onChange={()=>setFindingStatus(option.value)} /><span>{option.label}</span></label>)}</div></fieldset>
      <label className="inspectionNote">Field note<textarea rows={3} maxLength={MAX_DRAFT_NOTE_LENGTH} value={note} onChange={event=>editNote(event.target.value)} placeholder="Record only what you observed. Voice entry is available from your phone keyboard." /></label>
      {conflictingDraft!==null?<label className="inspectionNote">Older unsaved note — not applied<textarea readOnly rows={3} value={conflictingDraft}/></label>:null}
      <p>Note drafts can recover after a reload in this tab. They are not saved findings; closing the tab or clearing browser data may remove them. Status selections still require Save.</p>
      <div className="inspectionRunnerActions"><button type="button" disabled={step===0} onClick={()=>goToStep(step-1)}>Previous</button><span role="status" aria-live="polite">{hasUnsavedChanges?"Unsaved changes — save this component before leaving. ":""}{message}</span><button type="submit" disabled={!findingStatus}>{step===checklist.length-1?"Save component":"Save & next"}</button></div>
    </form>
    <InspectionPhotoCapture inspection={inspection} finding={existing} component={current.id} label={current.label} onChange={onChange}/>
    <div className={`inspectionPhotoCoverage ${photoGaps.length||missing.length?"needsPhotos":"covered"}`}><b>{photoGaps.length?`${photoGaps.length} recommended photo${photoGaps.length===1?"":"s"} missing`:missing.length?"Photo review in progress":"No recommended photo gaps in documented components"}</b><span>{photoGaps.length?photoGaps.slice(0,3).map(item=>item.label).join(" · ")+(photoGaps.length>3?` · +${photoGaps.length-3} more`:""):missing.length?"Save the remaining component statuses to finish checking photo recommendations.":"Photo-optional, inaccessible, and not-applicable components are excluded."} Recommended photos are a quality-control prompt, not proof that an area was accessible or a condition exists.</span></div>
    {photoGaps.length?<button className="inspectionPhotoReview" type="button" onClick={reviewNextPhoto} disabled={hasUnsavedChanges}>Review next missing photo: {photoGaps[0].label}</button>:null}
    <section className={`inspectionCompletion ${missing.length?"incomplete":"complete"}`} aria-labelledby="inspection-completion-title"><div><small>Completion review</small><b id="inspection-completion-title">{missing.length?`${missing.length} component${missing.length===1?"":"s"} still undocumented`:inspection.status==="ready_for_review"?"Ready for technician review":"All components documented"}</b><span>{missing.length?missing.slice(0,3).map(item=>item.label).join(" · ")+(missing.length>3?` · +${missing.length-3} more`:""):"This means the checklist is complete—not that the system is safe or compliant."}</span></div><button type="button" onClick={markReadyForReview} disabled={Boolean(missing.length)||hasUnsavedChanges||inspection.status!=="in_progress"}>{inspection.status==="ready_for_review"?"Ready for review":"Mark ready for review"}</button></section>
    <p>AI can assist with wording later. The technician remains responsible for every status and observation.</p>
  </section>;
}
