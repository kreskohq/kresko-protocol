import { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { getLogger } from "@utils/deployment";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();
    const { deploy } = deployments;

    const logger = getLogger("gnosis-safe-contracts-for-tests");

    await deploy("SimulateTxAccessor", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("GnosisSafeProxyFactory", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("DefaultCallbackHandler", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("CompatibilityFallbackHandler", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("CreateCall", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("MultiSend", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("MultiSendCallOnly", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("SignMessageLib", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("GnosisSafe", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("GnosisSafeL2", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    await deploy("ReentrancyTransactionGuard", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: true,
    });

    logger.success("safe contracts succesfully deployed");
};

deploy.tags = ["testnet", "gnosis-safe", "all"];
export default deploy;
