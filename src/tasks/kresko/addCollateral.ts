import { fromBig } from "@utils/numbers";
import { toFixedPoint } from "@utils/fixed-point";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

task("kresko:addcollateral")
    .addParam("name", "Name of the collateral")
    .addParam("cFactor", "cFactor for the collateral", 1000, types.float)
    .addParam("oracleAddr", "Price feed address")
    .addOptionalParam("nrwt", "Non rebasing wrapper token?")
    .addOptionalParam("log", "Log outputs", false, types.boolean)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { ethers, kresko } = hre;

        const { name, cFactor, oracleAddr, nrwt, log, wait } = taskArgs;

        if (cFactor == 1000) {
            console.error("Invalid cFactor for", name);
            return;
        }

        const Collateral = await ethers.getContract<Token>(name);

        log && console.log("Collateral address", Collateral.address);

        const collateralAsset = await kresko.collateralAssets(Collateral.address);
        const exists = collateralAsset.exists;

        if (exists) {
            console.log(`Collateral ${name} already exists!`);
        } else {
            const tx = await kresko.addCollateralAsset(Collateral.address, toFixedPoint(cFactor), oracleAddr, !!nrwt);

            await tx.wait(wait);

            if (log) {
                const collateralDecimals = await Collateral.decimals();
                console.log("Decimals", collateralDecimals);
                const [value, oraclePrice] = await kresko.getCollateralValueAndOraclePrice(
                    Collateral.address,
                    ethers.utils.parseUnits("1", collateralDecimals),
                    true,
                );

                console.log(`Added ${name} as collateral with a cFctor of:`, cFactor);
                console.log(`1 ${name} has value: ${fromBig(value.rawValue, 8)}`);
                console.log(`1 ${name} has oracle price of: ${fromBig(oraclePrice.rawValue, 8)}`);
                console.log("txHash", tx.hash);
            }
        }
    });
