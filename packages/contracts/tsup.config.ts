import { defineConfig } from "tsup";
export default defineConfig(opts => {
    return {
        entry: ["src/index.ts"],
        format: ["esm"],
        dts: true,
        sourcemap: false,
        target: ["esnext"],
        outDir: "dist",
        platform: "node",
        clean: true,
        minify: true,
        bundle: true,
        splitting: true,
        treeshake: true,
    };
});
