import {
    defaultCloseFee,
    defaultCollateralArgs,
    defaultKrAssetArgs,
    defaultOraclePrice,
    Fee,
    leverageKrAsset,
    Role,
    withFixture,
} from "@test-utils";
import { extractInternalIndexedEventFromTxReceipt } from "@utils";
import { fromBig, toBig } from "@utils/numbers";
import { Error } from "@utils/test/errors";
import { depositCollateral, withdrawCollateral } from "@utils/test/helpers/collaterals";
import { addMockKreskoAsset, burnKrAsset, mintKrAsset } from "@utils/test/helpers/krassets";
import { expect } from "chai";
import hre from "hardhat";
import { MinterEvent__factory } from "types";
import {
    CloseFeePaidEventObject,
    KreskoAssetBurnedEvent,
    KreskoAssetMintedEventObject,
    OpenFeePaidEventObject,
} from "types/typechain/src/contracts/libs/Events.sol/MinterEvent";

describe("Minter", function () {
    let users: Users;
    before(async function () {
        users = await hre.getUsers();
    });

    withFixture(["minter-test", "integration"]);
    beforeEach(async function () {
        this.collateral = this.collaterals.find(c => c.deployArgs.name === defaultCollateralArgs.name);
        this.krAsset = this.krAssets.find(c => c.deployArgs.name === defaultKrAssetArgs.name);

        await this.krAsset.contract.grantRole(Role.OPERATOR, users.deployer.address);
        this.krAsset.setPrice(defaultOraclePrice);
        2;

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
        this.krAsset.setPrice(this.krAsset.deployArgs.price);
        this.collateral.setPrice(this.collateral.deployArgs.price);

        // User deposits 10,000 collateral
        await depositCollateral({ amount: 10_000, user: users.userOne, asset: this.collateral });
    });

    describe("#mint+burn", function () {
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
                    openFee: 0,
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

        describe("#burn", function () {
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
        });

        describe("#mint - rebase events", function () {
            const mintAmountInt = 40;
            const mintAmount = hre.toBig(mintAmountInt);
            describe("debt amounts are calculated correctly", function () {
                it("when minted before positive rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);
                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    // Mint before rebase
                    await userOne.mintKreskoAsset(users.userOne.address, this.krAsset.address, mintAmount);

                    const balanceBefore = await this.krAsset.contract.balanceOf(users.userOne.address);

                    // Rebase the asset according to params
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    // Ensure that the minted balance is adjusted by the rebase
                    const balanceAfter = await this.krAsset.contract.balanceOf(users.userOne.address);
                    expect(balanceAfter).to.bignumber.equal(mintAmount.mul(denominator));
                    expect(balanceBefore).to.not.bignumber.equal(balanceAfter);

                    // Ensure that debt amount is also adjsuted by the rebase
                    const debtAmount = await userOne.kreskoAssetDebt(users.userOne.address, this.krAsset.address);
                    expect(balanceAfter).to.bignumber.equal(debtAmount);
                });

                it("when minted before negative rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);
                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    // Mint before rebase
                    await userOne.mintKreskoAsset(users.userOne.address, this.krAsset.address, mintAmount);

                    const balanceBefore = await this.krAsset.contract.balanceOf(users.userOne.address);

                    // Rebase the asset according to params
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    // Ensure that the minted balance is adjusted by the rebase
                    const balanceAfter = await this.krAsset.contract.balanceOf(users.userOne.address);
                    expect(balanceAfter).to.bignumber.equal(mintAmount.div(denominator));
                    expect(balanceBefore).to.not.bignumber.equal(balanceAfter);

                    // Ensure that debt amount is also adjsuted by the rebase
                    const debtAmount = await userOne.kreskoAssetDebt(users.userOne.address, this.krAsset.address);
                    expect(balanceAfter).to.bignumber.equal(debtAmount);
                });

                it("when minted after positive rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    // Mint before rebase
                    await userOne.mintKreskoAsset(users.userOne.address, this.krAsset.address, mintAmount);

                    const balanceBefore = await this.krAsset.contract.balanceOf(users.userOne.address);

                    // Rebase the asset according to params
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    // Ensure that the minted balance is adjusted by the rebase
                    const balanceAfter = await this.krAsset.contract.balanceOf(users.userOne.address);
                    expect(balanceAfter).to.bignumber.equal(mintAmount.mul(denominator));
                    expect(balanceBefore).to.not.bignumber.equal(balanceAfter);

                    // Ensure that debt amount is also adjusted by the rebase
                    const debtAmount = await userOne.kreskoAssetDebt(users.userOne.address, this.krAsset.address);
                    expect(balanceAfter).to.bignumber.equal(debtAmount);
                });

                it("when minted after negative rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    // Mint before rebase
                    await userOne.mintKreskoAsset(users.userOne.address, this.krAsset.address, mintAmount);

                    const balanceBefore = await this.krAsset.contract.balanceOf(users.userOne.address);

                    // Rebase the asset according to params
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    // Ensure that the minted balance is adjusted by the rebase
                    const balanceAfter = await this.krAsset.contract.balanceOf(users.userOne.address);
                    expect(balanceAfter).to.bignumber.equal(mintAmount.div(denominator));
                    expect(balanceBefore).to.not.bignumber.equal(balanceAfter);

                    // Ensure that debt amount is also adjusted by the rebase
                    const debtAmount = await userOne.kreskoAssetDebt(users.userOne.address, this.krAsset.address);
                    expect(balanceAfter).to.bignumber.equal(debtAmount);
                });
            });

            describe("debt values are calculated correctly", function () {
                it("when mint is made before positive rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);
                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    // Mint before rebase
                    await userOne.mintKreskoAsset(users.userOne.address, this.krAsset.address, mintAmount);
                    const valueBeforeRebase = await userOne.getAccountKrAssetValue(users.userOne.address);

                    // Adjust price accordingly
                    const assetPrice = await this.krAsset.getPrice();
                    this.krAsset.setPrice(hre.fromBig(assetPrice.div(denominator), 8));

                    // Rebase the asset according to params
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    // Ensure that the value inside protocol matches the value before rebase
                    const valueAfterRebase = await userOne.getAccountKrAssetValue(users.userOne.address);
                    expect(valueAfterRebase.rawValue).to.bignumber.equal(valueBeforeRebase.rawValue);
                });

                it("when mint is made before negative rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);
                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    // Mint before rebase
                    await userOne.mintKreskoAsset(users.userOne.address, this.krAsset.address, mintAmount);
                    const valueBeforeRebase = await userOne.getAccountKrAssetValue(users.userOne.address);

                    // Adjust price accordingly
                    const assetPrice = await this.krAsset.getPrice();
                    this.krAsset.setPrice(hre.fromBig(assetPrice.mul(denominator), 8));

                    // Rebase the asset according to params
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    // Ensure that the value inside protocol matches the value before rebase
                    const valueAfterRebase = await userOne.getAccountKrAssetValue(users.userOne.address);
                    expect(valueAfterRebase.rawValue).to.bignumber.equal(valueBeforeRebase.rawValue);
                });
                it("when minted after positive rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);

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
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    await userOne.mintKreskoAsset(users.userOne.address, this.krAsset.address, equalMintAmount);

                    // Ensure that value after mint matches what is expected
                    const valueAfterRebase = await userOne.getAccountKrAssetValue(users.userOne.address);
                    expect(valueAfterRebase.rawValue).to.bignumber.equal(valueBeforeRebase.rawValue);
                });

                it("when minted after negative rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);

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
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    await userOne.mintKreskoAsset(users.userOne.address, this.krAsset.address, equalMintAmount);

                    // Ensure that value after mint matches what is expected
                    const valueAfterRebase = await userOne.getAccountKrAssetValue(users.userOne.address);
                    expect(valueAfterRebase.rawValue).to.bignumber.equal(valueBeforeRebase.rawValue);
                });
            });

            describe("debt values and amounts are calculated correctly", function () {
                it("when minted before and after a positive rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);
                    const assetPrice = await this.krAsset.getPrice();

                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    const mintAmountAfterRebase = mintAmount.mul(denominator);
                    const assetPriceRebase = assetPrice.div(denominator);

                    // Get value of the future mint
                    const valueBeforeRebase = await userOne.getKrAssetValue(this.krAsset.address, mintAmount, false);

                    // Mint before rebase
                    await userOne.mintKreskoAsset(users.userOne.address, this.krAsset.address, mintAmount);

                    // Get results
                    const balanceAfterFirstMint = await this.krAsset.contract.balanceOf(users.userOne.address);
                    const debtAmountAfterFirstMint = await userOne.kreskoAssetDebt(
                        users.userOne.address,
                        this.krAsset.address,
                    );
                    const debtValueAfterFirstMint = await userOne.getAccountKrAssetValue(users.userOne.address);

                    // Assert
                    expect(balanceAfterFirstMint).to.bignumber.equal(debtAmountAfterFirstMint);
                    expect(valueBeforeRebase.rawValue).to.bignumber.equal(debtValueAfterFirstMint.rawValue);

                    // Adjust price and rebase
                    this.krAsset.setPrice(hre.fromBig(assetPriceRebase, 8));
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    // Ensure debt amounts and balances match
                    const balanceAfterFirstRebase = await this.krAsset.contract.balanceOf(users.userOne.address);
                    const debtAmountAfterFirstRebase = await userOne.kreskoAssetDebt(
                        users.userOne.address,
                        this.krAsset.address,
                    );
                    expect(balanceAfterFirstRebase).to.bignumber.equal(mintAmountAfterRebase);
                    expect(balanceAfterFirstRebase).to.bignumber.equal(debtAmountAfterFirstRebase);

                    // Ensure debt usd values match
                    const debtValueAfterFirstRebase = await userOne.getAccountKrAssetValue(users.userOne.address);
                    expect(debtValueAfterFirstRebase.rawValue).to.bignumber.equal(debtValueAfterFirstMint.rawValue);
                    expect(debtValueAfterFirstRebase.rawValue).to.bignumber.equal(valueBeforeRebase.rawValue);

                    // Mint after rebase
                    await userOne.mintKreskoAsset(users.userOne.address, this.krAsset.address, mintAmountAfterRebase);

                    // Ensure debt amounts and balances match
                    const balanceAfterSecondMint = await this.krAsset.contract.balanceOf(users.userOne.address);
                    const debtAmountAfterSecondMint = await userOne.kreskoAssetDebt(
                        users.userOne.address,
                        this.krAsset.address,
                    );
                    expect(balanceAfterSecondMint).to.bignumber.equal(debtAmountAfterSecondMint);

                    // Ensure debt usd values match
                    const debtValueAfterSecondMint = await userOne.getAccountKrAssetValue(users.userOne.address);
                    expect(debtValueAfterSecondMint.rawValue).to.bignumber.equal(
                        debtValueAfterFirstMint.rawValue.mul(2),
                    );
                    expect(debtValueAfterSecondMint.rawValue).to.bignumber.equal(valueBeforeRebase.rawValue.mul(2));
                });

                it("when minted before and after a negative rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);
                    const assetPrice = await this.krAsset.getPrice();

                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    const mintAmountAfterRebase = mintAmount.div(denominator);
                    const assetPriceRebase = assetPrice.mul(denominator);

                    // Get value of the future mint
                    const valueBeforeRebase = await userOne.getKrAssetValue(this.krAsset.address, mintAmount, false);

                    // Mint before rebase
                    await userOne.mintKreskoAsset(users.userOne.address, this.krAsset.address, mintAmount);

                    // Get results
                    const balanceAfterFirstMint = await this.krAsset.contract.balanceOf(users.userOne.address);
                    const debtAmountAfterFirstMint = await userOne.kreskoAssetDebt(
                        users.userOne.address,
                        this.krAsset.address,
                    );
                    const debtValueAfterFirstMint = await userOne.getAccountKrAssetValue(users.userOne.address);

                    // Assert
                    expect(balanceAfterFirstMint).to.bignumber.equal(debtAmountAfterFirstMint);
                    expect(valueBeforeRebase.rawValue).to.bignumber.equal(debtValueAfterFirstMint.rawValue);

                    // Adjust price and rebase
                    this.krAsset.setPrice(hre.fromBig(assetPriceRebase, 8));
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    // Ensure debt amounts and balances match
                    const balanceAfterFirstRebase = await this.krAsset.contract.balanceOf(users.userOne.address);
                    const debtAmountAfterFirstRebase = await userOne.kreskoAssetDebt(
                        users.userOne.address,
                        this.krAsset.address,
                    );
                    expect(balanceAfterFirstRebase).to.bignumber.equal(mintAmountAfterRebase);
                    expect(balanceAfterFirstRebase).to.bignumber.equal(debtAmountAfterFirstRebase);

                    // Ensure debt usd values match
                    const debtValueAfterFirstRebase = await userOne.getAccountKrAssetValue(users.userOne.address);
                    expect(debtValueAfterFirstRebase.rawValue).to.bignumber.equal(debtValueAfterFirstMint.rawValue);
                    expect(debtValueAfterFirstRebase.rawValue).to.bignumber.equal(valueBeforeRebase.rawValue);

                    // Mint after rebase
                    await userOne.mintKreskoAsset(users.userOne.address, this.krAsset.address, mintAmountAfterRebase);

                    // Ensure debt amounts and balances match
                    const balanceAfterSecondMint = await this.krAsset.contract.balanceOf(users.userOne.address);
                    const debtAmountAfterSecondMint = await userOne.kreskoAssetDebt(
                        users.userOne.address,
                        this.krAsset.address,
                    );
                    expect(balanceAfterSecondMint).to.bignumber.equal(debtAmountAfterSecondMint);

                    // Ensure debt usd values match
                    const debtValueAfterSecondMint = await userOne.getAccountKrAssetValue(users.userOne.address);
                    expect(debtValueAfterSecondMint.rawValue).to.bignumber.equal(
                        debtValueAfterFirstMint.rawValue.mul(2),
                    );
                    expect(debtValueAfterSecondMint.rawValue).to.bignumber.equal(valueBeforeRebase.rawValue.mul(2));
                });
            });
        });

        describe("#burn", function () {
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
                    const openFee = 0.01;
                    const openFeeBig = toBig(openFee); // use toBig() to emulate closeFee's 18 decimals on contract
                    this.krAsset = this.krAssets[0];

                    await this.krAsset.update({
                        ...defaultKrAssetArgs,
                        openFee,
                    });
                    const mintAmount = toBig(1);
                    const mintValue = mintAmount.mul(this.krAsset.deployArgs.price);

                    const expectedFeeValue = mintValue.mul(openFeeBig);
                    const expectedCollateralFeeAmount = expectedFeeValue.div(this.collateral.deployArgs.price);

                    // Get the balances prior to the fee being charged.
                    const kreskoCollateralAssetBalanceBefore = await this.collateral.contract.balanceOf(
                        hre.Diamond.address,
                    );
                    const feeRecipientCollateralBalanceBefore = await this.collateral.contract.balanceOf(
                        await hre.Diamond.feeRecipient(),
                    );

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
                    const event = await extractInternalIndexedEventFromTxReceipt<OpenFeePaidEventObject>(
                        tx,
                        MinterEvent__factory.connect(hre.Diamond.address, users.userOne),
                        "OpenFeePaid",
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
                        mintAmount,
                        Fee.OPEN,
                    );
                    const output: string[] = feeRes.toString().split(",");
                    const openFeeAmount = Number(output[1]) / 10 ** 18;
                    expect(openFeeAmount).eq(normalizedExpectedCollateralFeeAmount);
                });
            });
            describe("Protocol close fee", async function () {
                it("should charge the protocol close fee with a single collateral asset if the deposit amount is sufficient and emit CloseFeePaid event", async function () {
                    const burnAmount = toBig(1);
                    const burnValue = burnAmount.mul(this.krAsset.deployArgs.price);
                    const closeFee = toBig(this.krAsset.deployArgs.closeFee); // use toBig() to emulate closeFee's 18 decimals on contract
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
                });
                it("should charge correct protocol close fee after a positive rebase", async function () {
                    const burnAmount = 10;
                    const expectedFeeAmount = hre.toBig(burnAmount * this.krAsset.deployArgs.closeFee);
                    const expectedFeeValue = hre.toBig(
                        burnAmount * this.krAsset.deployArgs.price * this.krAsset.deployArgs.closeFee,
                        8,
                    );

                    await leverageKrAsset(users.userThree, this.krAsset, this.collateral, hre.toBig(burnAmount));
                    await withdrawCollateral({ user: users.userThree, asset: this.krAsset, amount: burnAmount });

                    const event = await extractInternalIndexedEventFromTxReceipt<CloseFeePaidEventObject>(
                        await burnKrAsset({ user: users.userThree, asset: this.krAsset, amount: burnAmount }),
                        MinterEvent__factory.connect(hre.Diamond.address, users.userThree),
                        "CloseFeePaid",
                    );

                    expect(event.paymentAmount).to.equal(expectedFeeAmount);
                    expect(event.paymentValue).to.equal(expectedFeeValue);

                    // rebase params
                    const denominator = 4;
                    const positive = true;
                    const priceAfter = hre.fromBig(await this.krAsset.getPrice(), 8) / denominator;
                    const burnAmountRebase = burnAmount * denominator;

                    await leverageKrAsset(users.userFour, this.krAsset, this.collateral, hre.toBig(burnAmount));
                    this.krAsset.setPrice(priceAfter);
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    await withdrawCollateral({ user: users.userFour, asset: this.krAsset, amount: burnAmountRebase });
                    const eventAfterRebase = await extractInternalIndexedEventFromTxReceipt<CloseFeePaidEventObject>(
                        await burnKrAsset({ user: users.userFour, asset: this.krAsset, amount: burnAmountRebase }),
                        MinterEvent__factory.connect(hre.Diamond.address, users.userOne),
                        "CloseFeePaid",
                    );
                    expect(eventAfterRebase.paymentCollateralAsset).to.equal(event.paymentCollateralAsset);
                    expect(eventAfterRebase.paymentAmount).to.equal(expectedFeeAmount);
                    expect(eventAfterRebase.paymentValue).to.equal(expectedFeeValue);
                });
                it("should charge correct protocol close fee after a negative rebase", async function () {
                    const burnAmount = 10;
                    const expectedFeeAmount = hre.toBig(burnAmount * this.krAsset.deployArgs.closeFee);
                    const expectedFeeValue = hre.toBig(
                        burnAmount * this.krAsset.deployArgs.price * this.krAsset.deployArgs.closeFee,
                        8,
                    );

                    await leverageKrAsset(users.userThree, this.krAsset, this.collateral, hre.toBig(burnAmount));
                    await withdrawCollateral({ user: users.userThree, asset: this.krAsset, amount: burnAmount });

                    const event = await extractInternalIndexedEventFromTxReceipt<CloseFeePaidEventObject>(
                        await burnKrAsset({ user: users.userThree, asset: this.krAsset, amount: burnAmount }),
                        MinterEvent__factory.connect(hre.Diamond.address, users.userThree),
                        "CloseFeePaid",
                    );

                    expect(event.paymentAmount).to.equal(expectedFeeAmount);
                    expect(event.paymentValue).to.equal(expectedFeeValue);

                    // rebase params
                    const denominator = 4;
                    const positive = false;
                    const priceAfter = hre.fromBig(await this.krAsset.getPrice(), 8) * denominator;
                    const burnAmountRebase = burnAmount / denominator;

                    await leverageKrAsset(users.userFour, this.krAsset, this.collateral, hre.toBig(burnAmount));
                    this.krAsset.setPrice(priceAfter);
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    await withdrawCollateral({ user: users.userFour, asset: this.krAsset, amount: burnAmountRebase });
                    const eventAfterRebase = await extractInternalIndexedEventFromTxReceipt<CloseFeePaidEventObject>(
                        await burnKrAsset({ user: users.userFour, asset: this.krAsset, amount: burnAmountRebase }),
                        MinterEvent__factory.connect(hre.Diamond.address, users.userOne),
                        "CloseFeePaid",
                    );
                    expect(eventAfterRebase.paymentCollateralAsset).to.equal(event.paymentCollateralAsset);
                    expect(eventAfterRebase.paymentAmount).to.equal(expectedFeeAmount);
                    expect(eventAfterRebase.paymentValue).to.equal(expectedFeeValue);
                });
            });
        });

        describe("#burn - rebasing", function () {
            const mintAmountInt = 40;
            const mintAmount = hre.toBig(mintAmountInt);

            beforeEach(async function () {
                await mintKrAsset({ asset: this.krAsset, amount: mintAmountInt, user: users.userOne });
            });

            describe("debt amounts are calculated correctly", function () {
                it("when repaying all debt after a positive rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = true;
                    const mintAmountAfterRebase = mintAmount.mul(4);

                    const assetPrice = await this.krAsset.getPrice();
                    this.krAsset.setPrice(hre.fromBig(assetPrice.div(denominator), 8));

                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    const balanceAfterRebase = await this.krAsset.contract.balanceOf(users.userOne.address);
                    expect(balanceAfterRebase).to.bignumber.equal(mintAmountAfterRebase);

                    const debt = await userOne.kreskoAssetDebt(users.userOne.address, this.krAsset.address);

                    expect(debt).to.bignumber.equal(balanceAfterRebase);
                    // Burn assets
                    await userOne.burnKreskoAsset(
                        users.userOne.address,
                        this.krAsset.address,
                        mintAmountAfterRebase,
                        0,
                    );

                    // Should be all burned
                    const balanceAfterBurn = await this.krAsset.contract.balanceOf(users.userOne.address);
                    expect(balanceAfterBurn).to.bignumber.equal(0);

                    const wkrAssetBalanceKresko = await this.krAsset.anchor.balanceOf(hre.Diamond.address);

                    expect(wkrAssetBalanceKresko).to.equal(0);
                });

                it("when repaying partial debt after a positive rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    // Half of minted amount after rebasing
                    const halfOfOriginalMintAmount = mintAmount.div(2);
                    const halfOfRebasedMintAmount = mintAmount.mul(denominator / 2);

                    // Rebase with params
                    const assetPrice = await this.krAsset.getPrice();
                    this.krAsset.setPrice(hre.fromBig(assetPrice.div(denominator), 8));
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    const debtAfterRebase = await userOne.kreskoAssetDebt(users.userOne.address, this.krAsset.address);
                    expect(debtAfterRebase).to.bignumber.equal(mintAmount.mul(denominator));

                    // Burn assets
                    await userOne.burnKreskoAsset(
                        users.userOne.address,
                        this.krAsset.address,
                        halfOfRebasedMintAmount,
                        0,
                    );

                    // Ensure debt is adjusted correctly, should remove half of the debt
                    const debtAfterBurn = await userOne.kreskoAssetDebt(users.userOne.address, this.krAsset.address);
                    expect(debtAfterBurn).to.bignumber.equal(halfOfRebasedMintAmount);

                    // Should leave half in wallet
                    const balanceAfterBurn = await this.krAsset.contract.balanceOf(users.userOne.address);
                    expect(balanceAfterBurn).to.bignumber.equal(halfOfRebasedMintAmount);

                    // Should leave half of original amount in wkrAsset
                    const wkrAssetBalanceKresko = await this.krAsset.anchor.balanceOf(hre.Diamond.address);
                    expect(wkrAssetBalanceKresko).to.bignumber.equal(halfOfOriginalMintAmount);
                });

                it("when repaying all debt after a negative rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    const mintAmountAfterRebase = mintAmount.div(denominator);

                    const assetPrice = await this.krAsset.getPrice();
                    const assetPriceRebased = hre.fromBig(assetPrice.mul(denominator), 8);

                    // Adjust price and rebase
                    this.krAsset.setPrice(assetPriceRebased);
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    // Ensure balances match expected results
                    const balanceAfterRebase = await this.krAsset.contract.balanceOf(users.userOne.address);
                    expect(balanceAfterRebase).to.bignumber.equal(mintAmountAfterRebase);

                    // Ensure debt matches balance
                    const debtAfterRebase = await userOne.kreskoAssetDebt(users.userOne.address, this.krAsset.address);
                    expect(debtAfterRebase).to.bignumber.equal(balanceAfterRebase);

                    // Burn assets
                    await userOne.burnKreskoAsset(
                        users.userOne.address,
                        this.krAsset.address,
                        mintAmountAfterRebase,
                        0,
                    );

                    // Should be all burned
                    const balanceAfterBurn = await this.krAsset.contract.balanceOf(users.userOne.address);
                    expect(balanceAfterBurn).to.bignumber.equal(0);

                    // All wkrAssets should be burned
                    const wkrAssetBalanceKresko = await this.krAsset.anchor.balanceOf(hre.Diamond.address);
                    expect(wkrAssetBalanceKresko).to.equal(0);
                });

                it("when repaying partial debt after a negative rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    // Expected amounts
                    const halfOfOriginalMintAmount = mintAmount.div(2);
                    const rebasedMintAmount = mintAmount.div(denominator);
                    const halfOfRebasedMintAmount = rebasedMintAmount.div(2);

                    // Calculate price according to rebase params
                    const assetPrice = await this.krAsset.getPrice();
                    const assetPriceRebased = hre.fromBig(assetPrice.mul(denominator), 8);

                    // Rebase according to price and rebase params
                    this.krAsset.setPrice(assetPriceRebased);
                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    // Ensure debt matches expected amount
                    const debtAfterRebase = await userOne.kreskoAssetDebt(users.userOne.address, this.krAsset.address);
                    expect(debtAfterRebase).to.bignumber.equal(rebasedMintAmount);

                    // Burn assets
                    await userOne.burnKreskoAsset(
                        users.userOne.address,
                        this.krAsset.address,
                        halfOfRebasedMintAmount,
                        0,
                    );

                    // Ensure debt is adjusted correctly, should remove half of the debt
                    const debtAfterBurn = await userOne.kreskoAssetDebt(users.userOne.address, this.krAsset.address);
                    expect(debtAfterBurn).to.bignumber.equal(halfOfRebasedMintAmount);

                    // Should leave half in wallet
                    const balanceAfterBurn = await this.krAsset.contract.balanceOf(users.userOne.address);
                    expect(balanceAfterBurn).to.bignumber.equal(halfOfRebasedMintAmount);

                    // Should leave half of original amount in wkrAsset
                    const wkrAssetBalanceKresko = await this.krAsset.anchor.balanceOf(hre.Diamond.address);
                    expect(wkrAssetBalanceKresko).to.bignumber.equal(halfOfOriginalMintAmount);
                });
            });

            describe("debt value and mintedKreskoAssets book-keeping is calculated correctly", function () {
                it("when repaying all debt after a positive rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    const fullRepayAmount = mintAmount.mul(denominator);
                    // Expected value
                    const expectedValueAfterRebase = await hre.Diamond.getKrAssetValue(
                        this.krAsset.address,
                        mintAmount,
                        false,
                    );

                    // Adjust price according to rebase params
                    const assetPrice = await this.krAsset.getPrice();
                    this.krAsset.setPrice(hre.fromBig(assetPrice.div(denominator), 8));

                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    // Ensure expected value is correct
                    const debtValueAfterRebase = await hre.Diamond.getAccountKrAssetValue(users.userOne.address);
                    expect(debtValueAfterRebase.rawValue).to.bignumber.equal(expectedValueAfterRebase.rawValue);

                    // Should contain minted krAsset
                    const mintedKreskoAssetsBeforeBurn = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                    expect(mintedKreskoAssetsBeforeBurn).to.contain(this.krAsset.address);

                    // Burn assets
                    await userOne.burnKreskoAsset(users.userOne.address, this.krAsset.address, fullRepayAmount, 0);

                    const debtValueAfterBurn = await hre.Diamond.getAccountKrAssetValue(users.userOne.address);
                    expect(debtValueAfterBurn.rawValue).to.bignumber.equal(0);

                    // Should not contain minted krAsset
                    const mintedKreskoAssetsAfterBurn = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                    expect(mintedKreskoAssetsAfterBurn).to.not.contain(this.krAsset.address);
                });
                it("when repaying partial debt after a positive rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = true;

                    const halfRepayAmount = mintAmount.mul(denominator).div(2);
                    // Expected values
                    const halfOfExpectedValueAfterRebase = (
                        await hre.Diamond.getKrAssetValue(this.krAsset.address, mintAmount, false)
                    ).rawValue.div(2);

                    // Adjust price according to rebase params
                    const assetPrice = await this.krAsset.getPrice();
                    this.krAsset.setPrice(hre.fromBig(assetPrice.div(denominator), 8));

                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    // Should contain minted krAsset
                    const mintedKreskoAssetsBeforeBurn = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                    expect(mintedKreskoAssetsBeforeBurn).to.contain(this.krAsset.address);

                    // Burn assets
                    await userOne.burnKreskoAsset(users.userOne.address, this.krAsset.address, halfRepayAmount, 0);

                    const debtValueAfterBurn = await hre.Diamond.getAccountKrAssetValue(users.userOne.address);
                    expect(debtValueAfterBurn.rawValue).to.bignumber.equal(halfOfExpectedValueAfterRebase);

                    // Should still contain minted krAsset
                    const mintedKreskoAssetsAfterBurn = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                    expect(mintedKreskoAssetsAfterBurn).to.contain(this.krAsset.address);
                });
                it("when repaying all debt after a negative rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    const fullRepayAmount = mintAmount.div(denominator);
                    // Expected value
                    const expectedValueAfterRebase = await hre.Diamond.getKrAssetValue(
                        this.krAsset.address,
                        mintAmount,
                        false,
                    );

                    // Adjust price according to rebase params
                    const assetPrice = await this.krAsset.getPrice();
                    this.krAsset.setPrice(hre.fromBig(assetPrice.mul(denominator), 8));

                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    // Ensure expected value is correct
                    const debtValueAfterRebase = await hre.Diamond.getAccountKrAssetValue(users.userOne.address);
                    expect(debtValueAfterRebase.rawValue).to.bignumber.equal(expectedValueAfterRebase.rawValue);

                    // Should contain minted krAsset
                    const mintedKreskoAssetsBeforeBurn = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                    expect(mintedKreskoAssetsBeforeBurn).to.contain(this.krAsset.address);

                    // Burn assets
                    await userOne.burnKreskoAsset(users.userOne.address, this.krAsset.address, fullRepayAmount, 0);

                    const debtValueAfterBurn = await hre.Diamond.getAccountKrAssetValue(users.userOne.address);
                    expect(debtValueAfterBurn.rawValue).to.bignumber.equal(0);

                    // Should not contain minted krAsset
                    const mintedKreskoAssetsAfterBurn = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                    expect(mintedKreskoAssetsAfterBurn).to.not.contain(this.krAsset.address);
                });
                it("when repaying partial debt after a negative rebase", async function () {
                    const userOne = hre.Diamond.connect(users.userOne);

                    // Rebase params
                    const denominator = 4;
                    const positive = false;

                    const halfRepayAmount = mintAmount.div(denominator).div(2);
                    // Expected values
                    const halfOfExpectedValueAfterRebase = (
                        await hre.Diamond.getKrAssetValue(this.krAsset.address, mintAmount, false)
                    ).rawValue.div(2);

                    // Adjust price according to rebase params
                    const assetPrice = await this.krAsset.getPrice();
                    this.krAsset.setPrice(hre.fromBig(assetPrice.mul(denominator), 8));

                    await this.krAsset.contract.rebase(hre.toBig(denominator), positive);

                    // Should contain minted krAsset
                    const mintedKreskoAssetsBeforeBurn = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                    expect(mintedKreskoAssetsBeforeBurn).to.contain(this.krAsset.address);

                    // Burn assets
                    await userOne.burnKreskoAsset(users.userOne.address, this.krAsset.address, halfRepayAmount, 0);

                    const debtValueAfterBurn = await hre.Diamond.getAccountKrAssetValue(users.userOne.address);
                    expect(debtValueAfterBurn.rawValue).to.bignumber.equal(halfOfExpectedValueAfterRebase);

                    // Should still contain minted krAsset
                    const mintedKreskoAssetsAfterBurn = await hre.Diamond.getMintedKreskoAssets(users.userOne.address);
                    expect(mintedKreskoAssetsAfterBurn).to.contain(this.krAsset.address);
                });
            });
        });
    });
});
