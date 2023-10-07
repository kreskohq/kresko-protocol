import fs from 'fs';
import { TASK_CLEAN } from 'hardhat/builtin-tasks/task-names';
import { task } from 'hardhat/config';

task(TASK_CLEAN, 'Overrides the standard clean task', async function (_taskArgs, { config }, runSuper) {
  fs.rmSync('./coverage', { force: true });
  fs.rmSync('./coverage.json', { force: true });
  if (config.typechain?.outDir) {
    fs.rmSync(config.typechain.outDir, { recursive: true });
  }
  await runSuper();
});
