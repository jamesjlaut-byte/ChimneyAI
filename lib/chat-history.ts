export type ChatHistoryMessage={
  role:"user"|"assistant";
  content:string;
  kind?:"analysis"|"system_error";
};

export function modelHistory(messages:ChatHistoryMessage[],limit=40){
  return messages
    .filter(message=>message.kind!=="system_error")
    .slice(-limit)
    .map(({role,content})=>({role,content}));
}
