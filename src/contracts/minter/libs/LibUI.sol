// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.19;

// solhint-disable-next-line
import {IERC20Permit} from "common/IERC20Permit.sol";
import {AggregatorV3Interface} from "common/AggregatorV3Interface.sol";
import {IKrStaking} from "contracts/staking/interfaces/IKrStaking.sol";
import {WadRay} from "common/libs/WadRay.sol";
import {LibDecimals, KrAsset, CollateralAsset, ms} from "./LibMinter.sol";

/* solhint-disable contract-name-camelcase */
/* solhint-disable var-name-mixedcase */

/**
 * @title Library for UI related views
 * @author Kresko
 */
library LibUI {
    using LibDecimals for uint256;
    using WadRay for uint256;

    struct CollateralAssetInfoUser {
        address assetAddress;
        address oracleAddress;
        uint256 amount;
        uint256 amountUSD;
        uint256 cFactor;
        uint256 liquidationIncentive;
        uint8 decimals;
        uint256 index;
        uint256 price;
        string symbol;
        string name;
        bytes32 redstoneId;
    }

    struct CollateralAssetInfo {
        address assetAddress;
        address oracleAddress;
        uint256 price;
        uint256 value;
        uint256 liquidationIncentive;
        uint256 cFactor;
        uint8 decimals;
        string symbol;
        string name;
        bool marketOpen;
        bytes32 redstoneId;
    }

    struct ProtocolParams {
        uint256 minDebtValue;
        uint256 minCollateralRatio;
        uint256 liquidationThreshold;
    }

    struct krAssetInfo {
        address oracleAddress;
        address assetAddress;
        uint256 price;
        uint256 value;
        uint256 openFee;
        uint256 closeFee;
        uint256 kFactor;
        string symbol;
        string name;
        bool marketOpen;
        bytes32 redstoneId;
    }

    struct KreskoUser {
        krAssetInfoUser[] krAssets;
        CollateralAssetInfoUser[] collateralAssets;
        bytes32[] redstoneIds;
        uint256 healthFactor;
        uint256 debtUSD;
        uint256 collateralUSD;
        uint256 minCollateralUSD;
        uint256 borrowingPowerUSD;
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
        uint256 kFactor;
        uint256 cFactor;
        uint256 price;
        bool isKrAsset;
        bool isCollateral;
        uint256 debtAmount;
        uint256 depositAmount;
        uint256 walletBalance;
    }

    struct Price {
        uint256 price;
        uint256 redstonePrice;
        uint256 timestamp;
        address assetAddress;
        uint80 roundId;
        bool marketOpen;
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
        uint256 rewardPerBlocks;
        uint256 lastRewardBlock;
        uint256 depositAmount;
        address[] rewardTokens;
        uint256[] rewardAmounts;
    }

    struct krAssetInfoUser {
        address assetAddress;
        address oracleAddress;
        uint256 amount;
        uint256 amountUSD;
        uint256 index;
        uint256 kFactor;
        uint256 price;
        string symbol;
        string name;
        uint256 openFee;
        uint256 closeFee;
        bytes32 redstoneId;
    }

    function getBalances(
        address[] memory _tokens,
        address account
    ) internal view returns (Balance[] memory balances, uint256 ethBalance) {
        balances = new Balance[](_tokens.length);
        for (uint256 i; i < _tokens.length; i++) {
            balances[i] = Balance({token: address(_tokens[i]), balance: IERC20Permit(_tokens[i]).balanceOf(account)});
        }

        ethBalance = account.balance;
    }

    function getAllowances(
        address[] memory _tokens,
        address owner,
        address spender
    ) internal view returns (Allowance[] memory allowances) {
        allowances = new Allowance[](_tokens.length);
        for (uint256 i; i < _tokens.length; i++) {
            allowances[i] = Allowance({
                allowance: IERC20Permit(_tokens[i]).allowance(owner, spender),
                spender: spender,
                owner: owner
            });
        }
    }

    function getStakingData(address _account, address _staking) internal view returns (StakingData[] memory result) {
        IKrStaking staking = IKrStaking(_staking);
        IKrStaking.Reward[] memory rewards = staking.allPendingRewards(_account);
        result = new StakingData[](rewards.length);

        for (uint256 i; i < rewards.length; i++) {
            IKrStaking.PoolInfo memory poolInfo = staking.poolInfo(rewards[i].pid);
            address depositTokenAddress = address(poolInfo.depositToken);
            result[i] = StakingData({
                pid: rewards[i].pid,
                totalDeposits: poolInfo.depositToken.balanceOf(_staking),
                allocPoint: poolInfo.allocPoint,
                depositToken: depositTokenAddress,
                depositAmount: staking.userInfo(rewards[i].pid, _account).amount,
                rewardTokens: rewards[i].tokens,
                rewardAmounts: rewards[i].amounts,
                rewardPerBlocks: staking.rewardPerBlockFor(depositTokenAddress),
                lastRewardBlock: poolInfo.lastRewardBlock
            });
        }
    }

    function borrowingPowerUSD(address _account) internal view returns (uint256) {
        uint256 minCollateral = ms().getAccountMinimumCollateralValueAtRatio(
            _account,
            ms().minimumCollateralizationRatio
        );
        uint256 collateral = ms().getAccountCollateralValue(_account);

        if (collateral < minCollateral) {
            return 0;
        } else {
            return collateral - minCollateral;
        }
    }

    function batchOracleValues(address[] memory _assets) internal view returns (Price[] memory result) {
        result = new Price[](_assets.length);

        for (uint256 i; i < _assets.length; i++) {
            uint256 redstonePrice;
            AggregatorV3Interface oracle;
            if (ms().collateralAssets[_assets[i]].redstoneId != bytes32(0)) {
                redstonePrice = ms().collateralAssets[_assets[i]].redstonePrice();
                oracle = ms().collateralAssets[_assets[i]].oracle;
            } else if (ms().kreskoAssets[_assets[i]].redstoneId != bytes32(0)) {
                redstonePrice = ms().kreskoAssets[_assets[i]].redstonePrice();
                oracle = ms().kreskoAssets[_assets[i]].oracle;
            } else {
                revert("BatchOracleValues: Asset not found");
            }

            (uint80 roundId, int256 answer, , uint256 timestamp, ) = oracle.latestRoundData();
            result[i] = Price({
                price: uint256(answer),
                redstonePrice: redstonePrice,
                timestamp: timestamp,
                assetAddress: _assets[i],
                roundId: roundId,
                marketOpen: ms().kreskoAssets[_assets[i]].marketStatus()
            });
        }
    }

    function krAssetInfos(address[] memory assetAddresses) internal view returns (krAssetInfo[] memory result) {
        result = new krAssetInfo[](assetAddresses.length);
        for (uint256 i; i < assetAddresses.length; i++) {
            address assetAddress = assetAddresses[i];
            KrAsset memory krAsset = ms().kreskoAssets[assetAddress];
            result[i] = krAssetInfo({
                value: ms().getKrAssetValue(assetAddress, 1 ether, false),
                oracleAddress: address(krAsset.oracle),
                assetAddress: assetAddress,
                closeFee: krAsset.closeFee,
                openFee: krAsset.openFee,
                kFactor: krAsset.kFactor,
                price: krAsset.uintPrice(ms().oracleDeviationPct),
                marketOpen: ms().kreskoAssets[assetAddress].marketStatus(),
                symbol: IERC20Permit(assetAddress).symbol(),
                name: IERC20Permit(assetAddress).name(),
                redstoneId: krAsset.redstoneId
            });
        }
    }

    function collateralAssetInfos(
        address[] memory assetAddresses
    ) internal view returns (CollateralAssetInfo[] memory result) {
        result = new CollateralAssetInfo[](assetAddresses.length);
        for (uint256 i; i < assetAddresses.length; i++) {
            address assetAddress = assetAddresses[i];
            CollateralAsset memory collateralAsset = ms().collateralAssets[assetAddress];
            uint8 decimals = IERC20Permit(assetAddress).decimals();

            (uint256 value, uint256 price) = ms().getCollateralValueAndOraclePrice(
                assetAddress,
                1 * 10 ** decimals,
                false
            );

            result[i] = CollateralAssetInfo({
                value: value,
                oracleAddress: address(collateralAsset.oracle),
                assetAddress: assetAddress,
                liquidationIncentive: collateralAsset.liquidationIncentive,
                cFactor: collateralAsset.factor,
                decimals: decimals,
                price: price,
                marketOpen: true,
                symbol: IERC20Permit(assetAddress).symbol(),
                name: IERC20Permit(assetAddress).name(),
                redstoneId: collateralAsset.redstoneId
            });
        }
    }

    function collateralAssetInfoFor(
        address _account
    ) internal view returns (CollateralAssetInfoUser[] memory result, uint256 totalCollateralUSD) {
        address[] memory collateralAssetAddresses = ms().getDepositedCollateralAssets(_account);
        if (collateralAssetAddresses.length > 0) {
            result = new CollateralAssetInfoUser[](collateralAssetAddresses.length);
            for (uint256 i; i < collateralAssetAddresses.length; i++) {
                address assetAddress = collateralAssetAddresses[i];
                uint8 decimals = IERC20Permit(assetAddress).decimals();

                uint256 amount = ms().getCollateralDeposits(_account, assetAddress);

                (uint256 amountUSD, uint256 price) = ms().getCollateralValueAndOraclePrice(assetAddress, amount, true);

                totalCollateralUSD + amountUSD;
                result[i] = CollateralAssetInfoUser({
                    amount: amount,
                    amountUSD: amountUSD,
                    liquidationIncentive: ms().collateralAssets[assetAddress].liquidationIncentive,
                    oracleAddress: address(ms().collateralAssets[assetAddress].oracle),
                    assetAddress: assetAddress,
                    cFactor: ms().collateralAssets[assetAddress].factor,
                    decimals: decimals,
                    index: i,
                    price: price,
                    symbol: IERC20Permit(assetAddress).symbol(),
                    name: IERC20Permit(assetAddress).name(),
                    redstoneId: ms().collateralAssets[assetAddress].redstoneId
                });
            }
        }
    }

    function krAssetInfoFor(
        address _account
    ) internal view returns (krAssetInfoUser[] memory result, uint256 totalDebtUSD) {
        address[] memory krAssetAddresses = ms().mintedKreskoAssets[_account];
        if (krAssetAddresses.length > 0) {
            result = new krAssetInfoUser[](krAssetAddresses.length);
            for (uint256 i; i < krAssetAddresses.length; i++) {
                address assetAddress = krAssetAddresses[i];
                KrAsset memory krAsset = ms().kreskoAssets[assetAddress];
                uint256 amount = ms().getKreskoAssetDebtPrincipal(_account, assetAddress);

                uint256 amountUSD = ms().getKrAssetValue(assetAddress, amount, true);
                totalDebtUSD + amountUSD;
                result[i] = krAssetInfoUser({
                    assetAddress: assetAddress,
                    oracleAddress: address(krAsset.oracle),
                    openFee: krAsset.openFee,
                    closeFee: krAsset.closeFee,
                    amount: amount,
                    amountUSD: amountUSD,
                    index: i,
                    kFactor: krAsset.kFactor,
                    price: krAsset.uintPrice(ms().oracleDeviationPct),
                    symbol: IERC20Permit(assetAddress).symbol(),
                    name: IERC20Permit(assetAddress).name(),
                    redstoneId: krAsset.redstoneId
                });
            }
        }
    }

    function healthFactorFor(address _account) internal view returns (uint256) {
        uint256 userDebt = ms().getAccountKrAssetValue(_account);
        uint256 userCollateral = ms().getAccountCollateralValue(_account);

        if (userDebt > 0) {
            return userCollateral.wadDiv(userDebt);
        } else {
            return 0;
        }
    }

    function getRedstoneIds(
        krAssetInfoUser[] memory krInfos,
        CollateralAssetInfoUser[] memory collateralInfos
    ) internal pure returns (bytes32[] memory result) {
        result = new bytes32[](krInfos.length + collateralInfos.length);
        for (uint256 i; i < krInfos.length; i++) {
            result[i] = krInfos[i].redstoneId;
        }

        for (uint256 i; i < collateralInfos.length; i++) {
            result[i + krInfos.length] = collateralInfos[i].redstoneId;
        }
    }

    function kreskoUser(address _account) internal view returns (KreskoUser memory user) {
        (krAssetInfoUser[] memory krInfos, ) = krAssetInfoFor(_account);
        (CollateralAssetInfoUser[] memory collateralInfos, ) = collateralAssetInfoFor(_account);

        if (krInfos.length > 0 || collateralInfos.length > 0) {
            user = KreskoUser({
                collateralAssets: collateralInfos,
                krAssets: krInfos,
                redstoneIds: getRedstoneIds(krInfos, collateralInfos),
                borrowingPowerUSD: borrowingPowerUSD(_account),
                healthFactor: healthFactorFor(_account),
                debtUSD: ms().getAccountKrAssetValue(_account),
                collateralUSD: ms().getAccountCollateralValue(_account),
                minCollateralUSD: ms().getAccountMinimumCollateralValueAtRatio(
                    _account,
                    ms().minimumCollateralizationRatio
                )
            });
        }
    }
}
