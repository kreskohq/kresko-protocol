export const facets = ["DiamondCutFacet", "DiamondLoupeFacet", "DiamondOwnershipFacet", "AccessControlFacet"];

export const minterFacets = ["MinterParameterFacet"];

// Initializers and other functions we dont want to include in the diamond proxy mapping
export const signatureFilters = ["init", "initializer"];
