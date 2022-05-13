import { fromBig } from "@utils/numbers";
import { toFixedPoint } from "@utils/fixed-point";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { getLogger } from "@utils/deployment";

task("kresko:addcollateral")
    .addParam("symbol", "Name of the collateral")
    .addParam("cFactor", "cFactor for the collateral", 1000, types.float)
    .addParam("oracleAddr", "Price feed address")
    .addOptionalParam("nrwt", "Non rebasing wrapper token?")
    .addOptionalParam("log", "Log outputs", false, types.boolean)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { ethers, kresko } = hre;

        const { symbol, cFactor, oracleAddr, nrwt, log } = taskArgs;

        const logger = getLogger("addCollateral", log);

        if (cFactor == 1000) {
            console.error("Invalid cFactor for", symbol);
            return;
        }

        const Collateral = await ethers.getContract<Token>(symbol);

        logger.log("Collateral address", Collateral.address);

        const collateralAsset = await kresko.collateralAssets(Collateral.address);
        const exists = collateralAsset.exists;

        if (exists) {
            logger.warn(`Collateral ${symbol} already exists!`);
        } else {
            const tx = await kresko.addCollateralAsset(Collateral.address, toFixedPoint(cFactor), oracleAddr, !!nrwt);

            if (log) {
                const collateralDecimals = await Collateral.decimals();
                logger.log(symbol, "decimals", collateralDecimals);
                const [value, oraclePrice] = await kresko.getCollateralValueAndOraclePrice(
                    Collateral.address,
                    ethers.utils.parseUnits("1", collateralDecimals),
                    true,
                );

                logger.success(`Sucesfully added ${symbol} as collateral with a cFctor of:`, cFactor);
                logger.log(`1 ${symbol} value: ${fromBig(value.rawValue, 8)}`);
                logger.log(`1 ${symbol} oracle price: ${fromBig(oraclePrice.rawValue, 8)}`);
                logger.log("txHash", tx.hash);
            }
        }
    });
