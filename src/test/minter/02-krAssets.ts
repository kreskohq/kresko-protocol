import {
    addMockKreskoAsset,
    Role,
    withFixture,
    defaultCloseFee,
    defaultCollateralArgs,
    defaultOpenFee,
    defaultKrAssetArgs,
    Fee
} from "@test-utils";
import { extractInternalIndexedEventFromTxReceipt } from "@utils";
import { fromBig, toBig } from "@utils/numbers";
import { Error } from "@utils/test/errors";
import { expect } from "chai";
import hre, { users } from "hardhat";
import { MinterEvent__factory } from "types";
import {
    KreskoAssetBurnedEvent,
    KreskoAssetMintedEventObject,
    CloseFeePaidEventObject,
    OpenFeePaidEventObject,
} from "types/typechain/src/contracts/libs/Events.sol/MinterEvent";

describe("Minter", function () {
    withFixture(["minter-test"]);
    beforeEach(async function () {
        // Add mock collateral to protocol
        this.collateral = hre.collaterals.find(c => c.deployArgs.name === defaultCollateralArgs.name);
        // Load account with collateral
        this.initialBalance = toBig(100000);
        await this.collateral.mocks.contract.setVariable("_balances", {
            [users.userOne.address]: this.initialBalance,
        });
        await this.collateral.mocks.contract.setVariable("_allowances", {
            [users.userOne.address]: {
                [hre.Diamond.address]: this.initialBalance,
            },
        });
        expect(await this.collateral.contract.balanceOf(users.userOne.address)).to.equal(this.initialBalance);

        // User deposits 10,000 collateral
        await expect(
            hre.Diamond.connect(users.userOne).depositCollateral(
                users.userOne.address,
                this.collateral.address,
                toBig(10000),
            ),
        ).not.to.be.reverted;

        this.krAsset = hre.krAssets.find(c => c.deployArgs.name === defaultKrAssetArgs.name);
    });

    describe("#krAsset", function () {
        describe("#mint", function () {
            it("should allow users to mint whitelisted Kresko assets backed by collateral", async function () {
                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyBefore = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyBefore).to.equal(0);
                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsBefore = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsBefore).to.deep.equal([]);

                // Mint Kresko asset
                const mintAmount = toBig(1);
                await hre.Diamond.connect(users.userOne).mintKreskoAsset(
                    users.userOne.address,
                    this.krAsset.address,
                    mintAmount,
                );

                // Confirm the array of the user's minted Kresko assets has been pushed to.
                const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([this.krAsset.address]);
                // Confirm the amount minted is recorded for the user.
                const amountMinted = await hre.Diamond.kreskoAssetDebt(users.userOne.address, this.krAsset.address);
                expect(amountMinted).to.equal(mintAmount);
                // Confirm the user's Kresko asset balance has increased
                const userBalance = await this.krAsset.mocks.contract.balanceOf(users.userOne.address);
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
                const mintedKreskoAssetsInitial = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsInitial).to.deep.equal([]);

                // Mint Kresko asset
                const firstMintAmount = toBig(5);
                await hre.Diamond.connect(users.userOne).mintKreskoAsset(
                    users.userOne.address,
                    this.krAsset.address,
                    firstMintAmount,
                );

                // Confirm the array of the user's minted Kresko assets has been pushed to.
                const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([this.krAsset.address]);

                // Confirm the amount minted is recorded for the user.
                const amountMintedAfter = await hre.Diamond.kreskoAssetDebt(
                    users.userOne.address,
                    this.krAsset.address,
                );
                expect(amountMintedAfter).to.equal(firstMintAmount);

                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceAfter = await this.krAsset.contract.balanceOf(users.userOne.address);
                expect(userBalanceAfter).to.equal(amountMintedAfter);

                // Confirm that the Kresko asset's total supply increased as expected
                const kreskoAssetTotalSupplyAfter = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyInitial.add(firstMintAmount));

                // ------------------------ Second mint ------------------------
                // Mint Kresko asset
                const secondMintAmount = toBig(5);
                await hre.Diamond.connect(users.userOne).mintKreskoAsset(
                    users.userOne.address,
                    this.krAsset.address,
                    secondMintAmount,
                );

                // Confirm the array of the user's minted Kresko assets is unchanged
                const mintedKreskoAssetsFinal = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsFinal).to.deep.equal([this.krAsset.address]);

                // Confirm the second mint amount is recorded for the user
                const amountMintedFinal = await hre.Diamond.kreskoAssetDebt(
                    users.userOne.address,
                    this.krAsset.address,
                );
                expect(amountMintedFinal).to.equal(firstMintAmount.add(secondMintAmount));

                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceFinal = await this.krAsset.contract.balanceOf(users.userOne.address);
                expect(userBalanceFinal).to.equal(amountMintedFinal);

                // Confirm that the Kresko asset's total supply increased as expected
                const kreskoAssetTotalSupplyFinal = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyFinal).to.equal(kreskoAssetTotalSupplyAfter.add(secondMintAmount));
            });

            it("should allow users to mint multiple different Kresko assets", async function () {
                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyInitial = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyInitial).to.equal(0);
                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsInitial = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsInitial).to.deep.equal([]);

                // Mint Kresko asset
                const firstMintAmount = toBig(1);
                await hre.Diamond.connect(users.userOne).mintKreskoAsset(
                    users.userOne.address,
                    this.krAsset.address,
                    firstMintAmount,
                );

                // Confirm the array of the user's minted Kresko assets has been pushed to.
                const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([this.krAsset.address]);
                // Confirm the amount minted is recorded for the user.
                const amountMintedAfter = await hre.Diamond.kreskoAssetDebt(
                    users.userOne.address,
                    this.krAsset.address,
                );
                expect(amountMintedAfter).to.equal(firstMintAmount);
                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceAfter = await this.krAsset.contract.balanceOf(users.userOne.address);
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
                    factor: 1,
                    supplyLimit: 100000,
                    closeFee: defaultCloseFee,
                    openFee: defaultOpenFee,
                };
                const { contract: secondKreskoAsset } = await addMockKreskoAsset(secondKrAssetArgs);

                // Mint Kresko asset
                const secondMintAmount = toBig(2);
                await hre.Diamond.connect(users.userOne).mintKreskoAsset(
                    users.userOne.address,
                    secondKreskoAsset.address,
                    secondMintAmount,
                );

                // Confirm that the second address has been pushed to the array of the user's minted Kresko assets
                const mintedKreskoAssetsFinal = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsFinal).to.deep.equal([this.krAsset.address, secondKreskoAsset.address]);
                // Confirm the second mint amount is recorded for the user
                const amountMintedAssetTwo = await hre.Diamond.kreskoAssetDebt(
                    users.userOne.address,
                    secondKreskoAsset.address,
                );
                expect(amountMintedAssetTwo).to.equal(secondMintAmount);
                // Confirm the Kresko Asset as been minted to the user from Kresko.sol
                const userBalanceFinal = await secondKreskoAsset.balanceOf(users.userOne.address);
                expect(userBalanceFinal).to.equal(amountMintedAssetTwo);
                // Confirm that the Kresko asset's total supply increased as expected
                const secondKreskoAssetTotalSupply = await secondKreskoAsset.totalSupply();
                expect(secondKreskoAssetTotalSupply).to.equal(secondMintAmount);
            });

            it("should allow users to mint Kresko assets with USD value equal to the minimum debt value", async function () {
                // Confirm that the user does not have an existing debt position for this Kresko asset
                const initialKreskoAssetDebt = await hre.Diamond.kreskoAssetDebt(
                    users.userOne.address,
                    this.krAsset.address,
                );
                expect(initialKreskoAssetDebt).to.equal(0);

                // Confirm that the mint amount's USD value is equal to the contract's current minimum debt value
                const mintAmount = toBig(1); // 1 * $10 = $10
                const mintAmountUSDValue = await hre.Diamond.getKrAssetValue(this.krAsset.address, mintAmount, false);
                const currMinimumDebtValue = await hre.Diamond.minimumDebtValue();
                expect(fromBig(mintAmountUSDValue, 8)).to.equal(Number(currMinimumDebtValue) / 10 ** 8);

                await hre.Diamond.connect(users.userOne).mintKreskoAsset(
                    users.userOne.address,
                    this.krAsset.address,
                    mintAmount,
                );

                // Confirm that the mint was successful and user's balances have increased
                const finalKreskoAssetDebt = await hre.Diamond.kreskoAssetDebt(
                    users.userOne.address,
                    this.krAsset.address,
                );
                expect(finalKreskoAssetDebt).to.equal(mintAmount);
            });

            it("should allow a trusted address to mint Kresko assets on behalf of another user", async function () {
                // Grant userThree the MANAGER role
                await hre.Diamond.connect(users.deployer).grantRole(Role.MANAGER, users.userThree.address);
                expect(await hre.Diamond.hasRole(Role.MANAGER, users.userThree.address)).to.equal(true);

                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyBefore = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyBefore).to.equal(0);
                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsBefore = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsBefore).to.deep.equal([]);

                // userThree (trusted contract) mints Kresko asset for userOne
                const mintAmount = toBig(1);
                await hre.Diamond.connect(users.userThree).mintKreskoAsset(
                    users.userOne.address,
                    this.krAsset.address,
                    mintAmount,
                );

                // Check that debt exists now for userOne
                const userOneDebtFromUserThreeMint = await hre.Diamond.kreskoAssetDebt(
                    users.userOne.address,
                    this.krAsset.address,
                );
                expect(userOneDebtFromUserThreeMint).to.equal(mintAmount);
            });

            it("should emit KreskoAssetMinted event", async function () {
                const mintAmount = toBig(500);
                const tx = await hre.Diamond.connect(users.userOne).mintKreskoAsset(
                    users.userOne.address,
                    this.krAsset.address,
                    mintAmount,
                );

                const event = await extractInternalIndexedEventFromTxReceipt<KreskoAssetMintedEventObject>(
                    tx,
                    MinterEvent__factory.connect(hre.Diamond.address, users.userOne),
                    "KreskoAssetMinted",
                );
                expect(event.account).to.equal(users.userOne.address);
                expect(event.kreskoAsset).to.equal(this.krAsset.address);
                expect(event.amount).to.equal(mintAmount);
            });

            it("should not allow untrusted account to mint Kresko assets on behalf of another user", async function () {
                // Initially the Kresko asset's total supply should be 0
                const kreskoAssetTotalSupplyBefore = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyBefore).to.equal(0);

                // Initially, the array of the user's minted kresko assets should be empty.
                const mintedKreskoAssetsBefore = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsBefore).to.deep.equal([]);

                // Mint Kresko asset
                const mintAmount = toBig(1);
                await expect(
                    hre.Diamond.connect(users.userOne).mintKreskoAsset(
                        users.userTwo.address,
                        this.krAsset.address,
                        mintAmount,
                    ),
                ).to.be.revertedWith(
                    `AccessControl: account ${users.userOne.address.toLowerCase()} is missing role 0x46925e0f0cc76e485772167edccb8dc449d43b23b55fc4e756b063f49099e6a0`,
                );
            });

            it("should not allow users to mint Kresko assets if the resulting position's USD value is less than the minimum debt value", async function () {
                // Confirm that the user does not have an existing debt position for this Kresko asset
                const initialKreskoAssetDebt = await hre.Diamond.kreskoAssetDebt(
                    users.userOne.address,
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
                    hre.Diamond.connect(users.userOne).mintKreskoAsset(
                        users.userOne.address,
                        this.krAsset.address,
                        mintAmount,
                    ),
                ).to.be.revertedWith(Error.KRASSET_MINT_AMOUNT_LOW);
            });

            it("should not allow users to mint non-whitelisted Kresko assets", async function () {
                // Attempt to mint a non-deployed, non-whitelisted Kresko asset
                await expect(
                    hre.Diamond.connect(users.userOne).mintKreskoAsset(
                        users.userOne.address,
                        "0x0000000000000000000000000000000000000002",
                        toBig(1),
                    ),
                ).to.be.revertedWith(Error.KRASSET_DOESNT_EXIST);
            });

            it("should not allow users to mint Kresko assets over their collateralization ratio limit", async function () {
                // We can ignore price and collateral factor as both this.collateral and this.krAsset both
                // have the same price ($10) and same collateral factor (1)
                const collateralAmountDeposited = await hre.Diamond.collateralDeposits(
                    users.userOne.address,
                    this.collateral.address,
                );
                // Apply 150% MCR and increase deposit amount to be above the maximum allowed by MCR
                const mcrAmount = fromBig(collateralAmountDeposited) / 1.5;
                const mintAmount = toBig(mcrAmount + 1);

                await expect(
                    hre.Diamond.connect(users.userOne).mintKreskoAsset(
                        users.userOne.address,
                        this.krAsset.address,
                        mintAmount,
                    ),
                ).to.be.revertedWith(Error.KRASSET_COLLATERAL_LOW);
            });

            it("should not allow the minting of any Kresko asset amount over its maximum limit", async function () {
                // User deposits another 10,000 collateral tokens, enabling mints of up to 20,000/1.5 = ~13,333 kresko asset tokens
                await expect(
                    hre.Diamond.connect(users.userOne).depositCollateral(
                        users.userOne.address,
                        this.collateral.address,
                        toBig(10000),
                    ),
                ).not.to.be.reverted;

                const krAsset = await hre.Diamond.kreskoAsset(this.krAsset.address);
                const overSupplyLimit = fromBig(krAsset.supplyLimit) + 1;
                await expect(
                    hre.Diamond.connect(users.userOne).mintKreskoAsset(
                        users.userOne.address,
                        this.krAsset.address,
                        toBig(overSupplyLimit),
                    ),
                ).to.be.revertedWith(Error.KRASSET_MAX_SUPPLY_REACHED);
            });
        });

        describe("#burnKreskoAsset", function () {
            beforeEach(async function () {
                // Create userOne debt position
                this.mintAmount = toBig(2);
                await hre.Diamond.connect(users.userOne).mintKreskoAsset(
                    users.userOne.address,
                    this.krAsset.address,
                    this.mintAmount,
                );

                // Load userThree with Kresko Assets
                await this.collateral.mocks.contract.setVariable("_balances", {
                    [users.userThree.address]: this.initialBalance,
                });
                await this.collateral.mocks.contract.setVariable("_allowances", {
                    [users.userThree.address]: {
                        [hre.Diamond.address]: this.initialBalance,
                    },
                });
                expect(await this.collateral.contract.balanceOf(users.userThree.address)).to.equal(this.initialBalance);

                await expect(
                    hre.Diamond.connect(users.userThree).depositCollateral(
                        users.userThree.address,
                        this.collateral.address,
                        toBig(10000),
                    ),
                ).not.to.be.reverted;

                await hre.Diamond.connect(users.userThree).mintKreskoAsset(
                    users.userThree.address,
                    this.krAsset.address,
                    this.mintAmount,
                );
            });

            it("should allow users to burn some of their Kresko asset balances", async function () {
                const kreskoAssetTotalSupplyBefore = await this.krAsset.contract.totalSupply();

                // Burn Kresko asset
                const burnAmount = toBig(1);
                const kreskoAssetIndex = 0;
                await hre.Diamond.connect(users.userOne).burnKreskoAsset(
                    users.userOne.address,
                    this.krAsset.address,
                    burnAmount,
                    kreskoAssetIndex,
                );

                // Confirm the user no long holds the burned Kresko asset amount
                const userBalance = await this.krAsset.contract.balanceOf(users.userOne.address);
                expect(userBalance).to.equal(this.mintAmount.sub(burnAmount));

                // Confirm that the Kresko asset's total supply decreased as expected
                const kreskoAssetTotalSupplyAfter = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(burnAmount));

                // Confirm the array of the user's minted Kresko assets still contains the asset's address
                const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([this.krAsset.address]);

                // Confirm the user's minted kresko asset amount has been updated
                const userDebt = await hre.Diamond.kreskoAssetDebt(users.userOne.address, this.krAsset.address);
                expect(userDebt).to.equal(this.mintAmount.sub(burnAmount));
            });

            it("should allow users to burn their full balance of a Kresko asset", async function () {
                const kreskoAssetTotalSupplyBefore = await this.krAsset.contract.totalSupply();

                // Burn Kresko asset
                const kreskoAssetIndex = 0;
                await hre.Diamond.connect(users.userOne).burnKreskoAsset(
                    users.userOne.address,
                    this.krAsset.address,
                    this.mintAmount,
                    kreskoAssetIndex,
                );

                // Confirm the user no long holds the burned Kresko asset amount
                const userBalance = await this.krAsset.contract.balanceOf(users.userOne.address);
                expect(userBalance).to.equal(0);
                // Confirm that the Kresko asset's total supply decreased as expected
                const kreskoAssetTotalSupplyAfter = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(this.mintAmount));
                // Confirm the array of the user's minted Kresko assets no longer contains the asset's address
                const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([]);
                // Confirm the user's minted kresko asset amount has been updated
                const userDebt = await hre.Diamond.kreskoAssetDebt(
                    users.userOne.address,
                    this.krAsset.contract.address,
                );
                expect(userDebt).to.equal(0);
            });

            it("should allow trusted address to burn its own Kresko asset balances on behalf of another user", async function () {
                // Grant userThree the MANAGER role
                await hre.Diamond.connect(users.deployer).grantRole(Role.MANAGER, users.userThree.address);
                expect(await hre.Diamond.hasRole(Role.MANAGER, users.userThree.address)).to.equal(true);

                const kreskoAssetTotalSupplyBefore = await this.krAsset.contract.totalSupply();

                // Burn Kresko asset
                const burnAmount = toBig(1);
                const kreskoAssetIndex = 0;

                // User three burns it's KreskoAsset to reduce userOnes debt
                await expect(
                    hre.Diamond.connect(users.userThree).burnKreskoAsset(
                        users.userOne.address,
                        this.krAsset.address,
                        burnAmount,
                        kreskoAssetIndex,
                    ),
                ).to.not.be.reverted;

                // Confirm the userOne had no effect on it's kreskoAsset balance
                const userOneBalance = await this.krAsset.contract.balanceOf(users.userOne.address);
                expect(userOneBalance).to.equal(this.mintAmount);

                // Confirm the userThree no long holds the burned Kresko asset amount
                const userThreeBalance = await this.krAsset.contract.balanceOf(users.userThree.address);
                expect(userThreeBalance).to.equal(this.mintAmount.sub(burnAmount));
                // Confirm that the Kresko asset's total supply decreased as expected
                const kreskoAssetTotalSupplyAfter = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(burnAmount));
                // Confirm the array of the user's minted Kresko assets still contains the asset's address
                const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([this.krAsset.address]);
                // Confirm the user's minted kresko asset amount has been updated
                const userOneDebt = await hre.Diamond.kreskoAssetDebt(users.userOne.address, this.krAsset.address);
                expect(userOneDebt).to.equal(this.mintAmount.sub(burnAmount));
            });

            it("should allow trusted address to burn the full balance of its Kresko asset on behalf another user", async function () {
                // Grant userThree the MANAGER role
                await hre.Diamond.connect(users.deployer).grantRole(Role.MANAGER, users.userThree.address);
                expect(await hre.Diamond.hasRole(Role.MANAGER, users.userThree.address)).to.equal(true);

                const kreskoAssetTotalSupplyBefore = await this.krAsset.contract.totalSupply();

                // User three burns the whole mintAmount of Kresko asset to repay userOne's debt
                const kreskoAssetIndex = 0;
                await hre.Diamond.connect(users.userThree).burnKreskoAsset(
                    users.userOne.address,
                    this.krAsset.address,
                    this.mintAmount,
                    kreskoAssetIndex,
                );

                // Confirm the userOne holds the initial minted amount of Kresko assets
                const userOneBalance = await this.krAsset.contract.balanceOf(users.userOne.address);
                expect(userOneBalance).to.equal(this.mintAmount);
                const userThreeBalance = await this.krAsset.contract.balanceOf(users.userThree.address);
                expect(userThreeBalance).to.equal(0);
                // Confirm that the Kresko asset's total supply decreased as expected
                const kreskoAssetTotalSupplyAfter = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).to.equal(kreskoAssetTotalSupplyBefore.sub(this.mintAmount));
                // Confirm the array of the user's minted Kresko assets no longer contains the asset's address
                const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([]);
                // Confirm the user's minted kresko asset amount has been updated
                const userOneDebt = await hre.Diamond.kreskoAssetDebt(
                    users.userOne.address,
                    this.krAsset.contract.address,
                );
                expect(userOneDebt).to.equal(0);
            });

            it("should burn up to the minimum debt position amount if the requested burn would result in a position under the minimum debt value", async function () {
                const userBalanceBefore = await this.krAsset.contract.balanceOf(users.userOne.address);
                const kreskoAssetTotalSupplyBefore = await this.krAsset.contract.totalSupply();

                // Calculate actual burn amount
                const userOneDebt = await hre.Diamond.kreskoAssetDebt(users.userOne.address, this.krAsset.address);

                const minDebtValue = fromBig(await hre.Diamond.minimumDebtValue(), 8);

                const oraclePrice = this.krAsset.deployArgs.price;
                const burnAmount = hre.toBig(fromBig(userOneDebt) - minDebtValue / oraclePrice);

                // Burn Kresko asset
                const kreskoAssetIndex = 0;
                await hre.Diamond.connect(users.userOne).burnKreskoAsset(
                    users.userOne.address,
                    this.krAsset.address,
                    burnAmount,
                    kreskoAssetIndex,
                );

                // Confirm the user holds the expected Kresko asset amount
                const userBalance = await this.krAsset.contract.balanceOf(users.userOne.address);

                // expect(fromBig(userBalance)).to.equal(fromBig(userBalanceBefore.sub(burnAmount)));
                expect(userBalance).eq(userBalanceBefore.sub(burnAmount));

                // Confirm that the Kresko asset's total supply decreased as expected
                const kreskoAssetTotalSupplyAfter = await this.krAsset.contract.totalSupply();
                expect(kreskoAssetTotalSupplyAfter).eq(kreskoAssetTotalSupplyBefore.sub(burnAmount));

                // Confirm the array of the user's minted Kresko assets still contains the asset's address
                const mintedKreskoAssetsAfter = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                expect(mintedKreskoAssetsAfter).to.deep.equal([this.krAsset.address]);

                // Confirm the user's minted kresko asset amount has been updated
                const newUserDebt = await hre.Diamond.kreskoAssetDebt(users.userOne.address, this.krAsset.address);
                expect(newUserDebt).eq(userOneDebt.sub(burnAmount));
            });

            it("should emit KreskoAssetBurned event", async function () {
                const kreskoAssetIndex = 0;
                const tx = await hre.Diamond.connect(users.userOne).burnKreskoAsset(
                    users.userOne.address,
                    this.krAsset.address,
                    this.mintAmount,
                    kreskoAssetIndex,
                );

                const event = await extractInternalIndexedEventFromTxReceipt<KreskoAssetBurnedEvent["args"]>(
                    tx,
                    MinterEvent__factory.connect(hre.Diamond.address, users.userOne),
                    "KreskoAssetBurned",
                );
                expect(event.account).to.equal(users.userOne.address);
                expect(event.kreskoAsset).to.equal(this.krAsset.address);
                expect(event.amount).to.equal(this.mintAmount);
            });

            it("should allow users to burn Kresko assets without giving token approval to Kresko.sol contract", async function () {
                const secondMintAmount = 1;
                const burnAmount = this.mintAmount.add(secondMintAmount);

                await hre.Diamond.connect(users.userOne).mintKreskoAsset(
                    users.userOne.address,
                    this.krAsset.address,
                    secondMintAmount,
                );

                const kreskoAssetIndex = 0;

                await expect(
                    hre.Diamond.connect(users.userOne).burnKreskoAsset(
                        users.userOne.address,
                        this.krAsset.address,
                        burnAmount,
                        kreskoAssetIndex,
                    ),
                ).to.be.not.reverted;
            });

            it("should not allow users to burn an amount of 0", async function () {
                const kreskoAssetIndex = 0;

                await expect(
                    hre.Diamond.connect(users.userOne).burnKreskoAsset(
                        users.userOne.address,
                        this.krAsset.address,
                        0,
                        kreskoAssetIndex,
                    ),
                ).to.be.revertedWith(Error.ZERO_BURN);
            });

            it("should not allow untrusted address to burn any kresko assets on behalf of another user", async function () {
                const kreskoAssetIndex = 0;

                await expect(
                    hre.Diamond.connect(users.userThree).burnKreskoAsset(
                        users.userOne.address,
                        this.krAsset.address,
                        100,
                        kreskoAssetIndex,
                    ),
                ).to.be.revertedWith(
                    `AccessControl: account ${users.userThree.address.toLowerCase()} is missing role 0x46925e0f0cc76e485772167edccb8dc449d43b23b55fc4e756b063f49099e6a0`,
                );
            });

            it("should not allow users to burn more kresko assets than they hold as debt", async function () {
                const kreskoAssetIndex = 0;
                const burnAmount = this.mintAmount.add(1);

                await expect(
                    hre.Diamond.connect(users.userOne).burnKreskoAsset(
                        users.userOne.address,
                        this.krAsset.address,
                        burnAmount,
                        kreskoAssetIndex,
                    ),
                ).to.be.reverted;
            });

            describe("Protocol open fee", async function () {
                it("should charge the protocol open fee with a single collateral asset if the deposit amount is sufficient and emit CloseFeePaid event", async function () {
                    this.krAsset = this.krAssets[0];

                    const mintAmount = toBig(1);
                    const mintValue = mintAmount.mul(this.krAsset.deployArgs.price);
                    const openFee = toBig(await this.krAsset.deployArgs.openFee); // use toBig() to emulate closeFee's 18 decimals on contract
                    const expectedFeeValue = mintValue.mul(openFee);
                    const expectedCollateralFeeAmount = expectedFeeValue.div(this.collateral.deployArgs.price);

                     // Get the balances prior to the fee being charged.
                     const kreskoCollateralAssetBalanceBefore = await this.collateral.contract.balanceOf(
                        hre.Diamond.address,
                    );
                    const feeRecipientCollateralBalanceBefore =
                        await this.collateral.contract.balanceOf(await hre.Diamond.feeRecipient());

                    // Mint Kresko asset
                    const tx = await hre.Diamond.connect(users.userOne).mintKreskoAsset(
                        users.userOne.address,
                        this.krAsset.address,
                        mintAmount,
                    );

                    // Get the balances after the fees have been charged.
                    const kreskoCollateralAssetBalanceAfter = await this.collateral.contract.balanceOf(
                        hre.Diamond.address,
                    );
                    const feeRecipientCollateralBalanceAfter =
                        await this.collateral.contract.balanceOf(await hre.Diamond.feeRecipient());

                    // Ensure the amount gained / lost by the kresko contract and the fee recipient are as expected
                    const feeRecipientBalanceIncrease = feeRecipientCollateralBalanceAfter.sub(
                        feeRecipientCollateralBalanceBefore,
                    );
                    expect(kreskoCollateralAssetBalanceBefore.sub(kreskoCollateralAssetBalanceAfter)).to.equal(
                        feeRecipientBalanceIncrease,
                    );

                    // Normalize expected amount because protocol closeFee has 10**18 decimals
                    const normalizedExpectedCollateralFeeAmount = fromBig(expectedCollateralFeeAmount)/10**18;
                    expect(feeRecipientBalanceIncrease).to.equal(toBig(normalizedExpectedCollateralFeeAmount));

                    // Ensure the emitted event is as expected.
                    const event = await extractInternalIndexedEventFromTxReceipt<OpenFeePaidEventObject>(
                        tx,
                        MinterEvent__factory.connect(hre.Diamond.address, users.userOne),
                        "OpenFeePaid",
                    );
                    expect(event.account).to.equal(users.userOne.address);
                    expect(event.paymentCollateralAsset).to.equal(this.collateral.address);
                    expect(event.paymentAmount).to.equal(toBig(normalizedExpectedCollateralFeeAmount));
                    const expectedFeeValueNormalizedA = expectedFeeValue.div(10**10); // Normalize krAsset price's 10**10 decimals on contract
                    const expectedFeeValueNormalizedB = fromBig(expectedFeeValueNormalizedA); // Normalize closeFee's 10**18 decimals on contract
                    expect(event.paymentValue).to.equal(expectedFeeValueNormalizedB);

                    // Now verify that calcExpectedFee function returns accurate fee amount
                    const feeRes = await hre.Diamond.calcExpectedFee(
                        users.userOne.address,
                        this.krAsset.address,
                        mintAmount,
                        Fee.OPEN
                    );
                    const output: string[] = feeRes.toString().split(",");
                    const openFeeAmount = Number(output[1]) / 10**18;
                    expect(openFeeAmount).eq(normalizedExpectedCollateralFeeAmount);
                });
            });

            describe("Protocol close fee", async function () {
                it("should charge the protocol close fee with a single collateral asset if the deposit amount is sufficient and emit CloseFeePaid event", async function () {
                    const burnAmount = toBig(1);
                    const burnValue = burnAmount.mul(this.krAsset.deployArgs.price);
                    const closeFee = toBig(await this.krAsset.deployArgs.closeFee); // use toBig() to emulate closeFee's 18 decimals on contract
                    const expectedFeeValue = burnValue.mul(closeFee);
                    const expectedCollateralFeeAmount = expectedFeeValue.div(this.collateral.deployArgs.price);

                    // Get the balances prior to the fee being charged.
                    const kreskoCollateralAssetBalanceBefore = await this.collateral.contract.balanceOf(
                        hre.Diamond.address,
                    );
                    const feeRecipientCollateralBalanceBefore = await this.collateral.contract.balanceOf(
                        await hre.Diamond.feeRecipient(),
                    );

                    // Burn Kresko asset
                    const kreskoAssetIndex = 0;
                    const tx = await hre.Diamond.connect(users.userOne).burnKreskoAsset(
                        users.userOne.address,
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
                    const event = await extractInternalIndexedEventFromTxReceipt<CloseFeePaidEventObject>(
                        tx,
                        MinterEvent__factory.connect(hre.Diamond.address, users.userOne),
                        "CloseFeePaid",
                    );
                    expect(event.account).to.equal(users.userOne.address);
                    expect(event.paymentCollateralAsset).to.equal(this.collateral.address);
                    expect(event.paymentAmount).to.equal(toBig(normalizedExpectedCollateralFeeAmount));
                    const expectedFeeValueNormalizedA = expectedFeeValue.div(10 ** 10); // Normalize krAsset price's 10**10 decimals on contract
                    const expectedFeeValueNormalizedB = fromBig(expectedFeeValueNormalizedA); // Normalize closeFee's 10**18 decimals on contract
                    expect(event.paymentValue).to.equal(expectedFeeValueNormalizedB);

                    // Now verify that calcExpectedFee function returns accurate fee amount
                    const feeRes = await hre.Diamond.calcExpectedFee(
                        users.userOne.address,
                        this.krAsset.address,
                        burnAmount,
                        Fee.CLOSE
                    );
                    const output: string[] = feeRes.toString().split(",");
                    const closeFeeAmount = Number(output[1]) / 10**18;
                    expect(closeFeeAmount).eq(normalizedExpectedCollateralFeeAmount);
                });
            });
        });
    });
});
