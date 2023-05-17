// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.14;
import {MinterEvent} from "../../libs/Events.sol";

interface IBurnHelperFacet {
    function batchCloseKrAssetDebtPositions(address _account) external;

    function closeKrAssetDebtPosition(address _account, address _kreskoAsset) external;
}
