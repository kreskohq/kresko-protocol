// import { redstoneMap } from "@deploy-config/arbitrumGoerli";
// import { getLogger } from "@kreskolabs/lib";
// import { task, types } from "hardhat/config";
// import type { TaskArguments } from "hardhat/types";
// import { getAssetConfig } from "@utils/test/helpers/general";
// import { OracleType } from "types";

// task(TASK_WHITELIST_COLLATERAL)
//     .addParam("symbol", "Name of the collateral")
//     .addParam("cFactor", "cFactor for the collateral", 1e4, types.int)
//     .addParam("oracleAddr", "Price feed address")
//     .addOptionalParam("log", "Log outputs", false, types.boolean)
//     .addOptionalParam("wait", "wait confirmations", 1, types.int)
//     .setAction(async function (taskArgs: TaskArguments, hre) {
//         const { symbol, cFactor, oracleAddr, log } = taskArgs;
//         const logger = getLogger(TASK_WHITELIST_COLLATERAL, log);

//         const kresko = await hre.getContractOrFork("Kresko");

//         if (cFactor == 1000) {
//             console.error("Invalid cFactor for", symbol);
//             return;
//         }

//         const Collateral = await hre.getContractOrFork("ERC20Upgradeable", symbol);

//         const collateralAsset = await kresko.getAsset(Collateral.address);

//         if (collateralAsset.isCollateral) {
//             logger.warn(`Collateral ${symbol} already exists!`);
//         } else {
//             const anchor = await hre.deployments.getOrNull(anchorTokenPrefix + symbol);
//             logger.log(
//                 "Adding collateral",
//                 symbol,
//                 "with cFactor",
//                 cFactor,
//                 "and oracle",
//                 oracleAddr,
//                 "and anchor",
//                 anchor?.address ?? hre.ethers.constants.AddressZero,
//             );
//             if (!process.env.LIQUIDATION_INCENTIVE) {
//                 throw new Error("LIQUIDATION_INCENTIVE is not set");
//             }

//             const id = redstoneMap[symbol as keyof typeof redstoneMap];
//             if (!id) throw new Error(`Redstone not found for ${symbol}`);

//             const config = await getAssetConfig(Collateral, {
//                 id: id,
//                 name: symbol,
//                 oracleIds: [OracleType.Redstone, OracleType.Chainlink],
//                 symbol,
//                 feed: oracleAddr,
//                 collateralConfig: {
//                     cFactor,
//                     liqIncentive: 1.05e4,
//                 },
//             });

//             const tx = await kresko.addAsset(Collateral.address, config.assetStruct, config.feedConfig, true);
//             if (log) {
//                 const collateralDecimals = await Collateral.decimals();
//                 logger.log(symbol, "decimals", collateralDecimals);

//                 logger.success(`Sucesfully added ${symbol} as collateral with a cFctor of:`, cFactor);
//                 logger.log("txHash", tx.hash);
//             }
//         }
//         return;
//     });
