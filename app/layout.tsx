import "./globals.css";
import type {Metadata} from "next";
import AudienceNav from "@/components/AudienceNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata:Metadata={
  metadataBase:new URL("https://chimney-ai.vercel.app"),
  title:{default:"ChimneyAI | Chimney Intelligence",template:"%s | ChimneyAI"},
  description:"Chimney intelligence for homeowners and chimney professionals, with document-aware AI, source provenance, and professional field tools.",
  applicationName:"ChimneyAI",
  alternates:{canonical:"/"},
  manifest:"/manifest.webmanifest",
  icons:{
    icon:[{url:"/icon.png",type:"image/png"}],
    apple:[{url:"/assets/chimneyai-app-icon.png",type:"image/png"}]
  },
  robots:{index:true,follow:true},
  openGraph:{
    title:"ChimneyAI | Chimney Intelligence",
    description:"Document-aware chimney intelligence for homeowners and chimney professionals.",
    siteName:"ChimneyAI",
    type:"website",
    url:"/",
    images:[{url:"/assets/chimneyai-official-logo.png",width:1254,height:1254,alt:"ChimneyAI"}]
  },
  twitter:{
    card:"summary_large_image",
    title:"ChimneyAI | Chimney Intelligence",
    description:"Document-aware chimney intelligence for homeowners and chimney professionals.",
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
