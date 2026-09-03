export const INSPECTION_SCHEMA_VERSION=1 as const;
export const MAX_LOCAL_INSPECTIONS=50;
export const MAX_INSPECTION_SYSTEMS=12;
export const MAX_INSPECTION_FINDINGS=500;
export const MAX_INSPECTION_MEASUREMENTS=500;
export const MAX_INSPECTION_PHOTOS=500;
export const MAX_INSPECTION_EVIDENCE=1000;

const STORAGE_KEY="chimneyai_inspections_v1";
const INSPECTION_TYPES=["level_1","level_2","limited_scope","service_documentation","other"] as const;
const INSPECTION_STATUSES=["draft","in_progress","ready_for_review","completed","delivered","archived"] as const;
const REPORT_STATUSES=["not_started","draft","ready_for_review","completed","delivered"] as const;
const SIGNATURE_STATUSES=["not_requested","pending","signed"] as const;
const SYSTEM_TYPES=["masonry_fireplace","factory_built_fireplace","wood_stove","wood_insert","pellet_appliance","gas_fireplace","gas_insert","gas_log_set","freestanding_gas_appliance","masonry_heater","other"] as const;
const FINDING_STATUSES=["satisfactory","observation_noted","maintenance_recommended","repair_recommended","further_evaluation_recommended","unable_to_inspect","not_applicable"] as const;
const REVIEW_STATES=["not_requested","ai_suggested","technician_confirmed","technician_rejected"] as const;
const AI_CONFIDENCE_LEVELS=["low","moderate","high"] as const;
const MEASUREMENT_METHODS=["manual","tape","laser","camera_assisted","calculated"] as const;
const MEASUREMENT_CONFIDENCE=["technician_entered","ai_estimated","verified"] as const;
const PHOTO_CATEGORIES=["firebox","hearth","damper","smoke_chamber","flue","cap","crown","chase_cover","flashing","chimney_exterior","attic","firestop","insulation_shield","connector","appliance","data_plate","clearance","defect","repair","before","after","other"] as const;
const EVIDENCE_ROLES=["inspection_photo","manual","data_plate","field_document","other"] as const;

export type InspectionType=typeof INSPECTION_TYPES[number];
export type InspectionStatus=typeof INSPECTION_STATUSES[number];
export type ReportStatus=typeof REPORT_STATUSES[number];
export type SignatureStatus=typeof SIGNATURE_STATUSES[number];
export type SystemType=typeof SYSTEM_TYPES[number];
export type FindingStatus=typeof FINDING_STATUSES[number];
export type ReviewState=typeof REVIEW_STATES[number];
export type AiConfidence=typeof AI_CONFIDENCE_LEVELS[number];
export type MeasurementMethod=typeof MEASUREMENT_METHODS[number];
export type MeasurementConfidence=typeof MEASUREMENT_CONFIDENCE[number];
export type PhotoCategory=typeof PHOTO_CATEGORIES[number];
export type EvidenceRole=typeof EVIDENCE_ROLES[number];

