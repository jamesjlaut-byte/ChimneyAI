"use client";
import {useEffect,useRef,useState,type ChangeEvent} from "react";
import Image from "next/image";
import {defaultPhotoCategory,validateInspectionPhoto} from "@/lib/inspection-photo";
import {loadInspections,normalizeInspection,saveInspections,upsertInspection,type Inspection,type InspectionFinding,type InspectionPhoto,type PhotoCategory} from "@/lib/inspections";
import {getStoredSourceFile,putStoredSourceFile,sha256Blob} from "@/lib/source-file-store";
import {preparePhoneImage} from "@/lib/phone-image";

const CATEGORY_OPTIONS:ReadonlyArray<{value:PhotoCategory;label:string}>=[
  {value:"firebox",label:"Firebox"},{value:"hearth",label:"Hearth"},{value:"damper",label:"Damper"},{value:"smoke_chamber",label:"Smoke chamber"},
  {value:"flue",label:"Flue"},{value:"cap",label:"Cap / termination"},{value:"crown",label:"Crown"},{value:"chase_cover",label:"Chase cover"},
  {value:"flashing",label:"Flashing"},{value:"chimney_exterior",label:"Chimney exterior"},{value:"attic",label:"Attic"},{value:"connector",label:"Connector"},
  {value:"appliance",label:"Appliance"},{value:"data_plate",label:"Data plate / UL label"},{value:"clearance",label:"Clearance"},{value:"defect",label:"Potential condition"},
  {value:"repair",label:"Repair recommendation"},{value:"before",label:"Before"},{value:"after",label:"After"},{value:"other",label:"Other"}
];

function StoredPhotoPreview({photo}:{photo:InspectionPhoto}){
  const [url,setUrl]=useState<string|null>(null);
  useEffect(()=>{let active=true,objectUrl:string|null=null;(async()=>{try{const stored=await getStoredSourceFile(photo.source_sha256);if(stored&&active){objectUrl=URL.createObjectURL(stored.preview_blob||stored.blob);setUrl(objectUrl)}}catch{if(active)setUrl(null)}})();return()=>{active=false;if(objectUrl)URL.revokeObjectURL(objectUrl)}},[photo.source_sha256]);
  return url?<Image src={url} alt={photo.caption||"Inspection photo"} width={96} height={72} unoptimized/>:<div className="inspectionPhotoMissing">Preview unavailable</div>;
}

