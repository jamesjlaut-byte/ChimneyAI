"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import InspectionRunner from "@/components/InspectionRunner";
import {buildInspectionAiBrief} from "@/lib/inspection-ai-brief";
import {buildFindingWordingBrief,WORDING_TONES,type WordingTone} from "@/lib/finding-wording-brief";
import {INSPECTION_SCHEMA_VERSION,loadInspections,normalizeInspection,saveInspections,upsertInspection,type Inspection,type InspectionType,type SystemType} from "@/lib/inspections";

const SYSTEM_OPTIONS:ReadonlyArray<{value:SystemType;label:string}>=[
  {value:"masonry_fireplace",label:"Masonry fireplace"},{value:"factory_built_fireplace",label:"Factory-built fireplace"},
  {value:"wood_stove",label:"Wood stove"},{value:"wood_insert",label:"Wood insert"},{value:"pellet_appliance",label:"Pellet appliance"},
  {value:"gas_fireplace",label:"Gas fireplace"},{value:"gas_insert",label:"Gas insert"},{value:"gas_log_set",label:"Gas log set"},
  {value:"freestanding_gas_appliance",label:"Freestanding gas stove"},{value:"masonry_heater",label:"Masonry heater"},{value:"other",label:"Other system"}
];
const INSPECTION_OPTIONS:ReadonlyArray<{value:InspectionType;label:string}>=[
  {value:"level_1",label:"Level 1"},{value:"level_2",label:"Level 2"},{value:"limited_scope",label:"Limited scope"},
  {value:"service_documentation",label:"Service documentation"},{value:"other",label:"Other"}
];
function newId(prefix:string){return `${prefix}-${crypto.randomUUID()}`}
function localDate(){const now=new Date(),month=String(now.getMonth()+1).padStart(2,"0"),day=String(now.getDate()).padStart(2,"0");return `${now.getFullYear()}-${month}-${day}`}

