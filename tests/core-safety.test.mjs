import assert from "node:assert/strict";
import {test} from "node:test";

import {defaultSourceRole} from "../lib/default-source-role.ts";
import {MANUFACTURERS,matchManufacturer} from "../lib/manual-registry.ts";
import {compareCaseVersions,normalizeManual,normalizeProSource,upsertLocalCase} from "../lib/pro-cases.ts";
import {checkChatRateLimit} from "../lib/request-rate-limit.ts";
import {provenanceFromAttachment} from "../lib/source-provenance.ts";

test("manufacturer registry resolves canonical names and field aliases",()=>{
  assert.equal(matchManufacturer("Heat-N-Glo")?.id,"heat-glo");
  assert.equal(matchManufacturer("M&G DuraVent")?.id,"duravent");
  assert.equal(matchManufacturer("Metalbestos")?.id,"selkirk");
  assert.equal(matchManufacturer("unknown maker"),null);
  assert.ok(MANUFACTURERS.every(entry=>entry.official_manual_lookup.startsWith("https://")));
});

test("source roles remain conservative unless task context is explicit",()=>{
  assert.equal(defaultSourceRole({kind:"pdf"}),"other");
  assert.equal(defaultSourceRole({kind:"image"}),"field_photo");
  assert.equal(defaultSourceRole({kind:"image"},{task:"label_scan"}),"listing_label");
  assert.equal(defaultSourceRole({kind:"pdf"},{source_type:"manufacturer_manual"}),"manual");
});

test("pro source and manual inputs reject unsupported shapes",()=>{
  const source=normalizeProSource({task:"invented",source_type:"rumor",source_status:"trusted",manufacturer:42});
  assert.equal(source.task,"general");
  assert.equal(source.source_type,"unknown");
  assert.equal(source.source_status,"not_available");
  assert.equal(source.manufacturer,"");

  const manual=normalizeManual({manual_title:"Listed manual",official_url:123,relevant_pages:[4]});
  assert.equal(manual.manual_title,"Listed manual");
  assert.equal(manual.official_url,"");
  assert.equal(manual.relevant_pages,"");
});

test("case version comparison exposes conflicts instead of guessing",()=>{
  const local={id:"case-1",created_at:"2026-09-02T12:00:00.000Z",updated_at:"2026-09-02T12:00:10.000Z"};
  assert.equal(compareCaseVersions(local),"local_newer");
  assert.equal(compareCaseVersions(local,"2026-09-02T12:00:10.500Z"),"synced");
  assert.equal(compareCaseVersions(local,"2026-09-02T12:00:20.000Z"),"cloud_newer");
  assert.equal(compareCaseVersions(local,"not-a-date"),"conflict");
});

test("case upsert replaces a matching case and caps browser storage index",()=>{
  const makeCase=(id,updated_at)=>({id,updated_at,created_at:updated_at});
  const cases=Array.from({length:100},(_,i)=>makeCase(`case-${i}`,new Date(1_700_000_000_000+i).toISOString()));
  const inserted=upsertLocalCase(cases,makeCase("new-case","2026-09-02T12:00:00.000Z"));
  assert.equal(inserted.length,100);
  assert.equal(inserted[0].id,"new-case");

  const replacement=makeCase("case-50","2026-09-03T12:00:00.000Z");
  const updated=upsertLocalCase(cases,replacement);
  assert.equal(updated.length,100);
  assert.equal(updated[0],replacement);
});

test("attachment provenance preserves the source fingerprint",()=>{
  const attachment={
    id:"attachment-1",name:"manual.pdf",kind:"pdf",mime_type:"application/pdf",
    byte_size:4096,sha256:"a".repeat(64),prepared_at:"2026-09-02T12:00:00.000Z",
    page_count:12,text_truncated:false,text:"manual text"
  };
  const record=provenanceFromAttachment(attachment,"manual","Uploaded by technician");
  assert.equal(record.sha256,attachment.sha256);
  assert.equal(record.page_count,12);
  assert.equal(record.role,"manual");
  assert.equal(record.storage_status,"session_only");
  assert.equal(record.integrity_status,"unchecked");
});

test("chat rate limiter allows 20 requests, rejects 21, and resets",()=>{
  const req=new Request("https://chimney-ai.test/api/chat",{headers:{"x-forwarded-for":"203.0.113.77, 10.0.0.1"}});
  const start=1_800_000_000_000;
  for(let i=0;i<20;i++)assert.equal(checkChatRateLimit(req,start).allowed,true);
  const rejected=checkChatRateLimit(req,start);
  assert.equal(rejected.allowed,false);
  assert.equal(rejected.retryAfter,60);
  assert.deepEqual(checkChatRateLimit(req,start+60_000),{allowed:true,retryAfter:0});
});
