"use client";
import {useMemo} from "react";

// A reader, not a summarizer. Display every paragraph actually stored in the
// verified government document, preserving paragraph breaks and legal clauses.
// Never interpret the source as HTML or invent missing content.
export default function OfficialArticleText({content,partial=false}){
 const blocks=useMemo(()=>{
  const cleaned=String(content||"")
   .replace(/\r\n?/g,"\n")
   .replace(/\u200b|\u200c|\u200d|\ufeff/g,"")
   .replace(/[\t\u00a0]+/g," ")
   .trim();
  return cleaned.split(/\n{2,}/).flatMap(section=>section.split(/\n(?=\s*(?:[①-⑳]|제\s*\d+\s*[장절]|■|【|\[제\d+|\d{1,2}[.．]\s+))/g)).map(x=>x.trim()).filter(Boolean);
 },[content]);
 if(!blocks.length)return <p className="dfOfficialEmpty">공식 문서 본문이 아직 확보되지 않았습니다.</p>;
 return <div className="dfOfficialArticleText" aria-label={partial?"공식자료에서 확보한 내용":"공식 문서 내용"}>
  {blocks.map((block,i)=>{
   const heading=block.length<145&&/^(?:[①-⑳]|제\s*\d+\s*[장절]|■|【)/.test(block)&&!block.includes("\n");
   if(heading)return <h3 key={i}>{block}</h3>;
   const lines=block.split("\n").map(x=>x.trim()).filter(Boolean);
   return <p key={i}>{lines.map((line,j)=><span key={j} className={/^(?:[□○●▲▶▣※]|\d+[.)]|[-–])\s*/.test(line)?"dfOfficialBullet":undefined}>{line}{j<lines.length-1?"\n":null}</span>)}</p>;
  })}
 </div>;
}