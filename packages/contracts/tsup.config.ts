import { defineConfig } from 'tsup';
export default defineConfig(opts => {
  return {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: false,
    target: ['esnext'],
    outDir: 'dist',
    outExtension(ctx) {
      return {
        js: ctx.format === 'cjs' ? '.cjs' : '.mjs',
      };
    },
    platform: 'node',
    clean: true,
    minify: true,
    bundle: true,
    splitting: true,
    treeshake: true,
  };
});
