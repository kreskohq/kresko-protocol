import fs from 'fs'
import { TASK_CLEAN } from 'hardhat/builtin-tasks/task-names'
import { task } from 'hardhat/config'

task(TASK_CLEAN, 'Overrides the standard clean task', async function (_taskArgs, { config }, runSuper) {
  if (config.typechain?.outDir) {
    fs.rmSync(config.typechain.outDir, { recursive: true, force: true })
  }
  await runSuper()
})
