import hre from "hardhat";
import { diamondFacets, getMinterInitializer, minterFacets } from "@deploy-config/shared";
import { Role, withFixture, Error } from "@utils/test";
import { expect } from "@test/chai";
describe("Minter - Init", () => {
    withFixture(["minter-init"]);
    describe("#initialization", () => {
        it("sets correct initial state", async function () {
            expect(await hre.Diamond.minterInitializations()).to.equal(1);

            const { args } = await getMinterInitializer(hre);

            expect(await hre.Diamond.hasRole(Role.ADMIN, args.admin)).to.equal(true);
            expect(await hre.Diamond.hasRole(Role.SAFETY_COUNCIL, hre.Multisig.address)).to.equal(true);

            expect(await hre.Diamond.feeRecipient()).to.equal(args.treasury);
            expect((await hre.Diamond.liquidationIncentiveMultiplier()).rawValue).to.equal(
                args.liquidationIncentiveMultiplier,
            );
            expect((await hre.Diamond.minimumCollateralizationRatio()).rawValue).to.equal(
                args.minimumCollateralizationRatio,
            );
            expect((await hre.Diamond.minimumDebtValue()).rawValue).to.equal(args.minimumDebtValue);
        });

        it("cant initialize twice", async function () {
            const initializer = await getMinterInitializer(hre);
            const initializerContract = await hre.getContractOrFork(initializer.name);

            const tx = await initializerContract.populateTransaction.initialize(initializer.args);

            await expect(hre.Diamond.upgradeState(tx.to!, tx.data!)).to.be.revertedWith(Error.ALREADY_INITIALIZED);
        });

        it("configures all facets correctly", async function () {
            const facetsOnChain = (await hre.Diamond.facets()).map(([facetAddress, functionSelectors]) => ({
                facetAddress,
                functionSelectors,
            }));
            const expectedFacets = await Promise.all(
                [...minterFacets, ...diamondFacets].map(async name => {
                    const deployment = await hre.deployments.get(name);
                    return {
                        facetAddress: deployment.address,
                        functionSelectors: facetsOnChain.find(f => f.facetAddress === deployment.address)!
                            .functionSelectors,
                    };
                }),
            );
            expect(facetsOnChain).to.have.deep.members(expectedFacets);
        });
    });
});
