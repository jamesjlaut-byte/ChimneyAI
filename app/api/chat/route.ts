import OpenAI from "openai";
import {z} from "zod";
import {promptForMode} from "@/lib/prompts";
import {proSourceInstruction} from "@/lib/pro-source";

const Attachment=z.object({
  kind:z.enum(["image","document_text"]),
  name:z.string().max(240),
  mime_type:z.string().max(120),
  data_url:z.string().max(12_000_000).optional(),
  text:z.string().max(60_000).optional()
});
const Body=z.object({
  mode:z.enum(["homeowner","pro"]),
  messages:z.array(z.object({role:z.enum(["user","assistant"]),content:z.string().min(1).max(20000)})).min(1).max(40),
  attachments:z.array(Attachment.extend({
    id:z.string().optional(),
    byte_size:z.number().nonnegative().optional(),
    sha256:z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    prepared_at:z.string().optional(),
    page_count:z.number().int().positive().optional(),
    text_truncated:z.boolean().optional()
  })).max(6).optional(),
  context:z.object({
    appliance_type:z.string().max(200).optional(),manufacturer:z.string().max(200).optional(),
    model:z.string().max(200).optional(),inspection_level:z.string().max(100).optional(),
    notes:z.string().max(5000).optional()
  }).optional(),
  manual_verification:z.object({
    manual_title:z.string().max(500).optional(),
    manual_part_number:z.string().max(200).optional(),
    manual_revision:z.string().max(200).optional(),
    effective_date:z.string().max(100).optional(),
    official_url:z.string().max(2000).optional(),
    verified_model:z.string().max(300).optional(),
    relevant_pages:z.string().max(300).optional(),
    verification_note:z.string().max(3000).optional()
  }).optional(),
  pro_source:z.object({
    task:z.enum(["general","label_scan","manual_review","source_check","report_language"]).optional(),
    manufacturer:z.string().max(200).optional(),
    model:z.string().max(200).optional(),
    serial:z.string().max(200).optional(),
    listing_mark:z.string().max(300).optional(),
    fuel_type:z.string().max(100).optional(),
    source_type:z.enum(["manufacturer_manual","listing_label","adopted_code","standard","field_measurement","unknown"]).optional(),
    source_title:z.string().max(400).optional(),
    source_status:z.enum(["uploaded","verified_external","reference_only","not_available"]).optional(),
    technician_question:z.string().max(3000).optional()
  }).optional()
});

export async function POST(req:Request){
  const parsed=Body.safeParse(await req.json());
  if(!parsed.success)return Response.json({ok:false,error:"invalid_request"},{status:400});
  if(!process.env.OPENAI_API_KEY)return Response.json({ok:false,error:"openai_not_configured"},{status:503});

  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const context=parsed.data.context?`\n\nCURRENT OPTIONAL FIELD CONTEXT:\n${JSON.stringify(parsed.data.context,null,2)}`:"";
  const attachments=parsed.data.attachments||[];

  const input:any[]=[];
  parsed.data.messages.forEach((m,index)=>{
    const content:any[]=[{type:"input_text",text:m.content}];
    if(index===parsed.data.messages.length-1 && m.role==="user"){
      for(const a of attachments){
        if(a.kind==="image"&&a.data_url)content.push({type:"input_image",image_url:a.data_url,detail:"high"});
        if(a.kind==="document_text"&&a.text)content.push({type:"input_text",text:`\nATTACHED DOCUMENT: ${a.name}\n---\n${a.text}\n---`});
      }
    }
    input.push({role:m.role,content});
  });

  const attachmentInstruction=attachments.length?`
ATTACHMENT RULES:
- Treat images as visual evidence only; do not infer concealed conditions or dimensions without a valid scale/measurement method.
- Treat attached document text as user-provided source material. Quote sparingly and distinguish the document's statements from your interpretation.
- If text extraction may have omitted tables, diagrams, images, signatures, or formatting, say so when relevant.
- Never convert an inspection/report upload into an AI-issued safety clearance.
- If an attachment includes a SHA-256 value, that hash identifies the exact uploaded bytes for provenance. It does not prove the document is official, applicable, current, or authentic.
- If extracted PDF text is marked truncated, do not claim the entire manual/report was searched.
`:"";

  try{
    const response=await client.responses.create({
      model:process.env.OPENAI_MODEL||"gpt-5-mini",
      instructions:promptForMode(parsed.data.mode)+context+attachmentInstruction+
        (parsed.data.mode==="pro"?proSourceInstruction(parsed.data.pro_source):"")+
        (parsed.data.mode==="pro"&&parsed.data.manual_verification?`
MANUAL VERIFICATION RECORD:
${JSON.stringify(parsed.data.manual_verification,null,2)}
Treat this as technician-entered research metadata, not independent proof.`:""),
      input
    });
    return Response.json({ok:true,text:response.output_text||"I could not produce a response."});
  }catch(error:any){
    return Response.json({ok:false,error:"model_request_failed",detail:error?.message||"Unknown model error"},{status:500});
  }
}