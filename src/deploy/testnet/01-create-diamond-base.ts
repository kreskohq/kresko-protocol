import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, FacetCut } from "@kreskolabs/hardhat-deploy/types";
import { mergeABIs } from "@kreskolabs/hardhat-deploy/dist/src/utils";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { diamondFacets } from "@deploy-config/shared";
import type { Kresko } from "types/typechain";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { ethers, getNamedAccounts, deploy, deployments } = hre;

    const logger = getLogger("create-diamond");

    // #1 Do not use `add-facets.ts` for the initial diamond, set the initial facets in the constructor
    const InitialFacets: FacetCut[] = [];
    const ABIs = [];

    const { deployer } = await getNamedAccounts();

    // #1.1 If deployed, set existing artifacts to runtime environment
    const DiamondDeployment = await deployments.getOrNull("Diamond");
    if (DiamondDeployment) {
        logger.log("Diamond already deployed");
        const DiamondFullABI = await ethers.getContractAt<Kresko>("Kresko", DiamondDeployment.address);
        hre.Diamond = DiamondFullABI;
        hre.DiamondDeployment = DiamondDeployment;
        return;
    }

    // #2 Only Diamond-specific facets
    for (const facet of diamondFacets) {
        const [FacetContract, sigs] = await deploy(facet, {
            from: deployer,
            log: true,
        });
        const args = hre.getAddFacetArgs(FacetContract, sigs);
        const Artifact = await deployments.getArtifact(facet);
        InitialFacets.push(args.facetCut);
        ABIs.push(Artifact.abi);
    }

    const [DiamondContract, _signatures, deployment] = await deploy("Diamond", {
        from: deployer,
        args: [deployer, InitialFacets, []],
    });

    const DiamondFullABI = await ethers.getContractAt<Kresko>("Kresko", DiamondContract.address);
    deployment.facets = (await DiamondFullABI.facets()).map(f => ({
        facetAddress: f.facetAddress,
        functionSelectors: f.functionSelectors,
    }));

    // #3 Eventhough we have the full ABI from the `diamondAbi` extension already, bookkeep the current status in deployment separately
    // #4 Using `add-facets.ts` will do this automatically - check #1 why we are not using it here.
    deployment.abi = mergeABIs([deployment.abi, ...ABIs], { check: true, skipSupportsInterface: false });
    await deployments.save("Diamond", deployment);

    // #5 Save the deployment result and the contract instance with full ABI to the runtime to access on later steps.
    hre.Diamond = DiamondFullABI;
    hre.DiamondDeployment = deployment;

    logger.success("Diamond deployed @", DiamondContract.address, "with", deployment.facets.length, "facets");
};

func.tags = ["minter-test", "testnet", "diamond-init", "all"];

export default func;
