import type {ProSourceState} from "@/components/ProSourceDesk";
import type {ManualVerification} from "@/components/ManualVerificationCard";
import type {SourceProvenanceRecord} from "@/lib/source-provenance";

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

export function loadCases():ProCase[]{
  if(typeof window==="undefined")return [];
  try{
    const x=JSON.parse(localStorage.getItem(KEY)||"[]");
    if(!Array.isArray(x))return [];
    return x.map((c:any)=>({
      ...c,
      source_files:Array.isArray(c.source_files)?c.source_files:[],
      messages:Array.isArray(c.messages)?c.messages:[],
      cloud:c.cloud||{sync_state:"never"}
    }));
  }catch{return []}
}

export function saveCases(cases:ProCase[]){
  if(typeof window!=="undefined")localStorage.setItem(KEY,JSON.stringify(cases));
}

export function compareCaseVersions(localCase:ProCase,cloudUpdatedAt?:string|null){
  if(!cloudUpdatedAt)return "local_newer" as const;
  const localTs=Date.parse(localCase.updated_at||localCase.created_at||"");
  const cloudTs=Date.parse(cloudUpdatedAt);
  if(!Number.isFinite(localTs)||!Number.isFinite(cloudTs))return "conflict" as const;
  if(Math.abs(localTs-cloudTs)<1000)return "synced" as const;
  return localTs>cloudTs?"local_newer" as const:"cloud_newer" as const;
}

export function upsertLocalCase(cases:ProCase[],incoming:ProCase){
  const idx=cases.findIndex(c=>c.id===incoming.id);
  if(idx<0)return [incoming,...cases].slice(0,100);
  const next=[...cases];
  next[idx]=incoming;
  return next.sort((a,b)=>Date.parse(b.updated_at)-Date.parse(a.updated_at));
}
