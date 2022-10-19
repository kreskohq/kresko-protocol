import { expect } from "@test/chai";
import { withFixture } from "@utils/test";
import hre from "hardhat";

describe("Flux price aggregator", function () {
    let addr: Addresses;    
    before(async function () {        
        addr = await hre.getAddresses();
        this.oracles = [] as FluxPriceFeed[];
        this.aggregator;
    });
    withFixture(["minter-test", "krAsset"]);
    beforeEach(async function () {        
        this.usd = "0x5553440000000000000000000000000000000000000000000000000000000000";

        // Deploy three price feeds
        for (let i = 0; i < 3; i++) {
            const name : string = "TEST" + i;
            const decimals: number = 8;
            const descriptionFeed: string = "Test description";

            const feed: FluxPriceFeed = await hre.run("deployone:fluxpricefeed", {
                name,
                decimals,
                description: descriptionFeed,
            });
            this.oracles.push(feed)
        }

        // Deploy aggregator from the 3 price feeds
        const decimalsAggregator: number = 8;
        const description: string = "TEST";
        const oracles = this.oracles.map(oracle => oracle.address);
        const deployedAggregator: FluxPriceAggregator = await hre.run("deployone:fluxpriceaggregator", {
            oracles: oracles.toString(),
            decimals: decimalsAggregator.toString(),
            description
        });

        console.log("deployedAggregator:", deployedAggregator)
        this.aggregator = deployedAggregator;
    });

    describe("functionality", () => {
        it("should aggregate latest prices from 1 oracle, ignoring uninitialized oracles", async function () {
            const price = 100;
            await this.oracles[0].transmit(price, true, {
                from: addr.deployer,
            });

            expect(await this.aggregator.latestTimestamp()).to.be.equal(0);
            expect(await this.aggregator.latestAnswer()).to.be.equal(0);

            await this.priceaggregator.connect(this.signers.admin).updatePrices();

            expect(await this.aggregator.latestTimestamp().toNumber()).to.be.greaterThan(0);
            expect(await this.aggregator.latestAnswer()).to.be.equal(price);
        });

        it("should aggregate latest prices from 2 oracles, ignoring uninitialized oracles", async function () {
            await this.oracles[0].transmit(100, true, {
                from: addr.deployer,
            });
            await this.oracles[2].transmit(300, true, {
                from: addr.deployer,
            });
            expect(await this.aggregator.latestAnswer()).to.equal(0);
            expect(await this.aggregator.latestTimestamp().toNumber()).to.equal(0);
    
            await this.priceaggregator.updatePrices();
    
            expect(await this.aggregator.latestAnswer()).to.equal(200);
            expect((await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).toNumber()).to.greaterThan(0);
        });

        it("should aggregate latest prices from 3+ oracles", async function () {
            await this.oracles[0].transmit(100, true, {
                from: addr.deployer,
            });

            await this.oracles[1].transmit(125, true, {
                from: addr.deployer,
            });

            await this.oracles[2].transmit(300, true, {
                from: addr.deployer,
            });

            expect(await this.aggregator.latestTimestamp().toNumber()).to.equal(0);
    
            await this.priceaggregator.connect(this.signers.admin).updatePrices();
    
           expect(await this.aggregator.latestAnswer()).to.equal(125);
            expect((await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).toNumber()).to.greaterThan(0);
        });

        it("should determine market open/closed from 1 oracle, ignoring uninitialized oracles", async function () {
            await this.oracles[0].transmit(100, true, {
                from: addr.deployer,
            });
            expect(await this.aggregator.latestTimestamp().toNumber()).to.equal(0);
            expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(false);
    
            await this.priceaggregator.connect(this.signers.admin).updatePrices();
    
           expect(await this.aggregator.latestAnswer()).to.equal(100);
            expect((await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).toNumber()).to.greaterThan(0);
            expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(true);
        });
        it("should determine market open/closed from 2 oracles, ignoring uninitialized oracles", async function () {
            await this.oracles[0].transmit(100, true, {
                from: addr.deployer,
            });
           await this.oracles[1].transmit(150, true, {
            from: addr.deployer,
        });
            expect(await this.aggregator.latestTimestamp().toNumber()).to.equal(0);
            expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(false);
    
            await this.priceaggregator.connect(this.signers.admin).updatePrices();
    
           expect(await this.aggregator.latestAnswer()).to.equal(125);
            expect((await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).toNumber()).to.greaterThan(0);
            expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(true);
        });
        it("should evaluate split 50-50 decision on market as market closed, ignoring uninitialized oracles", async function () {
            await this.oracles[0].transmit(100, true, {
                from: addr.deployer,
            });
           await this.oracles[1].transmit(150, true, {
            from: addr.deployer,
        });
            expect(await this.aggregator.latestTimestamp().toNumber()).to.equal(0);
            expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(false);
    
            await this.priceaggregator.connect(this.signers.admin).updatePrices();
    
           expect(await this.aggregator.latestAnswer()).to.equal(125);
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
    
            await this.oracles[0].transmit(100, false, {
                from: addr.deployer,
            });
            await this.oracles[1].transmit(120, true, {
                from: addr.deployer,
            });
            await this.oracles[2].transmit(121, true, {
                from: addr.deployer,
            });
            expect(await this.aggregator.latestTimestamp().toNumber()).to.equal(0);
            expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(false);
    
            await this.priceaggregator.connect(this.signers.admin).updatePrices();
    
            expect(await this.aggregator.latestAnswer()).to.equal(120);
            expect((await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).toNumber()).to.greaterThan(0);
            expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(true);
        });

        // it("should ignore negative prices, not including them in price aggregation or market open/closed voting", async function () {
        //     await this.oracles[0].transmit(100, true, {
        //         from: addr.deployer,
        //     });
        //     await this.oracles[1].transmit(-20, false, {
        //         from: addr.deployer,
        //     });

        //     expect(await this.aggregator.latestTimestamp().toNumber()).to.equal(0);
    
        //     await this.priceaggregator.connect(this.signers.admin).updatePrices();
    
        //    expect(await this.aggregator.latestAnswer()).to.equal(100);
        //     expect((await this.priceaggregator.connect(this.signers.admin).latestTimestamp()).toNumber()).to.greaterThan(0);
        //     expect(await this.priceaggregator.connect(this.signers.admin).latestMarketOpen()).to.equal(true);
        // });

        // it("should allow deployer to change delay", async function () {
        //     await this.priceaggregator.connect(this.signers.admin).setDelay(12345);
        //     expect(await this.priceaggregator.connect(this.signers.admin).minDelay()).to.equal(12345);
        // });

        // it("should allow deployer to change oracles", async function () {
        //     // check oracle addresses
        //     expect(await this.priceaggregator.connect(this.signers.admin).oracles(0)).to.equal(this.oracles[0].address);
        //     expect(await this.priceaggregator.connect(this.signers.admin).oracles(1)).to.equal(this.oracles[1].address);
        //     expect(await this.priceaggregator.connect(this.signers.admin).oracles(2)).to.equal(this.oracles[2].address);
    
        //     // remove 3rd oracle
        //     const newOracles: string[] = [this.oracles[0].address, this.oracles[1].address];
        //     await this.priceaggregator.connect(this.signers.admin).setOracles(newOracles);
    
        //     // check oracle addresses again
        //     expect(await this.priceaggregator.connect(this.signers.admin).oracles(0)).to.equal(this.oracles[0].address);
        //     expect(await this.priceaggregator.connect(this.signers.admin).oracles(1)).to.equal(this.oracles[1].address);
        //     try {
        //         // third oracle should not exist anymore
        //         expect(await this.priceaggregator.connect(this.signers.admin).oracles(2)).to.equal(this.oracles[2].address);
        //     } catch (e: unknown) {
        //         if (e instanceof Error) {
        //             expect(e.message).to.equal(`Transaction reverted without a reason string`);
        //         }
        //     }
        // });
    });
});