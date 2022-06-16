import { expect } from "chai";
import { TEST_VALUE } from "../types";

export function shouldBehaveLikeFluxPriceFeed(): void {
    it("should return latestAnswer once it's changed", async function () {
        expect(await this.pricefeed.connect(this.signers.admin).latestAnswer()).to.equal(0);
        await this.pricefeed.connect(this.signers.admin).transmit(TEST_VALUE);
        expect(await this.pricefeed.connect(this.signers.admin).latestAnswer()).to.equal(TEST_VALUE);
    });
    it("should not allow nonadmin to change value", async function () {
        expect(await this.pricefeed.connect(this.signers.admin).latestAnswer()).to.equal(0);
        try {
            await this.pricefeed.connect(this.signers.nonadmin).transmit(TEST_VALUE);
        } catch (e) {
            if (!(e instanceof Error)) return;
            expect(e.message).to.equal(
                "VM Exception while processing transaction: reverted with reason string 'Caller is not a validator'",
            );
            expect(await this.pricefeed.connect(this.signers.admin).latestAnswer()).to.equal(0);
        }
    });
    it("should return description", async function () {
        expect(await this.pricefeed.connect(this.signers.admin).description()).to.equal("My description");
    });
    it("should return decimals", async function () {
        expect(await this.pricefeed.connect(this.signers.admin).decimals()).to.equal(6);
    });
    it("should return latestRoundData correctly", async function () {
        await this.pricefeed.connect(this.signers.admin).transmit(TEST_VALUE);
        const roundDataCall = await this.pricefeed.connect(this.signers.admin).latestRoundData();
        const roundData = {
            roundId: roundDataCall[0].toNumber(),
            answer: roundDataCall[1].toNumber(),
            startedAt: roundDataCall[2].toNumber(),
            updatedAt: roundDataCall[3].toNumber(),
            answeredInRound: roundDataCall[4].toNumber(),
        };
        expect(roundData.roundId).to.gt(0);
        expect(roundData.startedAt).to.gt(0);
        expect(roundData.startedAt).to.equal(roundData.updatedAt);
        expect(roundData.answeredInRound).to.equal(roundData.roundId);
        expect(roundData.answer).to.equal(TEST_VALUE);
    });
    it("should return getRoundData correctly", async function () {
        await this.pricefeed.connect(this.signers.admin).transmit(TEST_VALUE);
        const roundDataCall = await this.pricefeed.connect(this.signers.admin).getRoundData(1);
        const roundData = {
            roundId: roundDataCall[0].toNumber(),
            answer: roundDataCall[1].toNumber(),
            startedAt: roundDataCall[2].toNumber(),
            updatedAt: roundDataCall[3].toNumber(),
            answeredInRound: roundDataCall[4].toNumber(),
        };
        expect(roundData.roundId).to.gt(0);
        expect(roundData.startedAt).to.gt(0);
        expect(roundData.startedAt).to.equal(roundData.updatedAt);
        expect(roundData.answeredInRound).to.equal(roundData.roundId);
        expect(roundData.answer).to.equal(TEST_VALUE);
    });
    it("should return getAnswer correctly", async function () {
        await this.pricefeed.connect(this.signers.admin).transmit(TEST_VALUE);
        expect(await this.pricefeed.connect(this.signers.admin).getAnswer(1)).to.equal(TEST_VALUE);
    });
    it("should return latestRound correctly", async function () {
        await this.pricefeed.connect(this.signers.admin).transmit(TEST_VALUE);
        expect(await this.pricefeed.connect(this.signers.admin).latestRound()).to.equal(1);
    });
}
