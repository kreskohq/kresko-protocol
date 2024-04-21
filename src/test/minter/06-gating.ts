import { MockERC1155 } from '@/types/typechain'
import { expect } from '@test/chai'
import { type DefaultFixture, defaultFixture } from '@utils/test/fixtures'
import { toBig } from '@utils/values'

describe('Gating', () => {
  let f: DefaultFixture
  let nft: MockERC1155
  let nft2: MockERC1155

  beforeEach(async function () {
    f = await defaultFixture()
    // Set Gating phase to 3
    ;[nft] = await hre.deploy('MockERC1155', {
      args: ['MockERC1155_1', 'MockERC1155_1', 'https://mock.com/{id}.json', 'https://mock.com/contract.json'],
      deploymentName: 'MockERC1155_1',
      from: hre.users.deployer.address,
    })
    ;[nft2] = await hre.deploy('MockERC1155', {
      args: ['MockERC1155_2', 'MockERC1155_2', 'https://mock2.com/{id}.json', 'https://mock2.com/contract2.json'],
      deploymentName: 'MockERC1155_2',
      from: hre.users.deployer.address,
    })
    ;[this.GatingManager] = await hre.deploy('GatingManager', {
      args: [hre.users.deployer.address, nft.address, nft2.address, 1],
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
      hre.Diamond.connect(this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).to.be.reverted

    await nft['mint(address,uint256,uint256)'](this.depositArgsOne.user.address, 0, 1)
    await nft2['mint(address,uint256,uint256)'](this.depositArgsOne.user.address, 0, 1)

    await expect(
      hre.Diamond.connect(this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).to.be.reverted
  })

  it('should allow users to access in phase 1', async function () {
    await nft['mint(address,uint256,uint256)'](this.depositArgsOne.user.address, 0, 1)
    await nft2['mint(address,uint256,uint256)'](this.depositArgsOne.user.address, 0, 1)
    await nft2['mint(address,uint256,uint256)'](this.depositArgsOne.user.address, 3, 1)
    await expect(
      hre.Diamond.connect(this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).not.to.be.reverted
  })
  it('should not allow users to access phase 2 without nfts', async function () {
    await this.GatingManager.setPhase(2)
    await expect(
      hre.Diamond.connect(this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).to.be.reverted

    await nft['mint(address,uint256,uint256)'](this.depositArgsOne.user.address, 0, 1)
    await expect(
      hre.Diamond.connect(this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).to.be.reverted
  })

  it('should allow users to access in phase 2', async function () {
    await this.GatingManager.setPhase(2)
    await nft['mint(address,uint256,uint256)'](this.depositArgsOne.user.address, 0, 1)
    await nft2['mint(address,uint256,uint256)'](this.depositArgsOne.user.address, 0, 1)
    await expect(
      hre.Diamond.connect(this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).not.to.be.reverted
  })
  it('should not allow users to access phase 3 without nfts', async function () {
    await this.GatingManager.setPhase(3)
    await expect(
      hre.Diamond.connect(this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).to.be.reverted
  })

  it('should allow users to access in phase 3', async function () {
    await this.GatingManager.setPhase(3)
    await nft['mint(address,uint256,uint256)'](this.depositArgsOne.user.address, 0, 1)
    await expect(
      hre.Diamond.connect(this.depositArgsOne.user).depositCollateral(
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
      hre.Diamond.connect(this.depositArgsTwo.user).depositCollateral(
        this.depositArgsTwo.user.address,
        f.Collateral.address,
        this.depositArgsTwo.amount,
      ),
    ).not.to.be.reverted
  })
})
