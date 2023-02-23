import { defineConfig } from 'tsup'

export default defineConfig((opts) => {
  return {
    entry: ['src/**/*.ts'],
    // entry: ['src/index.ts', 'src/kresko.ts', 'src/types.ts', 'src/deployments/index.ts','src/typechain/index.ts','src/kresko/index.ts', 'src/error.ts'],
    format: ['cjs'],
    target: 'es2020',
    dts: true,
    minify: 'terser',
    splitting: true,
    treeshake: false,
    metafile: false,
    clean: true
  }
})
