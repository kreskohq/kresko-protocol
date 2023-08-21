pragma solidity >=0.8.19;

import {DiamondLoupeFacet} from "diamond/facets/DiamondLoupeFacet.sol";
import {Vm} from "forge-std/Vm.sol";

abstract contract DiamondHelper {
    error ContainsWhitespace(string str);
    error NoSelectorsFound(string facetName);
    error EmptyString();

    /// @dev Retrieves the function selectors for a given facet name from its JSON artifact.
    /// @param _facetName The name of the facet.
    /// @return selectors The function selectors for the facet.
    function _getSelectorsFromArtifact(string memory _facetName) internal returns (bytes4[] memory selectors) {
        bytes memory b = bytes(_facetName);

        if (b.length == 0) revert EmptyString();

        for (uint256 i; i < b.length; i++) {
            if (b[i] == 0x20) revert ContainsWhitespace(_facetName);
        }

        string[] memory cmd = new string[](2);
        cmd[0] = "utils/selectorsFromArtifact.sh";
        cmd[1] = _facetName;

        bytes memory res = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D).ffi(cmd);

        selectors = abi.decode(res, (bytes4[]));

        if (selectors.length == 0) revert NoSelectorsFound(_facetName);
    }

    /// @dev Retrieves the function selectors for a given facet address from the diamond loupe.
    /// @param diamondAddress The address of the diamond contract.
    /// @param facetAddress The address of the facet.
    /// @return _facetFunctionSelectors The function selectors for the facet.
    function _getFacetSelectorsFromLoupe(
        address diamondAddress,
        address facetAddress
    ) internal view returns (bytes4[] memory _facetFunctionSelectors) {
        _facetFunctionSelectors = DiamondLoupeFacet(diamondAddress).facetFunctionSelectors(facetAddress);
    }

    /// @dev Retrieves the facet address for a given function selector from the diamond loupe.
    /// @param diamondAddress The address of the diamond contract.
    /// @param functionSelector The function selector.
    /// @return _facetAddress The address of the facet.
    function _getFacetBySelectorFromLoupe(
        address diamondAddress,
        bytes4 functionSelector
    ) internal view returns (address _facetAddress) {
        _facetAddress = DiamondLoupeFacet(diamondAddress).facetAddress(functionSelector);
    }
}
