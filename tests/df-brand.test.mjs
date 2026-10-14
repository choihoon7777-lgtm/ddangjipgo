import test from"node:test";
import assert from"node:assert/strict";
import{readFile}from"node:fs/promises";
const read=p=>readFile(new URL(p,import.meta.url));
const txt=async p=>(await read(p)).toString("utf8");
test("Citymaek brand appears in title, public header, admin and app install manifest",async()=>{
 const [site,head,layout,manifest,home,admin]=await Promise.all(["../lib/df-site.js","../components/df-shell.js","../app/layout.js","../app/manifest.js","../app/focus/page.js","../app/focus-admin/page.js"].map(txt));
 assert.match(site,/SITE_NAME="도시맥"/);
 assert.match(head,/dfCityWordmark/);
 assert.match(head,/dosimaek-mark\.svg/);
 assert.match(head,/도시맥 홈/);
 assert.match(layout,/도시맥 \| 도시의 변화를 읽다/);
 assert.match(layout,/dosimaek-og\.png/);
 assert.match(manifest,/short_name:"도시맥"/);
 assert.match(manifest,/dosimaek-icon-192\.png/);
 assert.match(manifest,/dosimaek-icon-512\.png/);
 assert.match(home,/dfCityLeadMotto/);
 assert.match(admin,/도시맥/);
 assert.doesNotMatch(head,/development-focus-logo\.jpg/);
});
test("Citymaek vector and PNG assets are structurally correct",async()=>{
 for(const p of ["../public/dosimaek-mark.svg","../public/dosimaek-icon.svg","../public/dosimaek-skyline.svg"]){
  const svg=await txt(p);assert.match(svg,/<svg/);assert.match(svg,/<\/svg>/);
 }
 const files=[["../public/dosimaek-icon-192.png",192,192],["../public/dosimaek-icon-512.png",512,512],["../public/dosimaek-apple-icon.png",180,180],["../public/dosimaek-og.png",1200,630]];
 for(const[path,w,h]of files){const bytes=await read(path);assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");assert.equal(bytes.readUInt32BE(16),w);assert.equal(bytes.readUInt32BE(20),h)}
});
