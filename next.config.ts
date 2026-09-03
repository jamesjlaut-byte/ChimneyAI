import type { NextConfig } from "next";

const contentSecurityPolicy=[
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests"
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
  async headers(){
    return [{
      source:"/:path*",
      headers:[
        {key:"Content-Security-Policy",value:contentSecurityPolicy},
        {key:"Referrer-Policy",value:"strict-origin-when-cross-origin"},
        {key:"Strict-Transport-Security",value:"max-age=63072000"},
        {key:"X-Content-Type-Options",value:"nosniff"},
        {key:"X-Frame-Options",value:"DENY"},
        {key:"Cross-Origin-Opener-Policy",value:"same-origin"},
        {key:"Cross-Origin-Resource-Policy",value:"same-origin"},
        {key:"X-DNS-Prefetch-Control",value:"off"},
        {key:"Permissions-Policy",value:"camera=(), microphone=(), geolocation=()"}
      ]
    }];
  }
};
export default nextConfig;
