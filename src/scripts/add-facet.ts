import hre from "hardhat";
import { FacetCut, FacetCutAction } from "@kreskolabs/hardhat-deploy/dist/types";
import { getLogger } from "@utils/deployment";
import { mergeABIs } from "@kreskolabs/hardhat-deploy/dist/src/utils";

type Args = {
    name: string;
    initializerName?: string;
    internalInitializer?: boolean;
    initializerArgs?: unknown;
};

export default async function addFacet<F extends Contract, I extends Contract>({
    name,
    initializerName,
    internalInitializer,
    initializerArgs,
}: Args) {
    const logger = getLogger("add-facet");
    const { ethers, deployments } = hre;

    const DiamondDeployment = await hre.deployments.getOrNull("Diamond");
    if (!DiamondDeployment) {
        throw new Error(`Trying to add facet but no diamond deployed @ ${hre.network.name}`);
    }

    const Diamond = await ethers.getContractAt<Kresko>("Kresko", DiamondDeployment.address);

    // Single facet addition, maps all functions contained
    const [Facet, Signatures, deployment] = await hre.deploy<F>(name);

    const Cut: FacetCut = {
        facetAddress: Facet.address,
        functionSelectors: Signatures,
        action: FacetCutAction.Add,
    };

    let initializer: DiamondCutInitializer;
    if (!internalInitializer) {
        const InitializerArtifact = await hre.deployments.getOrNull(initializerName);

        if (InitializerArtifact) {
            if (!initializerArgs) {
                logger.log("Adding facet with initializer but no parameters were supplied");
                initializerArgs = "0x";
            } else {
                logger.log("Adding facet with initializer", initializerName, "params", initializerArgs);
            }
            const [InitializerContract] = await hre.deploy<I>(initializerName);
            const tx = await InitializerContract.populateTransaction.initialize(initializerArgs);
            initializer = [tx.to, tx.data];
        } else {
            initializer = [ethers.constants.AddressZero, "0x"];
            logger.log("Adding facet with no initializer");
        }
    } else {
        const tx = await Facet.populateTransaction.initialize(initializerArgs);
        initializer = [tx.to, tx.data];
    }

    const tx = await Diamond.diamondCut([Cut], ...initializer);

    const receipt = await tx.wait();

    const facets = (await Diamond.facets()).map(f => ({
        facetAddress: f.facetAddress,
        functionSelectors: f.functionSelectors,
    }));

    const facet = facets.find(f => f.facetAddress === Facet.address);
    if (!facet) {
        logger.error("Facet add failed @ ", Facet.address);
        logger.error(
            "All facets found:",
            facets.map(f => f.facetAddress),
        );
        throw new Error("Error adding a facet");
    } else {
        DiamondDeployment.facets = facets;
        DiamondDeployment.abi = mergeABIs([DiamondDeployment.abi, deployment.abi], {
            check: true,
            skipSupportsInterface: false,
        });

        await deployments.save("Diamond", DiamondDeployment);
        if (hre.network.live) {
            logger.log("New facet saved to deployment file, you should update the contracts package with the new ABI");
        }
        logger.success(
            "Facet added @",
            Facet.address,
            "with ",
            Signatures.length,
            " functions - ",
            "txHash:",
            receipt.transactionHash,
        );
        hre.DiamondDeployment = DiamondDeployment;
    }
    return Facet;
}
