import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";
import { testnetConfigs } from "src/deploy-config";
import { NonceManager } from "@ethersproject/experimental";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-kresko");
    logger.log(`Deploying Kresko Protocol in ${hre.network.name}`);
    const { treasury } = await hre.getNamedAccounts();
    const params = testnetConfigs[hre.network.name].protocolParams;

    // Increase nonce a bit for different address space
    if (hre.network.name === "localhost" || hre.network.name === "hardhat") {
        const { deployer } = await hre.ethers.getNamedSigners();

        const nonceIncreaseCount = [...Array(150).keys()];
        const nonceManager = new NonceManager(deployer);
        for (const _count of nonceIncreaseCount) {
            await deployer.sendTransaction({ to: deployer.address, data: "0x" });
            nonceManager.incrementTransactionCount();
        }

        console.log("Nonce:", await deployer.getTransactionCount());
    }

    await hre.run("deploy:kresko", {
        feeRecipient: treasury,
        minimumCollateralizationRatio: params.minimumCollateralizationRatio,
        burnFee: params.burnFee,
        minimumDebtValue: params.minimumDebtValue,
        secondsUntilStalePrice: params.secondsUntilStalePrice,
        liquidationIncentive: params.liquidationIncentive,
    });
    logger.log("Kresko deployed");
};

func.skip = async hre => {
    return !!(await hre.deployments.getOrNull("Kresko"));
};
func.tags = ["testnet", "deploy-kresko"];

export default func;
