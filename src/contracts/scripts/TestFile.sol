import {Script} from "forge-std/Script.sol";

import {ScriptBase} from "kresko-lib/utils/ScriptBase.s.sol";

import {TestBase} from "kresko-lib/utils/TestBase.t.sol";
import {RedstoneScript} from "kresko-lib/utils/Redstone.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.sol";
import {console2} from "forge-std/console2.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {Log} from "kresko-lib/utils/Libs.sol";
import {DeploymentFactory} from "factory/DeploymentFactory.sol";
string constant rsPrices = "ETH:2075:8,BTC:37559.01:8,EUR:1.07:8,DAI:0.9998:8,USDC:1:8,USDT:1.0006:8,JPY:0.0067:8,XAU:1981.68:8,WTI:77.5:8";

contract MyScript is TestBase("MNEMONIC_DEVNET"), RedstoneScript("./utils/getRedstonePayload.js") {
    using Log for *;

    function run() public returns (string memory) {
        vm.createSelectFork("arbitrumSepolia");
        broadcastWith(getAddr(0));
        return "asd f";
    }
}
