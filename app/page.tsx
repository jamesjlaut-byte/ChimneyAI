import Image from "next/image";
import Link from "next/link";

export default function Home(){
  return <main className="landing">
    <section className="hero">
      <Image className="heroLogo" src="/assets/chimneyai-official-logo.png" alt="ChimneyAI" width={1254} height={1254} sizes="(max-width: 480px) 94vw, (max-width: 1240px) 38vw, 470px" priority/>
      <div className="eyebrow">CHIMNEY INTELLIGENCE</div>
      <h1>One AI. Two very different jobs.</h1>
      <p>Simple chimney and fireplace guidance for homeowners. Technical research and field support for chimney professionals.</p>
      <div className="choiceGrid">
        <Link href="/homeowner" className="choice homeownerChoice">
          <div className="choiceHead"><Image src="/assets/chimneyai-app-icon.png" alt="" width={58} height={58}/><span className="choiceTag">HOMEOWNER</span></div>
          <h2>Understand your chimney.</h2>
          <p>Explain inspections, repairs, terminology, credentials and the right questions to ask before you hire.</p>
          <b>Open Homeowner AI →</b>
        </Link>
        <Link href="/pro" className="choice proChoice">
          <div className="choiceHead"><Image src="/assets/chimneyai-app-icon.png" alt="" width={58} height={58}/><span className="choiceTag">PROFESSIONAL</span></div>
          <h2>Technical chimney intelligence.</h2>
          <p>Research, calculations, manufacturer documentation, report language and professional field support.</p>
          <b>Open ChimneyAI Pro →</b>
        </Link>
      </div>

      <section className="proDifference" aria-labelledby="pro-difference-title">
        <div className="differenceIntro">
          <div className="eyebrow">WHY CHIMNEYAI PRO</div>
          <h2 id="pro-difference-title">A professional workspace—not a blank chat.</h2>
          <p>Generic AI can answer a question. ChimneyAI helps document what supports the answer, what remains unverified, and what the technician ultimately concludes.</p>
        </div>
        <div className="differenceGrid">
          <div><b>Field evidence stays attached</b><span>Photos, reports, exact source files, page-marked PDF text, and SHA-256 provenance remain connected to the case.</span></div>
          <div><b>Source discipline is built in</b><span>Manufacturer, model, manual revision, and applicable page remain separate verification steps—never silently substituted.</span></div>
          <div><b>Professional reasoning stays clear</b><span>Observed facts, measurements, calculations, source requirements, interpretation, and recommendations are kept distinct.</span></div>
          <div><b>The technician remains in control</b><span>AI supports research and wording without issuing a safety clearance or replacing qualified professional judgment.</span></div>
        </div>
        <div className="evidenceFlow" aria-label="ChimneyAI professional workflow">
          <span>Observe</span><i>→</i><span>Measure</span><i>→</i><span>Verify source</span><i>→</i><span>Analyze</span><i>→</i><span>Document</span>
        </div>
      </section>
    </section>
  </main>;
}
