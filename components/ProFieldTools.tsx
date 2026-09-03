"use client";
import {useMemo,useState} from "react";
import ProCalculators from "@/components/ProCalculators";

function n(v:string){const x=Number(v);return Number.isFinite(x)?x:0;}

export default function ProFieldTools(){
  const [span,setSpan]=useState(""),[rise,setRise]=useState("");
  const arch=useMemo(()=>{
    const c=n(span),h=n(rise);if(c<=0||h<=0||h>c/2)return null;
    const radius=(c*c)/(8*h)+h/2;
    const angle=2*Math.asin(Math.min(1,c/(2*radius)));
    const arc=radius*angle;
    return {radius,arc,angleDeg:angle*180/Math.PI};
  },[span,rise]);

  const [hearthW,setHearthW]=useState(""),[hearthD,setHearthD]=useState("");
  const [openingW,setOpeningW]=useState("");
  const hearth=useMemo(()=>{
    const hw=n(hearthW),hd=n(hearthD),ow=n(openingW);if(!hw||!hd||!ow)return null;
    if(hw<ow)return null;
    return {sideEach:(hw-ow)/2,depth:hd};
  },[hearthW,hearthD,openingW]);
  const archHasInput=Boolean(span||rise),hearthHasInput=Boolean(hearthW||hearthD||openingW);

  return <details className="workspaceGroup fieldTools">
    <summary><span>Calculators &amp; measurement</span><small>field math and geometry helpers</small></summary>
    <div className="workspaceGroupBody">
      <ProCalculators/>
      <details className="toolDrawer">
      <summary>Arch geometry · span / rise</summary>
      <div className="calcGrid archCalc">
        <label>Arch span / chord (in)<input type="number" min="0" step="any" value={span} onChange={e=>setSpan(e.target.value)} inputMode="decimal"/></label>
        <label>Arch rise (in)<input type="number" min="0" step="any" value={rise} onChange={e=>setRise(e.target.value)} inputMode="decimal"/></label>
      </div>
      {archHasInput&&!arch&&<div className="calcWarning" role="status">Enter positive dimensions. This segment helper requires rise to be no greater than half the span.</div>}
      {arch&&<div className="calcResult">
        <b>Calculated segment radius:</b> {arch.radius.toFixed(2)} in · <b>arc length:</b> {arch.arc.toFixed(2)} in · <b>central angle:</b> {arch.angleDeg.toFixed(1)}°
        <p>Geometry aid only. Verify the field shape and measurement method before using this for fabrication or clearance analysis.</p>
      </div>}
      </details>

      <details className="toolDrawer">
      <summary>Hearth measurement helper</summary>
      <div className="calcGrid hearthCalc">
        <label>Total hearth width (in)<input type="number" min="0" step="any" value={hearthW} onChange={e=>setHearthW(e.target.value)} inputMode="decimal"/></label>
        <label>Opening width (in)<input type="number" min="0" step="any" value={openingW} onChange={e=>setOpeningW(e.target.value)} inputMode="decimal"/></label>
        <label>Hearth depth from opening plane (in)<input type="number" min="0" step="any" value={hearthD} onChange={e=>setHearthD(e.target.value)} inputMode="decimal"/></label>
      </div>
      {hearthHasInput&&!hearth&&<div className="calcWarning" role="status">Enter positive dimensions. Total hearth width cannot be less than the opening width.</div>}
      {hearth&&<div className="calcResult">
        <b>Calculated side extension if centered:</b> {hearth.sideEach.toFixed(2)} in each side · <b>measured front depth entered:</b> {hearth.depth.toFixed(2)} in
        <p>This tool reports geometry only. It does not decide the required hearth extension. Required dimensions must come from the controlling appliance listing/manual and/or adopted requirements applicable to the installation.</p>
      </div>}
      </details>
    </div>
  </details>;
}
