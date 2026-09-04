import type {PhotoCategory} from "@/lib/inspections";
import type {InspectionChecklistItem} from "@/lib/inspection-checklists";
import {MAX_PHONE_IMAGE_BYTES} from "./phone-image.ts";

export const MAX_INSPECTION_PHOTO_BYTES=MAX_PHONE_IMAGE_BYTES;
export const INSPECTION_PHOTO_TYPES=new Set(["image/jpeg","image/png","image/webp","image/heic","image/heif"]);

const COMPONENT_CATEGORIES:Record<string,PhotoCategory>={
  appliance_identification:"data_plate",appliance:"appliance",gas_log_set:"appliance",masonry_heater:"appliance",
  firebox:"firebox",hearth:"hearth",damper:"damper",smoke_chamber:"smoke_chamber",flue:"flue",termination:"cap",
  crown:"crown",chase:"chase_cover",flashing:"flashing",chimney_exterior:"chimney_exterior",attic_access:"attic",
  connector:"connector",clearances:"clearance",vent_system:"appliance"
};

export function defaultPhotoCategory(component:string):PhotoCategory{return COMPONENT_CATEGORIES[component]||"other"}

export function validateInspectionPhoto(file:{size:number;type:string}):string|null{
  if(file.size<=0)return "The selected photo is empty.";
  if(file.size>MAX_INSPECTION_PHOTO_BYTES)return "Inspection photos up to 50 MB are supported. Export a smaller copy of this file.";
  if(!INSPECTION_PHOTO_TYPES.has(file.type.toLowerCase()))return "Use a JPEG, PNG, WebP, HEIC, or HEIF inspection photo.";
  return null;
}

export function recommendedPhotoGaps(checklist:InspectionChecklistItem[],findings:Array<{id:string;component:string;status:string}>,photos:Array<{finding_ids:string[]}>):InspectionChecklistItem[]{
  const findingsByComponent=new Map(findings.map(finding=>[finding.component,finding]));
  const photographedFindingIds=new Set(photos.flatMap(photo=>photo.finding_ids));
  return checklist.filter(item=>{
    if(!item.photoRecommended)return false;
    const finding=findingsByComponent.get(item.id);
    if(!finding||finding.status==="not_applicable"||finding.status==="unable_to_inspect")return false;
    return !photographedFindingIds.has(finding.id);
  });
}
