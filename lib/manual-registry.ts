export type ManufacturerRegistryEntry={
  id:string;
  name:string;
  aliases:string[];
  official_manual_lookup:string;
  lookup_type:"model_search"|"manual_index"|"support_center";
  notes:string;
  verified_on:string;
};

export const MANUFACTURERS:ManufacturerRegistryEntry[]=[
  {
    id:"majestic",
    name:"Majestic",
    aliases:["Majestic Products","Majestic Fireplaces"],
    official_manual_lookup:"https://www.majesticproducts.com/homeowner-support/user-guides-and-manuals",
    lookup_type:"model_search",
    notes:"Official Majestic manual lookup by product name/model.",
    verified_on:"2026-09-02"
  },
  {
    id:"heat-glo",
    name:"Heat & Glo",
    aliases:["Heat and Glo","Heat-N-Glo","Heat N Glo"],
    official_manual_lookup:"https://www.heatnglo.com/manuals",
    lookup_type:"model_search",
    notes:"Official Heat & Glo manual lookup.",
    verified_on:"2026-09-02"
  },
  {
    id:"heatilator",
    name:"Heatilator",
    aliases:["Heatilator Fireplaces"],
    official_manual_lookup:"https://www.heatilator.com/owner-support/install-and-owners-manuals",
    lookup_type:"model_search",
    notes:"Official Heatilator installation and owner's manual support page.",
    verified_on:"2026-09-02"
  },
  {
    id:"regency",
    name:"Regency",
    aliases:["Regency Fireplace Products","Regency Fire"],
    official_manual_lookup:"https://www.regency-fire.com/en/Owners/Service-Maintenance/Manuals",
    lookup_type:"manual_index",
    notes:"Official Regency current manual index. Regency also maintains discontinued manuals.",
    verified_on:"2026-09-02"
  },
  {
    id:"napoleon",
    name:"Napoleon",
    aliases:["Napoleon Fireplaces","Wolf Steel"],
    official_manual_lookup:"https://www.napoleon.com/en/us/fireplaces/support/professionals-support-center",
    lookup_type:"support_center",
    notes:"Official Napoleon professional support center with product-manual resources.",
    verified_on:"2026-09-02"
  }
];

export function matchManufacturer(raw:string){
  const q=raw.trim().toLowerCase();
  if(!q)return null;
  return MANUFACTURERS.find(m =>
    m.name.toLowerCase()===q ||
    m.aliases.some(a=>a.toLowerCase()===q) ||
    q.includes(m.name.toLowerCase())
  )||null;
}
