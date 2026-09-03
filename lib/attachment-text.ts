export const MAX_EXTRACTED_TEXT_CHARS=60_000;

export function finalizeExtractedText(text:string,notices:string[]=[]){
  const suffix=notices.length?`\n${notices.join("\n")}`:"";
  const available=Math.max(0,MAX_EXTRACTED_TEXT_CHARS-suffix.length);
  return `${text.slice(0,available)}${suffix}`.slice(0,MAX_EXTRACTED_TEXT_CHARS);
}
