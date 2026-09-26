const https=require('https');

const CACHE_TTL=60*60*1000;
const cache=globalThis.__jitgoLandTxCache||(globalThis.__jitgoLandTxCache=new Map());
const inflight=globalThis.__jitgoLandTxInflight||(globalThis.__jitgoLandTxInflight=new Map());
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

module.exports=async function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  const rawKey=String(process.env.DATA_GO_KR_SERVICE_KEY||'').trim();
  if(!rawKey)return res.status(500).json({ok:false,error:'PUBLIC_DATA_KEY_NOT_CONFIGURED'});
  let key=rawKey;try{if(/%[0-9A-Fa-f]{2}/.test(rawKey))key=decodeURIComponent(rawKey)}catch{}
  const pnu=String(req.query.pnu||'').replace(/\D/g,'');
  if(pnu.length<5)return res.status(400).json({ok:false,error:'PNU_REQUIRED'});
  const lawd=pnu.slice(0,5),months=Math.min(Math.max(Number(req.query.months)||12,1),36);
  const cacheKey=`${lawd}:${months}`;
  const cached=cache.get(cacheKey);
  if(cached&&Date.now()-cached.at<CACHE_TTL){res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');return res.status(200).json({...cached.data,cached:true})}
  if(inflight.has(cacheKey)){try{return res.status(200).json({...await inflight.get(cacheKey),shared:true})}catch{}}

  const work=(async()=>{
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit'}).formatToParts(new Date());
    const y=Number(parts.find(x=>x.type==='year')?.value),m=Number(parts.find(x=>x.type==='month')?.value);
    const ym=[];for(let i=0;i<months;i++){const d=new Date(Date.UTC(y,m-1-i,1));ym.push(String(d.getUTCFullYear())+String(d.getUTCMonth()+1).padStart(2,'0'))}
    const decode=s=>String(s||'').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').trim();
    const tag=(x,n)=>{const mm=x.match(new RegExp(`<${n}>([\\s\\S]*?)<\\/${n}>`,'i'));return mm?decode(mm[1]):''};
    const num=v=>{const n=Number(String(v||'').replace(/,/g,'').trim());return Number.isFinite(n)?n:null};
    function get(url){return new Promise((resolve,reject)=>{const q=https.get(url,{headers:{'User-Agent':'Mozilla/5.0 JITGO/1.0','Accept':'application/xml,text/xml,*/*','Connection':'close'}},r=>{let b='';r.setEncoding('utf8');r.on('data',d=>b+=d);r.on('end',()=>{if(r.statusCode>=200&&r.statusCode<300)return resolve(b);const e=new Error('HTTP_'+r.statusCode);e.status=r.statusCode;e.body=b.slice(0,500);reject(e)})});q.setTimeout(8000,()=>q.destroy(new Error('UPSTREAM_TIMEOUT')));q.on('error',reject)})}
    const rows=[];let successfulMonths=0,rateLimited=false;
    for(let i=0;i<ym.length;i++){
      const dealYmd=ym[i];
      if(i)await sleep(180);
      try{
        const u=new URL('https://apis.data.go.kr/1613000/RTMSDataSvcLandTrade/getRTMSDataSvcLandTrade');u.searchParams.set('serviceKey',key);u.searchParams.set('LAWD_CD',lawd);u.searchParams.set('DEAL_YMD',dealYmd);u.searchParams.set('numOfRows','1000');u.searchParams.set('pageNo','1');
        const xml=await get(u),authCode=tag(xml,'returnReasonCode'),authMsg=tag(xml,'errMsg')||tag(xml,'returnAuthMsg');
        if(authCode==='23'){rateLimited=true;break}
        if(authCode&&authCode!=='00'&&authCode!=='000')throw new Error('PUBLIC_DATA_AUTH_'+authCode+(authMsg?':'+authMsg:''));
        const resultCode=tag(xml,'resultCode');if(resultCode&&resultCode!=='000'&&resultCode!=='00')throw new Error('PUBLIC_DATA_'+resultCode+':'+tag(xml,'resultMsg'));
        successfulMonths++;
        const items=xml.match(/<item>[\s\S]*?<\/item>/gi)||[];
        for(const x of items){const area=num(tag(x,'dealArea')),amountMan=num(tag(x,'dealAmount')),yy=tag(x,'dealYear'),mm=tag(x,'dealMonth').padStart(2,'0'),dd=tag(x,'dealDay').padStart(2,'0'),cancelled=tag(x,'cdealType')==='O'||!!tag(x,'cdealDay'),amountWon=amountMan===null?null:amountMan*10000;rows.push({date:yy&&mm&&dd?`${yy}-${mm}-${dd}`:'',sgg:tag(x,'sggNm'),dong:tag(x,'umdNm'),jibun:tag(x,'jibun'),jimok:tag(x,'jimok'),landUse:tag(x,'landUse'),area,amount:amountWon,pricePerSqm:area&&amountWon?Math.round(amountWon/area):null,pricePerPyeong:area&&amountWon?Math.round(amountWon/(area/3.305785)):null,dealingType:tag(x,'dealingGbn'),cancelled,cancelDate:tag(x,'cdealDay')})}
      }catch(e){if(e?.status===429){rateLimited=true;break}console.warn('MOLIT month unavailable',{dealYmd,message:e?.message});}
    }
    if(!successfulMonths){const old=cache.get(cacheKey);if(old?.data)return {...old.data,stale:true,partial:true,notice:'실거래가 원천 API가 일시적으로 혼잡하여 최근 저장 결과를 표시합니다.'};throw Object.assign(new Error(rateLimited?'UPSTREAM_RATE_LIMITED':'ALL_MONTHS_FAILED'),{status:rateLimited?429:502})}
    rows.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const data={ok:true,source:'국토교통부 토지 매매 실거래가 자료',lawdCd:lawd,months,queriedMonths:ym.slice(0,successfulMonths),transactions:rows,partial:rateLimited,notice:rateLimited?'원천 API 요청 제한으로 확인 가능한 최근 기간까지만 표시합니다.':'공개 API는 개인정보 보호를 위해 지번 일부가 제한될 수 있습니다.'};
    cache.set(cacheKey,{at:Date.now(),data});return data;
  })();
  inflight.set(cacheKey,work);
  try{const data=await work;res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');return res.status(200).json(data)}catch(e){console.warn('MOLIT land transactions unavailable',{message:e?.message});return res.status(e?.status===429?503:502).json({ok:false,error:e?.status===429?'PUBLIC_DATA_RATE_LIMITED':'PUBLIC_DATA_LOOKUP_FAILED',retryable:true,detail:String(e?.message||e)})}finally{inflight.delete(cacheKey)}
};