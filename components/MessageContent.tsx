import {memo,type ReactNode} from "react";

const heading=/^(#{1,3})\s+(.+)$/;
const bullet=/^[-*]\s+(.+)$/;
const numbered=/^\d+[.)]\s+(.+)$/;

function inline(text:string){
  return text.split(/(\*\*[^*\n]+\*\*|`[^`\n]+`)/g).filter(Boolean).map((part,index)=>{
    if(part.startsWith("**")&&part.endsWith("**"))return <strong key={index}>{part.slice(2,-2)}</strong>;
    if(part.startsWith("`")&&part.endsWith("`"))return <code key={index}>{part.slice(1,-1)}</code>;
    return part;
  });
}

function isBlockStart(line:string){
  return heading.test(line)||bullet.test(line)||numbered.test(line);
}

function MessageContent({content}:{content:string}){
  const lines=content.replaceAll("\r\n","\n").split("\n"),blocks:ReactNode[]=[];
  let index=0;

  while(index<lines.length){
    const line=lines[index].trim();
    if(!line){index+=1;continue}

    const headingMatch=line.match(heading);
    if(headingMatch){
      blocks.push(<h3 key={`h-${index}`}>{inline(headingMatch[2])}</h3>);
      index+=1;
      continue;
    }

    if(bullet.test(line)){
      const items:ReactNode[]=[];
      while(index<lines.length){
        const match=lines[index].trim().match(bullet);
        if(!match)break;
        items.push(<li key={index}>{inline(match[1])}</li>);
        index+=1;
      }
      blocks.push(<ul key={`ul-${index}`}>{items}</ul>);
      continue;
    }

    if(numbered.test(line)){
      const items:ReactNode[]=[];
      while(index<lines.length){
        const match=lines[index].trim().match(numbered);
        if(!match)break;
        items.push(<li key={index}>{inline(match[1])}</li>);
        index+=1;
      }
      blocks.push(<ol key={`ol-${index}`}>{items}</ol>);
      continue;
    }

    const paragraph=[line];
    index+=1;
    while(index<lines.length&&lines[index].trim()&&!isBlockStart(lines[index].trim())){
      paragraph.push(lines[index].trim());
      index+=1;
    }
    blocks.push(<p key={`p-${index}`}>{inline(paragraph.join(" "))}</p>);
  }

  return <div className="structuredAnswer">{blocks}</div>;
}

export default memo(MessageContent);
