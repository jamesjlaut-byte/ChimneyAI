import "./globals.css";
import type {Metadata} from "next";
import AudienceNav from "@/components/AudienceNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata:Metadata={
  metadataBase:new URL("https://chimney-ai.vercel.app"),
  title:"ChimneyAI",
  description:"Chimney intelligence for homeowners and chimney professionals.",
  openGraph:{
    title:"ChimneyAI",
    description:"Chimney intelligence for homeowners and chimney professionals.",
    siteName:"ChimneyAI",
    type:"website",
    images:[{url:"/assets/chimneyai-official-logo.png",width:1254,height:1254,alt:"ChimneyAI"}]
  },
  twitter:{
    card:"summary_large_image",
    title:"ChimneyAI",
    description:"Chimney intelligence for homeowners and chimney professionals.",
    images:["/assets/chimneyai-official-logo.png"]
  }
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
