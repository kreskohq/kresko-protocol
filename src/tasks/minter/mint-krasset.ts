import { fromBig } from "@utils/numbers";
import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import type { ERC20PresetMinterPauser, Kresko, KreskoAsset } from "types";
task("mint-krasset")
    .addParam("name", "Name of the krAsset")
    .addOptionalParam("amount", "Amount to mint in decimal", 1000, types.float)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { deployer } = await hre.ethers.getNamedSigners();

        const address = await deployer.getAddress();
        const Kresko = hre.Diamond;

        const KrAsset = await hre.ethers.getContract<KreskoAsset>(taskArgs.name);
        const KrAssetInfo = await Kresko.kreskoAsset(KrAsset.address);

        if (!KrAssetInfo.exists) {
            throw new Error(`Asset with name: ${taskArgs.name} does not exist`);
        }
        const mintAmount = hre.ethers.utils.parseUnits(String(taskArgs.amount), 18);
        const mintValue = await Kresko.getKrAssetValue(KrAsset.address, mintAmount, true);
        const parsedValue = fromBig(mintValue.rawValue, 8) * 2;

        const KISS = await hre.ethers.getContract<ERC20PresetMinterPauser>("KISS");

        const KISSAmount = hre.ethers.utils.parseUnits(String(parsedValue), await KISS.decimals());

        const allowance = await KISS.allowance(address, Kresko.address);

        if (!allowance.gt(0)) {
            await KISS.approve(Kresko.address, hre.ethers.constants.MaxUint256);
        }

        let tx = await Kresko.depositCollateral(address, KISS.address, KISSAmount);
        await tx.wait();

        console.log(`Deposited ${parsedValue}USDC for minting ${taskArgs.name}`);

        tx = await Kresko.mintKreskoAsset(address, KrAsset.address, mintAmount);
        await tx.wait();

        console.log(`Done minting ${taskArgs.amount} of ${taskArgs.name}`);
        return;
    });
