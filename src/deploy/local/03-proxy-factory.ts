import type { DeployFunction } from 'hardhat-deploy/types';

const deploy: DeployFunction = async function (hre) {
  const { deployer } = await hre.getNamedAccounts();

  const [ProxyFactory] = await hre.deploy('ProxyFactory', {
    args: [deployer],
  });

  hre.ProxyFactory = ProxyFactory;
};
deploy.tags = ['local', 'all', 'core', 'proxy'];
export default deploy;
