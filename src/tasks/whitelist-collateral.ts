import { fromBig, getLogger, toBig } from "@kreskolabs/lib";
import type { TaskArguments } from "hardhat/types";

import { anchorTokenPrefix } from "@deploy-config/shared";
import { task, types } from "hardhat/config";
import { TASK_WHITELIST_COLLATERAL } from "./names";

task(TASK_WHITELIST_COLLATERAL)
    .addParam("symbol", "Name of the collateral")
    .addParam("cFactor", "cFactor for the collateral", 1000, types.float)
    .addParam("oracleAddr", "Price feed address")
    .addParam("marketStatusOracleAddr", "Market status oracle address")
    .addOptionalParam("log", "Log outputs", false, types.boolean)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { symbol, cFactor, oracleAddr, marketStatusOracleAddr, log } = taskArgs;
        const logger = getLogger(TASK_WHITELIST_COLLATERAL, log);

        const { deployer } = await hre.ethers.getNamedSigners();

        const kresko = (await hre.getContractOrFork("Kresko")).connect(deployer);

        if (cFactor == 1000) {
            console.error("Invalid cFactor for", symbol);
            return;
        }

        const Collateral = await hre.getContractOrFork("ERC20Upgradeable", symbol);

        logger.log("Collateral address", Collateral.address);

        const collateralAsset = await kresko.collateralAsset(Collateral.address);
        const anchor = await hre.deployments.getOrNull(anchorTokenPrefix + symbol);
        const exists = collateralAsset.exists;

        if (exists) {
            logger.warn(`Collateral ${symbol} already exists!`);
        } else {
            logger.log(
                "Adding collateral",
                symbol,
                "with cFactor",
                cFactor,
                "and oracle",
                oracleAddr,
                "and anchor",
                anchor?.address ?? hre.ethers.constants.AddressZero,
            );
            if (!process.env.LIQUIDATION_INCENTIVE) {
                throw new Error("LIQUIDATION_INCENTIVE is not set");
            }

            const config = {
                anchor: anchor?.address ?? hre.ethers.constants.AddressZero,
                factor: toBig(cFactor),
                liquidationIncentive: toBig(process.env.LIQUIDATION_INCENTIVE!),
                oracle: oracleAddr,
                marketStatusOracle: marketStatusOracleAddr,
                decimals: await Collateral.decimals(),
                exists: true,
            };

            const tx = await kresko.addCollateralAsset(Collateral.address, config);
            if (log) {
                const collateralDecimals = await Collateral.decimals();
                logger.log(symbol, "decimals", collateralDecimals);
                const [value, oraclePrice] = await kresko.getCollateralValueAndOraclePrice(
                    Collateral.address,
                    hre.ethers.utils.parseUnits("1", collateralDecimals),
                    true,
                );

                logger.success(`Sucesfully added ${symbol} as collateral with a cFctor of:`, cFactor);
                logger.log(`1 ${symbol} value: ${fromBig(value, 8)}`);
                logger.log(`1 ${symbol} oracle price: ${fromBig(oraclePrice, 8)}`);
                logger.log("txHash", tx.hash);
            }
        }
        return;
    });
