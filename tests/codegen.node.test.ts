import { describe, expect, it } from "vitest";

import { getImportsFromOption } from "../demo/utils/codegen";

describe("code generator", () => {
  it("formats complete single-line imports and option types", () => {
    expect(
      getImportsFromOption({ series: { type: "bar" } }, { includeType: true, maxLen: 1000 }),
    ).toBe(
      "import { use } from 'echarts/core'\n" +
        "import { BarChart } from 'echarts/charts'\n" +
        "import { CanvasRenderer } from 'echarts/renderers'\n" +
        "import type { ComposeOption } from 'echarts/core'\n" +
        "import type { BarSeriesOption } from 'echarts/charts'\n\n" +
        "use([BarChart, CanvasRenderer])\n\n" +
        "type EChartsOption = ComposeOption<BarSeriesOption>\n",
    );
  });

  it("preserves quotes, indentation and semicolons in multiline output", () => {
    expect(
      getImportsFromOption(
        { series: { type: "bar" } },
        {
          includeType: true,
          multiline: true,
          quote: '"',
          indent: "\t",
          semi: true,
          renderer: "svg",
        },
      ),
    ).toBe(
      'import { use } from "echarts/core";\n' +
        'import {\n\tBarChart\n} from "echarts/charts";\n' +
        'import {\n\tSVGRenderer\n} from "echarts/renderers";\n' +
        'import type { ComposeOption } from "echarts/core";\n' +
        'import type {\n\tBarSeriesOption\n} from "echarts/charts";\n\n' +
        "use([\n\tBarChart,\n\tSVGRenderer\n]);\n\n" +
        "type EChartsOption = ComposeOption<\n\t| BarSeriesOption\n>;\n",
    );
  });

  it.each([
    "import { BarChart } from 'echarts/charts'",
    "use([BarChart, CanvasRenderer])",
    "type EChartsOption = ComposeOption<BarSeriesOption>",
  ])("wraps only when the line exceeds maxLen: %s", (line) => {
    const option = { series: { type: "bar" } };
    expect(getImportsFromOption(option, { includeType: true, maxLen: line.length })).toContain(
      line,
    );
    expect(
      getImportsFromOption(option, { includeType: true, maxLen: line.length - 1 }),
    ).not.toContain(line);
  });

  it("registers ARIA only when configured", () => {
    expect(getImportsFromOption({})).not.toContain("AriaComponent");

    const code = getImportsFromOption({ aria: { enabled: true } }, { includeType: true });

    expect(code).toContain("import { AriaComponent } from 'echarts/components'");
    expect(code).toContain("import type { AriaComponentOption } from 'echarts/components'");
    expect(code).toContain("use([AriaComponent, CanvasRenderer])");
  });

  it("omits type scaffolding when no option types are detected", () => {
    const code = getImportsFromOption({}, { includeType: true });

    expect(code).not.toContain("ComposeOption");
    expect(code).not.toContain("type EChartsOption");
  });

  it("registers explicitly configured grid and axis pointer components", () => {
    const code = getImportsFromOption({ grid: {}, axisPointer: {} });

    expect(code).toContain("GridComponent");
    expect(code).toContain("AxisPointerComponent");
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

  it("uses the published extension path in TypeScript output", () => {
    const code = getImportsFromOption(
      { series: { type: "scatter", coordinateSystem: "bmap" } },
      { includeType: true },
    );

    expect(code).toContain("import 'echarts/extension/bmap/bmap'");
    expect(code).not.toContain("extension-src");
  });

  it("registers dependencies from direct and nested options", () => {
    const code = getImportsFromOption({
      title: {},
      timeline: {},
      baseOption: { series: [{ type: "line" }] },
      options: [{ series: [{ type: "bar" }] }],
      media: [
        {
          query: { maxWidth: 600 },
          option: {
            visualMap: {},
          },
        },
      ],
    });

    expect(code).toContain("TitleComponent");
    expect(code).toContain("TimelineComponent");
    expect(code).toContain("VisualMapComponent");
    expect(code).toContain("LineChart");
    expect(code).toContain("BarChart");
  });
});
