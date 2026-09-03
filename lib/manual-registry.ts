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
    notes:"Official Napoleon professional support center with product-manual resources. The site may present a browser-verification step.",
    verified_on:"2026-09-02"
  },
  {
    id:"superior",
    name:"Superior",
    aliases:["Superior Fireplaces"],
    official_manual_lookup:"https://superiorfireplaces.us.com/documents/",
    lookup_type:"manual_index",
    notes:"Official Superior product-document archive with model and document filters.",
    verified_on:"2026-09-02"
  },
  {
    id:"harman",
    name:"Harman",
    aliases:["Harman Stoves"],
    official_manual_lookup:"https://forgenflame.com/pages/product-manuals",
    lookup_type:"manual_index",
    notes:"Official Forge & Flame manuals library. Open the Harman section for active and legacy product documents.",
    verified_on:"2026-09-02"
  },
  {
    id:"quadra-fire",
    name:"Quadra-Fire",
    aliases:["Quadra Fire","Quadrafire"],
    official_manual_lookup:"https://forgenflame.com/pages/product-manuals",
    lookup_type:"manual_index",
    notes:"Official Forge & Flame manuals library. Open the Quadra-Fire section for active and legacy product documents.",
    verified_on:"2026-09-02"
  },
  {
    id:"vermont-castings",
    name:"Vermont Castings",
    aliases:["Vermont Casting"],
    official_manual_lookup:"https://forgenflame.com/pages/product-manuals",
    lookup_type:"manual_index",
    notes:"Official Forge & Flame manuals library. Open the Vermont Castings section for active and legacy product documents.",
    verified_on:"2026-09-02"
  },
  {
    id:"duravent",
    name:"DuraVent",
    aliases:["Duravent","Dura Vent","M&G DuraVent","M and G DuraVent"],
    official_manual_lookup:"https://duravent.com/resources?keywords=installation+instructions",
    lookup_type:"manual_index",
    notes:"Official DuraVent resource library filtered for installation instructions. Confirm the exact product family, diameter, market, and document revision.",
    verified_on:"2026-09-02"
  },
  {
    id:"selkirk",
    name:"Selkirk",
    aliases:["Selkirk Corporation","Selkirk Chimney","Selkirk Metalbestos","Metalbestos"],
    official_manual_lookup:"https://www.selkirkcorp.com/en-ca/resources-en-ca",
    lookup_type:"manual_index",
    notes:"Official Selkirk resource and download library. Select the correct country, product system, and current or legacy instructions.",
    verified_on:"2026-09-02"
  },
  {
    id:"icc-rsf",
    name:"ICC / RSF",
    aliases:["ICC","ICC Chimney","ICC-RSF","Industrial Chimney Company","RSF","RSF Fireplaces"],
    official_manual_lookup:"https://icc-rsf.com/support-and-warranty/",
    lookup_type:"support_center",
    notes:"Official ICC/RSF support library for chimney systems, fireplaces, manuals, and legacy documents.",
    verified_on:"2026-09-02"
  }
];

function normalizeManufacturer(value:string){
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g," and ")
    .replace(/[^a-z0-9]+/g," ")
    .trim()
    .replace(/\s+/g," ");
}

export function matchManufacturer(raw:string){
  const q=normalizeManufacturer(raw);
  if(!q)return null;
  return MANUFACTURERS.find(m =>
    [m.name,...m.aliases].some(name=>normalizeManufacturer(name)===q)
  )||null;
}
