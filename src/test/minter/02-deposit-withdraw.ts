import { Action } from '@/types'
import type {
  CollateralDepositedEventObject,
  CollateralWithdrawnEventObject,
} from '@/types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko'
import { Errors } from '@utils/errors'
import { getInternalEvent } from '@utils/events'
import { executeContractCallWithSigners } from '@utils/gnosis/utils/execution'
import { wrapKresko } from '@utils/redstone'
import { type DepositWithdrawFixture, depositWithdrawFixture } from '@utils/test/fixtures'
import { depositCollateral, withdrawCollateral } from '@utils/test/helpers/collaterals'
import optimized from '@utils/test/helpers/optimizations'
import { Role } from '@utils/test/roles'
import { fromBig, toBig } from '@utils/values'
import { expect } from 'chai'
import hre from 'hardhat'

describe('Minter - Deposit Withdraw', function () {
  let f: DepositWithdrawFixture
  this.slow(600)

  beforeEach(async function () {
    f = await depositWithdrawFixture()
  })

  describe('#collateral', () => {
    describe('#deposit', () => {
      it('reverts withdraws of krAsset collateral when deposits go below MIN_KRASSET_COLLATERAL_AMOUNT', async function () {
        const collateralAmount = toBig(100)
        await f.KrAssetCollateral.setBalance(f.user, collateralAmount, hre.Diamond.address)
        const depositAmount = collateralAmount.div(2)
        await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, depositAmount)
        // Rebase the asset according to params
        const denominator = 4
        const positive = true
        await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

        const rebasedDepositAmount = depositAmount.mul(denominator)
        const withdrawAmount = rebasedDepositAmount.sub((9e11).toString())

        expect(await hre.Diamond.getAccountCollateralAssets(f.user.address)).to.include(f.KrAssetCollateral.address)

        await expect(
          f.User.withdrawCollateral(f.user.address, f.KrAssetCollateral.address, withdrawAmount, 0, f.user.address),
        )
          .to.be.revertedWithCustomError(Errors(hre), 'COLLATERAL_AMOUNT_LOW')
          .withArgs(f.KrAssetCollateral.errorId, 9e11, 1e12)
      })

      it('reverts deposits of krAsset collateral for less than MIN_KRASSET_COLLATERAL_AMOUNT', async function () {
        const collateralAmount = toBig(100)
        await f.KrAssetCollateral.setBalance(f.user, collateralAmount, hre.Diamond.address)
        await expect(f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, (9e11).toString()))
          .to.be.revertedWithCustomError(Errors(hre), 'COLLATERAL_AMOUNT_LOW')
          .withArgs(f.KrAssetCollateral.errorId, 9e11, 1e12)
      })

      it('should allow an account to deposit whitelisted collateral', async function () {
        await expect(f.Depositor.depositCollateral(f.depositor.address, f.Collateral.address, f.initialDeposits)).not.to
          .be.reverted

        // Account has deposit entry
        const depositedCollateralAssetsAfter = await hre.Diamond.getAccountCollateralAssets(f.depositor.address)
        expect(depositedCollateralAssetsAfter).to.deep.equal([f.Collateral.address])

        // Account's collateral deposit balances have increased
        expect(await hre.Diamond.getAccountCollateralAmount(f.depositor.address, f.Collateral.address)).to.equal(
          f.initialDeposits,
        )
        // Kresko's balance has increased
        expect(await f.Collateral.balanceOf(hre.Diamond.address)).to.equal(f.initialDeposits.add(f.initialDeposits))
        // Account's balance has decreased
        expect(fromBig(await f.Collateral.balanceOf(f.depositor.address))).to.equal(
          fromBig(f.initialBalance) - fromBig(f.initialDeposits),
        )
      })

      it('should allow an arbitrary account to deposit whitelisted collateral on behalf of another account', async function () {
        // Initially, the array of the f.user's deposited collateral assets should be empty.
        const depositedCollateralAssetsBefore = await hre.Diamond.getAccountCollateralAssets(f.user.address)
        expect(depositedCollateralAssetsBefore).to.deep.equal([])

        // Deposit collateral, from f.depositor -> f.user.
        await expect(f.Depositor.depositCollateral(f.user.address, f.Collateral.address, f.initialDeposits)).not.to.be
          .reverted

        // Confirm the array of the f.user's deposited collateral assets has been pushed to.
        const depositedCollateralAssetsAfter = await hre.Diamond.getAccountCollateralAssets(f.user.address)
        expect(depositedCollateralAssetsAfter).to.deep.equal([f.Collateral.address])

        // Confirm the amount deposited is recorded for the f.user.
        const amountDeposited = await hre.Diamond.getAccountCollateralAmount(f.user.address, f.Collateral.address)
        expect(amountDeposited).to.equal(f.initialDeposits)

        // Confirm the amount as been transferred from the f.user into Kresko.sol
        const kreskoBalance = await f.Collateral.balanceOf(hre.Diamond.address)
        expect(kreskoBalance).to.equal(f.initialDeposits.add(f.initialDeposits))

        // Confirm the f.depositor's wallet balance has been adjusted accordingly
        const depositorBalanceAfter = await f.Collateral.balanceOf(f.depositor.address)
        expect(fromBig(depositorBalanceAfter)).to.equal(fromBig(f.initialBalance) - fromBig(f.initialDeposits))
      })

      it('should allow an account to deposit more collateral to an existing deposit', async function () {
        // Deposit first batch of collateral
        await expect(f.Depositor.depositCollateral(f.depositor.address, f.Collateral.address, f.initialDeposits)).not.to
          .be.reverted

        // Deposit second batch of collateral
        await expect(f.Depositor.depositCollateral(f.depositor.address, f.Collateral.address, f.initialDeposits)).not.to
          .be.reverted

        // Confirm the array of the f.user's deposited collateral assets hasn't been double-pushed to.
        const depositedCollateralAssetsAfter = await hre.Diamond.getAccountCollateralAssets(f.depositor.address)
        expect(depositedCollateralAssetsAfter).to.deep.equal([f.Collateral.address])

        // Confirm the amount deposited is recorded for the f.user.
        const amountDeposited = await hre.Diamond.getAccountCollateralAmount(f.depositor.address, f.Collateral.address)
        expect(amountDeposited).to.equal(f.initialDeposits.add(f.initialDeposits))
      })

      it('should allow an account to have deposited multiple collateral assets', async function () {
        // Load f.user account with a different type of collateral
        await f.Collateral2.setBalance(f.depositor, f.initialBalance, hre.Diamond.address)

        // Deposit batch of first collateral type
        await expect(f.Depositor.depositCollateral(f.depositor.address, f.Collateral.address, f.initialDeposits)).not.to
          .be.reverted

        // Deposit batch of second collateral type
        await expect(f.Depositor.depositCollateral(f.depositor.address, f.Collateral2.address, f.initialDeposits)).not
          .to.be.reverted

        // Confirm the array of the f.user's deposited collateral assets contains both collateral assets
        const depositedCollateralAssetsAfter = await hre.Diamond.getAccountCollateralAssets(f.depositor.address)
        expect(depositedCollateralAssetsAfter).to.deep.equal([f.Collateral.address, f.Collateral2.address])
      })

      it('should emit CollateralDeposited event', async function () {
        const tx = await f.Depositor.depositCollateral(f.depositor.address, f.Collateral.address, f.initialDeposits)
        const event = await getInternalEvent<CollateralDepositedEventObject>(tx, hre.Diamond, 'CollateralDeposited')
        expect(event.account).to.equal(f.depositor.address)
        expect(event.collateralAsset).to.equal(f.Collateral.address)
        expect(event.amount).to.equal(f.initialDeposits)
      })

      it('should revert if depositing collateral that has not been whitelisted', async function () {
        await expect(
          f.Depositor.depositCollateral(
            f.depositor.address,
            '0x0000000000000000000000000000000000000001',
            f.initialDeposits,
          ),
        )
          .to.be.revertedWithCustomError(Errors(hre), 'ASSET_NOT_MINTER_COLLATERAL')
          .withArgs(['', '0x0000000000000000000000000000000000000001'])
      })

      it('should revert if depositing an amount of 0', async function () {
        await expect(f.Depositor.depositCollateral(f.depositor.address, f.Collateral.address, 0))
          .to.be.revertedWithCustomError(Errors(hre), 'ZERO_DEPOSIT')
          .withArgs(f.Collateral.errorId)
      })
      it('should revert if collateral is not depositable', async function () {
        const { deployer, devOne, extOne } = await hre.ethers.getNamedSigners()

        await executeContractCallWithSigners(
          hre.Multisig,
          hre.Diamond,
          'toggleAssetsPaused',
          [[f.Collateral.address], Action.DEPOSIT, true, 0],
          [deployer, devOne, extOne],
        )

        const isDepositPaused = await hre.Diamond.assetActionPaused(Action.DEPOSIT.toString(), f.Collateral.address)
        expect(isDepositPaused).to.equal(true)

        await expect(
          wrapKresko(hre.Diamond, f.depositor).depositCollateral(f.depositor.address, f.Collateral.contract.address, 0),
        )
          .to.be.revertedWithCustomError(Errors(hre), 'ASSET_PAUSED_FOR_THIS_ACTION')
          .withArgs(f.Collateral.errorId, Action.DEPOSIT)
      })
    })

    describe('#withdraw', () => {
      describe("when the account's minimum collateral value is 0", function () {
        it('should allow an account to withdraw their entire deposit', async function () {
          const depositedCollateralAssets = await hre.Diamond.getAccountCollateralAssets(f.withdrawer.address)
          expect(depositedCollateralAssets).to.deep.equal([f.Collateral.address])

          await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.Collateral.address,
            f.initialDeposits,
            0,
            f.withdrawer.address,
          )

          // Ensure that the collateral asset is removed from the account's deposited collateral
          // assets array.
          const depositedCollateralAssetsPostWithdraw = await hre.Diamond.getAccountCollateralAssets(
            f.withdrawer.address,
          )
          expect(depositedCollateralAssetsPostWithdraw).to.deep.equal([])

          // Ensure the change in the f.user's deposit is recorded.
          const amountDeposited = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.Collateral.address,
          )
          expect(amountDeposited).to.equal(0)

          // Ensure the amount transferred is correct
          const kreskoBalance = await f.Collateral.balanceOf(hre.Diamond.address)
          expect(kreskoBalance).to.equal(0)
          const userOneBalance = await f.Collateral.balanceOf(f.withdrawer.address)
          expect(userOneBalance).to.equal(f.initialDeposits)
        })

        it('should allow an account to withdraw a portion of their deposit', async function () {
          const withdrawAmount = f.initialDeposits.div(2)

          await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.Collateral.address,
            withdrawAmount,
            0,
            f.withdrawer.address,
          )

          // Ensure the change in the f.user's deposit is recorded.
          const amountDeposited = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.Collateral.address,
          )
          expect(amountDeposited).to.equal(f.initialDeposits.sub(withdrawAmount))

          // Ensure that the collateral asset is still in the account's deposited collateral
          // assets array.
          const depositedCollateralAssets = await hre.Diamond.getAccountCollateralAssets(f.withdrawer.address)
          expect(depositedCollateralAssets).to.deep.equal([f.Collateral.address])

          const kreskoBalance = await f.Collateral.balanceOf(hre.Diamond.address)
          expect(kreskoBalance).to.equal(f.initialDeposits.sub(withdrawAmount))
          const userOneBalance = await f.Collateral.balanceOf(f.withdrawer.address)
          expect(userOneBalance).to.equal(f.initialDeposits.sub(amountDeposited))
        })

        it('should allow trusted address to withdraw another accounts deposit', async function () {
          // Grant userThree the MANAGER role
          await hre.Diamond.grantRole(Role.MANAGER, f.user.address)
          expect(await hre.Diamond.hasRole(Role.MANAGER, f.user.address)).to.equal(true)

          const collateralBefore = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.Collateral.address,
          )

          await expect(
            f.User.withdrawCollateral(
              f.withdrawer.address,
              f.Collateral.address,
              f.initialDeposits,
              0,
              f.withdrawer.address,
            ),
          ).to.not.be.reverted

          const collateralAfter = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.Collateral.address,
          )
          // Ensure that collateral was withdrawn
          expect(collateralAfter).to.equal(collateralBefore.sub(f.initialDeposits))
        })

        it('should emit CollateralWithdrawn event', async function () {
          const tx = await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.Collateral.address,
            f.initialDeposits,
            0,
            f.withdrawer.address,
          )

          const event = await getInternalEvent<CollateralWithdrawnEventObject>(tx, hre.Diamond, 'CollateralWithdrawn')
          expect(event.account).to.equal(f.withdrawer.address)
          expect(event.collateralAsset).to.equal(f.Collateral.address)
          expect(event.amount).to.equal(f.initialDeposits)
        })

        it('should not allow untrusted address to withdraw another accounts deposit', async function () {
          await expect(
            f.User.withdrawCollateral(
              f.withdrawer.address,
              f.Collateral.address,
              f.initialBalance,
              0,
              f.withdrawer.address,
            ),
          ).to.be.revertedWith(
            `AccessControl: account ${f.user.address.toLowerCase()} is missing role 0x46925e0f0cc76e485772167edccb8dc449d43b23b55fc4e756b063f49099e6a0`,
          )
        })

        describe("when the account's minimum collateral value is > 0", () => {
          beforeEach(async function () {
            // userOne mints some kr assets
            this.mintAmount = toBig(100)
            await f.Withdrawer.mintKreskoAsset(
              f.withdrawer.address,
              f.KrAsset!.address,
              this.mintAmount,
              f.withdrawer.address,
            )
            // Mint amount differs from deposited amount due to open fee
            const amountDeposited = await optimized.getAccountCollateralAmount(
              f.withdrawer.address,
              f.Collateral.address,
            )
            this.initialUserOneDeposited = amountDeposited

            this.mcr = await optimized.getMinCollateralRatioMinter()
          })

          it('should allow an account to withdraw their deposit if it does not violate the health factor', async function () {
            const withdrawAmount = toBig(10)

            // Ensure that the withdrawal would not put the account's collateral value
            // less than the account's minimum collateral value:
            const [accMinCollateralValue, accCollateralValue, withdrawnCollateralValue] = await Promise.all([
              hre.Diamond.getAccountMinCollateralAtRatio(f.withdrawer.address, this.mcr),
              hre.Diamond.getAccountTotalCollateralValue(f.withdrawer.address),
              hre.Diamond.getValue(f.Collateral.address, withdrawAmount),
            ])

            expect(accCollateralValue.sub(withdrawnCollateralValue).gte(accMinCollateralValue)).to.be.true

            await f.Withdrawer.withdrawCollateral(
              f.withdrawer.address,
              f.Collateral.address,
              withdrawAmount,
              0,
              f.withdrawer.address,
            )
            // Ensure that the collateral asset is still in the account's deposited collateral
            // assets array.
            const depositedCollateralAssets = await hre.Diamond.getAccountCollateralAssets(f.withdrawer.address)
            expect(depositedCollateralAssets).to.deep.equal([f.Collateral.address])

            // Ensure the change in the f.user's deposit is recorded.
            const amountDeposited = await hre.Diamond.getAccountCollateralAmount(
              f.withdrawer.address,
              f.Collateral.address,
            )

            expect(amountDeposited).to.equal(f.initialDeposits.sub(withdrawAmount))

            // Check the balances of the contract and f.user
            const kreskoBalance = await f.Collateral.balanceOf(hre.Diamond.address)
            expect(kreskoBalance).to.equal(f.initialDeposits.sub(withdrawAmount))
            const withdrawerBalance = await f.Collateral.balanceOf(f.withdrawer.address)
            expect(withdrawerBalance).to.equal(withdrawAmount)

            // Ensure the account's minimum collateral value is <= the account collateral value
            const accountMinCollateralValueAfter = await hre.Diamond.getAccountMinCollateralAtRatio(
              f.withdrawer.address,
              this.mcr,
            )
            const accountCollateralValueAfter = await hre.Diamond.getAccountTotalCollateralValue(f.withdrawer.address)
            expect(accountMinCollateralValueAfter.lte(accountCollateralValueAfter)).to.be.true
          })

          it('should allow withdraws that exceed deposits and only send the user total deposit available', async function () {
            const randomUser = hre.users.userFour

            await f.Collateral.setBalance!(randomUser, toBig(0))
            await f.Collateral.setBalance!(randomUser, toBig(1000))
            await f.Collateral.contract
              .connect(randomUser)
              .approve(hre.Diamond.address, hre.ethers.constants.MaxUint256)

            await depositCollateral({
              asset: f.Collateral,
              amount: toBig(1000),
              user: randomUser,
            })

            await withdrawCollateral({
              asset: f.Collateral,
              amount: toBig(1010),
              user: randomUser,
            })
            expect(await f.Collateral.balanceOf(randomUser.address)).to.equal(toBig(1000))
          })

          it('should revert if withdrawing an amount of 0', async function () {
            const withdrawAmount = 0
            await expect(
              f.Withdrawer.withdrawCollateral(
                f.withdrawer.address,
                f.Collateral.address,
                0,
                withdrawAmount,
                f.withdrawer.address,
              ),
            )
              .to.be.revertedWithCustomError(Errors(hre), 'ZERO_AMOUNT')
              .withArgs(f.Collateral.errorId)
          })

          it('should revert if the withdrawal violates the health factor', async function () {
            // userOne has a debt position, so attempting to withdraw the entire collateral deposit should be impossible
            const withdrawAmount = f.initialBalance

            // Ensure that the withdrawal would in fact put the account's collateral value
            // less than the account's minimum collateral value:
            const accountMinCollateralValue = await hre.Diamond.getAccountMinCollateralAtRatio(
              f.withdrawer.address,
              this.mcr,
            )
            const accountCollateralValue = await hre.Diamond.getAccountTotalCollateralValue(f.withdrawer.address)
            const withdrawnCollateralValue = await hre.Diamond.getValue(f.Collateral.address, withdrawAmount)
            expect(accountCollateralValue.sub(withdrawnCollateralValue).lt(accountMinCollateralValue)).to.be.true

            await expect(
              f.Withdrawer.withdrawCollateral(
                f.withdrawer.address,
                f.Collateral.address,
                withdrawAmount,
                0,
                f.withdrawer.address,
              ),
            )
              .to.be.revertedWithCustomError(Errors(hre), 'ACCOUNT_COLLATERAL_VALUE_LESS_THAN_REQUIRED')
              .withArgs(f.withdrawer.address, 0, 150000000000, await hre.Diamond.getMinCollateralRatioMinter())
          })

          it('should revert if the depositIndex is incorrect', async function () {
            const withdrawAmount = f.initialDeposits.div(2)
            await expect(
              f.Withdrawer.withdrawCollateral(
                f.withdrawer.address,
                f.Collateral.address,
                withdrawAmount,
                1, // Incorrect index
                f.withdrawer.address,
              ),
            )
              .to.be.revertedWithCustomError(Errors(hre), 'ARRAY_INDEX_OUT_OF_BOUNDS')
              .withArgs(f.Collateral.errorId, 1, [f.Collateral.address])
          })
        })
      })
    })

    describe('#deposit - rebase', function () {
      const mintAmount = toBig(100)
      this.slow(1500)
      beforeEach(async function () {
        await f.Collateral.setBalance(f.user, f.initialBalance, hre.Diamond.address)

        // Add krAsset as a collateral with anchor and cFactor of 1
        // Allowance for Kresko
        await f.KrAssetCollateral.contract.setVariable('_allowances', {
          [f.user.address]: {
            [hre.Diamond.address]: hre.ethers.constants.MaxInt256,
          },
        })

        // Deposit some collateral
        await f.User.depositCollateral(f.user.address, f.Collateral.address, f.initialDeposits)

        // Mint some krAssets
        await f.User.mintKreskoAsset(f.user.address, f.KrAssetCollateral.address, mintAmount, f.user.address)

        // Deposit all debt on tests
        this.krAssetCollateralAmount = await f.User.getAccountDebtAmount(f.user.address, f.KrAssetCollateral.address)
      })
      describe('deposit amounts are calculated correctly', function () {
        it('when deposit is made before positive rebase', async function () {
          await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, this.krAssetCollateralAmount)

          // Rebase params
          const denominator = 4
          const positive = true
          const expectedDepositsAfter = this.krAssetCollateralAmount.mul(denominator)

          const depositsBefore = await hre.Diamond.getAccountCollateralAmount(
            f.user.address,
            f.KrAssetCollateral.address,
          )

          // Rebase the asset according to params
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
            f.user.address,
            f.KrAssetCollateral.address,
          )
          // Ensure that the collateral balance is adjusted by the rebase
          expect(depositsBefore).to.not.equal(finalDeposits)
          expect(finalDeposits).to.equal(expectedDepositsAfter)
          expect(await f.KrAssetCollateral.balanceOf(f.user.address)).to.equal(0)
        })
        it('when deposit is made before negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false
          const depositAmountAfterRebase = this.krAssetCollateralAmount.div(denominator)

          // Deposit
          await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, this.krAssetCollateralAmount)

          const depositsBefore = await hre.Diamond.getAccountCollateralAmount(
            f.user.address,
            f.KrAssetCollateral.address,
          )

          // Rebase the asset according to params
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
            f.user.address,
            f.KrAssetCollateral.address,
          )
          // Ensure that the collateral balance is adjusted by the rebase
          expect(depositsBefore).to.not.equal(finalDeposits)
          expect(finalDeposits).to.equal(depositAmountAfterRebase)
          expect(await f.KrAssetCollateral.balanceOf(f.user.address)).to.equal(0)
        })
        it('when deposit is made after an positiveing rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true
          const depositAmount = this.krAssetCollateralAmount.mul(denominator)

          const depositsBefore = await hre.Diamond.getAccountCollateralAmount(
            f.user.address,
            f.KrAssetCollateral.address,
          )
          // Rebase the asset according to params
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Deposit after the rebase
          await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, depositAmount)

          // Get collateral deposits after
          const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
            f.user.address,
            f.KrAssetCollateral.address,
          )

          // Ensure that the collateral balance is what was deposited as no rebases occured after
          expect(depositsBefore).to.not.equal(finalDeposits)
          expect(finalDeposits).to.equal(depositAmount)
          expect(await f.KrAssetCollateral.balanceOf(f.user.address)).to.equal(0)
        })
        it('when deposit is made after an negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false
          const depositAmount = this.krAssetCollateralAmount.div(denominator)

          const depositsBefore = await hre.Diamond.getAccountCollateralAmount(
            f.user.address,
            f.KrAssetCollateral.address,
          )
          // Rebase the asset according to params
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Deposit after the rebase
          await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, depositAmount)

          // Get collateral deposits after
          const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
            f.user.address,
            f.KrAssetCollateral.address,
          )
          // Ensure that the collateral balance is what was deposited as no rebases occured after
          expect(depositsBefore).to.not.equal(finalDeposits)
          expect(finalDeposits).to.equal(depositAmount)
          expect(await f.KrAssetCollateral.balanceOf(f.user.address)).to.equal(0)
        })
        it('when deposit is made before and after a positiveing rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true

          // Deposit half before, half after
          const halfDepositBeforeRebase = this.krAssetCollateralAmount.div(2)
          const halfDepositAfterRebase = this.krAssetCollateralAmount.div(2).mul(denominator)
          const fullDepositAmount = this.krAssetCollateralAmount.mul(denominator)

          await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, halfDepositBeforeRebase)
          // Rebase the asset according to params
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Get deposits after
          const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
            f.user.address,
            f.KrAssetCollateral.address,
          )
          // Ensure that the collateral balance is adjusted by the rebase
          expect(depositsAfter).to.equal(halfDepositAfterRebase)

          // Deposit second time
          await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, halfDepositAfterRebase)
          // Get deposits after
          const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
            f.user.address,
            f.KrAssetCollateral.address,
          )

          expect(finalDeposits).to.equal(fullDepositAmount)
          expect(await f.KrAssetCollateral.balanceOf(f.user.address)).to.equal(0)
        })
        it('when deposit is made before and after a negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false

          // Deposit half before, half after
          const halfDepositBeforeRebase = this.krAssetCollateralAmount.div(2)
          const halfDepositAfterRebase = this.krAssetCollateralAmount.div(2).div(denominator)
          const fullDepositAmount = this.krAssetCollateralAmount.div(denominator)

          await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, halfDepositBeforeRebase)
          // Rebase the asset according to params
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Get deposits after
          const depositsAfterRebase = await hre.Diamond.getAccountCollateralAmount(
            f.user.address,
            f.KrAssetCollateral.address,
          )
          // Ensure that the collateral balance is adjusted by the rebase
          expect(depositsAfterRebase).to.equal(halfDepositAfterRebase)

          // Deposit second time
          await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, halfDepositAfterRebase)
          // Get deposits after
          const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
            f.user.address,
            f.KrAssetCollateral.address,
          )

          expect(finalDeposits).to.equal(fullDepositAmount)
          expect(await f.KrAssetCollateral.balanceOf(f.user.address)).to.equal(0)
        })
      })
      describe('deposit usd values are calculated correctly', () => {
        it('when deposit is made before positiveing rebase', async function () {
          await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, this.krAssetCollateralAmount)
          const valueBefore = await hre.Diamond.getAccountTotalCollateralValue(f.user.address)

          // Rebase params
          const denominator = 4
          const positive = true

          const newPrice = fromBig(await f.KrAssetCollateral.getPrice!(), 8) / denominator
          f.KrAssetCollateral.setPrice!(newPrice)
          // Rebase the asset according to params
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Get collateral value of account after
          const valueAfter = await hre.Diamond.getAccountTotalCollateralValue(f.user.address)

          // Ensure that the collateral value stays the same
          expect(valueBefore).to.equal(valueAfter)
        })
        it('when deposit is made before negative rebase', async function () {
          await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, this.krAssetCollateralAmount)
          const valueBefore = await hre.Diamond.getAccountTotalCollateralValue(f.user.address)

          // Rebase params
          const denominator = 4
          const positive = false
          const newPrice = fromBig(await f.KrAssetCollateral.getPrice!(), 8) * denominator
          f.KrAssetCollateral.setPrice(newPrice)

          // Rebase the asset according to params
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Get collateral value of account after
          const valueAfter = await hre.Diamond.getAccountTotalCollateralValue(f.user.address)

          // Ensure that the collateral value stays the same
          expect(valueBefore).to.equal(valueAfter)
        })
        it('when deposit is made after an positiveing rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true
          const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) / denominator

          // Get expected value before rebase and deposit
          const expectedValue = await hre.Diamond.getValue(f.KrAssetCollateral.address, this.krAssetCollateralAmount)

          const depositAmount = this.krAssetCollateralAmount.mul(denominator)

          // Rebase the asset according to params
          f.KrAssetCollateral.setPrice(newPrice)
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Deposit rebased amount after
          await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, depositAmount)

          // Get collateral value of account after
          const valueAfter = await hre.Diamond.getValue(f.KrAssetCollateral.address, depositAmount)

          // Ensure that the collateral value stays the same
          expect(expectedValue).to.equal(valueAfter)
        })
        it('when deposit is made after an negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false
          const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) * denominator

          // Get expected value before rebase and deposit
          const expectedValue = await hre.Diamond.getValue(f.KrAssetCollateral.address, this.krAssetCollateralAmount)

          const depositAmount = this.krAssetCollateralAmount.div(denominator)

          // Rebase the asset according to params
          f.KrAssetCollateral.setPrice(newPrice)
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Deposit rebased amount after
          await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, depositAmount)

          // Get collateral value of account after
          const valueAfter = await hre.Diamond.getValue(f.KrAssetCollateral.address, depositAmount)

          // Ensure that the collateral value stays the same
          expect(expectedValue).to.equal(valueAfter)
        })
        it('when deposit is made before and after a positiveing rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true
          const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) / denominator

          // Deposit half before, half after
          const halfDepositBeforeRebase = this.krAssetCollateralAmount.div(2)
          const halfDepositAfterRebase = this.krAssetCollateralAmount.div(2).mul(denominator)
          const fullDepositAmount = this.krAssetCollateralAmount.mul(denominator)

          await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, halfDepositBeforeRebase)

          const expectedValue = await hre.Diamond.getValue(f.KrAssetCollateral.address, halfDepositBeforeRebase)

          // Rebase the asset according to params
          f.KrAssetCollateral.setPrice(newPrice)
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Get value after
          const valueAfterRebase = await hre.Diamond.getValue(f.KrAssetCollateral.address, halfDepositAfterRebase)

          // Ensure that the collateral value stays the same
          expect(expectedValue).to.equal(valueAfterRebase)

          // Calculate added value since price adjusted in the rebase
          const expectedValueAfterSecondDeposit = await hre.Diamond.getValue(
            f.KrAssetCollateral.address,
            fullDepositAmount,
          )

          // Deposit more
          await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, halfDepositAfterRebase)

          // Get value
          const [finalValue] = await hre.Diamond.getAccountCollateralValues(f.user.address, f.KrAssetCollateral.address)

          // Ensure that the collateral value stays the same
          expect(finalValue).to.equal(expectedValueAfterSecondDeposit)
        })
        it('when deposit is made before and after a negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false
          const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) * denominator

          // Deposit half before, half after
          const halfDepositBeforeRebase = this.krAssetCollateralAmount.div(2)
          const halfDepositAfterRebase = this.krAssetCollateralAmount.div(2).div(denominator)
          const fullDepositAmount = this.krAssetCollateralAmount.div(denominator)

          await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, halfDepositBeforeRebase)

          const expectedValue = await hre.Diamond.getValue(f.KrAssetCollateral.address, halfDepositBeforeRebase)

          // Rebase the asset according to params
          f.KrAssetCollateral.setPrice(newPrice)
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Get value after
          const valueAfterRebase = await hre.Diamond.getValue(f.KrAssetCollateral.address, halfDepositAfterRebase)

          // Ensure that the collateral value stays the same
          expect(expectedValue).to.equal(valueAfterRebase)

          // Calculate added value since price adjusted in the rebase
          const expectedValueAfterSecondDeposit = await hre.Diamond.getValue(
            f.KrAssetCollateral.address,
            fullDepositAmount,
          )

          // Deposit more
          await f.User.depositCollateral(f.user.address, f.KrAssetCollateral.address, halfDepositAfterRebase)

          // Get deposits after
          const [finalValue] = await hre.Diamond.getAccountCollateralValues(f.user.address, f.KrAssetCollateral.address)

          // Ensure that the collateral value stays the same
          expect(finalValue).to.equal(expectedValueAfterSecondDeposit)
        })
      })
    })

    describe('#withdraw - rebase', function () {
      const mintAmount = toBig(100)
      this.slow(1500)
      beforeEach(async function () {
        await f.Withdrawer.mintKreskoAsset(
          f.withdrawer.address,
          f.KrAssetCollateral.address,
          mintAmount,
          f.withdrawer.address,
        )
        // Deposit all debt on tests
        this.krAssetCollateralAmount = await optimized.getAccountDebtAmount(f.withdrawer.address, f.KrAssetCollateral)
      })
      describe('withdraw amounts are calculated correctly', () => {
        it('when withdrawing a deposit made before positive rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true
          const rebasedDepositAmount = this.krAssetCollateralAmount.mul(denominator)

          // Deposit collateral before rebase
          await f.Withdrawer.depositCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            this.krAssetCollateralAmount,
          )

          // Rebase the asset according to params
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )
          // Ensure that the collateral balance is adjusted by the rebase
          expect(depositsAfter).to.equal(rebasedDepositAmount)

          // Withdraw rebased amount
          await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            rebasedDepositAmount,
            optimized.getAccountDepositIndex(f.withdrawer.address, f.KrAssetCollateral.address),
            f.withdrawer.address,
          )

          const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )
          const finalBalance = await f.KrAssetCollateral.contract.balanceOf(f.withdrawer.address)

          expect(finalDeposits).to.equal(0)
          expect(finalBalance).to.equal(rebasedDepositAmount)
        })
        it('when withdrawing a deposit made before negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false
          const rebasedDepositAmount = this.krAssetCollateralAmount.div(denominator)
          // Deposit collateral before rebase
          await f.Withdrawer.depositCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            this.krAssetCollateralAmount,
          )

          // Rebase the asset according to params
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )
          // Ensure that the collateral balance is adjusted by the rebase
          expect(depositsAfter).to.equal(rebasedDepositAmount)

          // Withdraw rebased amount
          await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            rebasedDepositAmount,
            optimized.getAccountDepositIndex(f.withdrawer.address, f.KrAssetCollateral.address),
            f.withdrawer.address,
          )

          const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )
          const finalBalance = await f.KrAssetCollateral.contract.balanceOf(f.withdrawer.address)

          expect(finalDeposits).to.equal(0)
          expect(finalBalance).to.equal(rebasedDepositAmount)
        })
        it('when withdrawing a deposit made after an positive rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true
          const rebasedDepositAmount = this.krAssetCollateralAmount.mul(denominator)

          // Rebase the asset according to params
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Deposit after the rebase
          await f.Withdrawer.depositCollateral(f.withdrawer.address, f.KrAssetCollateral.address, rebasedDepositAmount)

          // Get collateral deposits after
          const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )

          // Ensure that the collateral balance is what was deposited as no rebases occured after
          expect(depositsAfter).to.equal(rebasedDepositAmount)

          // Withdraw rebased amount
          await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            rebasedDepositAmount,
            optimized.getAccountDepositIndex(f.withdrawer.address, f.KrAssetCollateral.address),
            f.withdrawer.address,
          )

          const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )
          const finalBalance = await f.KrAssetCollateral.contract.balanceOf(f.withdrawer.address)

          expect(finalDeposits).to.equal(0)
          expect(finalBalance).to.equal(rebasedDepositAmount)
        })
        it('when withdrawing a deposit made after a negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false
          const rebasedDepositAmount = this.krAssetCollateralAmount.div(denominator)

          // Rebase the asset according to params
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Deposit after the rebase
          await f.Withdrawer.depositCollateral(f.withdrawer.address, f.KrAssetCollateral.address, rebasedDepositAmount)

          // Get collateral deposits after
          const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )

          // Ensure that the collateral balance is what was deposited as no rebases occured after
          expect(depositsAfter).to.equal(rebasedDepositAmount)

          // Withdraw rebased amount
          await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            rebasedDepositAmount,
            optimized.getAccountDepositIndex(f.withdrawer.address, f.KrAssetCollateral.address),
            f.withdrawer.address,
          )

          const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )
          const finalBalance = await f.KrAssetCollateral.contract.balanceOf(f.withdrawer.address)

          expect(finalDeposits).to.equal(0)
          expect(finalBalance).to.equal(rebasedDepositAmount)
        })
        it('when withdrawing a deposit made before and after a positive rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true

          // Deposit half before, half (rebase adjusted) after
          const firstDepositAmount = this.krAssetCollateralAmount.div(2)
          const secondDepositAmount = this.krAssetCollateralAmount.div(2).mul(denominator)
          const fullDepositAmount = this.krAssetCollateralAmount.mul(denominator)

          // Deposit before the rebase
          await f.Withdrawer.depositCollateral(f.withdrawer.address, f.KrAssetCollateral.address, firstDepositAmount)

          // Get deposits before
          const depositsFirst = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )
          expect(depositsFirst).to.equal(firstDepositAmount)

          // Rebase the asset according to params
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Deposit after the rebase
          await f.Withdrawer.depositCollateral(f.withdrawer.address, f.KrAssetCollateral.address, secondDepositAmount)

          // Get collateral deposits after
          const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )

          // Ensure deposit balance matches expected
          expect(depositsAfter).to.equal(fullDepositAmount)

          // Withdraw rebased amount
          await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            fullDepositAmount,
            optimized.getAccountDepositIndex(f.withdrawer.address, f.KrAssetCollateral.address),
            f.withdrawer.address,
          )

          const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )
          const finalBalance = await f.KrAssetCollateral.contract.balanceOf(f.withdrawer.address)

          expect(finalDeposits).to.equal(0)
          expect(finalBalance).to.equal(fullDepositAmount)
        })
        it('when withdrawing a deposit made before and after a negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false

          // Deposit half before, half (rebase adjusted) after
          const firstDepositAmount = this.krAssetCollateralAmount.div(2)
          const secondDepositAmount = this.krAssetCollateralAmount.div(2).div(denominator)
          const fullDepositAmount = this.krAssetCollateralAmount.div(denominator)

          // Deposit before the rebase
          await f.Withdrawer.depositCollateral(f.withdrawer.address, f.KrAssetCollateral.address, firstDepositAmount)

          // Get deposits before
          const depositsFirst = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )
          expect(depositsFirst).to.equal(firstDepositAmount)

          // Rebase the asset according to params
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Deposit after the rebase
          await f.Withdrawer.depositCollateral(f.withdrawer.address, f.KrAssetCollateral.address, secondDepositAmount)

          // Get collateral deposits after
          const depositsAfter = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )

          // Ensure deposit balance matches expected
          expect(depositsAfter).to.equal(fullDepositAmount)

          // Withdraw rebased amount
          await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            fullDepositAmount,
            optimized.getAccountDepositIndex(f.withdrawer.address, f.KrAssetCollateral.address),
            f.withdrawer.address,
          )

          const finalDeposits = await hre.Diamond.getAccountCollateralAmount(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )
          const finalBalance = await f.KrAssetCollateral.contract.balanceOf(f.withdrawer.address)

          expect(finalDeposits).to.equal(0)
          expect(finalBalance).to.equal(fullDepositAmount)
        })

        it('when withdrawing a non-rebased collateral after a rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true
          const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) / denominator
          const withdrawAmount = toBig(10)

          await f.Withdrawer.depositCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            this.krAssetCollateralAmount,
          )

          const nrcBalanceBefore = await f.Collateral.contract.balanceOf(f.withdrawer.address)
          const expectedNrcBalanceAfter = nrcBalanceBefore.add(withdrawAmount)

          // Rebase the asset according to params
          f.KrAssetCollateral.setPrice(newPrice)
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.Collateral.address,
            withdrawAmount,
            optimized.getAccountDepositIndex(f.withdrawer.address, f.Collateral.address),
            f.withdrawer.address,
          )

          expect(await f.Collateral.contract.balanceOf(f.withdrawer.address)).to.equal(expectedNrcBalanceAfter)
        })
      })
      describe('withdraw usd values are calculated correctly', () => {
        it('when withdrawing a deposit made before positive rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true
          const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) / denominator
          const rebasedDepositAmount = this.krAssetCollateralAmount.mul(denominator)

          await f.Withdrawer.depositCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            this.krAssetCollateralAmount,
          )

          // Rebase the asset according to params
          f.KrAssetCollateral.setPrice(newPrice)
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            rebasedDepositAmount,
            optimized.getAccountDepositIndex(f.withdrawer.address, f.KrAssetCollateral.address),
            f.withdrawer.address,
          )
          const [finalValue] = await hre.Diamond.getAccountCollateralValues(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )

          expect(finalValue).to.equal(0)
          expect(await f.KrAssetCollateral.contract.balanceOf(f.withdrawer.address)).to.equal(rebasedDepositAmount)
        })
        it('when withdrawing a deposit made before negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false
          const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) * denominator
          const rebasedDepositAmount = this.krAssetCollateralAmount.div(denominator)

          // Deposit
          await f.Withdrawer.depositCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            this.krAssetCollateralAmount,
          )

          // Rebase the asset according to params
          f.KrAssetCollateral.setPrice(newPrice)
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Withdraw the full rebased amount
          await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            rebasedDepositAmount,
            optimized.getAccountDepositIndex(f.withdrawer.address, f.KrAssetCollateral.address),
            f.withdrawer.address,
          )
          // Get value
          const [finalValue] = await hre.Diamond.getAccountCollateralValues(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )
          expect(finalValue).to.equal(0)
          expect(await f.KrAssetCollateral.contract.balanceOf(f.withdrawer.address)).to.equal(rebasedDepositAmount)
        })
        it('when withdrwaing a deposit made after an positiveing rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true
          const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) / denominator

          const depositAmount = this.krAssetCollateralAmount.mul(denominator)

          // Rebase the asset according to params
          f.KrAssetCollateral.setPrice(newPrice)
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Deposit rebased amount after
          await f.Withdrawer.depositCollateral(f.withdrawer.address, f.KrAssetCollateral.address, depositAmount)

          // Withdraw the full rebased amount
          await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            depositAmount,
            optimized.getAccountDepositIndex(f.withdrawer.address, f.KrAssetCollateral.address),
            f.withdrawer.address,
          )
          // Get value
          const [finalValue] = await hre.Diamond.getAccountCollateralValues(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )
          expect(finalValue).to.equal(0)
          expect(await f.KrAssetCollateral.contract.balanceOf(f.withdrawer.address)).to.equal(depositAmount)
        })
        it('when withdrawing a deposit made after an negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false
          const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) * denominator

          const depositAmount = this.krAssetCollateralAmount.div(denominator)

          // Rebase the asset according to params
          f.KrAssetCollateral.setPrice(newPrice)
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Deposit rebased amount after
          await f.Withdrawer.depositCollateral(f.withdrawer.address, f.KrAssetCollateral.address, depositAmount)

          // Withdraw the full rebased amount
          await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            depositAmount,
            optimized.getAccountDepositIndex(f.withdrawer.address, f.KrAssetCollateral.address),
            f.withdrawer.address,
          )
          // Get value
          const [finalValue] = await hre.Diamond.getAccountCollateralValues(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )
          expect(finalValue).to.equal(0)
          expect(await f.KrAssetCollateral.contract.balanceOf(f.withdrawer.address)).to.equal(depositAmount)
        })
        it('when withdrawing a deposit made before and after a positive rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true
          const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) / denominator

          // Deposit half before, half after
          const firstDepositAmount = this.krAssetCollateralAmount.div(2)
          const secondDepositAmount = this.krAssetCollateralAmount.div(2).mul(denominator)
          const fullDepositAmount = this.krAssetCollateralAmount.mul(denominator)

          await f.Withdrawer.depositCollateral(f.withdrawer.address, f.KrAssetCollateral.address, firstDepositAmount)

          const [expectedValue] = await hre.Diamond.getAccountCollateralValues(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )

          // Rebase the asset according to params
          f.KrAssetCollateral.setPrice(newPrice)
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Get value after
          const [valueAfterRebase] = await hre.Diamond.getAccountCollateralValues(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )

          // Ensure that the collateral value stays the same
          expect(expectedValue).to.equal(valueAfterRebase)

          // Deposit more
          await f.Withdrawer.depositCollateral(f.withdrawer.address, f.KrAssetCollateral.address, secondDepositAmount)

          // Withdraw the full rebased amount
          await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            fullDepositAmount,
            optimized.getAccountDepositIndex(f.withdrawer.address, f.KrAssetCollateral.address),
            f.withdrawer.address,
          )
          // Get value
          const [finalValue] = await hre.Diamond.getAccountCollateralValues(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )

          expect(finalValue).to.equal(0)
          expect(await f.KrAssetCollateral.contract.balanceOf(f.withdrawer.address)).to.equal(fullDepositAmount)
        })
        it('when withdrawing a deposit made before and after a negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false
          const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) * denominator

          // Deposit half before, half after
          const firstDepositAmount = this.krAssetCollateralAmount.div(2)
          const secondDepositAmount = this.krAssetCollateralAmount.div(denominator).div(2)
          const fullDepositAmount = this.krAssetCollateralAmount.div(denominator)

          await f.Withdrawer.depositCollateral(f.withdrawer.address, f.KrAssetCollateral.address, firstDepositAmount)

          const [expectedValue] = await hre.Diamond.getAccountCollateralValues(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )

          // Rebase the asset according to params
          f.KrAssetCollateral.setPrice(newPrice)
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          // Get value after
          const [valueAfterRebase] = await hre.Diamond.getAccountCollateralValues(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )

          // Ensure that the collateral value stays the same
          expect(expectedValue).to.equal(valueAfterRebase)

          // Deposit more
          await f.Withdrawer.depositCollateral(f.withdrawer.address, f.KrAssetCollateral.address, secondDepositAmount)

          // Withdraw the full rebased amount
          await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            fullDepositAmount,
            optimized.getAccountDepositIndex(f.withdrawer.address, f.KrAssetCollateral.address),
            f.withdrawer.address,
          )
          // Get value
          const [finalValue] = await hre.Diamond.getAccountCollateralValues(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
          )

          expect(finalValue).to.equal(0)
          expect(await f.KrAssetCollateral.contract.balanceOf(f.withdrawer.address)).to.equal(fullDepositAmount)
        })
        it('when withdrawing a non-rebased collateral after a rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true
          const newPrice = fromBig(await f.KrAssetCollateral.getPrice(), 8) / denominator
          const withdrawAmount = toBig(10)

          await f.Withdrawer.depositCollateral(
            f.withdrawer.address,
            f.KrAssetCollateral.address,
            this.krAssetCollateralAmount,
          )

          const accountValueBefore = await hre.Diamond.getAccountTotalCollateralValue(f.withdrawer.address)
          const [nrcValueBefore] = await hre.Diamond.getAccountCollateralValues(
            f.withdrawer.address,
            f.Collateral.address,
          )
          const withdrawValue = await hre.Diamond.getValue(f.Collateral.address, withdrawAmount)
          const expectedNrcValueAfter = nrcValueBefore.sub(withdrawValue)

          // Rebase the asset according to params
          f.KrAssetCollateral.setPrice(newPrice)
          await f.KrAssetCollateral.contract.rebase(toBig(denominator), positive, [])

          await f.Withdrawer.withdrawCollateral(
            f.withdrawer.address,
            f.Collateral.address,
            withdrawAmount,
            optimized.getAccountDepositIndex(f.withdrawer.address, f.KrAssetCollateral.address),
            f.withdrawer.address,
          )
          const finalAccountValue = await hre.Diamond.getAccountTotalCollateralValue(f.withdrawer.address)
          const [finalValue] = await hre.Diamond.getAccountCollateralValues(f.withdrawer.address, f.Collateral.address)

          expect(finalValue).to.equal(expectedNrcValueAfter)
          expect(finalAccountValue).to.equal(accountValueBefore.sub(withdrawValue))
        })
      })
    })
  })
})
