import { addMockKreskoAsset, Role, withFixture } from "@test-utils";
import { fromBig, toBig } from "@utils/numbers";
import { Error } from "@utils/test/errors";
import { expect } from "chai";
import hre, { users } from "hardhat";

describe("Minter", function () {
    withFixture("minter-with-mocks");
    beforeEach(async function () {
        // Add mock collateral to protocol

        this.collateral = this.collaterals[0];
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

        this.krAsset = this.krAssets[0];
    });

    describe("#krAsset", () => {
        describe("#mint", () => {
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
                const userBalance = await this.krAsset.contract.balanceOf(users.userOne.address);
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
                const firstMintAmount = toBig(0.5);
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
                const secondMintAmount = toBig(0.4);
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
                    price: 5, // $5
                    factor: 1,
                    supplyLimit: 100000,
                };
                const { contract: secondKreskoAsset } = await addMockKreskoAsset(secondKrAssetArgs);

                // Mint Kresko asset
                const secondMintAmount = toBig(1);
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
                expect(fromBig(mintAmountUSDValue)).to.equal(Number(currMinimumDebtValue) / 10 ** 8);

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

            // it("should emit KreskoAssetMinted event", async function () {
            //     const mintAmount = toFixedPoint(500);
            //     const receipt = await hre.Diamond.connect(users.userOne).mintKreskoAsset(
            //         users.userOne.address,
            //         this.krAsset.address,
            //         mintAmount,
            //     );

            //     const { args } = await extractEventFromTxReceipt(receipt, "KreskoAssetMinted");
            //     expect(args.account).to.equal(users.userOne.address);
            //     expect(args.kreskoAsset).to.equal(this.krAsset.address);
            //     expect(args.amount).to.equal(mintAmount);
            // });

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
            // TODO:
        });
    });
});
