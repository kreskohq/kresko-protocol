import hre from "hardhat";
import { FacetCut, FacetCutAction } from "hardhat-deploy/dist/types";

export const deployPositions = async () => {
    const { deployer } = await hre.getNamedAccounts();
    // deploy positions diamond with these facets
    const facets = ["ERC721Facet", "PositionsFacet"] as const;

    const positions = await hre.ethers.getContractAt("Kresko", (await hre.deployments.get("Positions")).address);
    const existingFacets = await positions.facets();

    const Cuts: FacetCut[] = [];

    for (const facet of facets) {
        const ExistingFacetDeployment = await hre.getContractOrFork(facet);
        const existingFacet = existingFacets.find(f => f.facetAddress === ExistingFacetDeployment.address);
        if (!existingFacet) {
            throw new Error(`Could not find existing facet for ${facet}`);
        }

        const [, sigs, NewFacetDeployment] = await hre.deploy(facet);

        const facetCutRemoveExisting = {
            facetAddress: hre.ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            functionSelectors: existingFacet.functionSelectors,
        };

        const FacetCutAddNew = {
            facetAddress: NewFacetDeployment.address,
            action: FacetCutAction.Add,
            functionSelectors: sigs,
        };

        Cuts.push(facetCutRemoveExisting, FacetCutAddNew);
    }

    await positions.diamondCut(Cuts, hre.ethers.constants.AddressZero, "0x", { from: deployer });
};

deployPositions()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
