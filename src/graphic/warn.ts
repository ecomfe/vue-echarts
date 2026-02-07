export const enum GraphicWarningCode {
  MissingEntry = "graphic-missing-entry",
  OptionOverride = "graphic-option-override",
  ManualUpdateIgnored = "graphic-manual-update-ignored",
  MissingIdentity = "graphic-missing-id-or-key",
  DuplicateId = "graphic-duplicate-id",
  OutsideSlot = "graphic-outside-slot",
}

function withCode(code: GraphicWarningCode, message: string): string {
  return `[${code}] ${message}`;
}

export function warnMissingGraphicEntry(): string {
  return withCode(
    GraphicWarningCode.MissingEntry,
    "Detected `#graphic` slot but no extension is registered. Import from `vue-echarts/graphic` to enable it.",
  );
}

export function warnOptionGraphicOverride(): string {
  return withCode(
    GraphicWarningCode.OptionOverride,
    "`#graphic` slot is provided, so `option.graphic` is ignored. Remove one of them to avoid ambiguity.",
  );
}

export function warnManualUpdateIgnored(): string {
  return withCode(
    GraphicWarningCode.ManualUpdateIgnored,
    "`#graphic` slot updates are ignored when `manual-update` is `true`.",
  );
}

export function warnMissingIdentity(name: string): string {
  return withCode(
    GraphicWarningCode.MissingIdentity,
    `\`${name}\` is missing \`id\` and \`key\`. Updates might be unstable in \`v-for\`.`,
  );
}

export function warnDuplicateId(id: string): string {
  return withCode(
    GraphicWarningCode.DuplicateId,
    `Duplicate graphic id "${id}" detected. Updates may be unstable.`,
  );
}

export function warnOutsideGraphicSlot(name: string): string {
  return withCode(
    GraphicWarningCode.OutsideSlot,
    `\`${name}\` must be used inside \`#graphic\` slot.`,
  );
}
