// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

library AccessEvent {
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event PendingOwnershipTransfer(address indexed previousOwner, address indexed newOwner);

    /**
     * @notice Emitted when the a trusted contract is added/removed.
     * @param contractAddress A trusted contract (eg. Kresko Zapper).
     * @param allowed true if the contract was added, false if removed
     * @param targetContract the target contract to operate on
     */
    event OperatorToggled(address indexed contractAddress, address indexed targetContract, bool indexed allowed);
}
