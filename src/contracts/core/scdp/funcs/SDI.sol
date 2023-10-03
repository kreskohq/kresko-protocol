// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

import {WadRay} from "libs/WadRay.sol";
import {SafeERC20Permit} from "vendor/SafeERC20Permit.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {cs} from "common/State.sol";
import {Asset} from "common/Types.sol";
import {usdWad, SDIPrice} from "common/funcs/Prices.sol";
import {SDIState} from "scdp/State.sol";

library SDebtIndex {
    using SafeERC20Permit for IERC20Permit;
    using WadRay for uint256;

    function valueToSDI(uint256 valueIn, uint8 oracleDecimals) internal view returns (uint256) {
        return (valueIn * 10 ** oracleDecimals).wadDiv(SDIPrice());
    }

    /// @notice Cover by pulling assets.
    function cover(
        SDIState storage self,
        address coverAssetAddr,
        uint256 amount
    ) internal returns (uint256 shares, uint256 value) {
        require(amount > 0, "NO_COVER_RECEIVED");
        Asset storage asset = cs().assets[coverAssetAddr];
        require(asset.isSCDPCoverAsset, "NOT_SCDP_COVER_ASSET");

        value = usdWad(amount, asset.price(), asset.decimals);
        self.totalCover += (shares = valueToSDI(value, 8));

        IERC20Permit(coverAssetAddr).safeTransferFrom(msg.sender, self.coverRecipient, amount);
    }

    /// @notice Returns the total effective debt amount of the SCDP.
    function effectiveDebt(SDIState storage self) internal view returns (uint256) {
        uint256 currentCover = self.totalCoverAmount();
        uint256 totalDebt = self.totalDebt;
        if (currentCover >= totalDebt) {
            return 0;
        }
        return (totalDebt - currentCover);
    }

    /// @notice Returns the total effective debt value of the SCDP.
    function effectiveDebtValue(SDIState storage self) internal view returns (uint256) {
        uint256 sdiPrice = SDIPrice();
        uint256 coverValue = self.totalCoverValue();
        uint256 coverAmount = coverValue != 0 ? coverValue.wadDiv(sdiPrice) : 0;
        uint256 totalDebt = self.totalDebt;
        if (coverValue == 0) {
            return totalDebt.wadMul(sdiPrice);
        } else if (coverAmount >= totalDebt) {
            return 0;
        }
        return (totalDebt - coverAmount).wadMul(sdiPrice);
    }

    function totalCoverAmount(SDIState storage self) internal view returns (uint256) {
        return self.totalCoverValue().wadDiv(SDIPrice());
    }

    /// @notice Gets the total cover debt value, oracle precision
    function totalCoverValue(SDIState storage self) internal view returns (uint256 result) {
        address[] memory assets = self.coverAssets;
        for (uint256 i; i < assets.length; ) {
            unchecked {
                result += coverAssetValue(self, assets[i]);
                i++;
            }
        }
    }

    /// @notice Simply returns the total supply of SDI.
    function totalSDI(SDIState storage self) internal view returns (uint256) {
        return self.totalDebt + self.totalCoverAmount();
    }

    /// @notice Get total deposit value of `asset` in USD, oracle precision.
    function coverAssetValue(SDIState storage self, address _assetAddr) internal view returns (uint256) {
        uint256 bal = IERC20Permit(_assetAddr).balanceOf(self.coverRecipient);
        if (bal == 0) return 0;

        Asset storage asset = cs().assets[_assetAddr];
        if (!asset.isSCDPCoverAsset) return 0;
        return (bal * asset.price()) / 10 ** asset.decimals;
    }
}
