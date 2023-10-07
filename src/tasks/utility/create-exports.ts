/* eslint-disable @typescript-eslint/no-var-requires */
import { getLogger } from '@utils/logging';
import { task } from 'hardhat/config';
import { TASK_CREATE_EXPORTS } from '../names';

const logger = getLogger(TASK_CREATE_EXPORTS);

task(TASK_CREATE_EXPORTS).setAction(async function () {
  const exportUtil = await import('../../utils/export.js');

  logger.log('Creating exports...');
  await exportUtil.exportDeployments();
  logger.log('Done!');
});
