import { getLogger } from "@utils/deployment";
import { createKrAsset } from "@scripts/create-krasset";
import minterConfig from "src/config/minter";
import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("create-krassets");
    const { Diamond } = hre;
    if (!Diamond.address) {
        throw new Error("Diamond not deployed");
    }
    const [name, symbol] = minterConfig.krAssets.test[0];
    const [KreskoAsset, FixedKreskoAsset] = await createKrAsset(name, symbol);

    logger.success("Succesfully deployed elastic supply krAsset", symbol + "-e", "address:", KreskoAsset.address);
    logger.success("Succesfully deployed fixed supply krAsset", symbol, "address:", FixedKreskoAsset.address);
};

func.tags = ["local", "minter-init", "minter", "diamond"];
func.dependencies = ["diamond-init", "gnosis-safe"];

export default func;
