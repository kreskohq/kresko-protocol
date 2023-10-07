import hre from 'hardhat';

export const calculateProxyAddress = async (
  factory: Contract,
  singleton: string,
  inititalizer: string,
  nonce: number | string,
) => {
  const deploymentCode = hre.ethers.utils.solidityPack(
    ['bytes', 'uint256'],
    [await factory.proxyCreationCode(), singleton],
  );
  const salt = hre.ethers.utils.solidityKeccak256(
    ['bytes32', 'uint256'],
    [hre.ethers.utils.solidityKeccak256(['bytes'], [inititalizer]), nonce],
  );
  return hre.ethers.utils.getCreate2Address(factory.address, salt, hre.ethers.utils.keccak256(deploymentCode));
};

export const calculateProxyAddressWithCallback = async (
  factory: Contract,
  singleton: string,
  inititalizer: string,
  nonce: number | string,
  callback: string,
) => {
  const saltNonceWithCallback = hre.ethers.utils.solidityKeccak256(['uint256', 'address'], [nonce, callback]);
  return calculateProxyAddress(factory, singleton, inititalizer, saltNonceWithCallback);
};
