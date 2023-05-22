// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.20;
import {ds} from "../../../../diamond/DiamondStorage.sol";
import {DiamondModifiers} from "../../../../diamond/DiamondModifiers.sol";
import {ERC721} from "../state/ERC721Storage.sol";
import {pos, LibPositions, NewPosition, Position} from "../state/PositionsStorage.sol";
import {IPositionsFacet} from "../interfaces/IPositionsFacet.sol";
import {IERC20Permit} from "../../../../shared/IERC20Permit.sol";

contract PositionsFacet is IPositionsFacet, DiamondModifiers {
    modifier check(uint256 _id) {
        address owner = ERC721().ownerOf(_id);
        require(
            msg.sender == owner || ERC721().isApprovedForAll(owner, msg.sender),
            LibPositions.ERROR_POSITION_NOT_OWNED_BY_CALLER
        );
        _;
    }

    function getApprovalFor(address _asset) external {
        require(address(pos().kresko) != address(0), "!kresko");
        require(_asset != address(0), "!asset-0");
        require(msg.sender == address(pos().kresko), "!kresko");
        IERC20Permit(_asset).approve(address(pos().kresko), type(uint256).max);
    }

    function removeApprovalFor(address _asset) external onlyOwner {
        IERC20Permit(_asset).approve(address(pos().kresko), 0);
    }

    /// @inheritdoc IPositionsFacet
    function createPosition(NewPosition memory _position) external returns (uint256 positionId) {
        (uint256 amountInAfterFee, uint256 amountOut) = pos().kresko.swapLeverIn(msg.sender, _position);
        positionId = ERC721().currentId++;

        pos().positions[positionId] = Position({
            account: _position.account,
            collateral: _position.collateralAsset,
            borrowed: _position.borrowAsset,
            collateralAmount: amountInAfterFee,
            borrowedAmount: amountOut,
            leverage: _position.leverage,
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
        // check ownership
        address owner = ERC721().ownerOf(_id);
        if (msg.sender != owner) {
            // allow closing and liquidations from external accounts
            if (pos().isLiquidatable(_id) || pos().isCloseable(_id)) {
                pos().kresko.swapLeverOutLiquidation(msg.sender, pos().positions[_id]);
                ERC721().burn(_id);
                return;
            }
            require(
                msg.sender == owner || ERC721().isApprovedForAll(owner, msg.sender),
                LibPositions.ERROR_POSITION_NOT_OWNED_BY_CALLER
            );
        }

        pos().kresko.swapLeverOut(pos().positions[_id]);
        ERC721().burn(_id);
    }

    /// @inheritdoc IPositionsFacet
    function deposit(uint256 _id, uint256 _collateralAmount) external override check(_id) {
        pos().adjustIn(_id, _collateralAmount, 0);
    }

    /// @inheritdoc IPositionsFacet
    function repay(uint256 _id, uint256 _repayAmount) external override check(_id) {
        pos().adjustIn(_id, 0, _repayAmount);
    }

    /// @inheritdoc IPositionsFacet
    function withdraw(uint256 _id, uint256 _collateralAmount) external override check(_id) {
        pos().adjustOut(_id, _collateralAmount, 0);
    }

    /// @inheritdoc IPositionsFacet
    function borrow(uint256 _id, uint256 _borrowAmount) external override check(_id) {
        pos().adjustOut(_id, 0, _borrowAmount);
    }

    /// @inheritdoc IPositionsFacet
    function getPosition(uint256 _id) external view returns (Position memory) {
        return pos().getPosition(_id);
    }

    /// @inheritdoc IPositionsFacet
    function isLiquidatable(uint256[] calldata _ids) external view override returns (bool[] memory results) {
        results = new bool[](_ids.length);
        for (uint256 i; i < _ids.length; i++) {
            results[i] = pos().isLiquidatable(_ids[i]);
        }
    }

    /// @inheritdoc IPositionsFacet
    function isClosable(uint256[] calldata _ids) external view override returns (bool[] memory results) {
        results = new bool[](_ids.length);
        for (uint256 i; i < _ids.length; i++) {
            results[i] = pos().isCloseable(_ids[i]);
        }
    }
}
