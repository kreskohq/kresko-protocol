import hre, { fromBig, toBig } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { toFixedPoint } from "../utils/fixed-point";

import {
    addNewKreskoAssetWithOraclePrice,
    BURN_FEE,
    deployAndWhitelistCollateralAsset,
    deployWETH10AsCollateralWithLiquidator,
    FEE_RECIPIENT_ADDRESS,
    LIQUIDATION_INCENTIVE,
    MINIMUM_COLLATERALIZATION_RATIO,
    MINIMUM_DEBT_VALUE,
} from "@utils";

/****** INFORMATION  *******
 *
 * SOLVENCY MARGIN                      = Amount/Percentage of surplus collateral USD value an account holds in the protocol when the account is considered liquidatable.
 *                                        Meaning this is the MARGIN for the account to pay liquidation incentives and burn fees
 *                                        in ADDITION to the liquidation itself while keeping the user SOLVENT even in the worst scenario.
 *
 * cFactor                              = Multiplier that gets REDUCED from the collaterals backing power for minting/borrorwing krAsset for solvency.
 *                                        Meaning more riskies collaterals will have a lower cFactor eg. < 1
 *
 * kFactor                              = Multiplier that gets ADDED into a synths (krAsset) DEBT value inside the protocol for solvency
 *                                        Meaning more riskies synths (krAssets) will have a GREATER kFactor (> 1) for additional solvency margin.
 *                                        Assets with lower risk profile (Forex, Index instruments will have a lower, but never lower than 1)
 *
 * COLLATERAL RATIO/CR                  = Protocol Collateral Value / Protocol Debt Value (includes cFactor and kFactor).
 *
 * MINIMUM COLLATERALIZATION RATIO/MCR  = Additional global solvency margin multiplier.
 *                                        it gets multiplied ON TOP of all cFactors / kFactors of ALL POSITIONS.
 *
 *                                       Example user flow:
 *                                          Deposits $100 USDC collateral with a cFactor of 0.8: User now has 80$ of borrowing/minting power
 *                                          Borrows/Mints $40 worth of a synth eg. krTSLA with a kFactor of 1.2 which means $44 of protocol DEBT.
 *                                          User now has a CR of ~1.8181 that is 0.3181 in surplus before hitting the MCR of 1.5 and getting most likely liquidated
 *
 * LIQUIDATION INCENTIVE/MULTIPLIER    = The incentive for a liquidator to do housekeeping, a value of 1e18 means 100% so NO BONUS.
 *                                       This value is kept low as possible while still maintaining a interesting liquidation market.
 *
 */

