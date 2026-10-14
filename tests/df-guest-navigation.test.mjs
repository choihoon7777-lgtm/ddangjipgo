import test from "node:test";
import assert from "node:assert/strict";
import{readFile}from"node:fs/promises";
const read=path=>readFile(new URL("../"+path,import.meta.url),"utf8");
const paths=[
"app/my/page.js",
"app/my/saved/page.js",
"app/my/recent/page.js",
"app/alerts/page.js",
"app/focus/article/article-client.js",
"app/my/properties/page.js",
"app/asset/new/page.js"
];
test("Public MY features do not force guest users into login",async()=>{
 const pages=await Promise.all(paths.map(read));
 for(let i=0;i<pages.length;i++){
  assert.doesNotMatch(pages[i],/location\.(?:href\s*=|replace\()(?:["']|\s*["'])\/login/,paths[i]+" still has forced login");
  assert.doesNotMatch(pages[i],/\?next=\/my\/saved|\?next=\/my\/recent|\?next=\/alerts/,paths[i]+" still sends guests to credentials");
 }
});
test("Guest user data is device-local and never written as an anonymous RLS record",async()=>{
 const src=await read("lib/df-guest-trial.js");
 assert.match(src,/localStorage/);
 assert.doesNotMatch(src,/dfSupabase|service_role|supabase\.co/);
 const pages=await Promise.all(["app/my/saved/page.js","app/my/recent/page.js","app/alerts/page.js","app/asset/new/page.js"].map(read));
 assert.ok(pages.every(x=>x.includes("guest")));
});
test("Admin guest pages preserve private operations behind admin role gate",async()=>{
 const src=await read("app/focus-admin/layout.js");
 assert.match(src,/df_admin_roles/);
 assert.match(src,/dfAdminGuestPreview|DFAdminGuestPreview/);
 assert.match(src,/if\(auth==="admin"\)return children/);
});
