import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { getLogger } from "@utils/deployment";
import { testnetConfigs } from "src/config/deployment";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("whitelist-collateral");

    const collaterals = testnetConfigs[hre.network.name].collaterals;
    for (const collateral of collaterals) {
        logger.log(`whitelisting collateral: ${collateral.name}/${collateral.symbol}`);
        await hre.run("add-collateral", {
            symbol: collateral.symbol,
            cFactor: collateral.cFactor,
            oracleAddr: (await hre.ethers.getContract(collateral.oracle.name)).address,
            log: !process.env.TEST,
        });
    }

    logger.success("Succesfully whitelisted collaterals");
};

func.tags = ["testnet", "whitelist-collaterals", "all"];
func.dependencies = ["minter-init", "whitelist-krassets"];

export default func;
