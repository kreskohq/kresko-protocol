// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.20;
import {Kresko} from "./Kresko.sol";
import {Initializable} from "oz-upgradeable/proxy/utils/Initializable.sol";

contract KreskoIntegrator is Initializable {
    Kresko public kresko;

    function __KreskoIntegrator_init(address _kresko) internal onlyInitializing {
        require(_kresko != address(0), "kresko-address-zero");
        kresko = Kresko(_kresko);
    }

    modifier onlyKresko() {
        require(msg.sender == address(kresko), "!kresko");
        _;
    }

    function setKresko(Kresko _kresko) external onlyKresko {
        kresko = _kresko;
    }
}
