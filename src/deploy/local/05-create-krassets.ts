import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { createKrAsset } from "@scripts/create-krasset";
import { getLogger } from "@utils/deployment";
import type { HardhatRuntimeEnvironment } from "hardhat/types";
import minterConfig from "src/config/minter";

const func: DeployFunction = async function (_hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("create-krassets");
    const [name, symbol] = minterConfig.krAssets.test[0];
    const { contract, wrapper } = await createKrAsset(name, symbol);

    logger.success("Succesfully deployed elastic supply krAsset", symbol + "-e", "address:", contract.address);
    logger.success("Succesfully deployed fixed supply krAsset", symbol, "address:", wrapper.address);
};

func.tags = ["local", "kresko-asset", "all"];
func.dependencies = ["minter-init"];
export default func;
