import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { ERC20PresetMinterPauser, KreskoViewer } from "types/contracts";

task("sandbox").setAction(async function (_taskArgs: TaskArguments, hre) {
    const { deployer } = await hre.getNamedAccounts();
    const KreskoViewer = await hre.ethers.getContract<KreskoViewer>("KreskoViewer");

    // const USDC = await hre.ethers.getContract<ERC20PresetMinterPauser>("USDC");

    // const allTokens = [
    //     "0xc0B63e2FeF8cF5741095e8984776cE6EA5F3C43F",
    //     "0xb2eEe98BA976570E3D369f39e553848DA5F92BD2",
    //     "0xC108c33731a62781579A28F33b0Ce6AF28a090D2",
    //     "0x494396f42ec90E4eB815d8fBBb3b5fdF016970B2",
    //     "0x78694808A11649302A6D62f25167845694396823",
    //     "0x1cfD0Aa27ed8e194662335c7bfdD98dab3b21068",
    //     "0x9f46a10405B1CCe0E8727E4190EC36880Aa2de37",
    //     "0x017f4264054981e28A967F995cdCED007AB5852B",
    //     "0xC895a91879294B41A7658EDe8Ac690F3D3AA0b83",
    //     "0x1F5Ea196c314E8d1940E3dFe93D785Ec8668Ab25",
    //     "0xccdc21DA20835C7162d4ef7533d7e3131cF4e105",
    //     "0xC1D8892f2D61230F0bb5aC3A4ef100Ae7b38FD73",
    // ];

    const stakingData = await KreskoViewer.getStakingData(deployer);
    console.log(`stakingData`, stakingData);

    console.log(KreskoViewer.address);
});
