import type {ChatAttachment} from "@/lib/client-attachments";

export type SourceProvenanceRecord={
  attachment_id:string;
  file_name:string;
  mime_type:string;
  byte_size:number;
  sha256:string;
  prepared_at:string;
  page_count?:number;
  text_truncated?:boolean;
  role:"manual"|"listing_label"|"inspection_report"|"field_photo"|"other";
  note:string;
  storage_status?:"session_only"|"persisted_browser"|"missing";
  persisted_at?:string;
  integrity_status?:"unchecked"|"verified"|"mismatch"|"missing";
};

export function provenanceFromAttachment(
  a:ChatAttachment,
  role:SourceProvenanceRecord["role"]="other",
  note=""
):SourceProvenanceRecord{
  return {
    attachment_id:a.id,
    file_name:a.name,
    mime_type:a.mime_type,
    byte_size:a.byte_size,
    sha256:a.sha256,
    prepared_at:a.prepared_at,
    page_count:a.page_count,
    text_truncated:a.text_truncated,
    role,
    note,
    storage_status:"session_only",
    integrity_status:"unchecked"
  };
}
