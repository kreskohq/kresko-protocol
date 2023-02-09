import { testnetConfigs, assets as goerliAssets, oracles } from "@deploy-config/testnet-goerli";
import { fromBig, toBig } from "@kreskolabs/lib";
import { getLogger } from "@kreskolabs/lib/dist/utils";
import { task } from "hardhat/config";
import { FluxPriceFeedFactory, KISS, MockERC20, Multisender, WETH } from "types";
import { TokenStruct } from "types/typechain/src/contracts/test/Multisender";

task("deploy-funding", "funds a set of accounts", async (_, hre) => {
    const { getContract, getSigners } = hre.ethers;
    const { deployer } = await hre.getUsers();
    const { feedValidator } = await hre.ethers.getNamedSigners();
    // const factory = await getContract<FluxPriceFeedFactory>("FluxPriceFeedFactory");
    // //
    // const assets = [
    //     ...testnetConfigs[hre.network.name].collaterals,
    //     ...testnetConfigs[hre.network.name].krAssets,
    //     goerliAssets.KISS,
    // ];
    console.log(deployer);
    // const logger = getLogger("create-oracle-factory");
    // const pricePairs = assets.map(asset => asset.oracle.description);
    // const prices = await Promise.all(assets.map(asset => asset.price()));
    // const decimals = assets.map(() => 8);
    // const marketOpens = await Promise.all(assets.map(asset => asset.marketOpen()));
    // await factory
    //     .connect(feedValidator)
    //     .transmit(
    //         pricePairs.slice(0, 6),
    //         decimals.slice(0, 6),
    //         prices.slice(0, 6),
    //         marketOpens.slice(0, 6),
    //         feedValidator.address,
    //     );
    // await factory
    //     .connect(feedValidator)
    //     .transmit(pricePairs.slice(6), decimals.slice(6), prices.slice(6), marketOpens.slice(6), feedValidator.address);
    // logger.success("All price feeds deployed");
    // const KISS = goerliAssets.KISS;
    // const logger = getLogger("create-oracle-factory");

    // const [factory] = await hre.deploy("FluxPriceFeedFactory", {
    //     from: feedValidator.address,
    // });

    // const owner = await factory.owner();
    // console.log(owner);
    // // await factory
    // //     .connect(feedValidator)
    // //     .transmit(
    // //         [KISS.oracle.description],
    // //         [8],
    // //         [await KISS.price()],
    // //         [await KISS.marketOpen()],
    // //         feedValidator.address,
    // //     );

    // const assets = Object.values(oracles).filter(o => !!o.createFlux);

    // const pricePairs = assets.map(asset => asset.description);
    // const prices = await Promise.all(assets.map(asset => 0));
    // const decimals = assets.map(() => 8);
    // const marketOpens = await Promise.all(assets.map(asset => true));

    // await factory
    //     .connect(feedValidator)
    //     .transmit(
    //         pricePairs.slice(0, 6),
    //         decimals.slice(0, 6),
    //         prices.slice(0, 6),
    //         marketOpens.slice(0, 6),
    //         feedValidator.address,
    //     );
    // await factory
    //     .connect(feedValidator)
    //     .transmit(pricePairs.slice(6), decimals.slice(6), prices.slice(6), marketOpens.slice(6), feedValidator.address);

    // logger.success("All price feeds deployed");
    // const id = await factory.getId("TSLA/USD", 8, feedValidator);

    // await deployer.sendTransaction({
    //     to: feedValidator,
    //     value: toBig(4, 18),
    // });
    // console.log(feedValidator);
    // const result = await factory.valueFor(id);
    // console.log(fromBig(result[0], 8));
    // const signers = await getSigners();

    // const funder = signers[52];

    // const WETH = await getContract<WETH>("WETH");
    // const KISS = await getContract<KISS>("KISS");

    // const dai = await getContract<MockERC20>("DAI");
    // const krTSLA = await getContract<KreskoAsset>("krTSLA");
    // const krETH = await getContract<KreskoAsset>("krETH");
    // const Diamond = await getContract<Kresko>("Diamond");
    // const daik = await Diamond.collateralAsset(dai.address);
    // const krTSLAk = await Diamond.collateralAsset(krTSLA.address);

    // const bal = await krETH.balanceOf("0x57FC147097e272cd60D6d3FBb49Ff47924aD2a86");
    // const debt = await Diamond.kreskoAssetDebt("0x57FC147097e272cd60D6d3FBb49Ff47924aD2a86", krETH.address);

    // console.log(fromBig(bal, 18));
    // console.log(bal);
    // console.log(debt);
    // console.log(hre.ethers.utils.formatUnits(bal, 18));
    // console.log(hre.ethers.utils.formatUnits(debt, 18));
    // const addresses = ["0x1fCc0DE164a21362a7f169Dfe356186a3c538Abb"];
    // // const addresses = [
    // //     "0x0A845EF8d7423cf2f27d37c7b39bbd51008Fa835",
    // //     "0x9976F2E65A21Bb581Cb1302eF5F054BB998fdBe6",
    // //     "0xBDbe702b6DBd2F380A6A3d959DC99A6f2e96145C",
    // // ];

    // const Multisender = await getContract<Multisender>("Multisender");

    // const KISSAmount = hre.ethers.utils.parseEther("1");
    // const WETHAmount = hre.ethers.utils.parseEther("2");
    // const ETHAmount = hre.ethers.utils.parseEther("0.02");
    // console.log(Multisender.address);
    // const tx = await Multisender.distribute(addresses, 0, 0, KISSAmount);
    // console.log(tx.hash);
    // const vals = await Diamond.batchOracleValues([dai.address], [daik.oracle], [daik.marketStatusOracle]);
    // console.log(fromBig(vals[0].price, 8));

    // const tokens: TokenStruct[] = [
    //     {
    //         amount: toBig(500),
    //         token: OP.address,
    //     },
    // ];
    // const [Multisender] = await hre.deploy<Multisender>("Multisender", {
    //     from: deployer.address,
    //     args: [[], WETH.address, KISS.address],
    // });

    // if (!(await Multisender.owners(funder.address))) {
    //     await Multisender.toggleOwners([funder.address]);
    // }

    // if ((await KISS.balanceOf(Multisender.address)).lt(toBig(500_000)))
    //     await KISS.transfer(Multisender.address, toBig(10_000_000));

    // const txData = hre.ethers.utils.hexlify(
    //     hre.ethers.utils.toUtf8Bytes(
    //         "With the threat of the comet looming, mastering new technologies is more important than ever",
    //     ),
    // );
    // console.log("Sending ether");
    // await deployer.sendTransaction({
    //     to: Multisender.address,
    //     data: txData,
    //     nonce: await deployer.getTransactionCount(),
    //     value: toBig(4),
    // });

    // const testUsers = signers.slice(31, 51).map(s => s.address);

    // for (const user of testUsers) {
    //     const funded = await Multisender.funded(testUsers[0]);
    //     console.log(funded);
    //     console.log(funded, signers[])
    // }

    // const wethAmount = toBig(2);
    // const ethAmount = toBig(0.025);
    // const kissAmount = toBig(10000);

    // const KISSAmount = hre.ethers.utils.parseEther("5000");
    // const WETHAmount = hre.ethers.utils.parseEther("2");
    // const ETHAmount = hre.ethers.utils.parseEther("0.02");
    // console.log(Multisender.address);
    // const tx = await Multisender.distribute(["0x1fCc0DE164a21362a7f169Dfe356186a3c538Abb"], WETHAmount, 0, 0);

    // const res = await tx.wait();
    // console.log(res);
});
