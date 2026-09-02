import type {Metadata} from "next";

export const metadata:Metadata={
  title:"Legal, Privacy & AI Disclaimer | ChimneyAI",
  description:"ChimneyAI terms of use, professional and AI disclaimer, and privacy notice."
};

export default function LegalPage(){
  return <main className="legalPage">
    <header className="legalHero">
      <div className="eyebrow">CHIMNEYAI LEGAL</div>
      <h1>Legal, privacy &amp; AI disclaimer</h1>
      <p>Effective September 2, 2026 · This page applies to the ChimneyAI website, Homeowner AI, and ChimneyAI Pro.</p>
    </header>

    <aside className="legalNotice"><b>Important:</b> ChimneyAI is a decision-support and educational tool. It does not inspect property, issue a safety clearance, certify compliance, or replace a qualified professional, controlling manufacturer instructions, listings, adopted codes, standards, engineering, or authority having jurisdiction.</aside>

    <section><h2>1. Acceptance and permitted use</h2><p>By accessing or using ChimneyAI, you agree to these terms. Use the service only for lawful purposes and only if you are able to evaluate its limitations. Do not use ChimneyAI to impersonate a professional, fabricate inspection evidence, falsify records, or misrepresent AI output as an onsite observation, verified source requirement, certification, approval, or final professional conclusion.</p></section>

    <section><h2>2. Homeowner information</h2><p>Homeowner AI provides general education and explanations. It is not an inspection, diagnosis, repair specification, contractor recommendation, or emergency service. Conditions may be concealed, site-specific, or impossible to determine from text, a report, or an image. Hire an appropriately qualified local professional to inspect the actual system and verify applicable requirements.</p></section>

    <section><h2>3. Professional responsibility</h2><p>ChimneyAI Pro assists qualified users with research, calculations, source organization, image second-look, and technical wording. The professional user remains solely responsible for field observations, measurement methods, source applicability, conclusions, recommendations, work performed, documentation, and communications to a customer or authority. AI suggestions must be independently reviewed, corrected where necessary, and accepted or rejected by the professional.</p></section>

    <section><h2>4. AI and source limitations</h2><p>AI output can be incomplete, incorrect, outdated, or inapplicable. ChimneyAI may misunderstand images, extracted PDF text, measurements, model numbers, manuals, or user context. PDF extraction can omit tables, diagrams, handwriting, images, and formatting. A SHA-256 value identifies exact bytes; it does not prove authenticity, authority, applicability, current revision, compliance, or safety. Similar products or manuals must never be silently treated as the exact controlling source.</p></section>

    <section><h2>5. No emergency use</h2><p>Do not rely on ChimneyAI during a fire, suspected carbon-monoxide event, smoke condition, gas odor, active appliance malfunction, or other emergency. Leave the area when appropriate and contact emergency services, the fire department, utility, or another qualified responder.</p></section>

    <section><h2>6. No warranties</h2><p>To the maximum extent permitted by applicable law, ChimneyAI is provided “as is” and “as available,” without warranties of accuracy, completeness, availability, fitness for a particular purpose, non-infringement, safety, compliance, or results. Nothing in the service is a guarantee that a chimney, fireplace, venting system, or appliance is safe or compliant.</p></section>

    <section><h2>7. Limitation of liability</h2><p>To the maximum extent permitted by applicable law, the ChimneyAI operator and its suppliers will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, lost profits, lost data, property damage, personal injury, or losses arising from reliance on AI output or failure to obtain qualified onsite evaluation. Some jurisdictions do not allow particular exclusions or limitations, so portions of this section may not apply. Operator-specific liability caps, governing law, dispute terms, and business identity require review and completion by licensed counsel before commercial launch.</p></section>

    <section><h2>8. Third-party services and materials</h2><p>The service may use or link to AI providers, Supabase, Vercel, manufacturer materials, standards, manuals, and other third-party services or content. Their availability, terms, privacy practices, and accuracy are outside ChimneyAI’s control. A link, search result, or uploaded copy does not establish that a source is official, current, or applicable.</p></section>

    <section><h2>9. Privacy notice</h2><h3>Information handled</h3><p>ChimneyAI may handle questions, conversation text, uploaded photos and documents, extracted PDF text, appliance or property-related notes, source metadata and hashes, saved case content, and—when optional cloud features are configured—an email address and account identifiers.</p><h3>How information is used</h3><p>Information is used to provide requested AI analysis, prepare uploads, maintain browser-local cases and source files, support optional account and cloud synchronization, troubleshoot the service, and protect its security. Do not submit Social Security numbers, payment-card data, passwords, medical records, or unrelated sensitive personal information.</p><h3>Where information goes</h3><p>Browser-first case data and source-vault files may remain in storage on the user’s device. When a user submits a chat request, relevant text and selected uploads are sent through ChimneyAI’s server to the configured AI provider for processing. When optional cloud features are enabled and the user signs in or syncs, relevant account, case, revision, and source data may be processed by Supabase. The application is hosted using Vercel infrastructure.</p><h3>Retention and control</h3><p>Users can clear browser data through application controls and browser settings. Cloud retention, deletion procedures, production logging, subprocessors, international transfers, and jurisdiction-specific privacy rights must be finalized and accurately documented by the operator before enabling commercial cloud use. No privacy or security method can guarantee absolute protection.</p></section>

    <section><h2>10. Children</h2><p>ChimneyAI is not directed to children under 13, and children should not submit personal information. Professional features are intended for adults and qualified trade users.</p></section>

    <section><h2>11. Changes</h2><p>These terms may be updated as the service changes. Material changes should be posted with a new effective date. Continued use after an update constitutes acceptance only to the extent permitted by applicable law.</p></section>

    <aside className="legalReview"><b>Operator action required before paid or broad public launch:</b> have licensed counsel add the legal operator name, physical/contact address, support/privacy email, governing law and venue, jurisdiction-specific consumer/privacy language, retention schedule, subprocessors, liability cap, dispute process, and any required consent mechanism. Confirm the text matches actual production practices and insurance coverage.</aside>
  </main>;
}
