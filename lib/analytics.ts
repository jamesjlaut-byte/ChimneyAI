import {track,type BeforeSendEvent} from "@vercel/analytics";

const PUBLIC_PATHS=new Set(["/","/homeowner","/pro","/legal"]);
export function sanitizeAnalyticsEvent(event:BeforeSendEvent):BeforeSendEvent|null{
  try{
    const url=new URL(event.url);
    if(!PUBLIC_PATHS.has(url.pathname))return null;
    url.search="";url.hash="";url.username="";url.password="";
    return {...event,url:url.toString()};
  }catch{return null}
}

export function trackChatUsage(event:"ai_submitted"|"ai_response_received"|"ai_request_failed",mode:"homeowner"|"pro"){
  if(process.env.NEXT_PUBLIC_VERCEL_ENV!=="production"||process.env.NEXT_PUBLIC_ENABLE_AI_ANALYTICS!=="true")return;
  // Never pass prompts, responses, customer information, attachment names, or hashes.
  try{track(event,{mode})}catch{/* Analytics must not interrupt the chat. */}
}
