import { toBig } from "@kreskolabs/lib";
import { expect } from "@test/chai";
import { wrapPrices } from "@utils/redstone";
import { Error, defaultCollateralArgs, withFixture } from "@utils/test";
import { OracleType } from "@utils/test/oracles";
import { Kresko, MockSequencerUptimeFeed } from "types/typechain";

describe("Oracles", () => {
    withFixture(["minter-test"]);

    beforeEach(async function () {
        // Deploy one price feed

        this.deployer = await hre.ethers.getNamedSigner("deployer");
        this.userOne = await hre.ethers.getNamedSigner("userOne");
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
            await redstoneCollateral.setBalance(hre.users.userOne, initialBalance, hre.Diamond.address);

            mockSequencerUptimeFeed = await (await ethers.getContractFactory("MockSequencerUptimeFeed")).deploy();

            this.depositArgs = {
                user: hre.users.userOne,
                asset: redstoneCollateral,
                amount: toBig(1),
            } as const;

            await hre.Diamond.connect(this.depositArgs.user).depositCollateral(
                this.depositArgs.user.address,
                this.depositArgs.asset.address,
                this.depositArgs.amount,
            );

            // check initial conditions
            expect(await redstoneCollateral.getPrice()).to.equal(toBig(10, 8), "collateral price should be $10");
            // As redstone price is 0, will use chainlink price = 10
            // so collateral value = $10 * 1 = $10
            expect(await hre.Diamond.getAccountCollateralValue(hre.users.userOne.address)).to.equal(
                toBig(10, 8),
                "collateral value should be $10",
            );
        });

        it("should get redstone price when chainlink price = 0", async function () {
            /// set chainlink price to 0
            redstoneCollateral.setPrice(0);
            const redstoneCollateralPrice = 20;

            const redstoneDiamond: Kresko = wrapPrices(hre.Diamond, [
                { dataFeedId: defaultCollateralArgs.redstoneId, value: redstoneCollateralPrice },
            ]);

            // so collateral value = $20 * 1 = $20
            expect(await redstoneDiamond.getAccountCollateralValue(hre.users.userOne.address)).to.equal(
                toBig(redstoneCollateralPrice, 8),
                "collateral value should be $20",
            );
        });

        it("should get primary price when price +- oracleDeviationPct of reference price ", async function () {
            await redstoneCollateral.setOracleOrder([OracleType.Redstone, OracleType.Chainlink]);
            /// set chainlink price to 12
            redstoneCollateral.setPrice(12);

            /// set redstone price to 11
            const redstoneCollateralPrice = 11;

            const redstoneDiamond = wrapPrices(hre.Diamond, [
                { dataFeedId: defaultCollateralArgs.redstoneId, value: redstoneCollateralPrice },
            ]);

            // so collateral value = $11 * 1 = $11
            expect(await redstoneDiamond.getAccountCollateralValue(hre.users.userOne.address)).to.equal(
                toBig(11, 8),
                "collateral value should be $11",
            );
        });

        it("should revert if price deviates too much", async function () {
            /// set chainlink price to 20
            redstoneCollateral.setPrice(20);

            const redstoneCollateralPrice = 10;
            const redstoneDiamond = wrapPrices(hre.Diamond, [
                { dataFeedId: defaultCollateralArgs.redstoneId, value: redstoneCollateralPrice },
            ]);

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
            const redstoneDiamond = wrapPrices(hre.Diamond, [
                { dataFeedId: defaultCollateralArgs.redstoneId, value: redstoneCollateralPrice },
            ]);

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
