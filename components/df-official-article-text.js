"use client";
import{useMemo}from"react";
import{parseEditorialBody}from"../lib/df-editorial-format";

// Shared renderer for official documents, investment articles and news stories.
// Never interpret the upstream text as HTML and never fabricate missing text.
export default function OfficialArticleText({content,partial=false,kind="article"}){
 const blocks=useMemo(()=>{
  const original=parseEditorialBody(content);
  if(kind!=="insight")return original;
  // Many imported blog paragraphs consist of a single short sentence.
  // Join adjacent short sentences into ordinary newspaper paragraphs without
  // changing a word or touching numbers, headings, lists, or source notes.
  const result=[];
  for(const b of original){
   const prev=result[result.length-1];
   if(b.kind==="paragraph"&&prev?.kind==="paragraph"&&b.text.length<=130&&prev.text.length+b.text.length<340&&!/[?!？!]$/.test(prev.text)){
    prev.text+=" "+b.text;
   }else result.push({...b});
  }
  return result;
 },[content,kind]);
 const sections=useMemo(()=>{
  const out=[];for(const b of blocks){
   if(b.kind==="bullet"&&out[out.length-1]?.kind==="list"){out[out.length-1].items.push(b.text)}
   else if(b.kind==="bullet")out.push({kind:"list",items:[b.text]});
   else out.push(b);
  }return out;
 },[blocks]);
 const outline=sections.map((x,i)=>({...x,index:i})).filter(x=>x.kind==="heading").slice(0,9);
 if(!sections.length)return <p className="dfOfficialEmpty">공개할 문서 본문이 아직 확보되지 않았습니다.</p>;
 return <div className={"dfOfficialArticleText dfEditorialProse dfEditorial-"+kind} aria-label={partial?"공식자료에서 확보한 본문":"기사 본문 전체"}>
  {outline.length>=4&&kind!=="official"&&<nav className="dfEditorialOutline" aria-label="기사 차례"><b>이 글의 주요 내용</b>{outline.map(x=><a key={x.index} href={"#df-article-section-"+x.index}>{x.text}<span>↘</span></a>)}</nav>}
  {sections.map((b,i)=>{
   if(b.kind==="heading")return <h3 className="dfEditorialHeading" id={"df-article-section-"+i} key={i}>{b.text}</h3>;
   if(b.kind==="list")return <ul className="dfEditorialList" key={i}>{b.items.map((x,j)=><li key={j}>{x}</li>)}</ul>;
   if(b.kind==="quote")return <blockquote className="dfEditorialQuote" key={i}>{b.text}</blockquote>;
   if(b.kind==="note")return <p className="dfEditorialFootnote" key={i}>{b.text}</p>;
   return <p className="dfEditorialParagraph" key={i}>{b.text}</p>;
  })}
 </div>;
}