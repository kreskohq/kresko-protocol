let currentFixtureName: string[];
export const withFixture = (fixtureName: string[]) => {
    // before(function () {
    //     if (currentFixtureName && fixtureName.join("") !== currentFixtureName.join("")) {
    //         hre.collaterals = [];
    //         hre.krAssets = [];
    //         hre.allAssets = [];
    //         hre.Diamond = undefined;
    //     }
    //     currentFixtureName = fixtureName;
    // });
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
