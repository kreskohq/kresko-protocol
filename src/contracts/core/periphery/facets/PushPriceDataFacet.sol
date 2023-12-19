// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {PType} from "periphery/PTypes.sol";
import {IPushPriceDataFacet} from "periphery/interfaces/IPushPriceDataFacet.sol";
import {PFuncPushPriced} from "periphery/PFuncsPushPriced.sol";

contract PushPriceDataFacet is IPushPriceDataFacet {
    /// @inheritdoc IPushPriceDataFacet
    function getProtocolDataPushPriced() external view returns (PType.Protocol memory) {
        return PFuncPushPriced.getProtocol();
    }

    /// @inheritdoc IPushPriceDataFacet
    function getAccountDataPushPriced(address _account) external view returns (PType.Account memory) {
        return PFuncPushPriced.getAccount(_account);
    }

    /// @inheritdoc IPushPriceDataFacet
    function getDataMinterPushPriced() external view returns (PType.Minter memory) {
        return PFuncPushPriced.getMinter();
    }

    /// @inheritdoc IPushPriceDataFacet
    function getDataSCDPPushPriced() external view returns (PType.SCDP memory) {
        return PFuncPushPriced.getSCDP();
    }

    /// @inheritdoc IPushPriceDataFacet
    function getTotalsSCDPPushPriced() external view returns (PType.STotals memory result) {
        (result, ) = PFuncPushPriced.getSData();
    }

    /// @inheritdoc IPushPriceDataFacet
    function getAccountsMinterPushPriced(address[] memory _accounts) external view returns (PType.MAccount[] memory result) {
        result = new PType.MAccount[](_accounts.length);

        for (uint256 i; i < _accounts.length; ) {
            address account = _accounts[i];
            result[i] = PFuncPushPriced.getMAccount(account);
            unchecked {
                i++;
            }
        }
    }

    /// @inheritdoc IPushPriceDataFacet
    function getAccountSCDPPushPriced(address _account) external view returns (PType.SAccount memory) {
        return PFuncPushPriced.getSAccount(_account, PFuncPushPriced.getSDepositAssets());
    }

    /// @inheritdoc IPushPriceDataFacet
    function getAccountsSCDPPushPriced(
        address[] memory _accounts,
        address[] memory _assets
    ) external view returns (PType.SAccount[] memory result) {
        result = new PType.SAccount[](_accounts.length);

        for (uint256 i; i < _accounts.length; ) {
            address account = _accounts[i];
            result[i] = PFuncPushPriced.getSAccount(account, _assets);
            unchecked {
                i++;
            }
        }
    }

    /// @inheritdoc IPushPriceDataFacet
    function getAssetDataSCDPPushPriced(address _assetAddr) external view returns (PType.AssetData memory results) {
        return PFuncPushPriced.getSAssetData(_assetAddr);
    }

    /// @inheritdoc IPushPriceDataFacet
    function getAssetDatasSCDPPushPriced(address[] memory _assets) external view returns (PType.AssetData[] memory results) {
        // address[] memory collateralAssets = scdp().collaterals;
        results = new PType.AssetData[](_assets.length);

        for (uint256 i; i < _assets.length; ) {
            address asset = _assets[i];
            results[i] = PFuncPushPriced.getSAssetData(asset);
            unchecked {
                i++;
            }
        }
    }
}
