import { getLogger } from "@utils/deployment";
import minterConfig from "src/config/minter";
import { addFacets } from "@scripts/add-facets";
import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("init-minter");
    const { Diamond } = hre;
    if (!Diamond.address) {
        throw new Error("Diamond not deployed");
    }
    const initializer = await minterConfig.getMinterInitializer(hre);

    // Will save deployment
    await addFacets({
        names: minterConfig.facets,
        initializerName: initializer.name,
        initializerArgs: initializer.args,
    });
    logger.success("Added minter facets and saved to diamond");
};

func.tags = ["testnet", "minter-init", "all"];
func.dependencies = ["diamond-init", "gnosis-safe"];

export default func;
