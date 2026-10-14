export const SITE_NAME="도시맥";
export const SITE_DESCRIPTION="도시의 변화를 읽다. 전국 도시개발·정책·고시·분양·부동산 정보를 연결하는 도시정보 플랫폼, 도시맥.";
export function getSiteUrl(){
 const preview=process.env.VERCEL_ENV==="preview"?process.env.VERCEL_URL?.trim():"";
 if(preview)return ("https://"+preview).replace(/\/$/,"");
 const explicit=process.env.NEXT_PUBLIC_SITE_URL?.trim();
 if(explicit)return explicit.replace(/\/$/,"");
 const vercel=process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL;
 if(vercel)return ("https://"+vercel).replace(/\/$/,"");
 return "http://localhost:3000";
}
