import { getLogger } from "@utils/deployment";
import { toFixedPoint } from "@utils/fixed-point";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("kresko:addkrasset")
    .addParam("name", "Name of the asset")
    .addParam("kFactor", "kFactor for the asset", 1000, types.float)
    .addParam("oracleAddr", "Price feed address")
    .addParam("marketCapLimit", "Market cap USD limit", 10_000_000, types.int)
    .addOptionalParam("log", "Log outputs", false, types.boolean)
    .addOptionalParam("wait", "Log outputs", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { ethers, kresko } = hre;
        const { name, kFactor, oracleAddr, marketCapLimit, log, wait } = taskArgs;
        const logger = getLogger("addCollateral", log);
        if (kFactor == 1000) {
            console.error("Invalid kFactor for", name);
            return;
        }
        const KrAsset = await ethers.getContract<KreskoAsset>(name);

        const KrAssetSymbol = await KrAsset.symbol();
        const krAssetInfo = await kresko.kreskoAssets(KrAsset.address);
        const exists = krAssetInfo.exists;

        if (exists) {
            logger.warn(`KrAsset ${name} already exists!`);
        } else {
            const tx = await kresko.addKreskoAsset(
                KrAsset.address,
                KrAssetSymbol,
                toFixedPoint(kFactor),
                oracleAddr,
                toFixedPoint(marketCapLimit),
            );
            await tx.wait(wait);
            logger.success(`Succesfully added ${name} in Kresko with kFactor of ${kFactor}`);
            logger.success("txHash", tx.hash);
        }
    });
