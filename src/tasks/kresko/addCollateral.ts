import { fromFixedPoint, toFixedPoint } from "@utils/fixed-point";
import { fromBig, parseEther } from "@utils/numbers";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("kresko:addcollateral")
    .addParam("name", "Name of the collateral")
    .addParam("closeFactor", "closeFactor for the collateral", 1000, types.float)
    .addParam("oracleAddr", "Price feed address")
    .addOptionalParam("nrwt", "Non rebasing wrapper token?")
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { ethers, kresko } = hre;

        const { name, closeFactor, oracleAddr, nrwt } = taskArgs;

        if (closeFactor == 1000) {
            console.error("Invalid closeFactor for", name);
            return;
        }

        const Collateral = await ethers.getContract<Token>(name);

        console.log("Dollar address", Collateral.address);

        const collateralAsset = await kresko.collateralAssets(Collateral.address);
        const exists = collateralAsset.exists;

        if (exists) {
            console.error("Collateral already exists, aborting..");
            return;
        }

        const tx = await kresko.addCollateralAsset(Collateral.address, toFixedPoint(closeFactor), oracleAddr, !!nrwt);

        const collateralDecimals = await Collateral.decimals();

        console.log("Decimals", collateralDecimals);
        const [value, oraclePrice] = await kresko.getCollateralValueAndOraclePrice(
            Collateral.address,
            ethers.utils.parseUnits("1", collateralDecimals),
            true,
        );

        console.log(`Added ${name} as collateral with a close factor of:`, closeFactor);
        console.log(`1 ${name} has value: ${fromBig(value.toString())}`);
        console.log("txHash", tx.hash);
    });
