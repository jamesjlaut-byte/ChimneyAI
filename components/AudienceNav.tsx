"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";

const destinations=[
  {href:"/homeowner",label:"Homeowners"},
  {href:"/pro",label:"Pros"}
] as const;

export default function AudienceNav(){
  const pathname=usePathname();
  return <nav className="audienceNav" aria-label="Choose ChimneyAI experience">
    {destinations.map(({href,label})=>{
      const active=pathname===href;
      return <Link key={href} href={href} className={active?"active":undefined} aria-current={active?"page":undefined}>{label}</Link>;
    })}
  </nav>;
}
