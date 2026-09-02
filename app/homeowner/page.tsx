import Image from "next/image";
import ChimneyChat from "@/components/ChimneyChat";

export default function HomeownerPage(){
  return <main className="appPage">
    <div className="modeHeader">
      <div className="modeIdentity">
        <Image className="modeLogo" src="/assets/chimneyai-official-logo.png" alt="ChimneyAI" width={220} height={220} priority/>
        <div><div className="eyebrow">FOR HOMEOWNERS</div><h1>ChimneyAI</h1>
        <p>Understand what your chimney professional is telling you—without turning AI into the inspector.</p></div>
      </div>
      <div className="trustPill">Educational guidance</div>
    </div>

    <ChimneyChat mode="homeowner"/>
    <div className="homeownerFeatureRow belowChatFeatures">
      <span>Inspection explanations</span><span>Repair explanations</span><span>Credential guidance</span><span>Questions to ask</span>
    </div>
  </main>;
}
