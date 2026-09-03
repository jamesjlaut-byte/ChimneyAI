import Image from "next/image";
import Link from "next/link";
import type {Metadata} from "next";
import ChimneyChat from "@/components/ChimneyChat";

export const metadata:Metadata={
  title:"ChimneyAI Pro",
  description:"Evidence-aware chimney technical research, manufacturer documentation, calculations, and professional field support.",
  alternates:{canonical:"/pro"},
  openGraph:{title:"ChimneyAI Pro",description:"Evidence-aware technical support for chimney professionals.",url:"/pro",images:["/assets/chimneyai-official-logo.png"]},
  twitter:{title:"ChimneyAI Pro",description:"Evidence-aware technical support for chimney professionals.",images:["/assets/chimneyai-official-logo.png"]}
};

export default function ProPage(){
  return <main className="appPage proPage">
    <div className="modeHeader">
      <div className="modeIdentity">
        <Link className="modeLogoLink" href="/" aria-label="Back to ChimneyAI home"><Image className="modeLogo" src="/assets/chimneyai-official-logo.png" alt="ChimneyAI" width={1254} height={1254} sizes="(max-width: 480px) 92vw, (max-width: 760px) 78vw, 220px" priority/></Link>
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
