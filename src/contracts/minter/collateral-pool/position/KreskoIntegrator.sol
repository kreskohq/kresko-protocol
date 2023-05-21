// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.20;
import {ICollateralPoolSwapFacet} from "../interfaces/ICollateralPoolSwapFacet.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract KreskoIntegrator is Initializable {
    ICollateralPoolSwapFacet public kresko;

    function __KreskoIntegrator_init(address _kresko) internal onlyInitializing {
        require(_kresko != address(0), "kresko-address-zero");
        kresko = ICollateralPoolSwapFacet(_kresko);
    }

    modifier onlyKresko() {
        require(msg.sender == address(kresko), "!kresko");
        _;
    }

    function setKresko(ICollateralPoolSwapFacet _kresko) external onlyKresko {
        kresko = _kresko;
    }
}
