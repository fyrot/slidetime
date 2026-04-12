/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    //"./popup.tsx",
    "./popup/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}", // the '.ts' is included in case we wanna do anything with programmatic styling
    "./contents/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {}
  },
  plugins: []
}
