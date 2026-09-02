import Link from "next/link";

export default function Home(){
  return <main className="landing">
    <section className="hero">
      <div className="eyebrow">CHIMNEY INTELLIGENCE</div>
      <h1>One AI. Two very different jobs.</h1>
      <p>Simple chimney and fireplace guidance for homeowners. Technical research and field support for chimney professionals.</p>
      <div className="choiceGrid">
        <Link href="/homeowner" className="choice homeownerChoice">
          <span className="choiceTag">HOMEOWNER</span>
          <h2>Understand your chimney.</h2>
          <p>Explain inspections, repairs, terminology, credentials and the right questions to ask before you hire.</p>
          <b>Open Homeowner AI →</b>
        </Link>
        <Link href="/pro" className="choice proChoice">
          <span className="choiceTag">PROFESSIONAL</span>
          <h2>Technical chimney intelligence.</h2>
          <p>Research, calculations, manufacturer documentation, report language and professional field support.</p>
          <b>Open ChimneyAI Pro →</b>
        </Link>
      </div>
    </section>
  </main>;
}