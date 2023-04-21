import { expect } from "chai";
import hre, { ethers } from "hardhat";
import { Role, withFixture, defaultMintAmount } from "@utils/test";
import { it } from "mocha";

describe("Test KreskoAsset with Rebase and sync", () => {
    let KreskoAsset: KreskoAsset;

    withFixture(["minter-test", "kresko-assets", "collaterals"]);

    beforeEach(async function () {
        KreskoAsset = hre.krAssets.find(asset => asset.deployArgs!.symbol === "krETH")!.contract;
        // address of KISS-krETH pool
        this.pool = await ethers.getContractAt("UniswapV2Pair", "0x8bf66B96B1801a5662Eb5d83f870F4Fd16d199A6");
        // Grant minting rights for test deployer
        await KreskoAsset.grantRole(Role.OPERATOR, hre.addr.deployer);
    });

    it("Rebases the asset with no sync of uniswap pools - Reserves not updated", async function () {
        const denominator = 2;
        const positive = true;
        const beforeTotalSupply = await KreskoAsset.totalSupply();

        const [beforeReserve0, beforeReserve1, beforeTimestamp] = await this.pool.getReserves();

        await KreskoAsset.mint(hre.addr.deployer, defaultMintAmount);
        await KreskoAsset.rebase(hre.toBig(denominator), positive, []);

        const [afterReserve0, afterReserve1, afterTimestamp] = await this.pool.getReserves();

        expect(await KreskoAsset.balanceOf(hre.addr.deployer)).to.equal(defaultMintAmount.mul(denominator));
        expect(await KreskoAsset.totalSupply()).to.equal(beforeTotalSupply.add(defaultMintAmount).mul(denominator));

        expect(afterReserve0).to.equal(beforeReserve0);
        expect(afterReserve1).to.equal(beforeReserve1);
        expect(beforeTimestamp).to.equal(afterTimestamp);
    });

    it("Rebases the asset with sync of uniswap pools - Reserve should be updated", async function () {
        const denominator = 2;
        const positive = true;

        const [beforeReserve0, beforeReserve1, beforeTimestamp] = await this.pool.getReserves();
        await KreskoAsset.rebase(hre.toBig(denominator), positive, [this.pool.address]);
        const [afterReserve0, afterReserve1, afterTimestamp] = await this.pool.getReserves();

        expect(afterReserve0).to.equal(beforeReserve0.mul(denominator));
        expect(afterReserve1).to.equal(beforeReserve1);
        expect(afterTimestamp).to.gt(beforeTimestamp);
    });
});
