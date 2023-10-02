import { DeployFunction, FacetCut, FacetCutAction } from "hardhat-deploy/dist/types";
import { mergeABIs } from "hardhat-deploy/dist/src/utils";
import { getLogger } from "@kreskolabs/lib/meta";
import { diamondFacets } from "@deploy-config/shared";

const logger = getLogger("create-diamond");

const deploy: DeployFunction = async function (hre) {
    // #1 Do not use `add-facets.ts` for the initial diamond, set the initial facets in the constructor
    const InitialFacets: FacetCut[] = [];
    const ABIs = [];

    const { deployer } = await hre.getNamedAccounts();

    // if (hre.network.live) {
    //     throw new Error("Trying to use local deployment script on live network.");
    // }

    // #1.1 If deployed, set existing artifacts to runtime environment
    const DiamondDeployment = await hre.deployments.getOrNull("Diamond");
    if (DiamondDeployment) {
        logger.log("Diamond already deployed");
        const DiamondFullABI = await hre.getContractOrFork("Kresko");
        hre.Diamond = DiamondFullABI;
        hre.DiamondDeployment = DiamondDeployment;
        return;
    }

    // #2 Only Diamond-specific facets
    for (const facet of diamondFacets) {
        const [, sigs, facetDeployment] = await hre.deploy(facet, {
            from: deployer,
            log: true,
        });

        // const args = await hre.getFacetCut(facet, 0, sigs);
        const facetCutAdd = {
            facetAddress: facetDeployment.address,
            action: FacetCutAction.Add,
            functionSelectors: sigs,
        };
        const Artifact = await hre.deployments.getArtifact(facet);
        InitialFacets.push(facetCutAdd);
        ABIs.push(Artifact.abi);
    }
    const [, , deployment] = await hre.deploy("Diamond", {
        from: deployer,
        log: true,
        args: [deployer, InitialFacets, []],
    });

    const Diamond = await hre.getContractOrFork("Kresko");

    deployment.facets = (await Diamond.facets()).map(f => ({
        facetAddress: f.facetAddress,
        functionSelectors: f.functionSelectors,
    }));
    deployment.abi = mergeABIs([deployment.abi, ...ABIs], {
        check: false,
        skipSupportsInterface: false,
    });
    await hre.deployments.save("Diamond", deployment);
    // #3 Eventhough we have the full ABI from the `diamondAbi` extension already, bookkeep the current status in deployment separately
    // #4 Using `add-facets.ts` will do this automatically - check #1 why we are not using it here.

    // #5 Save the deployment result and the contract instance with full ABI to the runtime to access on later steps.
    hre.Diamond = Diamond;
    hre.DiamondDeployment = deployment;

    logger.success("Diamond deployed @", Diamond.address, "with", deployment.facets.length, "facets");
};

deploy.tags = ["all", "local", "protocol-test", "diamond-init"];
// deploy.skip = async hre => hre.network.live;

export default deploy;
