import { collateralPoolFacets } from "@deploy-config/shared";
import hre from "hardhat";
import { FacetCut, FacetCutAction } from "hardhat-deploy/dist/types";

export const deployPositions = async () => {
    // const { deployer } = await hre.getNamedAccounts();
    // deploy positions diamond with these facets
    // const facets = ["PositionsFacet", "PositionsConfigFacet"] as const;

    // const positions = await hre.ethers.getContractAt("Kresko", (await hre.deployments.get("Positions")).address);
    // const existingFacets = await positions.facets();

    // const Cuts: FacetCut[] = [];

    // for (const facet of facets) {
    //     const ExistingFacetDeployment = await hre.getContractOrFork(facet);
    //     const existingFacet = existingFacets.find(f => f.facetAddress === ExistingFacetDeployment.address);
    //     if (!existingFacet) {
    //         throw new Error(`Could not find existing facet for ${facet}`);
    //     }

    //     const [, sigs, NewFacetDeployment] = await hre.deploy(facet);

    //     const facetCutRemoveExisting = {
    //         facetAddress: hre.ethers.constants.AddressZero,
    //         action: FacetCutAction.Remove,
    //         functionSelectors: existingFacet.functionSelectors,
    //     };

    //     const FacetCutAddNew = {
    //         facetAddress: NewFacetDeployment.address,
    //         action: FacetCutAction.Add,
    //         functionSelectors: sigs,
    //     };
    //     if (NewFacetDeployment.address === existingFacet.facetAddress) {
    //         throw new Error(`New facet address is the same as the existing one for ${facet}`);
    //     }
    //     Cuts.push(facetCutRemoveExisting, FacetCutAddNew);
    // }

    // await positions.diamondCut(Cuts, hre.ethers.constants.AddressZero, "0x");
    // const facets2 = [
    //     "CollateralPoolStateFacet",
    //     "CollateralPoolSwapFacet",
    //     "CollateralPoolConfigFacet",
    //     "CollateralPoolFacet",
    // ] as const;

    const Kresko = await hre.getContractOrFork("Kresko");
    const existingFacets2 = await Kresko.facets();

    const Cuts2: FacetCut[] = [];

    for (const facet of collateralPoolFacets) {
        const ExistingFacetDeployment = await hre.getContractOrFork(facet);
        const existingFacet = existingFacets2.find(f => f.facetAddress === ExistingFacetDeployment.address);
        if (!existingFacet) {
            throw new Error(`Could not find existing facet for ${facet}`);
        }

        console.log("Deploying " + facet);
        const [, sigs, NewFacetDeployment] = await hre.deploy(facet);
        console.log("Deployed " + facet);
        const facetCutRemoveExisting = {
            facetAddress: hre.ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            functionSelectors: existingFacet!.functionSelectors,
        };

        const FacetCutAddNew = {
            facetAddress: NewFacetDeployment.address,
            action: FacetCutAction.Add,
            functionSelectors: sigs,
        };
        if (NewFacetDeployment.address === existingFacet!.facetAddress) {
            throw new Error(`New facet address is the same as the existing one for ${facet}`);
        }
        Cuts2.push(facetCutRemoveExisting, FacetCutAddNew);
    }

    await Kresko.diamondCut(Cuts2, hre.ethers.constants.AddressZero, "0x");
    // const Kresko = await hre.getContractOrFork("Kresko");
    // const krETH = await hre.getContractOrFork("KreskoAsset", "krETH");
    // const KISS = await hre.getContractOrFork("KISS");
    // const krBTC = await hre.getContractOrFork("KreskoAsset", "krBTC");
    // const krTSLA = await hre.getContractOrFork("KreskoAsset", "krTSLA");

    // const configDefault = {
    //     closeFee: toBig(0.0025),
    //     openFee: toBig(0.0015),
    //     protocolFee: toBig(0.15),
    //     supplyLimit: toBig(1000000),
    // };
    // const configKiss = {
    //     closeFee: toBig(0.0015),
    //     openFee: toBig(0.0025),
    //     protocolFee: toBig(0.25),
    //     supplyLimit: toBig(1000000),
    // };

    // await Kresko.updatePoolKrAsset(krETH.address, configDefault);
    // await Kresko.updatePoolKrAsset(krTSLA.address, configDefault);
    // await Kresko.updatePoolKrAsset(krBTC.address, configDefault);
    // await Kresko.updatePoolKrAsset(KISS.address, configKiss);

    // await Kresko.setSwapPairs([
    //     {
    //         assetIn: KISS.address,
    //         assetOut: krBTC.address,
    //         enabled: true,
    //     },
    //     {
    //         assetIn: KISS.address,
    //         assetOut: krTSLA.address,
    //         enabled: true,
    //     },
    //     {
    //         assetIn: KISS.address,
    //         assetOut: krETH.address,
    //         enabled: true,
    //     },
    //     {
    //         assetIn: krBTC.address,
    //         assetOut: krETH.address,
    //         enabled: true,
    //     },
    //     {
    //         assetIn: krTSLA.address,
    //         assetOut: krETH.address,
    //         enabled: true,
    //     },
    //     {
    //         assetIn: krBTC.address,
    //         assetOut: krTSLA.address,
    //         enabled: true,
    //     },
    // ]);
};

deployPositions()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
