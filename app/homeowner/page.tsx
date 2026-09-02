import ChimneyChat from "@/components/ChimneyChat";

export default function HomeownerPage(){
  return <main className="appPage">
    <div className="modeHeader">
      <div><div className="eyebrow">FOR HOMEOWNERS</div><h1>ChimneyAI</h1>
        <p>Understand what your chimney professional is telling you—without turning AI into the inspector.</p></div>
      <div className="trustPill">Educational guidance</div>
    </div>

    <div className="homeownerFeatureRow">
      <span>Inspection explanations</span><span>Repair explanations</span><span>Credential guidance</span><span>Questions to ask</span>
    </div>
    <ChimneyChat mode="homeowner"/>
  </main>;
}