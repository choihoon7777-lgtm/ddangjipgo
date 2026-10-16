import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=p=>readFile(new URL(p,import.meta.url),"utf8");

test("Official HWPX worker is single-use-token gated and does not bypass editorial publishing",async()=>{
 const s=await read("../supabase/functions/df-official-attachments/index.ts");
 for(const term of ["df_claim_ingest_token","SINGLE_USE_AUTH_REQUIRED","MISSING_SCHEDULER_AUTH","Deno.serve","HWPX_TITLE_MISMATCH","ATTACHMENT_NOT_IN_OFFICIAL_VIEW","HWPX_UNCOMPRESSED_TOO_LARGE","INVALID_OR_OVERSIZED_HWPX"])assert.ok(s.includes(term),term);
 assert.match(s,/unzipSync/);
 assert.match(s,/hwpxText/);
 assert.match(s,/drhGosiFileDownload.do/);
 assert.match(s,/detail_status:"partial"/);
 assert.match(s,/manual_review_required:true/);
 assert.match(s,/source_id/);
 assert.match(s,/extraction_status:"complete"/);
 assert.doesNotMatch(s,/risk_level\s*:\s*["']green["']/);
 assert.doesNotMatch(s,/status\s*:\s*["']published["']/);
 assert.doesNotMatch(s,/rejectUnauthorized\s*:\s*false/);
});
test("Official HWPX cron schedules before the existing hourly editorial factory",async()=>{
 const s=await read("../supabase/migrations/20261016_df_official_attachment_hourly.sql");
 assert.match(s,/df-official-attachments-hourly/);
 assert.match(s,/'47 \* \* \* \*'/);
 assert.match(s,/df_ingest_run_tokens/);
 assert.match(s,/gen_random_uuid/);
 assert.match(s,/x-df-collector-token/);
 assert.doesNotMatch(s,/service.role.key|password\s*=/i);
});
