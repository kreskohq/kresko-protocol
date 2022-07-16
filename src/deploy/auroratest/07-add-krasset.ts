import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";
import { testnetConfigs } from "src/deploy-config";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("add-krasset");
    const krAssets = testnetConfigs[hre.network.name].krAssets;
    for (const krAsset of krAssets) {
        logger.log(`whitelisting ${krAsset.name}`);
        await hre.run("kresko:addkrasset", {
            symbol: krAsset.symbol,
            kFactor: krAsset.factor,
            oracleAddr: (await hre.ethers.getContract(krAsset.oracle.name)).address,
        });
    }
    logger.success("Succesfully whitelisted all krAssets");
};

func.tags = ["auroratest"];

export default func;
