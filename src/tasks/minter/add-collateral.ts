import type { TaskArguments } from "hardhat/types";
import type { MockERC20 } from "types";
import { getLogger } from "@kreskolabs/lib";
import { toFixedPoint, fromBig } from "@kreskolabs/lib";

import { task, types } from "hardhat/config";
import { anchorTokenPrefix } from "@deploy-config/shared";

task("add-collateral")
    .addParam("symbol", "Name of the collateral")
    .addParam("cFactor", "cFactor for the collateral", 1000, types.float)
    .addParam("oracleAddr", "Price feed address")
    .addParam("marketStatusOracleAddr", "Market status oracle address")
    .addOptionalParam("nrwt", "Non rebasing wrapper token?")
    .addOptionalParam("log", "Log outputs", false, types.boolean)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { ethers, users } = hre;
        const kresko = hre.Diamond.connect(users.operator);
        const { symbol, cFactor, oracleAddr, marketStatusOracleAddr, log } = taskArgs;

        const logger = getLogger("add-collateral", log);

        if (cFactor == 1000) {
            console.error("Invalid cFactor for", symbol);
            return;
        }

        const Collateral = await ethers.getContract<MockERC20>(symbol);

        logger.log("Collateral address", Collateral.address);

        const collateralAsset = await kresko.collateralAsset(Collateral.address);
        const anchor = await hre.deployments.getOrNull(anchorTokenPrefix + symbol);
        const exists = collateralAsset.exists;

        if (exists) {
            logger.warn(`Collateral ${symbol} already exists!`);
        } else {
            const tx = await kresko.addCollateralAsset(
                Collateral.address,
                anchor?.address ?? ethers.constants.AddressZero,
                toFixedPoint(cFactor),
                oracleAddr,
                marketStatusOracleAddr,
            );
            await tx.wait();
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
        return;
    });
