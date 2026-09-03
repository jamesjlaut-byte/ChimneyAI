import OpenAI from "openai";
import type {ResponseInputContent,ResponseInputItem} from "openai/resources/responses/responses";
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
const SourceManifestRecord=z.object({
  file_name:z.string().max(240),
  mime_type:z.string().max(120),
  byte_size:z.number().int().nonnegative(),
  sha256:z.string().regex(/^[a-f0-9]{64}$/i),
  page_count:z.number().int().positive().optional(),
  text_truncated:z.boolean().optional(),
  role:z.enum(["manual","listing_label","inspection_report","field_photo","other"]),
  note:z.string().max(2000),
  storage_status:z.enum(["session_only","persisted_browser","missing"]).optional(),
  integrity_status:z.enum(["unchecked","verified","mismatch","missing"]).optional()
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
  source_manifest:z.array(SourceManifestRecord).max(30).optional(),
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
  let requestBody:unknown;
  try{
    requestBody=await req.json();
  }catch{
    return Response.json({ok:false,error:"invalid_json"},{status:400});
  }
  const parsed=Body.safeParse(requestBody);
  if(!parsed.success)return Response.json({ok:false,error:"invalid_request"},{status:400});
  if(!process.env.OPENAI_API_KEY)return Response.json({ok:false,error:"openai_not_configured"},{status:503});

  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const context=parsed.data.context?`\n\nCURRENT OPTIONAL FIELD CONTEXT:\n${JSON.stringify(parsed.data.context,null,2)}`:"";
  const attachments=parsed.data.attachments||[];
  const sourceManifest=parsed.data.source_manifest||[];
  const sourceModel=parsed.data.pro_source?.model?.trim();
  const verifiedModel=parsed.data.manual_verification?.verified_model?.trim();
  const normalizeModel=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]/g,"");
  const modelMismatch=Boolean(sourceModel&&verifiedModel&&normalizeModel(sourceModel)!==normalizeModel(verifiedModel));

  const input:ResponseInputItem[]=[];
  parsed.data.messages.forEach((m,index)=>{
    const content:ResponseInputContent[]=[{type:"input_text",text:m.content}];
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
  const sourceManifestInstruction=sourceManifest.length?`
CASE SOURCE MANIFEST (METADATA ONLY):
${JSON.stringify(sourceManifest,null,2)}
SOURCE MANIFEST RULES:
- Use each record's role and technician note to understand why the file belongs to the case.
- A SHA-256 value identifies exact bytes; it does not establish authenticity, authority, applicability, or current revision.
- "verified" integrity means stored bytes matched the recorded hash. It does not mean the source requirement or installation was professionally verified.
- A missing browser copy means the record exists but the exact bytes are unavailable to inspect now.
- Do not claim to have reviewed file content unless that content is included in the current attachments.
- Surface mismatched hashes, missing bytes, truncated text, and unresolved source applicability when relevant.
`:"";
  const modelApplicabilityInstruction=modelMismatch?`
CRITICAL MANUAL APPLICABILITY CONFLICT:
- Source Desk appliance model: ${JSON.stringify(sourceModel)}
- Manual Verification Record model: ${JSON.stringify(verifiedModel)}
- Do not apply product-specific requirements from this manual until the supplied source establishes that it covers the appliance model. Lead with this conflict when it affects the answer and identify the exact identity evidence needed to resolve it.
`:"";

  try{
    const response=await client.responses.create({
      model:process.env.OPENAI_MODEL||"gpt-5-mini",
      instructions:promptForMode(parsed.data.mode)+context+attachmentInstruction+sourceManifestInstruction+
        (parsed.data.mode==="pro"?proSourceInstruction(parsed.data.pro_source):"")+
        (parsed.data.mode==="pro"?modelApplicabilityInstruction:"")+
        (parsed.data.mode==="pro"&&parsed.data.manual_verification?`
MANUAL VERIFICATION RECORD:
${JSON.stringify(parsed.data.manual_verification,null,2)}
Treat this as technician-entered research metadata, not independent proof.`:""),
      input
    });
    return Response.json({ok:true,text:response.output_text||"I could not produce a response."});
  }catch(error:unknown){
    console.error("ChimneyAI model request failed",error instanceof Error?error.message:"Unknown model error");
    if(error instanceof OpenAI.APIError&&error.status===429){
      const message=error.message.toLowerCase();
      const quotaExceeded=message.includes("credit")||message.includes("quota")||error.code==="insufficient_quota";
      return Response.json({ok:false,error:quotaExceeded?"openai_quota_exceeded":"model_rate_limited"},{status:503});
    }
    return Response.json({ok:false,error:"model_request_failed"},{status:500});
  }
}