export type InspectionCustomer={id:string;first_name:string;last_name:string;email:string;phone:string;notes:string};
export type InspectionProperty={id:string;customer_id:string;street_address:string;city:string;state:string;postal_code:string;notes:string};
export type InspectionTechnician={id:string;name:string;credentials:string[]};
export type InspectionSystem={
  id:string;property_id:string;display_name:string;system_type:SystemType;appliance_type:string;fuel_type:string;
  manufacturer:string;model:string;serial_number:string;listing_information:string;installation_date:string;
  chimney_type:string;flue_type:string;notes:string;
};
export type InspectionFinding={
  id:string;system_id:string;component:string;raw_note:string;technician_observation:string;ai_suggestion:string;
  ai_confidence:AiConfidence|null;review_state:ReviewState;reviewed_by:string|null;reviewed_at:string|null;status:FindingStatus;recommendation:string;source_sha256:string[];photo_ids:string[];
  measurement_ids:string[];created_at:string;updated_at:string;
};
export type InspectionMeasurement={
  id:string;system_id:string;component:string;measurement_type:string;value:number|null;unit:string;
  method:MeasurementMethod;confidence:MeasurementConfidence;photo_id:string|null;recorded_by:string|null;recorded_at:string|null;
  technician_verified:boolean;verified_by:string|null;verified_at:string|null;
};
export type InspectionPhoto={
  id:string;system_id:string;source_sha256:string;category:PhotoCategory;caption:string;finding_ids:string[];
  ai_category_suggestion:PhotoCategory|null;ai_confidence:AiConfidence|null;review_state:ReviewState;reviewed_by:string|null;reviewed_at:string|null;
};
export type InspectionEvidence={sha256:string;system_id:string|null;role:EvidenceRole;name:string;page_number:number|null};
export type InspectionReportLifecycle={status:ReportStatus;signature_status:SignatureStatus;revision:number;signed_at:string|null;delivered_at:string|null};
export type Inspection={
  version:typeof INSPECTION_SCHEMA_VERSION;id:string;company_id:string|null;technician:InspectionTechnician;
  customer:InspectionCustomer;property:InspectionProperty;systems:InspectionSystem[];inspection_type:InspectionType;
  inspection_date:string;status:InspectionStatus;started_at:string|null;completed_at:string|null;
  pro_case_id:string|null;evidence:InspectionEvidence[];findings:InspectionFinding[];measurements:InspectionMeasurement[];photos:InspectionPhoto[];
  report:InspectionReportLifecycle;created_at:string;updated_at:string;
};

