import esbuild from 'esbuild';

// CF-WORKERS-ADAPTER: when the prisma generator is set to `runtime = "workerd"`
// the emitted client uses `import("./query_compiler_fast_bg.wasm?module")` —
// the workerd-native wasm import. esbuild-node can't resolve that suffix, so
// we stub it out here. The resulting bundle is only consumed by check-db.js
// at build time (and only with SKIP_DB_CHECK=1 in the Workers build path),
// so a null stub is fine — the wasm is never actually invoked from this
// bundle.
const stubWorkerdWasmPlugin = {
  name: 'stub-workerd-wasm',
  setup(build) {
    build.onResolve({ filter: /\.wasm\?module$/ }, args => ({
      path: args.path,
      namespace: 'stub-workerd-wasm',
    }));
    build.onLoad({ filter: /.*/, namespace: 'stub-workerd-wasm' }, () => ({
      contents: 'export default null;',
      loader: 'js',
    }));
  },
};

esbuild
  .build({
    entryPoints: ['src/generated/prisma/client.ts'], // Adjust this to your entry file
    bundle: true, // Bundle all files into one (optional)
    outfile: 'generated/prisma/client.js', // Output file
    platform: 'node', // For Node.js compatibility
    target: 'es2020', // Target version of Node.js
    format: 'esm', // Use ESM format
    sourcemap: true, // Optional: generates source maps for debugging
    external: [
      '../src/generated/prisma', // exclude generated client
      '@prisma/client', // just in case
      '.prisma/client',
    ], // Optional: Exclude external dependencies from bundling
    plugins: [stubWorkerdWasmPlugin],
  })
  .catch(() => process.exit(1));
