export type InspectionNoteDraft={version:1;inspectionId:string;systemId:string;component:string;base:string;note:string};
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
    if(draft.version!==1||draft.inspectionId!==inspectionId||draft.systemId!==systemId||typeof draft.component!=="string"||!draft.component||draft.component.length>200||typeof draft.base!=="string"||draft.base.length>15000||typeof draft.note!=="string"||draft.note.length>MAX_DRAFT_NOTE_LENGTH)return null;
    return {version:1,inspectionId,systemId,component:draft.component,base:draft.base,note:draft.note};
  }catch{return null}
}

export function loadInspectionNoteDraft(inspectionId:string,systemId:string):InspectionNoteDraft|null{
  if(typeof window==="undefined")return null;
  try{return parseInspectionNoteDraft(sessionStorage.getItem(inspectionNoteDraftKey(inspectionId,systemId)),inspectionId,systemId)}catch{return null}
}
