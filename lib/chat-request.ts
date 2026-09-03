import {z} from "zod";

export const MAX_CHAT_REQUEST_BYTES=4_000_000;

const AttachmentMetadata={
  name:z.string().max(240),
  id:z.string().max(100).optional(),
  byte_size:z.number().int().nonnegative().max(15*1024*1024).optional(),
  sha256:z.string().regex(/^[a-f0-9]{64}$/i).optional(),
  prepared_at:z.string().datetime().optional(),
  page_count:z.number().int().positive().max(100_000).optional(),
  text_truncated:z.boolean().optional()
};

const Attachment=z.discriminatedUnion("kind",[
  z.object({
    ...AttachmentMetadata,
    kind:z.literal("image"),
    mime_type:z.enum(["image/jpeg","image/png","image/webp","image/gif"]),
    data_url:z.string().max(MAX_CHAT_REQUEST_BYTES).regex(/^data:image\/(?:jpeg|png|webp|gif);base64,[a-z0-9+/]+=*$/i)
  }).strict(),
  z.object({
    ...AttachmentMetadata,
    kind:z.literal("document_text"),
    mime_type:z.string().max(120).regex(/^(?:application\/(?:pdf|octet-stream|csv)|text\/[a-z0-9.+-]+)$/i),
    text:z.string().min(1).max(60_000)
  }).strict()
]);

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

const ChatRequestBody=z.object({
  mode:z.enum(["homeowner","pro"]),
  messages:z.array(z.object({role:z.enum(["user","assistant"]),content:z.string().min(1).max(20000)})).min(1).max(40),
  attachments:z.array(Attachment).max(6).optional(),
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

export function parseChatRequest(value:unknown){
  return ChatRequestBody.safeParse(value);
}
