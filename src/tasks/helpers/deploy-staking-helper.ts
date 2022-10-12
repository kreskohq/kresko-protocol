import { deployWithSignatures, getLogger } from "@utils/deployment";
import { task, types } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import type { KrStaking, KrStakingHelper, UniswapV2Factory, UniswapV2Router02 } from "types";

task("deploy-staking-helper")
    .addOptionalParam("routerAddr", "Address of uni router")
    .addOptionalParam("factoryAddr", "Address of uni factory")
    .addOptionalParam("stakingAddr", "Address of staking")
    .addOptionalParam("wait", "wait confirmations", 1, types.int)
    .addOptionalParam("log", "log deploy information", true, types.boolean)
    .setAction(async function (taskArgs: TaskArguments, hre) {
        const { getNamedAccounts, ethers } = hre;
        const { deployer } = await getNamedAccounts();
        const deploy = deployWithSignatures(hre);
        const { routerAddr, factoryAddr, stakingAddr, log } = taskArgs;
        const logger = getLogger("deploy-staking-helper", log);
        let Router: UniswapV2Router02;
        let Factory: UniswapV2Factory;
        let KrStaking: KrStaking;

        if (!routerAddr) {
            Router = await ethers.getContract("UniswapV2Router02");
        } else {
            Router = await ethers.getContractAt("UniswapV2Router02", routerAddr);
        }
        if (!factoryAddr) {
            Factory = await ethers.getContract("UniswapV2Factory");
        } else {
            Factory = await ethers.getContractAt("UniswapV2Factory", factoryAddr);
        }
        if (!stakingAddr) {
            KrStaking = await ethers.getContract("KrStaking");
        } else {
            KrStaking = await ethers.getContractAt("KrStaking", stakingAddr);
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

        const [KrStakingHelper] = await deploy<KrStakingHelper>("KrStakingHelper", {
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
