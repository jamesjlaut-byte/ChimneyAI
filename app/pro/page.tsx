import ChimneyChat from "@/components/ChimneyChat";

export default function ProPage(){
  return <main className="appPage proPage">
    <div className="modeHeader">
      <div><div className="eyebrow">CHIMNEYAI PRO</div><h1>Technical assistant for chimney professionals.</h1>
        <p>Separate observed facts, calculations, source requirements and professional interpretation.</p></div>
      <div className="trustPill proTrust">Professional mode</div>
    </div>

    <div className="proTools">
      <div><b>Technical research</b><span>Standards, manuals and source hierarchy</span></div>
      <div><b>Calculations</b><span>Field math with known/missing inputs separated</span></div>
      <div><b>Report language</b><span>Objective, defensible inspection wording</span></div>
      <div><b>Photo second-look</b><span>Visible observations and suggested verification</span></div>
    </div>
    <ChimneyChat mode="pro"/>
  </main>;
}