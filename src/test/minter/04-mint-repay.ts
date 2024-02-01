import { MinterFee } from '@/types'
import type {
  FeePaidEventObject,
  KreskoAssetBurnedEvent,
  KreskoAssetMintedEventObject,
} from '@/types/typechain/hardhat-diamond-abi/HardhatDiamondABI.sol/Kresko'
import { Errors } from '@utils/errors'
import { getInternalEvent } from '@utils/events'
import { type MintRepayFixture, mintRepayFixture } from '@utils/test/fixtures'
import { fromScaledAmount, toScaledAmount } from '@utils/test/helpers/calculations'
import { withdrawCollateral } from '@utils/test/helpers/collaterals'
import { burnKrAsset, getDebtIndexAdjustedBalance, mintKrAsset } from '@utils/test/helpers/krassets'
import optimized from '@utils/test/helpers/optimizations'
import { TEN_USD } from '@utils/test/mocks'
import { Role } from '@utils/test/roles'
import { MaxUint128, fromBig, toBig } from '@utils/values'
import { expect } from 'chai'

const INTEREST_RATE_DELTA = toBig('0.000001')
const INTEREST_RATE_PRICE_DELTA = toBig('0.0001', 8)

describe('Minter', function () {
  let f: MintRepayFixture

  beforeEach(async function () {
    f = await mintRepayFixture()
    await f.reset()
  })
  this.slow(200)
  describe('#mint+burn', () => {
    describe('#mint', () => {
      it('should allow users to mint whitelisted Kresko assets backed by collateral', async function () {
        const kreskoAssetTotalSupplyBefore = await f.KrAsset.contract.totalSupply()
        expect(kreskoAssetTotalSupplyBefore).to.equal(f.initialMintAmount)
        // Initially, the array of the user's minted kresko assets should be empty.
        const mintedKreskoAssetsBefore = await hre.Diamond.getAccountMintedAssets(f.user1.address)
        expect(mintedKreskoAssetsBefore).to.deep.equal([])

        // Mint Kresko asset
        const mintAmount = toBig(10)
        await f.User1.mintKreskoAsset(
          { account: f.user1.address, krAsset: f.KrAsset.address, amount: mintAmount, receiver: f.user1.address },
          f.updateData,
        )

        // Confirm the array of the user's minted Kresko assets has been pushed to.
        const mintedKreskoAssetsAfter = await hre.Diamond.getAccountMintedAssets(f.user1.address)
        expect(mintedKreskoAssetsAfter).to.deep.equal([f.KrAsset.address])
        // Confirm the amount minted is recorded for the user.
        const amountMinted = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
        expect(amountMinted).to.equal(mintAmount)
        // Confirm the user's Kresko asset balance has increased
        const userBalance = await f.KrAsset.contract.balanceOf(f.user1.address)
        expect(userBalance).to.equal(mintAmount)
        // Confirm that the Kresko asset's total supply increased as expected
        const kreskoAssetTotalSupplyAfter = await f.KrAsset.contract.totalSupply()
        expect(kreskoAssetTotalSupplyAfter.eq(kreskoAssetTotalSupplyBefore.add(mintAmount)))
      })

      it('should allow successive, valid mints of the same Kresko asset', async function () {
        // Mint Kresko asset
        const firstMintAmount = toBig(50)
        await f.User1.mintKreskoAsset(
          { account: f.user1.address, krAsset: f.KrAsset.address, amount: firstMintAmount, receiver: f.user1.address },
          f.updateData,
        )

        // Confirm the array of the user's minted Kresko assets has been pushed to.
        const mintedKreskoAssetsAfter = await hre.Diamond.getAccountMintedAssets(f.user1.address)
        expect(mintedKreskoAssetsAfter).to.deep.equal([f.KrAsset.address])

        // Confirm the amount minted is recorded for the user.
        const amountMintedAfter = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
        expect(amountMintedAfter).to.equal(firstMintAmount)

        // Confirm the Kresko Asset as been minted to the user from Kresko.sol
        const userBalanceAfter = await f.KrAsset.contract.balanceOf(f.user1.address)
        expect(userBalanceAfter).to.equal(amountMintedAfter)

        // Confirm that the Kresko asset's total supply increased as expected
        const kreskoAssetTotalSupplyAfter = await f.KrAsset.contract.totalSupply()
        expect(kreskoAssetTotalSupplyAfter).to.equal(f.initialMintAmount.add(firstMintAmount))

        // ------------------------ Second mint ------------------------
        // Mint Kresko asset
        const secondMintAmount = toBig(50)
        await f.User1.mintKreskoAsset(
          { account: f.user1.address, krAsset: f.KrAsset.address, amount: secondMintAmount, receiver: f.user1.address },
          f.updateData,
        )

        // Confirm the array of the user's minted Kresko assets is unchanged
        const mintedKreskoAssetsFinal = await hre.Diamond.getAccountMintedAssets(f.user1.address)
        expect(mintedKreskoAssetsFinal).to.deep.equal([f.KrAsset.address])

        // Confirm the second mint amount is recorded for the user
        const amountMintedFinal = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
        expect(amountMintedFinal).to.closeTo(firstMintAmount.add(secondMintAmount), INTEREST_RATE_DELTA)

        // Confirm the Kresko Asset as been minted to the user from Kresko.sol
        const userBalanceFinal = await f.KrAsset.contract.balanceOf(f.user1.address)
        expect(userBalanceFinal).to.closeTo(amountMintedFinal, INTEREST_RATE_DELTA)

        // Confirm that the Kresko asset's total supply increased as expected
        const kreskoAssetTotalSupplyFinal = await f.KrAsset.contract.totalSupply()
        expect(kreskoAssetTotalSupplyFinal).to.closeTo(
          kreskoAssetTotalSupplyAfter.add(secondMintAmount),
          INTEREST_RATE_DELTA,
        )
      })

      it('should allow users to mint multiple different Kresko assets', async function () {
        // Initially, the array of the user's minted kresko assets should be empty.
        const mintedKreskoAssetsInitial = await optimized.getAccountMintedAssets(f.user1.address)
        expect(mintedKreskoAssetsInitial).to.deep.equal([])

        // Mint Kresko asset
        const firstMintAmount = toBig(10)
        await f.User1.mintKreskoAsset(
          { account: f.user1.address, krAsset: f.KrAsset.address, amount: firstMintAmount, receiver: f.user1.address },
          f.updateData,
        )

        // Confirm the array of the user's minted Kresko assets has been pushed to.
        const mintedKreskoAssetsAfter = await optimized.getAccountMintedAssets(f.user1.address)
        expect(mintedKreskoAssetsAfter).to.deep.equal([f.KrAsset.address])
        // Confirm the amount minted is recorded for the user.
        const amountMintedAfter = await optimized.getAccountDebtAmount(f.user1.address, f.KrAsset)
        expect(amountMintedAfter).to.equal(firstMintAmount)
        // Confirm the Kresko Asset as been minted to the user from Kresko.sol
        const userBalanceAfter = await f.KrAsset.balanceOf(f.user1.address)
        expect(userBalanceAfter).to.equal(amountMintedAfter)
        // Confirm that the Kresko asset's total supply increased as expected
        const kreskoAssetTotalSupplyAfter = await f.KrAsset.contract.totalSupply()
        expect(kreskoAssetTotalSupplyAfter).to.equal(f.initialMintAmount.add(firstMintAmount))

        // ------------------------ Second mint ------------------------

        // Mint Kresko asset
        const secondMintAmount = toBig(20)
        await f.User1.mintKreskoAsset(
          {
            account: f.user1.address,
            krAsset: f.KrAsset2.address,
            amount: secondMintAmount,
            receiver: f.user1.address,
          },
          f.updateData,
        )

        // Confirm that the second address has been pushed to the array of the user's minted Kresko assets
        const mintedKreskoAssetsFinal = await optimized.getAccountMintedAssets(f.user1.address)
        expect(mintedKreskoAssetsFinal).to.deep.equal([f.KrAsset.address, f.KrAsset2.address])
        // Confirm the second mint amount is recorded for the user
        const amountMintedAssetTwo = await optimized.getAccountDebtAmount(f.user1.address, f.KrAsset2)
        expect(amountMintedAssetTwo).to.equal(secondMintAmount)
        // Confirm the Kresko Asset as been minted to the user from Kresko.sol
        const userBalanceFinal = await f.KrAsset2.balanceOf(f.user1.address)
        expect(userBalanceFinal).to.equal(amountMintedAssetTwo)
        // Confirm that the Kresko asset's total supply increased as expected
        const secondKreskoAssetTotalSupply = await f.KrAsset2.contract.totalSupply()
        expect(secondKreskoAssetTotalSupply).to.equal(secondMintAmount)
      })

      it('should allow users to mint Kresko assets with USD value equal to the minimum debt value', async function () {
        // Confirm that the mint amount's USD value is equal to the contract's current minimum debt value
        const mintAmount = toBig(1) // 1 * $10 = $10
        const mintAmountUSDValue = await hre.Diamond.getValue(f.KrAsset.address, mintAmount)
        const currMinimumDebtValue = await hre.Diamond.getMinDebtValueMinter()
        expect(mintAmountUSDValue).to.equal(currMinimumDebtValue)

        await f.User1.mintKreskoAsset(
          { account: f.user1.address, krAsset: f.KrAsset.address, amount: mintAmount, receiver: f.user1.address },
          f.updateData,
        )

        // Confirm that the mint was successful and user's balances have increased
        const finalKreskoAssetDebt = await optimized.getAccountDebtAmount(f.user1.address, f.KrAsset)
        expect(finalKreskoAssetDebt).to.equal(mintAmount)
      })

      it('should allow a trusted address to mint Kresko assets on behalf of another user', async function () {
        await hre.Diamond.grantRole(Role.MANAGER, f.user2.address)

        // Initially, the array of the user's minted kresko assets should be empty.
        const mintedKreskoAssetsBefore = await optimized.getAccountMintedAssets(f.user1.address)
        expect(mintedKreskoAssetsBefore).to.deep.equal([])

        // userThree (trusted contract) mints Kresko asset for userOne
        const mintAmount = toBig(1)
        await f.User2.mintKreskoAsset(
          { account: f.user1.address, krAsset: f.KrAsset.address, amount: mintAmount, receiver: f.user1.address },
          f.updateData,
        )

        // Check that debt exists now for userOne
        const userTwoBalanceAfter = await optimized.getAccountDebtAmount(f.user1.address, f.KrAsset)
        expect(userTwoBalanceAfter).to.equal(mintAmount)
        // Initially, the array of the user's minted kresko assets should be empty.
        const mintedKreskoAssetsAfter = await optimized.getAccountMintedAssets(f.user1.address)
        expect(mintedKreskoAssetsAfter).to.deep.equal([f.KrAsset.address])
      })

      it('should emit KreskoAssetMinted event', async function () {
        const tx = await f.User1.mintKreskoAsset(
          {
            account: f.user1.address,
            krAsset: f.KrAsset.address,
            amount: f.initialMintAmount,
            receiver: f.user1.address,
          },
          f.updateData,
        )

        const event = await getInternalEvent<KreskoAssetMintedEventObject>(tx, hre.Diamond, 'KreskoAssetMinted')
        expect(event.account).to.equal(f.user1.address)
        expect(event.kreskoAsset).to.equal(f.KrAsset.address)
        expect(event.amount).to.equal(f.initialMintAmount)
      })

      it('should not allow untrusted account to mint Kresko assets on behalf of another user', async function () {
        await expect(
          f.User1.mintKreskoAsset(
            { account: f.user2.address, krAsset: f.KrAsset.address, amount: toBig(1), receiver: f.user2.address },
            f.updateData,
          ),
        ).to.be.revertedWith(
          `AccessControl: account ${f.user1.address.toLowerCase()} is missing role 0x46925e0f0cc76e485772167edccb8dc449d43b23b55fc4e756b063f49099e6a0`,
        )
      })

      it("should not allow users to mint Kresko assets if the resulting position's USD value is less than the minimum debt value", async function () {
        const currMinimumDebtValue = await optimized.getMinDebtValue()
        const mintAmount = currMinimumDebtValue.wadDiv(TEN_USD.ebn(8)).sub(1e9)

        await expect(
          f.User1.mintKreskoAsset(
            { account: f.user1.address, krAsset: f.KrAsset.address, amount: mintAmount, receiver: f.user1.address },
            f.updateData,
          ),
        )
          .to.be.revertedWithCustomError(Errors(hre), 'MINT_VALUE_LESS_THAN_MIN_DEBT_VALUE')
          .withArgs(f.KrAsset.errorId, 10e8 - 1, currMinimumDebtValue)
      })

      it('should not allow users to mint non-whitelisted Kresko assets', async function () {
        // Attempt to mint a non-deployed, non-whitelisted Kresko asset
        await expect(
          f.User1.mintKreskoAsset(
            {
              account: f.user1.address,
              krAsset: '0x0000000000000000000000000000000000000002',
              amount: toBig(1),
              receiver: f.user1.address,
            },
            f.updateData,
          ),
        )
          .to.be.revertedWithCustomError(Errors(hre), 'ASSET_NOT_MINTABLE_FROM_MINTER')
          .withArgs(['', '0x0000000000000000000000000000000000000002'])
      })

      it('should not allow users to mint Kresko assets over their collateralization ratio limit', async function () {
        const collateralAmountDeposited = await optimized.getAccountCollateralAmount(
          f.user1.address,
          f.Collateral.address,
        )

        const MCR = await hre.Diamond.getMinCollateralRatioMinter()
        const mcrAmount = collateralAmountDeposited.percentMul(MCR)
        const mintAmount = mcrAmount.add(1)
        const mintValue = await hre.Diamond.getValue(f.KrAsset.address, mintAmount)

        const userState = await hre.Diamond.getAccountState(f.user1.address)

        await expect(
          f.User1.mintKreskoAsset(
            { account: f.user1.address, krAsset: f.KrAsset.address, amount: mintAmount, receiver: f.user1.address },
            f.updateData,
          ),
        )
          .to.be.revertedWithCustomError(Errors(hre), 'ACCOUNT_COLLATERAL_VALUE_LESS_THAN_REQUIRED')
          .withArgs(f.user1.address, userState.totalCollateralValue, mintValue.percentMul(MCR), MCR)
      })

      it('should not allow the minting of any Kresko asset amount over its maximum limit', async function () {
        // User deposits another 10,000 collateral tokens, enabling mints of up to 20,000/1.5 = ~13,333 kresko asset tokens
        await f.Collateral.setBalance(f.user1, toBig(100000000))
        await expect(f.User1.depositCollateral(f.user1.address, f.Collateral.address, toBig(10000))).not.to.be.reverted
        const assetSupplyLimit = toBig(1)
        const mintAmount = toBig(2)
        await f.KrAsset.update({
          maxDebtMinter: assetSupplyLimit,
        })

        await expect(
          f.User1.mintKreskoAsset(
            { account: f.user1.address, krAsset: f.KrAsset.address, amount: mintAmount, receiver: f.user1.address },
            f.updateData,
          ),
        )
          .to.be.revertedWithCustomError(Errors(hre), 'EXCEEDS_ASSET_MINTING_LIMIT')
          .withArgs(f.KrAsset.errorId, (await f.KrAsset.contract.totalSupply()).add(mintAmount), assetSupplyLimit)
        await f.KrAsset.update({
          maxDebtMinter: assetSupplyLimit,
        })
      })
      it.skip('should not allow the minting of kreskoAssets if the market is closed', async function () {
        await expect(
          f.User1.mintKreskoAsset(
            { account: f.user1.address, krAsset: f.KrAsset.address, amount: toBig(1), receiver: f.user1.address },
            f.updateData,
          ),
        ).to.be.revertedWithCustomError(Errors(hre), 'MARKET_CLOSED')

        // Confirm that the user has no minted krAssets
        const mintedKreskoAssetsBefore = await hre.Diamond.getAccountMintedAssets(f.user1.address)
        expect(mintedKreskoAssetsBefore).to.deep.equal([])

        // Confirm that opening the market makes krAsset mintable again
        await f.User1.mintKreskoAsset(
          { account: f.user1.address, krAsset: f.KrAsset.address, amount: toBig(10), receiver: f.user1.address },
          f.updateData,
        )

        // Confirm the array of the user's minted Kresko assets has been pushed to
        const mintedKreskoAssetsAfter = await hre.Diamond.getAccountMintedAssets(f.user1.address)
        expect(mintedKreskoAssetsAfter).to.deep.equal([f.KrAsset.address])
      })
    })

    describe('#mint - rebase', () => {
      const mintAmountDec = 40
      const mintAmount = toBig(mintAmountDec)
      describe('debt amounts are calculated correctly', () => {
        it('when minted before positive rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true

          // Mint before rebase
          await f.User1.mintKreskoAsset(
            { account: f.user1.address, krAsset: f.KrAsset.address, amount: mintAmount, receiver: f.user1.address },
            f.updateData,
          )

          const balanceBefore = await f.KrAsset.balanceOf(f.user1.address)

          // Rebase the asset according to params
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          // Ensure that the minted balance is adjusted by the rebase
          const [balanceAfter, balanceAfterAdjusted] = await getDebtIndexAdjustedBalance(f.user1, f.KrAsset)
          expect(balanceAfter).to.equal(mintAmount.mul(denominator))
          expect(balanceBefore).to.not.equal(balanceAfter)

          // Ensure that debt amount is also adjsuted by the rebase
          const debtAmount = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          expect(balanceAfterAdjusted).to.equal(debtAmount)
        })

        it('when minted before negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false

          // Mint before rebase
          await f.User1.mintKreskoAsset(
            { account: f.user1.address, krAsset: f.KrAsset.address, amount: mintAmount, receiver: f.user1.address },
            f.updateData,
          )

          const balanceBefore = await f.KrAsset.balanceOf(f.user1.address)

          // Rebase the asset according to params
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          // Ensure that the minted balance is adjusted by the rebase
          const [balanceAfter, balanceAfterAdjusted] = await getDebtIndexAdjustedBalance(f.user1, f.KrAsset)
          expect(balanceAfter).to.equal(mintAmount.div(denominator))
          expect(balanceBefore).to.not.equal(balanceAfter)

          // Ensure that debt amount is also adjsuted by the rebase
          const debtAmount = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          expect(balanceAfterAdjusted).to.equal(debtAmount)
        })

        it('when minted after positive rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true

          // Mint before rebase
          await f.User1.mintKreskoAsset(
            { account: f.user1.address, krAsset: f.KrAsset.address, amount: mintAmount, receiver: f.user1.address },
            f.updateData,
          )

          const balanceBefore = await f.KrAsset.balanceOf(f.user1.address)

          // Rebase the asset according to params
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          // Ensure that the minted balance is adjusted by the rebase
          const [balanceAfter, balanceAfterAdjusted] = await getDebtIndexAdjustedBalance(f.user1, f.KrAsset)
          expect(balanceAfter).to.equal(mintAmount.mul(denominator))
          expect(balanceBefore).to.not.equal(balanceAfter)

          // Ensure that debt amount is also adjusted by the rebase
          const debtAmount = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          expect(balanceAfterAdjusted).to.equal(debtAmount)
        })

        it('when minted after negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false

          // Mint before rebase
          await f.User1.mintKreskoAsset(
            { account: f.user1.address, krAsset: f.KrAsset.address, amount: mintAmount, receiver: f.user1.address },
            f.updateData,
          )

          const balanceBefore = await f.KrAsset.balanceOf(f.user1.address)

          // Rebase the asset according to params
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          // Ensure that the minted balance is adjusted by the rebase
          const [balanceAfter, balanceAfterAdjusted] = await getDebtIndexAdjustedBalance(f.user1, f.KrAsset)
          expect(balanceAfter).to.equal(mintAmount.div(denominator))
          expect(balanceBefore).to.not.equal(balanceAfter)

          // Ensure that debt amount is also adjusted by the rebase
          const debtAmount = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          expect(balanceAfterAdjusted).to.equal(debtAmount)
        })
      })

      describe('debt values are calculated correctly', () => {
        it('when mint is made before positive rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true

          // Mint before rebase
          await f.User1.mintKreskoAsset(
            { account: f.user1.address, krAsset: f.KrAsset.address, amount: mintAmount, receiver: f.user1.address },
            f.updateData,
          )
          const valueBeforeRebase = await hre.Diamond.getAccountTotalDebtValue(f.user1.address)

          // Adjust price accordingly
          const assetPrice = await f.KrAsset.getPrice()
          f.KrAsset.setPrice(fromBig(assetPrice.div(denominator), 8))

          // Rebase the asset according to params
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          // Ensure that the value inside protocol matches the value before rebase
          const valueAfterRebase = await hre.Diamond.getAccountTotalDebtValue(f.user1.address)
          expect(valueAfterRebase).to.equal(valueBeforeRebase)
        })

        it('when mint is made before negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false

          // Mint before rebase
          await f.User1.mintKreskoAsset(
            { account: f.user1.address, krAsset: f.KrAsset.address, amount: mintAmount, receiver: f.user1.address },
            f.updateData,
          )
          const valueBeforeRebase = await hre.Diamond.getAccountTotalDebtValue(f.user1.address)

          // Adjust price accordingly
          const assetPrice = await f.KrAsset.getPrice()
          f.KrAsset.setPrice(fromBig(assetPrice.mul(denominator), 8))

          // Rebase the asset according to params
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          // Ensure that the value inside protocol matches the value before rebase
          const valueAfterRebase = await hre.Diamond.getAccountTotalDebtValue(f.user1.address)
          expect(valueAfterRebase).to.equal(valueBeforeRebase)
        })
        it('when minted after positive rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true
          // Equal value after rebase
          const equalMintAmount = mintAmount.mul(denominator)

          const assetPrice = await f.KrAsset.getPrice()

          // Get value of the future mint before rebase
          const valueBeforeRebase = await hre.Diamond.getValue(f.KrAsset.address, mintAmount)

          // Adjust price accordingly
          f.KrAsset.setPrice(fromBig(assetPrice, 8) / denominator)
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          await f.User1.mintKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: equalMintAmount,
              receiver: f.user1.address,
            },
            f.updateData,
          )

          // Ensure that value after mint matches what is expected
          const valueAfterRebase = await hre.Diamond.getAccountTotalDebtValue(f.user1.address)
          expect(valueAfterRebase).to.equal(valueBeforeRebase)
        })

        it('when minted after negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false
          // Equal value after rebase
          const equalMintAmount = mintAmount.div(denominator)

          const assetPrice = await f.KrAsset.getPrice()

          // Get value of the future mint before rebase
          const valueBeforeRebase = await hre.Diamond.getValue(f.KrAsset.address, mintAmount)

          // Adjust price accordingly
          f.KrAsset.setPrice(fromBig(assetPrice.mul(denominator), 8))
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          await f.User1.mintKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: equalMintAmount,
              receiver: f.user1.address,
            },
            f.updateData,
          )

          // Ensure that value after mint matches what is expected
          const valueAfterRebase = await hre.Diamond.getAccountTotalDebtValue(f.user1.address)
          expect(valueAfterRebase).to.equal(valueBeforeRebase)
        })
      })

      describe('debt values and amounts are calculated correctly', () => {
        it('when minted before and after a positive rebase', async function () {
          const assetPrice = await f.KrAsset.getPrice()

          // Rebase params
          const denominator = 4
          const positive = true

          const mintAmountAfterRebase = mintAmount.mul(denominator)
          const assetPriceRebase = assetPrice.div(denominator)

          // Get value of the future mint
          const valueBeforeRebase = await hre.Diamond.getValue(f.KrAsset.address, mintAmount)

          // Mint before rebase
          await f.User1.mintKreskoAsset(
            { account: f.user1.address, krAsset: f.KrAsset.address, amount: mintAmount, receiver: f.user1.address },
            f.updateData,
          )

          // Get results
          const balanceAfterFirstMint = await f.KrAsset.contract.balanceOf(f.user1.address)
          const debtAmountAfterFirstMint = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          const debtValueAfterFirstMint = await hre.Diamond.getAccountTotalDebtValue(f.user1.address)

          // Assert
          expect(balanceAfterFirstMint).to.equal(debtAmountAfterFirstMint)
          expect(valueBeforeRebase).to.equal(debtValueAfterFirstMint)

          // Adjust price and rebase
          f.KrAsset.setPrice(fromBig(assetPriceRebase, 8))
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          // Ensure debt amounts and balances match
          const [balanceAfterFirstRebase, balanceAfterFirstRebaseAdjusted] = await getDebtIndexAdjustedBalance(
            f.user1,
            f.KrAsset,
          )
          const debtAmountAfterFirstRebase = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          expect(balanceAfterFirstRebase).to.equal(mintAmountAfterRebase)
          expect(balanceAfterFirstRebaseAdjusted).to.equal(debtAmountAfterFirstRebase)

          // Ensure debt usd values match
          const debtValueAfterFirstRebase = await hre.Diamond.getAccountTotalDebtValue(f.user1.address)
          expect(await fromScaledAmount(debtValueAfterFirstRebase, f.KrAsset)).to.equal(debtValueAfterFirstMint)
          expect(await fromScaledAmount(debtValueAfterFirstRebase, f.KrAsset)).to.equal(valueBeforeRebase)

          // Mint after rebase
          await f.User1.mintKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: mintAmountAfterRebase,
              receiver: f.user1.address,
            },
            f.updateData,
          )

          // Ensure debt amounts and balances match
          const balanceAfterSecondMint = await f.KrAsset.contract.balanceOf(f.user1.address)

          // Ensure balance matches
          const expectedBalanceAfterSecondMint = balanceAfterFirstRebase.add(mintAmountAfterRebase)
          expect(balanceAfterSecondMint).to.equal(expectedBalanceAfterSecondMint)
          // Ensure debt usd values match
          const debtValueAfterSecondMint = await hre.Diamond.getAccountTotalDebtValue(f.user1.address)
          expect(await fromScaledAmount(debtValueAfterSecondMint, f.KrAsset)).to.closeTo(
            debtValueAfterFirstMint.mul(2),
            INTEREST_RATE_PRICE_DELTA,
          )
          expect(debtValueAfterSecondMint).to.closeTo(valueBeforeRebase.mul(2), INTEREST_RATE_PRICE_DELTA)
        })

        it('when minted before and after a negative rebase', async function () {
          const assetPrice = await f.KrAsset.getPrice()

          // Rebase params
          const denominator = 4
          const positive = false

          const mintAmountAfterRebase = mintAmount.div(denominator)
          const assetPriceRebase = assetPrice.mul(denominator)

          // Get value of the future mint
          const valueBeforeRebase = await hre.Diamond.getValue(f.KrAsset.address, mintAmount)

          // Mint before rebase
          await f.User1.mintKreskoAsset(
            { account: f.user1.address, krAsset: f.KrAsset.address, amount: mintAmount, receiver: f.user1.address },
            f.updateData,
          )

          // Get results
          const balanceAfterFirstMint = await f.KrAsset.contract.balanceOf(f.user1.address)
          const debtAmountAfterFirstMint = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          const debtValueAfterFirstMint = await hre.Diamond.getAccountTotalDebtValue(f.user1.address)

          // Assert
          expect(balanceAfterFirstMint).to.equal(debtAmountAfterFirstMint)
          expect(valueBeforeRebase).to.equal(debtValueAfterFirstMint)

          // Adjust price and rebase
          f.KrAsset.setPrice(fromBig(assetPriceRebase, 8))
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          // Ensure debt amounts and balances match
          const [balanceAfterFirstRebase, balanceAfterFirstRebaseAdjusted] = await getDebtIndexAdjustedBalance(
            f.user1,
            f.KrAsset,
          )
          const debtAmountAfterFirstRebase = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          expect(balanceAfterFirstRebase).to.equal(mintAmountAfterRebase)
          expect(balanceAfterFirstRebaseAdjusted).to.equal(debtAmountAfterFirstRebase)

          // Ensure debt usd values match
          const debtValueAfterFirstRebase = await hre.Diamond.getAccountTotalDebtValue(f.user1.address)
          expect(debtValueAfterFirstRebase).to.equal(await toScaledAmount(debtValueAfterFirstMint, f.KrAsset))
          expect(debtValueAfterFirstRebase).to.equal(await toScaledAmount(valueBeforeRebase, f.KrAsset))

          // Mint after rebase
          await f.User1.mintKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: mintAmountAfterRebase,
              receiver: f.user1.address,
            },
            f.updateData,
          )

          // Ensure debt usd values match
          const debtValueAfterSecondMint = await hre.Diamond.getAccountTotalDebtValue(f.user1.address)
          expect(debtValueAfterSecondMint).to.closeTo(
            await toScaledAmount(debtValueAfterFirstMint.mul(2), f.KrAsset),
            INTEREST_RATE_PRICE_DELTA,
          )
          expect(debtValueAfterSecondMint).to.closeTo(
            await toScaledAmount(valueBeforeRebase.mul(2), f.KrAsset),
            INTEREST_RATE_PRICE_DELTA,
          )
        })
      })
    })

    describe('#burn', () => {
      beforeEach(async function () {
        await f.User1.mintKreskoAsset(
          {
            account: f.user1.address,
            krAsset: f.KrAsset.address,
            amount: f.initialMintAmount,
            receiver: f.user1.address,
          },
          f.updateData,
        )
      })

      it('should allow users to burn some of their Kresko asset balances', async function () {
        const kreskoAssetTotalSupplyBefore = await f.KrAsset.contract.totalSupply()

        // Burn Kresko asset
        const burnAmount = toBig(1)
        const kreskoAssetIndex = 0
        await f.User1.burnKreskoAsset(
          {
            account: f.user1.address,
            krAsset: f.KrAsset.address,
            amount: burnAmount,
            mintIndex: kreskoAssetIndex,
            repayee: f.user1.address,
          },
          f.updateData,
        )

        // Confirm the user no long holds the burned Kresko asset amount
        const userBalance = await f.KrAsset.balanceOf(f.user1.address)
        expect(userBalance).to.equal(f.initialMintAmount.sub(burnAmount))

        // Confirm that the Kresko asset's total supply decreased as expected
        const kreskoAssetTotalSupplyAfter = await f.KrAsset.contract.totalSupply()
        expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(burnAmount))

        // Confirm the array of the user's minted Kresko assets still contains the asset's address
        const mintedKreskoAssetsAfter = await optimized.getAccountMintedAssets(f.user1.address)
        expect(mintedKreskoAssetsAfter).to.deep.equal([f.KrAsset.address])

        // Confirm the user's minted kresko asset amount has been updated
        const userDebt = await optimized.getAccountDebtAmount(f.user1.address, f.KrAsset)
        expect(userDebt).to.closeTo(f.initialMintAmount.sub(burnAmount), INTEREST_RATE_DELTA)
      })

      it('should allow trusted address to burn its own Kresko asset balances on behalf of another user', async function () {
        await hre.Diamond.grantRole(Role.MANAGER, f.user2.address)

        const kreskoAssetTotalSupplyBefore = await f.KrAsset.contract.totalSupply()

        // Burn Kresko asset
        const burnAmount = toBig(1)
        const kreskoAssetIndex = 0
        const userOneBalanceBefore = await f.KrAsset.balanceOf(f.user1.address)

        // User three burns it's KreskoAsset to reduce userOnes debt
        await f.User2.burnKreskoAsset(
          {
            account: f.user1.address,
            krAsset: f.KrAsset.address,
            amount: burnAmount,
            mintIndex: kreskoAssetIndex,
            repayee: f.user2.address,
          },
          f.updateData,
        )
        // await expect(f.User2.burnKreskoAsset(f.user1.address, f.KrAsset.address, burnAmount, kreskoAssetIndex)).to.not.be
        //   .reverted;

        // Confirm the userOne had no effect on it's kreskoAsset balance
        const userOneBalance = await f.KrAsset.balanceOf(f.user1.address)
        expect(userOneBalance).to.equal(userOneBalanceBefore, 'userOneBalance')

        // Confirm the userThree no long holds the burned Kresko asset amount
        const userThreeBalance = await f.KrAsset.balanceOf(f.user2.address)
        expect(userThreeBalance).to.equal(f.initialMintAmount.sub(burnAmount), 'userThreeBalance')
        // Confirm that the Kresko asset's total supply decreased as expected
        const kreskoAssetTotalSupplyAfter = await f.KrAsset.contract.totalSupply()
        expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(burnAmount), 'totalSupplyAfter')
        // Confirm the array of the user's minted Kresko assets still contains the asset's address
        const mintedKreskoAssetsAfter = await optimized.getAccountMintedAssets(f.user2.address)
        expect(mintedKreskoAssetsAfter).to.deep.equal([f.KrAsset.address], 'mintedKreskoAssetsAfter')
        // Confirm the user's minted kresko asset amount has been updated
        const userOneDebt = await optimized.getAccountDebtAmount(f.user1.address, f.KrAsset)
        expect(userOneDebt).to.equal(f.initialMintAmount.sub(burnAmount))
      })

      it('should allow trusted address to burn the full balance of its Kresko asset on behalf another user')

      it('should burn up to the minimum debt position amount if the requested burn would result in a position under the minimum debt value', async function () {
        const userBalanceBefore = await f.KrAsset.balanceOf(f.user1.address)
        const kreskoAssetTotalSupplyBefore = await f.KrAsset.contract.totalSupply()

        // Calculate actual burn amount
        const userOneDebt = await optimized.getAccountDebtAmount(f.user1.address, f.KrAsset)

        const minDebtValue = fromBig(await optimized.getMinDebtValue(), 8)

        const oraclePrice = f.KrAsset.config.args!.price
        const burnAmount = toBig(fromBig(userOneDebt) - minDebtValue / oraclePrice!)

        // Burn Kresko asset
        const kreskoAssetIndex = 0
        await f.User1.burnKreskoAsset(
          {
            account: f.user1.address,
            krAsset: f.KrAsset.address,
            amount: burnAmount,
            mintIndex: kreskoAssetIndex,
            repayee: f.user1.address,
          },
          f.updateData,
        )

        // Confirm the user holds the expected Kresko asset amount
        const userBalance = await f.KrAsset.balanceOf(f.user1.address)

        // expect(fromBig(userBalance)).to.equal(fromBig(userBalanceBefore.sub(burnAmount)));
        expect(userBalance).eq(userBalanceBefore.sub(burnAmount))

        // Confirm that the Kresko asset's total supply decreased as expected
        const kreskoAssetTotalSupplyAfter = await f.KrAsset.contract.totalSupply()
        expect(kreskoAssetTotalSupplyAfter).eq(kreskoAssetTotalSupplyBefore.sub(burnAmount))

        // Confirm the array of the user's minted Kresko assets still contains the asset's address
        const mintedKreskoAssetsAfter = await optimized.getAccountMintedAssets(f.user1.address)
        expect(mintedKreskoAssetsAfter).to.deep.equal([f.KrAsset.address])

        // Confirm the user's minted kresko asset amount has been updated
        const newUserDebt = await optimized.getAccountDebtAmount(f.user1.address, f.KrAsset)
        expect(newUserDebt).to.be.equal(userOneDebt.sub(burnAmount))
      })

      it('should emit KreskoAssetBurned event', async function () {
        const kreskoAssetIndex = 0
        const tx = await f.User1.burnKreskoAsset(
          {
            account: f.user1.address,
            krAsset: f.KrAsset.address,
            amount: f.initialMintAmount.div(5),
            mintIndex: kreskoAssetIndex,
            repayee: f.user1.address,
          },
          f.updateData,
        )

        const event = await getInternalEvent<KreskoAssetBurnedEvent['args']>(tx, hre.Diamond, 'KreskoAssetBurned')
        expect(event.account).to.equal(f.user1.address)
        expect(event.kreskoAsset).to.equal(f.KrAsset.address)
        expect(event.amount).to.equal(f.initialMintAmount.div(5))
      })

      it('should allow users to burn Kresko assets without giving token approval to Kresko.sol contract', async function () {
        const secondMintAmount = 1
        const burnAmount = f.initialMintAmount.add(secondMintAmount)

        await expect(
          f.User1.mintKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: secondMintAmount,
              receiver: f.user1.address,
            },
            f.updateData,
          ),
        ).to.not.be.reverted
        const kreskoAssetIndex = 0

        await expect(
          f.User1.burnKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: burnAmount,
              mintIndex: kreskoAssetIndex,
              repayee: f.user1.address,
            },
            f.updateData,
          ),
        ).to.not.be.reverted
      })

      it('should not allow users to burn an amount of 0', async function () {
        const kreskoAssetIndex = 0

        await expect(
          f.User1.burnKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: 0,
              mintIndex: kreskoAssetIndex,
              repayee: f.user1.address,
            },
            f.updateData,
          ),
        ).to.be.revertedWithCustomError(Errors(hre), 'ZERO_BURN')
      })

      it('should not allow untrusted address to burn any kresko assets on behalf of another user', async function () {
        const kreskoAssetIndex = 0

        await expect(
          f.User2.burnKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: 100,
              mintIndex: kreskoAssetIndex,
              repayee: f.user1.address,
            },
            f.updateData,
          ),
        ).to.be.revertedWith(
          `AccessControl: account ${f.user2.address.toLowerCase()} is missing role 0x46925e0f0cc76e485772167edccb8dc449d43b23b55fc4e756b063f49099e6a0`,
        )
      })
      it('should not allow untrusted address to use another repayee to burn kresko assets', async function () {
        const kreskoAssetIndex = 0

        await expect(
          f.User1.burnKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: 100,
              mintIndex: kreskoAssetIndex,
              repayee: f.user2.address,
            },
            f.updateData,
          ),
        ).to.be.revertedWith(
          `AccessControl: account ${f.user1.address.toLowerCase()} is missing role 0x46925e0f0cc76e485772167edccb8dc449d43b23b55fc4e756b063f49099e6a0`,
        )
      })

      it('should not allow users to burn more kresko assets than they hold as debt', async function () {
        const kreskoAssetIndex = 0
        const debt = await optimized.getAccountDebtAmount(f.user1.address, f.KrAsset)
        const burnAmount = debt.add(toBig(1))

        await expect(
          f.User1.burnKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: burnAmount,
              mintIndex: kreskoAssetIndex,
              repayee: f.user1.address,
            },
            f.updateData,
          ),
        ).to.be.reverted
      })

      describe('Protocol open fee', () => {
        it('should charge the protocol open fee with a single collateral asset if the deposit amount is sufficient and emit FeePaid event', async function () {
          const openFee = 0.01e4

          await f.KrAsset.update({
            openFee,
            maxDebtMinter: MaxUint128,
          })
          const mintAmount = toBig(1)
          const mintValue = mintAmount.wadMul(TEN_USD.ebn(8))

          const expectedFeeValue = mintValue.percentMul(openFee)
          const expectedCollateralFeeAmount = expectedFeeValue.wadDiv(TEN_USD.ebn(8))

          // Get the balances prior to the fee being charged.
          const feeRecipient = await hre.Diamond.getFeeRecipient()
          const kreskoCollateralAssetBalanceBefore = await f.Collateral.balanceOf(hre.Diamond.address)
          const feeRecipientCollateralBalanceBefore = await f.Collateral.balanceOf(feeRecipient)

          // Mint Kresko asset
          const tx = await f.User1.mintKreskoAsset(
            { account: f.user1.address, krAsset: f.KrAsset.address, amount: mintAmount, receiver: f.user1.address },
            f.updateData,
          )

          // Get the balances after the fees have been charged.
          const kreskoCollateralAssetBalanceAfter = await f.Collateral.balanceOf(hre.Diamond.address)
          const feeRecipientCollateralBalanceAfter = await f.Collateral.balanceOf(feeRecipient)

          // Ensure the amount gained / lost by the kresko contract and the fee recipient are as expected
          const feeRecipientBalanceIncrease = feeRecipientCollateralBalanceAfter.sub(
            feeRecipientCollateralBalanceBefore,
          )
          expect(kreskoCollateralAssetBalanceBefore.sub(kreskoCollateralAssetBalanceAfter)).to.equal(
            feeRecipientBalanceIncrease,
          )

          // Normalize expected amount because protocol closeFee has 10**18 decimals
          expect(feeRecipientBalanceIncrease).to.equal(expectedCollateralFeeAmount)

          // Ensure the emitted event is as expected.
          const event = await getInternalEvent<FeePaidEventObject>(tx, hre.Diamond, 'FeePaid')
          expect(event.account).to.equal(f.user1.address)
          expect(event.paymentCollateralAsset).to.equal(f.Collateral.address)
          expect(event.paymentAmount).to.equal(expectedCollateralFeeAmount)

          expect(event.paymentValue).to.equal(expectedFeeValue)
          expect(event.feeType).to.equal(MinterFee.OPEN)

          // Now verify that calcExpectedFee function returns accurate fee amount
          const [, values] = await hre.Diamond.previewFee(
            f.user1.address,
            f.KrAsset.address,
            mintAmount,
            MinterFee.OPEN,
          )
          expect(values[0]).eq(expectedCollateralFeeAmount)
        })
      })
      describe('Protocol Close Fee', () => {
        it('should charge the protocol close fee with a single collateral asset if the deposit amount is sufficient and emit FeePaid event', async function () {
          const burnAmount = toBig(1)
          const burnValue = burnAmount.wadMul(TEN_USD.ebn(8))
          const closeFee = f.KrAsset.config.args.krAssetConfig!.closeFee // use toBig() to emulate closeFee's 18 decimals on contract
          const expectedFeeValue = burnValue.percentMul(closeFee)
          const expectedCollateralFeeAmount = expectedFeeValue.wadDiv(f.Collateral.config.args!.price!.ebn(8))
          const feeRecipient = await hre.Diamond.getFeeRecipient()
          // Get the balances prior to the fee being charged.
          const kreskoCollateralAssetBalanceBefore = await f.Collateral.balanceOf(hre.Diamond.address)
          const feeRecipientCollateralBalanceBefore = await f.Collateral.balanceOf(feeRecipient)

          // Burn Kresko asset
          const kreskoAssetIndex = 0
          const tx = await f.User1.burnKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: burnAmount,
              mintIndex: kreskoAssetIndex,
              repayee: f.user1.address,
            },
            f.updateData,
          )

          // Get the balances after the fees have been charged.
          const kreskoCollateralAssetBalanceAfter = await f.Collateral.balanceOf(hre.Diamond.address)
          const feeRecipientCollateralBalanceAfter = await f.Collateral.balanceOf(feeRecipient)

          // Ensure the amount gained / lost by the kresko contract and the fee recipient are as expected
          const feeRecipientBalanceIncrease = feeRecipientCollateralBalanceAfter.sub(
            feeRecipientCollateralBalanceBefore,
          )
          expect(kreskoCollateralAssetBalanceBefore.sub(kreskoCollateralAssetBalanceAfter)).to.equal(
            feeRecipientBalanceIncrease,
          )

          // Normalize expected amount because protocol closeFee has 10**18 decimals
          expect(feeRecipientBalanceIncrease).to.equal(expectedCollateralFeeAmount)

          // Ensure the emitted event is as expected.
          const event = await getInternalEvent<FeePaidEventObject>(tx, hre.Diamond, 'FeePaid')
          expect(event.account).to.equal(f.user1.address)
          expect(event.paymentCollateralAsset).to.equal(f.Collateral.address)
          expect(event.paymentAmount).to.equal(expectedCollateralFeeAmount)
          expect(event.paymentValue).to.equal(expectedFeeValue)
          expect(event.feeType).to.equal(MinterFee.CLOSE)
        })

        it('should charge correct protocol close fee after a positive rebase', async function () {
          const wAmount = 1
          const burnAmount = toBig(1)
          const expectedFeeAmount = burnAmount.percentMul(f.KrAsset.config.args.krAssetConfig!.closeFee)
          const expectedFeeValue = expectedFeeAmount.wadMul(toBig(TEN_USD, 8))

          const event = await getInternalEvent<FeePaidEventObject>(
            await burnKrAsset(
              {
                user: f.user2,
                asset: f.KrAsset,
                amount: burnAmount,
              },
              f.updateData,
            ),
            hre.Diamond,
            'FeePaid',
          )

          expect(event.paymentAmount).to.equal(expectedFeeAmount)
          expect(event.paymentValue).to.equal(expectedFeeValue)
          expect(event.feeType).to.equal(MinterFee.CLOSE)

          // rebase params
          const denominator = 4
          const positive = true
          f.KrAsset.setPrice(TEN_USD / denominator)
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])
          const burnAmountRebase = burnAmount.mul(denominator)

          await withdrawCollateral(
            {
              user: f.user2,
              asset: f.Collateral,
              amount: toBig(wAmount),
            },
            f.updateData,
          )
          const eventAfterRebase = await getInternalEvent<FeePaidEventObject>(
            await burnKrAsset(
              {
                user: f.user2,
                asset: f.KrAsset,
                amount: burnAmountRebase,
              },
              f.updateData,
            ),
            hre.Diamond,
            'FeePaid',
          )
          expect(eventAfterRebase.paymentCollateralAsset).to.equal(event.paymentCollateralAsset)
          expect(eventAfterRebase.paymentAmount).to.equal(expectedFeeAmount)
          expect(eventAfterRebase.paymentValue).to.equal(expectedFeeValue)
        })
        it('should charge correct protocol close fee after a negative rebase', async function () {
          const wAmount = 1
          const burnAmount = toBig(1)
          const expectedFeeAmount = burnAmount.percentMul(f.KrAsset.config.args.krAssetConfig!.closeFee)
          const expectedFeeValue = expectedFeeAmount.wadMul(toBig(TEN_USD, 8))

          const event = await getInternalEvent<FeePaidEventObject>(
            await burnKrAsset(
              {
                user: f.user2,
                asset: f.KrAsset,
                amount: burnAmount,
              },
              f.updateData,
            ),
            hre.Diamond,
            'FeePaid',
          )

          expect(event.paymentAmount).to.equal(expectedFeeAmount)
          expect(event.paymentValue).to.equal(expectedFeeValue)
          expect(event.feeType).to.equal(MinterFee.CLOSE)

          // rebase params
          const denominator = 4
          const positive = false
          const priceAfter = fromBig(await f.KrAsset.getPrice(), 8) * denominator
          f.KrAsset.setPrice(priceAfter)
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])
          const burnAmountRebase = burnAmount.div(denominator)

          await withdrawCollateral(
            {
              user: f.user2,
              asset: f.Collateral,
              amount: toBig(wAmount),
            },
            f.updateData,
          )
          const eventAfterRebase = await getInternalEvent<FeePaidEventObject>(
            await burnKrAsset(
              {
                user: f.user2,
                asset: f.KrAsset,
                amount: burnAmountRebase,
              },
              f.updateData,
            ),
            hre.Diamond,
            'FeePaid',
          )
          expect(eventAfterRebase.paymentCollateralAsset).to.equal(event.paymentCollateralAsset)
          expect(eventAfterRebase.paymentAmount).to.equal(expectedFeeAmount)
          expect(eventAfterRebase.paymentValue).to.equal(expectedFeeValue)
        })
      })
    })

    describe('#burn - rebase', () => {
      const mintAmountDec = 40
      const mintAmount = toBig(mintAmountDec)

      beforeEach(async function () {
        await mintKrAsset(
          {
            asset: f.KrAsset,
            amount: mintAmount,
            user: f.user1,
          },
          f.updateData,
        )
      })

      describe('debt amounts are calculated correctly', () => {
        it('when repaying all debt after a positive rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true

          // Adjust price according to rebase params
          f.KrAsset.setPrice(TEN_USD / denominator)
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          // Pay half of debt
          const debt = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          const repayAmount = debt
          await f.User1.burnKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: repayAmount,
              mintIndex: 0,
              repayee: f.user1.address,
            },
            f.updateData,
          )

          // Debt value after half repayment
          const debtAfter = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)

          expect(debtAfter).to.equal(0)

          const balanceAfterBurn = await f.KrAsset.contract.balanceOf(f.user1.address)
          expect(balanceAfterBurn).to.equal(0)

          // Anchor krAssets should equal balance * denominator
          const wkrAssetBalanceKresko = await f.KrAsset.anchor!.balanceOf(hre.Diamond.address)
          expect(wkrAssetBalanceKresko).to.equal(f.initialMintAmount) // WEI
        })

        it('when repaying partial debt after a positive rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true

          // Adjust price according to rebase params
          f.KrAsset.setPrice(TEN_USD / denominator)
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          // Pay half of debt
          const debt = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          const repayAmount = debt.div(2)
          await f.User1.burnKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: repayAmount,
              mintIndex: 0,
              repayee: f.user1.address,
            },
            f.updateData,
          )

          // Debt value after half repayment
          const debtAfter = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)

          // Calc expected value with last update
          const expectedDebt = mintAmount.div(2).mul(denominator)

          expect(debtAfter).to.equal(expectedDebt)

          // Should be all burned
          const expectedBalanceAfter = mintAmount.mul(denominator).sub(repayAmount)
          const balanceAfterBurn = await f.KrAsset.contract.balanceOf(f.user1.address)
          expect(balanceAfterBurn).to.equal(expectedBalanceAfter)

          // All wkrAssets should be burned
          const expectedwkrBalance = mintAmount.sub(repayAmount.div(denominator)).add(f.initialMintAmount)
          const wkrAssetBalanceKresko = await f.KrAsset.anchor!.balanceOf(hre.Diamond.address)
          expect(wkrAssetBalanceKresko).to.equal(expectedwkrBalance)
        })

        it('when repaying all debt after a negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false

          // Adjust price according to rebase params
          f.KrAsset.setPrice(TEN_USD * denominator)
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          // Pay half of debt
          const debt = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          const repayAmount = debt
          await f.User1.burnKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: repayAmount,
              mintIndex: 0,
              repayee: f.user1.address,
            },
            f.updateData,
          )

          // Debt value after half repayment
          const debtAfter = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)

          // Calc expected value with last update
          const expectedDebt = 0

          expect(debtAfter).to.equal(expectedDebt)

          const expectedBalanceAfterBurn = 0
          const balanceAfterBurn = fromBig(await f.KrAsset.contract.balanceOf(f.user1.address))
          expect(balanceAfterBurn).to.equal(expectedBalanceAfterBurn)

          // Anchor krAssets should equal balance * denominator
          const wkrAssetBalanceKresko = await f.KrAsset.anchor!.balanceOf(hre.Diamond.address)
          expect(wkrAssetBalanceKresko).to.equal(toBig(expectedBalanceAfterBurn * denominator).add(f.initialMintAmount))
        })

        it('when repaying partial debt after a negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false

          // Adjust price according to rebase params
          f.KrAsset.setPrice(TEN_USD * denominator)
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          // Pay half of debt
          const debt = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          const repayAmount = debt.div(2)
          await f.User1.burnKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: repayAmount,
              mintIndex: 0,
              repayee: f.user1.address,
            },
            f.updateData,
          )

          // Debt value after half repayment
          const debtAfter = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)

          // Calc expected value with last update
          const expectedDebt = mintAmount.div(2).div(denominator)

          expect(debtAfter).to.equal(expectedDebt)

          // Should be all burned
          const expectedBalanceAfter = mintAmount.div(denominator).sub(repayAmount)
          const balanceAfterBurn = await f.KrAsset.contract.balanceOf(f.user1.address)
          expect(balanceAfterBurn).to.equal(expectedBalanceAfter)

          // All wkrAssets should be burned
          const expectedwkrBalance = mintAmount.sub(repayAmount.mul(denominator)).add(f.initialMintAmount)
          const wkrAssetBalanceKresko = await f.KrAsset.anchor.balanceOf(hre.Diamond.address)
          expect(wkrAssetBalanceKresko).to.equal(expectedwkrBalance)
        })
      })

      describe('debt value and mintedKreskoAssets book-keeping is calculated correctly', () => {
        it('when repaying all debt after a positive rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true
          const fullRepayAmount = mintAmount.mul(denominator)

          // Adjust price according to rebase params
          f.KrAsset.setPrice(TEN_USD / denominator)
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          await f.User1.burnKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: fullRepayAmount,
              mintIndex: 0,
              repayee: f.user1.address,
            },
            f.updateData,
          )

          // Debt value after half repayment
          const debtAfter = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          const debtValueAfter = await hre.Diamond.getValue(f.KrAsset.address, debtAfter)
          expect(debtValueAfter).to.equal(0)
        })
        it('when repaying partial debt after a positive rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = true
          const mintValue = await hre.Diamond.getValue(f.KrAsset.address, mintAmount)

          // Adjust price according to rebase params
          f.KrAsset.setPrice(TEN_USD / denominator)
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          // Should contain minted krAsset
          const mintedKreskoAssetsBeforeBurn = await optimized.getAccountMintedAssets(f.user1.address)
          expect(mintedKreskoAssetsBeforeBurn).to.contain(f.KrAsset.address)

          // Burn assets
          // Pay half of debt
          const debt = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          await f.User1.burnKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: debt.div(2),
              mintIndex: 0,
              repayee: f.user1.address,
            },
            f.updateData,
          )

          // Debt value after half repayment
          const debtAfter = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          const debtValueAfter = await hre.Diamond.getValue(f.KrAsset.address, debtAfter)
          // Calc expected value with last update
          const expectedValue = mintValue.div(2)
          expect(debtValueAfter).to.equal(expectedValue)

          // Should still contain minted krAsset
          const mintedKreskoAssetsAfterBurn = await optimized.getAccountMintedAssets(f.user1.address)
          expect(mintedKreskoAssetsAfterBurn).to.contain(f.KrAsset.address)
        })
        it('when repaying all debt after a negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false
          const fullRepayAmount = mintAmount.div(denominator)

          // Adjust price according to rebase params
          f.KrAsset.setPrice(TEN_USD * denominator)
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          await f.User1.burnKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: fullRepayAmount,
              mintIndex: 0,
              repayee: f.user1.address,
            },
            f.updateData,
          )

          // Debt value after half repayment
          const debtAfter = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          const debtValueAfter = await hre.Diamond.getValue(f.KrAsset.address, debtAfter)
          expect(debtValueAfter).to.equal(0)
        })
        it('when repaying partial debt after a negative rebase', async function () {
          // Rebase params
          const denominator = 4
          const positive = false
          const mintValue = await hre.Diamond.getValue(f.KrAsset.address, mintAmount)

          f.KrAsset.setPrice(TEN_USD * denominator)
          await f.KrAsset.contract.rebase(toBig(denominator), positive, [])

          // Pay half of debt
          const debt = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          await f.User1.burnKreskoAsset(
            {
              account: f.user1.address,
              krAsset: f.KrAsset.address,
              amount: debt.div(2),
              mintIndex: 0,
              repayee: f.user1.address,
            },
            f.updateData,
          )

          // Debt value after half repayment
          const debtAfter = await hre.Diamond.getAccountDebtAmount(f.user1.address, f.KrAsset.address)
          const debtValueAfter = await hre.Diamond.getValue(f.KrAsset.address, debtAfter)
          // Calc expected value with last update
          const expectedValue = mintValue.div(2)
          expect(debtValueAfter).to.equal(expectedValue)

          // Should still contain minted krAsset
          const mintedKreskoAssetsAfterBurn = await hre.Diamond.getAccountMintedAssets(f.user1.address)
          expect(mintedKreskoAssetsAfterBurn).to.contain(f.KrAsset.address)
        })
      })
    })
  })
})
