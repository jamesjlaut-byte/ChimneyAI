type RateBucket={count:number;resetAt:number};

const WINDOW_MS=60_000;
const MAX_REQUESTS=20;
const MAX_BUCKETS=10_000;
const buckets=new Map<string,RateBucket>();

function clientKey(req:Request){
  const forwarded=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded||req.headers.get("x-real-ip")?.trim()||"unknown-client";
}

export function checkChatRateLimit(req:Request,now=Date.now()){
  if(buckets.size>=MAX_BUCKETS){
    for(const [key,bucket] of buckets)if(bucket.resetAt<=now)buckets.delete(key);
    if(buckets.size>=MAX_BUCKETS){
      const oldest=buckets.keys().next().value;
      if(oldest)buckets.delete(oldest);
    }
  }

  const key=clientKey(req);
  const current=buckets.get(key);
  if(!current||current.resetAt<=now){
    buckets.set(key,{count:1,resetAt:now+WINDOW_MS});
    return {allowed:true,retryAfter:0};
  }

  current.count+=1;
  if(current.count<=MAX_REQUESTS)return {allowed:true,retryAfter:0};
  return {allowed:false,retryAfter:Math.max(1,Math.ceil((current.resetAt-now)/1000))};
}
