// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;
import {SafeERC20Permit} from "vendor/SafeERC20Permit.sol";
import {IERC20Permit} from "vendor/IERC20Permit.sol";
import {SDIState} from "scdp/State.sol";
import {CoverAsset} from "scdp/Types.sol";
import {valueToSDI} from "scdp/funcs/Conversions.sol";
import {usdWad, SDIPrice} from "common/funcs/Prices.sol";
import {WadRay} from "libs/WadRay.sol";

library SDebtIndex {
    using WadRay for uint256;
    using SafeERC20Permit for IERC20Permit;

    /// @notice Cover by pulling assets.
    function cover(SDIState storage self, address coverAsset, uint256 amount) internal returns (uint256 shares, uint256 value) {
        require(amount > 0, "NO_COVER_RECEIVED");
        CoverAsset memory asset = self.coverAsset[coverAsset];
        value = usdWad(amount, price(asset), asset.decimals);
        self.totalCover += (shares = valueToSDI(value));

        IERC20Permit(coverAsset).safeTransferFrom(msg.sender, self.coverRecipient, amount);
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
        uint256 coverAmount = self.totalCoverValue().wadDiv(sdiPrice);
        uint256 totalDebt = self.totalDebt;
        if (coverAmount >= totalDebt) {
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
            result += coverAssetValue(self, assets[i]);
            unchecked {
                i++;
            }
        }
    }

    /// @notice Simply returns the total supply of SDI.
    function totalSDI(SDIState storage self) internal view returns (uint256) {
        return self.totalDebt + self.totalCoverAmount();
    }

    /// @notice get total deposit value of `asset` in USD, oracle precision.
    function coverAssetValue(SDIState storage self, address asset) internal view returns (uint256) {
        uint256 bal = IERC20Permit(asset).balanceOf(self.coverRecipient);
        if (bal == 0) return 0;

        CoverAsset memory assetInfo = self.coverAsset[asset];
        return (bal * price(assetInfo)) / 10 ** assetInfo.decimals;
    }

    // @todo actual prices
    function price(CoverAsset memory self) internal view returns (uint256) {
        (, int256 answer, , , ) = self.oracle.latestRoundData();

        if (answer <= 0) {
            revert("price");
        }

        return uint256(answer);
    }
}
