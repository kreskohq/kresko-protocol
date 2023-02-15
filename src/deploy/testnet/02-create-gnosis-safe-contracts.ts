import { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { testnetConfigs } from "@deploy-config/testnet-goerli";

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();
    const { deploy } = deployments;

    const logger = getLogger("gnosis-safe-contracts-for-tests");

    switch (hre.network.name) {
        case "opgoerli": {
            const config = testnetConfigs[hre.network.name];
            const gnosisSafeDeployments = config.gnosisSafeDeployments;

            const simulateTxAccesorInfo = gnosisSafeDeployments.find(i => i.contractName === "SimulateTxAccesor");
            await deployments.save("SimulateTxAccessor", {
                abi: simulateTxAccesorInfo.abi,
                address: simulateTxAccesorInfo.networkAddresses.opgoerli,
            });

            const gnosisSafeProxyFactoryInfo = gnosisSafeDeployments.find(
                i => i.contractName === "GnosisSafeProxyFactory",
            );
            await deployments.save("GnosisSafeProxyFactory", {
                abi: gnosisSafeProxyFactoryInfo.abi,
                address: gnosisSafeProxyFactoryInfo.networkAddresses.opgoerli,
            });

            const compatibilityFallbackHandlerInfo = gnosisSafeDeployments.find(
                i => i.contractName === "CompatibilityFallbackHandler",
            );
            await deployments.save("CompatibilityFallbackHandler", {
                abi: compatibilityFallbackHandlerInfo.abi,
                address: compatibilityFallbackHandlerInfo.networkAddresses.opgoerli,
            });

            const createCallInfo = gnosisSafeDeployments.find(i => i.contractName === "CreateCall");
            await deployments.save("CreateCall", {
                abi: createCallInfo.abi,
                address: createCallInfo.networkAddresses.opgoerli,
            });

            const multiSendInfo = gnosisSafeDeployments.find(i => i.contractName === "MultiSend");
            await deployments.save("MultiSend", {
                abi: multiSendInfo.abi,
                address: multiSendInfo.networkAddresses.opgoerli,
            });

            const multiSendCallOnlyInfo = gnosisSafeDeployments.find(i => i.contractName === "MultiSendCallOnly");
            await deployments.save("MultiSendCallOnly", {
                abi: multiSendCallOnlyInfo.abi,
                address: multiSendCallOnlyInfo.networkAddresses.opgoerli,
            });

            const signMessageLibInfo = gnosisSafeDeployments.find(i => i.contractName === "SignMessageLib");
            await deployments.save("SignMessageLib", {
                abi: signMessageLibInfo.abi,
                address: signMessageLibInfo.networkAddresses.opgoerli,
            });

            const gnosisSafeL2Info = gnosisSafeDeployments.find(i => i.contractName === "GnosisSafeL2");
            await deployments.save("GnosisSafeL2", {
                abi: gnosisSafeL2Info.abi,
                address: gnosisSafeL2Info.networkAddresses.opgoerli,
            });

            // // No ReentrancyTransactionGuard contract so we'll deploy it manually
            // const reentrancyTransactionGuardName = "ReentrancyGuard"
            // const ReentrancyTransactionGuardArtifact = await hre.deployments.getOrNull(reentrancyTransactionGuardName);
            // let ReentrancyTransactionGuardContract: Contract;
            // // Deploy the ReentrancyTransactionGuard contract if it does not exist
            // if (!ReentrancyTransactionGuardArtifact) {
            //     [ReentrancyTransactionGuardContract] = await hre.deploy(reentrancyTransactionGuardName, { from: deployer, log: true });
            //     await deployments.save("ReentrancyTransactionGuard", {
            //         abi: ReentrancyTransactionGuardArtifact.abi,
            //         address:   ReentrancyTransactionGuardContract.address,
            //     });
            // }

            break;
        }
        case "hardhat": {
            await deploy("GnosisSafeProxyFactory", {
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

            break;
        }
        default: {
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

            break;
        }
    }
    logger.success("safe contracts succesfully deployed");
};

deploy.tags = ["testnet", "gnosis-safe", "all"];
export default deploy;
