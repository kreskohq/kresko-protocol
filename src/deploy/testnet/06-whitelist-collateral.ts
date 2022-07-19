import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@utils/deployment";
import { testnetConfigs } from "src/deploy-config";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("whitelist-collateral");

    const collaterals = testnetConfigs[hre.network.name].collaterals;
    for (const collateral of collaterals) {
        logger.log(`whitelisting collateral: ${collateral.name}`);
        await hre.run("kresko:addcollateral", {
            symbol: collateral.symbol,
            cFactor: collateral.cFactor,
            oracleAddr: (await hre.ethers.getContract(collateral.oracle.name)).address,
            log: true,
        });
    }

    logger.success("Succesfully whitelisted collaterals");
};

func.tags = ["testnet", "whitelist-collaterals"];

export default func;
