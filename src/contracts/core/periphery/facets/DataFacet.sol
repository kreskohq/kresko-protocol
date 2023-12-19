// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {PType} from "periphery/PTypes.sol";
import {IDataFacet} from "periphery/interfaces/IDataFacet.sol";
import {PFunc} from "periphery/PFuncs.sol";

contract DataFacet is IDataFacet {
    /// @inheritdoc IDataFacet
    function getProtocolData() external view returns (PType.Protocol memory) {
        return PFunc.getProtocol();
    }

    /// @inheritdoc IDataFacet
    function getAccountData(address _account) external view returns (PType.Account memory) {
        return PFunc.getAccount(_account);
    }

    /// @inheritdoc IDataFacet
    function getDataSCDP() external view returns (PType.SCDP memory) {
        return PFunc.getSCDP();
    }

    function getTokenBalances(
        address _account,
        address[] memory _tokens
    ) external view returns (PType.Balance[] memory result) {
        result = new PType.Balance[](_tokens.length);

        for (uint256 i; i < _tokens.length; i++) {
            result[i] = PFunc.getBalance(_account, _tokens[i]);
        }
    }

    function getAccountGatingPhase(address _account) external view returns (uint8 phase, bool eligibleForCurrentPhase) {
        return PFunc.getPhaseEligibility(_account);
    }

    /// @inheritdoc IDataFacet
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

    /// @inheritdoc IDataFacet
    function getAccountSCDP(address _account) external view returns (PType.SAccount memory) {
        return PFunc.getSAccount(_account, PFunc.getSDepositAssets());
    }

    /// @inheritdoc IDataFacet
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

    /// @inheritdoc IDataFacet
    function getAssetDataSCDP(address _assetAddr) external view returns (PType.AssetData memory results) {
        return PFunc.getSAssetData(_assetAddr);
    }

    /// @inheritdoc IDataFacet
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
