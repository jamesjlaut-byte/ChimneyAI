export type ProSourceContext={
  task?:"general"|"label_scan"|"manual_review"|"source_check"|"report_language";
  manufacturer?:string;
  model?:string;
  serial?:string;
  listing_mark?:string;
  fuel_type?:string;
  source_type?:"manufacturer_manual"|"listing_label"|"adopted_code"|"standard"|"field_measurement"|"unknown";
  source_title?:string;
  source_status?:"uploaded"|"verified_external"|"reference_only"|"not_available";
  technician_question?:string;
};

export function proSourceInstruction(source?:ProSourceContext){
  if(!source)return "";
  return `
PRO SOURCE DESK CONTEXT:
${JSON.stringify(source,null,2)}

SOURCE-DISCIPLINE RULES:
- "uploaded" means the user supplied source material in this conversation.
- "verified_external" may only be used when a source has actually been verified by the application; do not upgrade a source to this status yourself.
- "reference_only" means the title/link/identity may be known but controlling text has not been supplied.
- "not_available" means the controlling source is currently unavailable.
- If answering from an uploaded manual whose extracted text contains [Page N] markers, cite the relevant page marker in your answer.
- Do not invent page numbers. If the relevant requirement is not visible in extracted text, say that it was not located in the supplied material.
- Do not treat a listing label as a complete substitute for the installation manual.
- Do not treat a generic code/standard concept as a substitute for a product-specific listing/manufacturer requirement.
- If source hierarchy conflicts, identify the conflict rather than choosing a convenient answer.
`;
}
