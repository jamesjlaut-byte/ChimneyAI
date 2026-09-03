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
};

const MAX_IMAGE_BYTES=3*1024*1024;
const MAX_PDF_BYTES=15*1024*1024;
const MAX_TEXT_BYTES=5*1024*1024;
const SUPPORTED_IMAGE_TYPES=new Set(["image/jpeg","image/png","image/webp","image/gif"]);

async function sha256(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);

  return Array.from(new Uint8Array(digest))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

function readDataUrl(file: File) {
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
  const isImage=file.type.startsWith("image/");
  const isPdf=file.type==="application/pdf"||lowerName.endsWith(".pdf");
  const isText=file.type.startsWith("text/")||/\.(txt|md|csv)$/i.test(file.name);

  if(isImage&&!SUPPORTED_IMAGE_TYPES.has(file.type))throw new Error("Use a JPG, PNG, WEBP, or non-animated GIF image.");
  if(isImage&&file.size>MAX_IMAGE_BYTES)throw new Error("Images must be 3 MB or smaller for reliable production upload.");
  if(isPdf&&file.size>MAX_PDF_BYTES)throw new Error("PDFs must be 15 MB or smaller.");
  if(isText&&file.size>MAX_TEXT_BYTES)throw new Error("Text files must be 5 MB or smaller.");
  if(!isImage&&!isPdf&&!isText)throw new Error("Use a JPG, PNG, WEBP, GIF, PDF, TXT, MD, or CSV file.");

  const bytes = await file.arrayBuffer();
  const fileHash = await sha256(bytes);

  const base = {
    id: crypto.randomUUID(),
    name: file.name,
    mime_type: file.type || "application/octet-stream",
    byte_size: file.size,
    sha256: fileHash,
    prepared_at: new Date().toISOString(),
    original_blob: new Blob([bytes], {
      type: file.type || "application/octet-stream",
    }),
  };

  if (isImage) {
    return {
      ...base,
      kind: "image",
      data_url: await readDataUrl(file),
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
      const text_truncated = text.length > 60000 || pageCount > maxPages;

      if (text.length > 60000) {
        text =
          text.slice(0, 60000) +
          "\n[Document text truncated by ChimneyAI]";
      }

      if (pageCount > maxPages) {
        text += `\n[Only first ${maxPages} of ${pageCount} pages extracted]`;
      }

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

    const text_truncated = text.length > 60000;

    if (text_truncated) {
      text =
        text.slice(0, 60000) +
        "\n[Document text truncated]";
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
