import { getLogger } from "@kreskolabs/lib";
import { ethers } from "ethers";
import { writeFileSync } from "fs";
import { FacetCut, FacetCutAction } from "hardhat-deploy/dist/types";
type Args = {
    facetNames: readonly (keyof TC)[];
    initializer?: {
        contract: ethers.Contract;
        func: string;
        args?: unknown[];
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    multisig?: boolean;
    log?: boolean;
};

/**
 * Update facets on the diamond, will not add new facets but will update existing ones if they have changed
 * @param facetNames contract names to update
 * @param multisig whether just output the transaction params for the multisig
 * @param log whether to log
 */
export async function updateFacets({ facetNames, multisig = false, log = true, initializer }: Args) {
    const logger = getLogger("update-facets", log);

    logger.log(`Updating ${facetNames.length} facets`);
    console.table(facetNames);

    const { deployer } = await hre.ethers.getNamedSigners();

    /* -------------------------------------------------------------------------- */
    /*                                    Setup                                   */
    /* -------------------------------------------------------------------------- */

    // Get the deployed artifact
    const DiamondDeployment = await hre.getDeploymentOrFork("Diamond");
    if (!DiamondDeployment) {
        // Throw if it does not exist
        throw new Error(`Trying to add facets but no diamond deployed @ ${hre.network.name}`);
    }

    //  Get contract instance with full ABI
    const Diamond = await hre.getContractOrFork("Kresko");

    // Save facets that exists before adding new ones
    const facetsBefore = await Diamond.facets();

    // Initialize array for the `Diamond.diamondCut` argument `FacetCuts`
    const FacetCuts: FacetCut[] = [];

    // Initialize array for merging the facet ABIs for deployment output.
    const ABIs = [];

    /* -------------------------------------------------------------------------- */
    /*                              Deploy All Facets                             */
    /* -------------------------------------------------------------------------- */
    const deploymentInfo: { name: string; address: string; functions: number }[] = [];
    for (const facetName of facetNames) {
        const ExistingFacetDeployment = await hre.getDeploymentOrFork(facetName);

        // Abort if no existing facet found
        if (!ExistingFacetDeployment) {
            throw new Error(`Facet ${facetName} not deployed on ${hre.network.name} network`);
        }
        const existingFacet = facetsBefore.find(f => f.facetAddress === ExistingFacetDeployment.address);

        if (!existingFacet?.functionSelectors) {
            throw new Error(`No existing selectors found for ${facetName} on ${hre.network.name} network`);
        }

        logger.log(`Deploying ${facetName} on ${hre.network.name} network`);
        // Deploy each facet contract
        const [, newFacetSigs, NewFacetDeployment] = await hre.deploy(facetName, {
            log,
            from: deployer.address,
        });

        if (NewFacetDeployment.address === ExistingFacetDeployment.address) {
            logger.log(`No changes to ${facetName} on ${hre.network.name} network`);
            continue;
        }
        // Convert the address and signatures into the required `FacetCut` type and push into the array.
        const facetCutRemoveExisting = {
            facetAddress: hre.ethers.constants.AddressZero,
            action: FacetCutAction.Remove,
            functionSelectors: existingFacet.functionSelectors,
        };

        const FacetCutAddNew = {
            facetAddress: NewFacetDeployment.address,
            action: FacetCutAction.Add,
            functionSelectors: newFacetSigs,
        };

        FacetCuts.push(facetCutRemoveExisting, FacetCutAddNew);

        // Push their ABI into a separate array for deployment output later on.
        ABIs.push(NewFacetDeployment.abi);

        deploymentInfo.push({
            name: facetName,
            address: NewFacetDeployment.address,
            functions: newFacetSigs.length,
        });
    }

    logger.success("Deployed new facet contracts:");
    console.table(deploymentInfo);

    if (!FacetCuts.length) {
        throw new Error("Tried to update facets but no FacetCuts were generated");
    }

    /* -------------------------------------------------------------------------- */
    /*                                 DiamondCut                                 */
    /* -------------------------------------------------------------------------- */

    let initializerArgs = {
        address: hre.ethers.constants.AddressZero,
        data: "0x",
    };
    if (
        initializer &&
        (!initializer.contract.address || initializer.contract.address === hre.ethers.constants.AddressZero)
    ) {
        throw new Error("Initializer contract specificed but not deployed");
    }
    if (initializer) {
        logger.log(`Setting initializer @ ${initializer.contract.address} on ${hre.network.name} network`);
        initializerArgs = {
            address: initializer.contract.address,
            data: initializer.contract.interface.encodeFunctionData(initializer.func, initializer.args ?? []),
        };
    }
    const txParams = await Diamond.populateTransaction.diamondCut(
        FacetCuts,
        initializerArgs.address,
        initializerArgs.data,
    );

    if (!multisig) {
        const tx = await deployer.sendTransaction(txParams);
        const receipt = await tx.wait();

        // Get the on-chain values of facets in the Diamond after the cut.
        const facetsAfterOnChain = await Diamond.facets();
        const facetsAfter = facetsAfterOnChain.map(f => ({
            name: deploymentInfo.find(d => d.address === f.facetAddress)?.name ?? "",
            facetAddress: f.facetAddress,
            functionSelectors: f.functionSelectors,
        }));

        // No reason to abort anymore, but it is worth a warning.
        if (facetsBefore.length !== facetsAfter.length) {
            logger.warn(`Amount of facets before <-> after mismatch: ${facetsBefore.length} !== ${facetsAfter.length}`);
        }

        // Add the new facet into the Diamonds deployment object
        DiamondDeployment.facets = facetsAfter;
        hre.facets = deploymentInfo;

        // Live network deployments should be released into the contracts-package.
        if (process.env.FORKING) {
            logger.log("Forking, not saving deployment output");
        } else if (hre.network.live) {
            // Save the deployment output
            await hre.deployments.save("Diamond", DiamondDeployment);
            logger.log(
                "New facets saved to deployment file, remember to make a release of the contracts package for frontend",
            );
        }

        // Save the deployment and Diamond into runtime for later steps.
        hre.DiamondDeployment = DiamondDeployment;
        hre.Diamond = await hre.getContractOrFork("Kresko");

        logger.success(facetNames.length, "facets succesfully updated", "txHash:", receipt.transactionHash);

        return {
            facetsAfter: facetsAfterOnChain,
            txParams,
        };
    } else {
        logger.log("Multisig mode, not executing transaction");
        hre.facets = deploymentInfo;
        const txParams = await Diamond.populateTransaction.diamondCut(
            FacetCuts,
            initializerArgs.address,
            initializerArgs.data,
        );

        writeFileSync(`./txParams-${Date.now()}.json`, JSON.stringify(txParams, null, 2));
        return {
            facetsAfter: undefined,
            txParams,
        };
    }
}
