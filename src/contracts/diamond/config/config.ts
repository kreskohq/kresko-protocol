export const facets = [
    "DiamondCutFacet",
    "DiamondLoupeFacet",
    "DiamondOwnershipFacet",
    "AccessControlFacet",
    "ERC165Facet",
];

export const minterFacets = ["MinterAdminFacet", "MinterAssetViewFacet", "LiquidationFacet", "MinterUserFacet"];

// These function namings are ignored when generating ABI for the diamond
export const signatureFilters = ["init", "initializer"];
