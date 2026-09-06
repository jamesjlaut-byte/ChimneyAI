import type {ChatAttachment} from "@/lib/client-attachments";

const DB_NAME="chimneyai-pro-source-files";
const DB_VERSION=1;
const STORE="files";

export type StoredSourceFile={
  sha256:string;
  name:string;
  mime_type:string;
  byte_size:number;
  saved_at:string;
  blob:Blob;
  preview_blob?:Blob;
};

export type VerifiedSourceWrite={
  sha256:string;
  name:string;
  mime_type:string;
  byte_size:number;
  blob:Blob;
  preview_blob?:Blob;
  preview_verified?:boolean;
};
type EvidenceStore={get:(sha256:string)=>Promise<StoredSourceFile|null>;put:(file:StoredSourceFile)=>Promise<void>};

function openDb():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(STORE)){
        db.createObjectStore(STORE,{keyPath:"sha256"});
      }
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function putStoredSourceFile(file:StoredSourceFile){
  const db=await openDb();
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite");
    tx.objectStore(STORE).put(file);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
  db.close();
}

function usefulName(value:string){return Boolean(value.trim())&&!/^(?:source-file|unknown|blob)$/i.test(value.trim())}
function usefulMime(value:string){return Boolean(value.trim())&&value!=="application/octet-stream"}

const DEFAULT_EVIDENCE_STORE:EvidenceStore={get:getStoredSourceFile,put:putStoredSourceFile};

async function mergeVerifiedSourceFile(incoming:VerifiedSourceWrite,store:EvidenceStore){
  if(!/^[a-f0-9]{64}$/i.test(incoming.sha256))throw new Error("The target source SHA-256 is invalid.");
  const targetSha=incoming.sha256.toLowerCase();
  if(incoming.blob.size!==incoming.byte_size)throw new Error("Incoming source byte size does not match its evidence record.");
  const computed=await sha256Blob(incoming.blob);
  if(computed.toLowerCase()!==targetSha)throw new Error("Incoming source bytes do not match the target SHA-256.");

  const existing=await store.get(targetSha);
  if(existing){
    if(existing.byte_size!==incoming.byte_size||existing.blob.size!==incoming.byte_size)throw new Error("Existing source evidence conflicts with the verified byte size.");
    const existingHash=await sha256Blob(existing.blob);
    if(existingHash.toLowerCase()!==targetSha)throw new Error("Existing source evidence conflicts with the verified SHA-256 and was not replaced.");
    const preview=incoming.preview_blob&&incoming.preview_verified?incoming.preview_blob:existing.preview_blob;
    const name=usefulName(existing.name)||!usefulName(incoming.name)?existing.name:incoming.name;
    const mime_type=usefulMime(existing.mime_type)||!usefulMime(incoming.mime_type)?existing.mime_type:incoming.mime_type;
    if(preview===existing.preview_blob&&name===existing.name&&mime_type===existing.mime_type)return {status:"already_present" as const,file:existing};
    const merged={...existing,name,mime_type,preview_blob:preview};
    await store.put(merged);
    return {status:"updated" as const,file:merged};
  }

  const file:StoredSourceFile={
    sha256:targetSha,name:incoming.name,mime_type:incoming.mime_type,
    byte_size:incoming.byte_size,saved_at:new Date().toISOString(),blob:incoming.blob,
    preview_blob:incoming.preview_blob&&incoming.preview_verified?incoming.preview_blob:undefined
  };
  await store.put(file);
  return {status:"created" as const,file};
}

export async function writeVerifiedSourceFile(incoming:VerifiedSourceWrite,store:EvidenceStore=DEFAULT_EVIDENCE_STORE){
  if(store!==DEFAULT_EVIDENCE_STORE||typeof navigator==="undefined"||!navigator.locks)return mergeVerifiedSourceFile(incoming,store);
  return navigator.locks.request(`chimneyai-source:${incoming.sha256.toLowerCase()}`,()=>mergeVerifiedSourceFile(incoming,store));
}

export async function getStoredSourceFile(sha256:string):Promise<StoredSourceFile|null>{
  const db=await openDb();
  const out=await new Promise<StoredSourceFile|null>((resolve,reject)=>{
    const tx=db.transaction(STORE,"readonly");
    const req=tx.objectStore(STORE).get(sha256);
    req.onsuccess=()=>resolve((req.result as StoredSourceFile)||null);
    req.onerror=()=>reject(req.error);
  });
  db.close();
  return out;
}

export async function deleteStoredSourceFile(sha256:string){
  const db=await openDb();
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite");
    tx.objectStore(STORE).delete(sha256);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
  db.close();
}

export async function hasStoredSourceFile(sha256:string){
  return Boolean(await getStoredSourceFile(sha256));
}

export async function listStoredSourceFiles():Promise<StoredSourceFile[]>{
  const db=await openDb();
  const out=await new Promise<StoredSourceFile[]>((resolve,reject)=>{
    const tx=db.transaction(STORE,"readonly");
    const req=tx.objectStore(STORE).getAll();
    req.onsuccess=()=>resolve((req.result as StoredSourceFile[])||[]);
    req.onerror=()=>reject(req.error);
  });
  db.close();
  return out;
}

export async function sha256Blob(blob:Blob){
  const bytes=await blob.arrayBuffer();
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,"0")).join("");
}

export async function verifyStoredSourceFile(sha256:string){
  const stored=await getStoredSourceFile(sha256);
  if(!stored)return {exists:false,match:false,computed:null as string|null,stored:null};
  const computed=await sha256Blob(stored.blob);
  return {exists:true,match:computed===sha256,computed,stored};
}

export async function persistAttachmentBytes(a:ChatAttachment){
  let blob:Blob;
  if(a.original_blob){
    blob=a.original_blob;
  }else if(a.kind==="image"&&a.data_url&&!a.image_optimized){
    const response=await fetch(a.data_url);
    blob=await response.blob();
  }else{
    throw new Error("The original bytes for this attachment are not available in the current prepared-attachment object.");
  }
  if(blob.size!==(a.original_byte_size??a.byte_size)){
    throw new Error("Attachment byte size changed before persistence.");
  }
  return writeVerifiedSourceFile({
    sha256:a.original_sha256||a.sha256,
    name:a.name,
    mime_type:a.original_mime_type||a.mime_type,
    byte_size:a.original_byte_size??a.byte_size,
    blob
  });
}

export async function persistRawFile(file:File,expectedSha256:string){
  return writeVerifiedSourceFile({
    sha256:expectedSha256,
    name:file.name,
    mime_type:file.type||"application/octet-stream",
    byte_size:file.size,
    blob:file
  });
}
