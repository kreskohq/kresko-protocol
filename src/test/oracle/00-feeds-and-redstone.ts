import { TASK_DEPLOY_PRICE_FEED } from "@tasks";
import { expect } from "@test/chai";
import { withFixture, defaultCollateralArgs, Error, wrapContractWithSigner } from "@utils/test";
import hre from "hardhat";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
import { toBig } from "@kreskolabs/lib";
import { Kresko, MockSequencerUptimeFeed } from "types/typechain";

describe("Oracle", () => {
    withFixture(["minter-test"]);

    const TEST_VALUE = 100;

    beforeEach(async function () {
        // Deploy one price feed
        const name: string = "TEST";
        const decimals: number = 8;
        const descriptionFeed: string = "Test description";

        const feed: FluxPriceFeed = await hre.run(TASK_DEPLOY_PRICE_FEED, {
            name,
            decimals,
            description: descriptionFeed,
            log: false,
        });
        this.deployer = await hre.ethers.getNamedSigner("deployer");
        this.userOne = await hre.ethers.getNamedSigner("userOne");
        this.pricefeed = feed;
    });

    describe("FluxPriceFeed", () => {
        it("should initialize timestamp value once the initial answer is submitted", async function () {
            expect(await this.pricefeed.latestTimestamp()).to.equal(0);
            await this.pricefeed.transmit(TEST_VALUE, true, {
                from: this.deployer.address,
            });
            expect(Number(await this.pricefeed.latestTimestamp())).to.be.greaterThan(0);
        });

        it.skip("should return latestAnswer once it's changed", async function () {
            expect(await this.pricefeed.latestAnswer()).to.equal(0);
            await this.pricefeed.transmit(TEST_VALUE, true, {
                from: this.deployer.address,
            });
            expect(await this.pricefeed.latestAnswer()).to.equal(TEST_VALUE);
        });

        it.skip("should return marketOpen once it's changed", async function () {
            expect(await this.pricefeed.latestMarketOpen()).to.equal(false);
            await this.pricefeed.transmit(0, true, { from: this.deployer.address });
            expect(await this.pricefeed.latestMarketOpen()).to.equal(true);
        });

        it.skip("should not allow non-validator to change values", async function () {
            expect(await this.pricefeed.latestAnswer()).to.equal(0);
            await expect(this.pricefeed.connect(this.userOne).transmit(TEST_VALUE, true)).to.be.revertedWith(
                "Caller is not a validator",
            );
            expect(await this.pricefeed.latestAnswer()).to.equal(0);
            expect(await this.pricefeed.latestMarketOpen()).to.equal(false);
        });

        it("should return description", async function () {
            expect(await this.pricefeed.description()).to.equal("Test description");
        });

        it("should return decimals", async function () {
            expect(await this.pricefeed.decimals()).to.equal(8);
        });

        it.skip("should return latestRoundData correctly", async function () {
            await this.pricefeed.transmit(TEST_VALUE, true, {
                from: this.deployer.address,
            });
            const roundDataCall = await this.pricefeed.latestRoundData();
            const roundData = {
                roundId: roundDataCall[0].toNumber(),
                answer: roundDataCall[1].toNumber(),
                marketOpen: roundDataCall[2].valueOf(),
                startedAt: roundDataCall[3].toNumber(),
                updatedAt: roundDataCall[4].toNumber(),
                answeredInRound: roundDataCall[5].toNumber(),
            };
            expect(roundData.roundId).to.gt(0);
            expect(roundData.startedAt).to.gt(0);
            expect(roundData.startedAt).to.equal(roundData.updatedAt);
            expect(roundData.answeredInRound).to.equal(roundData.roundId);
            expect(roundData.answer).to.equal(TEST_VALUE);
            expect(roundData.marketOpen).to.equal(true);
        });

        it("should return getRoundData correctly", async function () {
            await this.pricefeed.transmit(TEST_VALUE, true, {
                from: this.deployer.address,
            });
            const roundDataCall = await this.pricefeed.getRoundData(1);
            const roundData = {
                roundId: roundDataCall[0].toNumber(),
                answer: roundDataCall[1].toNumber(),
                marketOpen: roundDataCall[2].valueOf(),
                startedAt: roundDataCall[3].toNumber(),
                updatedAt: roundDataCall[4].toNumber(),
                answeredInRound: roundDataCall[5].toNumber(),
            };
            expect(roundData.roundId).to.gt(0);
            expect(roundData.startedAt).to.gt(0);
            expect(roundData.startedAt).to.equal(roundData.updatedAt);
            expect(roundData.answeredInRound).to.equal(roundData.roundId);
            expect(roundData.answer).to.equal(TEST_VALUE);
            expect(roundData.marketOpen).to.equal(true);
        });

        it("should return getAnswer correctly", async function () {
            await this.pricefeed.transmit(TEST_VALUE, true, {
                from: this.deployer.address,
            });
            expect(await this.pricefeed.getAnswer(1)).to.equal(TEST_VALUE);
        });

        it("should return marketOpen correctly", async function () {
            await this.pricefeed.transmit(TEST_VALUE, true, {
                from: this.deployer.address,
            });
            expect(await this.pricefeed.getMarketOpen(1)).to.equal(true);
        });

        it("should return latestRound correctly", async function () {
            await this.pricefeed.transmit(TEST_VALUE, true, {
                from: this.deployer.address,
            });
            expect(await this.pricefeed.latestRound()).to.equal(1);
        });
    });

    describe("Redstone", () => {
        let redstoneCollateral: TestCollateral;
        let mockSequencerUptimeFeed: MockSequencerUptimeFeed;

        beforeEach(async function () {
            const { ethers } = hre;
            redstoneCollateral = this.collaterals!.find(c => c.deployArgs!.name === defaultCollateralArgs.name)!;

            /// set initial collateral price
            redstoneCollateral.setPrice(10);

            const initialBalance = toBig(100000);
            await redstoneCollateral.mocks!.contract.setVariable("_balances", {
                [hre.users.userOne.address]: initialBalance,
            });
            await redstoneCollateral.mocks!.contract.setVariable("_allowances", {
                [hre.users.userOne.address]: {
                    [hre.Diamond.address]: initialBalance,
                },
            });
            const MockSequencerUptimeFeed = await ethers.getContractFactory("MockSequencerUptimeFeed");
            mockSequencerUptimeFeed = await MockSequencerUptimeFeed.deploy();

            this.depositArgs = {
                user: hre.users.userOne,
                asset: redstoneCollateral,
                amount: toBig(1),
            };

            await hre.Diamond.connect(this.depositArgs.user).depositCollateral(
                this.depositArgs.user.address,
                redstoneCollateral.address,
                this.depositArgs.amount,
            );

            // check initial conditions
            expect(await redstoneCollateral.getPrice()).to.equal(toBig(10, 8), "collateral price should be $10");
            // As redstone price is 0, will use chainlink price = 10
            // so collateral value = $10 * 1 = $10
            expect(
                await wrapContractWithSigner(hre.Diamond, hre.users.deployer).getAccountCollateralValue(
                    hre.users.userOne.address,
                ),
            ).to.equal(toBig(10, 8), "collateral value should be $10");
        });

        it("should get redstone price when chainlink price = 0", async function () {
            /// set chainlink price to 0
            redstoneCollateral.setPrice(0);

            const redstoneCollateralPrice = 20;

            const redstoneDiamond: Kresko = WrapperBuilder.wrap(
                hre.Diamond.connect(this.deployer),
            ).usingSimpleNumericMock({
                mockSignersCount: 1,
                timestampMilliseconds: Date.now(),
                dataPoints: [{ dataFeedId: "Collateral", value: redstoneCollateralPrice }],
            }) as Kresko;

            // so collateral value = $20 * 1 = $20
            expect(await redstoneDiamond.getAccountCollateralValue(hre.users.userOne.address)).to.equal(
                toBig(redstoneCollateralPrice, 8),
                "collateral value should be $20",
            );
        });

        it("should get chainlink price when price +- oracleDeviationPct of redstone price ", async function () {
            /// set chainlink price to 12
            redstoneCollateral.setPrice(12);

            const redstoneCollateralPrice = 11;

            const redstoneDiamond: Kresko = WrapperBuilder.wrap(
                hre.Diamond.connect(this.deployer),
            ).usingSimpleNumericMock({
                mockSignersCount: 1,
                timestampMilliseconds: Date.now(),
                dataPoints: [{ dataFeedId: "Collateral", value: redstoneCollateralPrice }],
            }) as Kresko;

            // so collateral value = $12 * 1 = $12
            expect(await redstoneDiamond.getAccountCollateralValue(hre.users.userOne.address)).to.equal(
                toBig(12, 8),
                "collateral value should be $20",
            );
        });

        it("should revert if price deviates too much", async function () {
            /// set chainlink price to 20
            redstoneCollateral.setPrice(20);

            const redstoneCollateralPrice = 10;
            const redstoneDiamond: Kresko = WrapperBuilder.wrap(
                hre.Diamond.connect(this.deployer),
            ).usingSimpleNumericMock({
                mockSignersCount: 1,
                timestampMilliseconds: Date.now(),
                dataPoints: [{ dataFeedId: "Collateral", value: redstoneCollateralPrice }],
            }) as Kresko;

            // should revert if price deviates more than oracleDeviationPct
            await expect(redstoneDiamond.getAccountCollateralValue(hre.users.userOne.address)).to.be.revertedWith(
                Error.ORACLE_PRICE_UNSTABLE,
            );
            redstoneCollateral.setPrice(10);
        });

        it("should return redstone price if sequencer is down", async function () {
            /// set chainlink price to 5
            redstoneCollateral.setPrice(5);

            const redstoneCollateralPrice = 200;
            const redstoneDiamond: Kresko = WrapperBuilder.wrap(
                hre.Diamond.connect(this.deployer),
            ).usingSimpleNumericMock({
                mockSignersCount: 1,
                timestampMilliseconds: Date.now(),
                dataPoints: [{ dataFeedId: "Collateral", value: redstoneCollateralPrice }],
            }) as Kresko;

            /// set sequencer uptime feed address
            await redstoneDiamond.updateSequencerUptimeFeed(mockSequencerUptimeFeed.address);

            // should return redstone price if sequencer is down
            expect(await redstoneDiamond.getAccountCollateralValue(hre.users.userOne.address)).to.be.equal(
                toBig(redstoneCollateralPrice, 8),
                "collateral value should be $200",
            );

            redstoneCollateral.setPrice(10);
        });
    });
});
