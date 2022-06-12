import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, FacetCut } from "@kreskolabs/hardhat-deploy/types";
import { mergeABIs } from "@kreskolabs/hardhat-deploy/dist/src/utils";
import { getLogger } from "@utils/deployment";
import { Kresko } from "types/typechain";
import { facets } from "src/contracts/diamond/config/config";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-diamond");
    const { ethers, getNamedAccounts, deploy, deployments } = hre;
    const { deployer, admin } = await getNamedAccounts();

    // Do not use `add-facets.ts` for the initial diamond, set the initial facets in the constructor
    const InitialFacets: FacetCut[] = [];
    const ABIs = [];
    for (const facet of facets) {
        const [FacetContract, sigs] = await deploy(facet);
        const args = hre.getAddFacetArgs(FacetContract, sigs);
        const Artifact = await deployments.getArtifact(facet);
        InitialFacets.push(args.facetCut);
        ABIs.push(Artifact.abi);
    }
    const [DiamondContract, _signatures, deployment] = await deploy("Diamond", {
        from: deployer,
        args: [admin, InitialFacets, []],
    });

    const DiamondWithABI = await ethers.getContractAt<Kresko>("Kresko", DiamondContract.address);
    deployment.facets = (await DiamondWithABI.facets()).map(f => ({
        facetAddress: f.facetAddress,
        functionSelectors: f.functionSelectors,
    }));

    deployment.abi = mergeABIs([deployment.abi, ...ABIs], { check: true, skipSupportsInterface: false });
    await deployments.save("Diamond", deployment);

    logger.success("Diamond deployed @", DiamondContract.address, "with", deployment.facets.length, "facets");

    hre.Diamond = DiamondWithABI;
    hre.DiamondDeployment = deployment;
};

func.tags = ["local", "diamond-init", "diamond"];

export default func;
