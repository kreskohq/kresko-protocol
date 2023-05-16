import { getLogger } from "@kreskolabs/lib";
import { task } from "hardhat/config";
import { TASK_UPGRADE_DIAMOND } from "./names";
import { updateFacets } from "@scripts/update-facets";
import { minterFacets } from "@deploy-config/shared";

const logger = getLogger(TASK_UPGRADE_DIAMOND);

task(TASK_UPGRADE_DIAMOND, "Upgrade diamond").setAction(async function (args, hre) {
    logger.log("Upgrading diamond..");
    const [initializer] = await hre.deploy("FacetUpgrade16052023");
    const result = await hre.getContractOrFork("Kresko");
    const { deployer } = await hre.getNamedAccounts();

    const assets = ["0x7ff84e6d3111327ED63eb97691Bf469C7fcE832F", "0x4200000000000000000000000000000000000006"];
    await updateFacets({
        multisig: true,
        facetNames: minterFacets,
        initializer: {
            contract: initializer,
            func: "initialize",
            args: [],
        },
    });
});
