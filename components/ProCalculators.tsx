"use client";
import {useMemo,useState} from "react";

export default function ProCalculators(){
  const [width,setWidth]=useState("");const [height,setHeight]=useState("");
  const [flueW,setFlueW]=useState("");const [flueH,setFlueH]=useState("");
  const [round,setRound]=useState("");
  const result=useMemo(()=>{
    const opening=Number(width)*Number(height);
    const flue=round?Math.PI*Math.pow(Number(round)/2,2):Number(flueW)*Number(flueH);
    if(!opening||!flue)return null;
    return {opening,flue,ratio:opening/flue};
  },[width,height,flueW,flueH,round]);

  return <details className="toolDrawer">
    <summary>Field calculator · opening / flue ratio</summary>
    <div className="calcGrid">
      <label>Opening width (in)<input value={width} onChange={e=>setWidth(e.target.value)} inputMode="decimal"/></label>
      <label>Opening height (in)<input value={height} onChange={e=>setHeight(e.target.value)} inputMode="decimal"/></label>
      <label>Rect. flue width (in)<input value={flueW} onChange={e=>{setFlueW(e.target.value);if(e.target.value)setRound("")}} inputMode="decimal"/></label>
      <label>Rect. flue height (in)<input value={flueH} onChange={e=>{setFlueH(e.target.value);if(e.target.value)setRound("")}} inputMode="decimal"/></label>
      <label>OR round flue diameter (in)<input value={round} onChange={e=>{setRound(e.target.value);if(e.target.value){setFlueW("");setFlueH("")}}} inputMode="decimal"/></label>
    </div>
    {result&&<div className="calcResult"><b>Opening:</b> {result.opening.toFixed(1)} in² · <b>Flue:</b> {result.flue.toFixed(1)} in² · <b>Area ratio:</b> approximately 1:{result.ratio.toFixed(2)}
      <p>This is arithmetic only. ChimneyAI does not use this number alone to declare a fireplace compliant or acceptable; chimney height, location, geometry, adopted requirements and other conditions may control the evaluation.</p>
    </div>}
  </details>;
}