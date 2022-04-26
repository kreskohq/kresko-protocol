import { expect } from "chai";
import { TEST_VALUE } from "../types";

export function shouldBehaveLikeFluxPriceFeed(): void {
    it("should return latestAnswer once it's changed", async function () {
        expect(await this.pricefeed.connect(this.signers.admin).latestAnswer()).to.equal(0);
        await this.pricefeed.connect(this.signers.admin).transmit(TEST_VALUE, true);
        expect(await this.pricefeed.connect(this.signers.admin).latestAnswer()).to.equal(TEST_VALUE);
    });
    it("should return marketOpen once it's changed", async function () {
        expect(await this.pricefeed.connect(this.signers.admin).latestMarketOpen()).to.equal(false);
        await this.pricefeed.connect(this.signers.admin).transmit(0, true);
        expect(await this.pricefeed.connect(this.signers.admin).latestMarketOpen()).to.equal(true);
    });
    it("should not allow nonadmin to change values", async function () {
        expect(await this.pricefeed.connect(this.signers.admin).latestAnswer()).to.equal(0);
        try {
            await this.pricefeed.connect(this.signers.nonadmin).transmit(TEST_VALUE, true);
        } catch (e) {
            if (!(e instanceof Error)) return;
            expect(e.message).to.equal(
                "VM Exception while processing transaction: reverted with reason string 'Caller is not a validator'",
            );
            expect(await this.pricefeed.connect(this.signers.admin).latestAnswer()).to.equal(0);
            expect(await this.pricefeed.connect(this.signers.admin).latestAnswer()).to.equal(false);
        }
    });
    it("should return description", async function () {
        expect(await this.pricefeed.connect(this.signers.admin).description()).to.equal("My description");
    });
    it("should return decimals", async function () {
        expect(await this.pricefeed.connect(this.signers.admin).decimals()).to.equal(6);
    });
    it("should return latestRoundData correctly", async function () {
        await this.pricefeed.connect(this.signers.admin).transmit(TEST_VALUE, true);
        const roundDataCall = await this.pricefeed.connect(this.signers.admin).latestRoundData();
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
        await this.pricefeed.connect(this.signers.admin).transmit(TEST_VALUE, true);
        const roundDataCall = await this.pricefeed.connect(this.signers.admin).getRoundData(1);
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
        await this.pricefeed.connect(this.signers.admin).transmit(TEST_VALUE, true);
        expect(await this.pricefeed.connect(this.signers.admin).getAnswer(1)).to.equal(TEST_VALUE);
    });
    it("should return marketOpenb correctly", async function () {
        await this.pricefeed.connect(this.signers.admin).transmit(TEST_VALUE, true);
        expect(await this.pricefeed.connect(this.signers.admin).getMarketOpen(1)).to.equal(true);
    });
    it("should return latestRound correctly", async function () {
        await this.pricefeed.connect(this.signers.admin).transmit(TEST_VALUE, true);
        expect(await this.pricefeed.connect(this.signers.admin).latestRound()).to.equal(1);
    });
}