function record(value:unknown):Record<string,unknown>{return value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function text(value:unknown,max=2000){return typeof value==="string"?value.slice(0,max):"";}
function nullableText(value:unknown,max=2000){const output=text(value,max).trim();return output||null;}
function enumValue<T extends readonly string[]>(value:unknown,values:T,fallback:T[number]):T[number]{return values.includes(value as T[number])?value as T[number]:fallback;}
function timestamp(value:unknown,fallback:string){const candidate=text(value,100);return Number.isFinite(Date.parse(candidate))?candidate:fallback;}
function nullableTimestamp(value:unknown){const candidate=text(value,100);return Number.isFinite(Date.parse(candidate))?candidate:null;}
function id(value:unknown){return text(value,100).trim();}
function stringList(value:unknown,max=100,itemMax=2000){return Array.isArray(value)?[...new Set(value.map(item=>text(item,itemMax).trim()).filter(Boolean))].slice(0,max):[];}
function hashList(value:unknown){return stringList(value,100,64).map(value=>value.toLowerCase()).filter(value=>/^[a-f0-9]{64}$/.test(value));}
function inspectionType(value:unknown):InspectionType{
  const candidate=text(value,100).trim().toLowerCase().replace(/[\s-]+/g,"_");
  if(candidate==="level1")return "level_1";
  if(candidate==="level2")return "level_2";
  return enumValue(candidate,INSPECTION_TYPES,"other");
}

export function normalizeInspection(value:unknown):Inspection|null{
  const root=record(value),inspectionId=id(root.id);
  if(root.version!==INSPECTION_SCHEMA_VERSION||!inspectionId)return null;
  const now=new Date().toISOString(),createdAt=timestamp(root.created_at,now);
  const customerRecord=record(root.customer),customerId=id(customerRecord.id);
  const propertyRecord=record(root.property),propertyId=id(propertyRecord.id);
  if(!customerId||!propertyId||id(propertyRecord.customer_id)!==customerId)return null;
  const technicianRecord=record(root.technician),assignedTechnicianId=id(technicianRecord.id);

  const systems=(Array.isArray(root.systems)?root.systems:[]).flatMap(item=>{
    const system=record(item),systemId=id(system.id);
    if(!systemId||id(system.property_id)!==propertyId)return [];
    return [{
      id:systemId,property_id:propertyId,display_name:text(system.display_name,200),
      system_type:enumValue(system.system_type,SYSTEM_TYPES,"other"),appliance_type:text(system.appliance_type,200),
      fuel_type:text(system.fuel_type,100),manufacturer:text(system.manufacturer,200),model:text(system.model,200),
      serial_number:text(system.serial_number,200),listing_information:text(system.listing_information,500),
      installation_date:text(system.installation_date,100),chimney_type:text(system.chimney_type,200),
      flue_type:text(system.flue_type,200),notes:text(system.notes,3000)
    } satisfies InspectionSystem];
  }).filter((system,index,all)=>all.findIndex(candidate=>candidate.id===system.id)===index).slice(0,MAX_INSPECTION_SYSTEMS);
  const systemIds=new Set(systems.map(system=>system.id));

  const explicitEvidence=(Array.isArray(root.evidence)?root.evidence:[]).flatMap(item=>{
    const evidence=record(item),sha256=text(evidence.sha256,64).toLowerCase(),systemId=nullableText(evidence.system_id,100);
    if(!/^[a-f0-9]{64}$/.test(sha256)||(systemId&&!systemIds.has(systemId)))return [];
    const rawPage=evidence.page_number;
    return [{sha256,system_id:systemId,role:enumValue(evidence.role,EVIDENCE_ROLES,"other"),name:text(evidence.name,500),
      page_number:typeof rawPage==="number"&&Number.isSafeInteger(rawPage)&&rawPage>0?rawPage:null} satisfies InspectionEvidence];
  }).filter((evidence,index,all)=>all.findIndex(candidate=>candidate.sha256===evidence.sha256&&candidate.system_id===evidence.system_id&&candidate.role===evidence.role)===index)
    .slice(0,MAX_INSPECTION_EVIDENCE);

  const measurements=(Array.isArray(root.measurements)?root.measurements:[]).flatMap(item=>{
    const measurement=record(item),measurementId=id(measurement.id),systemId=id(measurement.system_id);
    if(!measurementId||!systemIds.has(systemId))return [];
    const rawValue=measurement.value;
    const value=typeof rawValue==="number"&&Number.isFinite(rawValue)?rawValue:null;
    const measurementType=text(measurement.measurement_type,200),unit=text(measurement.unit,50);
    const method=enumValue(measurement.method,MEASUREMENT_METHODS,"manual");
    const verifiedBy=nullableText(measurement.verified_by,100),verifiedAt=nullableTimestamp(measurement.verified_at);
    const technicianVerified=measurement.technician_verified===true&&value!==null&&Boolean(measurementType.trim()&&unit.trim()&&verifiedAt)&&verifiedBy===assignedTechnicianId&&Boolean(assignedTechnicianId);
    let confidence=enumValue(measurement.confidence,MEASUREMENT_CONFIDENCE,"technician_entered");
    if(technicianVerified)confidence="verified";
    else if(confidence==="verified")confidence=method==="camera_assisted"?"ai_estimated":"technician_entered";
    return [{id:measurementId,system_id:systemId,component:text(measurement.component,200),measurement_type:measurementType,
      value,unit,method,confidence,photo_id:nullableText(measurement.photo_id,100),
      recorded_by:nullableText(measurement.recorded_by,100),recorded_at:nullableTimestamp(measurement.recorded_at),
      technician_verified:technicianVerified,verified_by:technicianVerified?verifiedBy:null,verified_at:technicianVerified?verifiedAt:null} satisfies InspectionMeasurement];
  }).filter((measurement,index,all)=>all.findIndex(candidate=>candidate.id===measurement.id)===index).slice(0,MAX_INSPECTION_MEASUREMENTS);
  const measurementIds=new Set(measurements.map(measurement=>measurement.id));

  const preliminaryFindings=(Array.isArray(root.findings)?root.findings:[]).flatMap(item=>{
    const finding=record(item),findingId=id(finding.id),systemId=id(finding.system_id);
    if(!findingId||!systemIds.has(systemId))return [];
    const technicianObservation=text(finding.technician_observation,5000),aiSuggestion=text(finding.ai_suggestion,5000);
    const reviewedBy=nullableText(finding.reviewed_by,100),reviewedAt=nullableTimestamp(finding.reviewed_at);
    let reviewState=enumValue(finding.review_state,REVIEW_STATES,"not_requested");
    if(!aiSuggestion)reviewState="not_requested";
    else if(reviewState==="not_requested")reviewState="ai_suggested";
    else if((reviewState==="technician_confirmed"||reviewState==="technician_rejected")&&(!reviewedAt||reviewedBy!==assignedTechnicianId||!assignedTechnicianId))reviewState="ai_suggested";
    if(reviewState==="technician_confirmed"&&!technicianObservation)reviewState="ai_suggested";
    return [{id:findingId,system_id:systemId,component:text(finding.component,200),raw_note:text(finding.raw_note,5000),
      technician_observation:technicianObservation,ai_suggestion:aiSuggestion,
      ai_confidence:aiSuggestion&&AI_CONFIDENCE_LEVELS.includes(finding.ai_confidence as AiConfidence)?finding.ai_confidence as AiConfidence:null,
      review_state:reviewState,reviewed_by:reviewState.startsWith("technician_")?reviewedBy:null,reviewed_at:reviewState.startsWith("technician_")?reviewedAt:null,
      status:enumValue(finding.status,FINDING_STATUSES,"observation_noted"),
      recommendation:text(finding.recommendation,5000),source_sha256:hashList(finding.source_sha256),
      photo_ids:stringList(finding.photo_ids,100,100),measurement_ids:stringList(finding.measurement_ids,100,100).filter(value=>measurementIds.has(value)),
      created_at:timestamp(finding.created_at,createdAt),updated_at:timestamp(finding.updated_at,createdAt)} satisfies InspectionFinding];
  }).filter((finding,index,all)=>all.findIndex(candidate=>candidate.id===finding.id)===index).slice(0,MAX_INSPECTION_FINDINGS);
  const findingIds=new Set(preliminaryFindings.map(finding=>finding.id));

  const photos=(Array.isArray(root.photos)?root.photos:[]).flatMap(item=>{
    const photo=record(item),photoId=id(photo.id),systemId=id(photo.system_id),sourceSha=text(photo.source_sha256,64).toLowerCase();
    if(!photoId||!systemIds.has(systemId)||!/^[a-f0-9]{64}$/.test(sourceSha))return [];
    const suggested=PHOTO_CATEGORIES.includes(photo.ai_category_suggestion as PhotoCategory)?photo.ai_category_suggestion as PhotoCategory:null;
    const reviewedBy=nullableText(photo.reviewed_by,100),reviewedAt=nullableTimestamp(photo.reviewed_at);
    let reviewState=enumValue(photo.review_state,REVIEW_STATES,"not_requested");
    if(!suggested)reviewState="not_requested";
    else if(reviewState==="not_requested")reviewState="ai_suggested";
    else if((reviewState==="technician_confirmed"||reviewState==="technician_rejected")&&(!reviewedAt||reviewedBy!==assignedTechnicianId||!assignedTechnicianId))reviewState="ai_suggested";
    return [{id:photoId,system_id:systemId,source_sha256:sourceSha,category:enumValue(photo.category,PHOTO_CATEGORIES,"other"),
      caption:text(photo.caption,2000),finding_ids:stringList(photo.finding_ids,100,100).filter(value=>findingIds.has(value)),
      ai_category_suggestion:suggested,ai_confidence:suggested&&AI_CONFIDENCE_LEVELS.includes(photo.ai_confidence as AiConfidence)?photo.ai_confidence as AiConfidence:null,
      review_state:reviewState,reviewed_by:reviewState.startsWith("technician_")?reviewedBy:null,
      reviewed_at:reviewState.startsWith("technician_")?reviewedAt:null} satisfies InspectionPhoto];
  }).filter((photo,index,all)=>all.findIndex(candidate=>candidate.id===photo.id)===index).slice(0,MAX_INSPECTION_PHOTOS);
  const photoSystemById=new Map(photos.map(photo=>[photo.id,photo.system_id]));
  const findingSystemById=new Map(preliminaryFindings.map(finding=>[finding.id,finding.system_id]));
  const measurementSystemById=new Map(measurements.map(measurement=>[measurement.id,measurement.system_id]));
  const safePhotos=photos.map(photo=>({...photo,finding_ids:photo.finding_ids.filter(value=>findingSystemById.get(value)===photo.system_id)}));
  const photoEvidence=photos.map(photo=>({sha256:photo.source_sha256,system_id:photo.system_id,
    role:photo.category==="data_plate"?"data_plate":"inspection_photo",name:"",page_number:null} satisfies InspectionEvidence));
  const evidence=[...photoEvidence,...explicitEvidence]
    .filter((item,index,all)=>all.findIndex(candidate=>candidate.sha256===item.sha256&&candidate.system_id===item.system_id&&candidate.role===item.role)===index)
    .slice(0,MAX_INSPECTION_EVIDENCE);
  const evidenceSupportsFinding=(sha256:string,systemId:string)=>evidence.some(item=>item.sha256===sha256&&(item.system_id===null||item.system_id===systemId));
  const findings=preliminaryFindings.map(finding=>({...finding,
    source_sha256:finding.source_sha256.filter(sha256=>evidenceSupportsFinding(sha256,finding.system_id)),
    photo_ids:finding.photo_ids.filter(value=>photoSystemById.get(value)===finding.system_id),
    measurement_ids:finding.measurement_ids.filter(value=>measurementSystemById.get(value)===finding.system_id)
  }));
  const safeMeasurements=measurements.map(measurement=>({...measurement,
    photo_id:measurement.photo_id&&photoSystemById.get(measurement.photo_id)===measurement.system_id?measurement.photo_id:null
  }));

  const reportRecord=record(root.report);
  const startedAt=nullableTimestamp(root.started_at);
  const candidateCompletedAt=nullableTimestamp(root.completed_at);
  const completedAt=candidateCompletedAt&&(!startedAt||Date.parse(candidateCompletedAt)>=Date.parse(startedAt))?candidateCompletedAt:null;
  let signedAt=nullableTimestamp(reportRecord.signed_at),deliveredAt=nullableTimestamp(reportRecord.delivered_at);
  let signatureStatus=enumValue(reportRecord.signature_status,SIGNATURE_STATUSES,"not_requested");
  if(signatureStatus==="signed"&&!signedAt)signatureStatus="pending";
  if(signatureStatus!=="signed")signedAt=null;
  let reportStatus=enumValue(reportRecord.status,REPORT_STATUSES,"not_started");
  if(reportStatus==="delivered"&&(!deliveredAt||!completedAt||Date.parse(deliveredAt)<Date.parse(completedAt))){reportStatus="completed";deliveredAt=null}
  if(reportStatus!=="delivered")deliveredAt=null;
  let inspectionStatus=enumValue(root.status,INSPECTION_STATUSES,"draft");
  if((inspectionStatus==="completed"||inspectionStatus==="delivered")&&!completedAt)inspectionStatus="ready_for_review";
  if(inspectionStatus==="delivered"&&reportStatus!=="delivered")inspectionStatus="completed";
  if(reportStatus==="delivered"&&inspectionStatus!=="delivered"){reportStatus="completed";deliveredAt=null}
  return {
    version:INSPECTION_SCHEMA_VERSION,id:inspectionId,company_id:nullableText(root.company_id,100),
    technician:{id:id(technicianRecord.id),name:text(technicianRecord.name,200),credentials:stringList(technicianRecord.credentials,30,200)},
    customer:{id:customerId,first_name:text(customerRecord.first_name,200),last_name:text(customerRecord.last_name,200),
      email:text(customerRecord.email,320),phone:text(customerRecord.phone,100),notes:text(customerRecord.notes,3000)},
    property:{id:propertyId,customer_id:customerId,street_address:text(propertyRecord.street_address,300),city:text(propertyRecord.city,200),
      state:text(propertyRecord.state,100),postal_code:text(propertyRecord.postal_code,40),notes:text(propertyRecord.notes,3000)},
    systems,inspection_type:inspectionType(root.inspection_type),inspection_date:text(root.inspection_date,100),
    status:inspectionStatus,started_at:startedAt,completed_at:completedAt,
    pro_case_id:nullableText(root.pro_case_id,100),evidence,findings,measurements:safeMeasurements,photos:safePhotos,
    report:{status:reportStatus,signature_status:signatureStatus,
      revision:typeof reportRecord.revision==="number"&&Number.isSafeInteger(reportRecord.revision)&&reportRecord.revision>=0?reportRecord.revision:0,
      signed_at:signedAt,delivered_at:deliveredAt},
    created_at:createdAt,updated_at:timestamp(root.updated_at,createdAt)
  };
}

export function parseInspections(serialized:string):Inspection[]{
  try{
    const parsed=JSON.parse(serialized);
    return Array.isArray(parsed)?parsed.map(normalizeInspection).filter((item):item is Inspection=>item!==null)
      .sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at)).slice(0,MAX_LOCAL_INSPECTIONS):[];
  }catch{return []}
}

