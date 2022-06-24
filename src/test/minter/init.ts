import hre from "hardhat";
import { smock } from "@defi-wonderland/smock";
import minterConfig from "../../config/minter";
import chai, { expect } from "chai";
import { Role, withFixture, Error } from "@utils/test";
import type { OperatorFacet } from "types/typechain";

chai.use(smock.matchers);

describe("Minter", function () {
    withFixture("createMinter");

    describe("#initialization", () => {
        it("sets correct state", async function () {
            expect(await hre.Diamond.minterInitializations()).to.equal(1);

            const { args } = await minterConfig.getMinterInitializer(hre);

            expect(await hre.Diamond.hasRole(Role.OPERATOR, args.operator)).to.equal(true);
            expect(await hre.Diamond.hasRole(Role.SAFETY_COUNCIL, hre.Multisig.address)).to.equal(true);

            expect(await hre.Diamond.feeRecipient()).to.equal(args.feeRecipient);
            expect(await hre.Diamond.secondsUntilStalePrice()).to.equal(args.secondsUntilStalePrice);
            expect((await hre.Diamond.burnFee()).rawValue).to.equal(args.burnFee);
            expect((await hre.Diamond.liquidationIncentiveMultiplier()).rawValue).to.equal(
                args.liquidationIncentiveMultiplier,
            );
            expect((await hre.Diamond.minimumCollateralizationRatio()).rawValue).to.equal(
                args.minimumCollateralizationRatio,
            );
            expect((await hre.Diamond.minimumDebtValue()).rawValue).to.equal(args.minimumDebtValue);
        });

        it("cant initialize twice", async function () {
            const initializer = await minterConfig.getMinterInitializer(hre);
            const initializerContract = await hre.ethers.getContract<OperatorFacet>(initializer.name);

            const tx = await initializerContract.populateTransaction.initialize(initializer.args);

            await expect(hre.Diamond.upgradeState(tx.to, tx.data)).to.be.revertedWith(Error.ALREADY_INITIALIZED);
        });

        it("sets all facets configured", async function () {
            const facetsOnChain = (await hre.Diamond.facets()).map(([facetAddress, functionSelectors]) => ({
                facetAddress,
                functionSelectors,
            }));
            expect(facetsOnChain).to.have.deep.members(hre.DiamondDeployment.facets);
        });
    });
});
