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
        exclude: ["vendor", "test/*", "interfaces/*", "krasset/*", "KrStaking", "collateral-pool/position/*"],
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
    {
        name: "Positions",
        include: ["position/facets/*"],
        exclude: ["vendor", "test/*", "interfaces/*", "krasset/*", "KrStaking"],
        strict: false,
        filter(abiElement, index, abi, fq) {
            if (abiElement.type === "event") {
                if (
                    abiElement.name === "Approval" &&
                    (fq.includes("LayerZeroFacet") ||
                        fq.includes("PositionsFacet") ||
                        fq.includes("PositionsConfigFacet"))
                ) {
                    return false;
                } else if (
                    abiElement.name === "SendToChain" &&
                    (fq.includes("ERC721Facet") || fq.includes("PositionsFacet") || fq.includes("PositionsConfigFacet"))
                ) {
                    return false;
                } else if (
                    abiElement.name === "ReceiveFromChain" &&
                    (fq.includes("ERC721Facet") || fq.includes("PositionsFacet") || fq.includes("PositionsConfigFacet"))
                ) {
                    return false;
                } else if (
                    abiElement.name === "Transfer" &&
                    (fq.includes("LayerZeroFacet") ||
                        fq.includes("PositionsFacet") ||
                        fq.includes("PositionsConfigFacet"))
                ) {
                    return false;
                } else if (
                    abiElement.name === "CreditStored" &&
                    (fq.includes("ERC721Facet") || fq.includes("PositionsConfigFacet"))
                ) {
                    return false;
                }

                if (abiElement.name === "Approval" && index === 2) {
                    return false;
                } else if (abiElement.name === "Transfer" && index === 5) {
                    return false;
                } else if (abiElement.name === "ReceiveFromChain" && index === 5) {
                    return false;
                } else if (abiElement.name === "CreditStored" && (index === 5 || index === 2)) {
                    return false;
                } else if (abiElement.name === "SendToChain" && (index === 5 || index === 8)) {
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
