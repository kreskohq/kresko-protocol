import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { CError__factory } from 'src/types/typechain';

export const CError = (hre: HardhatRuntimeEnvironment) => {
  return CError__factory.connect(hre.Diamond.address, hre.Diamond.provider);
};
