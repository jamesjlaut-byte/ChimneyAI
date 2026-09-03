import type {ChatAttachment} from "@/lib/client-attachments";
import type {SourceProvenanceRecord} from "@/lib/source-provenance";

export type SourceRoleContext={
  task?:"general"|"label_scan"|"manual_review"|"source_check"|"report_language";
  source_type?:"manufacturer_manual"|"listing_label"|"adopted_code"|"standard"|"field_measurement"|"unknown";
};

export function defaultSourceRole(
  attachment:Pick<ChatAttachment,"kind">,
  context?:SourceRoleContext
):SourceProvenanceRecord["role"]{
  if(context?.source_type==="manufacturer_manual")return "manual";
  if(context?.source_type==="listing_label")return "listing_label";
  if(context?.task==="manual_review")return "manual";
  if(context?.task==="label_scan")return "listing_label";
  if(attachment.kind==="image")return "field_photo";
  return "other";
}
