import type { LoadingOptions } from "../../src";

type Assert<T extends true> = T;
type IsEqual<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

type _fontSize = Assert<IsEqual<LoadingOptions["fontSize"], number | undefined>>;
type _fontWeight = Assert<
  IsEqual<
    LoadingOptions["fontWeight"],
    "normal" | "bold" | "bolder" | "lighter" | number | undefined
  >
>;
type _fontStyle = Assert<
  IsEqual<LoadingOptions["fontStyle"], "normal" | "italic" | "oblique" | undefined>
>;
type _customEffectOptions = Assert<
  { progress: number; frames: string[] } extends LoadingOptions ? true : false
>;
