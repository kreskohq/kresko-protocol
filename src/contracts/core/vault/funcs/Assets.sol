// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.21;

import {ERC20} from "vendor/ERC20.sol";
import {CError} from "common/CError.sol";
import {VaultAsset} from "vault/Types.sol";
import {PercentageMath} from "libs/PercentageMath.sol";
import {isSequencerUp} from "common/funcs/Utils.sol";
import {Percents} from "common/Constants.sol";

/**
 * @title LibVault
 * @author Kresko
 * @notice Helper library for KreskoVault
 */
library VAssets {
    using PercentageMath for uint256;
    using PercentageMath for uint32;
    using VAssets for VaultAsset;
    using VAssets for uint256;

    /// @notice get price of an asset from the oracle speficied.
    function price(VaultAsset storage self, address _sequencerUptimeFeed) internal view returns (uint256) {
        if (!isSequencerUp(_sequencerUptimeFeed)) {
            revert CError.SEQUENCER_DOWN_NO_REDSTONE_AVAILABLE();
        }
        (, int256 answer, , uint256 updatedAt, ) = self.oracle.latestRoundData();
        if (answer < 0) {
            revert CError.NEGATIVE_PRICE(address(self.oracle), answer);
        }
        if (block.timestamp - updatedAt > self.oracleTimeout) {
            revert CError.STALE_PRICE(self.token.symbol(), block.timestamp - updatedAt, self.oracleTimeout);
        }
        return uint256(answer);
    }

    /// @notice get price of an asset from the oracle speficied.
    function handleDepositFee(
        VaultAsset storage self,
        uint256 assets
    ) internal view returns (uint256 assetsWithFee, uint256 fee) {
        uint256 depositFee = self.depositFee;
        if (depositFee == 0) {
            return (assets, 0);
        }

        fee = assets.percentMul(depositFee);
        assetsWithFee = assets - fee;
    }

    /// @notice get price of an asset from the oracle speficied.
    function handleMintFee(VaultAsset storage self, uint256 assets) internal view returns (uint256 assetsWithFee, uint256 fee) {
        uint256 depositFee = self.depositFee;
        if (depositFee == 0) {
            return (assets, 0);
        }

        assetsWithFee = assets.percentDiv(Percents.HUNDRED - depositFee);
        fee = assetsWithFee - assets;
    }

    /// @notice get price of an asset from the oracle speficied.
    function handleWithdrawFee(
        VaultAsset storage self,
        uint256 assets
    ) internal view returns (uint256 assetsWithFee, uint256 fee) {
        uint256 withdrawFee = self.withdrawFee;
        if (withdrawFee == 0) {
            return (assets, 0);
        }

        assetsWithFee = assets.percentDiv(Percents.HUNDRED - withdrawFee);
        fee = assetsWithFee - assets;
    }

    /// @notice get price of an asset from the oracle speficied.
    function handleRedeemFee(
        VaultAsset storage self,
        uint256 assets
    ) internal view returns (uint256 assetsWithFee, uint256 fee) {
        uint256 withdrawFee = self.withdrawFee;
        if (withdrawFee == 0) {
            return (assets, 0);
        }

        fee = assets.percentMul(withdrawFee);
        assetsWithFee = assets - fee;
    }

    /// @notice convert oracle decimal precision value to wad.
    function oracleToWad(uint256 value, uint8 oracleDecimals) internal pure returns (uint256) {
        return value * 10 ** (18 - oracleDecimals);
    }

    /// @notice convert wad precision value to oracle precision.
    function wadToOracle(uint256 tokenPrice, uint8 oracleDecimals) internal pure returns (uint256) {
        return tokenPrice / 10 ** (18 - oracleDecimals);
    }

    /// @notice get oracle decimal precision USD value for `amount`.
    /// @param amount amount of tokens to get USD value for.
    function usdWad(
        VaultAsset storage self,
        uint256 amount,
        uint8 oracleDecimals,
        address _seqFeed
    ) internal view returns (uint256) {
        return (amount * (10 ** (18 - oracleDecimals)) * self.price(_seqFeed)) / 10 ** self.token.decimals();
    }

    /// @notice get oracle decimal precision USD value for `amount`.
    /// @param amount amount of tokens to get USD value for.
    function usdRay(
        VaultAsset storage self,
        uint256 amount,
        uint8 oracleDecimals,
        address _seqFeed
    ) internal view returns (uint256) {
        return (amount * (10 ** (27 - oracleDecimals)) * self.price(_seqFeed)) / 10 ** self.token.decimals();
    }

    /// @notice get oracle decimal precision USD value for `amount`.
    /// @param amount amount of tokens to get USD value for.
    function usd(VaultAsset storage self, uint256 amount, address _seqFeed) internal view returns (uint256) {
        return (amount * self.price(_seqFeed)) / 10 ** self.token.decimals();
    }

    /// @notice get total deposit value of `self` in USD, oracle precision.
    function getDepositValue(VaultAsset storage self, address _seqFeed) internal view returns (uint256) {
        uint256 bal = self.token.balanceOf(address(this));
        if (bal == 0) return 0;
        return (bal * self.price(_seqFeed)) / 10 ** self.token.decimals();
    }

    /// @notice get total deposit value of `self` in USD, oracle precision.
    function getDepositValueWad(
        VaultAsset storage self,
        uint8 oracleDecimals,
        address _seqFeed
    ) internal view returns (uint256) {
        uint256 bal = self.token.balanceOf(address(this));
        if (bal == 0) return 0;
        return self.getDepositValue(_seqFeed).oracleToWad(oracleDecimals);
    }

    /// @notice get a token amount for `value` USD, oracle precision.
    function getAmount(
        VaultAsset storage self,
        uint256 value,
        uint8 oracleDecimals,
        address _seqFeed
    ) internal view returns (uint256) {
        uint256 valueScaled = (value * 1e18) / 10 ** ((36 - oracleDecimals) - self.token.decimals());

        return valueScaled / self.price(_seqFeed);
    }

    /// @notice converts wad precision amount `wad` to token decimal precision.
    function wadToTokenAmount(address token, uint256 wad) internal view returns (uint256) {
        return wad / 10 ** (18 - ERC20(token).decimals());
    }

    /// @notice converts token decimal precision `amount` to wad precision.
    function tokenAmountToWad(address token, uint256 amount) internal view returns (uint256) {
        return amount * 10 ** (18 - ERC20(token).decimals());
    }
}
