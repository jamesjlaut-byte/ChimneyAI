export function normalizeModelIdentifier(value:string){
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g,"");
}

export function modelsConflict(applianceModel?:string,manualModel?:string){
  if(!applianceModel?.trim()||!manualModel?.trim())return false;
  const appliance=normalizeModelIdentifier(applianceModel);
  const manual=normalizeModelIdentifier(manualModel);
  if(!appliance||!manual)return true;
  return appliance!==manual;
}
