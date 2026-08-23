import { describe, expect, it } from "vitest";

import { getImportsFromOption } from "../demo/utils/codegen";

describe("code generator", () => {
  it("registers ARIA only when configured", () => {
    expect(getImportsFromOption({})).not.toContain("AriaComponent");

    const code = getImportsFromOption({ aria: { enabled: true } }, { includeType: true });

    expect(code).toContain("import { AriaComponent } from 'echarts/components'");
    expect(code).toContain("import type { AriaComponentOption } from 'echarts/components'");
    expect(code).toContain("use([AriaComponent, CanvasRenderer])");
  });
});
