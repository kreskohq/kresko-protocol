import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { testnetConfigs } from "@deploy-config/opgoerli";

const logger = getLogger("gnosis-safe-contracts-for-tests");

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployer } = await hre.ethers.getNamedSigners();
    switch (hre.network.name) {
        // For public chains we use the pre-deployed contracts
        case "opgoerli": {
            const config = testnetConfigs[hre.network.name];
            const gnosisSafeDeployments = config.gnosisSafeDeployments;
            if (!gnosisSafeDeployments) {
                throw new Error("No gnosis safe deployments found");
            }

            const simulateTxAccesorInfo = gnosisSafeDeployments.find(i => i.contractName === "SimulateTxAccesor")!;
            await hre.deployments.save("SimulateTxAccessor", {
                abi: simulateTxAccesorInfo!.abi,
                address: simulateTxAccesorInfo!.networkAddresses.opgoerli,
            });

            const gnosisSafeProxyFactoryInfo = gnosisSafeDeployments.find(
                i => i.contractName === "GnosisSafeProxyFactory",
            )!;
            await hre.deployments.save("GnosisSafeProxyFactory", {
                abi: gnosisSafeProxyFactoryInfo.abi,
                address: gnosisSafeProxyFactoryInfo.networkAddresses.opgoerli,
            });

            const compatibilityFallbackHandlerInfo = gnosisSafeDeployments.find(
                i => i.contractName === "CompatibilityFallbackHandler",
            )!;
            await hre.deployments.save("CompatibilityFallbackHandler", {
                abi: compatibilityFallbackHandlerInfo.abi,
                address: compatibilityFallbackHandlerInfo.networkAddresses.opgoerli,
            });

            const createCallInfo = gnosisSafeDeployments!.find(i => i.contractName === "CreateCall")!;
            await hre.deployments.save("CreateCall", {
                abi: createCallInfo.abi,
                address: createCallInfo.networkAddresses.opgoerli,
            });

            const multiSendInfo = gnosisSafeDeployments!.find(i => i.contractName === "MultiSend")!;
            await hre.deployments.save("MultiSend", {
                abi: multiSendInfo.abi,
                address: multiSendInfo.networkAddresses.opgoerli,
            });

            const multiSendCallOnlyInfo = gnosisSafeDeployments!.find(i => i.contractName === "MultiSendCallOnly")!;
            await hre.deployments.save("MultiSendCallOnly", {
                abi: multiSendCallOnlyInfo.abi,
                address: multiSendCallOnlyInfo.networkAddresses.opgoerli,
            });

            const signMessageLibInfo = gnosisSafeDeployments!.find(i => i.contractName === "SignMessageLib")!;
            await hre.deployments.save("SignMessageLib", {
                abi: signMessageLibInfo.abi,
                address: signMessageLibInfo.networkAddresses.opgoerli,
            });

            const gnosisSafeL2Info = gnosisSafeDeployments!.find(i => i.contractName === "GnosisSafeL2")!;
            await hre.deployments.save("GnosisSafeL2", {
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
            await hre.deploy("GnosisSafeProxyFactory", {
                from: deployer.address,
                args: [],
                log: true,
                deterministicDeployment: true,
            });

            await hre.deploy("GnosisSafe", {
                from: deployer.address,
                args: [],
                log: true,
                deterministicDeployment: true,
            });

            await hre.deploy("GnosisSafeL2", {
                from: deployer.address,
                args: [],
                log: true,
                deterministicDeployment: true,
            });

            break;
        }
        default: {
            throw new Error("Invalid network for gnosis safe contract deployment");
        }
    }
    logger.success("safe contracts succesfully deployed");
};

deploy.tags = ["local", "gnosis-safe", "all"];
deploy.skip = async hre => hre.network.live;
export default deploy;
