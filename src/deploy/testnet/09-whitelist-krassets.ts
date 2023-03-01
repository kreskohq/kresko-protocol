import { HardhatRuntimeEnvironment } from "hardhat/types";
import { testnetConfigs } from "@deploy-config/testnet-goerli";
import type { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib";
import { getOracle } from "@utils/general";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("add-krasset");
    const krAssets = testnetConfigs[hre.network.name].krAssets;
    for (const krAsset of krAssets) {
        if (!krAsset.oracle) {
            logger.warn(`skipping ${krAsset.name}/${krAsset.symbol} as it has no oracle`);
            continue;
        }
        logger.log(`whitelisting ${krAsset.name}/${krAsset.symbol}`);
        const inHouseOracleAddr = await getOracle(krAsset.oracle.description, hre);
        const oracleAddr =
            hre.network.name !== "hardhat" ? krAsset.oracle.chainlink || inHouseOracleAddr : inHouseOracleAddr;
        await hre.run("add-krasset", {
            symbol: krAsset.symbol,
            kFactor: krAsset.kFactor,
            supplyLimit: 2_000_000_000,
            oracleAddr: oracleAddr,
            marketStatusOracleAddr: inHouseOracleAddr,
        });
    }
    logger.success("Succesfully whitelisted all krAssets");
};

func.tags = ["testnet", "whitelist-krassets", "all"];
func.dependencies = ["minter-init", "kresko-assets"];

export default func;
