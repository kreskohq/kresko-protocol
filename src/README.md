# Diamond

## New state / upgrades:

### Upgrading state:

- Provide the address `_init` that contains the initialization process when calling `diamondCut` and pass `_calldata` for arguments for the function.

### Do NOT:

- 1. Do not add new state variables to the beginning or middle of structs. Doing this makes the new state variable overwrite existing state variable data and all state variables after the new state variable reference the wrong storage location.

- 2. Do not put structs directly in structs unless you don’t plan on ever adding more state variables to the inner structs. You won't be able to add new state variables to inner structs in upgrades. This makes sense because a struct uses a fixed number of storage locations. Adding a new state variable to an inner struct would cause the next state variable after the inner struct to be overwritten. Structs that are in mappings can be extended in upgrades, because those structs are stored in random locations based on keccak256 hashing.

- 3. Do not add new state variables to structs that are used in arrays.

- 4. Do not use the same namespace string for different structs. This is obvious. Two different structs at the same location will overwrite each other.

### Do:

- 1. To add new state variables to DiamondStorage pattern, add them to the end of the struct. This makes sense because it is not possible for existing facets to overwrite state variables at new storage locations.

- 2. New state variables can be added to the ends of structs that are used in mappings.

- 3. The names of state variables can be changed, but that might be confusing if different facets are using different names for the same storage locations.
