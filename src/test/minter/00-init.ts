import { diamondFacets, getInitializer, getMinterInitializer, minterFacets, scdpFacets } from "@deploy-config/shared";
import { expect } from "@test/chai";
import { defaultFixture } from "@utils/test/fixtures";
import { Role } from "@utils/test/roles";

describe("Minter - Init", () => {
    beforeEach(async function () {
        await defaultFixture();
    });
    describe("#initialization", () => {
        it("sets correct initial state", async function () {
            expect(await hre.Diamond.getStorageVersion()).to.equal(3);

            const { args } = await getInitializer(hre);
            const { args: minterArgs } = await getMinterInitializer(hre);

            expect(await hre.Diamond.hasRole(Role.ADMIN, args.admin)).to.equal(true);
            expect(await hre.Diamond.hasRole(Role.SAFETY_COUNCIL, hre.Multisig.address)).to.equal(true);

            expect(await hre.Diamond.getFeeRecipient()).to.equal(args.treasury);
            expect(await hre.Diamond.getMinCollateralRatio()).to.equal(minterArgs.minCollateralRatio);
            expect(await hre.Diamond.getMinDebtValue()).to.equal(args.minDebtValue);
        });

        it("cant initialize twice", async function () {
            expect(await hre.Diamond.getStorageVersion()).to.equal(3);
            const initializer = await getMinterInitializer(hre);
            const initializerContract = await hre.getContractOrFork(initializer.name);

            const tx = await initializerContract.populateTransaction.initializeMinter(initializer.args);

            await expect(hre.Diamond.upgradeState(tx.to!, tx.data!)).to.be.reverted;
        });

        it("configures all facets correctly", async function () {
            const facetsOnChain = (await hre.Diamond.facets()).map(([facetAddress, functionSelectors]) => ({
                facetAddress,
                functionSelectors,
            }));
            const expectedFacets = await Promise.all(
                [...minterFacets, ...diamondFacets, ...scdpFacets].map(async name => {
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
