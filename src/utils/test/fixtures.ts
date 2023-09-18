import { MAX_UINT_AMOUNT } from "@kreskolabs/lib";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { WrapperBuilder } from "@redstone-finance/evm-connector";
import hre from "hardhat";
import { Kresko } from "types/typechain";

const getFixture = (fixtureName: string[]) =>
    hre.deployments.createFixture(async hre => {
        const result = await hre.deployments.fixture(fixtureName);
        await time.increase(3602);
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

type SCDPFixtureParams = {
    krAssets: () => Promise<TestKrAsset>[];
    collaterals: () => Promise<TestCollateral>[];
};
export const getSCDPFixture = (params: SCDPFixtureParams) =>
    hre.deployments.createFixture(async hre => {
        const result = await hre.deployments.fixture("minter-init");

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

        const krAssets = await Promise.all(params.krAssets());
        const collaterals = await Promise.all(params.collaterals());

        const users = [hre.users.testUserFive, hre.users.testUserSix, hre.users.testUserSeven];

        for (const user of users) {
            await Promise.all([
                time.increase(3602),
                hre.Diamond.setFeeAssetSCDP(krAssets[2].address),
                ...krAssets.map(async asset =>
                    asset.contract.connect(user).approve(hre.Diamond.address, MAX_UINT_AMOUNT),
                ),
                ...collaterals.map(async asset =>
                    asset.contract.connect(user).approve(hre.Diamond.address, MAX_UINT_AMOUNT),
                ),
            ]);
        }

        return {
            collaterals,
            krAssets,
            users,
        };
    })();

export const withFixture = (fixtureName: string[]) => {
    beforeEach(async function () {
        const fixture = await getFixture(fixtureName);
        this.facets = fixture.facets || [];
        this.collaterals = fixture.collaterals;
        this.krAssets = fixture.krAssets;
    });
};

export const withSCDPFixture = (params: SCDPFixtureParams) => {
    beforeEach(async function () {
        const fixture = await getSCDPFixture(params);
        this.collaterals = fixture.collaterals;
        this.krAssets = fixture.krAssets;
        this.usersArr = fixture.users;
    });
};
