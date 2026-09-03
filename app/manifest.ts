import type {MetadataRoute} from "next";

export default function manifest():MetadataRoute.Manifest{
  return {
    name:"ChimneyAI",
    short_name:"ChimneyAI",
    description:"Chimney intelligence for homeowners and chimney professionals.",
    start_url:"/",
    display:"standalone",
    background_color:"#050505",
    theme_color:"#050505",
    icons:[
      {
        src:"/assets/chimneyai-app-icon.png",
        sizes:"1254x1254",
        type:"image/png",
        purpose:"any"
      }
    ]
  };
}
