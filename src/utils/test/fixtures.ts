import hre from "hardhat";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
import { Kresko } from "types/typechain";

export const withFixture = (fixtureName: string[]) => {
    beforeEach(async function () {
        const fixture = await hre.deployments.createFixture(async hre => {
            const result = await hre.deployments.fixture(fixtureName);

            if (result.Diamond) {
                hre.Diamond = WrapperBuilder.wrap(await hre.getContractOrFork("Kresko")).usingSimpleNumericMock({
                    mockSignersCount: 1,
                    timestampMilliseconds: Date.now(),
                    dataPoints: [
                        { dataFeedId: "DAI", value: 0 },
                        { dataFeedId: "USDC", value: 0 },
                        { dataFeedId: "TSLA", value: 0 },
                        { dataFeedId: "ETH", value: 0 },
                        { dataFeedId: "BTC", value: 0 },
                    ],
                }) as Kresko;
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
