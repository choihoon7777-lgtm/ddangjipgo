const ENDPOINT="https://api.openai.com/v1/responses";
async function callAI(instructions,input,model){
 const key=process.env.OPENAI_API_KEY;if(!key)throw new Error("OPENAI_API_KEY_NOT_CONFIGURED");
 const r=await fetch(ENDPOINT,{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model:model||process.env.DF_AI_MODEL||"gpt-5.4-mini",instructions,input})});
 if(!r.ok)throw new Error("AI_REQUEST_FAILED_"+r.status);
 const j=await r.json();return j.output_text||j.output?.flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n")||"";
}
const RULES=`개발포커스는 대한민국 부동산·도시개발 전문 모바일 뉴스다.
제공된 1차 공식자료만 근거로 쓴다. 다른 언론 기사를 복사·전재·문장변형하지 않는다.
취재하지 않은 관계자·전문가·주민·업계 발언이나 반응을 만들지 않는다. 공개자료에 없는 반대입장도 만들지 않는다.
확정·추진·검토·계획·공모·선정·착공·공급을 엄격히 구별한다. 특혜·비리·사기·불법·은폐·유착은 확실한 공식 근거 없이는 금지한다.
사실은 정확하게, 쟁점은 분명하게, 판단은 독자에게 남긴다.
기사 본문에는 마크다운 기호(**, #, [], 백틱)를 절대 출력하지 않는다.
보도자료 문장을 옮겨 적지 말고 핵심 뉴스와 독자가 알아야 할 변화를 앞에 둔다. 같은 사실을 제목·리드·본문에서 불필요하게 반복하지 않는다.
제목은 34자 안팎을 목표로 하고 과장하지 않는다. 문단은 2~3문장으로 짧게 쓴다. '귀추가 주목된다','~할 전망이다','~로 보인다' 같은 근거 없는 상투어를 피한다.
자료에 없는 숫자·지역·세대수·사업비·일정은 절대 보완 추정하지 않는다.`;
export async function buildArticle(source){
 const fact=await callAI(RULES,`[FACT 추출]\n공식자료에서 검증 가능한 사실만 추출하라. 기관, 공개일, 사업명, 위치, 면적, 세대수, 사업비, 일정, 사업단계, 변경 전후, 공식입장을 구분한다. 없는 내용은 확인불가로 표시한다. 간결한 일반 텍스트로 출력한다.\n\n${source}`,"gpt-5.4-nano");
 const draft=await callAI(RULES,`[전문기자]\nFACT만 사용해 개발포커스 기사를 작성한다. 형식은 제목 한 줄, 핵심요약 3개, 본문, '앞으로 볼 것', '공식 출처' 순서다. 핵심요약과 본문은 중복을 최소화한다. 뉴스의 핵심 변화와 현재 단계가 첫 화면에서 바로 이해되게 한다. 추측 금지. 마크다운 금지.\n\nFACT:\n${fact}`,"gpt-5.4-mini");
 const desk=await callAI(RULES,`[편집 데스크]\nFACT와 기사를 대조해 전문 경제·산업 매체 수준의 최종 기사로 편집한다. 홍보문구와 AI식 반복을 제거하고 제목·리드·문단호흡·숫자 가시성·중립성·모바일 가독성을 개선한다. 자료가 부족하면 억지로 길게 쓰지 않는다. FACT에 없는 문장은 삭제한다. 마크다운 기호를 전부 제거한다. 최종 출력은 제목/핵심요약/본문/앞으로 볼 것/공식 출처만 포함한다.\n\nFACT:\n${fact}\n\n초안:\n${draft}`,"gpt-5.4-mini");
 const verify=await callAI(RULES,`[최종 검증]\nFACT와 최종기사를 문장 단위로 대조한다. 숫자·날짜·기관명·사업단계·인용·확정성·비판표현을 검사한다. 첫 줄은 GREEN/YELLOW/RED 중 하나만 쓴다. 이어서 오류/미확인 문장/수정 필요사항을 간결히 적는다. 사실 오류가 있으면 GREEN 금지.\n\nFACT:\n${fact}\n\n최종기사:\n${desk}`,"gpt-5.4-nano");
 return{fact,draft,article:desk,verification:verify,models:{fact:"gpt-5.4-nano",reporter:"gpt-5.4-mini",desk:"gpt-5.4-mini",verify:"gpt-5.4-nano"}};
}