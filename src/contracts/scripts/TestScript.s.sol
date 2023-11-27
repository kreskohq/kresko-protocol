pragma solidity 0.8.21;

import {Script} from "forge-std/Script.sol";
import {RedstoneScript} from "kresko-lib/utils/Redstone.sol";
import {DataV1, IDataV1} from "periphery/DataV1.sol";
import {PType} from "periphery/PTypes.sol";
import {console2} from "forge-std/Console2.sol";

string constant rsPrices = "ETH:2075:8,BTC:37559.01:8,EUR:1.07:8,DAI:0.9998:8,USDC:1:8,USDT:1.0006:8,JPY:0.0067:8,XAU:1981.68:8,WTI:77.5:8";

contract DataTestScript is Script, RedstoneScript("./utils/getRedstonePayload.js") {
    function run() public {
        vm.createSelectFork("localhost");
        bytes memory redstoneCallData = getRedstonePayload(rsPrices);
        DataV1 dataV1 = DataV1(getDeployed(".DataV1"));

        PType.Protocol memory protocol = dataV1.getGlobals(redstoneCallData).protocol;
        console2.log("value: %s", protocol.assets.length);

        (, bytes memory data) = address(dataV1).staticcall(
            abi.encodePacked(abi.encodeWithSelector(dataV1.getGlobalsRs.selector), redstoneCallData)
        );
        PType.Protocol memory protocol2 = abi.decode(data, (IDataV1.DGlobal)).protocol;
    }

    function getDeployed(string memory key) internal view returns (address) {
        string memory json = vm.readFile(string.concat(vm.projectRoot(), "/out/arbitrum.json"));
        return vm.parseJsonAddress(json, key);
    }
}
