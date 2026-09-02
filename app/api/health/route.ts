export async function GET(){
  return Response.json({
    ok:true,
    app:"ChimneyAI",
    modes:["homeowner","pro"],
    openai_configured:Boolean(process.env.OPENAI_API_KEY)
  });
}