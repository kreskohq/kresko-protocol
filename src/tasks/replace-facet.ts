import { removeFacet } from '@scripts/remove-facet'
import { getLogger } from '@utils/logging'
import { task, types } from 'hardhat/config'
import type { TaskArguments } from 'hardhat/types'
import { TASK_ADD_FACET, TASK_REPLACE_FACET } from './names'

const logger = getLogger(TASK_REPLACE_FACET)

// Not same as FacetCutAction.Replace
// as we dont care what functions exist for the facet
// or what functions exist in the new one
task(TASK_REPLACE_FACET, 'Replaces a facet, removing all of its functions from the diamond, adding a new facet after')
  .addParam('name', 'Artifact/Contract name of the facet')
  .addOptionalParam('initializerName', 'Contract to delegatecall to when adding the facet')
  .addOptionalParam('initializerArgs', 'Args to delegatecall when adding the facet', '0x', types.string)
  .setAction(async function ({ name, initializerName, initializerArgs }: TaskArguments, hre) {
    logger.log(`Replacing facet ${name} in diamond`)
    const Deployed = await hre.deployments.getOrNull('Diamond')
    if (!Deployed) {
      throw new Error(`No diamond deployed @ ${hre.network.name}`)
    }
    await removeFacet({ name, initializerName, initializerArgs })

    await hre.run(TASK_ADD_FACET, {
      name,
      initializerName,
      initializerArgs,
    })
    logger.success(`Replaced facet ${name} in diamond`)
  })
