import type {ProSourceState} from "@/components/ProSourceDesk";
import type {ManualVerification} from "@/components/ManualVerificationCard";
import type {SourceProvenanceRecord} from "@/lib/source-provenance";
import {MAX_CASE_MESSAGES,MAX_CASE_SOURCES} from "./case-limits.ts";

export type SavedMessage={role:"user"|"assistant";content:string;created_at:string};
export type CloudCaseMeta={
  remote_case_id?:string;
  last_cloud_sync_at?:string;
  cloud_updated_at?:string;
  sync_state?:"never"|"synced"|"local_newer"|"cloud_newer"|"conflict";
};

export type ProCase={
  id:string;
  title:string;
  created_at:string;
  updated_at:string;
  manufacturer:string;
  model:string;
  serial:string;
  appliance_type:string;
  technical_question:string;
  notes:string;
  source:ProSourceState;
  manual:ManualVerification;
  manual_identity_hash?:string;
  messages:SavedMessage[];
  source_files:SourceProvenanceRecord[];
  cloud?:CloudCaseMeta;
};

const KEY="chimneyai_pro_cases_v4";

const SOURCE_DEFAULTS:ProSourceState={
  task:"general",manufacturer:"",model:"",serial:"",listing_mark:"",fuel_type:"",
  source_type:"unknown",source_title:"",source_status:"not_available",technician_question:""
};
const MANUAL_DEFAULTS:ManualVerification={
  manual_title:"",manual_part_number:"",manual_revision:"",effective_date:"",
  official_url:"",verified_model:"",relevant_pages:"",verification_note:""
};
const TASKS=new Set<ProSourceState["task"]>(["general","label_scan","manual_review","source_check","report_language"]);
const SOURCE_TYPES=new Set<ProSourceState["source_type"]>(["manufacturer_manual","listing_label","adopted_code","standard","field_measurement","unknown"]);
const SOURCE_STATUSES=new Set<ProSourceState["source_status"]>(["uploaded","verified_external","reference_only","not_available"]);
const SOURCE_ROLES=new Set<SourceProvenanceRecord["role"]>(["manual","listing_label","inspection_report","field_photo","other"]);

