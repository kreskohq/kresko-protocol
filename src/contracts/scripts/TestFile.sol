import {Script} from "forge-std/Script.sol";

import {ScriptBase} from "kresko-lib/utils/ScriptBase.s.sol";

import {TestBase} from "kresko-lib/utils/TestBase.t.sol";
import {RedstoneScript} from "kresko-lib/utils/Redstone.sol";
import {ShortAssert} from "kresko-lib/utils/ShortAssert.sol";
import {console2} from "forge-std/console2.sol";
import {IERC20} from "kresko-lib/token/IERC20.sol";
import {Log} from "kresko-lib/utils/Libs.sol";
import {DeploymentFactory} from "factory/DeploymentFactory.sol";
import {IDataV1} from "../core/periphery/IDataV1.sol";
// string constant rsPrices = "ETH:2075:8,BTC:37559.01:8,EUR:1.07:8,DAI:0.9998:8,USDC:1:8,USDT:1.0006:8,JPY:0.0067:8,XAU:1981.68:8,WTI:77.5:8";
string constant rsPrices = "ETH:2075:8,BTC:37559.01:8,ARB:1.1:8,DAI:0.9998:8,USDC:1:8,SPY:450:8";

contract MyScript is TestBase("MNEMONIC_DEVNET"), RedstoneScript("./utils/getRedstonePayload.js") {
    using Log for *;

    bytes redstonePayload;

    function run() public {
        redstonePayload = getRedstonePayload(rsPrices);
        vm.createSelectFork("arbitrumSepolia");
        broadcastWith(getAddr(0));
        IDataV1 data = IDataV1(getDeployed(".DataV1"));

        (, bytes memory result) = address(data).call(
            abi.encodePacked(abi.encodeWithSelector(data.getAccountRs.selector, getAddr(0)), redstonePayload)
        );

        IDataV1.DAccount memory acc = data.getAccount(getAddr(0), redstonePayload);
        IDataV1.DAccount memory acc1 = abi.decode(result, (IDataV1.DAccount));
        acc.phase.clg("phase");
        acc1.phase.clg("phase1");
    }

    function getDeployed(string memory key) internal view returns (address) {
        string memory json = vm.readFile(string.concat(vm.projectRoot(), "/out/arbitrum-sepolia.json"));
        return vm.parseJsonAddress(json, key);
    }
}
