import Image from "next/image";
import Link from "next/link";
import type {Metadata} from "next";
import ChimneyChat from "@/components/ChimneyChat";

export const metadata:Metadata={
  title:"ChimneyAI Homeowner",
  description:"Understand chimney inspections, repairs, terminology, and questions to ask with homeowner-focused AI guidance.",
  alternates:{canonical:"/homeowner"},
  openGraph:{title:"ChimneyAI Homeowner",description:"Homeowner-focused chimney and fireplace guidance.",url:"/homeowner",images:["/assets/chimneyai-official-logo.png"]},
  twitter:{title:"ChimneyAI Homeowner",description:"Homeowner-focused chimney and fireplace guidance.",images:["/assets/chimneyai-official-logo.png"]}
};

export default function HomeownerPage(){
  return <main className="appPage">
    <div className="modeHeader">
      <div className="modeIdentity">
        <Link className="modeLogoLink" href="/" aria-label="Back to ChimneyAI home"><Image className="modeLogo" src="/assets/chimneyai-official-logo.png" alt="ChimneyAI" width={220} height={220} priority/></Link>
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
