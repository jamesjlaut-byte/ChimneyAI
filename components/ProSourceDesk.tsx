"use client";
import {MANUFACTURERS} from "@/lib/manual-registry";

export type ProSourceState={
  task:"general"|"label_scan"|"manual_review"|"source_check"|"report_language";
  manufacturer:string;model:string;serial:string;listing_mark:string;fuel_type:string;
  source_type:"manufacturer_manual"|"listing_label"|"adopted_code"|"standard"|"field_measurement"|"unknown";
  source_title:string;
  source_status:"uploaded"|"verified_external"|"reference_only"|"not_available";
  technician_question:string;
};

export const EMPTY_PRO_SOURCE:ProSourceState={
  task:"general",manufacturer:"",model:"",serial:"",listing_mark:"",fuel_type:"",
  source_type:"unknown",source_title:"",source_status:"not_available",technician_question:""
};

const SOURCE_STATUS_LABELS:Record<ProSourceState["source_status"],string>={
  uploaded:"uploaded here",
  verified_external:"externally verified (recorded)",
  reference_only:"reference only",
  not_available:"not available"
};

export default function ProSourceDesk({value,onChange}:{value:ProSourceState;onChange:(v:ProSourceState)=>void}){
  function set<K extends keyof ProSourceState>(key:K,val:ProSourceState[K]){onChange({...value,[key]:val});}
  return <details className="sourceDesk">
    <summary><span>Source Desk</span><small>manufacturer · model · manual · listing</small></summary>
    <div className="sourceDeskBody">
      <div className="sourceStatusBanner">
        <b>Source status:</b> {SOURCE_STATUS_LABELS[value.source_status]}
        <span>ChimneyAI will not silently upgrade an unverified source.</span>
      </div>
      <div className="sourceGrid">
        <label>Task<select value={value.task} onChange={e=>set("task",e.target.value as ProSourceState["task"])}>
          <option value="general">General technical question</option>
          <option value="label_scan">UL / listing label scan</option>
          <option value="manual_review">Manufacturer manual review</option>
          <option value="source_check">Controlling-source check</option>
          <option value="report_language">Report language</option>
        </select></label>
        <label>Source type<select value={value.source_type} onChange={e=>set("source_type",e.target.value as ProSourceState["source_type"])}>
          <option value="unknown">Unknown / not selected</option>
          <option value="manufacturer_manual">Manufacturer manual</option>
          <option value="listing_label">Listing / rating label</option>
          <option value="adopted_code">Adopted code</option>
          <option value="standard">Standard</option>
          <option value="field_measurement">Field measurement</option>
        </select></label>
        <label>Source status<select value={value.source_status} onChange={e=>set("source_status",e.target.value as ProSourceState["source_status"])}>
          <option value="not_available">Not available</option>
          <option value="uploaded">Uploaded here</option>
          <option value="reference_only">Reference only</option>
          <option value="verified_external">Externally verified (recorded)</option>
        </select></label>
        <label>Source title<input value={value.source_title} onChange={e=>set("source_title",e.target.value)} placeholder="Manual / document title"/></label>
        <label>Manufacturer<input value={value.manufacturer} onChange={e=>set("manufacturer",e.target.value)} placeholder="Type or select manufacturer" list="known-manufacturers" autoComplete="off"/></label>
        <label>Model<input value={value.model} onChange={e=>set("model",e.target.value)} placeholder="Exact model if known"/></label>
        <label>Serial<input value={value.serial} onChange={e=>set("serial",e.target.value)} placeholder="Serial if visible"/></label>
        <label>Listing / standard mark<input value={value.listing_mark} onChange={e=>set("listing_mark",e.target.value)} placeholder="UL / ULC / ANSI mark if visible"/></label>
        <label>Fuel / appliance<input value={value.fuel_type} onChange={e=>set("fuel_type",e.target.value)} placeholder="Wood, gas, pellet…"/></label>
      </div>
      <datalist id="known-manufacturers">
        {MANUFACTURERS.map(manufacturer=><option key={manufacturer.id} value={manufacturer.name}/>)}
      </datalist>
      <label className="wideSourceLabel">Technical question / verification goal
        <textarea value={value.technician_question} onChange={e=>set("technician_question",e.target.value)}
          placeholder="What exactly are you trying to verify from the controlling source?" rows={3}/>
      </label>
      <div className="sourceTip"><b>Best workflow:</b> photograph the entire label, add close-ups if needed, upload the exact manual PDF when available, then ask the specific installation question.</div>
    </div>
  </details>;
}
