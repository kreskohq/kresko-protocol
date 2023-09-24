import { fromBig, getLogger } from "@kreskolabs/lib";
import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { TASK_MINT_OPTIMAL } from "./names";

const logger = getLogger(TASK_MINT_OPTIMAL);

task(TASK_MINT_OPTIMAL, "Mint KrAsset with optimal KISS collateral")
    .addParam("kreskoAsset", "Deployment name of the krAsset")
    .addParam("amount", "Amount to mint in decimal", 0, types.float)
    .addOptionalParam("account", "Account to mint assets for", "", types.string)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        if (taskArgs.amount === 0) {
            throw new Error("Amount should be greater than 0");
        }
        const { deployer } = await hre.ethers.getNamedSigners();

        const accountSupplied = taskArgs.account !== "";
        if (accountSupplied && !hre.ethers.utils.isAddress(taskArgs.account)) {
            throw new Error(`Invalid account address: ${taskArgs.account}`);
        }
        const address = accountSupplied ? taskArgs.account : await deployer.getAddress();
        const signer = await hre.ethers.getSigner(address);
        logger.log(
            "Minting KrAsset",
            taskArgs.kreskoAsset,
            "with amount",
            taskArgs.amount,
            "for account",
            signer.address,
        );
        const Kresko = await hre.getContractOrFork("Kresko");

        const KrAsset = (await hre.getContractOrFork("KreskoAsset", taskArgs.kreskoAsset)).connect(signer);
        const KrAssetInfo = await Kresko.getKreskoAsset(KrAsset.address);

        if (!KrAssetInfo.exists) {
            throw new Error(`Kresko Asset with name ${taskArgs.kreskoAsset} does not exist`);
        }
        const mintAmount = hre.ethers.utils.parseUnits(String(taskArgs.amount), 18);
        const mintValue = await Kresko.getDebtAmountToValue(KrAsset.address, mintAmount, true);
        const parsedValue = fromBig(mintValue, 8) * 2;

        const KISS = (await hre.getContractOrFork("KISS")).connect(signer);

        const KISSAmount = hre.ethers.utils.parseUnits(String(parsedValue), await KISS.decimals());

        const allowance = await KISS.allowance(address, Kresko.address);

        if (!allowance.gt(0)) {
            await KISS.approve(Kresko.address, hre.ethers.constants.MaxUint256);
        }
        let tx = await Kresko.depositCollateral(address, KISS.address, KISSAmount);
        await tx.wait();

        logger.log(`Deposited ${parsedValue} KISS for minting ${taskArgs.kreskoAsset}`);

        try {
            tx = await Kresko.mintKreskoAsset(address, KrAsset.address, mintAmount);
            await tx.wait();
        } catch (e) {
            logger.error("Minting failed", e);
        }

        logger.success(`Done minting ${taskArgs.amount} of ${taskArgs.kreskoAsset}`);
        return;
    });
