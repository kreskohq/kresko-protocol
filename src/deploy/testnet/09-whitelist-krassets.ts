import { HardhatRuntimeEnvironment } from "hardhat/types";
import { testnetConfigs } from "@deploy-config/testnet";
import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib/dist/utils";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("add-krasset");
    const krAssets = testnetConfigs[hre.network.name].krAssets;
    for (const krAsset of krAssets) {
        logger.log(`whitelisting ${krAsset.name}/${krAsset.symbol}`);
        await hre.run("add-krasset", {
            symbol: krAsset.symbol,
            kFactor: krAsset.kFactor,
            supplyLimit: 2_000_000_000,
            oracleAddr: (await hre.ethers.getContract(krAsset.oracle.name)).address,
        });
    }
    logger.success("Succesfully whitelisted all krAssets");
};

func.tags = ["testnet", "whitelist-krassets", "all"];
func.dependencies = ["minter-init", "kresko-assets"];

export default func;
