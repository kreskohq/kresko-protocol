// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.8.14;

import {WadRay} from "../../libs/WadRay.sol";
import {InterestRateEvent} from "../../libs/Events.sol";
import {LibStabilityRate} from "../libs/LibStabilityRate.sol";
import {StabilityRateConfig} from "../InterestRateState.sol";
import {ms} from "../MinterStorage.sol";
import {irs} from "../InterestRateState.sol";
import {IERC20Upgradeable} from "../../shared/IERC20Upgradeable.sol";
import {MinterModifiers, DiamondModifiers, Error} from "../../shared/Modifiers.sol";
import {SafeERC20Upgradeable, IERC20Upgradeable} from "../../shared/SafeERC20Upgradeable.sol";
import "hardhat/console.sol";

/* solhint-disable var-name-mixedcase */
/* solhint-disable func-name-mixedcase */

/**
 * @title Stability rate facet
 * @author Kresko
 * @notice Stability rate related views and state operations
 * @dev Uses both MinterState (ms) and InterestRateState (irs)
 */
contract StabilityRateFacet is MinterModifiers, DiamondModifiers {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using WadRay for uint256;
    using LibStabilityRate for StabilityRateConfig;

    // Stability Rate setup struct
    struct StabilityRateSetup {
        uint128 stabilityRateBase;
        uint128 rateSlope1;
        uint128 rateSlope2;
        uint128 optimalPriceRate;
        uint128 priceRateDelta;
    }

    /* -------------------------------------------------------------------------- */
    /*                              ASSET STATE WRITES                            */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Initialize an asset with stability rate setup values
     * @param _asset asset to setup
     * @param _setup setup parameters
     */
    function initializeStabilityRateForAsset(address _asset, StabilityRateSetup memory _setup) external onlyOwner {
        require(irs().KISS != address(0), Error.KISS_NOT_SET);
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
    function configureStabilityRatesForAsset(address _asset, StabilityRateSetup memory _setup) external onlyOwner {
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
     * @param _KISS  The address of the oracle
     */
    function updateKISS(address _KISS) external onlyOwner {
        irs().KISS = _KISS;
        emit InterestRateEvent.KISSUpdated(_KISS);
    }

    /* -------------------------------------------------------------------------- */
    /*                                REPAYMENT                                   */
    /* -------------------------------------------------------------------------- */

    /**
     * @notice Repays part of accrued stability rate interest for a single asset
     * @param _account Account to repay interest for
     * @param _asset Kresko asset to repay interest for
     * @return repaymentValue value repaid
     */
    function repayStabilityRateInterestPartial(
        address _account,
        address _asset,
        uint256 _amount
    ) external nonReentrant kreskoAssetExists(_asset) returns (uint256 repaymentValue) {
        // Update debt index for the asset
        uint256 newDebtIndex = irs().srAssets[_asset].updateDebtIndex();

        // Get the accrued interest in repayment token
        (, uint256 maxRepayment) = ms().getKreskoAssetDebtInterest(_account, _asset);

        // If no interest has accrued or 0 was supplied - no further operations needed
        // Do not revert because we want the preserve new debt index and stability rate
        if (maxRepayment == 0 || _amount == 0) {
            // Update stability rate for asset
            irs().srAssets[_asset].updateStabilityRate();
            return 0;
        }

        // In overflow we can repay all interest
        if (_amount > maxRepayment) {
            repaymentValue = maxRepayment;
        } else {
            repaymentValue = ms().getKrAssetValue(_asset, _amount, true).rawValue;
        }

        // Transfer the accrued interest
        IERC20Upgradeable(irs().KISS).safeTransferFrom(msg.sender, ms().feeRecipient, repaymentValue);
        uint256 amountScaled = repaymentValue.wadToRay().rayDiv(newDebtIndex);

        // Reduce the scaled debt
        irs().srAssetsUser[_account][_asset].debtScaled -= uint128(amountScaled);
        // Update the last debt index
        irs().srAssetsUser[_account][_asset].lastDebtIndex = uint128(newDebtIndex);
        // Update stability rate for asset
        irs().srAssets[_asset].updateStabilityRate();
        // Emit event with the account, asset and amount repaid
        emit InterestRateEvent.StabilityRateInterestRepaid(_account, _asset, repaymentValue);
    }

    /**
     * @notice Repays accrued stability rate interest for a single asset
     * @param _account Account to repay interest for
     * @param _asset Kresko asset to repay interest for
     * @return repaymentValue value repaid
     */
    function repayFullStabilityRateInterest(address _account, address _asset)
        external
        nonReentrant
        kreskoAssetExists(_asset)
        returns (uint256 repaymentValue)
    {
        return ms().repayFullStabilityRateInterest(_account, _asset);
    }

    /**
     * @notice Repays all accrued stability rate interest for an account
     * @param _account Account to repay all asset interests for
     */
    function batchRepayFullStabilityRateInterest(address _account)
        external
        nonReentrant
        returns (uint256 repaymentValue)
    {
        address[] memory mintedKreskoAssets = ms().getMintedKreskoAssets(_account);
        for (uint256 i; i < mintedKreskoAssets.length; i++) {
            repaymentValue += ms().repayFullStabilityRateInterest(_account, mintedKreskoAssets[i]);
        }
        emit InterestRateEvent.StabilityRateInterestBatchRepaid(_account, repaymentValue);
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
     * @notice Get total accrued stability fee
     * @param _asset asset to view the total accrued for
     */
    function getTotalStabilityFeeAccrued(address _asset) external view returns (uint256) {
        uint256 totalSupply = IERC20Upgradeable(_asset).totalSupply();
        return totalSupply.rayMul(irs().srAssets[_asset].getNormalizedDebtIndex()) - totalSupply;
    }

    /**
     * @notice The configured address of KISS
     */
    function KISS() external view returns (address) {
        return irs().KISS;
    }
}
