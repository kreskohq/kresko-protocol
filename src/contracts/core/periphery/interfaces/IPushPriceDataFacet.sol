// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;
import {PType} from "periphery/PTypes.sol";

interface IPushPriceDataFacet {
    function getProtocolDataPushPriced() external view returns (PType.Protocol memory);

    function getAccountDataPushPriced(address _account) external view returns (PType.Account memory);

    function getDataMinterPushPriced() external view returns (PType.Minter memory);

    function getDataSCDPPushPriced() external view returns (PType.SCDP memory);

    function getTotalsSCDPPushPriced() external view returns (PType.STotals memory);

    function getAccountsMinterPushPriced(address[] memory _accounts) external view returns (PType.MAccount[] memory);

    function getAccountSCDPPushPriced(address _account) external view returns (PType.SAccount memory);

    function getAccountsSCDPPushPriced(
        address[] memory _accounts,
        address[] memory _assets
    ) external view returns (PType.SAccount[] memory);

    function getAssetDataSCDPPushPriced(address _assetAddr) external view returns (PType.AssetData memory);

    function getAssetDatasSCDPPushPriced(address[] memory _assets) external view returns (PType.AssetData[] memory);
}
