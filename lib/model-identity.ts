export function normalizeModelIdentifier(value:string){
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g,"");
}

export function modelsConflict(applianceModel?:string,manualModel?:string){
  if(!applianceModel?.trim()||!manualModel?.trim())return false;
  return normalizeModelIdentifier(applianceModel)!==normalizeModelIdentifier(manualModel);
}
