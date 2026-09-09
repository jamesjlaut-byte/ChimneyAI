export const CHAT_REQUEST_TIMEOUT_MS=120_000;

export class ChatRequestTimeoutError extends Error{
  constructor(){super("ChimneyAI did not receive a complete answer within two minutes. Your question and attachments are still available on this page. Check your connection and try again.");this.name="ChatRequestTimeoutError"}
}

// Bound both upload and response-body reading. Racing the abort also releases
// the UI when a transport never settles its promise after cancellation.
export async function withChatDeadline<T>(controller:AbortController,operation:()=>Promise<T>,timeoutMs=CHAT_REQUEST_TIMEOUT_MS):Promise<T>{
  if(controller.signal.aborted)throw controller.signal.reason;
  let onAbort:()=>void=()=>{};
  const aborted=new Promise<never>((_resolve,reject)=>{
    onAbort=()=>reject(controller.signal.reason);
    controller.signal.addEventListener("abort",onAbort,{once:true});
  });
  const timer=setTimeout(()=>controller.abort(new ChatRequestTimeoutError()),timeoutMs);
  try{return await Promise.race([operation(),aborted])}
  finally{clearTimeout(timer);controller.signal.removeEventListener("abort",onAbort)}
}
