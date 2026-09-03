import type {PhotoCategory} from "@/lib/inspections";

export const MAX_INSPECTION_PHOTO_BYTES=20*1024*1024;
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
  if(file.size>MAX_INSPECTION_PHOTO_BYTES)return "Inspection photos must be 20 MB or smaller.";
  if(!INSPECTION_PHOTO_TYPES.has(file.type.toLowerCase()))return "Use a JPEG, PNG, WebP, HEIC, or HEIF inspection photo.";
  return null;
}
