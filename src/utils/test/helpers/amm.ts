import hre from 'hardhat'

import { toBig } from '@utils/values'
import { maxUint256 } from 'viem'
import { getBlockTimestamp } from './calculations'

type AddLiquidityArgs = {
  user: SignerWithAddress
  router: any
  token0: any
  token1: any
  amount0: number | BigNumber
  amount1: number | BigNumber
}

export const addLiquidity = async (args: AddLiquidityArgs) => {
  const { token0, token1, amount0, amount1, user } = args
  await token0.contract.connect(user).approve(hre.UniV2Router.address, maxUint256)
  await token1.contract.connect(user).approve(hre.UniV2Router.address, maxUint256)
  const convertA = typeof amount0 === 'string' || typeof amount0 === 'number'
  const convertB = typeof amount1 === 'string' || typeof amount1 === 'number'

  await hre.UniV2Router.connect(user).addLiquidity(
    token0.address,
    token1.address,
    convertA ? toBig(amount0) : amount0,
    convertB ? toBig(amount1) : amount1,
    '0',
    '0',
    user.address,
    (await getBlockTimestamp()) + 1000,
  )
  return getPair(token0, token1)
}

export const getPair = async (token0: any, token1: any) => {
  return hre.ethers.getContractAt('UniswapV2Pair', await hre.UniV2Factory.getPair(token0.address, token1.address))
}
