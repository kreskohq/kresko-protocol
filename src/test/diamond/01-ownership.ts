import { expect } from '@test/chai'
import { diamondFixture } from '@utils/test/fixtures'
import { wrapContractWithSigner } from '@utils/test/helpers/general'
import { Role } from '@utils/test/roles'

describe('Diamond', () => {
  beforeEach(async function () {
    await diamondFixture()
  })
  describe('#ownership', () => {
    it('sets correct owner', async function () {
      expect(await hre.Diamond.owner()).to.equal(hre.addr.deployer)
    })

    it('sets correct default admin role', async function () {
      expect(await hre.Diamond.hasRole(Role.ADMIN, hre.addr.deployer)).to.equal(true)
    })

    it('sets a new pending owner', async function () {
      const pendingOwner = hre.users.userOne
      await hre.Diamond.transferOwnership(pendingOwner.address)
      expect(await hre.Diamond.pendingOwner()).to.equal(pendingOwner.address)
    })
    it('sets the pending owner as new owner', async function () {
      const pendingOwner = hre.users.userOne
      await hre.Diamond.transferOwnership(pendingOwner.address)
      await wrapContractWithSigner(hre.Diamond, pendingOwner).acceptOwnership()
      expect(await hre.Diamond.owner()).to.equal(pendingOwner.address)
    })
  })
})
