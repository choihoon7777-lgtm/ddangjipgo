import test from"node:test";import assert from"node:assert/strict";import{readFile}from"node:fs/promises";const read=p=>readFile(new URL(p,import.meta.url),"utf8");
test("Password only sign-in presents one field by default; keeps recovery collapsed",async()=>{const s=await read("../app/focus-admin/login/page.js");assert.match(s,/관리자 비밀번호/);assert.match(s,/api\/focus-admin-password/);assert.match(s,/dfSupabase\.auth\.setSession/);assert.match(s,/focus-admin\/publish/);assert.match(s,/<details className="dfAdminLoginRecovery"/);assert.match(s,/legacySubmit/);assert.doesNotMatch(s,/로그인 없이 실제 신규자료 업데이트/);});
test("Server verifies fixed admin using Supabase Auth and active role before issuing session",async()=>{const s=await read("../app/api/focus-admin-password/route.js");assert.match(s,/process\.env\.DF_ADMIN_LOGIN_EMAIL/);assert.match(s,/signInWithPassword/);assert.match(s,/df_admin_roles/);assert.match(s,/is_active/);assert.match(s,/origin!==url\.origin/);assert.match(s,/attempts\.get/);assert.match(s,/Cache-Control":"no-store/);assert.doesNotMatch(s,/console\.log/);});

test("Forgot password button only asks server to send to the pre-registered administrator",async()=>{
 const login=await read("../app/focus-admin/login/page.js");
 const api=await read("../app/api/focus-admin-recovery/route.js");
 assert.match(login,/비밀번호를 모르겠어요/);
 assert.match(login,/api\/focus-admin-recovery/);
 assert.match(login,/onClick=\{sendRecovery\}/);
 assert.match(api,/process\.env\.DF_ADMIN_LOGIN_EMAIL/);
 assert.match(api,/auth\.resetPasswordForEmail\(adminEmail,\{redirectTo\}\)/);
 assert.match(api,/https:\/\/ddangjipgo\.vercel\.app\/focus-admin\/reset-password/);
 assert.match(api,/origin!==new URL\(req\.url\)\.origin/);
 assert.match(api,/attempts\.get\(ip\)/);
 assert.doesNotMatch(api,/req\.json\(\).*\.email/);
});
test("Reset page is public for email link, but password changes require active admin Supabase session",async()=>{
 const s=await read("../app/focus-admin/reset-password/page.js");
 const layout=await read("../app/focus-admin/layout.js");
 assert.match(layout,/\/focus-admin\/reset-password/);
 assert.match(s,/PASSWORD_RECOVERY/);
 assert.match(s,/dfSupabase\.auth\.getUser/);
 assert.match(s,/df_admin_roles/);
 assert.match(s,/\.eq\("is_active",true\)/);
 assert.match(s,/dfSupabase\.auth\.updateUser\(\{password\}\)/);
 assert.match(s,/dfSupabase\.auth\.signOut\(\)/);
 assert.match(s,/focus-admin\/login\?reset=ok/);
});
