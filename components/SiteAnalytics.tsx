"use client";
import {Analytics} from "@vercel/analytics/next";
import {sanitizeAnalyticsEvent} from "@/lib/analytics";

export default function SiteAnalytics(){
  if(process.env.NEXT_PUBLIC_VERCEL_ENV!=="production")return null;
  return <Analytics beforeSend={sanitizeAnalyticsEvent} debug={false}/>;
}
