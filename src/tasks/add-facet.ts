import { ZERO_ADDRESS } from '@kreskolabs/lib'
import { getLogger } from '@utils/logging'
import { type FacetCut, FacetCutAction } from 'hardhat-deploy/dist/types'
import { task, types } from 'hardhat/config'
import type { TaskArguments } from 'hardhat/types'
import { TASK_ADD_FACET } from './names'

export type AddFacetParams<T> = {
  initializerName: keyof TC
  initializerArgs: T
}

task(TASK_ADD_FACET, 'Add a facet to the diamond')
  .addParam('name', 'Artifact/Contract name of the facet')
  .addOptionalParam('initializerName', 'Contract to deploy and delegatecall to when adding the facet', '', types.string)
  .addOptionalParam('internalInitializer', 'facet has its own initializer', false, types.boolean)
  .addOptionalParam('initializerArgs', 'Address to delegatecall to when adding the facet', '', types.json)
  .setAction(async function ({ name, initializerName, internalInitializer, initializerArgs }: TaskArguments, hre) {
    const logger = getLogger(TASK_ADD_FACET)
    const { deployer } = await hre.ethers.getNamedSigners()

    const DiamondDeployment = await hre.deployments.getOrNull('Diamond')
    if (!DiamondDeployment) {
      throw new Error(`Trying to add facet but no diamond deployed @ ${hre.network.name}`)
    }

    const Diamond = await hre.getContractOrFork('Kresko')

    // Single facet addition, maps all functions contained
    const [Facet, Signatures] = await hre.deploy(name, {
      from: deployer.address,
    })

    const Cut: FacetCut = {
      facetAddress: Facet.address,
      functionSelectors: Signatures,
      action: FacetCutAction.Add,
    }

    let initializer: DiamondCutInitializer
    if (!internalInitializer) {
      const InitializerArtifact = await hre.deployments.getOrNull(initializerName)

      if (InitializerArtifact) {
        if (!initializerArgs) {
          logger.log('Adding facet with initializer but no parameters were supplied')
          initializerArgs = '0x'
        } else {
          logger.log('Adding facet with initializer', initializerName, 'params', initializerArgs)
        }
        const [InitializerContract] = await hre.deploy(initializerName)
        const tx = await InitializerContract.populateTransaction.initialize(initializerArgs)
        if (!tx.to || !tx.data) {
          throw new Error('Initializer transaction is missing to or data')
        }
        initializer = [tx.to, tx.data]
      } else {
        initializer = [ZERO_ADDRESS, '0x']
        logger.log('Adding facet with no initializer')
      }
    } else {
      const tx = await Facet.populateTransaction.initialize(initializerArgs)
      if (!tx.to || !tx.data) {
        throw new Error('Initializer transaction is missing to or data')
      }
      initializer = [tx.to, tx.data]
    }
    const tx = await Diamond.diamondCut([Cut], ...initializer)

    const receipt = await tx.wait()

    const facets = (await Diamond.facets()).map(f => ({
      facetAddress: f.facetAddress,
      functionSelectors: f.functionSelectors,
    }))

    const facet = facets.find(f => f.facetAddress === Facet.address)
    if (!facet) {
      logger.error(false, 'Facet add failed @ ', Facet.address)
      logger.error(
        false,
        'All facets found:',
        facets.map(f => f.facetAddress),
      )
      throw new Error('Error adding a facet')
    } else {
      DiamondDeployment.facets = facets
      await hre.deployments.save('Diamond', DiamondDeployment)
      if (hre.network.live) {
        logger.log('New facet saved to deployment file, you should update the contracts package with the new ABI')
      }
      logger.success(
        'Facet added @',
        Facet.address,
        'with ',
        Signatures.length,
        ' functions - ',
        'txHash:',
        receipt.transactionHash,
      )
      hre.DiamondDeployment = DiamondDeployment
    }
    return Facet
  })
