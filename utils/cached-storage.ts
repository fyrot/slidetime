// REMINDER: this is to be used only for content-side scripts, not tooled to work with background scripts currently
let cache: Record<string, unknown> = {};
let ready = false;

function isCacheReady(): boolean { return ready; }

const readyPromise: Promise<void> = chrome.storage.local.get() // empty argument produces all keys
  .then((allPairs) => {
    cache = allPairs;
    ready = true;
  }) 

function whenCacheReady(): Promise<void> { return readyPromise; }

function getCached<T>(key: string, fallbackValue: T): T {
  return (cache[key] as T) ?? fallbackValue;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") { return; }
  
  for (const entry of Object.entries(changes)) {
    const key = entry[0]
    const storeValue = entry[1].newValue;
    if (storeValue === undefined) { delete cache[key]; }
    else { cache[key] = storeValue; }
  }
})



export { getCached, whenCacheReady, isCacheReady}