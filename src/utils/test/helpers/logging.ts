import { fromBig } from "@kreskolabs/lib";

export const logPosition = async (id: number) => {
    const positions = await hre.getContractOrFork("Positions");
    const [position, ratio] = await positions.getPosition(id);
    console.log("*** position");
    console.log("amountA", fromBig(position.amountA));
    console.log("amountB", fromBig(position.amountB));
    console.log("leverage", fromBig(position.leverage));
    console.log("ratio", fromBig(ratio));
};

export const logBalances = async (user: SignerWithAddress) => {
    const Kresko = await hre.getContractOrFork("Kresko");

    const krAssets = await Kresko.getPoolKrAssets();
    for (const krAsset of krAssets) {
        const contract = await hre.ethers.getContractAt("MockERC20", krAsset);
        const balance = fromBig(await contract.balanceOf(user.address));
        console.log(`krAsset ${await contract.symbol()}`, balance);
    }
};
