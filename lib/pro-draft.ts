import {recordableHistory,type ChatHistoryMessage} from "./chat-history.ts";
import {MAX_CASE_MESSAGES} from "./case-limits.ts";
import {normalizeManual,normalizeProSource,normalizeSavedMessages,normalizeSourceFiles} from "./pro-cases.ts";
import type {ManualVerification} from "@/components/ManualVerificationCard";
import type {ProSourceState} from "@/components/ProSourceDesk";
import type {SourceProvenanceRecord} from "./source-provenance.ts";

const KEY="chimneyai_active_pro_draft_v1";

export type ActiveProDraft={
  version:1;
  saved_at:string;
  text:string;
  messages:ChatHistoryMessage[];
  source:ProSourceState;
  manual:ManualVerification;
  source_files:SourceProvenanceRecord[];
};

function record(value:unknown):Record<string,unknown>{
  return value!==null&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
}

export function parseProDraft(value:unknown):ActiveProDraft|null{
  const draft=record(value);
  if(draft.version!==1||typeof draft.saved_at!=="string")return null;
  const savedAt=Number.isFinite(Date.parse(draft.saved_at))?draft.saved_at:new Date(0).toISOString();
  return {
    version:1,
    saved_at:savedAt,
    text:typeof draft.text==="string"?draft.text.slice(0,20_000):"",
    messages:normalizeSavedMessages(draft.messages,savedAt).map(({role,content})=>({role,content})),
    source:normalizeProSource(draft.source),
    manual:normalizeManual(draft.manual),
    source_files:normalizeSourceFiles(draft.source_files,savedAt)
  };
}

export function isMeaningfulProDraft(draft:Pick<ActiveProDraft,"text"|"messages"|"source"|"manual"|"source_files">){
  return Boolean(
    draft.text.trim()||draft.messages.length||draft.source_files.length||
    Object.values(draft.source).some(value=>value!==""&&value!=="general"&&value!=="unknown"&&value!=="not_available")||
    Object.values(draft.manual).some(value=>value.trim())
  );
}

export function loadProDraft(){
  if(typeof window==="undefined")return null;
  try{return parseProDraft(JSON.parse(localStorage.getItem(KEY)||"null"))}
  catch{return null}
}

export function prepareProDraft(draft:Omit<ActiveProDraft,"version"|"saved_at">,savedAt=new Date().toISOString()):ActiveProDraft{
  return {
    ...draft,
    version:1,
    saved_at:savedAt,
    messages:recordableHistory(draft.messages).slice(-MAX_CASE_MESSAGES)
  };
}

export function saveProDraft(draft:Omit<ActiveProDraft,"version"|"saved_at">){
  if(typeof window==="undefined")return;
  const value=prepareProDraft(draft);
  localStorage.setItem(KEY,JSON.stringify(value));
  return value.saved_at;
}

export function clearProDraft(){
  if(typeof window!=="undefined")localStorage.removeItem(KEY);
}
