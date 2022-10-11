// SPDX-License-Identifier: MIT
pragma solidity >=0.8.14;

// solhint-disable-next-line
import {SafeERC20Upgradeable} from "../../shared/SafeERC20Upgradeable.sol";
import {IERC20Upgradeable} from "../../shared/IERC20Upgradeable.sol";
import {AggregatorV2V3Interface} from "../../vendor/flux/interfaces/AggregatorV2V3Interface.sol";
import {IUniswapV2Pair} from "../../vendor/uniswap/v2-core/interfaces/IUniswapV2Pair.sol";
import {IKrStaking} from "../../staking/interfaces/IKrStaking.sol";
import {IKresko} from "../interfaces/IKresko.sol";
import {Arrays} from "../../libs/Arrays.sol";
import {FixedPoint} from "../../libs/FixedPoint.sol";
import {Math} from "../../libs/Math.sol";

import {KrAsset, CollateralAsset} from "../MinterTypes.sol";
import {MinterState, ms} from "../MinterStorage.sol";

import {UI} from "../facets/UIDataProviderFacet.sol";
import "hardhat/console.sol";

/* solhint-disable contract-name-camelcase */
/* solhint-disable var-name-mixedcase */

library LibUI {
    using Arrays for address[];
    using Math for uint8;
    using Math for uint256;
    using FixedPoint for FixedPoint.Unsigned;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    struct CollateralAssetInfoUser {
        address assetAddress;
        address oracleAddress;
        uint256 amount;
        FixedPoint.Unsigned amountUSD;
        FixedPoint.Unsigned cFactor;
        uint8 decimals;
        uint256 index;
        uint256 price;
        string symbol;
        string name;
    }

    struct CollateralAssetInfo {
        address assetAddress;
        address oracleAddress;
        uint256 price;
        uint256 value;
        FixedPoint.Unsigned cFactor;
        uint8 decimals;
        string symbol;
        string name;
    }

    struct ProtocolParams {
        uint256 liqMultiplier;
        uint256 minDebtValue;
        uint256 minCollateralRatio;
        uint256 liquidationThreshold;
    }

    struct krAssetInfo {
        address oracleAddress;
        address assetAddress;
        uint256 price;
        uint256 value;
        FixedPoint.Unsigned kFactor;
        string symbol;
        string name;
    }

    struct KreskoUser {
        krAssetInfoUser[] krAssets;
        CollateralAssetInfoUser[] collateralAssets;
        FixedPoint.Unsigned healthFactor;
        FixedPoint.Unsigned debtActualUSD;
        FixedPoint.Unsigned debtUSD;
        FixedPoint.Unsigned collateralActualUSD;
        FixedPoint.Unsigned collateralUSD;
        FixedPoint.Unsigned minCollateralUSD;
        FixedPoint.Unsigned borrowingPowerUSD;
    }

    struct PairData {
        uint8 decimals0;
        uint8 decimals1;
        uint256 reserve0;
        uint256 reserve1;
        uint256 totalSupply;
    }

    struct GenericInfo {
        address assetAddress;
        FixedPoint.Unsigned kFactor;
        FixedPoint.Unsigned cFactor;
        uint256 price;
        bool isKrAsset;
        bool isCollateral;
        uint256 debtAmount;
        uint256 depositAmount;
        uint256 walletBalance;
    }

    struct Price {
        uint256 price;
        uint256 timestamp;
        address assetAddress;
        uint80 roundId;
    }

    struct Allowance {
        address owner;
        address spender;
        uint256 allowance;
    }

    struct Balance {
        address token;
        uint256 balance;
    }

    struct TokenMetadata {
        uint8 decimals;
        string symbol;
        string name;
        uint256 totalSupply;
    }

    struct StakingData {
        uint256 pid;
        address depositToken;
        uint256 totalDeposits;
        uint256 allocPoint;
        uint256[] rewardPerBlocks;
        uint256 lastRewardBlock;
        uint256 depositAmount;
        address[] rewardTokens;
        uint256[] rewardAmounts;
    }

    struct krAssetInfoUser {
        address assetAddress;
        address oracleAddress;
        uint256 amount;
        FixedPoint.Unsigned amountUSD;
        uint256 index;
        FixedPoint.Unsigned kFactor;
        bool mintable;
        uint256 price;
        string symbol;
        string name;
    }

    function getBalances(IERC20Upgradeable[] memory _tokens, address account)
        internal
        view
        returns (Balance[] memory balances)
    {
        balances = new Balance[](_tokens.length);
        for (uint256 i; i < _tokens.length; i++) {
            balances[i] = Balance({token: address(_tokens[i]), balance: _tokens[i].balanceOf(account)});
        }
    }

    function getAllowances(
        IERC20Upgradeable[] memory _tokens,
        address owner,
        address spender
    ) internal view returns (Allowance[] memory allowances) {
        allowances = new Allowance[](_tokens.length);
        for (uint256 i; i < _tokens.length; i++) {
            allowances[i] = Allowance({
                allowance: _tokens[i].allowance(owner, spender),
                spender: spender,
                owner: owner
            });
        }
    }

    function getStakingData(address _account) internal view returns (StakingData[] memory result) {
        IKrStaking.Reward[] memory rewards = UI().staking.allPendingRewards(_account);
        result = new StakingData[](rewards.length);

        for (uint256 i; i < rewards.length; i++) {
            IKrStaking.UserInfo memory userInfo = UI().staking.userInfo(rewards[i].pid, _account);
            IKrStaking.PoolInfo memory poolInfo = UI().staking.poolInfo(rewards[i].pid);
            address depositTokenAddress = address(poolInfo.depositToken);
            result[i] = StakingData({
                pid: rewards[i].pid,
                totalDeposits: poolInfo.depositToken.balanceOf(address(UI().staking)),
                allocPoint: poolInfo.allocPoint,
                depositToken: depositTokenAddress,
                depositAmount: userInfo.amount,
                rewardTokens: rewards[i].tokens,
                rewardAmounts: rewards[i].amounts,
                rewardPerBlocks: UI().staking.rewardPerBlockFor(depositTokenAddress),
                lastRewardBlock: poolInfo.lastRewardBlock
            });
        }
    }

    function borrowingPowerUSD(address _account) internal view returns (FixedPoint.Unsigned memory) {
        FixedPoint.Unsigned memory minCollateral = ms().getAccountMinimumCollateralValueAtRatio(
            _account,
            ms().minimumCollateralizationRatio
        );
        FixedPoint.Unsigned memory collateral = ms().getAccountCollateralValue(_account);

        if (collateral.isLessThan(minCollateral)) {
            return FixedPoint.Unsigned(0);
        } else {
            return collateral.sub(minCollateral);
        }
    }

    function batchPrices(address[] calldata _assets, AggregatorV2V3Interface[] calldata _oracles)
        internal
        view
        returns (Price[] memory result)
    {
        require(_assets.length == _oracles.length, "Query must be equal");
        result = new Price[](_assets.length);
        for (uint256 i; i < _assets.length; i++) {
            (uint80 roundId, int256 answer, , uint256 updatedAt, ) = _oracles[i].latestRoundData();
            result[i] = Price(uint256(answer), updatedAt, _assets[i], roundId);
        }
    }

    function krAssetInfos(address[] memory assetAddresses) internal view returns (krAssetInfo[] memory result) {
        result = new krAssetInfo[](assetAddresses.length);
        for (uint256 i; i < assetAddresses.length; i++) {
            address assetAddress = assetAddresses[i];

            KrAsset memory krAsset = ms().kreskoAssets[assetAddress];

            FixedPoint.Unsigned memory value = ms().getKrAssetValue(assetAddress, 1 ether, false);
            uint256 price = uint256(krAsset.oracle.latestAnswer());

            string memory name = IERC20Upgradeable(assetAddress).name();
            string memory symbol = IERC20Upgradeable(assetAddress).symbol();

            krAssetInfo memory assetInfo = krAssetInfo({
                value: value.rawValue,
                oracleAddress: address(krAsset.oracle),
                assetAddress: assetAddress,
                kFactor: krAsset.kFactor,
                price: price,
                symbol: symbol,
                name: name
            });

            result[i] = assetInfo;
        }
    }

    function collateralAssetInfos(address[] memory assetAddresses)
        internal
        view
        returns (CollateralAssetInfo[] memory result)
    {
        result = new CollateralAssetInfo[](assetAddresses.length);
        for (uint256 i; i < assetAddresses.length; i++) {
            address assetAddress = assetAddresses[i];
            CollateralAsset memory collateralAsset = ms().collateralAssets[assetAddress];
            uint8 decimals = IERC20Upgradeable(assetAddress).decimals();

            string memory symbol = IERC20Upgradeable(assetAddress).symbol();
            (FixedPoint.Unsigned memory value, FixedPoint.Unsigned memory price) = ms()
                .getCollateralValueAndOraclePrice(assetAddress, 1 * 10**decimals, false);

            string memory name = IERC20Upgradeable(assetAddress).name();

            CollateralAssetInfo memory assetInfo = CollateralAssetInfo({
                value: value.rawValue,
                oracleAddress: address(collateralAsset.oracle),
                assetAddress: assetAddress,
                cFactor: collateralAsset.factor,
                decimals: decimals,
                price: price.rawValue,
                symbol: symbol,
                name: name
            });

            result[i] = assetInfo;
        }
    }

    function collateralAssetInfoFor(address _account)
        internal
        view
        returns (CollateralAssetInfoUser[] memory result, FixedPoint.Unsigned memory totalCollateralUSD)
    {
        address[] memory collateralAssetAddresses = ms().getDepositedCollateralAssets(_account);
        if (collateralAssetAddresses.length > 0) {
            result = new CollateralAssetInfoUser[](collateralAssetAddresses.length);
            for (uint256 i; i < collateralAssetAddresses.length; i++) {
                address assetAddress = collateralAssetAddresses[i];
                CollateralAsset memory collateralAsset = ms().collateralAssets[assetAddress];
                uint8 decimals = IERC20Upgradeable(assetAddress).decimals();

                uint256 amount = ms().collateralDeposits[_account][assetAddress];

                string memory symbol = IERC20Upgradeable(assetAddress).symbol();
                (FixedPoint.Unsigned memory amountUSD, FixedPoint.Unsigned memory price) = ms()
                    .getCollateralValueAndOraclePrice(assetAddress, amount, true);

                string memory name = IERC20Upgradeable(assetAddress).name();

                CollateralAssetInfoUser memory assetInfo = CollateralAssetInfoUser({
                    amount: amount,
                    amountUSD: amountUSD,
                    oracleAddress: address(collateralAsset.oracle),
                    assetAddress: assetAddress,
                    cFactor: collateralAsset.factor,
                    decimals: decimals,
                    index: i,
                    price: price.rawValue,
                    symbol: symbol,
                    name: name
                });

                totalCollateralUSD.add(amountUSD);
                result[i] = assetInfo;
            }
        }
    }

    function krAssetInfoFor(address _account)
        internal
        view
        returns (krAssetInfoUser[] memory result, FixedPoint.Unsigned memory totalDebtUSD)
    {
        address[] memory krAssetAddresses = ms().mintedKreskoAssets[_account];
        if (krAssetAddresses.length > 0) {
            result = new krAssetInfoUser[](krAssetAddresses.length);
            for (uint256 i; i < krAssetAddresses.length; i++) {
                address assetAddress = krAssetAddresses[i];
                KrAsset memory krAsset = ms().kreskoAssets[assetAddress];
                uint256 amount = ms().kreskoAssetDebt[_account][assetAddress];

                uint256 price = uint256(krAsset.oracle.latestAnswer());
                FixedPoint.Unsigned memory amountUSD = ms().getKrAssetValue(assetAddress, amount, true);

                string memory symbol = IERC20Upgradeable(assetAddress).symbol();
                string memory name = IERC20Upgradeable(assetAddress).name();

                krAssetInfoUser memory assetInfo = krAssetInfoUser({
                    assetAddress: assetAddress,
                    oracleAddress: address(krAsset.oracle),
                    amount: amount,
                    amountUSD: amountUSD,
                    index: i,
                    kFactor: krAsset.kFactor,
                    mintable: krAsset.mintable,
                    price: price,
                    symbol: symbol,
                    name: name
                });

                totalDebtUSD.add(amountUSD);
                result[i] = assetInfo;
            }
        }
    }

    function healthFactorFor(address _account) internal view returns (FixedPoint.Unsigned memory) {
        FixedPoint.Unsigned memory userDebt = ms().getAccountKrAssetValue(_account);
        FixedPoint.Unsigned memory userCollateral = ms().getAccountCollateralValue(_account);

        if (userDebt.isGreaterThan(0)) {
            return userCollateral.div(userDebt);
        } else {
            return FixedPoint.Unsigned(0);
        }
    }

    function kreskoUser(address _account) internal view returns (KreskoUser memory user) {
        (krAssetInfoUser[] memory krInfos, FixedPoint.Unsigned memory totalDebtUSD) = krAssetInfoFor(_account);
        (
            CollateralAssetInfoUser[] memory collateralInfos,
            FixedPoint.Unsigned memory totalCollateralUSD
        ) = collateralAssetInfoFor(_account);

        if (krInfos.length > 0 || collateralInfos.length > 0) {
            user = KreskoUser({
                collateralAssets: collateralInfos,
                krAssets: krInfos,
                borrowingPowerUSD: borrowingPowerUSD(_account),
                healthFactor: healthFactorFor(_account),
                debtActualUSD: totalDebtUSD,
                debtUSD: ms().getAccountKrAssetValue(_account),
                collateralActualUSD: totalCollateralUSD,
                collateralUSD: ms().getAccountCollateralValue(_account),
                minCollateralUSD: ms().getAccountMinimumCollateralValueAtRatio(
                    _account,
                    ms().minimumCollateralizationRatio
                )
            });
        }
    }
}
