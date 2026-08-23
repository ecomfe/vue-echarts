/* eslint-disable @typescript-eslint/no-unused-vars */

import type { Ref } from "vue";

import type { InitOptions, Injection, LoadingOptions, Theme, UpdateOptions } from "../../src/types";

type Assert<T extends true> = T;
type IsAssignable<From, To> = [From] extends [To] ? true : false;
type OptionalSource<T> = Ref<T | undefined> | (() => T | undefined);
type AcceptsOptional<T> = IsAssignable<OptionalSource<T>, Injection<T>>;

type _themeAllowsOptionalSources = Assert<AcceptsOptional<Theme>>;
type _initOptionsAllowOptionalSources = Assert<AcceptsOptional<InitOptions>>;
type _updateOptionsAllowOptionalSources = Assert<AcceptsOptional<UpdateOptions>>;
type _loadingOptionsAllowOptionalSources = Assert<AcceptsOptional<LoadingOptions>>;
