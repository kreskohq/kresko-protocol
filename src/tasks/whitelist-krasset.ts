import { anchorTokenPrefix } from "@deploy-config/shared";
import { getLogger, toFixedPoint } from "@kreskolabs/lib";
import { defaultSupplyLimit } from "@utils/test/mocks";
import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { TASK_WHITELIST_KRASSET } from "./names";

task(TASK_WHITELIST_KRASSET)
    .addParam("symbol", "Name of the asset")
    .addParam("kFactor", "kFactor for the asset", 0, types.float)
    .addParam("oracleAddr", "Price feed address")
    .addParam("marketStatusOracleAddr", "Market status oracle address")
    .addParam("supplyLimit", "Supply limit", defaultSupplyLimit, types.int)
    .addOptionalParam("log", "Log outputs", false, types.boolean)
    .addOptionalParam("wait", "Log outputs", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { symbol, kFactor, oracleAddr, supplyLimit, marketStatusOracleAddr, log } = taskArgs;
        const logger = getLogger(TASK_WHITELIST_KRASSET, log);

        if (kFactor === 0 || kFactor < 1) {
            throw new Error("Invalid kFactor for", symbol);
        }
        hre.checkAddress(oracleAddr, `Invalid oracle address: ${oracleAddr}, Kresko Asset: ${symbol}`);
        hre.checkAddress(
            marketStatusOracleAddr,
            `Invalid market status oracle address: ${marketStatusOracleAddr}, Kresko Asset: ${symbol}`,
        );

        const kresko = await hre.getContractOrFork("Kresko");

        const KrAsset = await hre.getContractOrFork("KreskoAsset", symbol);
        const KrAssetAnchor = await hre.getDeploymentOrNull(`${anchorTokenPrefix}${symbol}`);

        const krAssetInfo = await kresko.kreskoAsset(KrAsset.address);
        const exists = krAssetInfo.exists;

        if (exists) {
            logger.warn(`KrAsset ${symbol} already exists! Skipping..`);
        } else {
            logger.log(`Whitelisting Kresko Asset: ${symbol}, anchor: ${KrAssetAnchor?.address}}`);
            const tx = await kresko.addKreskoAsset(
                KrAsset.address,
                KrAssetAnchor ? KrAssetAnchor.address : KrAsset.address,
                toFixedPoint(kFactor),
                oracleAddr,
                marketStatusOracleAddr,
                toFixedPoint(supplyLimit),
                toFixedPoint(0.02),
                toFixedPoint(0),
            );
            logger.success("txHash", tx.hash);
            await tx.wait();
            logger.success(`Succesfully whitelisted Kresko Asset ${symbol} with a kFactor of ${kFactor}`);
        }
        return;
    });
