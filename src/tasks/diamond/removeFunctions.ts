import { task, types } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { FacetCut, FacetCutAction } from "@kreskolabs/hardhat-deploy/dist/types";
import { getLogger } from "@utils/deployment";
import { constants } from "ethers";
import { FullDiamond } from "types";

const TASK_NAME = "remove-function";

task(TASK_NAME)
    .addParam("name", "Artifact/Contract name of the facet")
    .addOptionalParam(
        "initAddress",
        "Address to delegatecall to when adding the facet",
        constants.AddressZero,
        types.string,
    )
    .addOptionalParam("initParams", "Address to delegatecall to when adding the facet", "0x", types.string)
    .setAction(async function ({ name, initAddress, initParams }: TaskArguments, hre) {
        const logger = getLogger(TASK_NAME);
        const { ethers, deployments } = hre;

        const Deployed = await hre.deployments.getOrNull("Diamond");
        if (!Deployed) {
            throw new Error(`No diamond deployed @ ${hre.network.name}`);
        }
        const Diamond = await ethers.getContractAt<FullDiamond>("FullDiamond", Deployed.address);
        // Single facet addition, maps all functions contained
        const [Facet, Signatures] = await hre.deploy(name);

        const Cut: FacetCut = {
            facetAddress: Facet.address,
            functionSelectors: Signatures,
            action: FacetCutAction.Add,
        };
        const tx = await Diamond.diamondCut([Cut], initAddress, initParams);
        await tx.wait();

        const facets = (await Diamond.facets()).map(f => ({
            facetAddress: f.facetAddress,
            functionSelectors: f.functionSelectors,
        }));

        if (!facets.find(f => f.facetAddress === Facet.address)) {
            logger.error("Facet add failed");
        } else {
            logger.success("Facet add success");
            Deployed.facets = facets;
            await deployments.save("Diamond", Deployed);
        }
        return Facet;
    });
