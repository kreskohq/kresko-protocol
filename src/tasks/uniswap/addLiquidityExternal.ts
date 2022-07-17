import { getLogger } from "@utils/deployment";
import { fromBig, toBig } from "@utils/numbers";
import { task, types } from "hardhat/config";
import { UniswapV2Pair } from "types";

task("addliquidity:external")
    .addOptionalParam("log", "log information", true, types.boolean)
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .setAction(async (taskArgs, hre) => {
        const { ethers, deployments } = hre;
        const { log } = taskArgs;
        const USDC = await ethers.getContract<Token>("USDC");
        const { deployer } = await hre.getNamedAccounts();
        const logger = getLogger("addLiquidityExternal", log);

        await USDC.mint(deployer, toBig("10000000", 6));

        if (hre.network.name === "auroratest") {
            /**  Aurora/USDC */
            const Aurora = await ethers.getContract<Token>("AURORA");
            const auroraFeedDeployment = await deployments.get("AURORAUSD");
            const auroraFeed = await ethers.getContractAt<FluxPriceFeed>(
                auroraFeedDeployment.abi,
                auroraFeedDeployment.address,
            );
            const AuroraValue = fromBig(await auroraFeed.latestAnswer(), 8);
            const AURORADepositAmount = 200000;

            await Aurora.mint(deployer, toBig(AURORADepositAmount));

            const AURORAUSDCPair: UniswapV2Pair = await hre.run("uniswap:addliquidity", {
                tknA: {
                    address: USDC.address,
                    amount: Number((Number(AuroraValue) * AURORADepositAmount).toFixed(0)),
                },
                tknB: {
                    address: Aurora.address,
                    amount: AURORADepositAmount,
                },
                skipIfLiqExists: true,
            });

            hre.uniPairs["AURORA/USDC"] = AURORAUSDCPair;

            logger.success("Succesfully added AURORA/USDC liquidity @ ", AURORAUSDCPair.address);
        } else if (hre.network.name === "opkovan" || hre.network.name === "opgoerli") {
            /**  wNEAR/USDC */
            const OP = await ethers.getContract<Token>("OP");
            const OracleDeployment = await deployments.get("OPUSD");
            const Oracle = await ethers.getContractAt<FluxPriceFeed>(OracleDeployment.abi, OracleDeployment.address);
            const OPValue = fromBig(await Oracle.latestAnswer(), 8);
            const OPDepositAmount = 600000;

            await OP.mint(deployer, toBig(OPDepositAmount));

            const OPUSDC: UniswapV2Pair = await hre.run("uniswap:addliquidity", {
                tknA: {
                    address: USDC.address,
                    amount: Number((Number(OPValue) * OPDepositAmount).toFixed(0)),
                },
                tknB: {
                    address: OP.address,
                    amount: OPDepositAmount,
                },
                skipIfLiqExists: true,
            });

            hre.uniPairs["OP/USDC"] = OPUSDC;

            logger.success("Succesfully added OP/USDC liquidity @ ", OPUSDC.address);
        }

        return;
    });
