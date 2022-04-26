import { expect } from "chai";

export function shouldBehaveLikeFluxPriceAggregator(): void {
    it("should aggregate latest prices from oracles", async function () {
        await this.oracles[0].connect(this.signers.admin).transmit(100, true);
        await this.oracles[1].connect(this.signers.admin).transmit(150, true);
        await this.oracles[2].connect(this.signers.admin).transmit(300, true);
        expect(await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).to.equal(0);
        await this.priceaggregator.connect(this.signers.admin).updatePrices();
        expect(await this.priceaggregator.connect(this.signers.admin).latestAnswer()).to.equal(183);
        expect((await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).toNumber()).to.greaterThan(0);
    });
    it("should count uninitialized prices as zero", async function () {
        await this.oracles[0].connect(this.signers.admin).transmit(100, true);
        await this.oracles[1].connect(this.signers.admin).transmit(75, true);
        await this.priceaggregator.connect(this.signers.admin).updatePrices();
        expect(await this.priceaggregator.connect(this.signers.admin).latestAnswer()).to.equal(58);
    });
    it("should allow deployer to change delay", async function () {
        await this.priceaggregator.connect(this.signers.admin).setDelay(12345);
        expect(await this.priceaggregator.connect(this.signers.admin).minDelay()).to.equal(12345);
    });
    it("should allow deployer to change oracles", async function () {
        // check oracle addresses
        expect(await this.priceaggregator.connect(this.signers.admin).oracles(0)).to.equal(this.oracles[0].address);
        expect(await this.priceaggregator.connect(this.signers.admin).oracles(1)).to.equal(this.oracles[1].address);
        expect(await this.priceaggregator.connect(this.signers.admin).oracles(2)).to.equal(this.oracles[2].address);

        // remove 3rd oracle
        const newOracles: string[] = [this.oracles[0].address, this.oracles[1].address];
        await this.priceaggregator.connect(this.signers.admin).setOracles(newOracles);

        // check oracle addresses again
        expect(await this.priceaggregator.connect(this.signers.admin).oracles(0)).to.equal(this.oracles[0].address);
        expect(await this.priceaggregator.connect(this.signers.admin).oracles(1)).to.equal(this.oracles[1].address);
        try {
            // third oracle should not exist anymore
            expect(await this.priceaggregator.connect(this.signers.admin).oracles(2)).to.equal(this.oracles[2].address);
        } catch (e: unknown) {
            if (e instanceof Error) {
                expect(e.message).to.equal(`Transaction reverted without a reason string`);
            }
        }
    });
}
