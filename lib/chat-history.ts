export type ChatHistoryMessage={
  role:"user"|"assistant";
  content:string;
  kind?:"analysis"|"system_error"|"failed_user";
};

export function recordableHistory(messages:ChatHistoryMessage[]){
  return messages
    .filter(message=>message.kind!=="system_error"&&message.kind!=="failed_user")
    .map(({role,content})=>({role,content}));
}

export function modelHistory(messages:ChatHistoryMessage[],limit=40){
  return recordableHistory(messages).slice(-limit);
}

export function markLastAttemptFailed(messages:ChatHistoryMessage[]){
  const next=[...messages];
  for(let index=next.length-1;index>=0;index-=1){
    if(next[index].role!=="user")continue;
    next[index]={...next[index],kind:"failed_user"};
    break;
  }
  return next;
}
