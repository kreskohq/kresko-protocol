import { getLogger } from "@utils/deployment";
import { toFixedPoint } from "@utils/fixed-point";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("kresko:addkrasset")
    .addParam("symbol", "Name of the asset")
    .addParam("kFactor", "kFactor for the asset", 1000, types.float)
    .addParam("oracleAddr", "Price feed address")
    .addParam("marketCapLimit", "Market cap USD limit", 10_000_000, types.int)
    .addOptionalParam("log", "Log outputs", false, types.boolean)
    .addOptionalParam("wait", "Log outputs", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { ethers, kresko } = hre;
        const { symbol, kFactor, oracleAddr, marketCapLimit, log } = taskArgs;
        const logger = getLogger("addCollateral", log);
        if (kFactor == 1000) {
            console.error("Invalid kFactor for", symbol);
            return;
        }
        const KrAsset = await ethers.getContract<KreskoAsset>(symbol);

        const KrAssetSymbol = await KrAsset.symbol();
        const krAssetInfo = await kresko.kreskoAssets(KrAsset.address);
        const exists = krAssetInfo.exists;

        if (exists) {
            logger.warn(`KrAsset ${symbol} already exists!`);
        } else {
            const tx = await kresko.addKreskoAsset(
                KrAsset.address,
                KrAssetSymbol,
                toFixedPoint(kFactor),
                oracleAddr,
                toFixedPoint(marketCapLimit),
            );
            logger.success(`Succesfully added ${symbol} in Kresko with kFactor of ${kFactor}`);
            logger.success("txHash", tx.hash);
        }
    });
