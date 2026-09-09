import type {SourceProvenanceRecord} from "./source-provenance.ts";

export function cloudSourceRecord(caseId:string,src:SourceProvenanceRecord,storagePath:string|null){
  return {
    case_id:caseId,
    sha256:src.sha256,
    file_name:src.file_name,
    mime_type:src.mime_type,
    byte_size:src.byte_size,
    page_count:src.page_count||null,
    text_truncated:Boolean(src.text_truncated),
    source_role:src.role,
    technician_note:src.note||null,
    // A missing local original says nothing about an existing cloud object.
    // Omit these columns so an upsert cannot erase its link or verification.
    // New metadata-only rows retain the database's null/unchecked defaults.
    ...(storagePath?{storage_path:storagePath,integrity_status:src.integrity_status||"unchecked"}:{})
  };
}
