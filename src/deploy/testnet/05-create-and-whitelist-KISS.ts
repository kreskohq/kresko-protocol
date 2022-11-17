import { assets, testnetConfigs } from "@deploy-config/testnet";
import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-krasset");

    // Create KISS first
    const { contract: KISSContract } = await hre.run("deploy-kiss", {
        amount: assets.KISS.mintAmount,
        decimals: 18,
    });

    logger.log(`whitelisting KISS`);

    await hre.run("add-krasset", {
        symbol: assets.KISS.symbol,
        kFactor: assets.KISS.kFactor,
        supplyLimit: 2_000_000_000,
        oracleAddr: (await hre.ethers.getContract(assets.KISS.oracle.name)).address,
    });

    await hre.run("add-collateral", {
        symbol: assets.KISS.symbol,
        cFactor: assets.KISS.cFactor,
        oracleAddr: (await hre.ethers.getContract(assets.KISS.oracle.name)).address,
        log: !process.env.TEST,
    });

    await hre.Diamond.updateKISS(KISSContract.address);
    logger.success("Succesfully created KISS");
};
func.skip = async hre => {
    const logger = getLogger("deploy-tokens");
    const krAssets = testnetConfigs[hre.network.name].krAssets;
    const isFinished = await hre.deployments.getOrNull(krAssets[krAssets.length - 1].name);
    isFinished && logger.log("Skipping deploying krAssets");
    return !!isFinished;
};

func.tags = ["testnet", "KISS", "minter-init"];
func.dependencies = ["add-facets", "oracles"];

export default func;