function record(value:unknown):Record<string,unknown>{return value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function text(value:unknown){return typeof value==="string"?value:"";}

export function normalizeProSource(value:unknown):ProSourceState{
  const x=record(value);
  return {
    ...SOURCE_DEFAULTS,
    task:TASKS.has(x.task as ProSourceState["task"])?x.task as ProSourceState["task"]:"general",
    manufacturer:text(x.manufacturer),model:text(x.model),serial:text(x.serial),listing_mark:text(x.listing_mark),fuel_type:text(x.fuel_type),
    source_type:SOURCE_TYPES.has(x.source_type as ProSourceState["source_type"])?x.source_type as ProSourceState["source_type"]:"unknown",
    source_title:text(x.source_title),
    source_status:SOURCE_STATUSES.has(x.source_status as ProSourceState["source_status"])?x.source_status as ProSourceState["source_status"]:"not_available",
    technician_question:text(x.technician_question)
  };
}

export function normalizeManual(value:unknown):ManualVerification{
  const x=record(value);
  return Object.fromEntries(Object.keys(MANUAL_DEFAULTS).map(key=>[key,text(x[key])])) as unknown as ManualVerification;
}

export function normalizeSavedMessages(value:unknown,fallbackCreatedAt:string):SavedMessage[]{
  return Array.isArray(value)?value.flatMap(item=>{
    const m=record(item),role=m.role;
    return (role==="user"||role==="assistant")&&text(m.content)?[{role,content:text(m.content).slice(0,20_000),created_at:text(m.created_at)||fallbackCreatedAt} satisfies SavedMessage]:[];
  }).slice(-MAX_CASE_MESSAGES):[];
}

export function normalizeSourceFiles(value:unknown,fallbackCreatedAt:string):SourceProvenanceRecord[]{
  if(!Array.isArray(value))return [];
  const seen=new Set<string>();
  const normalized:SourceProvenanceRecord[]=[];
  for(const item of value){
    if(normalized.length>=MAX_CASE_SOURCES)break;
    const s=record(item),sha256=text(s.sha256).toLowerCase();
    if(!/^[a-f0-9]{64}$/.test(sha256)||seen.has(sha256))continue;
    seen.add(sha256);
    const role=SOURCE_ROLES.has(s.role as SourceProvenanceRecord["role"])?s.role as SourceProvenanceRecord["role"]:"other";
    const byteSize=typeof s.byte_size==="number"&&Number.isSafeInteger(s.byte_size)&&s.byte_size>=0?s.byte_size:0;
    const pageCount=typeof s.page_count==="number"&&Number.isSafeInteger(s.page_count)&&s.page_count>0&&s.page_count<=100_000?s.page_count:undefined;
    normalized.push({
      attachment_id:text(s.attachment_id)||`legacy:${sha256}`,
      file_name:(text(s.file_name)||"Saved source file").slice(0,240),mime_type:(text(s.mime_type)||"application/octet-stream").slice(0,120),
      byte_size:byteSize,
      sha256,prepared_at:text(s.prepared_at)||fallbackCreatedAt,
      page_count:pageCount,
      text_truncated:Boolean(s.text_truncated),role,note:text(s.note).slice(0,2000),
      storage_status:s.storage_status==="session_only"||s.storage_status==="persisted_browser"||s.storage_status==="missing"?s.storage_status:"missing",
      persisted_at:text(s.persisted_at)||undefined,
      integrity_status:s.integrity_status==="unchecked"||s.integrity_status==="verified"||s.integrity_status==="mismatch"||s.integrity_status==="missing"?s.integrity_status:"unchecked"
    });
  }
  return normalized;
}

function normalizeCase(value:unknown):ProCase|null{
  const x=record(value),id=text(x.id);
  if(!id)return null;
  const source=normalizeProSource(x.source),manual=normalizeManual(x.manual);
  const created=text(x.created_at)||new Date().toISOString();
  const messages=normalizeSavedMessages(x.messages,created);
  const sourceFiles=normalizeSourceFiles(x.source_files,created);
  const cloudRecord=record(x.cloud);
  const syncState=cloudRecord.sync_state;
  const cloud:CloudCaseMeta={
    remote_case_id:text(cloudRecord.remote_case_id)||undefined,
    last_cloud_sync_at:text(cloudRecord.last_cloud_sync_at)||undefined,
    cloud_updated_at:text(cloudRecord.cloud_updated_at)||undefined,
    sync_state:syncState==="synced"||syncState==="local_newer"||syncState==="cloud_newer"||syncState==="conflict"||syncState==="never"?syncState:"never"
  };
  return {
    id,title:text(x.title)||"Untitled Pro case",created_at:created,updated_at:text(x.updated_at)||created,
    manufacturer:text(x.manufacturer)||source.manufacturer,model:text(x.model)||source.model,serial:text(x.serial)||source.serial,
    appliance_type:text(x.appliance_type)||source.fuel_type,technical_question:text(x.technical_question)||source.technician_question,
    notes:text(x.notes),source,manual,manual_identity_hash:text(x.manual_identity_hash)||undefined,messages,source_files:sourceFiles,cloud
  };
}

export function loadCases():ProCase[]{
  if(typeof window==="undefined")return [];
  try{
    const x=JSON.parse(localStorage.getItem(KEY)||"[]");
    if(!Array.isArray(x))return [];
    return x.map(normalizeCase).filter((c):c is ProCase=>c!==null);
  }catch{return []}
}

export function saveCases(cases:ProCase[]){
  if(typeof window==="undefined")return;
  try{localStorage.setItem(KEY,JSON.stringify(cases))}
  catch{throw new Error("Browser storage is full or unavailable. Export important cases, then remove unneeded local data.")}
}

export function compareCaseVersions(localCase:ProCase,cloudUpdatedAt?:string|null){
  if(!cloudUpdatedAt)return "local_newer" as const;
  const localTs=Date.parse(localCase.updated_at||localCase.created_at||"");
  const cloudTs=Date.parse(cloudUpdatedAt);
  if(!Number.isFinite(localTs)||!Number.isFinite(cloudTs))return "conflict" as const;
  if(Math.abs(localTs-cloudTs)<1000)return "synced" as const;
  return localTs>cloudTs?"local_newer" as const:"cloud_newer" as const;
}

export function cloudContentTimestamp(clientUpdatedAt?:string|null,serverUpdatedAt?:string|null){
  return clientUpdatedAt?.trim()||serverUpdatedAt?.trim()||"";
}

export function upsertLocalCase(cases:ProCase[],incoming:ProCase){
  const idx=cases.findIndex(c=>c.id===incoming.id);
  if(idx<0)return [incoming,...cases].slice(0,100);
  const next=[...cases];
  next[idx]=incoming;
  return next.sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at));
}
