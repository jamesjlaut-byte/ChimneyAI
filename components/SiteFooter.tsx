import Link from "next/link";

export default function SiteFooter(){
  return <footer className="siteFooter">
    <p>ChimneyAI provides educational and professional decision-support information—not a safety clearance, inspection, code determination, or substitute for qualified onsite judgment.</p>
    <nav aria-label="Legal"><Link href="/legal">Legal, privacy &amp; AI disclaimer</Link></nav>
  </footer>;
}
