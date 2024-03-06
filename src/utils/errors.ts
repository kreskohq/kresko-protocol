import { Errors__factory } from '@/types/typechain'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'

export const Errors = (hre: HardhatRuntimeEnvironment) => {
  return Errors__factory.connect(hre.Diamond.address, hre.Diamond.provider)
}
