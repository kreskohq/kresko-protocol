import { TASK_DEPLOY_PRICE_FEED } from "@tasks";
import { expect } from "@test/chai";
import { withFixture } from "@utils/test";
import hre from "hardhat";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
import { fromBig, getPriceFromTwelveData } from "@kreskolabs/lib";
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

        it("should return latestRoundData correctly", async function () {
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

    describe.only("Redstone", async () => {
        it("should get a price", async function () {
            const wrapped = WrapperBuilder.wrap(hre.Diamond).usingDataService(
                {
                    dataServiceId: "redstone-stocks-demo",
                    dataFeeds: ["TSLA"],
                    uniqueSignersCount: 1,
                },
                ["https://d33trozg86ya9x.cloudfront.net"],
            );

            const price = await wrapped.priceIsRight();
            const priceTD = await getPriceFromTwelveData("TSLA");
            console.log("Redstone Price", fromBig(price, 8));
            console.log("Price TwelveData", priceTD);
            expect(price).gt(0);
        });
    });
});
