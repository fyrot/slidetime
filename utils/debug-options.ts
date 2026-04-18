const DEBUG_MODE = false;

export function debugLog(text: string) {
  if (!DEBUG_MODE) { return; }
  console.log(text);
  // this is just to be a quick way of removing all of our development console.log commands without actually "removing" them
}