import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";
import { testnetConfigs } from "src/deploy-config";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-kresko");
    logger.log(`Deploying Kresko in ${hre.network.name}`);
    const { treasury } = await hre.getNamedAccounts();
    const params = testnetConfigs[hre.network.name].protocolParams;
    await hre.run("deploy:kresko", {
        feeRecipient: treasury,
        minimumCollateralizationRatio: params.minimumCollateralizationRatio,
        burnFee: params.burnFee,
        secondsUntilPriceStale: params.secondsUntilPriceStale,
        minimumDebtValue: params.minimumDebtValue,
        liquidationIncentive: params.liquidationIncentive,
    });
    logger.log("Kresko deployed");
};

func.skip = async hre => {
    return !!(await hre.deployments.getOrNull("Kresko"));
};
func.tags = ["auroratest", "deploy-kresko"];

export default func;
