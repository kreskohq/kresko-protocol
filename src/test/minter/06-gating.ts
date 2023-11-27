import { expect } from '@test/chai'
import { type DefaultFixture, defaultFixture } from '@utils/test/fixtures'
import { wrapContractWithSigner } from '@utils/test/helpers/general'
import { toBig } from '@utils/values'

describe('Gating', () => {
  let f: DefaultFixture

  beforeEach(async function () {
    f = await defaultFixture()
    // Set Gating phase to 3
    ;[this.nft] = await hre.deploy('MockERC1155', {
      args: [],
      deploymentName: 'MockERC1155_1',
      from: hre.users.deployer.address,
    })
    ;[this.nft2] = await hre.deploy('MockERC1155', {
      args: [],
      deploymentName: 'MockERC1155_2',
      from: hre.users.deployer.address,
    })
    ;[this.GatingManager] = await hre.deploy('GatingManager', {
      args: [this.nft.address, this.nft2.address, 1],
      from: hre.users.deployer.address,
    })
    await hre.Diamond.setGatingManager(this.GatingManager.address)

    // setup collateral for userOne and userTwo
    this.initialBalance = toBig(100000)

    await f.Collateral.setBalance(hre.users.userOne, this.initialBalance, hre.Diamond.address)
    await f.Collateral.setBalance(hre.users.userTwo, this.initialBalance, hre.Diamond.address)

    this.depositArgsOne = {
      user: hre.users.userOne,
      asset: f.Collateral,
      amount: toBig(10000),
    }
    this.depositArgsTwo = {
      user: hre.users.userTwo,
      asset: f.Collateral,
      amount: toBig(10000),
    }
  })

  it('should not allow users to access phase 1 without nfts', async function () {
    await expect(
      wrapContractWithSigner(hre.Diamond, this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).to.be.reverted

    await this.nft.mint(this.depositArgsOne.user.address, 0, 1)
    await this.nft2.mint(this.depositArgsOne.user.address, 0, 1)
    await this.nft2.mint(this.depositArgsOne.user.address, 1, 1)
    await this.nft2.mint(this.depositArgsOne.user.address, 2, 1)

    await expect(
      wrapContractWithSigner(hre.Diamond, this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).to.be.reverted
  })

  it('should allow users to access in phase 1', async function () {
    await this.nft.mint(this.depositArgsOne.user.address, 0, 1)
    await this.nft2.mint(this.depositArgsOne.user.address, 0, 1)
    await this.nft2.mint(this.depositArgsOne.user.address, 1, 1)
    await this.nft2.mint(this.depositArgsOne.user.address, 2, 1)
    await this.nft2.mint(this.depositArgsOne.user.address, 3, 1)
    await expect(
      wrapContractWithSigner(hre.Diamond, this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).not.to.be.reverted
  })
  it('should not allow users to access phase 2 without nfts', async function () {
    await this.GatingManager.setPhase(2)
    await expect(
      wrapContractWithSigner(hre.Diamond, this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).to.be.reverted

    await this.nft.mint(this.depositArgsOne.user.address, 0, 1)
    await expect(
      wrapContractWithSigner(hre.Diamond, this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).to.be.reverted
  })

  it('should allow users to access in phase 2', async function () {
    await this.GatingManager.setPhase(2)
    await this.nft.mint(this.depositArgsOne.user.address, 0, 1)
    await this.nft2.mint(this.depositArgsOne.user.address, 0, 1)
    await expect(
      wrapContractWithSigner(hre.Diamond, this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).not.to.be.reverted
  })
  it('should not allow users to access phase 3 without nfts', async function () {
    await this.GatingManager.setPhase(3)
    await expect(
      wrapContractWithSigner(hre.Diamond, this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).to.be.reverted
  })

  it('should allow users to access in phase 3', async function () {
    await this.GatingManager.setPhase(3)
    await this.nft.mint(this.depositArgsOne.user.address, 0, 1)
    await expect(
      wrapContractWithSigner(hre.Diamond, this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).not.to.be.reverted
  })

  it('After all the phases anyone should be able to deposit collateral', async function () {
    await this.GatingManager.setPhase(0)

    // Anyone should be able to deposit collateral
    await expect(
      wrapContractWithSigner(hre.Diamond, this.depositArgsTwo.user).depositCollateral(
        this.depositArgsTwo.user.address,
        f.Collateral.address,
        this.depositArgsTwo.amount,
      ),
    ).not.to.be.reverted
  })
})
