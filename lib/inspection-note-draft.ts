import {FINDING_STATUSES,type FindingStatus} from "./inspections.ts";
type DraftFields={inspectionId:string;systemId:string;component:string;base:string;note:string};
export type InspectionNoteDraft=DraftFields&({version:1}|{version:2;status:FindingStatus|""});
export const MAX_DRAFT_NOTE_LENGTH=5000;

export function inspectionNoteDraftKey(inspectionId:string,systemId:string):string{
  return `chimneyai:inspection-note:${JSON.stringify([inspectionId,systemId])}`;
}

export function parseInspectionNoteDraft(raw:string|null,inspectionId:string,systemId:string):InspectionNoteDraft|null{
  if(!raw||raw.length>40000)return null;
  try{
    const value:unknown=JSON.parse(raw);
    if(!value||typeof value!=="object"||Array.isArray(value))return null;
    const draft=value as Record<string,unknown>;
    if((draft.version!==1&&draft.version!==2)||draft.inspectionId!==inspectionId||draft.systemId!==systemId||typeof draft.component!=="string"||!draft.component||draft.component.length>200||typeof draft.base!=="string"||draft.base.length>15000||typeof draft.note!=="string"||draft.note.length>MAX_DRAFT_NOTE_LENGTH)return null;
    const fields={inspectionId,systemId,component:draft.component,base:draft.base,note:draft.note};
    if(draft.version===1)return {version:1,...fields};
    const status=FINDING_STATUSES.find(value=>value===draft.status);
    if(draft.status!==""&&!status)return null;
    return {version:2,...fields,status:status||""};
  }catch{return null}
}

// Draft persistence never writes an Inspection or marks a component documented.
export function saveInspectionComponentDraft(storage:Pick<Storage,"setItem"|"removeItem">,draft:Extract<InspectionNoteDraft,{version:2}>,saved:{note:string;status:FindingStatus|""}){
  const key=inspectionNoteDraftKey(draft.inspectionId,draft.systemId);
  if(draft.note===saved.note&&draft.status===saved.status)storage.removeItem(key);
  else storage.setItem(key,JSON.stringify(draft));
}

export function loadInspectionNoteDraft(inspectionId:string,systemId:string):InspectionNoteDraft|null{
  if(typeof window==="undefined")return null;
  try{return parseInspectionNoteDraft(sessionStorage.getItem(inspectionNoteDraftKey(inspectionId,systemId)),inspectionId,systemId)}catch{return null}
}
