export async function sha256Text(text:string){
  const bytes=new TextEncoder().encode(text);
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

export async function hashManualIdentity(input:{
  manufacturer:string;model:string;manual_title:string;manual_part_number:string;
  manual_revision:string;effective_date:string;official_url:string;relevant_pages:string;
}){
  const canonical=JSON.stringify({
    manufacturer:input.manufacturer.trim(),model:input.model.trim(),manual_title:input.manual_title.trim(),
    manual_part_number:input.manual_part_number.trim(),manual_revision:input.manual_revision.trim(),
    effective_date:input.effective_date.trim(),official_url:input.official_url.trim(),relevant_pages:input.relevant_pages.trim()
  });
  return sha256Text(canonical);
}