export default function InspectionSetup({onPrepareAiBrief}:{onPrepareAiBrief?:(brief:string)=>boolean}){
  const [active,setActive]=useState<Inspection|null>(null),[status,setStatus]=useState("");
  const [technicianName,setTechnicianName]=useState(""),[firstName,setFirstName]=useState(""),[lastName,setLastName]=useState("");
  const [streetAddress,setStreetAddress]=useState(""),[city,setCity]=useState(""),[state,setState]=useState(""),[postalCode,setPostalCode]=useState("");
  const [systemName,setSystemName]=useState("Primary system"),[systemType,setSystemType]=useState<SystemType>("masonry_fireplace");
  const [inspectionType,setInspectionType]=useState<InspectionType>("level_1");
  const [componentDirty,setComponentDirty]=useState(false);
  const [confirmAiBrief,setConfirmAiBrief]=useState(false);
  const [wordingFindingId,setWordingFindingId]=useState<string|null>(null),[wordingTone,setWordingTone]=useState<WordingTone>("standard"),[briefError,setBriefError]=useState("");
  const briefPanel=useRef<HTMLElement>(null);
  const wordingFinding=active?.findings.find(finding=>finding.id===wordingFindingId&&finding.system_id===active.systems[0]?.id);
  useEffect(()=>{if(confirmAiBrief){briefPanel.current?.focus();briefPanel.current?.scrollIntoView({block:"center",behavior:"smooth"})}},[confirmAiBrief,wordingFindingId]);

  function prepareConfirmedBrief(){
    if(!active||!onPrepareAiBrief||componentDirty)return;
    try{
      const brief=wordingFindingId?buildFindingWordingBrief(active,wordingFindingId,wordingTone):buildInspectionAiBrief(active);
      if(!brief){setBriefError("No saved note is available for this component. Save a field note before requesting wording.");return}
      if(onPrepareAiBrief(brief)){setConfirmAiBrief(false);setBriefError("");setStatus("Inspection question prepared in chat. Review the saved notes and press Send when ready.")}
      else setBriefError("The chat could not be replaced yet. Wait for current photo preparation or the AI response, then try again.");
    }catch(error){setBriefError(error instanceof Error?error.message:"The wording question could not be prepared. Your saved finding is unchanged.")}
  }

  useEffect(()=>{
    const existing=loadInspections().find(item=>item.status==="draft"||item.status==="in_progress"||item.status==="ready_for_review");
    if(!existing)return;
    const system=existing.systems[0];
    setActive(existing);setTechnicianName(existing.technician.name);setFirstName(existing.customer.first_name);setLastName(existing.customer.last_name);
    setStreetAddress(existing.property.street_address);setCity(existing.property.city);setState(existing.property.state);setPostalCode(existing.property.postal_code);
    if(system){setSystemName(system.display_name||"Primary system");setSystemType(system.system_type)}
    setInspectionType(existing.inspection_type);setStatus("Recovered the active inspection setup from this device.");
  },[]);

  function saveSetup(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(componentDirty){setStatus("Save the current component note and status before changing inspection setup.");return}
    const now=new Date().toISOString(),customerId=active?.customer.id||newId("customer"),propertyId=active?.property.id||newId("property");
    const priorSystem=active?.systems[0],systemId=priorSystem?.id||newId("system");
    const candidate=normalizeInspection({
      ...(active||{}),version:INSPECTION_SCHEMA_VERSION,id:active?.id||newId("inspection"),created_at:active?.created_at||now,updated_at:now,
      started_at:active?.started_at||now,status:active?.status==="ready_for_review"?"in_progress":active?.status||"in_progress",inspection_date:active?.inspection_date||localDate(),inspection_type:inspectionType,
      technician:{...active?.technician,id:active?.technician.id||newId("technician"),name:technicianName},
      customer:{...active?.customer,id:customerId,first_name:firstName,last_name:lastName},
      property:{...active?.property,id:propertyId,customer_id:customerId,street_address:streetAddress,city,state,postal_code:postalCode},
      systems:[{...priorSystem,id:systemId,property_id:propertyId,display_name:systemName,system_type:systemType},...(active?.systems.slice(1)||[])],
      evidence:active?.evidence||[],findings:active?.findings||[],measurements:active?.measurements||[],photos:active?.photos||[],
      report:active?.report||{status:"not_started",signature_status:"not_requested",revision:0}
    });
    if(!candidate){setStatus("Inspection setup could not be saved. Review the required fields and try again.");return}
    try{saveInspections(upsertInspection(loadInspections(),candidate,active||undefined));setActive(candidate);setStatus(active?.status==="ready_for_review"?"Setup saved. Review reopened: check the component checklist before marking ready again.":"Inspection setup saved on this device. Continue with the component checklist below.")}
    catch(error){setStatus(error instanceof Error?error.message:"Inspection setup could not be saved in this browser.")}
  }

  return <details className="workspaceGroup inspectionSetup">
    <summary><span>Guided inspection</span><small>customer · property · system · inspection level</small></summary>
    <form className="inspectionSetupBody" onSubmit={saveSetup}>
      <div className="inspectionSetupIntro"><div><b>{active?"Active inspection setup":"Start an inspection"}</b><span>Enter the job once. ChimneyAI will reuse this context through the guided workflow.</span></div>{active&&<small>{active.inspection_date} · saved locally</small>}</div>
      <div className="inspectionSetupGrid">
        <label>Technician name<input required autoComplete="name" value={technicianName} onChange={event=>setTechnicianName(event.target.value)} /></label>
        <label>Customer first name<input required autoComplete="given-name" value={firstName} onChange={event=>setFirstName(event.target.value)} /></label>
        <label>Customer last name<input required autoComplete="family-name" value={lastName} onChange={event=>setLastName(event.target.value)} /></label>
        <label className="inspectionAddress">Property address<input required autoComplete="street-address" value={streetAddress} onChange={event=>setStreetAddress(event.target.value)} /></label>
        <label>City<input autoComplete="address-level2" value={city} onChange={event=>setCity(event.target.value)} /></label>
        <label>State<input autoComplete="address-level1" value={state} onChange={event=>setState(event.target.value)} /></label>
        <label>Postal code<input autoComplete="postal-code" inputMode="numeric" value={postalCode} onChange={event=>setPostalCode(event.target.value)} /></label>
        <label>System location<input required value={systemName} onChange={event=>setSystemName(event.target.value)} /></label>
        <label>System type<select value={systemType} onChange={event=>setSystemType(event.target.value as SystemType)}>{SYSTEM_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label>Inspection type<select value={inspectionType} onChange={event=>setInspectionType(event.target.value as InspectionType)}>{INSPECTION_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </div>
      <div className="inspectionSetupActions"><span role="status" aria-live="polite">{componentDirty?"Save the current component note and status before changing inspection setup.":status}</span><button type="submit" disabled={componentDirty}>{active?"Save setup":"Start inspection"}</button></div>
      <p>Browser-first draft. AI assists; the technician controls observations, findings, and final conclusions.</p>
    </form>
    {active?<InspectionRunner key={`${active.systems[0]?.id}:${active.systems[0]?.system_type}:${active.inspection_type}`} inspection={active} onChange={setActive} onDirtyChange={setComponentDirty} onPrepareWording={onPrepareAiBrief?findingId=>{setWordingFindingId(findingId);setWordingTone("standard");setBriefError("");setConfirmAiBrief(true)}:undefined}/>:null}
    {active&&onPrepareAiBrief?<div className="inspectionSetupBody">
      <p>Use this system’s saved setup, notes, and photo gaps to prepare a question. Review it before sending; photos are not attached automatically. Save edits first.</p>
      {confirmAiBrief?<section aria-label="Confirm inspection question" ref={briefPanel} tabIndex={-1}>
        {wordingFindingId?<div><h3>Draft wording — technician review required</h3><label className="inspectionNote">Original saved note<textarea readOnly rows={3} value={wordingFinding?.raw_note||""}/></label><div className="inspectionSetupGrid"><label>Wording tone<select value={wordingTone} onChange={event=>{const tone=WORDING_TONES.find(value=>value===event.target.value);if(tone)setWordingTone(tone)}}><option value="concise">Concise</option><option value="standard">Standard</option><option value="detailed">Detailed</option></select></label></div><p>Only this saved note and component status will be used. Photos are not included. Suggestions remain in chat for review; they do not replace or approve the saved finding.</p></div>:null}
        <p>This replaces the current chat, active attachments, Source Desk, manual context, and source manifest to avoid mixing jobs. Save the current Pro case and persist original photos you need first. Saved cases, inspections, and vault originals stay intact. Nothing is sent until you press Send.</p>
        <p role="status">{briefError}</p>
        <div className="inspectionSetupActions"><button type="button" onClick={()=>setConfirmAiBrief(false)}>Keep current chat</button><button type="button" disabled={componentDirty} onClick={prepareConfirmedBrief}>Replace chat with inspection question</button></div>
      </section>:<div className="inspectionSetupActions"><button type="button" disabled={componentDirty} onClick={()=>{setWordingFindingId(null);setBriefError("");setConfirmAiBrief(true)}}>Ask AI what to check next</button></div>}
    </div>:null}
  </details>;
}
