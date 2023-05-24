// SPDX-License-Identifier: BUSL-1.1
pragma solidity <=0.8.19;
import {NewPosition, Position} from "../state/PositionsStorage.sol";

interface IPositionsFacet {
    /**
     * @notice Creates a new leveraged position
     * @param _position The parameters of the new position
     * @return id The ID of the new position
     */
    function createPosition(NewPosition memory _position) external returns (uint256 id);

    /**
     * @notice Close a leveraged position
     * @param _id The ID of the position to close
     */
    function closePosition(uint256 _id) external;

    /**
     * @notice Deposit collateral into a leveraged position.
     * @param _id The ID of the position to deposit collateral into.
     * @param _amount The amount of collateral to deposit.
     */
    function deposit(uint256 _id, uint256 _amount) external;

    /**
     * @notice Withdraw collateral from a leveraged position
     * @param _id The ID of the position to withdraw collateral from
     * @param _amount The amount of collateral to withdraw
     */
    function withdraw(uint256 _id, uint256 _amount) external;

    /**
     * @notice Borrow more assets to a position, keeps the leverage.
     * @param _id The ID of the position to borrow more from
     * @param _sellAmount The amount of collateral to sell
     * @param _buyAmount The min amount of asset to buy
     */
    function buy(uint256 _id, uint256 _sellAmount, uint256 _buyAmount) external;

    /**
     * @notice Repay borrowed asset in a position
     * @param _id The ID of the position to repay borrowed asset to
     * @param _amount The amount of borrowed asset
     */
    function buyback(uint256 _id, uint256 _amount) external;

    /// @notice returns the info of a position for `_id`
    /// @return position the position when last modified
    /// @return profitPercentage the current profit of the position
    function getPosition(uint256 _id) external view returns (Position memory, int128 profitPercentage);

    /**
     * @notice Get the liquidatable status of a lever positions
     * @param _ids The IDs of the positions
     * @return array of liquidatable results
     */
    function isLiquidatable(uint256[] calldata _ids) external view returns (bool[] memory);

    /// @notice returns the closable status for positions
    function isClosable(uint256[] calldata _ids) external view returns (bool[] memory);
}
