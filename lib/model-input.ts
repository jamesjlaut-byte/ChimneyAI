import type {ResponseInputContent,ResponseInputItem} from "openai/resources/responses/responses";

type ChatMessage={role:"user"|"assistant";content:string};
type Attachment={kind:"image"|"document_text";name:string;data_url?:string;text?:string};

export function buildModelInput(messages:ChatMessage[],attachments:Attachment[]=[]):ResponseInputItem[]{
  return messages.map((message,index):ResponseInputItem=>{
    // Assistant history uses the Responses API's easy-message string form.
    // input_text blocks are user input, not valid prior assistant output.
    if(message.role==="assistant")return {role:"assistant",content:message.content};
    const content:ResponseInputContent[]=[{type:"input_text",text:message.content}];
    if(index===messages.length-1){
      for(const attachment of attachments){
        if(attachment.kind==="image"&&attachment.data_url)content.push({type:"input_image",image_url:attachment.data_url,detail:"high"});
        if(attachment.kind==="document_text"&&attachment.text)content.push({type:"input_text",text:`\nATTACHED DOCUMENT: ${attachment.name}\n---\n${attachment.text}\n---`});
      }
    }
    return {role:"user",content};
  });
}
