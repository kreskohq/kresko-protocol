import hre from "hardhat";
import { constants } from "ethers";
import { fixtures, getUsers, Error } from "@test-utils";
import { smock } from "@defi-wonderland/smock";
import minterConfig from "../../config/minter";
import chai, { expect } from "chai";
import type { OperatorFacet } from "types/typechain";

chai.use(smock.matchers);

describe("Minter", function () {
    before(async function () {
        this.users = await getUsers();
    });
    describe("#initialization", function () {
        beforeEach(async function () {
            const fixture = await fixtures.minterInit();

            this.users = fixture.users;
            this.addresses = {
                ZERO: constants.AddressZero,
                deployer: await this.users.deployer.getAddress(),
                userOne: await this.users.userOne.getAddress(),
                nonAdmin: await this.users.nonadmin.getAddress(),
            };

            this.Diamond = fixture.Diamond;
            this.facets = fixture.facets;
            this.DiamondDeployment = fixture.DiamondDeployment;
        });

        it("should initialize minter state", async function () {
            expect(await this.Diamond.minterInitializations()).to.equal(1);

            const { args } = await minterConfig.getInitializer(hre);

            expect((await this.Diamond.burnFee()).rawValue).to.equal(args.burnFee);
            expect(await this.Diamond.feeRecipient()).to.equal(args.feeRecipient);
            expect((await this.Diamond.liquidationIncentiveMultiplier()).rawValue).to.equal(
                args.liquidationIncentiveMultiplier,
            );
            expect((await this.Diamond.minimumCollateralizationRatio()).rawValue).to.equal(
                args.minimumCollateralizationRatio,
            );
            expect((await this.Diamond.minimumDebtValue()).rawValue).to.equal(args.minimumDebtValue);
            expect(await this.Diamond.secondsUntilStalePrice()).to.equal(args.secondsUntilStalePrice);
            expect(
                await this.Diamond.hasRole(
                    "0x112e48a576fb3a75acc75d9fcf6e0bc670b27b1dbcd2463502e10e68cf57d6fd",
                    args.operator,
                ),
            ).to.equal(true);

            expect(
                await this.Diamond.hasRole(
                    "0x9c387ecf1663f9144595993e2c602b45de94bf8ba3a110cb30e3652d79b581c0",
                    hre.Multisig.address,
                ),
            ).to.equal(true);
        });

        it("should not be able to initialize with the same initializer twice", async function () {
            const initializer = await minterConfig.getInitializer(hre);
            const initializerContract = await hre.ethers.getContract<OperatorFacet>(initializer.name);

            const tx = await initializerContract.populateTransaction.initialize(initializer.args);

            await expect(this.Diamond.upgradeState(tx.to, tx.data)).to.be.revertedWith(Error.ALREADY_INITIALIZED);
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
