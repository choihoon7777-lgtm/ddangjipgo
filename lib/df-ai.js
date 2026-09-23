const ENDPOINT="https://api.openai.com/v1/responses";
async function callAI(instructions,input){
 const key=process.env.OPENAI_API_KEY;if(!key)throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");
 const r=await fetch(ENDPOINT,{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.DF_AI_MODEL||"gpt-6-sol",instructions,input})});
 if(!r.ok)throw new Error("AI_REQUEST_FAILED_"+r.status);
 const j=await r.json();return j.output_text||j.output?.flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n")||"";
}
const RULES=`개발포커스는 대한민국 부동산·도시개발 전문 모바일 뉴스다.
절대 다른 언론 기사를 복사·전재·문장변형하지 않는다. 제공된 1차 공식자료만 근거로 쓴다.
확인된 사실과 공개된 입장을 구분한다. 취재하지 않은 관계자·전문가·주민·업계의 발언이나 반응을 만들지 않는다.
찬반이 있으면 제공된 공개자료에 실제 존재하는 양쪽 관점만 출처를 밝혀 반영한다.
확정/추진/검토/계획을 엄격히 구별한다. 비판은 공식 문서·공시·판결·감사·회의록 등 확실한 근거가 있을 때만 한다.
특혜·비리·사기·불법·은폐·유착은 근거 없이는 사용 금지.
시사점은 제시하되 결론을 강요하지 않는다. 사실은 정확하게, 쟁점은 분명하게, 판단은 독자에게 남긴다.
모바일 기사답게 제목은 핵심 변화와 숫자를 앞세우고, 리드는 2~3문장, 문단은 짧게 쓴다.
AI투 문구, 과장, 광고성 표현, 귀추가 주목된다 같은 상투어를 피한다.`;
export async function buildArticle(source){
 const fact=await callAI(RULES,`[FACT 추출]\n아래 공식자료에서 기사에 사용할 검증 가능한 사실만 추출하라. 기관, 공개일, 사업명, 위치, 면적, 세대수, 사업비, 일정, 사업단계, 변경 전후, 공식입장을 구분하라. 자료에 없는 내용은 '확인불가'로 표시하라.\n\n${source}`);
 const draft=await callAI(RULES,`[기자]\n다음 FACT만 사용해 개발포커스 자체 기사를 작성하라. 제목, 부제(필요한 경우), 3줄 핵심요약, 본문, 앞으로 볼 것, 공식출처 항목 순서다. 단순 보도자료 요약이 아니라 뉴스 가치와 변화의 의미를 설명하되 추측하지 마라.\n\nFACT:\n${fact}`);
 const desk=await callAI(RULES,`[데스크]\n아래 기사와 FACT를 비교해 전문 경제지 수준으로 편집하라. 제목·리드·문단호흡·숫자 가시성·중립성·모바일 가독성을 개선하라. FACT에 없는 문장은 삭제하거나 확인 필요로 표시하라.\n\nFACT:\n${fact}\n\n기사:\n${draft}`);
 const verify=await callAI(RULES,`[검증]\nFACT와 최종기사를 문장 단위로 대조하라. 숫자, 날짜, 기관명, 사업단계, 인용, 확정성, 비판표현을 검사하고 GREEN/YELLOW/RED 중 하나를 맨 첫 줄에 표시하라. 오류 또는 출처 없는 주장이 있으면 구체적으로 적어라.\n\nFACT:\n${fact}\n\n최종기사:\n${desk}`);
 return{fact,draft,article:desk,verification:verify};
}