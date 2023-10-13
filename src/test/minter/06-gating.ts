import { expect } from '@test/chai';
import { defaultFixture, type DefaultFixture } from '@utils/test/fixtures';
import { wrapContractWithSigner } from '@utils/test/helpers/general';
import { toBig } from '@utils/values';

describe('Gating', () => {
  let f: DefaultFixture;

  beforeEach(async function () {
    f = await defaultFixture();
    // Set Gating phase to 3

    await hre.Diamond.setGatingPhase(2);

    // setup collateral for userOne and userTwo
    this.initialBalance = toBig(100000);

    await f.Collateral.setBalance(hre.users.userOne, this.initialBalance, hre.Diamond.address);
    await f.Collateral.setBalance(hre.users.userTwo, this.initialBalance, hre.Diamond.address);

    this.depositArgsOne = {
      user: hre.users.userOne,
      asset: f.Collateral,
      amount: toBig(10000),
    };
    this.depositArgsTwo = {
      user: hre.users.userTwo,
      asset: f.Collateral,
      amount: toBig(10000),
    };

    // Deploy nft contract
    [this.nft] = await hre.deploy('MockERC1155', {
      args: [],
      from: hre.users.deployer.address,
    });
    await hre.Diamond.setKreskianCollection(this.nft.address);
  });

  it("should not allow to deposit collateral if the user doesn't have required nft's", async function () {
    await expect(
      wrapContractWithSigner(hre.Diamond, this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).to.be.reverted;
  });

  it("should allow to deposit collateral if the user has the required nft's", async function () {
    await this.nft.safeTransferFrom(hre.users.deployer.address, this.depositArgsOne.user.address, 0, 1, '0x00');
    await expect(
      wrapContractWithSigner(hre.Diamond, this.depositArgsOne.user).depositCollateral(
        this.depositArgsOne.user.address,
        f.Collateral.address,
        this.depositArgsOne.amount,
      ),
    ).not.to.be.reverted;
  });

  it('After all the phases anyone should be able to deposit collateral', async function () {
    await hre.Diamond.setGatingPhase(3);

    // Anyone should be able to deposit collateral
    await expect(
      wrapContractWithSigner(hre.Diamond, this.depositArgsTwo.user).depositCollateral(
        this.depositArgsTwo.user.address,
        f.Collateral.address,
        this.depositArgsTwo.amount,
      ),
    ).not.to.be.reverted;
  });
});
