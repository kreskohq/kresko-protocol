import { expect } from "@test/chai";
import { withFixture } from "@utils/test";
import hre from "hardhat";

describe.only("Flux price aggregator", function () {
    let addr: Addresses;
    const oracles = [] as FluxPriceFeed[];
    before(async function () {        
        addr = await hre.getAddresses();
        this.aggregator;
    });
    withFixture(["minter-test", "krAsset"]);
    beforeEach(async function () {        
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
            oracles.push(feed)
        }

        // Deploy aggregator from the 3 price feeds
        const decimalsAggregator: number = 8;
        const description: string = "TEST";
        const pricefeeds = oracles.map(oracle => oracle.address);
        const deployedAggregator: FluxPriceAggregator = await hre.run("test:deployone:fluxpriceaggregator", {
            oracles: pricefeeds.toString(),
            decimals: decimalsAggregator.toString(),
            description
        });
        this.aggregator = deployedAggregator;

        this.oracles = oracles;
    });

    // initializeAllPricefeeds is a helper function that initializes all price feeds
    async function initializeAllPricefeeds() {
        await oracles[0].transmit(0, false, {
            from: addr.deployer,
        });
        await oracles[1].transmit(0, false, {
            from: addr.deployer,
        });
        await oracles[2].transmit(0, false, {
            from: addr.deployer,
        });
    }

    describe("Basic functionality", () => {
        it("should update latest timestamp when the updatePrices() method is called", async function () {
            await initializeAllPricefeeds();

            expect(Number(await this.aggregator.latestTimestamp())).to.be.equal(0);
            await this.aggregator.updatePrices({from: addr.deployer});
            expect(Number(await this.aggregator.latestTimestamp())).to.be.greaterThan(0);
        });

        it("should increment latestRound number when the updatePrices() method is called", async function () {
            await initializeAllPricefeeds();

            expect(Number(await this.aggregator.latestRound())).to.be.equal(0);
            await this.aggregator.updatePrices({from: addr.deployer});
            expect(Number(await this.aggregator.latestRound())).to.be.equal(1);
        });

        it("should allow deployer to change delay", async function () {
            await this.aggregator.setDelay(12345, {from: addr.deployer});
            expect(await this.aggregator.minDelay()).to.equal(12345);
        });

        it("should allow deployer to change oracles", async function () {
            // Check oracle addresses
            expect(await this.aggregator.oracles(0)).to.equal(this.oracles[0].address);
            expect(await this.aggregator.oracles(1)).to.equal(this.oracles[1].address);
            expect(await this.aggregator.oracles(2)).to.equal(this.oracles[2].address);
    
            // Remove 3rd oracle
            const newOracles: string[] = [this.oracles[0].address, this.oracles[1].address];
            await this.aggregator.setOracles(newOracles, {from: addr.deployer});
    
            // Check oracle addresses again
            expect(await this.aggregator.oracles(0)).to.equal(this.oracles[0].address);
            expect(await this.aggregator.oracles(1)).to.equal(this.oracles[1].address);
            try {
                // Third oracle should not exist anymore
                expect(await this.aggregator.oracles(2)).to.equal(this.oracles[2].address);
            } catch (e: unknown) {
                if (e instanceof Error) {
                    expect(e.message).to.contain(`code=CALL_EXCEPTION`);
                }
            }
        });

        it("should not allow updatePrices() to be called unless all oracles are initialized", async function () {
            // Rejected when there are 0 oracles initialized
            await expect(this.aggregator.updatePrices({from: addr.deployer})).to.be.revertedWith(
                "Error: uninitialized oracle"
            );
            expect(Number(await this.aggregator.latestRound())).to.be.equal(0);

            // Rejected when there is 1 oracle initialized
            await oracles[0].transmit(0, false, {
                from: addr.deployer,
            });
            await expect(this.aggregator.updatePrices({from: addr.deployer})).to.be.revertedWith(
                "Error: uninitialized oracle"
            );
            expect(Number(await this.aggregator.latestRound())).to.be.equal(0);

            // Rejected when there are 2 oracles initialized
            await oracles[1].transmit(0, false, {
                from: addr.deployer,
            });
            await expect(this.aggregator.updatePrices({from: addr.deployer})).to.be.revertedWith(
                "Error: uninitialized oracle"
            );
            expect(Number(await this.aggregator.latestRound())).to.be.equal(0);

            // Accepted when all 3 oracles are initialized
            await oracles[2].transmit(0, false, {
                from: addr.deployer,
            });
            await this.aggregator.updatePrices({from: addr.deployer});
            expect(Number(await this.aggregator.latestRound())).to.be.equal(1);
        });
    });

    // In the following sections latestTimestamp() is used as an indication that updatePrices() has been called.
    describe("Market open/close determination", () => {
        it("should determine market open/closed via majority vote", async function () {
            await this.oracles[0].transmit(100, true, {
                from: addr.deployer,
            });
            await this.oracles[1].transmit(150, false, {
                from: addr.deployer,
            });
            await this.oracles[2].transmit(160, true, {
                from: addr.deployer,
            });
            expect(Number(await this.aggregator.latestTimestamp())).to.be.equal(0);
            expect(await this.aggregator.latestMarketOpen()).to.equal(false);
    
            await this.aggregator.updatePrices({from: addr.deployer});
    
            expect(Number(await this.aggregator.latestTimestamp())).to.be.greaterThan(0);
            expect(await this.aggregator.latestMarketOpen()).to.equal(true);
        });

        it("should evaluate split 50-50 decision on market as market closed", async function () {
            // Remove 3rd oracle so there are an even number of pricefeeds
            const newOracles: string[] = [this.oracles[0].address, this.oracles[1].address];
            await this.aggregator.setOracles(newOracles, {from: addr.deployer});
            
            await this.oracles[0].transmit(100, true, {
                from: addr.deployer,
            });
           await this.oracles[1].transmit(150, false, {
            from: addr.deployer,
            });
            expect(Number(await this.aggregator.latestTimestamp())).to.be.equal(0);
            expect(Number(await this.aggregator.latestAnswer())).to.be.equal(0);
            expect(await this.aggregator.latestMarketOpen()).to.equal(false);
    
            await this.aggregator.updatePrices({from: addr.deployer});
    
            // Answer + timestamp updated but market open evaluates to false
            expect(Number(await this.aggregator.latestTimestamp())).to.be.greaterThan(0);
            expect(Number(await this.aggregator.latestAnswer())).to.be.greaterThan(0);
            expect(await this.aggregator.latestMarketOpen()).to.equal(false);
        });

        it("should ignore negative prices + not include their market open boolean in market open/closed determination", async function () {
            await initializeAllPricefeeds();

            await this.oracles[0].transmit(100, true, {
                from: addr.deployer,
            });
            await this.oracles[1].transmit(-20, false, {
                from: addr.deployer,
            });
            await this.oracles[2].transmit(-10, false, {
                from: addr.deployer,
            });
            expect(Number(await this.aggregator.latestTimestamp())).to.be.equal(0);
    
            await this.aggregator.updatePrices({from: addr.deployer});
    
            expect(Number(await this.aggregator.latestTimestamp())).to.be.greaterThan(0);
            expect(await this.aggregator.latestMarketOpen()).to.equal(true);
        });
    });

    // describe("Median calculations", () => {
    //     it("should aggregate latest prices from 1 oracle, ignoring uninitialized oracles", async function () {
    //         await this.oracles[0].transmit(100, true, {
    //             from: addr.deployer,
    //         });

    //         expect(Number(await this.aggregator.latestTimestamp())).to.be.equal(0);
    //         expect(await this.aggregator.latestAnswer()).to.be.equal(0);

    //         await this.aggregator.updatePrices({from: addr.deployer});

    //         expect(Number(await this.aggregator.latestTimestamp())).to.be.greaterThan(0);
    //         expect(await this.aggregator.latestAnswer()).to.be.equal(100);
    //     });

    //     it("should aggregate latest prices from 2 oracles, correctly selecting the median price, ignoring uninitialized oracles", async function () {
    //         await this.oracles[0].transmit(100, true, {
    //             from: addr.deployer,
    //         });
    //         await this.oracles[2].transmit(300, true, {
    //             from: addr.deployer,
    //         });
    //         expect(Number(await this.aggregator.latestTimestamp())).to.be.equal(0);
    //         expect(await this.aggregator.latestAnswer()).to.equal(0);
    
    //         await this.aggregator.updatePrices({from: addr.deployer});
    
    //         expect(Number(await this.aggregator.latestTimestamp())).to.be.greaterThan(0);
    //         expect(await this.aggregator.latestAnswer()).to.equal(200);
    //     });

    //     it("should aggregate latest prices from 3+ oracles, correctly selecting the median price", async function () {
    //         await this.oracles[0].transmit(100, true, {
    //             from: addr.deployer,
    //         });
    //         await this.oracles[1].transmit(125, true, {
    //             from: addr.deployer,
    //         });
    //         await this.oracles[2].transmit(300, true, {
    //             from: addr.deployer,
    //         });
    //         expect(Number(await this.aggregator.latestTimestamp())).to.be.equal(0);
    
    //         await this.aggregator.updatePrices({from: addr.deployer});
    
    //         expect(Number(await this.aggregator.latestTimestamp())).to.be.greaterThan(0);
    //         expect(await this.aggregator.latestAnswer()).to.equal(125);
    //     });

    //      it("should include prices from marketClosed answers in median calculation", async function () {
    //         // Consider situation:
    //         //      - Price changes 20% overnight and on open majority of oracles post prices and updatesPrices is called.
    //         //      - The market is considered open, but yesterday's closing price from oracles that haven't posted today
    //         //        yet is still considered in the median calculation.
    //         //      
    //         //      Oracles at close:                       [a, b, c, d, e]
    //         //      Closing prices:                         [100, 100, 100, 100, 100], [closed, closed, closed, closed, closed]
    //         //      At open when update prices is called:   [100, 100, 120, 120, 122], [closed, closed, open, open, open]
    //         //
    //         //      Outcome is valid: market is open with price 120.
    //         //
    //         //      The test below replicates this behavior with 3 oracles instead of 5.
    
    //         await this.oracles[0].transmit(100, false, {
    //             from: addr.deployer,
    //         });
    //         await this.oracles[1].transmit(120, true, {
    //             from: addr.deployer,
    //         });
    //         await this.oracles[2].transmit(122, true, {
    //             from: addr.deployer,
    //         });
    //         expect(Number(await this.aggregator.latestTimestamp())).to.be.equal(0);
    //         expect(await this.aggregator.latestMarketOpen()).to.equal(false);
    
    //         await this.aggregator.updatePrices({from: addr.deployer});
    
    //         expect(await this.aggregator.latestAnswer()).to.equal(120);
    //         expect(Number(await this.aggregator.latestTimestamp())).to.be.greaterThan(0);
    //         expect(await this.aggregator.latestMarketOpen()).to.equal(true);
    //     });

    //     it("should ignore negative prices, not including them in price aggregation", async function () {
    //         await this.oracles[0].transmit(100, true, {
    //             from: addr.deployer,
    //         });
    //         await this.oracles[1].transmit(-20, false, {
    //             from: addr.deployer,
    //         });
    //         await this.oracles[1].transmit(-10, false, {
    //             from: addr.deployer,
    //         });

    //         expect(Number(await this.aggregator.latestTimestamp())).to.be.equal(0);
    
    //         await this.aggregator.updatePrices({from: addr.deployer});
    
    //         expect(Number(await this.aggregator.latestTimestamp())).to.be.greaterThan(0);
    //         expect(await this.aggregator.latestAnswer()).to.equal(100);
    //     });
    // });

    // describe("Situational testing", () => {
    //     beforeEach(async function () {
    //         // Set minimum delay lower for testing subsequent updatePrices()
    //         // await this.aggregator.setDelay(1, {from: addr.deployer});
    //         // expect(await this.aggregator.minDelay()).to.equal(1);
    //     });

    //     it("should do stuff", async function () {
    //         await this.oracles[0].transmit(100, true, {
    //             from: addr.deployer,
    //         });

    //         console.log(Number(await this.oracles[0].latestTimestamp()));

    //         expect(Number(await this.aggregator.latestRound())).to.be.equal(0);
    //         expect(await this.aggregator.latestAnswer()).to.be.equal(0);

    //         await this.aggregator.updatePrices({from: addr.deployer});

    //         expect(Number(await this.aggregator.latestRound())).to.be.equal(1);
    //         expect(await this.aggregator.latestAnswer()).to.be.equal(100);

    //         let blockNum = await hre.ethers.provider.getBlockNumber();
    //         let block = await hre.ethers.provider.getBlock(blockNum);
    //         console.log("block timestamp:", block.timestamp);

    //         // Increase time by 1 hour
    //         const oneHour = 1 * 60 * 60;
    //         await hre.ethers.provider.send('evm_increaseTime', [oneHour]);
    //         await hre.ethers.provider.send('evm_mine', []);

    //         await this.aggregator.updatePrices({from: addr.deployer});

    //         blockNum = await hre.ethers.provider.getBlockNumber();
    //         block = await hre.ethers.provider.getBlock(blockNum);
    //         console.log("block timestamp:", block.timestamp);

    //         console.log(Number(await this.oracles[0].latestTimestamp()));

    //         expect(Number(await this.aggregator.latestRound())).to.be.equal(2);
    //         expect(await this.aggregator.latestAnswer()).to.be.equal(100);


    //         // expect(Number(await this.aggregator.latestTimestamp())).to.be.greaterThan(0);
    //         // expect(await this.aggregator.latestAnswer()).to.be.equal(100);
    //     });
    // });

});

