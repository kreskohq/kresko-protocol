import { testnetConfigs } from "@deploy-config/arbitrumGoerli";
import { getLogger } from "@kreskolabs/lib";
import { TASK_WHITELIST_KRASSET } from "@tasks";
import type { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const logger = getLogger(TASK_WHITELIST_KRASSET);

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const krAssets = testnetConfigs[hre.network.name].krAssets;
    for (const krAsset of krAssets) {
        if (!krAsset.oracle?.chainlink || !krAsset.price) {
            logger.warn(`skipping ${krAsset.name}/${krAsset.symbol} as it has no oracle`);
            continue;
        }
        logger.log(`whitelisting ${krAsset.name}/${krAsset.symbol}`);

        const oracleAddr = hre.network.live
            ? krAsset.oracle.chainlink
            : (
                  await hre.deploy("MockOracle", {
                      deploymentName: "MockOracle_" + krAsset.symbol,
                      args: [`${krAsset.symbol}/USD`, await krAsset.price(), 8],
                  })
              )[0].address;

        await hre.run(TASK_WHITELIST_KRASSET, {
            symbol: krAsset.symbol,
            kFactor: krAsset.kFactor,
            supplyLimit: 2_000_000_000,
            oracleAddr: oracleAddr,
        });
    }
    logger.success("Succesfully whitelisted all krAssets");
};

deploy.tags = ["local", "whitelist-krassets", "all"];
deploy.dependencies = ["minter-init", "kresko-assets"];
// deploy.skip = async hre => hre.network.live;

export default deploy;
