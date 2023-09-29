// import { redstoneMap } from "@deploy-config/arbitrumGoerli";
// import { anchorTokenPrefix } from "@deploy-config/shared";
// import { getLogger, toBig } from "@kreskolabs/lib";
// import { task, types } from "hardhat/config";
// import type { TaskArguments } from "hardhat/types";
// import { TASK_WHITELIST_KRASSET } from "./names";
// import { OracleType } from "types";
// import { getAssetConfig } from "@utils/test/helpers/general";

// task(TASK_WHITELIST_KRASSET)
//     .addParam("symbol", "Name of the asset")
//     .addParam("kFactor", "kFactor for the asset", 1e4, types.int)
//     .addParam("oracleAddr", "Price feed address")
//     .addParam("supplyLimit", "Supply limit", 100000, types.int)
//     .addOptionalParam("log", "Log outputs", false, types.boolean)
//     .addOptionalParam("wait", "Log outputs", 1, types.int)
//     .setAction(async function (taskArgs: TaskArguments, hre) {
//         const { symbol, kFactor, oracleAddr, supplyLimit, log } = taskArgs;
//         const logger = getLogger(TASK_WHITELIST_KRASSET, log);

//         if (kFactor < 1) {
//             throw new Error("Invalid kFactor for", symbol);
//         }
//         hre.checkAddress(oracleAddr, `Invalid oracle address: ${oracleAddr}, Kresko Asset: ${symbol}`);

//         const Kresko = await hre.getContractOrFork("Kresko");
//         const KrAsset = await hre.getContractOrFork("KreskoAsset", symbol);

//         console.log("Kresko", Kresko.address);
//         console.log("Kresko", KrAsset.address);
//         console.log("Kresko", await KrAsset.symbol());
//         const krAssetInfo = await Kresko.getAsset(KrAsset.address);
//         const exists = krAssetInfo.isKrAsset;

//         const redstoneId = redstoneMap[symbol as keyof typeof redstoneMap];
//         if (!redstoneId) throw new Error(`Redstone not found for ${symbol}`);

//         if (exists) {
//             logger.warn(`KrAsset ${symbol} already exists! Skipping..`);
//         } else {
//             const KrAssetAnchor = await hre.getDeploymentOrFork(`${anchorTokenPrefix}${symbol}`);
//             logger.log(`Whitelisting Kresko Asset: ${symbol}, anchor: ${KrAssetAnchor?.address}}`);

//             const config = await getAssetConfig(KrAsset, {
//                 id: redstoneId,
//                 name: symbol,
//                 oracleIds: [OracleType.Redstone, OracleType.Chainlink],
//                 symbol,
//                 feed: oracleAddr,
//                 krAssetConfig: {
//                     anchor: KrAssetAnchor ? KrAssetAnchor.address : KrAsset.address,
//                     kFactor,
//                     closeFee: 0.02e4,
//                     openFee: 0,
//                     supplyLimit: toBig(supplyLimit),
//                 },
//             });

//             const tx = await Kresko.addAsset(KrAsset.address, config.assetStruct, config.feedConfig, true);
//             logger.success("txHash", tx.hash);
//             logger.success(`Succesfully whitelisted Kresko Asset ${symbol} with a kFactor of ${kFactor}`);
//         }
//         return;
//     });
