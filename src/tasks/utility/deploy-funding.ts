import { toBig } from "@kreskolabs/lib";
import { task } from "hardhat/config";
import { KISS, MockERC20, Multisender, WETH } from "types";
import { TokenStruct } from "types/typechain/src/contracts/test/Multisender";

task("deploy-funding", "funds a set of accounts", async (_, hre) => {
    const { getContract, getSigners } = hre.ethers;
    const { deployer } = await hre.getUsers();

    const signers = await getSigners();

    const funder = signers[52];

    const OP = await getContract<MockERC20>("OP");
    const WETH = await getContract<WETH>("WETH");
    const KISS = await getContract<KISS>("KISS");

    const tokens: TokenStruct[] = [
        {
            amount: toBig(500),
            token: OP.address,
        },
    ];
    const [Multisender] = await hre.deploy<Multisender>("Multisender", {
        from: deployer.address,
        args: [tokens, WETH.address, KISS.address],
    });

    if (!(await Multisender.owners(funder.address))) {
        await Multisender.toggleOwners([funder.address]);
    }

    if ((await KISS.balanceOf(Multisender.address)).lt(toBig(500_000)))
        await KISS.transfer(Multisender.address, toBig(10_000_000));

    if ((await hre.ethers.provider.getBalance(Multisender.address)).lt(toBig(1.5))) {
        console.log("Sending ether");
        await deployer.sendTransaction({
            to: Multisender.address,
            data: "0x",
            nonce: await deployer.getTransactionCount(),
            value: toBig(2.5),
        });
    }

    // const testUsers = signers.slice(31, 51).map(s => s.address);
    // const wethAmount = toBig(2);
    // const ethAmount = toBig(0.025);
    // const kissAmount = toBig(10000);

    // await Multisender.distribute(
    //     testUsers.concat("0x379F97846a0293A7197E4B510B631e53F9e1202A"),
    //     wethAmount,
    //     ethAmount,
    //     kissAmount,
    // );
});
