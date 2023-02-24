import { exec } from "child_process";
import path from "path";

const coreExports = [
    "Kresko",
    "KrStaking",
    "KrStakingHelper",
    "KreskoAsset",
    "KreskoAssetAnchor",
    "UniswapV2Router02",
    "UniswapV2Factory",
    "UniswapMath",
    "UniswapV2Pair",
    "UniswapV2LiquidityMathLibrary",
    "Multisender",
    "FluxPriceFeedFactory",
    "FluxPriceFeed",
    "KISS",
    "UniswapV2Oracle",
    "ERC20Upgradeable",
    "WETH",
];

const currentPath = path.join(process.cwd());
const lightExports = ["Kresko", "KISS", "KreskoAsset"];

const glob = (exports: string) => {
    switch (exports) {
        case "light":
            return `${currentPath}/**!(interfaces)/(${lightExports.join("|")}).json`;
        case "core":
            return `${currentPath}/!(interfaces|forge|deployments)/**/+(${coreExports.join("|")}).json`;
        default:
            throw new Error(`Unknown export type: ${exports}`);
    }
};
console.log(process.argv[2]);
console.log();
const opts = {
    glob: glob(process.argv[2]),
    outdir: "packages/contracts/src/typechain",
};
// "FOUNDRY=true forge build && typechain --input-dir forge/artifacts './forge/artifacts/**/*.json' --out-dir types/forged --target=ethers-v5 --always-generate-overloads --discriminate-types",

//    glob: isExport
//             ? "/**/*+(Facet|Event|Kresko|Staking|KreskoAsset|Router02|V2Factory|V2Pair|V2LiquidityMathLibrary|Multisender|FeedFactory|FluxPriceFeed|KISS|V2Oracle|StakingHelper|ERC20Upgradeable|WETH).*json"
//             : undefined,
exec(`npx typechain "${opts.glob}" --out-dir=${opts.outdir} --target=ethers-v5`, (error, stdout, stderr) => {
    if (error) {
        console.error(`exec error: ${error}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
});
// exec("typechain", [
//     "--fork",
//     options.fork.url,
//     "--mnemonic",
//     options.wallet.mnemonic!,
//     "--defaultBalanceEther",
//     options.wallet.defaultBalance.toString(),
//     "--unlock",
//     options.wallet.unlockedAccounts.join(","),
//     "--allowUnlimitedContractSize",
//     "--gasPrice",
//     options.miner.defaultGasPrice.toString(),
//     "--port",
//     op
