import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^~(.*)$/,
        replacement: fileURLToPath(new URL("./$1", import.meta.url))
      }
    ]
  },
  test: {
    environment: "jsdom"
  }
});
