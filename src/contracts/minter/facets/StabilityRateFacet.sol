// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.8.14;

import {Arrays} from "../../libs/Arrays.sol";
import {WadRay} from "../../libs/WadRay.sol";
import {InterestRateEvent} from "../../libs/Events.sol";
import {LibStabilityRate} from "../libs/LibStabilityRate.sol";
import {LibDecimals, FixedPoint} from "../libs/LibDecimals.sol";
import {StabilityRateConfig} from "../InterestRateState.sol";
import {ms} from "../MinterStorage.sol";
import {irs} from "../InterestRateState.sol";
import {IERC20Upgradeable} from "../../shared/IERC20Upgradeable.sol";
import {IStabilityRateFacet} from "../interfaces/IStabilityRateFacet.sol";
import {MinterModifiers, DiamondModifiers, Error, Role} from "../../shared/Modifiers.sol";
import {SafeERC20Upgradeable, IERC20Upgradeable} from "../../shared/SafeERC20Upgradeable.sol";

/* solhint-disable var-name-mixedcase */

// Stability Rate setup params
struct StabilityRateParams {
    uint128 stabilityRateBase;
    uint128 rateSlope1;
    uint128 rateSlope2;
    uint128 optimalPriceRate;
    uint128 priceRateDelta;
}

/**
 * @title Stability rate facet
 * @author Kresko
 * @notice Stability rate related views and state operations
 * @dev Uses both MinterState (ms) and InterestRateState (irs)
 */
