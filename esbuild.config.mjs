// Build config for the StrataFlow demo app (web/app.jsx -> web/app.js).
// Vercel runs `npm run build`; this is the entry point for that.
import { build, context } from "esbuild";

const watch = process.argv.includes("--watch");
const dev = watch || process.env.NODE_ENV === "development";

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: ["web/app.jsx"],
  bundle: true,
  format: "iife",
  outfile: "web/app.js",
  target: ["es2019"],
  minify: !dev,
  sourcemap: dev,
  logLevel: "info",
  // Must be a real string. Passing it unquoted would substitute the bare
  // identifier `production`, which throws a ReferenceError inside React.
  define: {
    "process.env.NODE_ENV": JSON.stringify(dev ? "development" : "production"),
  },
  loader: { ".jsx": "jsx" },
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log("watching web/app.jsx ...");
} else {
  await build(options);
}
