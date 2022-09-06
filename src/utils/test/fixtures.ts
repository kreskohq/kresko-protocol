import hre, { deployments, ethers } from "hardhat";

type FixtureName = "diamond-init" | "minter-init" | "minter-with-mocks" | "kresko-asset";

let currentFixtureName: string;
export const withFixture = (fixtureName: FixtureName) => {
    before(function () {
        if (currentFixtureName && fixtureName !== currentFixtureName) {
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
            hre.Diamond = await ethers.getContractAt<Kresko>("Kresko", result.Diamond.address);
            return {
                facets: result.Diamond.facets,
                collaterals: hre.collaterals,
                krAssets: hre.krAssets,
            };
        })();
        this.facets = fixture.facets;
        this.collaterals = fixture.collaterals;
        this.krAssets = fixture.krAssets;
    });
};
