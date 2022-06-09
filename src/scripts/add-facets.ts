import hre from "hardhat";
import { FacetCut } from "@kreskolabs/hardhat-deploy/dist/types";
import { getLogger } from "@utils/deployment";
import { mergeABIs } from "@kreskolabs/hardhat-deploy/dist/src/utils";
import { constants } from "ethers";

type Args = {
    names: string[];
    initializerName?: string;
    initializerArgs?: unknown;
};

export async function addFacets({ names, initializerName, initializerArgs }: Args) {
    const logger = getLogger("add-facet");
    const { ethers, deployments, deploy, getNamedAccounts } = hre;

    const { deployer } = await getNamedAccounts();

    const DiamondDeployment = await hre.deployments.getOrNull("Diamond");
    if (!DiamondDeployment) {
        throw new Error(`Trying to add facet but no diamond deployed @ ${hre.network.name}`);
    }

    const Diamond = await ethers.getContractAt<Kresko>("Kresko", DiamondDeployment.address);

    const facetsBefore = await Diamond.facets();

    const FacetCuts: FacetCut[] = [];
    const ABIs = [];
    for (const facet of names) {
        const [FacetContract, sigs] = await deploy(facet, { log: true, from: deployer });
        const args = hre.getAddFacetArgs(FacetContract, sigs);
        const Artifact = await deployments.getArtifact(facet);
        FacetCuts.push(args.facetCut);
        ABIs.push(Artifact.abi);
    }

    let initializer: DiamondCutInitializer = [constants.AddressZero, "0x"];
    if (initializerName) {
        const InitializerArtifact = await hre.deployments.getOrNull(initializerName);

        if (InitializerArtifact) {
            const InitContract = await hre.ethers.getContract(initializerName);
            if (!initializerArgs) {
                logger.log("Adding facets with initializer but no parameters");
            } else {
                logger.log("Adding facets with initializer, params:", initializerArgs, InitContract.address);
            }
            const tx = await InitContract.populateTransaction.initialize(initializerArgs || "0x");
            initializer = [tx.to, tx.data];
        } else {
            logger.log("Adding facets with initializer in", initializerName, "params", initializerArgs);
            const [InitializerContract] = await hre.deploy(initializerName, { from: deployer, log: true });
            const tx = await InitializerContract.populateTransaction.initialize(initializerArgs);
            initializer = [tx.to, tx.data];
        }
    } else {
        logger.log("Adding facets without initializer");
        initializer = [constants.AddressZero, "0x"];
    }

    const tx = await Diamond.diamondCut(FacetCuts, ...initializer);

    const receipt = await tx.wait();

    const facets = (await Diamond.facets()).map(f => ({
        facetAddress: f.facetAddress,
        functionSelectors: f.functionSelectors,
    }));

    const filteredFacets = facets.filter(f => !!FacetCuts.find(fc => fc.facetAddress === f.facetAddress));
    if (filteredFacets.length !== FacetCuts.length) {
        logger.error("On-chain amount does not match the amount of facets tried to add");
        logger.error(
            "Facets found on-chain before:",
            facetsBefore.map(f => f.facetAddress),
        );
        logger.error(
            "All facets found on-chain after:",
            facets.map(f => f.facetAddress),
        );
        throw new Error("Error adding a facet");
    } else {
        DiamondDeployment.facets = facets;
        DiamondDeployment.abi = mergeABIs([DiamondDeployment.abi, ...ABIs], {
            check: true,
            skipSupportsInterface: false,
        });

        await deployments.save("Diamond", DiamondDeployment);
        if (hre.network.live) {
            // TODO: Automate the release
            logger.log(
                "New facets saved to deployment file, remember to make a release of the contracts package for frontend",
            );
        }
        logger.success("Facets added: ", FacetCuts.length, "txHash:", receipt.transactionHash);
        hre.DiamondDeployment = DiamondDeployment;
        hre.Diamond = await ethers.getContractAt<Kresko>("Kresko", DiamondDeployment.address);
    }
    return hre.Diamond;
}
