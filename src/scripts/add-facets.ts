import { ZERO_ADDRESS } from '@kreskolabs/lib';
import { getLogger } from '@utils/logging';
import { Contract } from 'ethers';
import hre from 'hardhat';
import { mergeABIs } from 'hardhat-deploy/dist/src/utils';
import { type FacetCut, FacetCutAction } from 'hardhat-deploy/dist/types';
type Args = {
  names: readonly (keyof TC)[];
  initializerName?: keyof TC;
  initializerFunction?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initializerArgs?: any;
  log?: boolean;
};
const logger = getLogger('add-facets');
export async function addFacets({
  names,
  initializerName,
  initializerFunction = '',
  initializerArgs,
  log = true,
}: Args) {
  try {
    logger.log('Adding facets');
    const { deployer } = await hre.getNamedAccounts();

    /* -------------------------------------------------------------------------- */
    /*                                    Setup                                   */
    /* -------------------------------------------------------------------------- */

    // #1.1 Get the deployed artifact
    const DiamondDeployment = await hre.getDeploymentOrFork('Kresko');
    if (!DiamondDeployment) {
      // #1.2 Throw if it does not exist
      throw new Error(`Trying to add facets but no diamond deployed @ ${hre.network.name}`);
    }

    // #2.1 Get contract instance with full ABI
    const Diamond = await hre.getContractOrFork('Kresko');

    // #3.1 Save facets that exists before adding new ones
    const facetsBefore = await Diamond.facets();

    // #4.1 Initialize array for the `Diamond.diamondCut` argument `FacetCuts`
    const FacetCuts: FacetCut[] = [];

    // #4.2 Initialize array for merging the facet ABIs for deployment output.
    const ABIs = [];

    /* -------------------------------------------------------------------------- */
    /*                              Deploy All Facets                             */
    /* -------------------------------------------------------------------------- */
    const deploymentInfo: { name: string; address: string; functions: number }[] = [];
    for (const facet of names) {
      // #4.3 Deploy each facet contract
      const [FacetContract, sigs, FacetDeployment] = await hre.deploy(facet, {
        log,
        from: deployer,
      });

      // #4.4 Convert the address and signatures into the required `FacetCut` type and push into the array.
      const facetCut: FacetCut = {
        facetAddress: FacetDeployment.address,
        action: FacetCutAction.Add,
        functionSelectors: sigs,
      };
      // const { facetCut } = await hre.getFacetCut(facet, 0, sigs);

      // #4.5 Ensure functions do not exist
      const existingFacet = facetsBefore.find(f => f.facetAddress === FacetContract.address);
      if (
        !existingFacet ||
        existingFacet.functionSelectors.some(sel => facetCut.functionSelectors.indexOf(sel) === -1)
      ) {
        FacetCuts.push(facetCut);
      } else {
        logger.log('Skipping facet', facet);
      }

      // #4.6 Push their ABI into a separate array for deployment output later on.
      ABIs.push(FacetDeployment.abi);

      deploymentInfo.push({
        name: facet,
        address: FacetDeployment.address,
        functions: sigs.length,
      });
    }
    logger.success('Facets on-chain:');
    console.table(deploymentInfo);

    /* -------------------------------------------------------------------------- */
    /*                             Handle Initializer                             */
    /* -------------------------------------------------------------------------- */

    // #5.1 Initialize the `diamondCut` initializer argument to do nothing.
    let initializer: DiamondCutInitializer = [ZERO_ADDRESS, '0x'];

    if (initializerName && FacetCuts.length) {
      // #5.2 If `initializerName` is supplied, try to get the existing deployment
      const InitializerArtifact = await hre.deployments.getOrNull(initializerName);

      let InitializerContract: Contract;
      // #5.3 Deploy the initializer contract if it does not exist
      if (!InitializerArtifact) {
        logger.log('Initializer deployment not found for', initializerName, '...deploying');
        [InitializerContract] = await hre.deploy(initializerName, {
          from: deployer,
          log,
        });
        logger.success(initializerName, 'succesfully deployed', 'txHash:', InitializerContract.deployTransaction.hash);
        logger.success(initializerName, 'address:', InitializerContract.address);
      }
      // #5.4 Get the contract instance
      InitializerContract = await hre.getContractOrFork(initializerName);
      if (!initializerArgs || initializerArgs.length === 0) {
        // Ensure we know there are no parameters for the initializer supplied
        logger.warn('Adding diamondCut initializer with no arguments supplied');
      } else {
        logger.log('Initializer arguments:');
        console.table(initializerArgs);
      }
      // #5.5 Prepopulate the initialization tx - replacing the default set on #5.1.
      if (!initializerFunction) {
        throw new Error(`No initializer provided: ${initializerName}`);
      }
      const tx = await InitializerContract.populateTransaction[initializerFunction](initializerArgs || '0x');
      if (!tx.to || !tx.data) {
        throw new Error('Initializer transaction is missing to or data');
      }
      initializer = [tx.to, tx.data];
    } else if (!FacetCuts.length) {
      logger.log('Skipping adding facets because they all exist');
    } else {
      // Ensure we know that no initializer was supplied for the facets
      logger.warn('Adding facets without initializer');
    }

    if (FacetCuts.length) {
      /* -------------------------------------------------------------------------- */
      /*                                 DiamondCut                                 */
      /* -------------------------------------------------------------------------- */
      await Diamond.diamondCut(FacetCuts, ...initializer);

      // #6.1 Get the on-chain values of facets in the Diamond after the cut.
      const facetsAfter = (await Diamond.facets()).map(f => ({
        name: deploymentInfo.find(d => d.address === f.facetAddress)?.name ?? '',
        facetAddress: f.facetAddress,
        functionSelectors: f.functionSelectors,
      }));

      // #6.2 Ensure the facets are found on-chain
      const addedFacets = facetsAfter.filter(f => !!FacetCuts.find(fc => fc.facetAddress === f.facetAddress));
      if (addedFacets.length !== FacetCuts.length) {
        // Print out relevant errors if facets are not found
        logger.error(false, 'On-chain amount does not match the amount of facets tried to add');
        logger.error(
          false,
          'Facets found on-chain before:',
          facetsBefore.map(f => f.facetAddress),
        );
        logger.error(
          false,
          'All facets found on-chain after:',
          facetsAfter.map(f => f.facetAddress),
        );
        // Do not continue with any possible scripts after
        throw new Error('Error adding a facet');
      } else {
        // #6.3 Add the new facet into the Diamonds deployment object
        DiamondDeployment.facets = facetsAfter;
        hre.facets = deploymentInfo;

        // #6.4 Merge the ABIs of new facets into the existing Diamond ABI for deployment output.
        DiamondDeployment.abi = mergeABIs([DiamondDeployment.abi, ...ABIs], {
          // This check will notify if there are selector clashes
          check: true,
          skipSupportsInterface: false,
        });

        // #6.5 Save the deployment output
        await hre.deployments.save('Diamond', DiamondDeployment);
        // Live network deployments should be released into the contracts-package.
        if (hre.network.live) {
          // TODO: Automate the release
          logger.log(
            'New facets saved to deployment file, remember to make a release of the contracts package for frontend',
          );
        }

        // #6.6 Save the deployment and Diamond into runtime for later steps.
        hre.DiamondDeployment = DiamondDeployment;
        hre.Diamond = await hre.getContractOrFork('Kresko');

        logger.success(FacetCuts.length, 'facets succesfully added');
      }
      return hre.Diamond;
    } else {
      // #6.4 Merge the ABIs of new facets into the existing Diamond ABI for deployment output.
      // DiamondDeployment.abi = mergeABIs([DiamondDeployment.abi, ...ABIs], {
      //     // This check will notify if there are selector clashes
      //     check: true,
      //     skipSupportsInterface: false,
      // });

      // #6.5 Save the deployment output
      // await deployments.save("Diamond", DiamondDeployment);
      // Live network deployments should be released into the contracts-package.
      if (hre.network.live) {
        // TODO: Automate the release
        logger.log(
          'New facets saved to deployment file, remember to make a release of the contracts package for frontend',
        );
      }

      // #6.6 Save the deployment and Diamond into runtime for later steps.
      hre.DiamondDeployment = DiamondDeployment;
      hre.Diamond = await hre.getContractOrFork('Kresko');
    }
  } catch (e) {
    console.log(e);
  }
}
