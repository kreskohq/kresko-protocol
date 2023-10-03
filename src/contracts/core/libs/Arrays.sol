// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.19;

import {CError} from "common/CError.sol";

/**
 * @title Library for operations on arrays
 */
library Arrays {
    using Arrays for address[];
    struct Item {
        bool exists;
        uint256 index;
    }

    function find(address[] storage _addresses, address _elementToFind) internal view returns (Item memory) {
        for (uint256 i; i < _addresses.length; ) {
            if (_addresses[i] == _elementToFind) {
                return Item(true, i);
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
        Item memory result = _addresses.find(_elementToRemove);
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
            revert CError.INVALID_ASSET_INDEX(_elementToRemove, _elementIndex, _addresses.length);

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
