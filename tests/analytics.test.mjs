import assert from "node:assert/strict";
import {test} from "node:test";
import {sanitizeAnalyticsEvent} from "../lib/analytics.ts";

test("analytics strips tokens and query data from pageview and custom-event URLs",()=>{
  for(const type of ["pageview","event"]){
    const original={type,url:"https://chimneyai.verifysweep.com/pro?code=secret&customer=Private#access_token=secret"};
    assert.deepEqual(sanitizeAnalyticsEvent(original),{type,url:"https://chimneyai.verifysweep.com/pro"});
    assert.ok(original.url.includes("secret"));
  }
});
test("analytics drops unknown paths and invalid URLs",()=>{
  for(const url of ["bad URL","https://chimneyai.verifysweep.com/customer/private-name","https://chimneyai.verifysweep.com/api/chat"])
    assert.equal(sanitizeAnalyticsEvent({type:"pageview",url}),null);
});
