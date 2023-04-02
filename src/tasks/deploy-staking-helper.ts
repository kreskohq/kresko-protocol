import { getLogger } from "@kreskolabs/lib";
import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { TASK_DEPLOY_STAKING_HELPER } from "./names";

task(TASK_DEPLOY_STAKING_HELPER)
    .addOptionalParam("routerAddr", "Address of uni router")
    .addOptionalParam("factoryAddr", "Address of uni factory")
    .addOptionalParam("stakingAddr", "Address of staking")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("log", "log deploy information", true, types.boolean)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { routerAddr, factoryAddr, stakingAddr, log } = taskArgs;
        const logger = getLogger(TASK_DEPLOY_STAKING_HELPER, log);

        logger.log("Deploying KrStakingHelper");
        const { getNamedAccounts } = hre;
        const { deployer } = await getNamedAccounts();

        let Router: UniV2Router;
        let Factory: UniV2Factory;
        let KrStaking: TC["KrStaking"];

        if (!routerAddr) {
            Router = await hre.getContractOrFork("UniswapV2Router02");
        } else {
            Router = await hre.ethers.getContractAt("UniswapV2Router02", routerAddr);
        }
        if (!factoryAddr) {
            Factory = await hre.getContractOrFork("UniswapV2Factory");
        } else {
            Factory = await hre.ethers.getContractAt("UniswapV2Factory", factoryAddr);
        }
        if (!stakingAddr) {
            KrStaking = await hre.getContractOrFork("KrStaking");
        } else {
            KrStaking = await hre.ethers.getContractAt("KrStaking", stakingAddr);
        }

        if (!Router) {
            throw new Error("No router found");
        }
        if (!KrStaking) {
            throw new Error("No staking found");
        }
        if (!Factory) {
            throw new Error("No factory found");
        }

        const [KrStakingHelper] = await hre.deploy("KrStakingHelper", {
            args: [Router.address, Factory.address, KrStaking.address],
            log,
            from: deployer,
        });
        const OPERATOR_ROLE = await KrStaking.OPERATOR_ROLE();
        if (!(await KrStaking.hasRole(OPERATOR_ROLE, KrStakingHelper.address))) {
            logger.log("Granting operator role for", KrStakingHelper.address);
            await KrStaking.grantRole(OPERATOR_ROLE, KrStakingHelper.address);
        }

        logger.success("Succesfully deployed KrStakingHelper @", KrStakingHelper.address);
        return KrStakingHelper;
    });
