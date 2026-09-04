import {finalizeExtractedText,MAX_EXTRACTED_TEXT_CHARS} from "./attachment-text";
import {MAX_PHONE_IMAGE_BYTES,preparePhoneImage} from "./phone-image";

export type ChatAttachment = {
  id: string;
  kind: "image" | "document_text";
  name: string;
  mime_type: string;
  byte_size: number;
  sha256: string;
  prepared_at: string;
  data_url?: string;
  text?: string;
  page_count?: number;
  text_truncated?: boolean;
  original_blob?: Blob;
  original_mime_type?: string;
  image_optimized?: boolean;
};

const MAX_PDF_BYTES=15*1024*1024;
const MAX_TEXT_BYTES=5*1024*1024;
const SUPPORTED_IMAGE_TYPES=new Set(["image/jpeg","image/png","image/webp","image/gif","image/heic","image/heif"]);

async function sha256(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);

  return Array.from(new Uint8Array(digest))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

function readDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);

    reader.readAsDataURL(file);
  });
}

export async function prepareAttachment(
  file: File
): Promise<ChatAttachment> {
  const lowerName=file.name.toLowerCase();
  const inferredImageType:Record<string,string>={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif",heic:"image/heic",heif:"image/heif"};
  const mimeType=file.type.toLowerCase()||inferredImageType[lowerName.split(".").at(-1)||""]||"application/octet-stream";
  const isImage=mimeType.startsWith("image/");
  const isPdf=file.type==="application/pdf"||lowerName.endsWith(".pdf");
  const isText=file.type.startsWith("text/")||/\.(txt|md|csv)$/i.test(file.name);

  if(isImage&&!SUPPORTED_IMAGE_TYPES.has(mimeType))throw new Error("Use a JPG, PNG, WEBP, GIF, HEIC, or HEIF photo.");
  if(isImage&&file.size>MAX_PHONE_IMAGE_BYTES)throw new Error("Photos up to 50 MB are supported. This file exceeds 50 MB; export a smaller copy.");
  if(isPdf&&file.size>MAX_PDF_BYTES)throw new Error("PDFs must be 15 MB or smaller.");
  if(isText&&file.size>MAX_TEXT_BYTES)throw new Error("Text files must be 5 MB or smaller.");
  if(!isImage&&!isPdf&&!isText)throw new Error("Use a JPG, PNG, WEBP, GIF, PDF, TXT, MD, or CSV file.");

  const bytes = await file.arrayBuffer();
  const fileHash = await sha256(bytes);

  const base = {
    id: crypto.randomUUID(),
    name: file.name,
    mime_type: mimeType,
    byte_size: file.size,
    sha256: fileHash,
    prepared_at: new Date().toISOString(),
    original_blob: new Blob([bytes], {
      type: mimeType,
    }),
  };

  if (isImage) {
    const analysisImage=await preparePhoneImage(file);
    return {
      ...base,
      kind: "image",
      mime_type:"image/jpeg",
      original_mime_type:mimeType,
      image_optimized:true,
      data_url: await readDataUrl(analysisImage),
    };
  }

  if (
    isPdf
  ) {
    // The package's bundler entry wires the matching module worker through
    // `new URL(..., import.meta.url)`, so Next.js emits a deployable worker
    // asset without relying on the removed `disableWorker` option.
    const pdfjs = await import("pdfjs-dist/webpack.mjs");

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(bytes),
    });

    try {
      const pdf = await loadingTask.promise;
      const parts: string[] = [];
      const maxPages = Math.min(pdf.numPages, 60);

      for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");

        parts.push(`[Page ${pageNumber}]\n${pageText}`);
        page.cleanup();
      }

      let text = parts.join("\n\n");
      const pageCount = pdf.numPages;
      const characterLimitReached = text.length > MAX_EXTRACTED_TEXT_CHARS;
      const text_truncated = characterLimitReached || pageCount > maxPages;
      const notices:string[]=[];
      if(characterLimitReached)notices.push("[Document text truncated by ChimneyAI]");
      if(pageCount>maxPages)notices.push(`[Only first ${maxPages} of ${pageCount} pages extracted]`);
      text=finalizeExtractedText(text,notices);

      return {
        ...base,
        kind: "document_text",
        mime_type: "application/pdf",
        text,
        page_count: pageCount,
        text_truncated,
      };
    } finally {
      await loadingTask.destroy();
    }
  }

  if (
    isText
  ) {
    let text = new TextDecoder().decode(bytes);

    const text_truncated = text.length > MAX_EXTRACTED_TEXT_CHARS;

    if (text_truncated) {
      text=finalizeExtractedText(text,["[Document text truncated]"]);
    }

    return {
      ...base,
      kind: "document_text",
      text,
      text_truncated,
    };
  }

  throw new Error("Unsupported attachment.");
}
