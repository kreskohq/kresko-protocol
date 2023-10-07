import { getLogger } from '@utils/logging';
import { FacetCut, FacetCutAction } from 'hardhat-deploy/dist/types';

type Args = {
  name: string;
  initializerName?: keyof TC;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initializerArgs?: any[];
};

const logger = getLogger('remove-facet');

export async function removeFacet({ name, initializerName, initializerArgs }: Args) {
  const { deployer } = await hre.ethers.getNamedSigners();

  /* -------------------------------------------------------------------------- */
  /*                                    Setup                                   */
  /* -------------------------------------------------------------------------- */

  // #1.1 Get the deployed artifact
  const DiamondDeployment = await hre.deployments.getOrNull('Diamond');
  if (!DiamondDeployment) {
    // Throw if it does not exist
    throw new Error(`Trying to remove facet but no diamond deployed @ ${hre.network.name}`);
  }

  // #2.1 Get contract instance with full ABI
  const Diamond = await hre.getContractOrFork('Kresko');

  // #3.1 Get selectors of the facet
  const Facet = await hre.deployments.getOrNull(name);
  if (!Facet) {
    //  Throw if it does not exist
    throw new Error(`Trying to remove facet but no facet deployed @ ${hre.network.name} with name: ${name}`);
  }
  const selectorsToRemove = (await Diamond.facets()).find(f => f.facetAddress === Facet.address)?.functionSelectors;

  if (!selectorsToRemove) {
    throw new Error(`Trying to remove facet but no facet deployed @ ${hre.network.name} with name: ${name}`);
  }
  // #3.2 Initialize the `FacetCut` object
  const FacetCut: FacetCut = {
    facetAddress: hre.ethers.constants.AddressZero,
    functionSelectors: selectorsToRemove,
    action: FacetCutAction.Remove,
  };

  /* -------------------------------------------------------------------------- */
  /*                             Handle Initializer                             */
  /* -------------------------------------------------------------------------- */

  // #4.1 Initialize the `diamondCut` initializer argument to do nothing.
  let initializer: DiamondCutInitializer = [hre.ethers.constants.AddressZero, '0x'];

  if (initializerName) {
    // #4.2 If `initializerName` is supplied, try to get the existing deployment
    const InitializerArtifact = await hre.getContractOrFork(initializerName);

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
    }
    // #4.5 Prepopulate the initialization tx - replacing the default set on #5.1.
    const tx = await InitializerContract.populateTransaction.initialize(initializerArgs || '0x');
    if (!tx.to || !tx.data) {
      throw new Error('Initializer transaction is missing to or data');
    }
    initializer = [tx.to, tx.data];
  } else {
    // Ensure we know that no initializer was supplied for the facets
    logger.warn('Removing facet without initializer');
  }

  /* -------------------------------------------------------------------------- */
  /*                                 DiamondCut                                 */
  /* -------------------------------------------------------------------------- */

  await Diamond.diamondCut([FacetCut], ...initializer);

  // #5.1 Get the on-chain values of facets in the Diamond after the cut.
  const facets = (await Diamond.facets()).map(f => ({
    facetAddress: f.facetAddress,
    functionSelectors: f.functionSelectors,
  }));

  // #5.2 Ensure the facets are removed on-chain
  const facet = facets.find(f => f.facetAddress === Facet.address);
  if (!facet) {
    // #5.3 Add the new facet information into the deployment output
    DiamondDeployment.facets = facets;

    // #5.4 Remove facet ABI of from the existing Diamond ABI for deployment output.
    DiamondDeployment.abi = DiamondDeployment.abi.filter(value => {
      const id = hre.getSignature(value);
      return id ? !selectorsToRemove.includes(id) : true;
    });

    // #5.5 Save the deployment output
    // Live network deployments should be released into the contracts-package.
    if (hre.network.live) {
      await hre.deployments.save('Diamond', DiamondDeployment);
      hre.DiamondDeployment = DiamondDeployment;
      // TODO: Automate the release
      logger.log(
        'New facets saved to deployment file, remember to make a release of the contracts package for frontend',
      );
    }

    // #5.6 Save the deployment and Diamond into runtime for later steps.
    hre.Diamond = await hre.getContractOrFork('Kresko');

    logger.success(1, ' facet succesfully removed');
    logger.success('Facet address: ', Facet.address, 'with ', selectorsToRemove.length, ' functions');
  } else {
    // if facet is still found found
    logger.error(false, 'Facet remove failed @ ', Facet.address);
    logger.error(
      true,
      'All facets found:',
      facets.map(f => f.facetAddress),
    );
    // Do not continue with any possible scripts after
    throw new Error('Error removing facet');
  }
  return DiamondDeployment;
}
