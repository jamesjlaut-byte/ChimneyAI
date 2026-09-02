import "./globals.css";
import type {Metadata} from "next";
import AudienceNav from "@/components/AudienceNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata:Metadata={
  title:"ChimneyAI",
  description:"AI help for homeowners and chimney professionals"
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>
    <header className="topbar">
      <AudienceNav/>
    </header>
    {children}
    <SiteFooter/>
  </body></html>;
}
