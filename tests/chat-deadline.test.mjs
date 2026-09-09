import assert from "node:assert/strict";
import {test} from "node:test";
import {CHAT_REQUEST_TIMEOUT_MS,ChatRequestTimeoutError,withChatDeadline} from "../lib/chat-deadline.ts";

test("stalled transport is aborted without retry even if it ignores cancellation",{timeout:2000},async()=>{
  const controller=new AbortController();let calls=0;
  await assert.rejects(withChatDeadline(controller,()=>{calls++;return new Promise(()=>{})},10),ChatRequestTimeoutError);
  assert.equal(controller.signal.aborted,true);
  assert.equal(calls,1);
  assert.equal(CHAT_REQUEST_TIMEOUT_MS,120000);
});

test("deadline covers a response body that stalls after headers arrive",{timeout:2000},async()=>{
  const controller=new AbortController();let headersReceived=false;
  await assert.rejects(withChatDeadline(controller,async()=>{
    const response=await Promise.resolve({json:()=>new Promise(()=>{})});
    headersReceived=true;
    return response.json();
  },10),ChatRequestTimeoutError);
  assert.equal(headersReceived,true);
});

test("completed and failed requests clear their timers",async()=>{
  const success=new AbortController(),failure=new AbortController();
  assert.equal(await withChatDeadline(success,async()=>"answer",10),"answer");
  const offline=new TypeError("Network unavailable");
  await assert.rejects(withChatDeadline(failure,async()=>{throw offline},10),error=>error===offline);
  await new Promise(resolve=>setTimeout(resolve,25));
  assert.equal(success.signal.aborted,false);
  assert.equal(failure.signal.aborted,false);
});

test("navigation cancellation is distinct from timeout and late answers cannot win",async()=>{
  const controller=new AbortController();let finish;
  const request=withChatDeadline(controller,()=>new Promise(resolve=>{finish=resolve}),1000);
  controller.abort();
  await assert.rejects(request,error=>error.name==="AbortError"&&!(error instanceof ChatRequestTimeoutError));
  finish("late answer");
  await assert.rejects(withChatDeadline(controller,()=>assert.fail("Cancelled request must not start")),error=>error.name==="AbortError");
});
