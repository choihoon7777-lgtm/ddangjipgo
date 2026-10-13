// Conservative evidence labels for regional development news.
// A title mentioning a place name does NOT establish distance, parcel impact or an official zoning change.
export function placeMention(article,address){
 const title=String(article?.title||"");
 const addr=String(address||"").trim().replace(/\s+/g," ");
 const parts=addr.split(" ");
 const dong=parts.find(part=>/[가-힣0-9]+(?:읍|면|동)$/.test(part))||"";
 const lot=parts.find(part=>/^(?:산\s*)?\d+(?:-\d+)?$/.test(part))||"";
 if(dong&&title.includes(dong)){
   if(lot&&title.includes(lot))return {rank:2,label:"주소지 명칭·지번 언급",note:"기사 제목에 동명·지번이 포함됩니다. 동일 필지 및 영향 여부는 원문 검증이 필요합니다."};
   return {rank:1,label:"주소지 행정동 언급",note:"기사 제목에 행정동이 포함됩니다. 해당 필지와의 거리·영향은 확인되지 않았습니다."};
 }
 return {rank:0,label:"지역 참고 기사",note:"동일 지역 기사입니다. 관심 필지와의 직접적인 관련성은 확인되지 않았습니다."};
}
export function orderRegionalNews(articles,address){
 return (Array.isArray(articles)?articles:[]).map(a=>({...a,_placeMention:placeMention(a,address)}))
  .sort((a,b)=>b._placeMention.rank-a._placeMention.rank);
}
