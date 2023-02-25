import { defineConfig } from "tsup";

export default defineConfig(opts => {
    return {
        entry: ["src/index.ts", "src/types/index.ts", "src/error.ts", "src/util.ts"],
        format: ["cjs"],
        target: "esnext",
        dts: true,
        clean: true,
        splitting: false,
    };
});
