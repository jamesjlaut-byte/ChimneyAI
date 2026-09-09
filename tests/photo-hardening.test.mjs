import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {test} from "node:test";

import {filterUniqueOriginalFiles} from "../lib/client-attachments.ts";
import {normalizePhotoType} from "../lib/photo-type.ts";
import {writeVerifiedSourceFile} from "../lib/source-file-store.ts";
import {isAlreadyPresentStorageError} from "../lib/storage-upload-result.ts";

function file(bytes,name,type="image/jpeg"){
  const blob=new Blob([bytes],{type});
  return Object.assign(blob,{name,lastModified:0});
}
function hash(bytes){return createHash("sha256").update(bytes).digest("hex")}

test("active and same-selection duplicates use original fingerprints",async()=>{
  const original=Buffer.from("same original phone photo");
  const originalHash=hash(original);
  const active=[{kind:"image",sha256:hash("optimized copy one"),original_sha256:originalHash}];
  const alreadyActive=await filterUniqueOriginalFiles([file(original,"again.jpg")],active.map(item=>item.original_sha256||item.sha256));
  assert.equal(alreadyActive.unique.length,0);
  assert.equal(alreadyActive.duplicates.length,1);

  const withinSelection=await filterUniqueOriginalFiles([file(original,"one.jpg"),file(original,"two.jpg")],[]);
  assert.equal(withinSelection.unique.length,1);
  assert.equal(withinSelection.duplicates.length,1);

  const regenerated=[{...active[0],sha256:hash("newly generated optimized copy")}];
  assert.equal((await filterUniqueOriginalFiles([file(original,"original.heic","image/heic")],regenerated.map(item=>item.original_sha256||item.sha256))).duplicates.length,1);
  const different=await filterUniqueOriginalFiles([file(Buffer.from("different original"),"different.jpg")],active.map(item=>item.original_sha256||item.sha256));
  assert.equal(different.unique.length,1);
});

test("verified evidence writes reject conflicts and merge previews without weakening records",async()=>{
  const original=Buffer.from("verified original evidence"),sha256=hash(original);
  let stored=null,puts=0;
  const store={get:async()=>stored,put:async value=>{stored=value;puts++}};
  const oldPreview=new Blob(["old preview"],{type:"image/jpeg"});
  const newPreview=new Blob(["new preview"],{type:"image/jpeg"});
  await writeVerifiedSourceFile({sha256,name:"field.heic",mime_type:"image/heic",byte_size:original.length,blob:new Blob([original]),preview_blob:oldPreview,preview_verified:true},store);

  // Chat persistence and cloud restoration provide exact originals but no preview.
  assert.equal((await writeVerifiedSourceFile({sha256,name:"field.heic",mime_type:"image/heic",byte_size:original.length,blob:new Blob([original])},store)).status,"already_present");
  assert.equal(stored.preview_blob,oldPreview);
  assert.equal((await writeVerifiedSourceFile({sha256,name:"source-file",mime_type:"application/octet-stream",byte_size:original.length,blob:new Blob([original])},store)).status,"already_present");
  assert.equal(stored.preview_blob,oldPreview);
  assert.equal(stored.name,"field.heic");
  assert.equal(stored.mime_type,"image/heic");

  assert.equal((await writeVerifiedSourceFile({sha256,name:"field.heic",mime_type:"image/heic",byte_size:original.length,blob:new Blob([original]),preview_blob:newPreview,preview_verified:true},store)).status,"updated");
  assert.equal(stored.preview_blob,newPreview);
  assert.equal(puts,2,"identical original bytes are not rewritten without a verified improvement");

  const altered=Buffer.from(original);altered[0]^=1;
  assert.equal(altered.length,original.length);
  await assert.rejects(writeVerifiedSourceFile({sha256,name:"field.heic",mime_type:"image/heic",byte_size:altered.length,blob:new Blob([altered])},store),/do not match the target SHA-256/);
});

test("mobile photo MIME aliases and extension fallbacks normalize narrowly",()=>{
  for(const type of ["image/heic-sequence","image/x-heic"])assert.equal(normalizePhotoType({type,name:"photo.bin"}),"image/heic");
  for(const type of ["image/heif-sequence","image/x-heif"])assert.equal(normalizePhotoType({type,name:"photo.bin"}),"image/heif");
  assert.equal(normalizePhotoType({type:"",name:"PHOTO.HEIC"}),"image/heic");
  assert.equal(normalizePhotoType({type:"application/octet-stream",name:"photo.heic"}),"image/heic");
  assert.equal(normalizePhotoType({type:"image/tiff",name:"photo.tiff"}),null);
  assert.equal(normalizePhotoType({type:"application/pdf",name:"photo.jpg"}),null);
  assert.equal(normalizePhotoType({type:"image/gif",name:"photo.gif"},{allowGif:false}),null);
});

test("concurrent inspection and chat writes preserve previews without Web Locks",async()=>{
  const original=Buffer.from("concurrently saved original"),sha256=hash(original);
  const preview=new Blob(["inspection preview"],{type:"image/jpeg"});
  let stored=null,puts=0;
  const store={
    get:async()=>{const snapshot=stored;await new Promise(resolve=>setTimeout(resolve,10));return snapshot},
    put:async value=>{stored=value;puts++}
  };
  const incoming={sha256,name:"field.heic",mime_type:"image/heic",byte_size:original.length,blob:new Blob([original])};
  const results=await Promise.all([
    writeVerifiedSourceFile({...incoming,preview_blob:preview,preview_verified:true},store),
    writeVerifiedSourceFile({...incoming,sha256:sha256.toUpperCase()},store),
    writeVerifiedSourceFile({...incoming,name:"source-file",mime_type:"application/octet-stream"},store)
  ]);
  assert.deepEqual(results.map(result=>result.status),["created","already_present","already_present"]);
  assert.equal(stored.preview_blob,preview);
  assert.equal(stored.name,"field.heic");
  assert.equal(puts,1);
});

test("a failed evidence write does not block the next valid save",async()=>{
  const original=Buffer.from("original evidence"),sha256=hash(original);
  let stored=null;
  const store={get:async()=>stored,put:async value=>{stored=value}};
  const incoming={sha256,name:"photo.jpg",mime_type:"image/jpeg",byte_size:original.length,blob:new Blob([original])};
  const altered=Buffer.from(original);altered[0]^=1;
  const rejected=writeVerifiedSourceFile({...incoming,blob:new Blob([altered])},store);
  const valid=writeVerifiedSourceFile(incoming,store);
  await assert.rejects(rejected,/do not match the target SHA-256/);
  assert.equal((await valid).status,"created");
  assert.equal((await writeVerifiedSourceFile(incoming,store)).status,"already_present");
});

test("Supabase already-present responses are not new uploads",()=>{
  assert.equal(isAlreadyPresentStorageError({statusCode:409,message:"The resource already exists"}),true);
  assert.equal(isAlreadyPresentStorageError({statusCode:"409",error:"Duplicate"}),true);
  assert.equal(isAlreadyPresentStorageError({statusCode:500,message:"Storage unavailable"}),false);
});
