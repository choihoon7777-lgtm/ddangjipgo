import test from "node:test";
import assert from "node:assert/strict";
import {fetchHousingPage,fetchHousingNotices,buildHousingRows,normalizeServiceKey,koreaToday,HousingProviderError} from "../lib/df-housing-upstream.mjs";
const ok=(data,matchCount=data.length)=>({ok:true,status:200,json:async()=>({data,matchCount})});
const notice=(i)=>({HOUSE_MANAGE_NO:100+i,PBLANC_NO:200+i,HOUSE_NM:"검증용 테스트 단지 "+i,RCRIT_PBLANC_DE:"2026-10-13",SUBSCRPT_AREA_CODE_NM:"대전"});
test("allowlisted official endpoint uses GTE filter and does not expose key",async()=>{
 let request;
 const fetcher=async url=>{request=new URL(url);return ok([notice(1)])};
 const output=await fetchHousingPage("getAPTLttotPblancDetail","sample-test-value",{filters:[["RCRIT_PBLANC_DE","GTE","2026-07-01"]],fetcher});
 assert.equal(output.data.length,1);
 assert.equal(request.searchParams.get("cond[RCRIT_PBLANC_DE::GTE]"),"2026-07-01");
 assert.equal(request.searchParams.get("serviceKey"),"sample-test-value");
 assert.ok(!JSON.stringify(output).includes("sample-test-value"));
});
test("disallows unexpected endpoints and filters",async()=>{
 await assert.rejects(()=>fetchHousingPage("invalidOperation","placeholder"),HousingProviderError);
 await assert.rejects(()=>fetchHousingPage("getAPTLttotPblancDetail","placeholder",{filters:[["private","EQ","bad"]]}),HousingProviderError);
});
test("collects all pages, removes duplicate notices and marks truncated results",async()=>{
 const fetcher=async url=>{const p=Number(new URL(url).searchParams.get("page"));return ok(p===1?Array.from({length:100},(_,i)=>notice(i)):[notice(0),notice(100)],102)};
 const full=await fetchHousingNotices("APT","placeholder",{fromDate:"2026-07-01",fetcher});
 assert.equal(full.rows.length,101);assert.equal(full.partial,false);
 const partial=await fetchHousingNotices("APT","placeholder",{fromDate:"2026-07-01",fetcher,pageLimit:1});
 assert.equal(partial.partial,true);
});
test("failed model fetch does not create fictional prices",async()=>{
 const fetcher=async url=>new URL(url).pathname.includes("Mdl")?{ok:false,status:403,json:async()=>({})}:ok([notice(1)]);
 const rows=await buildHousingRows("APT","placeholder",{fromDate:"2026-07-01",fetcher});
 assert.equal(rows.rows.length,1);
 assert.equal(Object.hasOwn(rows.rows[0],"top_price_manwon"),false);
 assert.equal(rows.warnings.length,1);
});
test("identifies API authorization failures",async()=>{
 assert.equal(normalizeServiceKey("sample%2Bvalue"),"sample+value");
 await assert.rejects(()=>fetchHousingPage("getAPTLttotPblancDetail","placeholder",{fetcher:async()=>({ok:false,status:403})}),{code:"API_AUTH_FAILED"});
});
test("Korean local date",()=>assert.equal(koreaToday(0,new Date("2026-10-13T16:00:00Z")),"2026-10-14"));
