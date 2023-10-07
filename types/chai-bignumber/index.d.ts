/// <reference types="chai" />
declare namespace Chai {
  // For BDD API
  interface Assertion extends LanguageChains, NumericComparison, TypeComparison {
    bignumber: Assertion;
  }
}

declare module 'chai-bignumber' {
  function chaiBignumber(bignumber: any): (chai: any, utils: any) => void;

  namespace chaiBignumber {}

  export = chaiBignumber;
}
