import { toFixedPoint } from "@utils/fixed-point";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("kresko:addkrasset")
    .addParam("name", "Name of the asset")
    .addParam("kFactor", "kFactor for the asset", 1000, types.float)
    .addParam("oracleAddr", "Price feed address")
    .addParam("marketCapLimit", "Market cap USD limit")
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { ethers, kresko } = hre;
        const { name, kFactor, oracleAddr, marketCapLimit } = taskArgs;
        if (kFactor == 1000) {
            console.error("Invalid kFactor for", name);
            return;
        }
        const KrAsset = await ethers.getContract<KreskoAsset>(name);

        const KrAssetSymbol = await KrAsset.symbol();

        const tx = await kresko.addKreskoAsset(KrAsset.address, KrAssetSymbol, toFixedPoint(kFactor), oracleAddr, toFixedPoint(marketCapLimit));
        await tx.wait(1);
        console.log("Added KrGold as mintable in Kresko with kFactor of", kFactor);
        console.log("txHash", tx.hash);
    });
