import "./globals.css";
import Link from "next/link";
import type {Metadata} from "next";

export const metadata:Metadata={
  title:"ChimneyAI",
  description:"AI help for homeowners and chimney professionals"
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>
    <header className="topbar">
      <nav><Link href="/homeowner">Homeowners</Link><Link href="/pro">Pros</Link></nav>
    </header>
    {children}
  </body></html>;
}
