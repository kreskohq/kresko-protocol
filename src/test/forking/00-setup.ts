import { minterFacets } from "@deploy-config/shared";
import { toBig } from "@kreskolabs/lib";
import { updateFacets } from "@scripts/update-facets";
import { expect } from "@test/chai";
import Role from "@utils/test/roles";

(process.env.FORKING ? describe : describe.skip)("Forking", () => {
    describe("#setup", () => {
        it("should get Kresko from the companion network locally", async function () {
            expect(hre.companionNetworks).to.have.property("live");

            const Kresko = await hre.getContractOrFork("Kresko");
            expect(await Kresko.initialized()).to.equal(true);

            const Safe = await hre.getContractOrFork("GnosisSafeL2", "Multisig");
            expect(await Kresko.hasRole(Role.DEFAULT_ADMIN, Safe.address)).to.be.true;
        });
    });
    describe("#rate-upgrade-11-04-2023", () => {
        it.skip("should be able to deploy facets", async function () {
            expect(hre.companionNetworks).to.have.property("live");
            const { deployer } = await hre.getNamedAccounts();
            const Kresko = await hre.getContractOrFork("Kresko");
            const krETH = await hre.getContractOrFork("KreskoAsset", "krETH");

            const facetsBefore = await Kresko.facets();
            const { facetsAfter } = await updateFacets({ facetNames: minterFacets });
            expect(facetsAfter).to.not.deep.equal(facetsBefore);

            await expect(Kresko.mintKreskoAsset(deployer, krETH.address, toBig(0.1))).to.not.be.reverted;
        });
    });
    describe("#facet-upgrade-16-05-2023", () => {
        it.skip("works", async function () {
            expect(hre.companionNetworks).to.have.property("live");
            const { deployer } = await hre.getNamedAccounts();
            const Kresko = await hre.getContractOrFork("Kresko");
            const krETH = await hre.getContractOrFork("KreskoAsset", "krETH");
            const facetsBefore = await Kresko.facets();
            const [initializer] = await hre.deploy("FacetUpgrade16052023");
            const { facetsAfter } = await updateFacets({
                facetNames: minterFacets,
                initializer: {
                    contract: initializer,
                    func: "initialize",
                    args: [],
                },
            });
            const stateFacet = await Kresko.facetFunctionSelectors("0x1Fc8f2185ae35b27843773779C47E784EdF2F739");
            const stateFacetNew = await Kresko.facetFunctionSelectors("0x253e75619D0d4D0AD0Fe45c895645acdbC94cE4C");
            expect(stateFacetNew.length).to.be.greaterThan(0);
            expect(stateFacet.length).to.equal(0);
            expect(facetsAfter).to.not.deep.equal(facetsBefore);

            expect((await Kresko.collateralAsset(krETH.address)).liquidationIncentive).to.equal(toBig(1.05));

            await expect(Kresko.depositCollateral(deployer, krETH.address, toBig(1))).to.not.be.reverted;
            await expect(Kresko.mintKreskoAsset(deployer, krETH.address, toBig(0.1))).to.not.be.reverted;

            const burnIdx = await Kresko.getMintedKreskoAssetsIndex(deployer, krETH.address);
            const withdrawIdx = await Kresko.getDepositedCollateralAssetIndex(deployer, krETH.address);
            await expect(Kresko.burnKreskoAsset(deployer, krETH.address, toBig(0.1), burnIdx)).to.not.be.reverted;
            await expect(Kresko.withdrawCollateral(deployer, krETH.address, toBig(0.1), withdrawIdx)).to.not.be
                .reverted;
        });
    });
});
