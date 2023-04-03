// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;
import {ms} from "../MinterStorage.sol";
import {FixedPoint} from "../../libs/FixedPoint.sol";

/**
 * @title Library for Kresko specific decimals
 */
library LibDecimals {
    using FixedPoint for FixedPoint.Unsigned;

    /**
     * @notice For a given collateral asset and amount, returns a FixedPoint.Unsigned representation.
     * @dev If the collateral asset has decimals other than 18, the amount is scaled appropriately.
     *   If decimals > 18, there may be a loss of precision.
     * @param _collateralAssetDecimals The collateral asset's number of decimals
     * @param _amount The amount of the collateral asset.
     * @return A FixedPoint.Unsigned of amount scaled according to the collateral asset's decimals.
     */
    function toCollateralFixedPointAmount(
        uint256 _collateralAssetDecimals,
        uint256 _amount
    ) internal pure returns (FixedPoint.Unsigned memory) {
        // Initially, use the amount as the raw value for the FixedPoint.Unsigned,
        // which internally uses FixedPoint.FP_DECIMALS (18) decimals. Most collateral
        // assets will have 18 decimals.
        FixedPoint.Unsigned memory fixedPointAmount = FixedPoint.Unsigned(_amount);
        // Handle cases where the collateral asset's decimal amount is not 18.
        if (_collateralAssetDecimals < FixedPoint.FP_DECIMALS) {
            // If the decimals are less than 18, multiply the amount
            // to get the correct fixed point value.
            // E.g. 1 full token of a 17 decimal token will  cause the
            // initial setting of amount to be 0.1, so we multiply
            // by 10 ** (18 - 17) = 10 to get it to 0.1 * 10 = 1.
            return fixedPointAmount.mul(10 ** (FixedPoint.FP_DECIMALS - _collateralAssetDecimals));
        } else if (_collateralAssetDecimals > FixedPoint.FP_DECIMALS) {
            // If the decimals are greater than 18, divide the amount
            // to get the correct fixed point value.
            // Note because FixedPoint numbers are 18 decimals, this results
            // in loss of precision. E.g. if the collateral asset has 19
            // decimals and the deposit amount is only 1 uint, this will divide
            // 1 by 10 ** (19 - 18), resulting in 1 / 10 = 0
            return fixedPointAmount.div(10 ** (_collateralAssetDecimals - FixedPoint.FP_DECIMALS));
        }
        return fixedPointAmount;
    }

    /**
     * @notice For a given collateral asset and fixed point amount, i.e. where a rawValue of 1e18 is equal to 1
     *   whole token, returns the amount according to the collateral asset's decimals.
     * @dev If the collateral asset has decimals other than 18, the amount is scaled appropriately.
     *   If decimals < 18, there may be a loss of precision.
     * @param _collateralAssetDecimals The collateral asset's number of decimals
     * @param _fixedPointAmount The fixed point amount of the collateral asset.
     * @return An amount that is compatible with the collateral asset's decimals.
     */
    function fromCollateralFixedPointAmount(
        uint256 _collateralAssetDecimals,
        FixedPoint.Unsigned memory _fixedPointAmount
    ) internal pure returns (uint256) {
        // Initially, use the rawValue, which internally uses FixedPoint.FP_DECIMALS (18) decimals
        // Most collateral assets will have 18 decimals.
        uint256 amount = _fixedPointAmount.rawValue;
        // Handle cases where the collateral asset's decimal amount is not 18.
        if (_collateralAssetDecimals < FixedPoint.FP_DECIMALS) {
            // If the decimals are less than 18, divide the depositAmount
            // to get the correct fixed point value.
            // E.g. 1 full token will result in amount being 1e18 at this point,
            // so if the token has 17 decimals, divide by 10 ** (18 - 17) = 10
            // to get a value of 1e17.
            // This may result in a loss of precision.
            return amount / (10 ** (FixedPoint.FP_DECIMALS - _collateralAssetDecimals));
        } else if (_collateralAssetDecimals > FixedPoint.FP_DECIMALS) {
            // If the decimals are greater than 18, multiply the depositAmount
            // to get the correct fixed point value.
            // E.g. 1 full token will result in amount being 1e18 at this point,
            // so if the token has 19 decimals, multiply by 10 ** (19 - 18) = 10
            // to get a value of 1e19.
            return amount * (10 ** (_collateralAssetDecimals - FixedPoint.FP_DECIMALS));
        }
        return amount;
    }

    /**
     * @notice Divides an uint256 @param _value with @param _priceWithOracleDecimals
     * @param _value Left side value of the division
     * @param wadValue result with 18 decimals
     */
    function divByPrice(uint256 _value, uint256 _priceWithOracleDecimals) internal view returns (uint256 wadValue) {
        uint8 oracleDecimals = ms().extOracleDecimals;
        if (oracleDecimals >= 18) return _priceWithOracleDecimals;
        return (_value / _priceWithOracleDecimals) * 10 ** (oracleDecimals);
    }

    /**
     * @notice Converts an uint256 with extOracleDecimals into a number with 18 decimals
     * @param _wadPrice value with extOracleDecimals
     */
    function fromWadPriceToUint(uint256 _wadPrice) internal view returns (uint256 priceWithOracleDecimals) {
        uint8 oracleDecimals = ms().extOracleDecimals;
        if (oracleDecimals == 18) return _wadPrice;
        return _wadPrice / 10 ** (18 - oracleDecimals);
    }

    /**
     * @notice Converts an 18 decimal price to a FixedPoint with extOracleDecimals
     * @param _wadPrice value with extOracleDecimals
     * @return priceWithOracleDecimals FixedPoint value with extOracleDecimals
     */
    function fromWadPriceToFixedPoint(
        uint256 _wadPrice
    ) internal view returns (FixedPoint.Unsigned memory priceWithOracleDecimals) {
        uint8 oracleDecimals = ms().extOracleDecimals;
        if (oracleDecimals == 18) {
            return FixedPoint.Unsigned(_wadPrice);
        }
        return FixedPoint.Unsigned(_wadPrice / 10 ** (18 - oracleDecimals));
    }

    /**
     * @notice Converts an uint256 with extOracleDecimals into a number with 18 decimals
     * @param _priceWithOracleDecimals value with extOracleDecimals
     * @return wadPrice price with 18 decimals
     */
    function oraclePriceToWad(uint256 _priceWithOracleDecimals) internal view returns (uint256 wadPrice) {
        uint8 oracleDecimals = ms().extOracleDecimals;
        if (oracleDecimals == 18) {
            return _priceWithOracleDecimals;
        }
        return _priceWithOracleDecimals * 10 ** (18 - oracleDecimals);
    }

    /**
     * @notice Converts an int256 with extOracleDecimals into a number with 18 decimals
     * @param _priceWithOracleDecimals value with extOracleDecimals
     * @return wadPrice price with 18 decimals
     */
    function oraclePriceToWad(int256 _priceWithOracleDecimals) internal view returns (uint256 wadPrice) {
        uint8 oracleDecimals = ms().extOracleDecimals;
        if (oracleDecimals >= 18) return uint256(_priceWithOracleDecimals);
        return uint256(_priceWithOracleDecimals) * 10 ** (18 - oracleDecimals);
    }

    /**
     * @notice Converts an int256 with extOracleDecimals into a number with 18 decimals
     * @param _priceWithOracleDecimals value with extOracleDecimals
     * @return wadPrice price with 18 decimals
     */
    function fromFixedPointPriceToWad(
        FixedPoint.Unsigned memory _priceWithOracleDecimals
    ) internal view returns (uint256 wadPrice) {
        uint8 oracleDecimals = ms().extOracleDecimals;
        if (oracleDecimals == 18) return _priceWithOracleDecimals.rawValue;
        return _priceWithOracleDecimals.rawValue * 10 ** (18 - oracleDecimals);
    }
}
