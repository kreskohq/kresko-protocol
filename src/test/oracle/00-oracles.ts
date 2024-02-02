import { OracleType } from '@/types'
import { MockPyth } from '@/types/typechain'
import { expect } from '@test/chai'
import { type DefaultFixture, defaultFixture } from '@utils/test/fixtures'
import { mapToUpdateData } from '@utils/test/helpers/oracle'
import { toBig } from '@utils/values'

describe('Oracles', () => {
  let f: DefaultFixture
  let user: SignerWithAddress
  let mockPyth: MockPyth
  beforeEach(async function () {
    f = await defaultFixture()
    // Deploy one price feed
    ;[, [user]] = f.users
    this.deployer = await hre.ethers.getNamedSigner('deployer')
    this.userOne = await hre.ethers.getNamedSigner('userOne')
    await f.Collateral.setPrice(10)
    mockPyth = await hre.getContractOrFork('MockPyth')
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
      await f.Collateral.setPrice(12)

      /// set price to 11
      const pythPrice = 11

      await mockPyth.updatePriceFeeds(await mapToUpdateData(mockPyth, [[f.Collateral.pythId, pythPrice]]))

      expect(await hre.Diamond.getAccountTotalCollateralValue(user.address)).to.equal(
        f.depositAmount.wadMul(toBig(pythPrice, 8)),
        'collateral value should be $11',
      )
    })

    it('should revert if price deviates too much', async function () {
      /// set chainlink price to 20
      await f.Collateral.setPrice(20)

      const pythPrice = 10

      await mockPyth.updatePriceFeeds(await mapToUpdateData(mockPyth, [[f.Collateral.pythId, pythPrice]]))

      // should revert if price deviates more than maxPriceDeviationPct
      await expect(hre.Diamond.getAccountTotalCollateralValue(user.address)).to.be.reverted
      await f.Collateral.setPrice(10)
    })
  })
})
