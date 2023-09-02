import { toBig } from "@kreskolabs/lib";
import { Role, defaultCollateralArgs, defaultMintAmount, withFixture } from "@utils/test";
import { addLiquidity } from "@utils/test/helpers/amm";
import { depositMockCollateral } from "@utils/test/helpers/collaterals";
import { mintKrAsset } from "@utils/test/helpers/krassets";
import { expect } from "chai";
import hre from "hardhat";

describe("Test KreskoAsset with Rebase and sync", () => {
    let KreskoAsset: TestKrAsset;

    withFixture(["minter-test", "kresko-assets", "collaterals"]);
    beforeEach(async function () {
        KreskoAsset = this.krAssets.find(asset => asset.deployArgs!.symbol === "krETH")!;

        const KISS = await hre.getContractOrFork("KISS");
        [hre.UniV2Factory] = await hre.deploy("UniswapV2Factory", {
            args: [hre.users.deployer.address],
        });
        [hre.UniV2Router] = await hre.deploy("UniswapV2Router02", {
            args: [hre.UniV2Factory.address, (await hre.deploy("WETH"))[0].address],
        });

        await depositMockCollateral({
            user: hre.users.testUserEight,
            asset: this.collaterals.find(c => c.deployArgs!.name === defaultCollateralArgs.name)!,
            amount: toBig(100000),
        });
        await mintKrAsset({
            user: hre.users.testUserEight,
            asset: KreskoAsset,
            amount: toBig(64),
        });
        await mintKrAsset({
            user: hre.users.testUserEight,
            asset: KISS,
            amount: toBig(1000),
        });
        this.pool = await addLiquidity({
            user: hre.users.testUserEight,
            router: hre.UniV2Router,
            token0: KreskoAsset,
            token1: {
                address: KISS.address,
                contract: KISS,
            } as any,
            amount0: toBig(64),
            amount1: toBig(1000),
        });

        await KreskoAsset.contract.grantRole(Role.OPERATOR, hre.addr.deployer);
    });

    it("Rebases the asset with no sync of uniswap pools - Reserves not updated", async function () {
        const denominator = 2;
        const positive = true;
        const beforeTotalSupply = await KreskoAsset.contract.totalSupply();

        const [beforeReserve0, beforeReserve1, beforeTimestamp] = await this.pool.getReserves();

        await KreskoAsset.contract.mint(hre.addr.deployer, defaultMintAmount);
        const deployerBalanceBefore = await KreskoAsset.contract.balanceOf(hre.addr.deployer);
        await KreskoAsset.contract.rebase(toBig(denominator), positive, []);

        const [afterReserve0, afterReserve1, afterTimestamp] = await this.pool.getReserves();

        expect(await KreskoAsset.contract.balanceOf(hre.addr.deployer)).to.equal(
            deployerBalanceBefore.mul(denominator),
        );
        expect(await KreskoAsset.contract.totalSupply()).to.equal(
            beforeTotalSupply.add(defaultMintAmount).mul(denominator),
        );

        expect(afterReserve0).to.equal(beforeReserve0);
        expect(afterReserve1).to.equal(beforeReserve1);
        expect(beforeTimestamp).to.equal(afterTimestamp);
    });

    it("Rebases the asset with sync of uniswap pools - Reserve should be updated", async function () {
        const denominator = 2;
        const positive = true;

        const [beforeReserve0, beforeReserve1, beforeTimestamp] = await this.pool.getReserves();

        await KreskoAsset.contract.rebase(toBig(denominator), positive, [this.pool.address]);

        const [afterReserve0, afterReserve1, afterTimestamp] = await this.pool.getReserves();

        if (beforeReserve0.eq(afterReserve0)) {
            expect(afterReserve1).to.equal(beforeReserve1.mul(denominator));
        } else {
            expect(afterReserve0).to.equal(beforeReserve0.mul(denominator));
        }
        expect(afterTimestamp).to.gt(beforeTimestamp);
    });
});
