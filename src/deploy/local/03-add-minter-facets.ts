import { getMinterInitializer, minterFacets } from "@deploy-config/shared";
import type { DeployFunction } from "hardhat-deploy/dist/types";
import { getLogger } from "@kreskolabs/lib/meta";
import { addFacets } from "@scripts/add-facets";

const logger = getLogger("minter-facets");

const deploy: DeployFunction = async function (hre) {
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
    logger.success("Added: Minter facets");
};

deploy.tags = ["all", "local", "protocol-test", "protocol-init", "minter-facets"];
deploy.dependencies = ["common-facets"];
// deploy.skip = async hre => hre.network.live;

export default deploy;
