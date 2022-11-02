import { removeFacet } from "@scripts/remove-facet";
import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";

const TASK_NAME = "replace-facet";

task(TASK_NAME)
    .addParam("name", "Artifact/Contract name of the facet")
    .addOptionalParam("initializerName", "Contract to delegatecall to when adding the facet")
    .addOptionalParam("initializerArgs", "Args to delegatecall when adding the facet", "0x", types.string)
    .setAction(async function ({ name, initializerName, initializerArgs }: TaskArguments, hre) {
        const Deployed = await hre.deployments.getOrNull("Diamond");
        if (!Deployed) {
            throw new Error(`No diamond deployed @ ${hre.network.name}`);
        }
        await removeFacet({ name, initializerName, initializerArgs });
        await hre.run("add-facet", {
            name,
            initializerName,
            initializerArgs,
        });
    });
