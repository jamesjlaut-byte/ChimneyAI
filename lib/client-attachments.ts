export type ChatAttachment={
  id:string;
  kind:"image"|"document_text";
  name:string;
  mime_type:string;
  byte_size:number;
  sha256:string;
  prepared_at:string;
  data_url?:string;
  text?:string;
  page_count?:number;
  text_truncated?:boolean;
  original_blob?:Blob;
};

async function sha256(buffer:ArrayBuffer){
  const digest=await crypto.subtle.digest("SHA-256",buffer);
  return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");
}

function readDataUrl(file:File){
  return new Promise<string>((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(String(r.result));
    r.onerror=()=>reject(r.error);
    r.readAsDataURL(file);
  });
}

export async function prepareAttachment(file:File):Promise<ChatAttachment>{
  const bytes=await file.arrayBuffer();
  const fileHash=await sha256(bytes);
  const base={
    id:crypto.randomUUID(),
    name:file.name,
    mime_type:file.type||"application/octet-stream",
    byte_size:file.size,
    sha256:fileHash,
    prepared_at:new Date().toISOString(),
    original_blob:new Blob([bytes],{type:file.type||"application/octet-stream"})
  };

  if(file.type.startsWith("image/")){
    if(file.size>8*1024*1024)throw new Error("Images must be under 8 MB.");
    return {...base,kind:"image",data_url:await readDataUrl(file)};
  }

  if(file.type==="application/pdf"||file.name.toLowerCase().endsWith(".pdf")){
    if(file.size>15*1024*1024)throw new Error("PDFs must be under 15 MB.");
    const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf=await pdfjs.getDocument({data:new Uint8Array(bytes),disableWorker:true}).promise;
    const parts:string[]=[];
    const maxPages=Math.min(pdf.numPages,60);
    for(let n=1;n<=maxPages;n++){
      const page=await pdf.getPage(n);
      const tc=await page.getTextContent();
      const text=tc.items.map((x:any)=>("str" in x?x.str:"")).join(" ");
      parts.push(`[Page ${n}]\n${text}`);
    }
    let text=parts.join("\n\n");
    const text_truncated=text.length>60000||pdf.numPages>maxPages;
    if(text.length>60000)text=text.slice(0,60000)+"\n[Document text truncated by ChimneyAI]";
    if(pdf.numPages>maxPages)text+=`\n[Only first ${maxPages} of ${pdf.numPages} pages extracted]`;
    return {...base,kind:"document_text",mime_type:"application/pdf",text,page_count:pdf.numPages,text_truncated};
  }

  if(file.type.startsWith("text/")||/\.(txt|md|csv)$/i.test(file.name)){
    let text=new TextDecoder().decode(bytes);
    const text_truncated=text.length>60000;
    if(text_truncated)text=text.slice(0,60000)+"\n[Document text truncated]";
    return {...base,kind:"document_text",text,text_truncated};
  }

  throw new Error("Use an image, PDF, TXT, MD, or CSV file.");
}
