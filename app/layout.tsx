import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import type {Metadata} from "next";

export const metadata:Metadata={
  title:"ChimneyAI",
  description:"AI help for homeowners and chimney professionals"
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>
    <header className="topbar">
      <Link className="brand" href="/" aria-label="ChimneyAI home">
        <Image className="brandLogo" src="/assets/chimneyai-official-logo.png" alt="ChimneyAI" width={82} height={82} priority/>
      </Link>
      <nav><Link href="/homeowner">Homeowners</Link><Link href="/pro">Pros</Link></nav>
    </header>
    {children}
  </body></html>;
}
