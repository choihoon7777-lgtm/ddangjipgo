import "./globals.css";
export const metadata={
 title:{default:"개발포커스 | DEVELOPMENT FOCUS",template:"%s | 개발포커스"},
 description:"도시의 변화를 가장 먼저 읽다. 대한민국 부동산·도시개발 뉴스·정보 플랫폼 개발포커스."
};
export default function RootLayout({children}){return <html lang="ko"><body>{children}</body></html>}
