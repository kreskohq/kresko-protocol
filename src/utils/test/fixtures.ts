import hre from "hardhat";

export const withFixture = (fixtureName: string[]) => {
    beforeEach(async function () {
        const fixture = await hre.deployments.createFixture(async hre => {
            const result = await hre.deployments.fixture(fixtureName);

            if (result.Diamond) {
                hre.Diamond = await hre.getContractOrFork("Kresko");
            }
            return {
                facets: result.Diamond ? result.Diamond.facets : [],
                collaterals: hre.collaterals,
                krAssets: hre.krAssets,
            };
        })();
        this.facets = fixture.facets || [];
        this.collaterals = fixture.collaterals;
        this.krAssets = fixture.krAssets;
    });
};
