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

export async function putStoredSourceFile(file:StoredSourceFile){
  const db=await openDb();
  await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite");
    tx.objectStore(STORE).put(file);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
  });
  db.close();
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
  if(blob.size!==a.byte_size){
    throw new Error("Attachment byte size changed before persistence.");
  }
  await putStoredSourceFile({
    sha256:a.sha256,
    name:a.name,
    mime_type:a.original_mime_type||a.mime_type,
    byte_size:a.byte_size,
    saved_at:new Date().toISOString(),
    blob
  });
}

export async function persistRawFile(file:File,expectedSha256:string){
  const bytes=await file.arrayBuffer();
  const computed=await sha256Blob(new Blob([bytes]));
  if(computed!==expectedSha256)throw new Error("Selected file does not match the recorded SHA-256.");
  await putStoredSourceFile({
    sha256:expectedSha256,
    name:file.name,
    mime_type:file.type||"application/octet-stream",
    byte_size:file.size,
    saved_at:new Date().toISOString(),
    blob:new Blob([bytes],{type:file.type||"application/octet-stream"})
  });
}
