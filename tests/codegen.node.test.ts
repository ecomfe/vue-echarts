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

  it("registers built-in transforms for object and array datasets", () => {
    const transformedDataset = {
      source: [[1], [2]],
      transform: { type: "filter", config: { dimension: 0, ">": 1 } },
    };

    [{ dataset: transformedDataset }, { dataset: [transformedDataset] }].forEach((option) => {
      const code = getImportsFromOption(option);

      expect(code).toContain(
        "import { DatasetComponent, TransformComponent } from 'echarts/components'",
      );
      expect(code).toContain("use([DatasetComponent, TransformComponent, CanvasRenderer])");
    });

    expect(getImportsFromOption({ dataset: { source: [] } })).not.toContain("TransformComponent");
  });

  it("registers dependencies from direct and media options", () => {
    const code = getImportsFromOption({
      title: {},
      media: [
        {
          query: { maxWidth: 600 },
          option: {
            visualMap: {},
            series: [{ type: "bar" }],
          },
        },
      ],
    });

    expect(code).toContain("TitleComponent");
    expect(code).toContain("VisualMapComponent");
    expect(code).toContain("BarChart");
  });
});
