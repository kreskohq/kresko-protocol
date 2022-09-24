import type { TaskArguments } from "hardhat/types";
import { getLogger } from "@utils/deployment";
import { toFixedPoint } from "@utils/fixed-point";
import { defaultSupplyLimit } from "@utils/test/mocks";
import { task, types } from "hardhat/config";

task("add-krasset")
    .addParam("symbol", "Name of the asset")
    .addParam("kFactor", "kFactor for the asset", 1000, types.float)
    .addParam("oracleAddr", "Price feed address")
    .addParam("supplyLimit", "Market cap USD limit", defaultSupplyLimit, types.int)
    .addOptionalParam("log", "Log outputs", false, types.boolean)
    .addOptionalParam("wait", "Log outputs", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { ethers, users } = hre;
        const kresko = hre.Diamond.connect(users.operator);
        const { symbol, kFactor, oracleAddr, supplyLimit, log } = taskArgs;
        const logger = getLogger("add-krasset", log);
        if (kFactor == 1000) {
            console.error("Invalid kFactor for", symbol);
            return;
        }
        const KrAsset = await ethers.getContract<KreskoAsset>(symbol);

        const asset = hre.krAssets.find(k => k.address === KrAsset.address);

        const krAssetInfo = await kresko.kreskoAsset(KrAsset.address);
        const exists = krAssetInfo.exists;

        if (exists) {
            logger.warn(`KrAsset ${symbol} already exists!`);
        } else {
            console.log(asset.wrapper.interface.format());
            const tx = await kresko.addKreskoAsset(
                KrAsset.address,
                asset.wrapper.address,
                toFixedPoint(kFactor),
                oracleAddr,
                toFixedPoint(supplyLimit),
                toFixedPoint(0.02),
            );
            await tx.wait();
            logger.success(`Succesfully added ${symbol} in Kresko with kFactor of ${kFactor}`);
            logger.success("txHash", tx.hash);
        }
        return;
    });
