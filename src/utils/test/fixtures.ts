import hre, { deployments, ethers } from "hardhat";

let currentFixtureName: string[];
export const withFixture = (fixtureName: string[]) => {
    before(function () {
        if (currentFixtureName && fixtureName.join("") !== currentFixtureName.join("")) {
            hre.collaterals = [];
            hre.krAssets = [];
            hre.allAssets = [];
            hre.Diamond = undefined;
        }
        currentFixtureName = fixtureName;
    });
    beforeEach(async function () {
        const fixture = await deployments.createFixture(async hre => {
            const result = await deployments.fixture(fixtureName);

            if (result.Diamond) {
                hre.Diamond = await ethers.getContractAt<Kresko>("Kresko", result.Diamond.address);
            }
            return {
                facets: result.Diamond ? result.Diamond.facets : [],
                collaterals: hre.collaterals,
                krAssets: hre.krAssets,
            };
        })();
        this.facets = fixture.facets;
        this.collaterals = fixture.collaterals;
        this.krAssets = fixture.krAssets;
    });
};
