export function parseManualHttpsUrl(value:string){
  if(!value.trim())return null;
  try{
    const url=new URL(value);
    if(url.protocol!=="https:"||!url.hostname||url.username||url.password)return null;
    return url;
  }catch{return null;}
}

export function sanitizeManualHttpsUrl(value:string){
  return parseManualHttpsUrl(value)?.href||"";
}

export function normalizeManualHost(hostname:string){
  return hostname.toLowerCase().replace(/\.$/,"").replace(/^www\./,"");
}

export function manualHostMatches(recordedHostname:string,registeredHostname:string){
  const recorded=normalizeManualHost(recordedHostname);
  const registered=normalizeManualHost(registeredHostname);
  return Boolean(recorded&&registered&&(recorded===registered||recorded.endsWith(`.${registered}`)));
}
