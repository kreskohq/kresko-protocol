import { task } from "hardhat/config";
import { formatUnits, toBig } from "@utils/numbers";
import { toFixedPoint } from "@utils/fixed-point";

task("gastestaurora", "Creates collaterals and krAssets, deposits and mints them and repays", async (params, hre) => {
    const { admin } = await hre.getNamedAccounts();
    const { deploy, ethers } = hre;
    const depositAmount = ethers.utils.parseEther("20");
    const mintAmount = ethers.utils.parseEther("4");
    const withdrawCollateralAmount = ethers.utils.parseEther("1");

    const kresko = await hre.ethers.getContract<Kresko>("Kresko");

    const wait = 4;
    for (let i = 0; i < 71; i++) {
        console.log("Deploying token", "Symbol:", "Mocking" + i.toString() + "A");
        const [Token] = await deploy<Token>("Token" + i.toString() + "A", {
            contract: "Token",
            waitConfirmations: wait,
            from: admin,
            log: true,
            args: ["MockToken" + i.toString(), "Mocking" + i.toString() + "A", toBig("1000000000")],
        });
        console.log("Approving token");
        let tx = await Token.approve(kresko.address, hre.ethers.constants.MaxUint256);
        await tx.wait(wait);

        console.log("Adding collateral asset");
        tx = await kresko.addCollateralAsset(
            Token.address,
            toFixedPoint(1),
            "0x276fc8818D229Aa557dDB05219973d80445eFdd8",
            false,
        );
        await tx.wait(wait);

        console.log("Depositing collateral asset");
        tx = await kresko.depositCollateral(admin, Token.address, depositAmount);
        await tx.wait(wait);
        console.log("Deploying krASset", "Symbol:", "MockAsset" + i.toString() + "A");
        const [KrAsset] = await deploy<KreskoAsset>("MockAsset" + i.toString() + "A", {
            from: admin,
            log: true,
            waitConfirmations: wait,
            contract: "KreskoAsset",
            proxy: {
                execute: {
                    init: {
                        methodName: "initialize",
                        args: [
                            "MockAsset" + i.toString() + "A",
                            "MockAsset" + i.toString() + "A",
                            admin,
                            kresko.address,
                        ],
                    },
                },
            },
        });

        console.log("Adding kreskoAsset");
        tx = await kresko.addKreskoAsset(
            KrAsset.address,
            "MockAsset" + i.toString() + "A",
            toFixedPoint(1),
            "0x276fc8818D229Aa557dDB05219973d80445eFdd8",
            toBig("100_000_000"),
        );
        await tx.wait(wait);

        console.log("Minting kreskoAsset");
        tx = await kresko.mintKreskoAsset(admin, KrAsset.address, mintAmount);
        const mintReceipt = await tx.wait(wait);
        const gasUsedForMint = Number(formatUnits(mintReceipt.gasUsed, "wei"));

        console.log("getting depo collateral index");
        const cIndex = await kresko.getDepositedCollateralAssetIndex(admin, Token.address);
        tx = await kresko.withdrawCollateral(admin, Token.address, withdrawCollateralAmount, Number(cIndex));

        const withdrawReceipt = await tx.wait(wait);
        const gasUsedWithdraw = Number(formatUnits(withdrawReceipt.gasUsed, "wei"));

        console.log("getting depo collateral index");
        const kIndex = await kresko.getMintedKreskoAssetsIndex(admin, KrAsset.address);
        tx = await kresko.burnKreskoAsset(admin, KrAsset.address, withdrawCollateralAmount, Number(kIndex));

        const repayReceipt = await tx.wait(wait);
        const gasUsedRepay = Number(formatUnits(repayReceipt.gasUsed, "wei"));

        console.log("Iteration", i);
        console.log("Gas used for withdraw", gasUsedWithdraw);
        console.log("Gas used for mint", gasUsedForMint);
        console.log("Gas used for repay", gasUsedRepay);
    }
});
