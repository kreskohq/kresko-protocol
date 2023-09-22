// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;
import {SafeERC20Permit} from "vendor/SafeERC20Permit.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {WadRay} from "libs/WadRay.sol";

import {usdWad} from "common/funcs/Prices.sol";

import {ms} from "minter/State.sol";
import {kreskoAssetAmount, krAssetAmountToValue, krAssetAmountToValues} from "minter/funcs/Conversions.sol";
import {valueToSDI} from "scdp/funcs/Conversions.sol";
import {SCDPState} from "scdp/State.sol";
import {CoverAsset} from "scdp/Types.sol";

library SDebt {
    using WadRay for uint256;
    using SafeERC20Permit for IERC20Permit;

    /// @notice Cover by pulling assets.
    function cover(
        SCDPState storage self,
        address coverAsset,
        uint256 amount
    ) internal returns (uint256 shares, uint256 value) {
        require(amount > 0, "NO_COVER_RECEIVED");
        CoverAsset memory asset = self.sdi.coverAsset[coverAsset];
        value = usdWad(amount, price(asset), asset.decimals);
        self.sdi.totalCover += (shares = valueToSDI(value, SDIPrice(self)));

        IERC20Permit(coverAsset).safeTransferFrom(msg.sender, self.sdi.coverRecipient, amount);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    Views                                   */
    /* -------------------------------------------------------------------------- */

    /// @notice Get the price of SDI in USD, oracle precision.
    function SDIPrice(SCDPState storage self) internal view returns (uint256) {
        uint256 totalValue = self.totalDebtValueAtRatioSCDP(1 ether, false);
        if (totalValue == 0) {
            return 10 ** ms().extOracleDecimals;
        }
        return totalValue.wadDiv(self.sdi.totalDebt);
    }

    /**
     * @notice Returns the value of the krAsset held in the pool at a ratio.
     * @param _ratio ratio
     * @param _ignorekFactor ignore kFactor
     * @return value in USD
     */
    function totalDebtValueAtRatioSCDP(
        SCDPState storage self,
        uint256 _ratio,
        bool _ignorekFactor
    ) internal view returns (uint256 value) {
        address[] memory assets = self.krAssets;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            value += krAssetAmountToValue(asset, kreskoAssetAmount(asset, self.debt[asset]), _ignorekFactor);
            unchecked {
                i++;
            }
        }

        // We dont need to multiply this.
        if (_ratio == 1 ether) {
            return value;
        }

        return value.wadMul(_ratio);
    }

    /**
     * @notice Returns the values of the krAsset held in the pool at a ratio.
     * @param _ratio ratio
     * @return value in USD
     * @return valueAdjusted Value adjusted by kFactors in USD
     */
    function totalDebtValuesAtRatioSCDP(
        SCDPState storage self,
        uint256 _ratio
    ) internal view returns (uint256 value, uint256 valueAdjusted) {
        address[] memory assets = self.krAssets;
        for (uint256 i; i < assets.length; ) {
            address asset = assets[i];
            (uint256 valueUnadjusted, uint256 adjusted, ) = krAssetAmountToValues(
                asset,
                kreskoAssetAmount(asset, self.debt[asset])
            );
            value += valueUnadjusted;
            valueAdjusted += adjusted;
            unchecked {
                i++;
            }
        }

        if (_ratio != 1 ether) {
            value = value.wadMul(_ratio);
            valueAdjusted = valueAdjusted.wadMul(_ratio);
        }
    }

    /// @notice Returns the total effective debt amount of the SCDP.
    function effectiveDebt(SCDPState storage self) internal view returns (uint256) {
        uint256 currentCover = self.totalCoverAmount();
        uint256 totalDebt = self.sdi.totalDebt;
        if (currentCover >= totalDebt) {
            return 0;
        }
        return (totalDebt - currentCover);
    }

    /// @notice Returns the total effective debt value of the SCDP.
    function effectiveDebtValue(SCDPState storage self) internal view returns (uint256) {
        uint256 sdiPrice = SDIPrice(self);
        uint256 coverAmount = self.totalCoverValue().wadDiv(sdiPrice);
        uint256 totalDebt = self.sdi.totalDebt;
        if (coverAmount >= totalDebt) {
            return 0;
        }
        return (totalDebt - coverAmount).wadMul(sdiPrice);
    }

    function totalCoverAmount(SCDPState storage self) internal view returns (uint256) {
        return self.totalCoverValue().wadDiv(SDIPrice(self));
    }

    /// @notice Gets the total cover debt value, oracle precision
    function totalCoverValue(SCDPState storage self) internal view returns (uint256 result) {
        address[] memory assets = self.sdi.coverAssets;
        for (uint256 i; i < assets.length; ) {
            result += coverAssetValue(self, assets[i]);
            unchecked {
                i++;
            }
        }
    }

    /// @notice Simply returns the total supply of SDI.
    function totalSDI(SCDPState storage self) internal view returns (uint256) {
        return self.sdi.totalDebt + self.totalCoverAmount();
    }

    /// @notice get total deposit value of `asset` in USD, oracle precision.
    function coverAssetValue(SCDPState storage self, address asset) internal view returns (uint256) {
        uint256 bal = IERC20Permit(asset).balanceOf(self.sdi.coverRecipient);
        if (bal == 0) return 0;

        CoverAsset memory assetInfo = self.sdi.coverAsset[asset];
        return (bal * price(assetInfo)) / 10 ** assetInfo.decimals;
    }

    function price(CoverAsset memory self) internal view returns (uint256) {
        (, int256 answer, , , ) = self.oracle.latestRoundData();

        if (answer <= 0) {
            revert("price");
        }

        return uint256(answer);
    }
}
