import { getSCDPInitializer, scdpFacets } from "@deploy-config/shared";
import { getLogger } from "@kreskolabs/lib";
import { addFacets } from "@scripts/add-facets";
import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const logger = getLogger("init-scdp-facets");

const deploy: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    if (!hre.Diamond.address) {
        throw new Error("Diamond not deployed");
    }

    const initializer = await getSCDPInitializer(hre);

    await addFacets({
        names: scdpFacets,
        initializerName: initializer.name,
        initializerFunction: "initializeSCDP",
        initializerArgs: initializer.args,
    });

    logger.success("Added SCDP facets, saved to diamond");
};

deploy.tags = ["minter-test", "local", "minter-init", "all", "add-facets"];
deploy.dependencies = ["diamond-init", "minter-facets"];
deploy.skip = async hre => hre.network.live;

export default deploy;
