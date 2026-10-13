
import test from "node:test";
import assert from "node:assert/strict";
import {cleanHousingNotice,isoDate,housingStage,housingPriceLabel,officialLink} from "../lib/df-housing.mjs";
const notice={HOUSE_MANAGE_NO:2026000123,PBLANC_NO:2026000098,HOUSE_NM:"검증용 테스트 단지",SUBSCRPT_AREA_CODE_NM:"대전",RCRIT_PBLANC_DE:"2026-10-10",GNRL_RNK1_CRSPAREA_RCEPT_PD:"2026-10-20",GNRL_RNK2_CRSPAREA_RCEPT_PD:"2026-10-21",TOT_SUPLY_HSHLDCO:"1,234"};
const models=[{HOUSE_MANAGE_NO:2026000123,PBLANC_NO:2026000098,HOUSE_TY:"084.99",LTTOT_TOP_AMOUNT:"65,000",SUPLY_HSHLDCO:100},{HOUSE_MANAGE_NO:11,PBLANC_NO:22,LTTOT_TOP_AMOUNT:"99,999,999"}];
test("official notice mapping preserves dates and unit prices",()=>{const row=cleanHousingNotice(notice,"APT",models);assert.equal(row.offer_key,"APT:2026000123:2026000098");assert.equal(row.total_households,1234);assert.equal(row.top_price_manwon,65000);assert.equal(row.models_json.length,1);assert.equal(row.first_date,"2026-10-20");assert.equal(row.published_date,"2026-10-10")});
test("rejects invalid notice identifiers and invalid dates",()=>{assert.equal(cleanHousingNotice({...notice,HOUSE_MANAGE_NO:"BAD"},"APT"),null);assert.equal(isoDate("2026-02-30"),null);assert.equal(isoDate("20261013"),"2026-10-13")});
test("stage reflects genuine official application dates",()=>{const row=cleanHousingNotice(notice,"APT",models);assert.equal(housingStage(row,"2026-10-18"),"청약 예정");assert.equal(housingStage(row,"2026-10-20"),"청약 진행");assert.equal(housingStage(row,"2026-10-22"),"청약 마감")});
test("price does not invent missing information",()=>{assert.equal(housingPriceLabel(null),"공식 분양가 확인 전");assert.match(housingPriceLabel(65000),/6억/)});
test("only official URLs can appear as official source",()=>{assert.equal(officialLink("https://example.com/hello"),"https://www.applyhome.co.kr/");assert.equal(officialLink("javascript:alert(1)"),"https://www.applyhome.co.kr/")});
