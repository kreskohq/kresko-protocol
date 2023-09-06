// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19;

import {ms} from "minter/libs/LibMinter.sol";

import {scdp} from "scdp/libs/LibSCDP.sol";

import {SafeERC20, IERC20Permit} from "common/SafeERC20.sol";
import {AggregatorV3Interface} from "common/AggregatorV3Interface.sol";
import {WadRay} from "common/libs/WadRay.sol";

using LibSDI for SDIState global;

/**
 * @notice Asset struct for cover assets
 * @param oracle AggregatorV3Interface supporting oracle for the asset
 * @param enabled Enabled status of the asset
 */
struct Asset {
    AggregatorV3Interface oracle;
    bytes32 redstoneId;
    bool enabled;
    uint8 decimals;
}

struct SDIState {
    uint256 totalDebt;
    uint256 totalCover;
    address coverRecipient;
    mapping(address => Asset) coverAssets;
    address[] coverAssetList;
}

// Storage position
bytes32 constant SDI_STORAGE_POSITION = keccak256("kresko.sdi.storage");

// solhint-disable func-visibility
function sdi() pure returns (SDIState storage state) {
    bytes32 position = SDI_STORAGE_POSITION;
    assembly {
        state.slot := position
    }
}

library LibSDI {
    using WadRay for uint256;
    using SafeERC20 for IERC20Permit;
    using LibSDI for Asset;

    /// @notice Get the price of SDI in USD, oracle precision.
    function SDIPrice(SDIState storage self) internal view returns (uint256) {
        uint256 totalValue = scdp().getTotalPoolKrAssetValueAtRatio(1 ether, false);
        if (totalValue == 0) {
            return 10 ** ms().extOracleDecimals;
        }
        return totalValue.wadDiv(self.totalDebt);
    }

    /// @notice Cover by pulling assets.
    function cover(
        SDIState storage self,
        address asset,
        uint256 amount
    ) internal returns (uint256 shares, uint256 value) {
        require(amount > 0, "NO_COVER_RECEIVED");

        value = self.coverAssets[asset].usdWad(amount);
        sdi().totalCover += (shares = (value * 10 ** ms().extOracleDecimals).wadDiv(SDIPrice(self)));

        IERC20Permit(asset).safeTransferFrom(msg.sender, self.coverRecipient, amount);
    }

    /// @notice Returns the total effective SDI debt for the SCDP.
    function effectiveDebt(SDIState storage self) internal view returns (uint256) {
        uint256 currentCover = self.totalCoverAmount();
        uint256 totalDebt = self.totalDebt;
        if (currentCover >= totalDebt) {
            return 0;
        }
        return (totalDebt - currentCover);
    }

    /// @notice Returns the total effective SDI debt for the SCDP.
    function effectiveDebtUSD(SDIState storage self) internal view returns (uint256) {
        uint256 sdiPrice = self.SDIPrice();
        uint256 coverAmount = self.totalCoverUSD().wadDiv(sdiPrice);
        uint256 totalDebt = self.totalDebt;
        if (coverAmount >= totalDebt) {
            return 0;
        }
        return (totalDebt - coverAmount).wadMul(sdiPrice);
    }

    /// @notice Preview how many SDI are removed when burning krAssets.
    function previewBurn(
        SDIState storage self,
        address asset,
        uint256 burnAmount,
        bool ignoreFactors
    ) internal view returns (uint256 shares) {
        return ms().getKrAssetValue(asset, burnAmount, ignoreFactors).wadDiv(self.SDIPrice());
    }

    /// @notice Preview how many SDI are minted when minting krAssets.
    function previewMint(
        SDIState storage self,
        address asset,
        uint256 mintAmount,
        bool ignoreFactors
    ) internal view returns (uint256 shares) {
        return ms().getKrAssetValue(asset, mintAmount, ignoreFactors).wadDiv(self.SDIPrice());
    }

    function totalCoverAmount(SDIState storage self) internal view returns (uint256) {
        return self.totalCoverUSD().wadDiv(self.SDIPrice());
    }

    /// @notice Simply returns the total supply of SDI.
    function totalSDI(SDIState storage self) internal view returns (uint256) {
        return self.totalDebt + self.totalCoverAmount();
    }

    /// @notice Gets the total cover debt value, oracle precision
    function totalCoverUSD(SDIState storage self) internal view returns (uint256 result) {
        for (uint256 i; i < self.coverAssetList.length; ) {
            result += getDepositValue(self, self.coverAssetList[i]);
            unchecked {
                i++;
            }
        }
    }

    function price(Asset memory self) internal view returns (uint256) {
        (, int256 answer, , , ) = self.oracle.latestRoundData();

        if (answer <= 0) {
            revert("price");
        }

        return uint256(answer);
    }

    /// @notice get oracle decimal precision USD value for `amount`.
    /// @param amount amount of tokens to get USD value for.
    function usdWad(Asset memory self, uint256 amount) internal view returns (uint256) {
        return (amount * (10 ** (18 - ms().extOracleDecimals)) * self.price()) / 10 ** self.decimals;
    }

    /// @notice get total deposit value of `asset` in USD, oracle precision.
    function getDepositValue(SDIState storage self, address asset) internal view returns (uint256) {
        uint256 bal = IERC20Permit(asset).balanceOf(self.coverRecipient);
        if (bal == 0) return 0;

        Asset memory assetInfo = self.coverAssets[asset];
        return (bal * assetInfo.price()) / 10 ** assetInfo.decimals;
    }
}
