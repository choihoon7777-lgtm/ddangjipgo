import "./globals.css";
import{getSiteUrl,SITE_DESCRIPTION,SITE_NAME}from"../lib/df-site";
const site=getSiteUrl();
export const metadata={
 metadataBase:new URL(site),
 title:{default:"개발포커스 | DEVELOPMENT FOCUS",template:"%s | 개발포커스"},
 description:SITE_DESCRIPTION,
 applicationName:SITE_NAME,
 alternates:{canonical:"/focus"},
 openGraph:{type:"website",locale:"ko_KR",siteName:SITE_NAME,title:"개발포커스 | DEVELOPMENT FOCUS",description:SITE_DESCRIPTION,url:"/focus",images:[{url:"/development-focus-logo.jpg",alt:"개발포커스 DEVELOPMENT FOCUS"}]},
 twitter:{card:"summary_large_image",title:"개발포커스 | DEVELOPMENT FOCUS",description:SITE_DESCRIPTION,images:["/development-focus-logo.jpg"]},
 icons:{icon:"/development-focus-logo.jpg",apple:"/development-focus-logo.jpg"},
 manifest:"/manifest.webmanifest"
};
export default function RootLayout({children}){return <html lang="ko"><body>{children}</body></html>}
