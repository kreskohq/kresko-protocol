import hre from "hardhat";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
import { Kresko } from "types/typechain";
export const withFixture = (fixtureName: string[]) => {
    beforeEach(async function () {
        const fixture = await hre.deployments.createFixture(async hre => {
            const result = await hre.deployments.fixture(fixtureName);

            if (result.Diamond) {
                hre.Diamond = WrapperBuilder.wrap(await hre.getContractOrFork("Kresko")).usingDataService(
                    {
                        dataServiceId: "redstone-main-demo",
                        dataFeeds: ["ETH", "BTC", "IBM", "USDC", "DAI"],
                        uniqueSignersCount: 1,
                    },
                    ["https://d33trozg86ya9x.cloudfront.net"],
                ) as Kresko;
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
