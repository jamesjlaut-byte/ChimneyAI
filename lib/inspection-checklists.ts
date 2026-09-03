import type {InspectionType,SystemType} from "@/lib/inspections";

export type InspectionChecklistItem={id:string;label:string;photoRecommended:boolean};

const item=(id:string,label:string,photoRecommended=true):InspectionChecklistItem=>({id,label,photoRecommended});
const SHARED=[item("appliance_identification","Appliance identification / data plate"),item("hearth","Hearth and floor protection"),item("chimney_exterior","Chimney or vent exterior"),item("termination","Termination / cap")];
const SYSTEM_ITEMS:Record<SystemType,InspectionChecklistItem[]>={
  masonry_fireplace:[item("firebox","Firebox"),item("damper","Damper"),item("smoke_chamber","Smoke chamber"),item("flue","Flue interior"),item("crown","Crown"),item("flashing","Flashing")],
  factory_built_fireplace:[item("firebox","Firebox and refractory panels"),item("doors_screens","Doors and screens",false),item("vent_system","Listed vent system"),item("chase","Chase and chase cover"),item("clearances","Observable clearances")],
  wood_stove:[item("appliance","Stove body and components"),item("connector","Connector pipe"),item("vent_system","Chimney / vent system"),item("clearances","Observable clearances")],
  wood_insert:[item("appliance","Insert body and components"),item("connector","Connector / liner connection"),item("flue","Liner and flue"),item("surround","Surround and enclosure",false),item("clearances","Observable clearances")],
  pellet_appliance:[item("appliance","Pellet appliance"),item("connector","Vent connector"),item("vent_system","Pellet vent system"),item("air_supply","Combustion air supply",false),item("clearances","Observable clearances")],
  gas_fireplace:[item("appliance","Gas fireplace components"),item("glass_barrier","Glass and safety barrier"),item("vent_system","Venting system"),item("clearances","Observable clearances")],
  gas_insert:[item("appliance","Gas insert components"),item("glass_barrier","Glass and safety barrier"),item("vent_system","Venting system"),item("surround","Surround and enclosure",false)],
  gas_log_set:[item("firebox","Firebox"),item("gas_log_set","Gas log set and controls"),item("damper","Damper / venting position"),item("vent_system","Venting pathway")],
  freestanding_gas_appliance:[item("appliance","Gas stove components"),item("glass_barrier","Glass and safety barrier"),item("connector","Vent connector"),item("vent_system","Venting system"),item("clearances","Observable clearances")],
  masonry_heater:[item("firebox","Firebox"),item("masonry_heater","Heater body and channels"),item("flue","Flue interior"),item("clearances","Observable clearances"),item("crown","Crown"),item("flashing","Flashing")],
  other:[item("appliance","System / appliance"),item("vent_system","Venting system"),item("clearances","Observable clearances")]
};

const LEVEL_TWO=[item("attic_access","Accessible attic / concealed-space areas"),item("video_scan","Video scan / internal flue examination")];

export function getInspectionChecklist(systemType:SystemType,inspectionType:InspectionType):InspectionChecklistItem[]{
  const combined=[...SHARED,...SYSTEM_ITEMS[systemType],...(inspectionType==="level_2"?LEVEL_TWO:[])];
  return combined.filter((entry,index)=>combined.findIndex(candidate=>candidate.id===entry.id)===index);
}
