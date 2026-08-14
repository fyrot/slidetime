// Some restricted CI/sandbox environments deny LMDB's mmap syscall. Parcel's
// LMDBCache only needs a synchronous get and an async put from the LMDB store,
// so provide those over ordinary files while preserving Parcel's cache class
// and serialization identity across worker threads.
const fs = require("node:fs");
const path = require("node:path");
const lmdb = require("lmdb");

const openFilesystemStore = (cacheDir) => {
  const storeDir = path.join(cacheDir, "fs-lmdb");
  fs.mkdirSync(storeDir, { recursive: true });
  const entryPath = (key) => path.join(storeDir, encodeURIComponent(String(key)));

  return {
    get(key) {
      try {
        return fs.readFileSync(entryPath(key));
      } catch (error) {
        if (error?.code === "ENOENT") return undefined;
        throw error;
      }
    },
    async put(key, value) {
      await fs.promises.writeFile(entryPath(key), value);
    }
  };
};

lmdb.open = openFilesystemStore;
lmdb.default.open = openFilesystemStore;
