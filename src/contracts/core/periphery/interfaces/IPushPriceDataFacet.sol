// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {PType} from "periphery/PTypes.sol";

interface IPushPriceDataFacet {
    function getProtocolDataPushPriced() external view returns (PType.Protocol memory);

    function getAccountDataPushPriced(address _account) external view returns (PType.Account memory);

    function getAccountsMinterPushPriced(address[] memory _accounts) external view returns (PType.MAccount[] memory);

    function getAccountSCDPPushPriced(address _account) external view returns (PType.SAccount memory);

    function getAccountsSCDPPushPriced(
        address[] memory _accounts,
        address[] memory _assets
    ) external view returns (PType.SAccount[] memory);

    function getAssetDatasSCDPPushPriced(address[] memory _assets) external view returns (PType.AssetData[] memory);
}
