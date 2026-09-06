export const SUPPORTED_PHOTO_MIME_TYPES=[
  "image/jpeg","image/png","image/webp","image/gif","image/heic","image/heif",
  "image/heic-sequence","image/heif-sequence","image/x-heic","image/x-heif"
] as const;

export type NormalizedPhotoMime="image/jpeg"|"image/png"|"image/webp"|"image/gif"|"image/heic"|"image/heif";

const MIME_NORMALIZATION:Record<string,NormalizedPhotoMime>={
  "image/jpeg":"image/jpeg","image/png":"image/png","image/webp":"image/webp","image/gif":"image/gif",
  "image/heic":"image/heic","image/heic-sequence":"image/heic","image/x-heic":"image/heic",
  "image/heif":"image/heif","image/heif-sequence":"image/heif","image/x-heif":"image/heif"
};
const EXTENSION_MIME:Record<string,NormalizedPhotoMime>={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif",heic:"image/heic",heif:"image/heif"};

export function normalizePhotoType(file:{type?:string;name?:string},{allowGif=true}:{allowGif?:boolean}={}):NormalizedPhotoMime|null{
  const reported=(file.type||"").trim().toLowerCase();
  let normalized=MIME_NORMALIZATION[reported]||null;
  if(!normalized&&(reported===""||reported==="application/octet-stream")){
    const extension=(file.name||"").split(".").at(-1)?.toLowerCase()||"";
    normalized=EXTENSION_MIME[extension]||null;
  }
  if(normalized==="image/gif"&&!allowGif)return null;
  return normalized;
}

export function isHeicPhoto(file:{type?:string;name?:string}){
  const type=normalizePhotoType(file);
  return type==="image/heic"||type==="image/heif";
}
