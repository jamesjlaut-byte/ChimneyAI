import Image from "next/image";
import Link from "next/link";

export default function Home(){
  return <main className="landing">
    <section className="hero">
      <Image className="heroLogo" src="/assets/chimneyai-official-logo.png" alt="ChimneyAI" width={360} height={360} priority/>
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
    </section>
  </main>;
}
