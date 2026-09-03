import type {MetadataRoute} from "next";

const BASE_URL="https://chimney-ai.vercel.app";

export default function sitemap():MetadataRoute.Sitemap{
  return [
    {url:BASE_URL,changeFrequency:"weekly",priority:1},
    {url:`${BASE_URL}/homeowner`,changeFrequency:"weekly",priority:0.9},
    {url:`${BASE_URL}/pro`,changeFrequency:"weekly",priority:0.9},
    {url:`${BASE_URL}/legal`,changeFrequency:"monthly",priority:0.4}
  ];
}
