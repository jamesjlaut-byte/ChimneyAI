import assert from "node:assert/strict";
import {test} from "node:test";
import {buildModelInput} from "../lib/model-input.ts";

test("follow-up history uses assistant strings rather than invalid input_text blocks",()=>{
  const messages=[{role:"user",content:"First question"},{role:"assistant",content:"Prior analysis"},{role:"user",content:"Follow-up question"}];
  const input=buildModelInput(messages);
  assert.deepEqual(input,[
    {role:"user",content:[{type:"input_text",text:"First question"}]},
    {role:"assistant",content:"Prior analysis"},
    {role:"user",content:[{type:"input_text",text:"Follow-up question"}]}
  ]);
  assert.equal(messages[1].content,"Prior analysis");
});

test("six photos remain on the latest user turn with assistant history preserved",()=>{
  const photos=Array.from({length:6},(_,i)=>({kind:"image",name:`photo-${i}.jpg`,data_url:`data:image/jpeg;base64,${Buffer.from(`photo ${i}`).toString("base64")}`}));
  const input=buildModelInput([{role:"user",content:"Initial"},{role:"assistant",content:"Visible observations"},{role:"user",content:"Review these six photos"}],photos);
  assert.equal(input[0].content.length,1);
  assert.equal(input[1].content,"Visible observations");
  assert.equal(input[2].content.length,7);
  assert.deepEqual(input[2].content.slice(1),photos.map(photo=>({type:"input_image",image_url:photo.data_url,detail:"high"})));
});

test("document evidence is retained and never inserted into an assistant message",()=>{
  const documents=[{kind:"document_text",name:"manual.pdf",text:"User supplied source excerpt"}];
  const input=buildModelInput([{role:"user",content:"Read this"}],documents);
  assert.deepEqual(input[0].content[1],{type:"input_text",text:"\nATTACHED DOCUMENT: manual.pdf\n---\nUser supplied source excerpt\n---"});
  assert.deepEqual(buildModelInput([{role:"assistant",content:"Prior answer"}],documents),[{role:"assistant",content:"Prior answer"}]);
});