describe("Solvency", function () {
    before(async function () {
        hre.upgrades.silenceWarnings();
        const signers: SignerWithAddress[] = await hre.ethers.getSigners();
        this.signers = {
            admin: signers[0],
            userOne: signers[1],
            userTwo: signers[2],
        };
        this.signers.userThree = signers[3];
        this.signers.liquidator = signers[4];
        this.getStableCollateralPrice = async function () {
            return fromBig(await this.stableCollateralAssetInfo.oracle.latestAnswer());
        };
        this.getVolativeCollateralPrice = async function () {
            return fromBig(await this.volativeCollateralAssetInfo.oracle.latestAnswer());
        };
        this.getVolativeKrAssetPrice = async function () {
            return fromBig(await this.volativeKrAssetInfo.oracle.latestAnswer());
        };
        this.getStableKrAssetPrice = async function () {
            return fromBig(await this.stableKrAssetInfo.oracle.latestAnswer());
        };

        this.getMostProfitableLiquidation = async function (userAddress: string) {
            const volativeToStableLiq = {
                maxUSD: fromBig(
                    (
                        await this.Kresko.calculateMaxLiquidatableValueForAssets(
                            userAddress,
                            this.volativeKrAsset.address,
                            this.stableCollateralAsset.address,
                        )
                    ).rawValue,
                ),
                krAsset: this.volativeKrAsset.address,
                collateralAsset: this.stableCollateralAsset.address,
            };
            const volativeToVolativeLiq = {
                maxUSD: fromBig(
                    (
                        await this.Kresko.calculateMaxLiquidatableValueForAssets(
                            userAddress,
                            this.volativeKrAsset.address,
                            this.volativeCollateralAsset.address,
                        )
                    ).rawValue,
                ),
                krAsset: this.volativeKrAsset.address,
                collateralAsset: this.volativeCollateralAsset.address,
            };

            const stableToStableLiq = {
                maxUSD: fromBig(
                    (
                        await this.Kresko.calculateMaxLiquidatableValueForAssets(
                            userAddress,
                            this.stableKrAsset.address,
                            this.stableCollateralAsset.address,
                        )
                    ).rawValue,
                ),
                krAsset: this.stableKrAsset.address,
                collateralAsset: this.stableCollateralAsset.address,
            };

            const stableToVolativeLiq = {
                maxUSD: fromBig(
                    (
                        await this.Kresko.calculateMaxLiquidatableValueForAssets(
                            userAddress,
                            this.stableKrAsset.address,
                            this.volativeCollateralAsset.address,
                        )
                    ).rawValue,
                ),
                krAsset: this.stableKrAsset.address,
                collateralAsset: this.volativeCollateralAsset.address,
            };

            const liquidations = [volativeToStableLiq, volativeToVolativeLiq, stableToVolativeLiq, stableToStableLiq];
            return liquidations
                .filter(liquidation => liquidation.maxUSD > 0)
                .sort(({ maxUSD: maxUSDA }, { maxUSD: maxUSDB }) => maxUSDB - maxUSDA)[0];
        };

        this.getUserValues = async function () {
            return await Promise.all(
                [this.signers.userOne.address, this.signers.userTwo.address, this.signers.userThree.address].map(
                    async userAddress => {
                        // Get token amounts of each asset for the user
                        const protocol = {
                            collateralAmountStable: fromBig(
                                await this.Kresko.collateralDeposits(userAddress, this.stableCollateralAsset.address),
                            ),
                            collateralAmountVolative: fromBig(
                                await this.Kresko.collateralDeposits(userAddress, this.volativeCollateralAsset.address),
                            ),
                            krAssetAmountStable: fromBig(
                                await this.Kresko.kreskoAssetDebt(userAddress, this.stableKrAsset.address),
                            ),
                            krAssetAmountVolative: fromBig(
                                await this.Kresko.kreskoAssetDebt(userAddress, this.volativeKrAsset.address),
                            ),
                            // Get the protocol debt USD value which is guaranteed >= actualDebtUSD due to kFactor
                            debtUSDProtocol: fromBig((await this.Kresko.getAccountKrAssetValue(userAddress)).rawValue),
                            // Get the protocol collateral USD value which guaranteed <= actualCollateralUSD due to collateral factor
                            collateralUSDProtocol: fromBig(
                                (await this.Kresko.getAccountCollateralValue(userAddress)).rawValue,
                            ),
                            // Get the minimum amount of collateral value needed for the user to be considered not liquidatable
                            minCollateralUSD: fromBig(
                                (await this.Kresko.getAccountMinimumCollateralValue(userAddress)).rawValue,
                            ),
                            isLiquidatable: await this.Kresko.isAccountLiquidatable(userAddress),
                            userAddress,
                        };

                        // Calculate actual USD values for the user
                        const collateralUSDStable =
                            protocol.collateralAmountStable * (await this.getStableCollateralPrice());
                        const collateralUSDVolative =
                            protocol.collateralAmountVolative * (await this.getVolativeCollateralPrice());
                        const krAssetUSDStable = protocol.krAssetAmountStable * (await this.getStableKrAssetPrice());
                        const krAssetUSDVolative =
                            protocol.krAssetAmountVolative * (await this.getVolativeKrAssetPrice());

                        // Sum all collateral and debt USD values for the user
                        const actualCollateralUSD = collateralUSDStable + collateralUSDVolative;
                        const actualDebtUSD = krAssetUSDStable + krAssetUSDVolative;

                        return {
                            actualCollateralUSD,
                            actualDebtUSD,
                            isUserSolvent: actualCollateralUSD > actualDebtUSD,
                            ...protocol,
                        };
                    },
                ),
            );
        };

        // Protocol is solvent as long as the actual USD value of collateral outweights the actual debt USD value for each user
        // If no insolvent users are found - protocol is solvent
        this.isProtocolSolvent = async function () {
            const userValues = await this.getUserValues();

            const foundInsolventUser = userValues.some((user: any) => !user.isUserSolvent);

            return !foundInsolventUser;
        };

        // percentage: 0.4 = 40% downswing
        // percentage: 1 = no change
        // precentage: 1.1 = 10% upswing
        // percentage: 2 = 100% upswing
        this.swingVolativeKrAssetPriceBy = async function (percentage: number) {
            const currentPrice = await this.getStableKrAssetPrice();
            await this.volativeKrAssetInfo.oracle.transmit(
                toFixedPoint(currentPrice * (percentage >= 1 ? percentage : Math.abs(1 - percentage))),
                true,
            );
        };
        this.swingStableKrAssetPriceBy = async function (percentage: number) {
            const currentPrice = await this.getVolativeKrAssetPrice();
            await this.stableKrAssetInfo.oracle.transmit(
                toFixedPoint(currentPrice * (percentage >= 1 ? percentage : Math.abs(1 - percentage))),
                true,
            );
        };
        this.swingStableCollateralPriceBy = async function (percentage: number) {
            const currentPrice = await this.getStableCollateralPrice();
            await this.stableCollateralAssetInfo.oracle.transmit(
                toFixedPoint(currentPrice * (percentage >= 1 ? percentage : Math.abs(1 - percentage))),
                true,
            );
        };
        this.swingVolativeCollateralPriceBy = async function (percentage: number) {
            const currentPrice = await this.getVolativeCollateralPrice();
            await this.volativeCollateralAssetInfo.oracle.transmit(
                toFixedPoint(currentPrice * (percentage >= 1 ? percentage : Math.abs(1 - percentage))),
                true,
            );
        };
    });

    beforeEach(async function () {
        const kreskoFactory = await hre.ethers.getContractFactory("Kresko");
        const kresko = <Kresko>await hre.upgrades.deployProxy(
            kreskoFactory,
            [
                BURN_FEE,
                FEE_RECIPIENT_ADDRESS,
                LIQUIDATION_INCENTIVE,
                MINIMUM_COLLATERALIZATION_RATIO,
                MINIMUM_DEBT_VALUE,
            ],
            {
                unsafeAllow: [
                    "constructor", // Intentionally preventing others from initializing.
                    "delegatecall", // BoringBatchable -- only delegatecalls itself.
                ],
            },
        );

        this.Kresko = await kresko.deployed();

        // This is an example _ZERO UPFRONT CAPITAL_ flashLiquidator contract leveragin WETH10's flash loan capability
        // This can be replicated by eg. UNI FlashSwap / Aave Flashloan / dYdX Solo margin.
        // It allows for atomic liquidations with zero upfront cost and risk, it will just revert if a liquidation is not profitable.

        // Hence for simplicitys sake we will also allow WETH as a collateral.
        // Price:  ~current ETH price of 2570 at the time of writing
        //
        // NOTE: Aave also has a collateral factor of 0.8 (Loan To Value in Aave terms) for WETH
        //
        // Collateral factor: 0.8
        // Oracle price = $2570
        // Whole token will count as $2056 of minting/borrowing power.
        // = $514 of solvency margin per whole token
        const WETHPrice = 2570;
        const WETHCollateralFactor = 0.8;
        const { FlashLiquidator, WETH10, oracle } = await deployWETH10AsCollateralWithLiquidator(
            this.Kresko,
            this.signers.liquidator,
            WETHCollateralFactor,
            WETHPrice,
        );

        this.FlashLiquidator = FlashLiquidator;
        this.WETH10 = WETH10;
        this.WETH10OraclePrice = fromBig(await oracle.latestAnswer());
        this.WETH10Oracle = oracle;

        expect(this.WETH10OraclePrice).to.equal(WETHPrice);

        // Set a safe MCR ratio of 150%
        // Note: mai.finance (QiDao) has a MCR of ~135% for most of their accepted assets
        await this.Kresko.updateMinimumCollateralizationRatio(toFixedPoint(1.5));

        // Deploy a "volative" mintable/borrowable kresko asset
        // Expect highest intraday changes to be around 30-50%
        // Example assets: High leverage instruments like most cryptos, some speculative stocks
        // kFactor = 1.2
        // Oracle price = $10.00
        // Whole token will count as $12 of debt when minted.
        // = $2 solvency margin per whole token
        this.volativeKrAssetKFactor = 1.2;
        this.volativeKrAssetInfo = await addNewKreskoAssetWithOraclePrice(
            this.Kresko,
            "Volative KrAsset",
            "krVOLATIVE",
            this.volativeKrAssetKFactor,
            10,
            toBig(10_000_000),
        );

        // Deploy a "stable" mintable (borrowable) krAsset
        // Expect highest intraday changes to be around ~5-10%
        // Example assets: Index stocks like QQQ, S&P500, Commodities / FOREX like Gold, EUR, GPB.
        // kFactor = 1.05
        // Oracle price = $10.00
        // Whole token will count as $10.5 of debt when minted.
        // = $0.5 solvency margin per whole token
        this.stableKrAssetKFactor = 1.05;
        this.stableKrAssetInfo = await addNewKreskoAssetWithOraclePrice(
            this.Kresko,
            "Stable KrAsset",
            "krSTABLE",
            this.stableKrAssetKFactor,
            10,
            toBig(10_000_000),
        );

        // Deploy a stable collateral asset eg. a "reputable" stablecoin like USDC and whitelist it
        // collateral factor = 0.8
        // NOTE: Aave has a collateral factor (Loan To Value in Aave terms) of 0.8 for USDC with liquidation threshold even higher, 0.85)
        // price = $1.00
        // Whole token will allow for $0.8 of minting/borrowing power.
        // = $0.2 solvency margin per whole token
        this.stableCollateralFactor = 0.8;
        this.stableCollateralAssetInfo = await deployAndWhitelistCollateralAsset(
            this.Kresko,
            this.stableCollateralFactor,
            1,
            18,
        );

        // Deploy a volative collateral asset eg. a crypto like Near and whitelist it
        // Expect highest intraday changes to be around ~30-50%
        // collateral factor = 0.5
        // price = $10.00
        // Whole token will allow for $5 of minting/borrowing power.
        // = $5 solvency margin per whole token
        this.volativeCollateralAssetFactor = 0.5;
        this.volativeCollateralAssetInfo = await deployAndWhitelistCollateralAsset(
            this.Kresko,
            this.volativeCollateralAssetFactor,
            10,
            18,
        );

        const stableKrAsset = this.stableKrAssetInfo.kreskoAsset;
        this.stableKrAsset = stableKrAsset;

        const volativeKrAsset = this.volativeKrAssetInfo.kreskoAsset;
        this.volativeKrAsset = volativeKrAsset;

        const stableCollateralAsset = this.stableCollateralAssetInfo.collateralAsset;
        this.stableCollateralAsset = stableCollateralAsset;

        const volativeCollateralAsset = this.volativeCollateralAssetInfo.collateralAsset;
        this.volativeCollateralAsset = volativeCollateralAsset;

        // krAsset prices
        this.stableKrAssetOraclePrice = fromBig(await this.stableKrAssetInfo.oracle.latestAnswer());
        this.volativeKrAssetOraclePrice = fromBig(await this.volativeKrAssetInfo.oracle.latestAnswer());

        // Collateral prices
        this.stableCollateralOraclePrice = fromBig(await this.stableCollateralAssetInfo.oracle.latestAnswer());
        this.volativeCollateralOraclePrice = fromBig(await this.volativeCollateralAssetInfo.oracle.latestAnswer());

        expect(this.stableKrAssetOraclePrice).to.equal(10);
        expect(this.volativeKrAssetOraclePrice).to.equal(10);
        expect(this.stableCollateralOraclePrice).to.equal(1);
        expect(this.volativeCollateralOraclePrice).to.equal(10);

        // Give userOne, userTwo, userThree and the liquidator a balance of 100,000 whole tokens of the mock stablecoin.
        const userAddresses = [
            this.signers.userOne.address,
            this.signers.userTwo.address,
            this.signers.userThree.address,
        ];

        const initialStableUserCollateralWalletBalance = toBig(100_000);
        for (const userAddress of userAddresses) {
            await this.stableCollateralAsset.setBalanceOf(userAddress, initialStableUserCollateralWalletBalance);
        }

        // Give liquidator an X amount of

        // Give userOne, userTwo and userThree a balance of 100,000 whole tokens of the mock volative collateral asset.
        const initialVolativeUserCollateralWalletBalance = toBig(100_000);
        for (const userAddress of userAddresses) {
            await this.volativeCollateralAsset.setBalanceOf(userAddress, initialVolativeUserCollateralWalletBalance);
        }

        /** DEPOSIT AND MINT (BORROW) USER ONE */

        // userOne deposits 40,000 of the stable collateral asset
        // 40,000 * $1 = $40,000 in collateral value
        // $40,000 * collateral factor (0.8) = $32,000 minting/borrowing power
        // Solvency margin: $8000 or 20% for this collateral deposit
        const userOneDepositAmountStable = toBig(40_000);
        await this.Kresko.connect(this.signers.userOne).depositCollateral(
            this.signers.userOne.address,
            stableCollateralAsset.address,
            userOneDepositAmountStable,
        );

        this.userOneDepositAmountStable = fromBig(userOneDepositAmountStable);

        // Set the actual USD value into memory
        this.userOneInitialCollateralUSD = this.userOneDepositAmountStable * this.stableCollateralOraclePrice;

        /** userOne mints 1000 of the volatite krAsset
            /* 1000 * $10 = $10,000 actual debt
            /* $10,000 * kFactor (1.2) = $12,000 debt in protocol
            /*
            /* SOLVENCY MARGINS:
            /*
            /* $2000 (20%) for this particular krAsset
            /* $8000 (20%) (collateral solvency margin)
            /* = $10,000 total solvency margin without MCR
            /*
            /* MCR (1.5) solvency margin added to debt: $10,000 * MCR - $15,000 = $5000
            /*
            /* $10,000 + $5000
            /* Solvency margin: $15,000 total for positions
            */
        this.userOneExpectedSolvencyMargins = {
            debt: 2000,
            collateral: 8000,
            totalWithMCR: 15_000,
        };
        const userOneMintAmountVolativeBig = toBig(1000);
        await this.Kresko.connect(this.signers.userOne).mintKreskoAsset(
            this.signers.userOne.address,
            volativeKrAsset.address,
            userOneMintAmountVolativeBig,
        );

        this.userOneMintAmountVolative = fromBig(userOneMintAmountVolativeBig);
        this.userOneInitialDebtUSD = this.userOneMintAmountVolative * (await this.getVolativeKrAssetPrice());

        /** DEPOSIT AND MINT (BORROW) USER TWO */

        // userTwo deposits 100,000 of the stable collateral asset
        // 100,000 * $1 = $100,000 in collateral value
        // $100,000 * collateral factor (0.8) = $80,000 minting/borrowing power
        //
        // Solvency margin: $20,000 or 20% for this collateral deposit
        const userTwoDepositAmountStableBig = toBig(100_000);
        await this.Kresko.connect(this.signers.userTwo).depositCollateral(
            this.signers.userTwo.address,
            stableCollateralAsset.address,
            userTwoDepositAmountStableBig,
        );

        this.userTwoDepositAmountStable = fromBig(userTwoDepositAmountStableBig);

        // Set the actual USD value into memory
        this.userTwoInitialCollateralUSD = this.userTwoDepositAmountStable * this.stableCollateralOraclePrice;

        /** userTwo mints 2000 of the volative krAsset
            /* 2000 * $10 = $20,000 actual debt
            /* $20,000 * kFactor (1.2) = $24,000 debt in protocol
            /*
            /** SOLVENCY MARGINS:
            /* 
            /* $4000 (20%) for this particular krAsset
            /* $20,000 (20%) (collateral solvency margin)
            /* = $24000 total solvency margin without MCR
            /*
            /* MCR (1.5) solvency margin added: $24,000 * MCR - $24,000 = $12,000
            /*
            /* $24,000 + $12,000 
            /* Solvency margin: $36,000 total for positions 
            */

        this.userTwoExpectedSolvencyMargins = {
            debt: 4000,
            collateral: 20_000,
            totalWithMCR: 36_000,
        };

        const userTwoMintAmountVolativeBig = toBig(2000);
        await this.Kresko.connect(this.signers.userTwo).mintKreskoAsset(
            this.signers.userTwo.address,
            volativeKrAsset.address,
            userTwoMintAmountVolativeBig,
        );

        this.userTwoMintAmountVolative = fromBig(userTwoMintAmountVolativeBig);
        this.userTwoInitialDebtUSD = this.userTwoMintAmountVolative * (await this.getVolativeKrAssetPrice());

        /** DEPOSIT AND MINT (BORROW) USER THREE */
        // userThree deposits 1000 of the volative collateral asset
        // 1000 * $10 = $10,000 in collateral value
        // $10,000 * collateral factor (0.5) = $5,000 minting/borrowing power
        //
        // Solvency margin: $5000 for this particulat collateral deposit
        const userThreeDepositAmountVolativeBig = toBig(1000);
        await this.Kresko.connect(this.signers.userThree).depositCollateral(
            this.signers.userThree.address,
            volativeCollateralAsset.address,
            userThreeDepositAmountVolativeBig,
        );

        this.userThreeDepositAmountVolative = fromBig(userThreeDepositAmountVolativeBig);
        this.userThreeInitialCollateralUSD = this.userThreeDepositAmountVolative * this.volativeCollateralOraclePrice;

        /** userThree mints 200 of the volative krAsset
            /* 200 * $10 = $2000 actual debt
            /* $2000 * kFactor (1.2) = $2400 debt in protocol
            /*
            /** SOLVENCY MARGINS:
            /* 
            /* $400 (20%) for this particular krAsset
            /* $5,000 (50%) (collateral solvency margin)
            /* = $5400 total solvency margin without MCR
            /*
            /* MCR (1.5) solvency margin: $5400 * MCR - $5400 = $2700
            /*
            /* $5400 + $2700
            /* Solvency margin: $8100 total for positions
            */
        this.userThreeExpectedSolvencyMargins = {
            debt: 400,
            collateral: 5000,
            totalWithMCR: 8100,
        };

        const userThreeMintAmountVolativeBig = toBig(200);
        await this.Kresko.connect(this.signers.userThree).mintKreskoAsset(
            this.signers.userThree.address,
            volativeKrAsset.address,
            userThreeMintAmountVolativeBig,
        );

        this.userThreeMintAmountVolative = fromBig(userThreeMintAmountVolativeBig);
        this.userThreeInitialDebtUSD = this.userThreeMintAmountVolative * (await this.getVolativeKrAssetPrice());

        // Total solvency margin for whole protocol:
        // userOne: $15,000
        // userTwo: $36,000
        // userThree: $8100
        // = $59,100
        this.expectedSolvencyMarginProtocol =
            this.userOneExpectedSolvencyMargins.totalWithMCR +
            this.userTwoExpectedSolvencyMargins.totalWithMCR +
            this.userThreeExpectedSolvencyMargins.totalWithMCR;

        // Total actual initial collateral USD
        this.actualInitialTotalCollateralUSD =
            this.userOneInitialCollateralUSD + this.userTwoInitialCollateralUSD + this.userThreeInitialCollateralUSD;

        // Total actual initial debt USD
        this.actualInitialTotalDebtUSD =
            this.userOneInitialDebtUSD + this.userTwoInitialDebtUSD + this.userThreeInitialDebtUSD;
    });

    it("should initialize with correct parameters", async function () {
        const userValues = await this.getUserValues();
        const [userOne, userTwo, userThree] = userValues;

        /** Ensure deposit values match on-chain */
        expect(userOne.collateralAmountStable).to.equal(this.userOneDepositAmountStable);
        expect(userOne.krAssetAmountVolative).to.equal(this.userOneMintAmountVolative);

        expect(userTwo.collateralAmountStable).to.equal(this.userTwoDepositAmountStable);
        expect(userTwo.krAssetAmountVolative).to.equal(this.userTwoMintAmountVolative);

        expect(userThree.collateralAmountVolative).to.equal(this.userThreeDepositAmountVolative);
        expect(userThree.krAssetAmountVolative).to.equal(this.userThreeMintAmountVolative);

        /** Ensure krAssets debt values match on-chain */
        const totalDebtUSD = userValues.reduce((a, b) => a + b.actualDebtUSD, 0);
        expect(this.actualInitialTotalDebtUSD).to.equal(totalDebtUSD);

        /** Ensure collateral USD values match on-chain */
        const totalCollateralAmountUSD = userValues.reduce((a, b) => a + b.actualCollateralUSD, 0);
        expect(this.actualInitialTotalCollateralUSD).to.equal(totalCollateralAmountUSD);
    });

    it("should have correct solvency margins for user one", async function () {
        // Get the actual debt / collateral USD values
        const [userOneSolvencyValues] = await this.getUserValues();
        const { actualCollateralUSD, actualDebtUSD } = userOneSolvencyValues;

        // Get the protocol debt value which is >= actualDebt due to kFactor
        const userProtocolDebt = fromBig(
            (await this.Kresko.getAccountKrAssetValue(this.signers.userOne.address)).rawValue,
        );

        // Debt solvency = users protocol debt - actual debt
        const debtSolvencyMargin = userProtocolDebt - actualDebtUSD;
        expect(debtSolvencyMargin).to.equal(this.userOneExpectedSolvencyMargins.debt);

        // Get the protocol collateral USD value which is guaranteed <= actualCollateralUSD due to collateral factor
        const userCollateralUSD = fromBig(
            (await this.Kresko.getAccountCollateralValue(this.signers.userOne.address)).rawValue,
        );

        // Collateral solvency margin = actual value - protocol value
        const collateralSolvencyMargin = actualCollateralUSD - userCollateralUSD;
        expect(collateralSolvencyMargin).to.equal(this.userOneExpectedSolvencyMargins.collateral);

        // Get the MCR value (1.5)
        const minCollateralRatio = fromBig(await this.Kresko.minimumCollateralizationRatio());
        expect(minCollateralRatio).to.equal(1.5);

        // Calculate the total solvency margin
        const totalSolvencyMargin = (collateralSolvencyMargin + debtSolvencyMargin) * minCollateralRatio;

        // Should match the initial assumption of $15,000
        expect(totalSolvencyMargin).to.equal(this.userOneExpectedSolvencyMargins.totalWithMCR);
    });

    it("should have correct solvency margins for user two", async function () {
        // Get the actual debt / collateral USD values
        const [, userTwoSolvencyValues] = await this.getUserValues();
        const { actualCollateralUSD, actualDebtUSD } = userTwoSolvencyValues;

        const userProtocolDebt = fromBig(
            (await this.Kresko.getAccountKrAssetValue(this.signers.userTwo.address)).rawValue,
        );

        // Debt solvency = users protocol debt - actual debt
        const debtSolvencyMargin = userProtocolDebt - actualDebtUSD;
        expect(debtSolvencyMargin).to.equal(this.userTwoExpectedSolvencyMargins.debt);

        // Get the protocol collateral USD value which is guaranteed <= actualCollateralUSD due to collateral factor
        const userCollateralUSD = fromBig(
            (await this.Kresko.getAccountCollateralValue(this.signers.userTwo.address)).rawValue,
        );

        // Collateral solvency margin = actual value - protocol value
        const collateralSolvencyMargin = actualCollateralUSD - userCollateralUSD;
        expect(collateralSolvencyMargin).to.equal(this.userTwoExpectedSolvencyMargins.collateral);

        // Get the MCR value (1.5)
        const minCollateralRatio = fromBig(await this.Kresko.minimumCollateralizationRatio());
        expect(minCollateralRatio).to.equal(1.5);

        // Calculate the total solvency margin
        const totalSolvencyMargin = (collateralSolvencyMargin + debtSolvencyMargin) * minCollateralRatio;

        // Should match the initial assumption of $36,000
        expect(totalSolvencyMargin).to.equal(this.userTwoExpectedSolvencyMargins.totalWithMCR);
    });

    it("should have correct solvency margins for user three", async function () {
        // Get the actual debt value
        const [, , userThreeSolvencyValues] = await this.getUserValues();

        const { actualCollateralUSD, actualDebtUSD } = userThreeSolvencyValues;
        // Get the protocol debt value which is >= actualDebt due to kFactor
        const protocolDebtUSD = fromBig(
            (await this.Kresko.getAccountKrAssetValue(this.signers.userThree.address)).rawValue,
        );

        // Debt solvency = users protocol debt - actual debt
        const debtSolvencyMargin = protocolDebtUSD - actualDebtUSD;

        expect(debtSolvencyMargin).to.equal(this.userThreeExpectedSolvencyMargins.debt);

        // Get the protocol collateral USD value which is guaranteed <= actualCollateralUSD due to collateral factor
        const protocolCollateralUSD = fromBig(
            (await this.Kresko.getAccountCollateralValue(this.signers.userThree.address)).rawValue,
        );

        // Collateral solvency margin = actual value - protocol value
        const collateralSolvencyMargin = actualCollateralUSD - protocolCollateralUSD;
        expect(collateralSolvencyMargin).to.equal(this.userThreeExpectedSolvencyMargins.collateral);

        // Get the MCR value (1.5)
        const minCollateralRatio = fromBig(await this.Kresko.minimumCollateralizationRatio());
        expect(minCollateralRatio).to.equal(1.5);

        // Calculate the total solvency margin
        const totalSolvencyMargin = (collateralSolvencyMargin + debtSolvencyMargin) * minCollateralRatio;

        // Should match the initial assumption of $8100
        expect(totalSolvencyMargin).to.equal(this.userThreeExpectedSolvencyMargins.totalWithMCR);
    });

    it("should have a over-collateralized protocol according to safety ratios", async function () {
        const userValues = await this.getUserValues();
        const minCollateralRatio = fromBig(await this.Kresko.minimumCollateralizationRatio());

        const totalKrAssetAmountVolative = userValues.reduce((a, b) => a + b.krAssetAmountVolative, 0);

        // We are ensuring that the minimum collateral required to back the minted assets equals:
        // Total assets minted * Asset price * Minimum collateral ratio * Asset kFactor
        const expectedMinimumCollateralUSD =
            totalKrAssetAmountVolative *
            this.volativeKrAssetOraclePrice *
            minCollateralRatio *
            this.volativeKrAssetKFactor;

        const minCollateralUSDTotal = userValues.reduce((a, b) => a + b.minCollateralUSD, 0);

        expect(expectedMinimumCollateralUSD).to.equal(minCollateralUSDTotal);

        const collateralUSDWithCollateralFactorTotal = userValues.reduce((a, b) => a + b.collateralUSDProtocol, 0);
        const actualCollateralUSDTotal = userValues.reduce((a, b) => a + b.actualCollateralUSD, 0);

        // Actual collateral USD backing value will always be greater or equal to what the protocol counts as solvent
        // Only in the case of collaterals with a factor of 1 this value will be equal
        expect(actualCollateralUSDTotal).to.be.greaterThanOrEqual(collateralUSDWithCollateralFactorTotal);

        // Minimum collateralization ratio (MCR) is 1.5
        // So this value is guaranteed to be greater or equal than the minimum amount required for solvency by 50%.
        expect(collateralUSDWithCollateralFactorTotal).to.be.greaterThanOrEqual(
            minCollateralUSDTotal * minCollateralRatio,
        );

        // All users are solvent at this point
        expect(await this.isProtocolSolvent()).to.be.true;
    });

    it("should make a user insolvent with a unrealistic instant price upswing in value of a krAsset", async function () {
        // Sanity check that the protocol CAN actually go insolvent with extreme kreskoAsset price swings and no liquidations
        await this.swingVolativeKrAssetPriceBy(10); // 1000% upswing
        expect(await this.isProtocolSolvent()).to.be.false;
    });

    it("should make a user insolvent with a unrealistic instant price downswing in value of a collateral", async function () {
        // Sanity check that a position CAN actually go insolvent with collateral price swings and no liquidations
        await this.swingVolativeCollateralPriceBy(0.8); // 80% downswing
        expect(await this.isProtocolSolvent()).to.be.false;
    });

    it("should not make a user insolvent with a realistic price downswing in value of a volative collateral", async function () {
        await this.swingVolativeCollateralPriceBy(0.5); // 50% downswing
        expect(await this.isProtocolSolvent()).to.be.true;
    });

    it("should make a user liquidatable with a realistic price downswing in value of a volative collateral", async function () {
        // 50% downswing
        await this.swingVolativeCollateralPriceBy(0.5);
        const isAnyUserLiquidatable = (await this.getUserValues()).some(user => user.isLiquidatable);

        expect(isAnyUserLiquidatable).to.be.true;
    });

    it("should repay a single market position back to healthy in a single transaction", async function () {
        // 50% downswing on a volative collateral price
        await this.swingVolativeCollateralPriceBy(0.5);

        // Protocol should stay solvent
        expect(await this.isProtocolSolvent()).to.be.true;

        // But liquidations should be available
        const userValuesBeforeLiquidation = await this.getUserValues();
        const userToBeLiquidated = userValuesBeforeLiquidation.find(user => user.isLiquidatable);

        if (!userToBeLiquidated) {
            throw new Error("No users to liquidate found");
        }

        // User three had the riskiest position
        expect(userToBeLiquidated.userAddress).to.equal(this.signers.userThree.address);

        // Get the protocol values before liquidation
        const [, , userThreeBeforeLiquidation] = userValuesBeforeLiquidation;

        // Check which asset we should repay in the liquidation
        const assetToRepay =
            userToBeLiquidated.krAssetAmountStable > userToBeLiquidated.krAssetAmountVolative
                ? this.stableKrAsset
                : this.volativeKrAsset;

        // Check what collateral has value
        const collateralToReceive =
            userToBeLiquidated.collateralAmountStable > userToBeLiquidated.collateralAmountVolative
                ? this.stableCollateralAsset
                : this.volativeCollateralAsset;

        // Get the max liquidatable USD value before liquidation
        const maxLiquidationValue = fromBig(
            (
                await this.Kresko.calculateMaxLiquidatableValueForAssets(
                    userToBeLiquidated.userAddress,
                    assetToRepay.address,
                    collateralToReceive.address,
                )
            ).rawValue,
        );

        // Liquidate the user
        await this.FlashLiquidator.connect(this.signers.liquidator).flashLiquidate(
            userToBeLiquidated.userAddress,
            assetToRepay.address,
            collateralToReceive.address,
        );

        // Inspect values after liquidation
        const userValuesAfterLiquidation = await this.getUserValues();
        const isAnyUserLiquidatable = userValuesAfterLiquidation.some(user => user.isLiquidatable);
        const [, , userThreeAfterLiquidation] = userValuesAfterLiquidation;

        const repaySurplus = fromBig(await this.Kresko.burnFee());

        // Ensure enough surplus for repayment burn fees is left
        expect(userThreeAfterLiquidation.minCollateralUSD).to.be.lessThan(
            userThreeAfterLiquidation.collateralUSDProtocol +
                userThreeAfterLiquidation.collateralUSDProtocol * repaySurplus,
        );

        // But not more than 1% over the repayment fees
        expect(
            userThreeAfterLiquidation.minCollateralUSD *
                (userThreeAfterLiquidation.minCollateralUSD * (repaySurplus + 0.01)),
        ).to.be.greaterThan(userThreeAfterLiquidation.collateralUSDProtocol);

        // Ensure all positions are healthy (including user three)
        expect(isAnyUserLiquidatable).to.be.false;

        // Get amount the user got liquidated for
        const actualAmountLiquidated =
            userThreeBeforeLiquidation.krAssetAmountVolative - userThreeAfterLiquidation.krAssetAmountVolative;

        // Liquidation should not be greater than max
        const maxRepayAmount = maxLiquidationValue / (await this.getVolativeKrAssetPrice());
        expect(actualAmountLiquidated).to.equal(maxRepayAmount);

        // User is left with a position
        expect(userThreeAfterLiquidation.debtUSDProtocol).to.be.greaterThan(0);
    });

    it("should cascade liquidations for users with with multiple positions", async function () {
        // Deposit $100,000 worth of volative collateral for userTwo
        await this.Kresko.connect(this.signers.userTwo).depositCollateral(
            this.signers.userTwo.address,
            this.volativeCollateralAsset.address,
            toBig(10_000),
        );
        // Mint $24,000 worth of volative krAsset for userTwo
        await this.Kresko.connect(this.signers.userTwo).mintKreskoAsset(
            this.signers.userTwo.address,
            this.volativeKrAsset.address,
            toBig(2_400),
        );

        // $15,000 of stable collateral
        const collateralDepositAmountStable = toBig(15_000);
        // $250,000 of volative collateral
        const collateralDepositAmountVolative = toBig(25_000);

        // User three deposits $15,000
        await this.Kresko.connect(this.signers.userThree).depositCollateral(
            this.signers.userThree.address,
            this.stableCollateralAsset.address,
            collateralDepositAmountStable,
        );

        // User one deposits $15,000
        await this.Kresko.connect(this.signers.userOne).depositCollateral(
            this.signers.userOne.address,
            this.volativeCollateralAsset.address,
            collateralDepositAmountVolative,
        );

        // Mint various values of stable KrAsset for each user

        // $80,000
        const mintAmountUserOne = toBig(8000);
        // $10,000
        const mintAmountUserTwo = toBig(1000);
        // $7,500
        const mintAmountUserThree = toBig(750);
        const usersAndAmounts: [SignerWithAddress, BigNumber][] = [
            [this.signers.userOne, mintAmountUserOne],
            [this.signers.userTwo, mintAmountUserTwo],
            [this.signers.userThree, mintAmountUserThree],
        ];
        await Promise.all(
            usersAndAmounts.map(async ([user, mintAmount]) => {
                await this.Kresko.connect(user).mintKreskoAsset(user.address, this.stableKrAsset.address, mintAmount);
            }),
        );

        // 50% upswing on a volative KrAsset
        await this.swingVolativeKrAssetPriceBy(1.5);
        // 20% upswing on the stable KrAsset
        await this.swingStableKrAssetPriceBy(1.2);
        // 10% down for stable collateral
        await this.swingStableCollateralPriceBy(0.1);

        const userValues = await this.getUserValues();
        const usersToLiquidate = userValues.filter(user => user.isLiquidatable);

        // All users are under liquidation
        expect(usersToLiquidate.length).to.be.equal(3);

        // But protocol is still solvent
        expect(await this.isProtocolSolvent()).to.be.true;

        // Liquidate users back to healthy positions
        let liquidationsLeft = usersToLiquidate.length;

        while (liquidationsLeft > 0) {
            for (const user of usersToLiquidate) {
                const isStillLiquidatable = await this.Kresko.isAccountLiquidatable(user.userAddress);
                if (isStillLiquidatable) {
                    const mostProfitableLiquidation = await this.getMostProfitableLiquidation(user.userAddress);
                    if (mostProfitableLiquidation) {
                        // Gas usage with 4 assets + unoptimized liquidator: 481k - 532k wei
                        await this.FlashLiquidator.connect(this.signers.liquidator).flashLiquidate(
                            user.userAddress,
                            mostProfitableLiquidation.krAsset,
                            mostProfitableLiquidation.collateralAsset,
                        );
                    }
                }
            }
            const values = await this.getUserValues();
            liquidationsLeft = values.filter(user => user.isLiquidatable).length;
        }

        const userValuesAfterLiquidation = await this.getUserValues();

        // Ensure no liqudations are left
        expect(liquidationsLeft).to.equal(0);

        // Protocol is solvent
        expect(await this.isProtocolSolvent()).to.be.true;

        // Inspect liquidations
        const minCollateralTotalUSD = userValuesAfterLiquidation.reduce((a, b) => a + b.minCollateralUSD, 0);
        const collateralProtocolTotalUSD = userValuesAfterLiquidation.reduce((a, b) => a + b.collateralUSDProtocol, 0);

        const surplusRepay = fromBig(await this.Kresko.burnFee());
        // Ensure all positions were repaid with a surplus.
        expect(minCollateralTotalUSD).to.be.lessThanOrEqual(
            collateralProtocolTotalUSD - collateralProtocolTotalUSD * surplusRepay,
        );

        // But not more than 1%
        expect(minCollateralTotalUSD + minCollateralTotalUSD * (surplusRepay + 0.01)).to.be.greaterThan(
            collateralProtocolTotalUSD,
        );
    });
});
