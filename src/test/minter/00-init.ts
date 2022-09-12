import hre from "hardhat";
import minterConfig from "../../config/minter";
import { Role, withFixture, Error } from "@utils/test";
import type { ConfigurationFacet } from "types/typechain";
import { expect } from "@test/chai";

describe("Minter", function () {
    withFixture("minter-init");
    describe("#initialization", async () => {
        it("sets correct state", async function () {
            expect(await hre.Diamond.minterInitializations()).to.equal(1);

            const { args } = await minterConfig.getMinterInitializer(hre);

            expect(await hre.Diamond.hasRole(Role.OPERATOR, args.operator)).to.equal(true);
            expect(await hre.Diamond.hasRole(Role.SAFETY_COUNCIL, hre.Multisig.address)).to.equal(true);

            expect(await hre.Diamond.feeRecipient()).to.equal(args.feeRecipient);
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
            const initializerContract = await hre.ethers.getContract<ConfigurationFacet>(initializer.name);

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
