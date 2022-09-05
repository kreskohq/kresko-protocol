// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

import {IState} from "../interfaces/IState.sol";

import {MinterParams, FixedPoint, KrAsset, CollateralAsset} from "../MinterTypes.sol";
import {MinterState, ms} from "../MinterStorage.sol";

/**
 * @title View functions for protocol parameters and asset values
 * @author Kresko
 * @dev Structs do not create views for members.
 */
contract StateFacet is IState {
    function domainSeparator() external view returns (bytes32) {
        return ms().domainSeparator;
    }

    function minterInitializations() external view returns (uint256) {
        return ms().initializations;
    }

    /* -------------------------------------------------------------------------- */
    /*                                Configurables                               */
    /* -------------------------------------------------------------------------- */
    function feeRecipient() external view returns (address) {
        return ms().feeRecipient;
    }

    function minimumCollateralizationRatio() external view returns (FixedPoint.Unsigned memory) {
        return ms().minimumCollateralizationRatio;
    }

    function liquidationIncentiveMultiplier() external view returns (FixedPoint.Unsigned memory) {
        return ms().liquidationIncentiveMultiplier;
    }

    function minimumDebtValue() external view returns (FixedPoint.Unsigned memory) {
        return ms().minimumDebtValue;
    }

    function liquidationThreshold() external view returns (FixedPoint.Unsigned memory) {
        return ms().liquidationThreshold;
    }

    function getAllParams() external view returns (MinterParams memory) {
        MinterState storage s = ms();
        return
            MinterParams(
                s.minimumCollateralizationRatio,
                s.liquidationIncentiveMultiplier,
                s.minimumDebtValue,
                s.liquidationThreshold,
                s.feeRecipient
            );
    }

    /* -------------------------------------------------------------------------- */
    /*                                   Assets                                   */
    /* -------------------------------------------------------------------------- */
    /**
     * @notice Returns true if the @param _krAsset exists in the protocol
     */
    function krAssetExists(address _krAsset) external view returns (bool) {
        return ms().kreskoAssets[_krAsset].exists;
    }

    /**
     * @notice Get the state of a specific krAsset
     * @param _asset Address of the asset.
     * @return State of assets `KrAsset` struct
     */
    function kreskoAsset(address _asset) external view returns (KrAsset memory) {
        return ms().kreskoAsset(_asset);
    }

    /**
     * @notice Returns true if the @param _collateralAsset exists in the protocol
     */
    function collateralExists(address _collateralAsset) external view returns (bool) {
        return ms().collateralAssets[_collateralAsset].exists;
    }

    /**
     * @notice Get the state of a specific collateral asset
     * @param _asset Address of the asset.
     * @return State of assets `CollateralAsset` struct
     */
    function collateralAsset(address _asset) external view returns (CollateralAsset memory) {
        return ms().collateralAssets[_asset];
    }

    /**
     * @notice Gets the collateral value for a single collateral asset and amount.
     * @param _collateralAsset The address of the collateral asset.
     * @param _amount The amount of the collateral asset to calculate the collateral value for.
     * @param _ignoreCollateralFactor Boolean indicating if the asset's collateral factor should be ignored.
     * @return The collateral value for the provided amount of the collateral asset.
     */
    function getCollateralValueAndOraclePrice(
        address _collateralAsset,
        uint256 _amount,
        bool _ignoreCollateralFactor
    ) external view returns (FixedPoint.Unsigned memory, FixedPoint.Unsigned memory) {
        return ms().getCollateralValueAndOraclePrice(_collateralAsset, _amount, _ignoreCollateralFactor);
    }

    /**
     * @notice Gets the USD value for a single Kresko asset and amount.
     * @param _kreskoAsset The address of the Kresko asset.
     * @param _amount The amount of the Kresko asset to calculate the value for.
     * @param _ignoreKFactor Boolean indicating if the asset's k-factor should be ignored.
     * @return The value for the provided amount of the Kresko asset.
     */
    function getKrAssetValue(
        address _kreskoAsset,
        uint256 _amount,
        bool _ignoreKFactor
    ) external view returns (FixedPoint.Unsigned memory) {
        return ms().getKrAssetValue(_kreskoAsset, _amount, _ignoreKFactor);
    }
}
