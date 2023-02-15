import { getMinterInitializer, minterFacets } from "@deploy-config/shared";
import type { DeployFunction } from "@kreskolabs/hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { addFacets } from "@scripts/add-facets";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("init-minter");
    const { Diamond } = hre;
    if (!Diamond.address) {
        throw new Error("Diamond not deployed");
    }

    const initializer = await getMinterInitializer(hre);

    // Will save deployment
    await addFacets({
        names: minterFacets,
        initializerName: initializer.name,
        initializerArgs: initializer.args,
    });
    logger.success("Added minter facets and saved to diamond");
};

func.tags = ["minter-test", "testnet", "minter-init", "all", "add-facets"];
func.dependencies = ["diamond-init", "gnosis-safe"];

export default func;
