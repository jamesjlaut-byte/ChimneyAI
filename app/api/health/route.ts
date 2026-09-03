export async function GET(){
  const openaiConfigured=Boolean(process.env.OPENAI_API_KEY);
  const supabaseUrlConfigured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supabaseKeyConfigured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const supabaseConfigured=supabaseUrlConfigured&&supabaseKeyConfigured;
  const supabaseIncomplete=supabaseUrlConfigured!==supabaseKeyConfigured;

  return Response.json({
    ok:true,
    status:openaiConfigured&&!supabaseIncomplete?"ready":"degraded",
    app:"ChimneyAI",
    modes:["homeowner","pro"],
    capabilities:{
      ai:openaiConfigured,
      browser_workspace:true,
      cloud_workspace:supabaseConfigured
    },
    configuration:{
      openai:openaiConfigured?"configured":"missing",
      openai_model:process.env.OPENAI_MODEL?"custom":"default",
      supabase:supabaseIncomplete?"incomplete":supabaseConfigured?"configured":"optional_not_configured"
    }
  },{headers:{"Cache-Control":"no-store"}});
}
