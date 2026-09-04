export const MAX_PHONE_IMAGE_BYTES=50*1024*1024;
export const MAX_ANALYSIS_IMAGE_BYTES=350_000;
export const MAX_ANALYSIS_IMAGE_EDGE=2048;

export function fitImageDimensions(width:number,height:number,maxEdge=MAX_ANALYSIS_IMAGE_EDGE){
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new Error("The image has invalid dimensions.");
  const scale=Math.min(1,maxEdge/Math.max(width,height));
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}

// Only the AI viewing copy is resized. The caller retains and hashes the original.
export async function preparePhoneImage(file:File):Promise<Blob>{
  const url=URL.createObjectURL(file),image=new Image();
  try{
    await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error("This browser cannot decode this photo. For HEIC/HEIF, share or export it as JPEG and attach that copy; the original is not modified."));image.src=url});
    let size=fitImageDimensions(image.naturalWidth,image.naturalHeight);
    const canvas=document.createElement("canvas");
    for(let attempt=0;attempt<7;attempt++){
      canvas.width=size.width;canvas.height=size.height;
      const context=canvas.getContext("2d");
      if(!context)throw new Error("This browser cannot prepare the photo. Try another browser.");
      context.fillStyle="#fff";context.fillRect(0,0,size.width,size.height);
      context.drawImage(image,0,0,size.width,size.height);
      for(const quality of [0.88,0.76,0.64]){
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(new Error("Photo preparation failed. Please try again.")),"image/jpeg",quality));
        if(blob.size<=MAX_ANALYSIS_IMAGE_BYTES)return blob;
      }
      size=fitImageDimensions(size.width,size.height,Math.max(size.width,size.height)*0.8);
    }
    throw new Error("This image could not be prepared within the upload budget. Try a closer photo of the area you want reviewed.");
  }finally{URL.revokeObjectURL(url)}
}
