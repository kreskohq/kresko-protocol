import { fromBig } from "@utils/numbers";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { ERC20PresetMinterPauser, Kresko, KreskoAsset } from "types/contracts";
task("mint:krasset")
    .addParam("name", "Name of the krAsset")
    .addOptionalParam("amount", "Amount to mint in decimal", 1000, types.float)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { deployer } = await hre.ethers.getNamedSigners();

        const address = await deployer.getAddress();
        const Kresko = await hre.ethers.getContract<Kresko>("Kresko");

        const KrAsset = await hre.ethers.getContract<KreskoAsset>(taskArgs.name);
        const KrAssetInfo = await Kresko.kreskoAssets(KrAsset.address);

        if (!KrAssetInfo.exists) {
            throw new Error(`Asset with name: ${taskArgs.name} does not exist`);
        }
        const mintAmount = hre.ethers.utils.parseUnits(String(taskArgs.amount), 18);
        const mintValue = await Kresko.getKrAssetValue(KrAsset.address, mintAmount, true);
        const parsedValue = fromBig(mintValue.rawValue, 8) * 2;

        const USDC = await hre.ethers.getContract<ERC20PresetMinterPauser>("USDC");

        const USDCAmount = hre.ethers.utils.parseUnits(String(parsedValue), 6);
        let tx = await USDC.mint(address, USDCAmount);
        await tx.wait();

        const allowance = await USDC.allowance(address, Kresko.address);

        if (!allowance.gt(0)) {
            await USDC.approve(Kresko.address, hre.ethers.constants.MaxUint256);
        }

        tx = await Kresko.depositCollateral(address, USDC.address, USDCAmount);
        await tx.wait();

        console.log(`Deposited ${parsedValue}USDC for minting ${taskArgs.name}`);

        tx = await Kresko.mintKreskoAsset(address, KrAsset.address, mintAmount);
        await tx.wait();

        console.log(`Done minting ${taskArgs.amount} of ${taskArgs.name}`);
        return;
    });
