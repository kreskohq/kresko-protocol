// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.21;

import {PType} from "periphery/PTypes.sol";
import {IPeripheryFacet} from "periphery/interfaces/IPeripheryFacet.sol";
import {PFunc} from "periphery/PFuncs.sol";

contract PeripheryFacet is IPeripheryFacet {
    /// @inheritdoc IPeripheryFacet
    function getProtocolData() external view returns (PType.Protocol memory) {
        return PFunc.getProtocol();
    }

    /// @inheritdoc IPeripheryFacet
    function getAccountData(address _account) external view returns (PType.Account memory) {
        return PFunc.getAccount(_account);
    }

    /// @inheritdoc IPeripheryFacet
    function getDataMinter() external view returns (PType.Minter memory) {
        return PFunc.getMinter();
    }

    /// @inheritdoc IPeripheryFacet
    function getDataSCDP() external view returns (PType.SCDP memory) {
        return PFunc.getSCDP();
    }

    /// @inheritdoc IPeripheryFacet
    function getTotalsSCDP() external view returns (PType.STotals memory result) {
        (result, ) = PFunc.getSData();
    }

    /// @inheritdoc IPeripheryFacet
    function getAccountsMinter(address[] memory _accounts) external view returns (PType.MAccount[] memory result) {
        result = new PType.MAccount[](_accounts.length);

        for (uint256 i; i < _accounts.length; ) {
            address account = _accounts[i];
            result[i] = PFunc.getMAccount(account);
            unchecked {
                i++;
            }
        }
    }

    /// @inheritdoc IPeripheryFacet
    function getAccountSCDP(address _account) external view returns (PType.SAccount memory) {
        return PFunc.getSAccount(_account, PFunc.getSDepositAssets());
    }

    /// @inheritdoc IPeripheryFacet
    function getAccountsSCDP(
        address[] memory _accounts,
        address[] memory _assets
    ) external view returns (PType.SAccount[] memory result) {
        result = new PType.SAccount[](_accounts.length);

        for (uint256 i; i < _accounts.length; ) {
            address account = _accounts[i];
            result[i] = PFunc.getSAccount(account, _assets);
            unchecked {
                i++;
            }
        }
    }

    /// @inheritdoc IPeripheryFacet
    function getAssetDataSCDP(address _assetAddr) external view returns (PType.AssetData memory results) {
        return PFunc.getSAssetData(_assetAddr);
    }

    /// @inheritdoc IPeripheryFacet
    function getAssetDatasSCDP(address[] memory _assets) external view returns (PType.AssetData[] memory results) {
        // address[] memory collateralAssets = scdp().collaterals;
        results = new PType.AssetData[](_assets.length);

        for (uint256 i; i < _assets.length; ) {
            address asset = _assets[i];
            results[i] = PFunc.getSAssetData(asset);
            unchecked {
                i++;
            }
        }
    }
}
