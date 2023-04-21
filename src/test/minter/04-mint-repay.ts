import { fromBig, toBig, getInternalEvent } from "@kreskolabs/lib";
import { defaultCloseFee, defaultCollateralArgs, defaultKrAssetArgs, Fee, Role, withFixture } from "@test-utils";
import { Error } from "@utils/test/errors";
import { toScaledAmount, fromScaledAmount } from "@utils/test/helpers/calculations";
import { depositCollateral, withdrawCollateral } from "@utils/test/helpers/collaterals";
import {
    addMockKreskoAsset,
    burnKrAsset,
    getDebtIndexAdjustedBalance,
    mintKrAsset,
} from "@utils/test/helpers/krassets";
import { expect } from "chai";
import hre from "hardhat";
import {
    CloseFeePaidEventObject,
    KreskoAssetBurnedEvent,
    KreskoAssetMintedEventObject,
    OpenFeePaidEventObject,
} from "types/typechain/src/contracts/libs/Events.sol/MinterEvent";

const INTEREST_RATE_DELTA = hre.toBig("0.000001");
const INTEREST_RATE_PRICE_DELTA = hre.toBig("0.0001", 8);

describe("Minter", () => {
    withFixture(["minter-test"]);

    beforeEach(async function () {
        this.collateral = this.collaterals.find(c => c.deployArgs!.name === defaultCollateralArgs.name)!;
        this.krAsset = this.krAssets.find(c => c.deployArgs!.name === defaultKrAssetArgs.name)!;

        await this.krAsset.contract.grantRole(Role.OPERATOR, hre.users.deployer.address);
        this.krAsset.setPrice(this.krAsset.deployArgs!.price);
        this.krAsset.setMarketOpen(this.krAsset.deployArgs!.marketOpen);

        // Load account with collateral
        this.initialBalance = toBig(100000);
        await this.collateral.setBalance(hre.users.userOne, this.initialBalance);
        await this.collateral.mocks!.contract.setVariable("_allowances", {
            [hre.users.userOne.address]: {
                [hre.Diamond.address]: this.initialBalance,
            },
        });
        this.collateral.setPrice(this.collateral.deployArgs!.price);

        // User deposits 10,000 collateral
        await depositCollateral({
            amount: 10_000,
            user: hre.users.userOne,
            asset: this.collateral,
        });
    });

    describe("#mint+burn", () => {
        describe("#mint", () => {
            it("should allow users to mint whitelisted Kresko assets backed by collateral", async function () {
                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyBefore = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyBefore).to.equal(0);
                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsBefore = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
                expect(mintedKreskoAssetsBefore).to.deep.equal([]);

                // Mint Kresko asset
                const mintAmount = toBig(1);
                await hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                    hre.users.userOne.address,
                    this.krAsset.address,
                    mintAmount,
                );

                // Confirm the array of the user's minted Kresko assets has been pushed to.
                const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([this.krAsset.address]);
                // Confirm the amount minted is recorded for the user.
                const amountMinted = await hre.Diamond.kreskoAssetDebt(hre.users.userOne.address, this.krAsset.address);
                expect(amountMinted).to.equal(mintAmount);
                // Confirm the user's Kresko asset balance has increased
                const userBalance = await this.krAsset.mocks.contract.balanceOf(hre.users.userOne.address);
                expect(userBalance).to.equal(mintAmount);
                // Confirm that the Kresko asset's total supply increased as expected
                const kreskoAssetTotalSupplyAfter = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyAfter.eq(kreskoAssetTotalSupplyBefore.add(mintAmount)));
            });

            it("should allow successive, valid mints of the same Kresko asset", async function () {
                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyInitial = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyInitial).to.equal(0);

                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsInitial = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
                expect(mintedKreskoAssetsInitial).to.deep.equal([]);

                // Mint Kresko asset
                const firstMintAmount = toBig(5);
                await hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                    hre.users.userOne.address,
                    this.krAsset.address,
                    firstMintAmount,
                );

                // Confirm the array of the user's minted Kresko assets has been pushed to.
                const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([this.krAsset.address]);

                // Confirm the amount minted is recorded for the user.
                const amountMintedAfter = await hre.Diamond.kreskoAssetDebt(
                    hre.users.userOne.address,
                    this.krAsset.address,
                );
                expect(amountMintedAfter).to.equal(firstMintAmount);

                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceAfter = await this.krAsset.contract.balanceOf(hre.users.userOne.address);
                expect(userBalanceAfter).to.equal(amountMintedAfter);

                // Confirm that the Kresko asset's total supply increased as expected
                const kreskoAssetTotalSupplyAfter = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyInitial.add(firstMintAmount));

                // ------------------------ Second mint ------------------------
                // Mint Kresko asset
                const secondMintAmount = toBig(5);
                await hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                    hre.users.userOne.address,
                    this.krAsset.address,
                    secondMintAmount,
                );

                // Confirm the array of the user's minted Kresko assets is unchanged
                const mintedKreskoAssetsFinal = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
                expect(mintedKreskoAssetsFinal).to.deep.equal([this.krAsset.address]);

                // Confirm the second mint amount is recorded for the user
                const amountMintedFinal = await hre.Diamond.kreskoAssetDebt(
                    hre.users.userOne.address,
                    this.krAsset.address,
                );
                expect(amountMintedFinal).to.closeTo(firstMintAmount.add(secondMintAmount), INTEREST_RATE_DELTA);

                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceFinal = await this.krAsset.contract.balanceOf(hre.users.userOne.address);
                expect(userBalanceFinal).to.closeTo(amountMintedFinal, INTEREST_RATE_DELTA);

                // Confirm that the Kresko asset's total supply increased as expected
                const kreskoAssetTotalSupplyFinal = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyFinal).to.closeTo(
                    kreskoAssetTotalSupplyAfter.add(secondMintAmount),
                    INTEREST_RATE_DELTA,
                );
            });

            it("should allow users to mint multiple different Kresko assets", async function () {
                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyInitial = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyInitial).to.equal(0);
                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsInitial = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
                expect(mintedKreskoAssetsInitial).to.deep.equal([]);

                // Mint Kresko asset
                const firstMintAmount = toBig(1);
                await hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                    hre.users.userOne.address,
                    this.krAsset.address,
                    firstMintAmount,
                );

                // Confirm the array of the user's minted Kresko assets has been pushed to.
                const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([this.krAsset.address]);
                // Confirm the amount minted is recorded for the user.
                const amountMintedAfter = await hre.Diamond.kreskoAssetDebt(
                    hre.users.userOne.address,
                    this.krAsset.address,
                );
                expect(amountMintedAfter).to.equal(firstMintAmount);
                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceAfter = await this.krAsset.contract.balanceOf(hre.users.userOne.address);
                expect(userBalanceAfter).to.equal(amountMintedAfter);
                // Confirm that the Kresko asset's total supply increased as expected
                const kreskoAssetTotalSupplyAfter = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyInitial.add(firstMintAmount));

                // ------------------------ Second mint ------------------------
                // Add second mock krAsset to protocol
                const secondKrAssetArgs = {
                    name: "SecondKreskoAsset",
                    symbol: "SecondKreskoAsset",
                    price: 5, // $5
                    marketOpen: true,
                    factor: 1,
                    supplyLimit: 100000,
                    closeFee: defaultCloseFee,
                    openFee: 0,
                };
                const { contract: secondKreskoAsset } = await addMockKreskoAsset(secondKrAssetArgs);

                // Mint Kresko asset
                const secondMintAmount = toBig(2);
                await hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                    hre.users.userOne.address,
                    secondKreskoAsset.address,
                    secondMintAmount,
                );

                // Confirm that the second address has been pushed to the array of the user's minted Kresko assets
                const mintedKreskoAssetsFinal = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
                expect(mintedKreskoAssetsFinal).to.deep.equal([this.krAsset.address, secondKreskoAsset.address]);
                // Confirm the second mint amount is recorded for the user
                const amountMintedAssetTwo = await hre.Diamond.kreskoAssetDebt(
                    hre.users.userOne.address,
                    secondKreskoAsset.address,
                );
                expect(amountMintedAssetTwo).to.equal(secondMintAmount);
                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceFinal = await secondKreskoAsset.balanceOf(hre.users.userOne.address);
                expect(userBalanceFinal).to.equal(amountMintedAssetTwo);
                // Confirm that the Kresko asset's total supply increased as expected
                const secondKreskoAssetTotalSupply = await secondKreskoAsset.totalSupply();
                expect(secondKreskoAssetTotalSupply).to.equal(secondMintAmount);
            });

            it("should allow users to mint Kresko assets with USD value equal to the minimum debt value", async function () {
                // Confirm that the user does not have an existing debt position for this Kresko asset
                const initialKreskoAssetDebt = await hre.Diamond.kreskoAssetDebt(
                    hre.users.userOne.address,
                    this.krAsset.address,
                );
                expect(initialKreskoAssetDebt).to.equal(0);

                // Confirm that the mint amount's USD value is equal to the contract's current minimum debt value
                const mintAmount = toBig(1); // 1 * $10 = $10
                const mintAmountUSDValue = await hre.Diamond.getKrAssetValue(this.krAsset.address, mintAmount, false);
                const currMinimumDebtValue = await hre.Diamond.minimumDebtValue();
                expect(fromBig(mintAmountUSDValue.rawValue, 8)).to.equal(Number(currMinimumDebtValue) / 10 ** 8);

                await hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                    hre.users.userOne.address,
                    this.krAsset.address,
                    mintAmount,
                );

                // Confirm that the mint was successful and user's balances have increased
                const finalKreskoAssetDebt = await hre.Diamond.kreskoAssetDebt(
                    hre.users.userOne.address,
                    this.krAsset.address,
                );
                expect(finalKreskoAssetDebt).to.equal(mintAmount);
            });

            it("should allow a trusted address to mint Kresko assets on behalf of another user", async function () {
                // Grant userThree the MANAGER role
                await hre.Diamond.connect(hre.users.deployer).grantRole(Role.MANAGER, hre.users.userThree.address);
                expect(await hre.Diamond.hasRole(Role.MANAGER, hre.users.userThree.address)).to.equal(true);

                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyBefore = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyBefore).to.equal(0);
                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsBefore = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
                expect(mintedKreskoAssetsBefore).to.deep.equal([]);

                // userThree (trusted contract) mints Kresko asset for userOne
                const mintAmount = toBig(1);
                await hre.Diamond.connect(hre.users.userThree).mintKreskoAsset(
                    hre.users.userOne.address,
                    this.krAsset.address,
                    mintAmount,
                );

                // Check that debt exists now for userOne
                const userOneDebtFromUserThreeMint = await hre.Diamond.kreskoAssetDebt(
                    hre.users.userOne.address,
                    this.krAsset.address,
                );
                expect(userOneDebtFromUserThreeMint).to.equal(mintAmount);
            });

            it("should emit KreskoAssetMinted event", async function () {
                const mintAmount = toBig(500);
                const tx = await hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                    hre.users.userOne.address,
                    this.krAsset.address,
                    mintAmount,
                );

                const event = await getInternalEvent<KreskoAssetMintedEventObject>(
                    tx,
                    hre.Diamond,
                    "KreskoAssetMinted",
                );
                expect(event.account).to.equal(hre.users.userOne.address);
                expect(event.kreskoAsset).to.equal(this.krAsset.address);
                expect(event.amount).to.equal(mintAmount);
            });

            it("should not allow untrusted account to mint Kresko assets on behalf of another user", async function () {
                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyBefore = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyBefore).to.equal(0);

                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsBefore = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
                expect(mintedKreskoAssetsBefore).to.deep.equal([]);

                // Mint Kresko asset
                const mintAmount = toBig(1);
                await expect(
                    hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                        hre.users.userTwo.address,
                        this.krAsset.address,
                        mintAmount,
                    ),
                ).to.be.revertedWith(
                    `AccessControl: account ${hre.users.userOne.address.toLowerCase()} is missing role 0x46925e0f0cc76e485772167edccb8dc449d43b23b55fc4e756b063f49099e6a0`,
                );
            });

            it("should not allow users to mint Kresko assets if the resulting position's USD value is less than the minimum debt value", async function () {
                // Confirm that the user does not have an existing debt position for this Kresko asset
                const initialKreskoAssetDebt = await hre.Diamond.kreskoAssetDebt(
                    hre.users.userOne.address,
                    this.krAsset.address,
                );
                expect(initialKreskoAssetDebt).to.equal(0);

                // Confirm that the mint amount's USD value is below the contract's current minimum debt value
                const minAmount = 100000000; // 8 decimals
                const mintAmount = minAmount - 1;
                const mintAmountUSDValue = await hre.Diamond.getKrAssetValue(this.krAsset.address, mintAmount, false);
                const currMinimumDebtValue = await hre.Diamond.minimumDebtValue();
                expect(Number(mintAmountUSDValue)).to.be.lessThan(Number(currMinimumDebtValue));

                await expect(
                    hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                        hre.users.userOne.address,
                        this.krAsset.address,
                        mintAmount,
                    ),
                ).to.be.revertedWith(Error.KRASSET_MINT_AMOUNT_LOW);
            });

            it("should not allow users to mint non-whitelisted Kresko assets", async function () {
                // Attempt to mint a non-deployed, non-whitelisted Kresko asset
                await expect(
                    hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                        hre.users.userOne.address,
                        "0x0000000000000000000000000000000000000002",
                        toBig(1),
                    ),
                ).to.be.revertedWith(Error.KRASSET_DOESNT_EXIST);
            });

            it("should not allow users to mint Kresko assets over their collateralization ratio limit", async function () {
                // We can ignore price and collateral factor as both this.collateral and this.krAsset both
                // have the same price ($10) and same collateral factor (1)
                const collateralAmountDeposited = await hre.Diamond.collateralDeposits(
                    hre.users.userOne.address,
                    this.collateral.address,
                );
                // Apply 150% MCR and increase deposit amount to be above the maximum allowed by MCR
                const mcrAmount = fromBig(collateralAmountDeposited) / 1.5;
                const mintAmount = toBig(mcrAmount + 1);

                await expect(
                    hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                        hre.users.userOne.address,
                        this.krAsset.address,
                        mintAmount,
                    ),
                ).to.be.revertedWith(Error.KRASSET_COLLATERAL_LOW);
            });

            it("should not allow the minting of any Kresko asset amount over its maximum limit", async function () {
                // User deposits another 10,000 collateral tokens, enabling mints of up to 20,000/1.5 = ~13,333 kresko asset tokens
                await expect(
                    hre.Diamond.connect(hre.users.userOne).depositCollateral(
                        hre.users.userOne.address,
                        this.collateral.address,
                        toBig(10000),
                    ),
                ).not.to.be.reverted;

                const krAsset = await hre.Diamond.kreskoAsset(this.krAsset.address);
                const overSupplyLimit = fromBig(krAsset.supplyLimit) + 1;
                await expect(
                    hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                        hre.users.userOne.address,
                        this.krAsset.address,
                        toBig(overSupplyLimit),
                    ),
                ).to.be.revertedWith(Error.KRASSET_MAX_SUPPLY_REACHED);
            });

            it("should not allow the minting of kreskoAssets if the market is closed", async function () {
                this.krAsset.setMarketOpen(false);
                await expect(
                    hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                        hre.users.userOne.address,
                        this.krAsset.address,
                        toBig(1),
                    ),
                ).to.be.revertedWith(Error.KRASSET_MARKET_CLOSED);

                // Confirm that the user has no minted krAssets
                const mintedKreskoAssetsBefore = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
                expect(mintedKreskoAssetsBefore).to.deep.equal([]);

                // Confirm that opening the market makes krAsset mintable again
                this.krAsset.setMarketOpen(true);
                await hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                    hre.users.userOne.address,
                    this.krAsset.address,
                    toBig(1),
                );

                // Confirm the array of the user's minted Kresko assets has been pushed to
                const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([this.krAsset.address]);
            });
        });

        describe("#mint - rebase events", () => {
            const mintAmountInt = 40;
            const mintAmount = hre.toBig(mintAmountInt);
            describe("debt amounts are calculated correctly", () => {
                it("when minted before positive rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);
                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    // Mint before rebase
                    await userOne.mintKreskoAsset(hre.users.userOne.address, this.krAsset.address, mintAmount);

                    const balanceBefore = await this.krAsset.contract.balanceOf(hre.users.userOne.address);

                    // Rebase the asset according to params
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    // Ensure that the minted balance is adjusted by the rebase
                    const [balanceAfter, balanceAfterAdjusted] = await getDebtIndexAdjustedBalance(
                        hre.users.userOne,
                        this.krAsset,
                    );
                    expect(balanceAfter).to.bignumber.equal(mintAmount.mul(denominator));
                    expect(balanceBefore).to.not.bignumber.equal(balanceAfter);

                    // Ensure that debt amount is also adjsuted by the rebase
                    const debtAmount = await userOne.kreskoAssetDebt(hre.users.userOne.address, this.krAsset.address);
                    expect(balanceAfterAdjusted).to.bignumber.equal(debtAmount);
                });

                it("when minted before negative rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);
                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    // Mint before rebase
                    await userOne.mintKreskoAsset(hre.users.userOne.address, this.krAsset.address, mintAmount);

                    const balanceBefore = await this.krAsset.contract.balanceOf(hre.users.userOne.address);

                    // Rebase the asset according to params
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    // Ensure that the minted balance is adjusted by the rebase
                    const [balanceAfter, balanceAfterAdjusted] = await getDebtIndexAdjustedBalance(
                        hre.users.userOne,
                        this.krAsset,
                    );
                    expect(balanceAfter).to.bignumber.equal(mintAmount.div(denominator));
                    expect(balanceBefore).to.not.bignumber.equal(balanceAfter);

                    // Ensure that debt amount is also adjsuted by the rebase
                    const debtAmount = await userOne.kreskoAssetDebt(hre.users.userOne.address, this.krAsset.address);
                    expect(balanceAfterAdjusted).to.bignumber.equal(debtAmount);
                });

                it("when minted after positive rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    // Mint before rebase
                    await userOne.mintKreskoAsset(hre.users.userOne.address, this.krAsset.address, mintAmount);

                    const balanceBefore = await this.krAsset.contract.balanceOf(hre.users.userOne.address);

                    // Rebase the asset according to params
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    // Ensure that the minted balance is adjusted by the rebase
                    const [balanceAfter, balanceAfterAdjusted] = await getDebtIndexAdjustedBalance(
                        hre.users.userOne,
                        this.krAsset,
                    );
                    expect(balanceAfter).to.bignumber.equal(mintAmount.mul(denominator));
                    expect(balanceBefore).to.not.bignumber.equal(balanceAfter);

                    // Ensure that debt amount is also adjusted by the rebase
                    const debtAmount = await userOne.kreskoAssetDebt(hre.users.userOne.address, this.krAsset.address);
                    expect(balanceAfterAdjusted).to.bignumber.equal(debtAmount);
                });

                it("when minted after negative rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    // Mint before rebase
                    await userOne.mintKreskoAsset(hre.users.userOne.address, this.krAsset.address, mintAmount);

                    const balanceBefore = await this.krAsset.contract.balanceOf(hre.users.userOne.address);

                    // Rebase the asset according to params
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    // Ensure that the minted balance is adjusted by the rebase
                    const [balanceAfter, balanceAfterAdjusted] = await getDebtIndexAdjustedBalance(
                        hre.users.userOne,
                        this.krAsset,
                    );
                    expect(balanceAfter).to.bignumber.equal(mintAmount.div(denominator));
                    expect(balanceBefore).to.not.bignumber.equal(balanceAfter);

                    // Ensure that debt amount is also adjusted by the rebase
                    const debtAmount = await userOne.kreskoAssetDebt(hre.users.userOne.address, this.krAsset.address);
                    expect(balanceAfterAdjusted).to.bignumber.equal(debtAmount);
                });
            });

            describe("debt values are calculated correctly", () => {
                it("when mint is made before positive rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);
                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    // Mint before rebase
                    await userOne.mintKreskoAsset(hre.users.userOne.address, this.krAsset.address, mintAmount);
                    const valueBeforeRebase = await userOne.getAccountKrAssetValue(hre.users.userOne.address);

                    // Adjust price accordingly
                    const assetPrice = await this.krAsset.getPrice();
                    this.krAsset.setPrice(hre.fromBig(assetPrice.div(denominator), 8));

                    // Rebase the asset according to params
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    // Ensure that the value inside protocol matches the value before rebase
                    const valueAfterRebase = await userOne.getAccountKrAssetValue(hre.users.userOne.address);
                    expect(valueAfterRebase.rawValue).to.bignumber.equal(
                        await toScaledAmount(valueBeforeRebase.rawValue, this.krAsset),
                    );
                });

                it("when mint is made before negative rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);
                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    // Mint before rebase
                    await userOne.mintKreskoAsset(hre.users.userOne.address, this.krAsset.address, mintAmount);
                    const valueBeforeRebase = await userOne.getAccountKrAssetValue(hre.users.userOne.address);

                    // Adjust price accordingly
                    const assetPrice = await this.krAsset.getPrice();
                    this.krAsset.setPrice(hre.fromBig(assetPrice.mul(denominator), 8));

                    // Rebase the asset according to params
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    // Ensure that the value inside protocol matches the value before rebase
                    const valueAfterRebase = await userOne.getAccountKrAssetValue(hre.users.userOne.address);
                    expect(valueAfterRebase.rawValue).to.bignumber.equal(
                        await toScaledAmount(valueBeforeRebase.rawValue, this.krAsset),
                    );
                });
                it("when minted after positive rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    // Equal value after rebase
                    const equalMintAmount = mintAmount.mul(denominator);

                    const assetPrice = await this.krAsset.getPrice();

                    // Get value of the future mint before rebase
                    const valueBeforeRebase = await userOne.getKrAssetValue(this.krAsset.address, mintAmount, false);

                    // Adjust price accordingly
                    this.krAsset.setPrice(hre.fromBig(assetPrice, 8) / denominator);
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    await userOne.mintKreskoAsset(hre.users.userOne.address, this.krAsset.address, equalMintAmount);

                    // Ensure that value after mint matches what is expected
                    const valueAfterRebase = await userOne.getAccountKrAssetValue(hre.users.userOne.address);
                    expect(valueAfterRebase.rawValue).to.bignumber.equal(
                        await toScaledAmount(valueBeforeRebase.rawValue, this.krAsset),
                    );
                });

                it("when minted after negative rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    // Equal value after rebase
                    const equalMintAmount = mintAmount.div(denominator);

                    const assetPrice = await this.krAsset.getPrice();

                    // Get value of the future mint before rebase
                    const valueBeforeRebase = await userOne.getKrAssetValue(this.krAsset.address, mintAmount, false);

                    // Adjust price accordingly
                    this.krAsset.setPrice(hre.fromBig(assetPrice.mul(denominator), 8));
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    await userOne.mintKreskoAsset(hre.users.userOne.address, this.krAsset.address, equalMintAmount);

                    // Ensure that value after mint matches what is expected
                    const valueAfterRebase = await userOne.getAccountKrAssetValue(hre.users.userOne.address);
                    expect(valueAfterRebase.rawValue).to.bignumber.equal(
                        await toScaledAmount(valueBeforeRebase.rawValue, this.krAsset),
                    );
                });
            });

            describe("debt values and amounts are calculated correctly", () => {
                it("when minted before and after a positive rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);
                    const assetPrice = await this.krAsset.getPrice();

                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    const mintAmountAfterRebase = mintAmount.mul(denominator);
                    const assetPriceRebase = assetPrice.div(denominator);

                    // Get value of the future mint
                    const valueBeforeRebase = await userOne.getKrAssetValue(this.krAsset.address, mintAmount, false);

                    // Mint before rebase
                    await userOne.mintKreskoAsset(hre.users.userOne.address, this.krAsset.address, mintAmount);

                    // Get results
                    const balanceAfterFirstMint = await this.krAsset.contract.balanceOf(hre.users.userOne.address);
                    const debtAmountAfterFirstMint = await userOne.kreskoAssetDebt(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );
                    const debtValueAfterFirstMint = await userOne.getAccountKrAssetValue(hre.users.userOne.address);

                    // Assert
                    expect(balanceAfterFirstMint).to.bignumber.equal(debtAmountAfterFirstMint);
                    expect(valueBeforeRebase.rawValue).to.bignumber.equal(debtValueAfterFirstMint.rawValue);

                    // Adjust price and rebase
                    this.krAsset.setPrice(hre.fromBig(assetPriceRebase, 8));
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    // Ensure debt amounts and balances match
                    const [balanceAfterFirstRebase, balanceAfterFirstRebaseAdjusted] =
                        await getDebtIndexAdjustedBalance(hre.users.userOne, this.krAsset);
                    const debtAmountAfterFirstRebase = await userOne.kreskoAssetDebt(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );
                    expect(balanceAfterFirstRebase).to.bignumber.equal(mintAmountAfterRebase);
                    expect(balanceAfterFirstRebaseAdjusted).to.bignumber.equal(debtAmountAfterFirstRebase);

                    // Ensure debt usd values match
                    const debtValueAfterFirstRebase = await userOne.getAccountKrAssetValue(hre.users.userOne.address);
                    expect(await fromScaledAmount(debtValueAfterFirstRebase.rawValue, this.krAsset)).to.bignumber.equal(
                        debtValueAfterFirstMint.rawValue,
                    );
                    expect(await fromScaledAmount(debtValueAfterFirstRebase.rawValue, this.krAsset)).to.bignumber.equal(
                        valueBeforeRebase.rawValue,
                    );

                    // Mint after rebase
                    await userOne.mintKreskoAsset(
                        hre.users.userOne.address,
                        this.krAsset.address,
                        mintAmountAfterRebase,
                    );

                    // Ensure debt amounts and balances match
                    const balanceAfterSecondMint = await this.krAsset.contract.balanceOf(hre.users.userOne.address);

                    // Ensure balance matches
                    const expectedBalanceAfterSecondMint = balanceAfterFirstRebase.add(mintAmountAfterRebase);
                    expect(balanceAfterSecondMint).to.bignumber.equal(expectedBalanceAfterSecondMint);
                    // Ensure debt usd values match
                    const debtValueAfterSecondMint = await userOne.getAccountKrAssetValue(hre.users.userOne.address);
                    expect(
                        await fromScaledAmount(debtValueAfterSecondMint.rawValue, this.krAsset),
                    ).to.bignumber.closeTo(debtValueAfterFirstMint.rawValue.mul(2), INTEREST_RATE_PRICE_DELTA);
                    expect(debtValueAfterSecondMint.rawValue).to.bignumber.closeTo(
                        valueBeforeRebase.rawValue.mul(2),
                        INTEREST_RATE_PRICE_DELTA,
                    );
                });

                it("when minted before and after a negative rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);
                    const assetPrice = await this.krAsset.getPrice();

                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    const mintAmountAfterRebase = mintAmount.div(denominator);
                    const assetPriceRebase = assetPrice.mul(denominator);

                    // Get value of the future mint
                    const valueBeforeRebase = await userOne.getKrAssetValue(this.krAsset.address, mintAmount, false);

                    // Mint before rebase
                    await userOne.mintKreskoAsset(hre.users.userOne.address, this.krAsset.address, mintAmount);

                    // Get results
                    const balanceAfterFirstMint = await this.krAsset.contract.balanceOf(hre.users.userOne.address);
                    const debtAmountAfterFirstMint = await userOne.kreskoAssetDebt(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );
                    const debtValueAfterFirstMint = await userOne.getAccountKrAssetValue(hre.users.userOne.address);

                    // Assert
                    expect(balanceAfterFirstMint).to.bignumber.equal(debtAmountAfterFirstMint);
                    expect(valueBeforeRebase.rawValue).to.bignumber.equal(debtValueAfterFirstMint.rawValue);

                    // Adjust price and rebase
                    this.krAsset.setPrice(hre.fromBig(assetPriceRebase, 8));
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    // Ensure debt amounts and balances match
                    const [balanceAfterFirstRebase, balanceAfterFirstRebaseAdjusted] =
                        await getDebtIndexAdjustedBalance(hre.users.userOne, this.krAsset);
                    const debtAmountAfterFirstRebase = await userOne.kreskoAssetDebt(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );
                    expect(balanceAfterFirstRebase).to.bignumber.equal(mintAmountAfterRebase);
                    expect(balanceAfterFirstRebaseAdjusted).to.bignumber.equal(debtAmountAfterFirstRebase);

                    // Ensure debt usd values match
                    const debtValueAfterFirstRebase = await userOne.getAccountKrAssetValue(hre.users.userOne.address);
                    expect(debtValueAfterFirstRebase.rawValue).to.bignumber.equal(
                        await toScaledAmount(debtValueAfterFirstMint.rawValue, this.krAsset),
                    );
                    expect(debtValueAfterFirstRebase.rawValue).to.bignumber.equal(
                        await toScaledAmount(valueBeforeRebase.rawValue, this.krAsset),
                    );

                    // Mint after rebase
                    await userOne.mintKreskoAsset(
                        hre.users.userOne.address,
                        this.krAsset.address,
                        mintAmountAfterRebase,
                    );

                    // Ensure debt usd values match
                    const debtValueAfterSecondMint = await userOne.getAccountKrAssetValue(hre.users.userOne.address);
                    expect(debtValueAfterSecondMint.rawValue).to.bignumber.closeTo(
                        await toScaledAmount(debtValueAfterFirstMint.rawValue.mul(2), this.krAsset),
                        INTEREST_RATE_PRICE_DELTA,
                    );
                    expect(debtValueAfterSecondMint.rawValue).to.bignumber.closeTo(
                        await toScaledAmount(valueBeforeRebase.rawValue.mul(2), this.krAsset),
                        INTEREST_RATE_PRICE_DELTA,
                    );
                });
            });
        });

        describe("#burn", () => {
            beforeEach(async function () {
                // Create userOne debt position
                this.mintAmount = toBig(2);
                await hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                    hre.users.userOne.address,
                    this.krAsset.address,
                    this.mintAmount,
                );

                // Load userThree with Kresko Assets
                await this.collateral.mocks!.contract.setVariable("_balances", {
                    [hre.users.userThree.address]: this.initialBalance,
                });
                await this.collateral.mocks!.contract.setVariable("_allowances", {
                    [hre.users.userThree.address]: {
                        [hre.Diamond.address]: this.initialBalance,
                    },
                });
                expect(await this.collateral.contract.balanceOf(hre.users.userThree.address)).to.equal(
                    this.initialBalance,
                );

                await expect(
                    hre.Diamond.connect(hre.users.userThree).depositCollateral(
                        hre.users.userThree.address,
                        this.collateral.address,
                        toBig(10000),
                    ),
                ).not.to.be.reverted;

                await hre.Diamond.connect(hre.users.userThree).mintKreskoAsset(
                    hre.users.userThree.address,
                    this.krAsset.address,
                    this.mintAmount,
                );
            });

            it("should allow users to burn some of their Kresko asset balances", async function () {
                const kreskoAssetTotalSupplyBefore = await this.krAsset.contract.totalSupply();

                // Burn Kresko asset
                const burnAmount = toBig(1);
                const kreskoAssetIndex = 0;
                await hre.Diamond.connect(hre.users.userOne).burnKreskoAsset(
                    hre.users.userOne.address,
                    this.krAsset.address,
                    burnAmount,
                    kreskoAssetIndex,
                );

                // Confirm the user no long holds the burned Kresko asset amount
                const userBalance = await this.krAsset.contract.balanceOf(hre.users.userOne.address);
                expect(userBalance).to.equal(this.mintAmount.sub(burnAmount));

                // Confirm that the Kresko asset's total supply decreased as expected
                const kreskoAssetTotalSupplyAfter = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(burnAmount));

                // Confirm the array of the user's minted Kresko assets still contains the asset's address
                const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([this.krAsset.address]);

                // Confirm the user's minted kresko asset amount has been updated
                const userDebt = await hre.Diamond.kreskoAssetDebt(hre.users.userOne.address, this.krAsset.address);
                expect(userDebt).to.closeTo(this.mintAmount.sub(burnAmount), INTEREST_RATE_DELTA);
            });

            // TODO: kiss repayment
            it("should allow users to burn their full balance of a Kresko asset");
            // const kreskoAssetTotalSupplyBefore = await this.krAsset.contract.totalSupply();
            // // Burn Kresko asset
            // const kreskoAssetIndex = 0;
            // await hre.Diamond.connect(hre.users.userOne).burnKreskoAsset(
            //     hre.users.userOne.address,
            //     this.krAsset.address,
            //     this.mintAmount,
            //     kreskoAssetIndex,
            // );
            // // Confirm the user no long holds the burned Kresko asset amount
            // const userBalance = await this.krAsset.contract.balanceOf(hre.users.userOne.address);
            // expect(userBalance).to.equal(0);
            // // Confirm that the Kresko asset's total supply decreased as expected
            // const kreskoAssetTotalSupplyAfter = await this.krAsset.contract.totalSupply();
            // expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(this.mintAmount));
            // // Confirm the array of the user's minted Kresko assets no longer contains the asset's address
            // const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
            // expect(mintedKreskoAssetsAfter).to.deep.equal([]);
            // // Confirm the user's minted kresko asset amount has been updated
            // const userDebt = await hre.Diamond.kreskoAssetDebt(
            //     hre.users.userOne.address,
            //     this.krAsset.contract.address,
            // );
            // expect(userDebt).to.equal(0);

            it("should allow trusted address to burn its own Kresko asset balances on behalf of another user", async function () {
                // Grant userThree the MANAGER role
                await hre.Diamond.connect(hre.users.deployer).grantRole(Role.MANAGER, hre.users.userThree.address);
                expect(await hre.Diamond.hasRole(Role.MANAGER, hre.users.userThree.address)).to.equal(true);

                const kreskoAssetTotalSupplyBefore = await this.krAsset.contract.totalSupply();

                // Burn Kresko asset
                const burnAmount = toBig(1);
                const kreskoAssetIndex = 0;

                // User three burns it's KreskoAsset to reduce userOnes debt
                await expect(
                    hre.Diamond.connect(hre.users.userThree).burnKreskoAsset(
                        hre.users.userOne.address,
                        this.krAsset.address,
                        burnAmount,
                        kreskoAssetIndex,
                    ),
                ).to.not.be.reverted;

                // Confirm the userOne had no effect on it's kreskoAsset balance
                const userOneBalance = await this.krAsset.contract.balanceOf(hre.users.userOne.address);
                expect(userOneBalance).to.equal(this.mintAmount);

                // Confirm the userThree no long holds the burned Kresko asset amount
                const userThreeBalance = await this.krAsset.contract.balanceOf(hre.users.userThree.address);
                expect(userThreeBalance).to.equal(this.mintAmount.sub(burnAmount));
                // Confirm that the Kresko asset's total supply decreased as expected
                const kreskoAssetTotalSupplyAfter = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(burnAmount));
                // Confirm the array of the user's minted Kresko assets still contains the asset's address
                const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([this.krAsset.address]);
                // Confirm the user's minted kresko asset amount has been updated
                const userOneDebt = await hre.Diamond.kreskoAssetDebt(hre.users.userOne.address, this.krAsset.address);
                expect(userOneDebt).to.closeTo(this.mintAmount.sub(burnAmount), INTEREST_RATE_DELTA);
            });

            it("should allow trusted address to burn the full balance of its Kresko asset on behalf another user");
            // Grant userThree the MANAGER role
            // await hre.Diamond.connect(hre.users.deployer).grantRole(Role.MANAGER, hre.users.userThree.address);
            // expect(await hre.Diamond.hasRole(Role.MANAGER, hre.users.userThree.address)).to.equal(true);

            // const kreskoAssetTotalSupplyBefore = await this.krAsset.contract.totalSupply();

            // // User three burns the whole mintAmount of Kresko asset to repay userOne's debt
            // const kreskoAssetIndex = 0;
            // await hre.Diamond.connect(hre.users.userThree).burnKreskoAsset(
            //     hre.users.userOne.address,
            //     this.krAsset.address,
            //     this.mintAmount,
            //     kreskoAssetIndex,
            // );

            // // Confirm the userOne holds the initial minted amount of Kresko assets
            // const userOneBalance = await this.krAsset.contract.balanceOf(hre.users.userOne.address);
            // expect(userOneBalance).to.equal(this.mintAmount);
            // const userThreeBalance = await this.krAsset.contract.balanceOf(hre.users.userThree.address);
            // expect(userThreeBalance).to.equal(0);
            // // Confirm that the Kresko asset's total supply decreased as expected
            // const kreskoAssetTotalSupplyAfter = await this.krAsset.contract.totalSupply();
            // expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(this.mintAmount));
            // // Confirm the array of the user's minted Kresko assets no longer contains the asset's address
            // const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
            // expect(mintedKreskoAssetsAfter).to.deep.equal([]);
            // // Confirm the user's minted kresko asset amount has been updated
            // const userOneDebt = await hre.Diamond.kreskoAssetDebt(
            //     hre.users.userOne.address,
            //     this.krAsset.contract.address,
            // );
            // expect(userOneDebt).to.equal(0);

            it("should burn up to the minimum debt position amount if the requested burn would result in a position under the minimum debt value", async function () {
                const userBalanceBefore = await this.krAsset.contract.balanceOf(hre.users.userOne.address);
                const kreskoAssetTotalSupplyBefore = await this.krAsset.contract.totalSupply();

                // Calculate actual burn amount
                const userOneDebt = await hre.Diamond.kreskoAssetDebtPrincipal(
                    hre.users.userOne.address,
                    this.krAsset.address,
                );

                const minDebtValue = fromBig((await hre.Diamond.minimumDebtValue()).rawValue, 8);

                const oraclePrice = this.krAsset.deployArgs!.price;
                const burnAmount = hre.toBig(fromBig(userOneDebt) - minDebtValue / oraclePrice);

                // Burn Kresko asset
                const kreskoAssetIndex = 0;
                await hre.Diamond.connect(hre.users.userOne).burnKreskoAsset(
                    hre.users.userOne.address,
                    this.krAsset.address,
                    burnAmount,
                    kreskoAssetIndex,
                );

                // Confirm the user holds the expected Kresko asset amount
                const userBalance = await this.krAsset.contract.balanceOf(hre.users.userOne.address);

                // expect(fromBig(userBalance)).to.equal(fromBig(userBalanceBefore.sub(burnAmount)));
                expect(userBalance).eq(userBalanceBefore.sub(burnAmount));

                // Confirm that the Kresko asset's total supply decreased as expected
                const kreskoAssetTotalSupplyAfter = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).eq(kreskoAssetTotalSupplyBefore.sub(burnAmount));

                // Confirm the array of the user's minted Kresko assets still contains the asset's address
                const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(hre.users.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([this.krAsset.address]);

                // Confirm the user's minted kresko asset amount has been updated
                const newUserDebt = await hre.Diamond.kreskoAssetDebtPrincipal(
                    hre.users.userOne.address,
                    this.krAsset.address,
                );
                expect(newUserDebt).to.be.equal(userOneDebt.sub(burnAmount));
            });

            it("should emit KreskoAssetBurned event", async function () {
                const kreskoAssetIndex = 0;
                const tx = await hre.Diamond.connect(hre.users.userOne).burnKreskoAsset(
                    hre.users.userOne.address,
                    this.krAsset.address,
                    this.mintAmount.div(5),
                    kreskoAssetIndex,
                );

                const event = await getInternalEvent<KreskoAssetBurnedEvent["args"]>(
                    tx,
                    hre.Diamond,
                    "KreskoAssetBurned",
                );
                expect(event.account).to.equal(hre.users.userOne.address);
                expect(event.kreskoAsset).to.equal(this.krAsset.address);
                expect(event.amount).to.equal(this.mintAmount.div(5));
            });

            it("should allow users to burn Kresko assets without giving token approval to Kresko.sol contract", async function () {
                const secondMintAmount = 1;
                const burnAmount = this.mintAmount.add(secondMintAmount);

                await hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                    hre.users.userOne.address,
                    this.krAsset.address,
                    secondMintAmount,
                );

                const kreskoAssetIndex = 0;

                await expect(
                    hre.Diamond.connect(hre.users.userOne).burnKreskoAsset(
                        hre.users.userOne.address,
                        this.krAsset.address,
                        burnAmount,
                        kreskoAssetIndex,
                    ),
                ).to.be.not.reverted;
            });

            it("should not allow users to burn an amount of 0", async function () {
                const kreskoAssetIndex = 0;

                await expect(
                    hre.Diamond.connect(hre.users.userOne).burnKreskoAsset(
                        hre.users.userOne.address,
                        this.krAsset.address,
                        0,
                        kreskoAssetIndex,
                    ),
                ).to.be.revertedWith(Error.ZERO_BURN);
            });

            it("should not allow untrusted address to burn any kresko assets on behalf of another user", async function () {
                const kreskoAssetIndex = 0;

                await expect(
                    hre.Diamond.connect(hre.users.userThree).burnKreskoAsset(
                        hre.users.userOne.address,
                        this.krAsset.address,
                        100,
                        kreskoAssetIndex,
                    ),
                ).to.be.revertedWith(
                    `AccessControl: account ${hre.users.userThree.address.toLowerCase()} is missing role 0x46925e0f0cc76e485772167edccb8dc449d43b23b55fc4e756b063f49099e6a0`,
                );
            });

            it("should not allow users to burn more kresko assets than they hold as debt", async function () {
                const kreskoAssetIndex = 0;
                const debt = await hre.Diamond.kreskoAssetDebt(hre.users.userOne.address, this.krAsset.address);
                const burnAmount = debt.add(hre.toBig(1));

                await expect(
                    hre.Diamond.connect(hre.users.userOne).burnKreskoAsset(
                        hre.users.userOne.address,
                        this.krAsset.address,
                        burnAmount,
                        kreskoAssetIndex,
                    ),
                ).to.be.reverted;
            });

            describe("Protocol open fee", () => {
                it("should charge the protocol open fee with a single collateral asset if the deposit amount is sufficient and emit CloseFeePaid event", async function () {
                    const openFee = 0.01;
                    const openFeeBig = toBig(openFee); // use toBig() to emulate closeFee's 18 decimals on contract
                    this.krAsset = hre.krAssets.find(asset => asset.deployArgs!.symbol === defaultKrAssetArgs.symbol)!;

                    await this.krAsset.update({
                        ...defaultKrAssetArgs,
                        openFee,
                    });
                    const mintAmount = toBig(1);
                    const mintValue = mintAmount.mul(this.krAsset.deployArgs!.price);

                    const expectedFeeValue = mintValue.mul(openFeeBig);
                    const expectedCollateralFeeAmount = expectedFeeValue.div(this.collateral.deployArgs!.price);

                    // Get the balances prior to the fee being charged.
                    const kreskoCollateralAssetBalanceBefore = await this.collateral.contract.balanceOf(
                        hre.Diamond.address,
                    );
                    const feeRecipientCollateralBalanceBefore = await this.collateral.contract.balanceOf(
                        await hre.Diamond.feeRecipient(),
                    );

                    // Mint Kresko asset
                    const tx = await hre.Diamond.connect(hre.users.userOne).mintKreskoAsset(
                        hre.users.userOne.address,
                        this.krAsset.address,
                        mintAmount,
                    );

                    // Get the balances after the fees have been charged.
                    const kreskoCollateralAssetBalanceAfter = await this.collateral.contract.balanceOf(
                        hre.Diamond.address,
                    );
                    const feeRecipientCollateralBalanceAfter = await this.collateral.contract.balanceOf(
                        await hre.Diamond.feeRecipient(),
                    );

                    // Ensure the amount gained / lost by the kresko contract and the fee recipient are as expected
                    const feeRecipientBalanceIncrease = feeRecipientCollateralBalanceAfter.sub(
                        feeRecipientCollateralBalanceBefore,
                    );
                    expect(kreskoCollateralAssetBalanceBefore.sub(kreskoCollateralAssetBalanceAfter)).to.equal(
                        feeRecipientBalanceIncrease,
                    );

                    // Normalize expected amount because protocol closeFee has 10**18 decimals
                    const normalizedExpectedCollateralFeeAmount = fromBig(expectedCollateralFeeAmount) / 10 ** 18;
                    expect(feeRecipientBalanceIncrease).to.equal(toBig(normalizedExpectedCollateralFeeAmount));

                    // Ensure the emitted event is as expected.
                    const event = await getInternalEvent<OpenFeePaidEventObject>(tx, hre.Diamond, "OpenFeePaid");
                    expect(event.account).to.equal(hre.users.userOne.address);
                    expect(event.paymentCollateralAsset).to.equal(this.collateral.address);
                    expect(event.paymentAmount).to.equal(toBig(normalizedExpectedCollateralFeeAmount));
                    const expectedFeeValueNormalizedA = expectedFeeValue.div(10 ** 10); // Normalize krAsset price's 10**10 decimals on contract
                    const expectedFeeValueNormalizedB = fromBig(expectedFeeValueNormalizedA); // Normalize closeFee's 10**18 decimals on contract
                    expect(event.paymentValue).to.equal(expectedFeeValueNormalizedB);

                    // Now verify that calcExpectedFee function returns accurate fee amount
                    const feeRes = await hre.Diamond.calcExpectedFee(
                        hre.users.userOne.address,
                        this.krAsset.address,
                        mintAmount,
                        Fee.OPEN,
                    );
                    const output: string[] = feeRes.toString().split(",");
                    const openFeeAmount = Number(output[1]) / 10 ** 18;
                    expect(openFeeAmount).eq(normalizedExpectedCollateralFeeAmount);
                });
            });
            describe("Protocol close fee", () => {
                it("should charge the protocol close fee with a single collateral asset if the deposit amount is sufficient and emit CloseFeePaid event", async function () {
                    const burnAmount = toBig(1);
                    const burnValue = burnAmount.mul(this.krAsset.deployArgs!.price);
                    const closeFee = toBig(this.krAsset.deployArgs!.closeFee); // use toBig() to emulate closeFee's 18 decimals on contract
                    const expectedFeeValue = burnValue.mul(closeFee);
                    const expectedCollateralFeeAmount = expectedFeeValue.div(this.collateral.deployArgs!.price);

                    // Get the balances prior to the fee being charged.
                    const kreskoCollateralAssetBalanceBefore = await this.collateral.contract.balanceOf(
                        hre.Diamond.address,
                    );
                    const feeRecipientCollateralBalanceBefore = await this.collateral.contract.balanceOf(
                        await hre.Diamond.feeRecipient(),
                    );

                    // Burn Kresko asset
                    const kreskoAssetIndex = 0;
                    const tx = await hre.Diamond.connect(hre.users.userOne).burnKreskoAsset(
                        hre.users.userOne.address,
                        this.krAsset.address,
                        burnAmount,
                        kreskoAssetIndex,
                    );

                    // Get the balances after the fees have been charged.
                    const kreskoCollateralAssetBalanceAfter = await this.collateral.contract.balanceOf(
                        hre.Diamond.address,
                    );
                    const feeRecipientCollateralBalanceAfter = await this.collateral.contract.balanceOf(
                        await hre.Diamond.feeRecipient(),
                    );

                    // Ensure the amount gained / lost by the kresko contract and the fee recipient are as expected
                    const feeRecipientBalanceIncrease = feeRecipientCollateralBalanceAfter.sub(
                        feeRecipientCollateralBalanceBefore,
                    );
                    expect(kreskoCollateralAssetBalanceBefore.sub(kreskoCollateralAssetBalanceAfter)).to.equal(
                        feeRecipientBalanceIncrease,
                    );

                    // Normalize expected amount because protocol closeFee has 10**18 decimals
                    const normalizedExpectedCollateralFeeAmount = fromBig(expectedCollateralFeeAmount) / 10 ** 18;
                    expect(feeRecipientBalanceIncrease).to.equal(toBig(normalizedExpectedCollateralFeeAmount));

                    // Ensure the emitted event is as expected.
                    const event = await getInternalEvent<CloseFeePaidEventObject>(tx, hre.Diamond, "CloseFeePaid");
                    expect(event.account).to.equal(hre.users.userOne.address);
                    expect(event.paymentCollateralAsset).to.equal(this.collateral.address);
                    expect(event.paymentAmount).to.equal(toBig(normalizedExpectedCollateralFeeAmount));
                    const expectedFeeValueNormalizedA = expectedFeeValue.div(10 ** 10); // Normalize krAsset price's 10**10 decimals on contract
                    const expectedFeeValueNormalizedB = fromBig(expectedFeeValueNormalizedA); // Normalize closeFee's 10**18 decimals on contract
                    expect(event.paymentValue).to.equal(expectedFeeValueNormalizedB);
                });
                it("should charge correct protocol close fee after a positive rebase", async function () {
                    const mintAmount = 10;
                    const wAmount = 1;
                    const burnAmount = 1;
                    const expectedFeeAmount = hre.toBig(burnAmount * this.krAsset.deployArgs!.closeFee);
                    const expectedFeeValue = hre.toBig(
                        burnAmount * this.krAsset.deployArgs!.price * this.krAsset.deployArgs!.closeFee,
                        8,
                    );
                    await mintKrAsset({
                        user: hre.users.userThree,
                        asset: this.krAsset,
                        amount: hre.toBig(mintAmount),
                    });
                    await withdrawCollateral({
                        user: hre.users.userThree,
                        asset: this.collateral,
                        amount: wAmount,
                    });

                    const event = await getInternalEvent<CloseFeePaidEventObject>(
                        await burnKrAsset({
                            user: hre.users.userThree,
                            asset: this.krAsset,
                            amount: burnAmount,
                        }),
                        hre.Diamond,
                        "CloseFeePaid",
                    );

                    expect(event.paymentAmount).to.equal(expectedFeeAmount);
                    expect(event.paymentValue).to.equal(expectedFeeValue);

                    // rebase params
                    const denominator = 4;
                    const positive = true;
                    const priceAfter = hre.fromBig(await this.krAsset.getPrice(), 8) / denominator;
                    this.krAsset.setPrice(priceAfter);
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);
                    const burnAmountRebase = burnAmount * denominator;

                    await withdrawCollateral({
                        user: hre.users.userThree,
                        asset: this.collateral,
                        amount: wAmount,
                    });
                    const eventAfterRebase = await getInternalEvent<CloseFeePaidEventObject>(
                        await burnKrAsset({
                            user: hre.users.userThree,
                            asset: this.krAsset,
                            amount: burnAmountRebase,
                        }),
                        hre.Diamond,
                        "CloseFeePaid",
                    );
                    expect(eventAfterRebase.paymentCollateralAsset).to.equal(event.paymentCollateralAsset);
                    expect(eventAfterRebase.paymentAmount).to.equal(expectedFeeAmount);
                    expect(eventAfterRebase.paymentValue).to.equal(expectedFeeValue);
                });
                it("should charge correct protocol close fee after a negative rebase", async function () {
                    const mintAmount = 10;
                    const wAmount = 1;
                    const burnAmount = 1;
                    const expectedFeeAmount = hre.toBig(burnAmount * this.krAsset.deployArgs!.closeFee);
                    const expectedFeeValue = hre.toBig(
                        burnAmount * this.krAsset.deployArgs!.price * this.krAsset.deployArgs!.closeFee,
                        8,
                    );
                    await mintKrAsset({
                        user: hre.users.userThree,
                        asset: this.krAsset,
                        amount: hre.toBig(mintAmount),
                    });
                    await withdrawCollateral({
                        user: hre.users.userThree,
                        asset: this.collateral,
                        amount: wAmount,
                    });

                    const event = await getInternalEvent<CloseFeePaidEventObject>(
                        await burnKrAsset({
                            user: hre.users.userThree,
                            asset: this.krAsset,
                            amount: burnAmount,
                        }),
                        hre.Diamond,
                        "CloseFeePaid",
                    );

                    expect(event.paymentAmount).to.equal(expectedFeeAmount);
                    expect(event.paymentValue).to.equal(expectedFeeValue);

                    // rebase params
                    const denominator = 4;
                    const positive = false;
                    const priceAfter = hre.fromBig(await this.krAsset.getPrice(), 8) * denominator;
                    this.krAsset.setPrice(priceAfter);
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);
                    const burnAmountRebase = burnAmount / denominator;

                    await withdrawCollateral({
                        user: hre.users.userThree,
                        asset: this.collateral,
                        amount: wAmount,
                    });
                    const eventAfterRebase = await getInternalEvent<CloseFeePaidEventObject>(
                        await burnKrAsset({
                            user: hre.users.userThree,
                            asset: this.krAsset,
                            amount: burnAmountRebase,
                        }),
                        hre.Diamond,
                        "CloseFeePaid",
                    );
                    expect(eventAfterRebase.paymentCollateralAsset).to.equal(event.paymentCollateralAsset);
                    expect(eventAfterRebase.paymentAmount).to.equal(expectedFeeAmount);
                    expect(eventAfterRebase.paymentValue).to.equal(expectedFeeValue);
                });
            });
        });

        describe("#burn - rebase events", () => {
            const mintAmountInt = 40;
            const mintAmount = hre.toBig(mintAmountInt);

            beforeEach(async function () {
                await mintKrAsset({
                    asset: this.krAsset,
                    amount: mintAmountInt,
                    user: hre.users.userOne,
                });
            });

            describe("debt amounts are calculated correctly", () => {
                it("when repaying all debt after a positive rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    // Adjust price according to rebase params
                    const assetPrice = await this.krAsset.getPrice();
                    const newPrice = hre.fromBig(assetPrice.div(denominator), 8);
                    this.krAsset.setPrice(newPrice);
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    // Pay half of debt
                    const debt = await hre.Diamond.kreskoAssetDebtPrincipal(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );
                    const repayAmount = debt;
                    await userOne.burnKreskoAsset(hre.users.userOne.address, this.krAsset.address, repayAmount, 0);

                    // Debt value after half repayment
                    const debtAfter = await hre.Diamond.kreskoAssetDebtPrincipal(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );

                    expect(debtAfter).to.bignumber.equal(0);

                    const expectedBalanceAfterBurn = 0;
                    const balanceAfterBurn = hre.fromBig(
                        await this.krAsset.contract.balanceOf(hre.users.userOne.address),
                    );
                    expect(balanceAfterBurn).to.equal(expectedBalanceAfterBurn);

                    // Anchor krAssets should equal balance * denominator
                    const wkrAssetBalanceKresko = await this.krAsset.anchor!.balanceOf(hre.Diamond.address);
                    expect(wkrAssetBalanceKresko).to.closeTo(hre.toBig(expectedBalanceAfterBurn / denominator), 100000); // WEI
                });

                it("when repaying partial debt after a positive rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    // Adjust price according to rebase params
                    const assetPrice = await this.krAsset.getPrice();
                    const newPrice = hre.fromBig(assetPrice.div(denominator), 8);
                    this.krAsset.setPrice(newPrice);
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    // Pay half of debt
                    const debt = await hre.Diamond.kreskoAssetDebtPrincipal(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );
                    const repayAmount = debt.div(2);
                    await userOne.burnKreskoAsset(hre.users.userOne.address, this.krAsset.address, repayAmount, 0);

                    // Debt value after half repayment
                    const debtAfter = await hre.Diamond.kreskoAssetDebtPrincipal(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );

                    // Calc expected value with last update
                    const expectedDebt = mintAmount.div(2).mul(denominator);

                    expect(debtAfter).to.bignumber.equal(expectedDebt);

                    // Should be all burned
                    const expectedBalanceAfter = mintAmount.mul(denominator).sub(repayAmount);
                    const balanceAfterBurn = await this.krAsset.contract.balanceOf(hre.users.userOne.address);
                    expect(balanceAfterBurn).to.bignumber.equal(expectedBalanceAfter);

                    // All wkrAssets should be burned
                    const expectedwkrBalance = mintAmount.sub(repayAmount.div(denominator));
                    const wkrAssetBalanceKresko = await this.krAsset.anchor!.balanceOf(hre.Diamond.address);
                    expect(wkrAssetBalanceKresko).to.equal(expectedwkrBalance);
                });

                it("when repaying all debt after a negative rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    // Adjust price according to rebase params
                    const assetPrice = await this.krAsset.getPrice();
                    const newPrice = hre.fromBig(assetPrice.mul(denominator), 8);
                    this.krAsset.setPrice(newPrice);
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    // Pay half of debt
                    const debt = await hre.Diamond.kreskoAssetDebtPrincipal(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );
                    const repayAmount = debt;
                    await userOne.burnKreskoAsset(hre.users.userOne.address, this.krAsset.address, repayAmount, 0);

                    // Debt value after half repayment
                    const debtAfter = await hre.Diamond.kreskoAssetDebtPrincipal(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );

                    // Calc expected value with last update
                    const expectedDebt = 0;

                    expect(debtAfter).to.bignumber.equal(expectedDebt);

                    const expectedBalanceAfterBurn = 0;
                    const balanceAfterBurn = hre.fromBig(
                        await this.krAsset.contract.balanceOf(hre.users.userOne.address),
                    );
                    expect(balanceAfterBurn).to.equal(expectedBalanceAfterBurn);

                    // Anchor krAssets should equal balance * denominator
                    const wkrAssetBalanceKresko = await this.krAsset.anchor!.balanceOf(hre.Diamond.address);
                    expect(wkrAssetBalanceKresko).to.equal(hre.toBig(expectedBalanceAfterBurn * denominator)); // WEI
                });

                it("when repaying partial debt after a negative rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    // Adjust price according to rebase params
                    const assetPrice = await this.krAsset.getPrice();
                    const newPrice = hre.fromBig(assetPrice.mul(denominator), 8);
                    this.krAsset.setPrice(newPrice);
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    // Pay half of debt
                    const debt = await hre.Diamond.kreskoAssetDebtPrincipal(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );
                    const repayAmount = debt.div(2);
                    await userOne.burnKreskoAsset(hre.users.userOne.address, this.krAsset.address, repayAmount, 0);

                    // Debt value after half repayment
                    const debtAfter = await hre.Diamond.kreskoAssetDebtPrincipal(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );

                    // Calc expected value with last update
                    const expectedDebt = mintAmount.div(2).div(denominator);

                    expect(debtAfter).to.bignumber.equal(expectedDebt);

                    // Should be all burned
                    const expectedBalanceAfter = mintAmount.div(denominator).sub(repayAmount);
                    const balanceAfterBurn = await this.krAsset.contract.balanceOf(hre.users.userOne.address);
                    expect(balanceAfterBurn).to.bignumber.equal(expectedBalanceAfter);

                    // All wkrAssets should be burned
                    const expectedwkrBalance = mintAmount.sub(repayAmount.mul(denominator));
                    const wkrAssetBalanceKresko = await this.krAsset.anchor!.balanceOf(hre.Diamond.address);
                    expect(wkrAssetBalanceKresko).to.equal(expectedwkrBalance);
                });
            });

            describe("debt value and mintedKreskoAssets book-keeping is calculated correctly", () => {
                it("when repaying all debt after a positive rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const fullRepayAmount = mintAmount.mul(denominator);

                    // Adjust price according to rebase params
                    const assetPrice = await this.krAsset.getPrice();
                    const newPrice = hre.fromBig(assetPrice.div(denominator), 8);
                    this.krAsset.setPrice(newPrice);
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    await userOne.burnKreskoAsset(hre.users.userOne.address, this.krAsset.address, fullRepayAmount, 0);

                    // Debt value after half repayment
                    const debtAfter = await hre.Diamond.kreskoAssetDebtPrincipal(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );
                    const debtValueAfter = (await hre.Diamond.getKrAssetValue(this.krAsset.address, debtAfter, false))
                        .rawValue;

                    expect(debtValueAfter).to.equal(0);

                    // Should still contain minted krAsset
                    const mintedKreskoAssetsAfterBurn = await hre.Diamond.getMintedKreskoAssets(
                        hre.users.userOne.address,
                    );
                    expect(mintedKreskoAssetsAfterBurn).to.contain(this.krAsset.address);
                });
                it("when repaying partial debt after a positive rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const mintValue = (await hre.Diamond.getKrAssetValue(this.krAsset.address, mintAmount, false))
                        .rawValue;

                    // Adjust price according to rebase params
                    const assetPrice = await this.krAsset.getPrice();

                    const newPrice = hre.fromBig(assetPrice.div(denominator), 8);
                    this.krAsset.setPrice(newPrice);
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    // Should contain minted krAsset
                    const mintedKreskoAssetsBeforeBurn = await hre.Diamond.getMintedKreskoAssets(
                        hre.users.userOne.address,
                    );
                    expect(mintedKreskoAssetsBeforeBurn).to.contain(this.krAsset.address);

                    // Burn assets
                    // Pay half of debt
                    const debt = await hre.Diamond.kreskoAssetDebtPrincipal(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );
                    await userOne.burnKreskoAsset(hre.users.userOne.address, this.krAsset.address, debt.div(2), 0);

                    // Debt value after half repayment
                    const debtAfter = await hre.Diamond.kreskoAssetDebtPrincipal(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );
                    const debtValueAfter = (await hre.Diamond.getKrAssetValue(this.krAsset.address, debtAfter, false))
                        .rawValue;

                    // Calc expected value with last update
                    const expectedValue = mintValue.div(2);
                    expect(debtValueAfter).to.equal(expectedValue);

                    // Should still contain minted krAsset
                    const mintedKreskoAssetsAfterBurn = await hre.Diamond.getMintedKreskoAssets(
                        hre.users.userOne.address,
                    );
                    expect(mintedKreskoAssetsAfterBurn).to.contain(this.krAsset.address);
                });
                it("when repaying all debt after a negative rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const fullRepayAmount = mintAmount.div(denominator);

                    // Adjust price according to rebase params
                    const assetPrice = await this.krAsset.getPrice();
                    const newPrice = hre.fromBig(assetPrice.mul(denominator), 8);
                    this.krAsset.setPrice(newPrice);
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    await userOne.burnKreskoAsset(hre.users.userOne.address, this.krAsset.address, fullRepayAmount, 0);

                    // Debt value after half repayment
                    const debtAfter = await hre.Diamond.kreskoAssetDebtPrincipal(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );
                    const debtValueAfter = (await hre.Diamond.getKrAssetValue(this.krAsset.address, debtAfter, false))
                        .rawValue;

                    expect(debtValueAfter).to.equal(0);
                    // Should still contain minted krAsset
                    const mintedKreskoAssetsAfterBurn = await hre.Diamond.getMintedKreskoAssets(
                        hre.users.userOne.address,
                    );
                    expect(mintedKreskoAssetsAfterBurn).to.contain(this.krAsset.address);
                });
                it("when repaying partial debt after a negative rebase", async function () {
                    const userOne = hre.Diamond.connect(hre.users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = false;
                    const mintValue = (await hre.Diamond.getKrAssetValue(this.krAsset.address, mintAmount, false))
                        .rawValue;

                    // Adjust price according to rebase params
                    const assetPrice = await this.krAsset.getPrice();
                    const newPrice = hre.fromBig(assetPrice.mul(denominator), 8);
                    this.krAsset.setPrice(newPrice);
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive, []);

                    // Pay half of debt
                    const debt = await hre.Diamond.kreskoAssetDebtPrincipal(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );
                    await userOne.burnKreskoAsset(hre.users.userOne.address, this.krAsset.address, debt.div(2), 0);

                    // Debt value after half repayment
                    const debtAfter = await hre.Diamond.kreskoAssetDebtPrincipal(
                        hre.users.userOne.address,
                        this.krAsset.address,
                    );
                    const debtValueAfter = (await hre.Diamond.getKrAssetValue(this.krAsset.address, debtAfter, false))
                        .rawValue;

                    // Calc expected value with last update
                    const expectedValue = mintValue.div(2);
                    expect(debtValueAfter).to.equal(expectedValue);

                    // Should still contain minted krAsset
                    const mintedKreskoAssetsAfterBurn = await hre.Diamond.getMintedKreskoAssets(
                        hre.users.userOne.address,
                    );
                    expect(mintedKreskoAssetsAfterBurn).to.contain(this.krAsset.address);
                });
            });
        });
    });
});
