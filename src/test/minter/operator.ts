import hre from "hardhat";
import { constants } from "ethers";
import { fixtures, getUsers, addCollateralAsset } from "@test-utils";
import { smock } from "@defi-wonderland/smock";
import chai, { expect } from "chai";
import { ERC20Upgradeable__factory, FluxPriceAggregator__factory } from "types/typechain";
import { toBig, toFixedPoint } from "@utils";

chai.use(smock.matchers);

describe("Minter", function () {
    before(async function () {
        this.users = await getUsers();
    });
    describe("#operator", function () {
        beforeEach(async function () {
            const fixture = await fixtures.minterInit();
            this.Oracles = [await smock.fake<FluxPriceFeed>("FluxPriceFeed")];
            this.OracleAggregatorFactory = await smock.mock<FluxPriceAggregator__factory>("FluxPriceAggregator");
            this.TokenFactory = await smock.mock<ERC20Upgradeable__factory>("ERC20Upgradeable");
            this.users = fixture.users;
            this.addresses = {
                ZERO: constants.AddressZero,
                operator: await this.users.operator,
                deployer: await this.users.deployer.getAddress(),
                userOne: await this.users.userOne.getAddress(),
                nonAdmin: await this.users.nonadmin.getAddress(),
            };

            this.Diamond = fixture.Diamond;
            this.facets = fixture.facets;
            this.DiamondDeployment = fixture.DiamondDeployment;
        });

        it("should be able to modify each parameter", async function () {
            const Diamond = this.Diamond.connect(this.users.operator);
            const values = {
                burnFee: toFixedPoint(0.02),
                liquidationIncentiveMultiplier: toFixedPoint(1.05),
                minimumCollateralizationRatio: toFixedPoint(1.4),
                minimumDebtValue: toFixedPoint(20),
                secondsUntilStalePrice: 30,
                feeRecipient: this.users.deployer.address,
            };
            await expect(Diamond.updateBurnFee(values.burnFee)).to.not.be.reverted;
            await expect(Diamond.updateLiquidationIncentiveMultiplier(values.liquidationIncentiveMultiplier)).to.not.be
                .reverted;
            await expect(Diamond.updateMinimumCollateralizationRatio(values.minimumCollateralizationRatio)).to.not.be
                .reverted;
            await expect(Diamond.updateMinimumDebtValue(values.minimumDebtValue)).to.not.be.reverted;
            await expect(Diamond.updateSecondsUntilStalePrice(values.secondsUntilStalePrice)).to.not.be.reverted;
            await expect(Diamond.updateFeeRecipient(values.feeRecipient)).to.not.be.reverted;

            const {
                burnfee,
                liquidationIncentiveMultiplier,
                minimumCollateralizationRatio,
                minimumDebtValue,
                secondsUntilStalePrice,
                feeRecipient,
            } = await this.Diamond.getAllParams();

            expect(values.burnFee.toBigInt()).to.equal(burnfee.rawValue);
            expect(values.liquidationIncentiveMultiplier.toBigInt()).to.equal(liquidationIncentiveMultiplier.rawValue);
            expect(values.minimumCollateralizationRatio.toBigInt()).to.equal(minimumCollateralizationRatio.rawValue);
            expect(values.minimumDebtValue.toBigInt()).to.equal(minimumDebtValue.rawValue);
            expect(values.secondsUntilStalePrice).to.equal(Number(secondsUntilStalePrice));
            expect(values.feeRecipient).to.equal(feeRecipient);
        });

        it("should be able add a collateral asset", async function () {
            const price = 5;
            const collateral = await addCollateralAsset(5);
            expect(await hre.Diamond.collateralExists(collateral.address)).to.equal(true);
            const [, oraclePrice] = await hre.Diamond.getCollateralValueAndOraclePrice(
                collateral.address,
                toBig(1),
                true,
            );
            expect(Number(oraclePrice)).to.equal(Number(toFixedPoint(price)));
        });

        it("should be able to deposit collateral", async function () {
            const depositoor = this.users.userOne;
            const collateral = await addCollateralAsset(15);

            await collateral.setVariable("_balances", {
                [depositoor.address]: toBig("1000000"),
            });

            await collateral.setVariable("_allowances", {
                [depositoor.address]: {
                    [this.Diamond.address]: toBig("1000000"),
                },
            });

            await expect(
                this.Diamond.connect(depositoor).depositCollateral(
                    depositoor.address,
                    collateral.address,
                    toBig("1000"),
                ),
            ).not.to.be.reverted;
        });

        it("should have all the minter facets and selectors that were configured for deployment", async function () {
            const facetsOnChain = (await this.Diamond.facets()).map(([facetAddress, functionSelectors]) => ({
                facetAddress,
                functionSelectors,
            }));
            expect(facetsOnChain).to.have.deep.members(this.facets);
        });
    });
});