export function serializeInspections(inspections:Inspection[]):string{
  const safe=inspections.map(normalizeInspection).filter((item):item is Inspection=>item!==null)
    .sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at)).slice(0,MAX_LOCAL_INSPECTIONS);
  return JSON.stringify(safe);
}

export function loadInspections():Inspection[]{
  if(typeof window==="undefined")return [];
  try{return parseInspections(localStorage.getItem(STORAGE_KEY)||"[]")}
  catch{return []}
}

export function saveInspections(inspections:Inspection[]){
  if(typeof window==="undefined")return;
  const serialized=serializeInspections(inspections),safe=parseInspections(serialized);
  validateInspectionCollectionUpdate(loadInspections(),safe);
  try{localStorage.setItem(STORAGE_KEY,serialized)}
  catch{throw new Error("Browser storage is full or unavailable. Inspection data was not removed; keep this page open and export important work.")}
}

export function upsertInspection(inspections:Inspection[],incoming:Inspection){
  const normalized=normalizeInspection(incoming);
  if(!normalized)throw new Error("Inspection record is invalid and was not saved.");
  const next=[normalized,...inspections.filter(item=>item.id!==normalized.id)]
    .sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at)).slice(0,MAX_LOCAL_INSPECTIONS);
  validateInspectionCollectionUpdate(inspections,next);
  return next;
}

