"use client";
import {useMemo,useState} from "react";

function positive(value:string){const number=Number(value);return Number.isFinite(number)&&number>0?number:null;}

export default function ProCalculators(){
  const [width,setWidth]=useState("");const [height,setHeight]=useState("");
  const [flueW,setFlueW]=useState("");const [flueH,setFlueH]=useState("");
  const [round,setRound]=useState("");
  const result=useMemo(()=>{
    const openingWidth=positive(width),openingHeight=positive(height),roundDiameter=positive(round);
    const rectangularWidth=positive(flueW),rectangularHeight=positive(flueH);
    if(!openingWidth||!openingHeight)return null;
    const opening=openingWidth*openingHeight;
    const flue=roundDiameter?Math.PI*Math.pow(roundDiameter/2,2):rectangularWidth&&rectangularHeight?rectangularWidth*rectangularHeight:null;
    if(!flue)return null;
    return {opening,flue,ratio:opening/flue};
  },[width,height,flueW,flueH,round]);
  const hasInput=[width,height,flueW,flueH,round].some(Boolean);

  return <details className="toolDrawer">
    <summary>Field calculator · opening / flue ratio</summary>
    <div className="calcGrid">
      <label>Opening width (in)<input type="number" min="0" step="any" value={width} onChange={e=>setWidth(e.target.value)} inputMode="decimal"/></label>
      <label>Opening height (in)<input type="number" min="0" step="any" value={height} onChange={e=>setHeight(e.target.value)} inputMode="decimal"/></label>
      <label>Rect. flue width (in)<input type="number" min="0" step="any" value={flueW} onChange={e=>{setFlueW(e.target.value);if(e.target.value)setRound("")}} inputMode="decimal"/></label>
      <label>Rect. flue height (in)<input type="number" min="0" step="any" value={flueH} onChange={e=>{setFlueH(e.target.value);if(e.target.value)setRound("")}} inputMode="decimal"/></label>
      <label>OR round flue diameter (in)<input type="number" min="0" step="any" value={round} onChange={e=>{setRound(e.target.value);if(e.target.value){setFlueW("");setFlueH("")}}} inputMode="decimal"/></label>
    </div>
    {hasInput&&!result&&<div className="calcWarning" role="status">Enter positive opening dimensions and either both rectangular flue dimensions or one round diameter.</div>}
    {result&&<div className="calcResult" aria-live="polite"><b>Opening:</b> {result.opening.toFixed(1)} in² · <b>Flue:</b> {result.flue.toFixed(1)} in² · <b>Opening-to-flue area ratio:</b> approximately {result.ratio.toFixed(2)}:1
      <p>This is arithmetic only. ChimneyAI does not use this number alone to declare a fireplace compliant or acceptable; chimney height, location, geometry, adopted requirements and other conditions may control the evaluation.</p>
    </div>}
  </details>;
}
