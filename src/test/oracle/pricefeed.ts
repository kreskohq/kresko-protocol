import { expect } from "@test/chai";
import { withFixture } from "@utils/test";
import hre from "hardhat";


describe.only("Flux Pricefeed", function () {
    let addr: Addresses;   
    const TEST_VALUE = 100;     
 
    before(async function () {   
        addr = await hre.getAddresses();
        this.pricefeed;
    });
    withFixture(["minter-test", "krAsset"]);
    beforeEach(async function () {        
        // Deploy one price feed
        const name : string = "TEST";
        const decimals: number = 8;
        const descriptionFeed: string = "Test description";
        const feed: FluxPriceFeed = await hre.run("deployone:fluxpricefeed", {
            name,
            decimals,
            description: descriptionFeed,
        });
        this.pricefeed = feed
    });

    describe("#test", () => {
        it("should return latestAnswer once it's changed", async function () {
            expect(await this.pricefeed.latestAnswer()).to.equal(0);
            await this.pricefeed.transmit(TEST_VALUE, true, { from: addr.deployer});
            expect(await this.pricefeed.latestAnswer()).to.equal(TEST_VALUE);
        });

        it("should return marketOpen once it's changed", async function () {
            expect(await this.pricefeed.latestMarketOpen()).to.equal(false);
            await this.pricefeed.transmit(0, true, { from: addr.deployer});
            expect(await this.pricefeed.latestMarketOpen()).to.equal(true);
        });

        it("should not allow nonadmin to change values", async function () {
            expect(await this.pricefeed.latestAnswer()).to.equal(0);
            try {
                await this.pricefeed.transmit(TEST_VALUE, true, { from: addr.userOne});
            } catch (e) {
                if (!(e instanceof Error)) return;
                expect(e.message).to.equal(
                    "Contract with a Signer cannot override from (operation=\"overrides.from\", code=UNSUPPORTED_OPERATION, version=contracts/5.7.0)",
                );
                expect(await this.pricefeed.latestAnswer()).to.equal(0);
                expect(await this.pricefeed.latestMarketOpen()).to.equal(false);
            }
        });

        it("should return description", async function () {
            expect(await this.pricefeed.description()).to.equal("Test description");
        });

        it("should return decimals", async function () {
            expect(await this.pricefeed.decimals()).to.equal(8);
        });

        it("should return latestRoundData correctly", async function () {
            await this.pricefeed.transmit(TEST_VALUE, true, { from: addr.deployer});
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
            await this.pricefeed.transmit(TEST_VALUE, true, { from: addr.deployer});
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
            await this.pricefeed.transmit(TEST_VALUE, true, { from: addr.deployer});
            expect(await this.pricefeed.getAnswer(1)).to.equal(TEST_VALUE);
        });

        it("should return marketOpen correctly", async function () {
            await this.pricefeed.transmit(TEST_VALUE, true, { from: addr.deployer});
            expect(await this.pricefeed.getMarketOpen(1)).to.equal(true);
        });

        it("should return latestRound correctly", async function () {
            await this.pricefeed.transmit(TEST_VALUE, true, { from: addr.deployer});
            expect(await this.pricefeed.latestRound()).to.equal(1);
        });
    });
});