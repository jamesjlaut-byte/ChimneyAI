import Image from "next/image";
import ChimneyChat from "@/components/ChimneyChat";

export default function ProPage(){
  return <main className="appPage proPage">
    <div className="modeHeader">
      <div className="modeIdentity">
        <Image className="modeLogo" src="/assets/chimneyai-official-logo.png" alt="ChimneyAI" width={220} height={220} priority/>
        <div><div className="eyebrow">CHIMNEYAI PRO</div><h1>Technical assistant for chimney professionals.</h1>
        <p>Separate observed facts, calculations, source requirements and professional interpretation.</p></div>
      </div>
      <div className="trustPill proTrust">Professional mode</div>
    </div>

    <ChimneyChat mode="pro"/>
    <div className="proPositioning belowChatPositioning">
      <b>Chat gives you an answer. ChimneyAI gives you the evidence trail.</b>
      <span>Keep field documentation, exact sources, calculations, saved cases, and technical guardrails connected to the work.</span>
    </div>
    <div className="proTools belowChatFeatures">
      <div><b>Technical research</b><span>Standards, manuals and source hierarchy</span></div>
      <div><b>Calculations</b><span>Field math with known/missing inputs separated</span></div>
      <div><b>Report language</b><span>Objective, defensible inspection wording</span></div>
      <div><b>Photo second-look</b><span>Visible observations and suggested verification</span></div>
    </div>
  </main>;
}
