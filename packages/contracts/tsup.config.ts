import { defineConfig } from 'tsup'
export default defineConfig((opts) => {
  return {
    entry: ['index.ts'],
    format: ['cjs'],
    dts: true,
    target: 'esnext',
    metafile: true,
  }
})
