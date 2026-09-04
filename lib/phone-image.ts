export const MAX_PHONE_IMAGE_BYTES=50*1024*1024;
export const MAX_ANALYSIS_IMAGE_BYTES=550_000;
export const MAX_IMAGE_BATCH_BYTES=3_300_000;
export const MAX_ANALYSIS_IMAGE_EDGE=2304;

export function fitImageDimensions(width:number,height:number,maxEdge=MAX_ANALYSIS_IMAGE_EDGE){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error("The image has invalid dimensions.");
  const scale=Math.min(1,maxEdge/Math.max(width,height));
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}

// Only the AI viewing copy is resized. The caller retains and hashes the original.
export async function preparePhoneImage(file:File,maxBytes=MAX_IMAGE_BATCH_BYTES):Promise<Blob>{
  let url=URL.createObjectURL(file);
  const image=new Image(),canvas=document.createElement("canvas");
  const decode=()=>new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error("Photo decoding failed."));image.src=url});
  try{
    try{await decode()}catch{
      if(!/image\/hei[cf]/i.test(file.type)&&! /\.hei[cf]$/i.test(file.name))throw new Error("This photo could not be decoded. It may be damaged or incompletely downloaded from your photo library. Try selecting it again.");
      try{
        // Lazy-loaded CSP-safe decoder; no external photo service or unsafe-eval.
        const {heicTo}=await import("heic-to/csp");
        const converted=await heicTo({blob:file,type:"image/jpeg",quality:0.95});
        URL.revokeObjectURL(url);url=URL.createObjectURL(converted);await decode();
      }catch{throw new Error("Automatic HEIC conversion failed. The file may be incomplete, unsupported, or this device may be low on memory. Keep the original and try selecting one photo at a time.")}
    }
    // Modern browser image decoding applies EXIF orientation (including mirrors).
    // Drawing that oriented image bakes orientation into the JPEG; do not rotate twice.
    let size=fitImageDimensions(image.naturalWidth,image.naturalHeight);
    for(let attempt=0;attempt<7;attempt++){
      canvas.width=size.width;canvas.height=size.height;
      const context=canvas.getContext("2d");
      if(!context)throw new Error("This browser cannot prepare the photo. Try another browser.");
      context.fillStyle="#fff";context.fillRect(0,0,size.width,size.height);
      context.drawImage(image,0,0,size.width,size.height);
      for(const quality of [0.85,0.80]){
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(new Error("Photo preparation failed. Please try again.")),"image/jpeg",quality));
        if(blob.size<=maxBytes)return blob;
      }
      size=fitImageDimensions(size.width,size.height,Math.max(size.width,size.height)*0.8);
    }
    throw new Error("This image could not be prepared within the upload budget. Try a closer photo of the area you want reviewed.");
  }finally{URL.revokeObjectURL(url);image.src="";canvas.width=0;canvas.height=0}
}
