import { fromBig } from "@utils/numbers";
import { toFixedPoint } from "@utils/fixed-point";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { getLogger } from "@utils/deployment";

task("kresko:addcollateral")
    .addParam("name", "Name of the collateral")
    .addParam("cFactor", "cFactor for the collateral", 1000, types.float)
    .addParam("oracleAddr", "Price feed address")
    .addParam("depositable", "Depositability of the collateral")
    .addOptionalParam("nrwt", "Non rebasing wrapper token?")
    .addOptionalParam("log", "Log outputs", false, types.boolean)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { ethers, kresko } = hre;

        const { name, cFactor, oracleAddr, depositable, nrwt, log, wait } = taskArgs;

        const logger = getLogger("addCollateral", log);

        if (cFactor == 1000) {
            console.error("Invalid cFactor for", name);
            return;
        }

        const Collateral = await ethers.getContract<Token>(name);

        logger.log("Collateral address", Collateral.address);

        const collateralAsset = await kresko.collateralAssets(Collateral.address);
        const exists = collateralAsset.exists;

        if (exists) {
            logger.warn(`Collateral ${name} already exists!`);
        } else {
            const tx = await kresko.addCollateralAsset(Collateral.address, toFixedPoint(cFactor), oracleAddr, depositable, !!nrwt);

            await tx.wait(wait);

            if (log) {
                const collateralDecimals = await Collateral.decimals();
                logger.log(name, "decimals", collateralDecimals);
                const [value, oraclePrice] = await kresko.getCollateralValueAndOraclePrice(
                    Collateral.address,
                    ethers.utils.parseUnits("1", collateralDecimals),
                    true,
                );

                logger.success(`Sucesfully added ${name} as collateral with a cFctor of:`, cFactor);
                logger.log(`1 ${name} value: ${fromBig(value.rawValue, 8)}`);
                logger.log(`1 ${name} oracle price: ${fromBig(oraclePrice.rawValue, 8)}`);
                logger.log("txHash", tx.hash);
            }
        }
    });
