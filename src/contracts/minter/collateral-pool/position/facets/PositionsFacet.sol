// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.19;
import {ds} from "../../../../diamond/DiamondStorage.sol";
import {DiamondModifiers} from "../../../../diamond/DiamondModifiers.sol";
import {WadRay} from "../../../../libs/WadRay.sol";
import {ERC721} from "../state/ERC721Storage.sol";
import {pos, LibPositions, NewPosition, Position} from "../state/PositionsStorage.sol";
import {IPositionsFacet} from "../interfaces/IPositionsFacet.sol";
import {IERC20Permit} from "../../../../shared/IERC20Permit.sol";

contract PositionsFacet is IPositionsFacet, DiamondModifiers {
    using WadRay for uint256;
    modifier check(uint256 _id) {
        address owner = ERC721().ownerOf(_id);
        require(
            msg.sender == owner || ERC721().isApprovedForAll(owner, msg.sender),
            LibPositions.ERROR_POSITION_NOT_OWNED_BY_CALLER
        );
        _;
    }

    /// @inheritdoc IPositionsFacet
    function createPosition(NewPosition memory _position) external returns (uint256 positionId) {
        (uint256 amountAFeeReduced, uint256 amountBOut) = pos().kresko.swapIntoLeverage(msg.sender, _position);
        positionId = ERC721().currentId++;

        pos().positions[positionId] = Position({
            account: _position.account,
            assetA: _position.assetA,
            assetB: _position.assetB,
            amountA: amountAFeeReduced,
            amountB: amountBOut,
            leverage: _position.leverage,
            valueInCache: pos().kresko.getPrice(_position.assetA).wadMul(amountAFeeReduced),
            valueOutCache: 0,
            liquidationIncentive: 0.05 ether,
            closeIncentive: 0.01 ether,
            creationTimestamp: block.timestamp,
            lastUpdateTimestamp: block.timestamp,
            nonce: 0
        });

        ERC721().safeMint(_position.account, positionId, "");
    }

    /// @inheritdoc IPositionsFacet
    function closePosition(uint256 _id) external {
        pos().positions[_id].lastUpdateTimestamp = block.timestamp;

        // check ownership
        address owner = ERC721().ownerOf(_id);
        address liquidator = address(0);
        if (msg.sender != owner) {
            // allow closing and liquidations from external accounts
            if (pos().isLiquidatable(_id) || pos().isCloseable(_id)) {
                liquidator = msg.sender;
            }
            require(
                msg.sender == owner || ERC721().isApprovedForAll(owner, msg.sender),
                LibPositions.ERROR_POSITION_NOT_OWNED_BY_CALLER
            );
        }

        pos().positions[_id].valueOutCache += pos().kresko.getPrice(pos().positions[_id].assetA).wadMul(
            pos().kresko.swapOutOfLeverage(pos().positions[_id], liquidator)
        );

        ERC721().burn(_id);
    }

    /// @inheritdoc IPositionsFacet
    function buy(uint256 _id, uint256 _amountA, uint256 _amountBMin) external override check(_id) {
        (uint256 amountAAfterFee, uint256 amountBOut) = pos().kresko.swapIntoLeverage(
            msg.sender,
            NewPosition({
                account: pos().positions[_id].account,
                assetA: pos().positions[_id].assetA,
                assetB: pos().positions[_id].assetB,
                leverage: pos().positions[_id].leverage,
                amountA: _amountA,
                amountBMin: _amountBMin
            })
        );

        pos().positions[_id].amountA += amountAAfterFee;
        pos().positions[_id].amountB += amountBOut;
        pos().positions[_id].valueInCache += pos().kresko.getPrice(pos().positions[_id].assetA).wadMul(amountAAfterFee);
        pos().positions[_id].lastUpdateTimestamp = block.timestamp;
    }

    /// @inheritdoc IPositionsFacet
    function deposit(uint256 _id, uint256 _amountA) external override {
        require(ERC721().exists(_id), "!exists");
        uint256 change = _amountA.wadDiv(pos().positions[_id].amountA);
        pos().kresko.positionDepositA(msg.sender, _amountA, pos().positions[_id]);

        pos().positions[_id].amountA += _amountA;
        pos().positions[_id].lastUpdateTimestamp = block.timestamp;
        pos().positions[_id].leverage = pos().getLeverage(_id);

        require(pos().positions[_id].leverage - change >= 1 ether, "!leverage-too-low");
    }

    /// @inheritdoc IPositionsFacet
    function withdraw(uint256 _id, uint256 _amountA) external override check(_id) {
        pos().kresko.positionWithdrawA(pos().positions[_id].account, _amountA, pos().positions[_id]);

        int256 change = int256(_amountA.wadDiv(pos().positions[_id].amountA));
        require(pos().getRatio(_id) - change >= pos().liquidationThreshold, "!leverage-too-high");

        pos().positions[_id].amountA -= _amountA;
        pos().positions[_id].lastUpdateTimestamp = block.timestamp;
        pos().positions[_id].leverage = pos().getLeverage(_id);
    }

    /// @inheritdoc IPositionsFacet
    function buyback(uint256 _id, uint256 _amountB) external override check(_id) {
        pos().positions[_id].lastUpdateTimestamp = block.timestamp;
        if (_amountB >= pos().positions[_id].amountB) {
            _amountB = pos().positions[_id].amountB;
            ERC721().burn(_id);
        }

        uint256 change = _amountB.wadDiv(pos().positions[_id].amountB);
        Position memory temp = pos().positions[_id];
        temp.amountB = temp.amountB.wadMul(change);
        temp.amountA = temp.amountA.wadMul(change);

        pos().positions[_id].amountA -= temp.amountA;
        pos().positions[_id].amountB -= temp.amountB;
        pos().positions[_id].valueOutCache += pos().kresko.getPrice(pos().positions[_id].assetA).wadMul(
            pos().kresko.swapOutOfLeverage(temp, address(0))
        );
    }

    /// @inheritdoc IPositionsFacet
    function getPosition(uint256 _id) external view returns (Position memory, int128 currentLeverage) {
        return (pos().getPosition(_id), int128(pos().getRatio(_id)));
    }

    function getPositions(uint256[] calldata _ids) external view returns (Position[] memory) {
        Position[] memory results = new Position[](_ids.length);
        for (uint256 i; i < _ids.length; i++) {
            results[i] = pos().getPosition(_ids[i]);
        }
        return results;
    }

    /// @inheritdoc IPositionsFacet
    function isLiquidatable(uint256[] calldata _ids) external view override returns (bool[] memory results) {
        results = new bool[](_ids.length);
        for (uint256 i; i < _ids.length; i++) {
            results[i] = pos().isLiquidatable(_ids[i]);
        }
    }

    function getRatioOf(uint256 _id) external view returns (int128) {
        return int128(pos().getRatio(_id));
    }

    /// @inheritdoc IPositionsFacet
    function isClosable(uint256[] calldata _ids) external view override returns (bool[] memory results) {
        results = new bool[](_ids.length);
        for (uint256 i; i < _ids.length; i++) {
            results[i] = pos().isCloseable(_ids[i]);
        }
    }
}
