export const SITE_NAME="개발포커스";
export const SITE_DESCRIPTION="도시의 변화를 가장 먼저 읽다. 대한민국 부동산·도시개발 뉴스·정보 플랫폼 개발포커스.";
export function getSiteUrl(){
 const explicit=process.env.NEXT_PUBLIC_SITE_URL?.trim();
 if(explicit)return explicit.replace(/\/$/,"");
 const vercel=process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL;
 if(vercel)return ("https://"+vercel).replace(/\/$/,"");
 return "http://localhost:3000";
}
