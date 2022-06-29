import { expect } from "chai";

export function shouldBehaveLikeFluxPriceAggregator(): void {
    it("should aggregate latest prices from 1 oracle, ignoring uninitialized oracles", async function () {
        await this.oracles[0].connect(this.signers.admin).transmit(100, true);
        expect(await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).to.equal(0);

        await this.priceaggregator.connect(this.signers.admin).updatePrices();

        expect(await this.priceaggregator.connect(this.signers.admin).latestAnswer()).to.equal(100);
        expect((await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).toNumber()).to.greaterThan(0);
    });
    it("should aggregate latest prices from 2 oracles, ignoring uninitialized oracles", async function () {
        await this.oracles[0].connect(this.signers.admin).transmit(100, true);
        await this.oracles[2].connect(this.signers.admin).transmit(300, true);
        expect(await this.priceaggregator.connect(this.signers.admin).latestAnswer()).to.equal(0);
        expect(await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).to.equal(0);

        await this.priceaggregator.connect(this.signers.admin).updatePrices();

        expect(await this.priceaggregator.connect(this.signers.admin).latestAnswer()).to.equal(200);
        expect((await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).toNumber()).to.greaterThan(0);
    });
    it("should aggregate latest prices from 3+ oracles", async function () {
        await this.oracles[0].connect(this.signers.admin).transmit(100, true);
        await this.oracles[1].connect(this.signers.admin).transmit(125, true);
        await this.oracles[2].connect(this.signers.admin).transmit(300, true);
        expect(await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).to.equal(0);

        await this.priceaggregator.connect(this.signers.admin).updatePrices();

        expect(await this.priceaggregator.connect(this.signers.admin).latestAnswer()).to.equal(125);
        expect((await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).toNumber()).to.greaterThan(0);
    });
    it("should determine market open/closed from 1 oracle, ignoring uninitialized oracles", async function () {
        await this.oracles[0].connect(this.signers.admin).transmit(100, true);
        expect(await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).to.equal(0);
        expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(false);

        await this.priceaggregator.connect(this.signers.admin).updatePrices();

        expect(await this.priceaggregator.connect(this.signers.admin).latestAnswer()).to.equal(100);
        expect((await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).toNumber()).to.greaterThan(0);
        expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(true);
    });
    it("should determine market open/closed from 2 oracles, ignoring uninitialized oracles", async function () {
        await this.oracles[0].connect(this.signers.admin).transmit(100, true);
        await this.oracles[1].connect(this.signers.admin).transmit(150, true);
        expect(await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).to.equal(0);
        expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(false);

        await this.priceaggregator.connect(this.signers.admin).updatePrices();

        expect(await this.priceaggregator.connect(this.signers.admin).latestAnswer()).to.equal(125);
        expect((await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).toNumber()).to.greaterThan(0);
        expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(true);
    });
    it("should evaluate split 50-50 decision on market as market closed, ignoring uninitialized oracles", async function () {
        await this.oracles[0].connect(this.signers.admin).transmit(100, true);
        await this.oracles[1].connect(this.signers.admin).transmit(150, false);
        expect(await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).to.equal(0);
        expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(false);

        await this.priceaggregator.connect(this.signers.admin).updatePrices();

        expect(await this.priceaggregator.connect(this.signers.admin).latestAnswer()).to.equal(125);
        expect((await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).toNumber()).to.greaterThan(0);
        expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(false);
    });
    it("should determine market open/closed from 3+ oracles", async function () {
        // Consider situation:
        //      - Price changes 20% overnight and on open majority of oracles post prices and updatesPrices is called.
        //      - The market is considered open, but yesterday's closing price from oracles that haven't posted today
        //        yet is still considered in the median calculation.
        //      
        //      Oracles at close:                       [a, b, c, d, e]
        //      Closing prices:                         [100, 100, 100, 100, 100], [closed, closed, closed, closed, closed]
        //      At open when update prices is called:   [100, 100, 120, 120, 121], [closed, closed, open, open, open]
        //
        //      Outcome is valid: market is open with price 120.

        await this.oracles[0].connect(this.signers.admin).transmit(100, false);
        await this.oracles[1].connect(this.signers.admin).transmit(120, true);
        await this.oracles[2].connect(this.signers.admin).transmit(121, true);
        expect(await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).to.equal(0);
        expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(false);

        await this.priceaggregator.connect(this.signers.admin).updatePrices();

        expect(await this.priceaggregator.connect(this.signers.admin).latestAnswer()).to.equal(120);
        expect((await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).toNumber()).to.greaterThan(0);
        expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(true);
    });
    it("should ignore negative prices, not including them in price aggregation or market open/closed voting", async function () {
        await this.oracles[0].connect(this.signers.admin).transmit(100, true);
        await this.oracles[1].connect(this.signers.admin).transmit(-20, false);
        expect(await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).to.equal(0);

        await this.priceaggregator.connect(this.signers.admin).updatePrices();

        expect(await this.priceaggregator.connect(this.signers.admin).latestAnswer()).to.equal(100);
        expect((await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).toNumber()).to.greaterThan(0);
        expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(true);
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
