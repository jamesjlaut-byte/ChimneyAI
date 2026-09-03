import type {MetadataRoute} from "next";

export default function robots():MetadataRoute.Robots{
  return {
    rules:{
      userAgent:"*",
      allow:"/",
      disallow:"/api/"
    },
    sitemap:"https://chimney-ai.vercel.app/sitemap.xml",
    host:"https://chimney-ai.vercel.app"
  };
}
