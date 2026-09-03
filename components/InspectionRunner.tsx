"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import {getInspectionChecklist} from "@/lib/inspection-checklists";
import {loadInspections,normalizeInspection,saveInspections,upsertInspection,type FindingStatus,type Inspection} from "@/lib/inspections";

const STATUS_OPTIONS:ReadonlyArray<{value:FindingStatus;label:string}>=[
  {value:"satisfactory",label:"Satisfactory"},{value:"monitor",label:"Monitor"},{value:"observation_noted",label:"Observation noted"},
  {value:"maintenance_recommended",label:"Maintenance recommended"},{value:"repair_recommended",label:"Repair recommended"},
  {value:"further_evaluation_recommended",label:"Further evaluation recommended"},{value:"unable_to_inspect",label:"Unable to inspect"},{value:"not_applicable",label:"Not applicable"}
];

export default function InspectionRunner({inspection,onChange}:{inspection:Inspection;onChange:(inspection:Inspection)=>void}){
  const system=inspection.systems[0];
  const checklist=useMemo(()=>system?getInspectionChecklist(system.system_type,inspection.inspection_type):[],[system,inspection.inspection_type]);
  const [step,setStep]=useState(0),[findingStatus,setFindingStatus]=useState<FindingStatus|"">(""),[note,setNote]=useState(""),[message,setMessage]=useState("");
  const current=checklist[step];
  const existing=current&&system?inspection.findings.find(finding=>finding.system_id===system.id&&finding.component===current.id):undefined;
  const checklistIds=new Set(checklist.map(item=>item.id));
  const completed=new Set(inspection.findings.filter(finding=>finding.system_id===system?.id&&checklistIds.has(finding.component)).map(finding=>finding.component)).size;

  useEffect(()=>{
    setFindingStatus(existing?.status||"");setNote(existing?.raw_note||"");setMessage("");
  },[existing?.id,existing?.status,existing?.raw_note,current?.id]);

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
    const candidate=normalizeInspection({...inspection,findings:[...inspection.findings.filter(finding=>finding.id!==nextFinding.id),nextFinding],updated_at:now});
    if(!candidate){setMessage("This component could not be saved. Review the inspection setup and try again.");return}
    try{
      saveInspections(upsertInspection(loadInspections(),candidate));onChange(candidate);setMessage("Component saved on this device.");
      if(step<checklist.length-1)setStep(value=>value+1);
    }catch(error){setMessage(error instanceof Error?error.message:"This component could not be saved in this browser.")}
  }

  if(!system||!current)return null;
  return <section className="inspectionRunner" aria-labelledby="inspection-runner-title">
    <div className="inspectionRunnerHead"><div><small>Guided component review</small><b id="inspection-runner-title">{system.display_name}</b></div><span>{completed} of {checklist.length} documented</span></div>
    <div className="inspectionProgress" aria-label={`${completed} of ${checklist.length} components documented`}><span style={{width:`${Math.round(completed/checklist.length*100)}%`}} /></div>
    <form onSubmit={saveFinding}>
      <div className="inspectionStepMeta"><span>Step {step+1} of {checklist.length}</span>{current.photoRecommended?<em>Photo recommended</em>:<em>Photo optional</em>}</div>
      <h3>{current.label}</h3>
      <fieldset><legend>Technician-selected status</legend><div className="inspectionStatusGrid">{STATUS_OPTIONS.map(option=><label key={option.value} className={findingStatus===option.value?"selected":""}><input required type="radio" name={`status-${current.id}`} value={option.value} checked={findingStatus===option.value} onChange={()=>setFindingStatus(option.value)} /><span>{option.label}</span></label>)}</div></fieldset>
      <label className="inspectionNote">Field note<textarea rows={3} value={note} onChange={event=>setNote(event.target.value)} placeholder="Record only what you observed. Voice entry is available from your phone keyboard." /></label>
      <div className="inspectionRunnerActions"><button type="button" disabled={step===0} onClick={()=>setStep(value=>value-1)}>Previous</button><span role="status" aria-live="polite">{message}</span><button type="submit" disabled={!findingStatus}>{step===checklist.length-1?"Save component":"Save & next"}</button></div>
    </form>
    <p>AI can assist with wording later. The technician remains responsible for every status and observation.</p>
  </section>;
}
