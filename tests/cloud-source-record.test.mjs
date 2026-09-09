import assert from "node:assert/strict";
import {test} from "node:test";
import {createClient} from "@supabase/supabase-js";
import {cloudSourceRecord} from "../lib/cloud-source-record.ts";

const source={attachment_id:"photo",file_name:"field.heic",mime_type:"image/heic",byte_size:8000000,
  sha256:"a".repeat(64),prepared_at:"2026-09-09T12:00:00Z",role:"field_photo",note:"Updated caption",
  storage_status:"missing",integrity_status:"missing"};

test("metadata-only sync does not erase an archived original's link or integrity",()=>{
  const existing={storage_path:"cases/case/original/field.heic",integrity_status:"verified",technician_note:"Old caption"};
  const payload=cloudSourceRecord("case",source,null);
  assert.equal(Object.hasOwn(payload,"storage_path"),false);
  assert.equal(Object.hasOwn(payload,"integrity_status"),false);
  const merged={...existing,...payload};
  assert.equal(merged.storage_path,existing.storage_path);
  assert.equal(merged.integrity_status,"verified");
  assert.equal(merged.technician_note,"Updated caption");
});

test("new metadata-only sources make no cloud archival or verification claim",()=>{
  const payload=cloudSourceRecord("case",{...source,integrity_status:"verified"},null);
  assert.equal(Object.hasOwn(payload,"storage_path"),false);
  assert.equal(Object.hasOwn(payload,"integrity_status"),false);
});

test("confirmed uploaded or reused sources retain their storage path",()=>{
  const path="cases/case/original/field.heic";
  const payload=cloudSourceRecord("case",{...source,integrity_status:"verified"},path);
  assert.equal(payload.storage_path,path);
  assert.equal(payload.integrity_status,"verified");
});

test("Supabase serializes metadata-only single-row upserts without destructive null columns",async()=>{
  let request;
  const client=createClient("https://example.supabase.co","test-key",{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch:async(url,init)=>{
      request={url:String(url),body:JSON.parse(init.body),headers:new Headers(init.headers)};
      return new Response(null,{status:201});
    }}
  });
  const {error}=await client.from("pro_case_sources").upsert(cloudSourceRecord("case",source,null),{onConflict:"case_id,sha256"});
  assert.equal(error,null);
  assert.equal(Array.isArray(request.body),false,"keep single-row upserts: mixed batch columns could insert nulls");
  assert.equal(Object.hasOwn(request.body,"storage_path"),false);
  assert.equal(Object.hasOwn(request.body,"integrity_status"),false);
  assert.match(request.headers.get("Prefer"),/resolution=merge-duplicates/);
  assert.equal(new URL(request.url).searchParams.get("on_conflict"),"case_id,sha256");
});
