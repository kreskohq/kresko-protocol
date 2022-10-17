import { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
    getProxyFactoryDeployment,
    getDefaultCallbackHandlerDeployment,
    getCompatibilityFallbackHandlerDeployment,
    getCreateCallDeployment,
    getMultiSendDeployment,
    getMultiSendCallOnlyDeployment,
    getSignMessageLibDeployment,
    getSafeSingletonDeployment,
    getSafeL2SingletonDeployment
} from "@gnosis.pm/safe-deployments";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();
    const { deploy } = deployments;

    const logger = getLogger("gnosis-safe-contracts-for-tests");

    // Each deployment method takes an optional DeploymentFilter as a parameter:
    //
    // interface DeploymentFilter {
    //     version?: string,
    //     released?: boolean, // Defaults to true if no filter is specified
    //     network?: string // Chain id of the network
    // }

    // const GoerliNetworkParams = { network: "420", version: "1.0.0" }

    // const proxyFactory = getProxyFactoryDeployment(GoerliNetworkParams)
    // const defaultCallbackHandler = getDefaultCallbackHandlerDeployment(GoerliNetworkParams)
    // const compatibilityFallbackHandler = getCompatibilityFallbackHandlerDeployment(GoerliNetworkParams)
    // const createCallLib = getCreateCallDeployment(GoerliNetworkParams)
    // const multiSendLib = getMultiSendDeployment(GoerliNetworkParams)
    // const multiSendCallOnlyLib = getMultiSendCallOnlyDeployment(GoerliNetworkParams)
    // const signMessageLib = getSignMessageLibDeployment(GoerliNetworkParams)
    // const gnosisSafeSingleton = getSafeSingletonDeployment(GoerliNetworkParams)
    // getSimulateTxAccesorDeployment available in latest 'main' branch but not v1.3.0 deployment
    // const simulateTxAccessor = getSimulateTxAccesorDeployment(GoerliNetworkParams)

    // gnosisSafeL2Singleton: gnosisSafe version with additional events used on L2 networks
    const gnosisSafeL2Singleton = getSafeL2SingletonDeployment({ network: "5" })
    console.log(gnosisSafeL2Singleton)

    // TODO: no ReentrancyTransactionGuard replacement
    // await deploy("ReentrancyTransactionGuard", {
    //     from: deployer,
    //     args: [],
    //     log: true,
    //     deterministicDeployment: true,
    // });

    logger.success("safe contracts succesfully deployed");
};

deploy.tags = ["testnet", "gnosis-safe", "all"];
export default deploy;
