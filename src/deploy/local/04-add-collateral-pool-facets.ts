import { collateralPoolFacets, getCollateralPoolInitializer } from "@deploy-config/shared";
import { getLogger } from "@kreskolabs/lib";
import { addFacets } from "@scripts/add-facets";
import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const logger = getLogger("init-minter");

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    if (!hre.Diamond.address) {
        throw new Error("Diamond not deployed");
    }

    const initializer = await getCollateralPoolInitializer(hre);

    await addFacets({
        names: collateralPoolFacets,
        initializerName: initializer.name,
        initializerArgs: initializer.args,
    });
    logger.success("Added collateral pool facets, saved to diamond");
};

deploy.tags = ["minter-test", "local", "minter-init", "all", "add-facets"];
deploy.dependencies = ["diamond-init", "minter-facets"];
deploy.skip = async hre => hre.network.live;

export default deploy;