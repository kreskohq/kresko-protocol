import type { DeployFunction } from 'hardhat-deploy/types';

const deploy: DeployFunction = async function (hre) {
  const { deployer } = await hre.getNamedAccounts();

  const [DeploymentFactory] = await hre.deploy('DeploymentFactory', {
    args: [deployer],
  });

  hre.DeploymentFactory = DeploymentFactory;
};
deploy.tags = ['local', 'all', 'core', 'proxy'];
export default deploy;