contract StabilityRateFacet is MinterModifiers, DiamondModifiers {
    using Arrays for address[];
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using WadRay for uint256;
    using LibStabilityRate for StabilityRateConfig;
    using LibDecimals for FixedPoint.Unsigned;
    using LibDecimals for uint256;
    using FixedPoint for uint256;
    using FixedPoint for FixedPoint.Unsigned;

    /* -------------------------------------------------------------------------- */
    /*                              ASSET STATE WRITES                            */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Initialize an asset with stability rate setup values
     * @param _asset asset to setup
     * @param _setup setup parameters
     */
    function setupStabilityRateParams(address _asset, StabilityRateParams memory _setup) external onlyRole(Role.OPERATOR) {
        require(irs().kiss != address(0), Error.KISS_NOT_SET);
        require(irs().srAssets[_asset].asset == address(0), Error.STABILITY_RATES_ALREADY_INITIALIZED);
        require(WadRay.RAY >= _setup.optimalPriceRate, Error.INVALID_OPTIMAL_RATE);
        require(WadRay.RAY >= _setup.priceRateDelta, Error.INVALID_PRICE_RATE_DELTA);

        irs().srAssets[_asset] = StabilityRateConfig({
            debtIndex: uint128(WadRay.RAY),
            stabilityRateBase: _setup.stabilityRateBase,
            // solhint-disable not-rely-on-time
            lastUpdateTimestamp: uint40(block.timestamp),
            asset: _asset,
            rateSlope1: _setup.rateSlope1,
            rateSlope2: _setup.rateSlope2,
            optimalPriceRate: _setup.optimalPriceRate,
            priceRateDelta: _setup.priceRateDelta,
            stabilityRate: uint128(WadRay.RAY)
        });

        emit InterestRateEvent.StabilityRateConfigured(
            _asset,
            _setup.stabilityRateBase,
            _setup.priceRateDelta,
            _setup.rateSlope1,
            _setup.rateSlope2
        );
    }

    /**
     * @notice Configure existing stability rate values
     * @param _asset asset to configure
     * @param _setup setup parameters
     */
    function updateStabilityRateParams(address _asset, StabilityRateParams memory _setup) external onlyRole(Role.OPERATOR) {
        require(irs().srAssets[_asset].asset == _asset, Error.STABILITY_RATES_NOT_INITIALIZED);
        require(WadRay.RAY >= _setup.optimalPriceRate, Error.INVALID_OPTIMAL_RATE);
        require(WadRay.RAY >= _setup.priceRateDelta, Error.INVALID_PRICE_RATE_DELTA);

        irs().srAssets[_asset].rateSlope1 = _setup.rateSlope1;
        irs().srAssets[_asset].rateSlope2 = _setup.rateSlope2;
        irs().srAssets[_asset].optimalPriceRate = _setup.optimalPriceRate;
        irs().srAssets[_asset].priceRateDelta = _setup.priceRateDelta;
        irs().srAssets[_asset].stabilityRateBase = _setup.stabilityRateBase;

        emit InterestRateEvent.StabilityRateConfigured(
            _asset,
            _setup.stabilityRateBase,
            _setup.priceRateDelta,
            _setup.rateSlope1,
            _setup.rateSlope2
        );
    }

    /// @notice Updates the debt index and stability rates for an asset
    /// @param _asset asset to update rate and index for
    function updateStabilityRateAndIndexForAsset(address _asset) external {
        irs().srAssets[_asset].updateDebtIndex();
        irs().srAssets[_asset].updateStabilityRate();
    }

    /**
     * @notice Sets the protocol AMM oracle address
     * @param _kiss  The address of the oracle
     */
    function updateKiss(address _kiss) external onlyRole(Role.OPERATOR) {
        irs().kiss = _kiss;
        emit InterestRateEvent.KISSUpdated(_kiss);
    }

    /* -------------------------------------------------------------------------- */
    /*                                REPAYMENT                                   */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Repays part of accrued stability rate interest for a single asset
     * @param _account Account to repay interest for
     * @param _kreskoAsset Kresko asset to repay interest for
     * @param _kissRepayAmount USD value to repay (KISS)
     */
    function repayStabilityRateInterestPartial(
        address _account,
        address _kreskoAsset,
        uint256 _kissRepayAmount
    ) external nonReentrant kreskoAssetExists(_kreskoAsset) {
        // Update debt index for the asset
        uint256 newDebtIndex = irs().srAssets[_kreskoAsset].updateDebtIndex();

        // Get the accrued interest in repayment token
        (, uint256 maxKissRepayAmount) = ms().getKreskoAssetDebtInterest(_account, _kreskoAsset);
        require(_kissRepayAmount < maxKissRepayAmount, Error.INTEREST_REPAY_NOT_PARTIAL);

        // If no interest has accrued or 0 amount was supplied as parameter - no further operations needed
        // Do not revert because we want the preserve new debt index and stability rate
        // Also removes the need to check if the kresko asset exists as the maxKissAmount will return 0
        if (_kissRepayAmount == 0 || maxKissRepayAmount == 0) {
            // Update stability rate for asset
            irs().srAssets[_kreskoAsset].updateStabilityRate();
            return;
        }

        // Transfer the accrued interest
        IERC20Upgradeable(irs().kiss).safeTransferFrom(msg.sender, ms().feeRecipient, _kissRepayAmount);
        uint256 assetAmount = _kissRepayAmount.divByPrice(ms().kreskoAssets[_kreskoAsset].uintPrice());
        uint256 amountScaled = assetAmount.wadToRay().rayDiv(newDebtIndex);
        // Update scaled values for the user
        irs().srUserInfo[_account][_kreskoAsset].debtScaled -= uint128(amountScaled);
        irs().srUserInfo[_account][_kreskoAsset].lastDebtIndex = uint128(newDebtIndex);
        // Update stability rate for asset
        irs().srAssets[_kreskoAsset].updateStabilityRate();

        // Emit event with the account, asset and amount repaid
        emit InterestRateEvent.StabilityRateInterestRepaid(_account, _kreskoAsset, _kissRepayAmount);
    }

    /**
     * @notice Repays accrued stability rate interest for a single asset
     * @param _account Account to repay interest for
     * @param _kreskoAsset Kresko asset to repay interest for
     * @return kissRepayAmount KISS value repaid
     */
    function repayFullStabilityRateInterest(address _account, address _kreskoAsset)
        external
        nonReentrant
        kreskoAssetExists(_kreskoAsset)
        returns (uint256 kissRepayAmount)
    {
        return ms().repayFullStabilityRateInterest(_account, _kreskoAsset);
    }

    /**
     * @notice Repays all accrued stability rate interest for an account
     * @param _account Account to repay all asset interests for
     * @return kissRepayAmount KISS value repaid
     */
    function batchRepayFullStabilityRateInterest(address _account)
        external
        nonReentrant
        returns (uint256 kissRepayAmount)
    {
        address[] memory mintedKreskoAssets = ms().getMintedKreskoAssets(_account);
        for (uint256 i; i < mintedKreskoAssets.length; i++) {
            kissRepayAmount += ms().repayFullStabilityRateInterest(_account, mintedKreskoAssets[i]);
        }
        emit InterestRateEvent.StabilityRateInterestBatchRepaid(_account, kissRepayAmount);
    }

    /* -------------------------------------------------------------------------- */
    /*                                   VIEWS                                    */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Gets the current stability rate for an asset
     * @param _asset asset to get the stability rate for
     * @return stabilityRate the return variables of a contract’s function state variable
     * @dev expressed in ray
     */
    function getStabilityRateForAsset(address _asset) external view returns (uint256 stabilityRate) {
        return irs().srAssets[_asset].calculateStabilityRate();
    }

    /**
     * @notice Gets the current price rate (difference between AMM <-> Oracle pricing)
     * for an asset
     * @param _asset asset to get the rate for
     * @return priceRate the current
     * @dev expressed in ray
     */
    function getPriceRateForAsset(address _asset) external view returns (uint256 priceRate) {
        return irs().srAssets[_asset].getPriceRate();
    }

    /**
     * @notice Gets the current running debt index
     * @param _asset asset to get the index for
     * @return debtIndex current running debt index
     * @dev expressed in ray
     */
    function getDebtIndexForAsset(address _asset) external view returns (uint256 debtIndex) {
        return irs().srAssets[_asset].getNormalizedDebtIndex();
    }

    /**
     * @notice View stability rate configuration for an asset
     * @param _asset asset to view configuration for
     */
    function getStabilityRateConfigurationForAsset(address _asset) external view returns (StabilityRateConfig memory) {
        return irs().srAssets[_asset];
    }

    /**
     * @notice The configured address of KISS
     */
    function kiss() external view returns (address) {
        return irs().kiss;
    }

    /**
     * @notice Get user stability rate data for an asset
     * @param _account asset to view configuration for
     * @param _asset asset to view configuration for
     * @return lastDebtIndex the previous debt index for the user
     */
    function getLastDebtIndexForAccount(address _account, address _asset)
        external
        view
        returns (uint128 lastDebtIndex)
    {
        return irs().srUserInfo[_account][_asset].lastDebtIndex;
    }
}
