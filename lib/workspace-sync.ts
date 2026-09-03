import {cloudContentTimestamp,normalizeManual,normalizeProSource,normalizeSavedMessages,normalizeSourceFiles,type ProCase} from "@/lib/pro-cases";
import type {SourceProvenanceRecord} from "@/lib/source-provenance";
import {getBrowserSupabase,hasSupabaseConfig} from "@/lib/supabase-client";
import {putStoredSourceFile,verifyStoredSourceFile} from "@/lib/source-file-store";

export type SyncMode="browser_only"|"cloud_ready"|"cloud_connected";
export type SyncResult={
  ok:boolean;
  mode:SyncMode;
  message:string;
  remote_case_id?:string;
  uploaded_sources?:number;
};

export type CloudCaseSummary={
  id:string;
  client_case_id:string;
  title:string;
  manufacturer:string|null;
  model:string|null;
  serial:string|null;
  updated_at:string;
  content_updated_at:string;
  created_at:string;
  source_count:number;
};
export type CloudCaseRevisionSummary={id:string;revision_reason:string|null;created_at:string};

function record(value:unknown):Record<string,unknown>{return value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function text(value:unknown){return typeof value==="string"?value:"";}

export function getSyncMode():SyncMode{
  if(!hasSupabaseConfig())return "browser_only";
  return getBrowserSupabase()?"cloud_ready":"browser_only";
}

export async function getCloudSessionState(){
  const supabase=getBrowserSupabase();
  if(!supabase)return {configured:false,signed_in:false,user_id:null as string|null,email:null as string|null};
  const {data,error}=await supabase.auth.getUser();
  if(error||!data.user)return {configured:true,signed_in:false,user_id:null,email:null};
  return {configured:true,signed_in:true,user_id:data.user.id,email:data.user.email||null};
}

export async function signInWithEmailOtp(email:string){
  const supabase=getBrowserSupabase();
  if(!supabase)throw new Error("Cloud sync is not configured.");
  const {error}=await supabase.auth.signInWithOtp({
    email,
    options:{emailRedirectTo:typeof window!=="undefined"?window.location.origin+"/pro":undefined}
  });
  if(error)throw error;
}

export async function signOutCloud(){
  const supabase=getBrowserSupabase();
  if(!supabase)return;
  const {error}=await supabase.auth.signOut();
  if(error)throw error;
}

function requireCloud(){
  const supabase=getBrowserSupabase();
  if(!supabase)throw new Error("Cloud sync is not configured.");
  return supabase;
}

async function requireUser(){
  const supabase=requireCloud();
  const {data,error}=await supabase.auth.getUser();
  if(error||!data.user)throw new Error("Sign in before using cloud cases.");
  return {supabase,user:data.user};
}

async function uploadCaseSource(caseId:string,src:SourceProvenanceRecord){
  const supabase=requireCloud();
  const verification=await verifyStoredSourceFile(src.sha256);
  if(!verification.exists)return {uploaded:false,reason:"local_bytes_missing",path:null as string|null};
  if(!verification.match||!verification.stored){
    throw new Error(`Source file ${src.file_name} failed SHA-256 verification and was not uploaded.`);
  }
  const stored=verification.stored;
  if(stored.blob.size!==src.byte_size){
    throw new Error(`Source file ${src.file_name} failed byte-size verification and was not uploaded.`);
  }
  const safeName=src.file_name.replace(/[^\w.\-() ]+/g,"_")||"source-file";
  const path=`cases/${caseId}/${src.sha256}/${safeName}`;
  const {error}=await supabase.storage.from("pro-case-sources").upload(path,stored.blob,{
    upsert:false,
    contentType:src.mime_type,
    cacheControl:"3600"
  });
  if(error && !String(error.message).toLowerCase().includes("already exists"))throw error;
  return {uploaded:true,path};
}

export async function syncCaseToCloud(c:ProCase):Promise<SyncResult>{
  const supabase=getBrowserSupabase();
  if(!supabase)return {ok:false,mode:"browser_only",message:"Cloud sync is not configured. Browser case remains unchanged."};

  const {data:userData,error:userError}=await supabase.auth.getUser();
  if(userError||!userData.user)return {ok:false,mode:"cloud_ready",message:"Sign in before syncing this case."};

  const now=new Date().toISOString();
  const payload={
    client_case_id:c.id,
    title:c.title,
    manufacturer:c.manufacturer||null,
    model:c.model||null,
    serial:c.serial||null,
    appliance_type:c.appliance_type||null,
    technical_question:c.technical_question||null,
    notes:c.notes||null,
    source_json:c.source,
    manual_json:c.manual,
    manual_identity_hash:c.manual_identity_hash||null,
    conversation_json:c.messages,
    client_updated_at:c.updated_at,
    updated_at:now
  };

  const {data:caseRow,error:caseError}=await supabase
    .from("pro_cases")
    .upsert(payload,{onConflict:"owner_id,client_case_id"})
    .select("id,updated_at")
    .single();

  if(caseError)throw caseError;
  const remoteCaseId=caseRow.id as string;

  let uploaded=0;
  for(const src of c.source_files){
    const upload=await uploadCaseSource(remoteCaseId,src);
    if(upload.uploaded)uploaded++;
    const {error:srcError}=await supabase.from("pro_case_sources").upsert({
      case_id:remoteCaseId,
      sha256:src.sha256,
      file_name:src.file_name,
      mime_type:src.mime_type,
      byte_size:src.byte_size,
      page_count:src.page_count||null,
      text_truncated:Boolean(src.text_truncated),
      source_role:src.role,
      technician_note:src.note||null,
      storage_path:upload.path,
      integrity_status:src.integrity_status||"unchecked"
    },{onConflict:"case_id,sha256"});
    if(srcError)throw srcError;
  }

  const {error:revisionError}=await supabase.from("pro_case_revisions").insert({
    case_id:remoteCaseId,
    snapshot_json:c,
    revision_reason:"client_sync"
  });
  if(revisionError)throw revisionError;

  return {
    ok:true,
    mode:"cloud_connected",
    message:`Case synced. ${uploaded} source file${uploaded===1?"":"s"} uploaded from this browser vault.`,
    remote_case_id:remoteCaseId,
    uploaded_sources:uploaded
  };
}

export async function listCloudCases():Promise<CloudCaseSummary[]>{
  const {supabase}=await requireUser();
  const {data,error}=await supabase
    .from("pro_cases")
    .select("id,client_case_id,title,manufacturer,model,serial,client_updated_at,updated_at,created_at,pro_case_sources(count)")
    .order("updated_at",{ascending:false})
    .limit(100);
  if(error)throw error;
  return ((data||[]) as unknown[]).map(row=>{
    const r=record(row),sourceRows=Array.isArray(r.pro_case_sources)?r.pro_case_sources:[];
    const countRecord=record(sourceRows[0]);
    return {
      id:text(r.id),client_case_id:text(r.client_case_id),title:text(r.title)||"Untitled cloud case",
      manufacturer:text(r.manufacturer)||null,model:text(r.model)||null,serial:text(r.serial)||null,
      updated_at:text(r.updated_at),content_updated_at:cloudContentTimestamp(text(r.client_updated_at),text(r.updated_at)),
      created_at:text(r.created_at),source_count:Number(countRecord.count||0)
    };
  });
}

export async function fetchCloudCase(remoteCaseId:string):Promise<ProCase>{
  const {supabase}=await requireUser();
  const {data:c,error}=await supabase.from("pro_cases").select("*").eq("id",remoteCaseId).single();
  if(error)throw error;
  const {data:sources,error:sourceError}=await supabase
    .from("pro_case_sources")
    .select("*")
    .eq("case_id",remoteCaseId)
    .order("created_at",{ascending:true});
  if(sourceError)throw sourceError;

  const caseRecord=record(c);
  const fallbackNow=new Date().toISOString();
  const contentUpdatedAt=cloudContentTimestamp(text(caseRecord.client_updated_at),text(caseRecord.updated_at))||fallbackNow;
  const sourceFiles=normalizeSourceFiles(((sources||[]) as unknown[]).map(row=>{
    const s=record(row);
    return {
      attachment_id:`cloud:${text(s.id)}`,file_name:text(s.file_name)||"Cloud source",mime_type:text(s.mime_type)||"application/octet-stream",
      byte_size:Number(s.byte_size||0),sha256:text(s.sha256),prepared_at:text(s.created_at),
      page_count:typeof s.page_count==="number"?s.page_count:undefined,text_truncated:Boolean(s.text_truncated),
      role:s.source_role,note:text(s.technician_note),
      storage_status:"missing",integrity_status:"unchecked",persisted_at:undefined
    };
  }),text(caseRecord.created_at)||fallbackNow);

  return {
    id:text(caseRecord.client_case_id),
    title:text(caseRecord.title)||"Untitled cloud case",
    created_at:text(caseRecord.created_at)||fallbackNow,
    updated_at:contentUpdatedAt,
    manufacturer:text(caseRecord.manufacturer),
    model:text(caseRecord.model),
    serial:text(caseRecord.serial),
    appliance_type:text(caseRecord.appliance_type),
    technical_question:text(caseRecord.technical_question),
    notes:text(caseRecord.notes),
    source:normalizeProSource(caseRecord.source_json),
    manual:normalizeManual(caseRecord.manual_json),
    manual_identity_hash:text(caseRecord.manual_identity_hash)||undefined,
    messages:normalizeSavedMessages(caseRecord.conversation_json,text(caseRecord.created_at)||fallbackNow),
    source_files:sourceFiles,
    cloud:{
      remote_case_id:text(caseRecord.id),
      last_cloud_sync_at:new Date().toISOString(),
      cloud_updated_at:contentUpdatedAt,
      sync_state:"synced"
    }
  };
}

export async function restoreCloudSourceToVault(remoteCaseId:string,sha256:string){
  const {supabase}=await requireUser();
  const {data:row,error}=await supabase
    .from("pro_case_sources")
    .select("file_name,mime_type,byte_size,storage_path,sha256")
    .eq("case_id",remoteCaseId)
    .eq("sha256",sha256)
    .single();
  if(error)throw error;
  if(!row.storage_path)throw new Error("This cloud source record has no stored object.");

  const {data:blob,error:downloadError}=await supabase.storage.from("pro-case-sources").download(row.storage_path);
  if(downloadError)throw downloadError;

  const bytes=await blob.arrayBuffer();
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  const computed=Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");
  if(computed!==row.sha256){
    throw new Error("Downloaded cloud bytes FAILED SHA-256 verification. File was not written to the local vault.");
  }
  if(blob.size!==Number(row.byte_size)){
    throw new Error("Downloaded cloud file size does not match its stored source record.");
  }

  await putStoredSourceFile({
    sha256:row.sha256,
    name:row.file_name,
    mime_type:row.mime_type,
    byte_size:Number(row.byte_size),
    saved_at:new Date().toISOString(),
    blob
  });

  return {ok:true,name:row.file_name,sha256:row.sha256,byte_size:Number(row.byte_size)};
}

export async function getCloudCaseRevisions(remoteCaseId:string){
  const {supabase}=await requireUser();
  const {data,error}=await supabase
    .from("pro_case_revisions")
    .select("id,revision_reason,created_at")
    .eq("case_id",remoteCaseId)
    .order("created_at",{ascending:false})
    .limit(25);
  if(error)throw error;
  return ((data||[]) as unknown[]).map(row=>{
    const r=record(row);
    return {id:text(r.id),revision_reason:text(r.revision_reason)||null,created_at:text(r.created_at)};
  });
}
