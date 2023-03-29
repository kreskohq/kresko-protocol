import { anchorTokenPrefix } from "@deploy-config/shared";
import { getLogger, toFixedPoint } from "@kreskolabs/lib";
import { defaultSupplyLimit } from "@utils/test/mocks";
import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("add-krasset")
    .addParam("symbol", "Name of the asset")
    .addParam("kFactor", "kFactor for the asset", 1000, types.float)
    .addParam("oracleAddr", "Price feed address")
    .addParam("marketStatusOracleAddr", "Market status oracle address")
    .addParam("supplyLimit", "Supply limit", defaultSupplyLimit, types.int)
    .addOptionalParam("log", "Log outputs", false, types.boolean)
    .addOptionalParam("wait", "Log outputs", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { users } = hre;

        const kresko = hre.Diamond.connect(users.admin);
        const { symbol, kFactor, oracleAddr, supplyLimit, marketStatusOracleAddr, log } = taskArgs;
        const logger = getLogger("add-krasset", log);
        if (kFactor == 1000) {
            console.error("Invalid kFactor for", symbol);
            return;
        }

        const KrAsset = await hre.getContractOrFork("KreskoAsset", symbol);

        const anchor = await hre.getDeploymentOrNull(`${anchorTokenPrefix}${symbol}`);

        const krAssetInfo = await kresko.kreskoAsset(KrAsset.address);
        const exists = krAssetInfo.exists;

        if (exists) {
            logger.warn(`KrAsset ${symbol} already exists!`);
        } else {
            const tx = await kresko.addKreskoAsset(
                KrAsset.address,
                anchor ? anchor.address : KrAsset.address,
                toFixedPoint(kFactor),
                oracleAddr,
                marketStatusOracleAddr,
                toFixedPoint(supplyLimit),
                toFixedPoint(0.02),
                toFixedPoint(0),
            );
            await tx.wait();
            logger.success(`Succesfully added ${symbol} in Kresko with kFactor of ${kFactor}`);
            logger.success("txHash", tx.hash);
        }
        return;
    });