const STATUS_TRANSITIONS:Record<InspectionStatus,readonly InspectionStatus[]>={
  draft:["in_progress","archived"],
  in_progress:["ready_for_review","archived"],
  ready_for_review:["in_progress","completed","archived"],
  completed:["in_progress","delivered","archived"],
  delivered:["archived"],
  archived:[]
};

export function canTransitionInspectionStatus(from:InspectionStatus,to:InspectionStatus){
  return from===to||STATUS_TRANSITIONS[from].includes(to);
}

function isProtectedInspection(inspection:Inspection){
  return inspection.report.signature_status==="signed"||inspection.report.status==="delivered";
}

export function validateInspectionCollectionUpdate(existing:Inspection[],next:Inspection[]){
  const nextById=new Map(next.map(inspection=>[inspection.id,inspection]));
  for(const current of existing){
    const replacement=nextById.get(current.id);
    if(!replacement){
      if(isProtectedInspection(current))throw new Error("Signed or delivered inspections cannot be removed from browser history.");
      continue;
    }
    if(JSON.stringify(current)===JSON.stringify(replacement))continue;
    if(!canTransitionInspectionStatus(current.status,replacement.status)){
      throw new Error(`Inspection status cannot move from ${current.status} to ${replacement.status}.`);
    }
    if(isProtectedInspection(current)&&replacement.report.revision<=current.report.revision){
      throw new Error("Signed or delivered inspection changes require a new report revision.");
    }
  }
}
