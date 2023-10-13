// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.8.21;

import {Errors} from "common/Errors.sol";
import {Enums} from "common/Constants.sol";

/**
 * @title Library for operations on arrays
 */
library Arrays {
    using Arrays for address[];

    struct FindResult {
        uint256 index;
        bool exists;
    }

    function empty(address[2] memory _addresses) internal pure returns (bool) {
        return _addresses[0] == address(0) && _addresses[1] == address(0);
    }

    function empty(Enums.OracleType[2] memory _oracles) internal pure returns (bool) {
        return _oracles[0] == Enums.OracleType.Empty && _oracles[1] == Enums.OracleType.Empty;
    }

    function find(address[] storage _addresses, address _elementToFind) internal pure returns (FindResult memory result) {
        address[] memory addresses = _addresses;
        for (uint256 i; i < addresses.length; ) {
            if (addresses[i] == _elementToFind) {
                return FindResult(i, true);
            }
            unchecked {
                ++i;
            }
        }
    }

    function pushUnique(address[] storage _addresses, address _elementToAdd) internal {
        if (!_addresses.find(_elementToAdd).exists) {
            _addresses.push(_elementToAdd);
        }
    }

    function removeExisting(address[] storage _addresses, address _elementToRemove) internal {
        FindResult memory result = _addresses.find(_elementToRemove);
        if (result.exists) {
            _addresses.removeAddress(_elementToRemove, result.index);
        }
    }

    /**
     * @dev Removes an element by copying the last element to the element to remove's place and removing
     * the last element.
     * @param _addresses The address array containing the item to be removed.
     * @param _elementToRemove The element to be removed.
     * @param _elementIndex The index of the element to be removed.
     */
    function removeAddress(address[] storage _addresses, address _elementToRemove, uint256 _elementIndex) internal {
        if (_addresses[_elementIndex] != _elementToRemove)
            revert Errors.ELEMENT_DOES_NOT_MATCH_PROVIDED_INDEX(Errors.id(_elementToRemove), _elementIndex, _addresses);

        uint256 lastIndex = _addresses.length - 1;
        // If the index to remove is not the last one, overwrite the element at the index
        // with the last element.
        if (_elementIndex != lastIndex) {
            _addresses[_elementIndex] = _addresses[lastIndex];
        }
        // Remove the last element.
        _addresses.pop();
    }
}
