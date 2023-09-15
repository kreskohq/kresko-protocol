// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {IStateFacet} from "../interfaces/IStateFacet.sol";
import {KrAsset, CollateralAsset} from "common/libs/Assets.sol";
import {MinterState, ms, MinterParams} from "minter/libs/LibMinter.sol";
import {krAssetAmountToValue, collateralAmountToValue} from "minter/libs/Conversions.sol";
import {ds} from "diamond/libs/LibDiamond.sol";

/**
 * @author Kresko
 * @title View functions for protocol parameters and asset values
 * @dev As structs do not create views for members, we must expose most of the state values explicitly.
 */
contract StateFacet is IStateFacet {
    /// @inheritdoc IStateFacet
    function domainSeparator() external view returns (bytes32) {
        return ds().diamondDomainSeparator;
    }

    /// @inheritdoc IStateFacet
    function getStorageVersion() external view returns (uint256) {
        return ds().storageVersion;
    }

    /* -------------------------------------------------------------------------- */
    /*                                Configurables                               */
    /* -------------------------------------------------------------------------- */
    /// @inheritdoc IStateFacet
    function getFeeRecipient() external view returns (address) {
        return ms().feeRecipient;
    }

    /// @inheritdoc IStateFacet
    function getExtOracleDecimals() external view returns (uint8) {
        return ms().extOracleDecimals;
    }

    /// @inheritdoc IStateFacet
    function getMinCollateralRatio() external view returns (uint256) {
        return ms().minCollateralRatio;
    }

    /// @inheritdoc IStateFacet
    function getMinDebtValue() external view returns (uint256) {
        return ms().minDebtValue;
    }

    /// @inheritdoc IStateFacet
    function getLiquidationThreshold() external view returns (uint256) {
        return ms().liquidationThreshold;
    }

    /// @inheritdoc IStateFacet
    function getMaxLiquidationMultiplier() external view returns (uint256) {
        return ms().maxLiquidationMultiplier;
    }

    /// @inheritdoc IStateFacet
    function getOracleDeviationPct() external view returns (uint256) {
        return ms().oracleDeviationPct;
    }

    /// @inheritdoc IStateFacet
    function getCurrentParameters() external view returns (MinterParams memory) {
        MinterState storage s = ms();
        return
            MinterParams(
                s.minCollateralRatio,
                s.minDebtValue,
                s.liquidationThreshold,
                s.maxLiquidationMultiplier,
                s.feeRecipient,
                s.extOracleDecimals,
                s.oracleDeviationPct
            );
    }

    /* -------------------------------------------------------------------------- */
    /*                                   Assets                                   */
    /* -------------------------------------------------------------------------- */
    /// @inheritdoc IStateFacet
    function getKrAssetExists(address _kreskoAsset) external view returns (bool exists) {
        return ms().kreskoAssets[_kreskoAsset].exists;
    }

    /// @inheritdoc IStateFacet
    function getKreskoAsset(address _kreskoAsset) external view returns (KrAsset memory asset) {
        return ms().kreskoAsset(_kreskoAsset);
    }

    /// @inheritdoc IStateFacet
    function getCollateralExists(address _collateralAsset) external view returns (bool exists) {
        return ms().collateralAssets[_collateralAsset].exists;
    }

    /// @inheritdoc IStateFacet
    function getCollateralAsset(address _collateralAsset) external view returns (CollateralAsset memory asset) {
        return ms().collateralAssets[_collateralAsset];
    }

    /// @inheritdoc IStateFacet
    function getCollateralAmountToValue(
        address _collateralAsset,
        uint256 _amount,
        bool _ignoreCollateralFactor
    ) external view returns (uint256 value, uint256 oraclePrice) {
        return collateralAmountToValue(_collateralAsset, _amount, _ignoreCollateralFactor);
    }

    /// @inheritdoc IStateFacet
    function getDebtAmountToValue(
        address _kreskoAsset,
        uint256 _amount,
        bool _ignoreKFactor
    ) external view returns (uint256 value) {
        return krAssetAmountToValue(_kreskoAsset, _amount, _ignoreKFactor);
    }
}
