export type Split<S extends string, D extends string> = string extends S
  ? string[]
  : S extends ''
  ? []
  : S extends `${infer T}${D}${infer U}`
  ? [T, ...Split<U, D>]
  : [S];

export type SplitReverse<S extends string, D extends string> = string extends S
  ? string[]
  : S extends ''
  ? []
  : S extends `${D}${infer U}`
  ? `${D}${U}`
  : never;
