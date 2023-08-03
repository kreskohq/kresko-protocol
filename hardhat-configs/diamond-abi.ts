interface DiamondAbiUserConfig {
    name: string;
    include?: string[];
    exclude?: string[];
    filter?: (abiElement: any, index: number, abi: any[], fullyQualifiedName: string) => boolean;
    strict?: boolean;
}

export const diamondAbiConfig: DiamondAbiUserConfig[] = [
    {
        name: "Kresko",
        include: ["facets/*", "MinterEvent"],
        exclude: ["vendor", "test/*", "interfaces/*", "krasset/*", "KrStaking"],
        strict: false,
        filter(abiElement, index, abi, fq) {
            if (abiElement.type === "error") {
                return false;
            }
            if (abiElement.type === "event") {
                if (
                    abiElement.name === "CloseFeePaid" &&
                    (fq.includes("BurnHelperFacet") || fq.includes("LiquidationFacet"))
                ) {
                    return false;
                } else if (abiElement.name === "RoleGranted" && fq.includes("ConfigurationFacet")) {
                    return false;
                }
            }
            return true;
        },
    },
];
// subgraph: {
//     name: "MySubgraph", // Defaults to the name of the root folder of the hardhat project
//     product: "hosted-service" | "subgraph-studio", // Defaults to 'subgraph-studio'
//     indexEvents: true | false, // Defaults to false
//     allowSimpleName: true | false, // Defaults to `false` if product is `hosted-service` and `true` if product is `subgraph-studio`
// },
// watcher: {
//     test: {
//         tasks: [{ command: "test", params: { testFiles: ["{path}"] } }],
//         files: ["./src/test/**/*"],
//         verbose: false,
//     },
// },
//
// gasReporter: {
//     currency: "USD",
//     enabled: true,
//     showMethodSig: true,
//     src: "./src/contracts",
// },
