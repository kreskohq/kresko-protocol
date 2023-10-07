import hre from 'hardhat';
import { FacetCut, FacetCutAction } from 'hardhat-deploy/dist/types';
import { getLogger } from '@kreskolabs/lib/meta';
import { mergeABIs } from 'hardhat-deploy/dist/src/utils';

type Args<T> = {
  name: T;
  initializerName?: T;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initializerArgs?: any;
};

const logger = getLogger('add-facet');

export async function addFacet<T extends keyof TC>({
  name,
  initializerName,
  initializerArgs,
}: Args<T>): Promise<TC[T]> {
  logger.log(name);

  const { deployer } = await hre.ethers.getNamedSigners();

  /* -------------------------------------------------------------------------- */
  /*                                    Setup                                   */
  /* -------------------------------------------------------------------------- */

  // #1.1 Get the deployed artifact
  const DiamondDeployment = await hre.deployments.getOrNull('Diamond');
  if (!DiamondDeployment) {
    // #1.2 Throw if it does not exist
    throw new Error(`Trying to add facet but no diamond deployed @ ${hre.network.name}`);
  }

  // #2.1 Get contract instance with full ABI
  const Diamond = await hre.getContractOrFork('Kresko');

  // #3.1 Single facet addition, maps all functions contained except the string blobs in the `signatureFilters` array in `configs/shared`
  const [Facet, Signatures, deployment] = await hre.deploy(name);

  // #3.2 Initialize the `FacetCut` object
  const FacetCut: FacetCut = {
    facetAddress: Facet.address,
    functionSelectors: Signatures,
    action: FacetCutAction.Add,
  };

  /* -------------------------------------------------------------------------- */
  /*                             Handle Initializer                             */
  /* -------------------------------------------------------------------------- */

  // #4.1 Initialize the `diamondCut` initializer argument to do nothing.
  let initializer: DiamondCutInitializer = [hre.ethers.constants.AddressZero, '0x'];

  if (initializerName) {
    // #4.2 If `initializerName` is supplied, try to get the existing deployment
    const InitializerArtifact = await hre.deployments.getOrNull(initializerName);

    let InitializerContract: Contract;
    // #4.3 Deploy the initializer contract if it does not exist
    if (!InitializerArtifact) {
      [InitializerContract] = await hre.deploy(initializerName, {
        from: deployer.address,
        log: true,
      });
    }
    // #4.4 Get the contract instance
    InitializerContract = await hre.getContractOrFork(initializerName);
    if (!initializerArgs || initializerArgs.length === 0) {
      // Ensure we know there are no parameters for the initializer supplied
      logger.warn('Adding diamondCut initializer with no arguments supplied');
    } else {
      logger.log('Adding diamondCut initializer with arguments:', initializerArgs, InitializerContract.address);
      const tx = await InitializerContract.populateTransaction.initialize(initializerArgs || '0x');
      if (!tx.to || !tx.data) {
        throw new Error('Initializer contract does not have an address');
      }

      initializer = [tx.to, tx.data];
    }
    // #4.5 Prepopulate the initialization tx - replacing the default set on #5.1.
  } else {
    // Ensure we know that no initializer was supplied for the facets
    logger.warn('Adding facets without initializer');
  }

  /* -------------------------------------------------------------------------- */
  /*                                 DiamondCut                                 */
  /* -------------------------------------------------------------------------- */

  const tx = await Diamond.diamondCut([FacetCut], ...initializer);
  const receipt = await tx.wait();

  // #5.1 Get the on-chain values of facets in the Diamond after the cut.
  const facets = (await Diamond.facets()).map(f => ({
    facetAddress: f.facetAddress,
    functionSelectors: f.functionSelectors,
  }));

  // #5.2 Ensure the facets are found on-chain
  const facet = facets.find(f => f.facetAddress === Facet.address);
  if (!facet) {
    // Print out relevant errors if facets are not found
    logger.error(false, 'Facet add failed @ ', Facet.address);
    logger.error(
      false,
      'All facets found:',
      facets.map(f => f.facetAddress),
    );
    // Do not continue with any possible scripts after
    throw new Error('Error adding a facet');
  } else {
    // #5.3 Add the new facet into the Diamonds deployment object
    DiamondDeployment.facets = facets;

    // #5.4 Merge the ABI of new facet into the existing Diamond ABI for deployment output.
    DiamondDeployment.abi = mergeABIs([DiamondDeployment.abi, deployment.abi], {
      // This check will notify if there are selector clashes
      check: true,
      skipSupportsInterface: false,
    });

    // #5.5 Save the deployment output
    await hre.deployments.save('Diamond', DiamondDeployment);
    // Live network deployments should be released into the contracts-package.
    if (hre.network.live) {
      // TODO: Automate the release
      logger.log(
        'New facets saved to deployment file, remember to make a release of the contracts package for frontend',
      );
    }

    // #5.6 Save the deployment and Diamond into runtime for later steps.
    hre.DiamondDeployment = DiamondDeployment;
    hre.Diamond = await hre.getContractOrFork('Kresko');

    logger.success(1, ' facets succesfully added', 'txHash:', receipt.transactionHash);
    logger.success(
      'Facet address: ',
      Facet.address,
      'with ',
      Signatures.length,
      ' functions - ',
      'txHash:',
      receipt.transactionHash,
    );
    hre.DiamondDeployment = DiamondDeployment;
  }
  return Facet;
}
