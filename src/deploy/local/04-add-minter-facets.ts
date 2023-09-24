import { getMinterInitializer, minterFacets } from "@deploy-config/shared";
import type { DeployFunction } from "hardhat-deploy/types";
import { getLogger } from "@kreskolabs/lib";
import { addFacets } from "@scripts/add-facets";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const logger = getLogger("init-minter-facets");

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    if (!hre.Diamond.address) {
        throw new Error("Diamond not deployed");
    }

    const initializer = await getMinterInitializer(hre);

    await addFacets({
        names: minterFacets,
        initializerName: initializer.name,
        initializerFunction: "initializeMinter",
        initializerArgs: initializer.args,
    });
    logger.success("Added minter facets and saved to diamond");
};

deploy.tags = ["minter-test", "local", "minter-init", "all", "minter-facets", "add-facets"];
deploy.dependencies = ["diamond-init", "gnosis-safe"];
// deploy.skip = async hre => hre.network.live;

export default deploy;
