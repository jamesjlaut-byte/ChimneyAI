// Each async action keeps the check captured in the conversation where it began.
export function createChatContextBoundary(){
  let generation=0;
  return {
    invalidate(){generation++},
    capture(){const captured=generation;return ()=>captured===generation}
  };
}