export default function InspectionPhotoCapture({inspection,finding,component,label,onChange}:{inspection:Inspection;finding:InspectionFinding|undefined;component:string;label:string;onChange:(inspection:Inspection)=>void}){
  const inputRef=useRef<HTMLInputElement>(null),system=inspection.systems[0];
  const [category,setCategory]=useState<PhotoCategory>(()=>defaultPhotoCategory(component)),[caption,setCaption]=useState(""),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
  const photos=finding?inspection.photos.filter(photo=>photo.system_id===system?.id&&photo.finding_ids.includes(finding.id)):[];
  useEffect(()=>{setCategory(defaultPhotoCategory(component));setCaption("");setMessage("")},[component]);

  function persistInspection(candidate:Inspection){saveInspections(upsertInspection(loadInspections(),candidate,inspection));onChange(candidate)}

  async function addPhoto(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];if(!file||!system||!finding)return;
    const error=validateInspectionPhoto(file);if(error){setMessage(error);event.target.value="";return}
    setBusy(true);setMessage("Optimizing photo…");
    try{
      const preview_blob=await preparePhoneImage(file);
      setMessage("Saving photo to this device…");
      const sha256=await sha256Blob(file),now=new Date().toISOString();
      await putStoredSourceFile({sha256,name:file.name,mime_type:file.type,byte_size:file.size,saved_at:now,blob:file,preview_blob});
      const prior=inspection.photos.find(photo=>photo.system_id===system.id&&photo.source_sha256===sha256);
      const photo:InspectionPhoto=prior?{...prior,category,caption:caption||prior.caption,finding_ids:[...new Set([...prior.finding_ids,finding.id])]}:{id:`photo-${crypto.randomUUID()}`,system_id:system.id,source_sha256:sha256,category,caption,finding_ids:[finding.id],ai_category_suggestion:null,ai_confidence:null,review_state:"not_requested",reviewed_by:null,reviewed_at:null};
      const nextFinding={...finding,photo_ids:[...new Set([...finding.photo_ids,photo.id])],source_sha256:[...new Set([...finding.source_sha256,sha256])],updated_at:now};
      const candidate=normalizeInspection({...inspection,status:inspection.status==="ready_for_review"?"in_progress":inspection.status,photos:[...inspection.photos.filter(item=>item.id!==photo.id),photo],findings:inspection.findings.map(item=>item.id===finding.id?nextFinding:item),updated_at:now});
      if(!candidate)throw new Error("The photo relationship could not be validated.");
      persistInspection(candidate);setCaption("");setMessage(prior?"Existing photo linked to this component.":"Photo saved to this component with SHA-256 provenance.");
    }catch(error){setMessage(error instanceof Error?error.message:"The inspection photo could not be saved.")}
    finally{setBusy(false);if(inputRef.current)inputRef.current.value=""}
  }

  function updatePhoto(photo:InspectionPhoto,nextCategory:PhotoCategory,nextCaption:string){
    const candidate=normalizeInspection({...inspection,status:inspection.status==="ready_for_review"?"in_progress":inspection.status,photos:inspection.photos.map(item=>item.id===photo.id?{...item,category:nextCategory,caption:nextCaption}:item),updated_at:new Date().toISOString()});
    if(!candidate){setMessage("Photo details could not be validated.");return}
    try{persistInspection(candidate);setMessage("Photo category and caption saved.")}catch(error){setMessage(error instanceof Error?error.message:"Photo details could not be saved.")}
  }

  if(!finding)return <div className="inspectionPhotoLocked"><b>Component photos</b><span>Save a technician status first, then attach photos directly to {label.toLowerCase()}.</span></div>;
  return <section className="inspectionPhotos" aria-labelledby={`photos-${component}`}><div className="inspectionPhotoHead"><div><b id={`photos-${component}`}>Component photos</b><span>{photos.length} attached · exact bytes stored in this browser</span></div><button type="button" disabled={busy} onClick={()=>inputRef.current?.click()}>{busy?"Saving…":"Take or add photo"}</button></div>
    <input ref={inputRef} className="visuallyHidden" type="file" disabled={busy} accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" onChange={addPhoto}/>
    <div className="inspectionPhotoFields"><label>Category<select value={category} onChange={event=>setCategory(event.target.value as PhotoCategory)}>{CATEGORY_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label>Caption for next photo<input value={caption} onChange={event=>setCaption(event.target.value)} placeholder={`What this ${label.toLowerCase()} photo documents`} /></label></div>
    {photos.length?<div className="inspectionPhotoList">{photos.map(photo=><PhotoEditor key={photo.id} photo={photo} onSave={updatePhoto}/>)}</div>:null}
    <span className="inspectionPhotoStatus" role="status" aria-live="polite">{message}</span>
    <p>Photos document visible conditions. ChimneyAI does not create a defect finding from an image automatically.</p>
  </section>;
}

function PhotoEditor({photo,onSave}:{photo:InspectionPhoto;onSave:(photo:InspectionPhoto,category:PhotoCategory,caption:string)=>void}){
  const [category,setCategory]=useState(photo.category),[caption,setCaption]=useState(photo.caption);
  return <div className="inspectionPhotoRow"><StoredPhotoPreview photo={photo}/><div><select aria-label="Photo category" value={category} onChange={event=>setCategory(event.target.value as PhotoCategory)}>{CATEGORY_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select><input aria-label="Photo caption" value={caption} onChange={event=>setCaption(event.target.value)} placeholder="Add a factual caption"/><code>SHA-256 {photo.source_sha256.slice(0,12)}…</code></div><button type="button" onClick={()=>onSave(photo,category,caption)}>Save details</button></div>;
}
