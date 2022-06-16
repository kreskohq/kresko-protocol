import { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();
    const { deploy } = deployments;

    await deploy("SimulateTxAccessor", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: false,
    });

    await deploy("GnosisSafeProxyFactory", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: false,
    });

    await deploy("DefaultCallbackHandler", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: false,
    });

    await deploy("CompatibilityFallbackHandler", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: false,
    });

    await deploy("CreateCall", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: false,
    });

    await deploy("MultiSend", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: false,
    });

    await deploy("MultiSendCallOnly", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: false,
    });

    await deploy("SignMessageLib", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: false,
    });

    await deploy("GnosisSafe", {
        from: deployer,
        args: [],
        log: true,
        deterministicDeployment: false,
    });
};

deploy.tags = ["auroratest", "gnosis-safe"];
export default deploy;
