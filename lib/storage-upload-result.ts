export function isAlreadyPresentStorageError(error:{message?:unknown;statusCode?:unknown;error?:unknown}){
  const message=[error.message,error.error].filter(value=>typeof value==="string").join(" ").toLowerCase();
  return error.statusCode===409||String(error.statusCode)==="409"||message.includes("already exists")||message.includes("duplicate");
}
