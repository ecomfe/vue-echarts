import { describe, expect, it } from "vitest";

import {
  getDependenciesFromOption,
  getImportsFromDependencies,
  type PublicCodegenOptions,
} from "../demo/utils/codegen";

function getImportsFromOption(option: unknown, options?: PublicCodegenOptions): string {
  return getImportsFromDependencies(getDependenciesFromOption(option), options);
}

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

  it("collects each shared option once and tolerates cycles", () => {
    let reads = 0;
    const leaf = {
      get series() {
        reads++;
        return [{ type: "line" }];
      },
    };
    let shared: object = leaf;
    for (let index = 0; index < 12; index++) {
      shared = { options: [shared, shared] };
    }
    const option = { baseOption: shared, media: [] as Array<{ option: object }> };
    option.media.push({ option });

    expect(getDependenciesFromOption(option)).toEqual(["LineChart"]);
    // The same leaf appears thousands of times in the expanded tree.
    expect(reads).toBeLessThan(10);
    expect(getDependenciesFromOption(option)).toEqual(["LineChart"]);
  });

  it("preserves first-seen dependency order across nested and shared options", () => {
    const shared = { title: {}, series: [{ type: "line" }] };
    const dependencies = getDependenciesFromOption({
      options: [shared, { legend: {}, series: [{ type: "bar" }] }],
      baseOption: { grid3D: {}, series: [{ type: "bar3D" }] },
      tooltip: {},
      xAxis: { jitter: 2, breaks: [{}] },
      dataset: { transform: { type: "filter" } },
      series: [{ type: "scatter", labelLayout: {}, universalTransition: true }],
      media: [{ option: shared }, { option: { visualMap: {} } }],
    });

    expect(dependencies).toEqual([
      "TitleComponent",
      "LineChart",
      "LegendComponent",
      "BarChart",
      "Grid3DComponent",
      "Bar3DChart",
      "TooltipComponent",
      "GridComponent",
      "DatasetComponent",
      "ScatterChart",
      "LabelLayout",
      "UniversalTransition",
      "ScatterJitter",
      "AxisBreak",
      "TransformComponent",
      "VisualMapComponent",
    ]);

    const code = getImportsFromDependencies(dependencies, { includeType: true, maxLen: 1000 });
    expect(code).toContain("import { Bar3DChart } from 'echarts-gl/charts'");
    expect(code).toContain("import { Grid3DComponent } from 'echarts-gl/components'");
    expect(code).toContain(
      "use([TitleComponent, LegendComponent, TooltipComponent, GridComponent, DatasetComponent, TransformComponent, VisualMapComponent, LineChart, BarChart, ScatterChart, Grid3DComponent, Bar3DChart, CanvasRenderer, LabelLayout, UniversalTransition, ScatterJitter, AxisBreak])",
    );
  });

  it("does not treat inherited map properties as dependencies", () => {
    expect(getDependenciesFromOption({ constructor: {}, series: [{ type: "toString" }] })).toEqual(
      [],
    );
  });
});
