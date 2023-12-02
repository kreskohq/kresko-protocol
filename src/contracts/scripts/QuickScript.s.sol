// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {ScriptBase} from "kresko-lib/utils/ScriptBase.s.sol";
import {RedstoneScript} from "kresko-lib/utils/Redstone.sol";
import {DataV1, IDataV1} from "periphery/DataV1.sol";
import {PType} from "periphery/PTypes.sol";
import {console2} from "forge-std/console2.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {ArbSepolia} from "kresko-lib/info/testnet/ArbitrumSepolia.sol";
import {Sepolia} from "kresko-lib/info/testnet/Sepolia.sol";
import {Log} from "kresko-lib/utils/Libs.sol";
import {MockERC20} from "mocks/MockERC20.sol";
import {IFactoryV3, INFTManager, IPoolV3} from "./utils/UniV3.sol";
import {IWETH9} from "kresko-lib/token/IWETH9.sol";
import {IAggregatorV3} from "kresko-lib/vendor/IAggregatorV3.sol";
import {MockERC1155} from "mocks/MockERC1155.sol";
import {AggregatorV3Normalizer} from "../core/test/AggregatorV3Normalizer.sol";
import {DeploymentFactory} from "factory/DeploymentFactory.sol";

string constant rsPrices = "ETH:2075:8,BTC:37559.01:8,EUR:1.07:8,DAI:0.9998:8,USDC:1:8,USDT:1.0006:8,JPY:0.0067:8,XAU:1981.68:8,WTI:77.5:8";

contract QuickScript is ScriptBase("MNEMONIC_DEVNET"), RedstoneScript("./utils/getRedstonePayload.js") {
    using Log for *;

    function run() external {
        vm.createSelectFork("arbitrumSepolia");
        broadcastWith(getAddr(0));
        AggregatorV3Normalizer feed = new AggregatorV3Normalizer(0x7aAB32404b077C77858e4fd476b42c7BD9D8AB00);
        DeploymentFactory factory = DeploymentFactory(getDeployed(".Factory"));
    }

    function getDeployed(string memory key) internal view returns (address) {
        string memory json = vm.readFile(string.concat(vm.projectRoot(), "/out/arbitrum.json"));
        return vm.parseJsonAddress(json, key);
    }
}
