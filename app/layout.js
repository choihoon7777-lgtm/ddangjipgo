import "./globals.css";
import "./dosimaek-mobile-refresh.css";
import{getSiteUrl,SITE_DESCRIPTION,SITE_NAME}from"../lib/df-site";
const site=getSiteUrl();
export const metadata={
 metadataBase:new URL(site),
 title:{default:"도시맥 | 도시의 변화를 읽다",template:"%s | 도시맥"},
 description:SITE_DESCRIPTION,
 applicationName:SITE_NAME,
 alternates:{canonical:"/focus"},
 openGraph:{type:"website",locale:"ko_KR",siteName:SITE_NAME,title:"도시맥 | 도시의 변화를 읽다",description:SITE_DESCRIPTION,url:"/focus",images:[{url:"/dosimaek-og.png",alt:"도시맥 DOSIMAEK"}]},
 twitter:{card:"summary_large_image",title:"도시맥 | 도시의 변화를 읽다",description:SITE_DESCRIPTION,images:["/dosimaek-og.png"]},
 icons:{icon:"/dosimaek-icon.svg",apple:"/dosimaek-apple-icon.png"},
 manifest:"/manifest.webmanifest"
};
export default function RootLayout({children}){return <html lang="ko"><body>{children}</body></html>}
