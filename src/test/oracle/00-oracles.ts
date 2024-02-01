import { OracleType } from '@/types'
import { expect } from '@test/chai'
import { getMockPythPayload } from '@utils/redstone'
import { type DefaultFixture, defaultFixture } from '@utils/test/fixtures'
import { toBig } from '@utils/values'

describe('Oracles', () => {
  let f: DefaultFixture
  let user: SignerWithAddress
  beforeEach(async function () {
    f = await defaultFixture()
    // Deploy one price feed
    ;[, [user]] = f.users
    this.deployer = await hre.ethers.getNamedSigner('deployer')
    this.userOne = await hre.ethers.getNamedSigner('userOne')
    f.Collateral.setPrice(10)
  })

  describe('Redstone', () => {
    it('should have correct setup', async function () {
      // check initial conditions
      expect(await hre.Diamond.getAccountTotalCollateralValue(user.address)).to.equal(
        toBig(10000, 8),
        'collateral value should be $10',
      )
    })

    it('should get primary price when price +- maxPriceDeviationPct of reference price ', async function () {
      await f.Collateral.setOracleOrder([OracleType.Pyth, OracleType.Chainlink])
      /// set chainlink price to 12
      f.Collateral.setPrice(12)

      /// set price to 11
      const pythPrice = 11
      const updateData = await getMockPythPayload(f.mockPyth, [{ id: f.Collateral.pythId, value: pythPrice * 1e8 }])

      await f.mockPyth.updatePriceFeeds(updateData)

      expect(await hre.Diamond.getAccountTotalCollateralValue(user.address)).to.equal(
        f.depositAmount.wadMul(toBig(pythPrice, 8)),
        'collateral value should be $11',
      )
    })

    it('should revert if price deviates too much', async function () {
      /// set chainlink price to 20
      f.Collateral.setPrice(20)

      const pythPrice = 10
      const updateData = await getMockPythPayload(f.mockPyth, [{ id: f.Collateral.pythId, value: pythPrice * 1e8 }])

      await f.mockPyth.updatePriceFeeds(updateData)

      // should revert if price deviates more than maxPriceDeviationPct
      await expect(hre.Diamond.getAccountTotalCollateralValue(user.address)).to.be.reverted
      f.Collateral.setPrice(10)
    })
  })
})
