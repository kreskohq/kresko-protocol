import { expect } from "chai";

export function shouldBehaveLikeFeedsRegistry(): void {
    it("should fetch price correctly", async function () {
        await this.oracles[0].connect(this.signers.admin).transmit(100, true);
        await this.feedsregistry.connect(this.signers.admin).addUsdFeed(this.usd, this.oracles[0].address);
        expect(await this.feedsregistry.connect(this.signers.admin).getPriceFromSymbol("USD")).to.equal(100);
    });
}
