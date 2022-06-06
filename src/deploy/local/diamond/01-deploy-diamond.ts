import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction, FacetCut } from "@kreskolabs/hardhat-deploy/types";
import { mergeABIs } from "@kreskolabs/hardhat-deploy/dist/src/utils";
import { getLogger } from "@utils/deployment";
import { DiamondInit, Kresko } from "types/typechain";
import { facets } from "src/contracts/diamond/config/config";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const logger = getLogger("deploy-diamond");
    const { ethers, getNamedAccounts, deploy, deployments } = hre;
    const { admin } = await getNamedAccounts();

    const Cuts: FacetCut[] = [];
    const ABIs = [];
    for (const facet of facets) {
        const [FacetContract, sigs] = await deploy(facet);
        const args = hre.getAddFacetArgs(FacetContract, sigs);
        const Artifact = await deployments.getArtifact(facet);
        Cuts.push(args.facetCut);
        ABIs.push(Artifact.abi);
    }

    const [DiamondInit] = await deploy<DiamondInit>("DiamondInit");
    const initializer = [DiamondInit.address, (await DiamondInit.populateTransaction.initialize(admin)).data];
    const [DiamondContract, _signatures, deployment] = await deploy("Diamond", {
        from: admin,
        args: [admin, Cuts, [initializer]],
    });

    const DiamondWithABI = await ethers.getContractAt<Kresko>("Kresko", DiamondContract.address);
    deployment.facets = (await DiamondWithABI.facets()).map(f => ({
        facetAddress: f.facetAddress,
        functionSelectors: f.functionSelectors,
    }));

    deployment.abi = mergeABIs([deployment.abi, ...ABIs], { check: true, skipSupportsInterface: false });
    await deployments.save("Diamond", deployment);

    logger.success("Diamond deployed @", DiamondContract.address, "with", deployment.facets.length, "facets");
    const Facet = await hre.run("add-facet", { name: "ERC165Facet" });
    logger.success("Added ERC165Facet @ ", Facet.address);
    hre.Diamond = DiamondWithABI;
    hre.DiamondDeployment = deployment;
};

func.tags = ["local", "diamond-init", "diamond"];

export default func;
