import { describe, it, expect } from "vitest";
import { planUpdate } from "../src/update";
import { init, type EChartsOption } from "echarts";

const linearGradient = {
  type: "linear" as const,
  x: 0,
  y: 0,
  x2: 1,
  y2: 0,
  colorStops: [],
  global: true,
};
type AppliedOption = {
  color?: unknown;
  dataset?: unknown;
  graphic?: Array<{ elements?: Array<{ id?: string }> }>;
  legend?: Array<{ selected?: Record<string, boolean> }>;
  title?: Array<{ subtext?: string }>;
  series?: Array<{
    id?: string;
    name?: string;
    datasetId?: string;
    label?: { color?: string };
  }>;
};

const buildSignature = (option: EChartsOption) => planUpdate(undefined, option).signature;

function createChart() {
  return init(null, undefined, {
    renderer: "svg",
    ssr: true,
    width: 100,
    height: 100,
  });
}

const optionContainers = ["baseOption", "timeline", "media"] as const;

function wrapOption(
  container: (typeof optionContainers)[number],
  option: EChartsOption,
): EChartsOption {
  if (container === "baseOption") {
    return { baseOption: option };
  }
  if (container === "timeline") {
    return {
      baseOption: { timeline: { currentIndex: 0 }, series: [] },
      options: [option],
    };
  }
  return {
    baseOption: { title: { text: "Base" }, series: [] },
    media: [{ query: { maxWidth: 200 }, option }],
  };
}

function graphicOption(children: unknown[]): EChartsOption {
  return { graphic: { elements: [{ id: "group", children }] } } as unknown as EChartsOption;
}

function applyPlannedUpdate(base: EChartsOption, update: EChartsOption) {
  const { plan } = planUpdate(buildSignature(base), update);
  const chart = createChart();

  try {
    chart.setOption(base);
    chart.setOption(update, plan);
    return { applied: chart.getOption() as AppliedOption, plan };
  } finally {
    chart.dispose();
  }
}

describe("smart-update", () => {
  describe("buildSignature", () => {
    it("collects leaves, objects, and component collections", () => {
      const option: EChartsOption = {
        title: { text: "foo" },
        tooltip: { show: true },
        backgroundColor: linearGradient,
        color: "#000",
        dataset: [{ id: "ds1", source: [] }, { source: [] }],
        series: [{ id: "a", type: "bar" }, { type: "line" }],
      };

      const signature = buildSignature(option);

      expect(Object.keys(signature.objectShapes)).toEqual(["backgroundColor"]);
      expect(signature.leaves).toEqual(["color"]);
      expect(signature.collections.dataset).toMatchObject([{ id: "ds1" }, { id: undefined }]);
      expect(signature.collections.series).toMatchObject([{ id: "a" }, { id: undefined }]);
      expect(signature.collections.tooltip).toHaveLength(1);
      expect(signature.objectShapes.color).toBeUndefined();
      expect(signature.leaves).not.toContain("title");
    });

    it("recognizes graphic element actions", () => {
      const graphic = buildSignature(graphicOption([{ id: "item", $action: "remove" }]));

      expect(graphic.hasAction).toBe(true);
    });

    it("ignores explicit undefined values", () => {
      const option: EChartsOption = {
        animation: undefined,
        backgroundColor: { ...linearGradient, global: undefined },
        color: "#fff",
      };

      const signature = buildSignature(option);

      expect(signature.leaves).toEqual(["color"]);
      expect(signature.objectShapes.backgroundColor).not.toHaveProperty("global");
    });

    it("does not traverse data arrays inside option containers", () => {
      const item = {};
      Object.defineProperty(item, "expensive", {
        enumerable: true,
        get: () => {
          throw new Error("Nested data was traversed");
        },
      });

      const series = [{ type: "pie" as const, data: [item] }];

      expect(() =>
        buildSignature({
          series,
          options: [{ series }],
          media: [{ option: { series } }],
        }),
      ).not.toThrow();
    });
  });

  describe("planUpdate", () => {
    describe("bootstrap & non-removal changes", () => {
      it("returns neutral plan when previous signature missing", () => {
        const option: EChartsOption = {
          legend: { show: true },
          series: [{ type: "bar", data: [1, 2, 3] }],
        };

        const result = planUpdate(undefined, option);

        expect(result.plan.notMerge).toBe(false);
        expect(result.plan.replaceMerge).toBeUndefined();
      });

      it("keeps merge when a leaf value changes", () => {
        const prev = buildSignature({ backgroundColor: "red", color: "red" });
        const next = planUpdate(prev, { backgroundColor: "blue", color: "blue" });

        expect(next.plan).toEqual({ notMerge: false });
      });

      it("keeps merge when a setting changes between leaf and structured forms", () => {
        const object = buildSignature({
          backgroundColor: linearGradient,
        });
        const leaf = buildSignature({ backgroundColor: "transparent", color: "red" });

        expect(planUpdate(object, { backgroundColor: "transparent" }).plan).toEqual({
          notMerge: false,
        });
        expect(planUpdate(leaf, { backgroundColor: linearGradient, color: ["blue"] }).plan).toEqual(
          { notMerge: false },
        );
      });

      it("keeps merge for nested additions and value replacements", () => {
        const prev = buildSignature({
          title: { text: "before", backgroundColor: linearGradient },
        });
        const next = planUpdate(prev, {
          title: { text: "after", subtext: "new", backgroundColor: "transparent" },
        });

        expect(next.plan).toEqual({ notMerge: false });
      });

      it("keeps merge when new series IDs are added", () => {
        const base: EChartsOption = {
          series: [{ id: "latte", type: "bar", data: [10, 20] }],
        };

        const update: EChartsOption = {
          series: [
            { id: "latte", type: "bar", data: [12, 24] },
            { id: "mocha", type: "bar", data: [14, 28] },
          ],
        };

        const result = planUpdate(buildSignature(base), update);

        expect(result.plan.notMerge).toBe(false);
        expect(result.plan.replaceMerge).toBeUndefined();
      });

      it("keeps merge when the first component collection is added", () => {
        const result = planUpdate(buildSignature({}), {
          series: [{ id: "latte", type: "bar", data: [10, 20] }],
        });

        expect(result.plan).toEqual({ notMerge: false });
      });

      it("keeps merge when anonymous series are appended", () => {
        const prev = buildSignature({ series: [{ type: "bar" }] });
        const result = planUpdate(prev, {
          series: [{ type: "bar" }, { type: "line" }],
        });

        expect(result.plan).toEqual({ notMerge: false });
      });

      it("replaces components when a new ID precedes an anonymous item", () => {
        const anonymous = { type: "pie" as const, data: [1] };
        const base: EChartsOption = { series: [anonymous] };
        const update: EChartsOption = {
          series: [{ id: "identified", type: "pie", data: [2] }, anonymous],
        };
        const { applied, plan } = applyPlannedUpdate(base, update);

        expect(plan).toEqual({ notMerge: false, replaceMerge: ["series"] });
        expect(applied.series?.map(({ id }) => id)).toEqual(["identified", undefined]);
      });

      it("rebuilds when new IDs surround existing IDs", () => {
        const base: EChartsOption = {
          series: [
            { id: "b", type: "pie", data: [2] },
            { id: "d", type: "pie", data: [4] },
          ],
        };
        const update: EChartsOption = {
          series: [
            { id: "a", type: "pie", data: [1] },
            { id: "b", type: "pie", data: [2] },
            { id: "c", type: "pie", data: [3] },
            { id: "d", type: "pie", data: [4] },
          ],
        };
        const { applied, plan } = applyPlannedUpdate(base, update);

        expect(plan).toEqual({ notMerge: true });
        expect(applied.series?.map(({ id }) => id)).toEqual(["a", "b", "c", "d"]);
      });
    });

    describe("removal detection", () => {
      it("does not mark replace when an empty component array is removed", () => {
        const base: EChartsOption = {
          series: [] as EChartsOption["series"],
        };
        const update = {
          title: { text: "noop" },
        } as EChartsOption;

        const result = planUpdate(buildSignature(base), update);

        expect(result.plan.notMerge).toBe(false);
        expect(result.plan.replaceMerge).toBeUndefined();
      });

      it.each(["root", ...optionContainers] as const)(
        "restores defaults when an empty setting array is removed from %s",
        (container) => {
          const withEmptyColor: EChartsOption = { color: [] };
          const base =
            container === "root" ? withEmptyColor : wrapOption(container, withEmptyColor);
          const update = container === "root" ? {} : wrapOption(container, {});
          const { applied, plan } = applyPlannedUpdate(base, update);

          expect(plan).toEqual({ notMerge: true });
          expect(applied.color).toEqual(expect.arrayContaining([expect.any(String)]));
        },
      );

      it("forces rebuild when options shrink", () => {
        const prev = buildSignature({ options: [{}, {}] });
        const { plan } = planUpdate(prev, { options: [{}] });
        expect(plan.notMerge).toBe(true);
        expect(plan.replaceMerge).toBeUndefined();
      });

      it("forces rebuild when media entries shrink", () => {
        const prev = buildSignature({ media: [{ option: {} }, { option: {} }] });
        const { plan } = planUpdate(prev, { media: [{ option: {} }] });

        expect(plan.notMerge).toBe(true);
        expect(plan.replaceMerge).toBeUndefined();
      });

      it.each(optionContainers)(
        "removes nested properties from same-length %s entries",
        (container) => {
          const base = wrapOption(container, { title: { text: "Sales", subtext: "stale" } });
          const update = wrapOption(container, { title: { text: "Sales" } });
          const { applied, plan } = applyPlannedUpdate(base, update);

          expect(applied.title?.[0]?.subtext).not.toBe("stale");
          expect(plan).toEqual({ notMerge: true });
          expect(planUpdate(buildSignature(update), base).plan).toEqual({ notMerge: false });
        },
      );

      it.each(optionContainers)(
        "removes nested component properties from same-length %s entries",
        (container) => {
          const base = wrapOption(container, {
            series: [
              {
                id: "sales",
                type: "pie",
                data: [1],
                label: { show: true, color: "red" },
              },
            ],
          });
          const update = wrapOption(container, {
            series: [{ id: "sales", type: "pie", data: [1], label: { show: true } }],
          });
          const { applied, plan } = applyPlannedUpdate(base, update);

          expect(applied.series?.[0]?.label?.color).not.toBe("red");
          expect(plan).toEqual({ notMerge: true });
          expect(planUpdate(buildSignature(update), base).plan).toEqual({ notMerge: false });
        },
      );

      it.each(["root", ...optionContainers] as const)(
        "replaces omitted graphic children in %s",
        (container) => {
          const baseOption = graphicOption([{ id: "a" }, { id: "b" }]);
          const updateOption = graphicOption([{ id: "b" }]);
          const base = container === "root" ? baseOption : wrapOption(container, baseOption);
          const update = container === "root" ? updateOption : wrapOption(container, updateOption);

          expect(planUpdate(buildSignature(base), update).plan).toEqual(
            container === "root"
              ? { notMerge: false, replaceMerge: ["graphic"] }
              : { notMerge: true },
          );
        },
      );

      it.each(["root", ...optionContainers] as const)(
        "preserves explicit graphic actions in %s",
        (container) => {
          const baseOption = {
            ...graphicOption([{ id: "a" }, { id: "b" }]),
            color: "red",
          };
          const updateOption = graphicOption([{ id: "a", $action: "remove" }, { id: "b" }]);
          const base = container === "root" ? baseOption : wrapOption(container, baseOption);
          const update = container === "root" ? updateOption : wrapOption(container, updateOption);

          expect(planUpdate(buildSignature(base), update).plan).toEqual({ notMerge: false });
        },
      );

      it.each([false, true])(
        "removes unrelated components while preserving graphic actions (global reset: %s)",
        (reset) => {
          const base: EChartsOption = {
            backgroundColor: reset ? "red" : undefined,
            title: { text: "stale" },
            graphic: {
              elements: [
                { type: "rect", id: "a", shape: { x: 0, y: 0, width: 10, height: 10 } },
                { type: "rect", id: "b", shape: { x: 20, y: 0, width: 10, height: 10 } },
              ],
            },
          };
          const update = {
            graphic: { elements: [{ id: "a", $action: "remove" }] },
          } as EChartsOption;
          const { applied, plan } = applyPlannedUpdate(base, update);

          expect(plan).toEqual({ notMerge: false, replaceMerge: ["title"] });
          expect(applied.title).toEqual([]);
          expect(applied.graphic?.[0]?.elements?.map(({ id }) => id)).toEqual(["b"]);
        },
      );

      it.each(["root", ...optionContainers] as const)(
        "replaces graphic types without relying on property removal in %s",
        (container) => {
          const baseOption: EChartsOption = {
            graphic: { elements: [{ id: "marker", type: "rect", style: { fill: "red" } }] },
          };
          const updateOption: EChartsOption = {
            graphic: { elements: [{ id: "marker", type: "circle", style: { fill: "blue" } }] },
          };
          const base = container === "root" ? baseOption : wrapOption(container, baseOption);
          const update = container === "root" ? updateOption : wrapOption(container, updateOption);
          const { applied } = applyPlannedUpdate(base, update);

          expect(applied.graphic?.[0]?.elements).toMatchObject([
            { id: "marker", type: "circle", style: { fill: "blue" } },
          ]);
        },
      );

      it.each(optionContainers)("rebuilds reordered components in %s", (container) => {
        const series = [
          { id: "a", type: "pie", data: [1] },
          { id: "b", type: "pie", data: [2] },
        ] satisfies NonNullable<EChartsOption["series"]>;
        const base = wrapOption(container, { series });
        const update = wrapOption(container, { series: [series[1], series[0]] });
        const { applied, plan } = applyPlannedUpdate(base, update);

        expect(plan).toEqual({ notMerge: true });
        expect(applied.series?.map(({ id }) => id)).toEqual(["b", "a"]);
      });

      it.each([
        ["leaf", { color: "red" }],
        ["object", { backgroundColor: linearGradient }],
      ] as const)("forces rebuild when a %s setting disappears", (_, setting) => {
        const prev = buildSignature({ ...setting, title: { text: "foo" } });
        const { plan } = planUpdate(prev, { title: { text: "foo" } });
        expect(plan.notMerge).toBe(true);
        expect(plan.replaceMerge).toBeUndefined();
      });

      it("removes planned object and array options from the ECharts model", () => {
        const title: EChartsOption = { title: { text: "before" } };
        const series: EChartsOption = { series: [{ type: "pie", data: [1] }] };
        const empty: EChartsOption = {};
        const chart = createChart();

        try {
          chart.setOption(title);
          chart.setOption(empty, planUpdate(buildSignature(title), empty).plan);
          expect(chart.getOption().title).toEqual([]);

          chart.setOption(series, { notMerge: true });
          chart.setOption(empty, planUpdate(buildSignature(series), empty).plan);
          expect(chart.getOption().series).toEqual([]);
        } finally {
          chart.dispose();
        }
      });

      it("preserves unrelated interaction state when removing an object component", () => {
        const base: EChartsOption = {
          title: { text: "before" },
          legend: { data: ["A", "B"] },
          series: [
            { name: "A", type: "pie", data: [1] },
            { name: "B", type: "pie", data: [2] },
          ],
        };
        const update: EChartsOption = {
          legend: { data: ["A", "B"] },
          series: [
            { name: "A", type: "pie", data: [1] },
            { name: "B", type: "pie", data: [2] },
          ],
        };
        const chart = createChart();

        try {
          chart.setOption(base);
          chart.dispatchAction({ type: "legendUnSelect", name: "B" });

          const plan = planUpdate(buildSignature(base), update).plan;
          chart.setOption(update, plan);
          const applied = chart.getOption() as AppliedOption;

          expect(plan).toEqual({ notMerge: false, replaceMerge: ["title"] });
          expect(applied.title).toEqual([]);
          expect(applied.legend?.[0]?.selected?.B).toBe(false);
        } finally {
          chart.dispose();
        }
      });

      it("preserves legend state when replacing anonymous series for property removal", () => {
        const base: EChartsOption = {
          legend: { data: ["A", "B"] },
          series: [
            {
              name: "A",
              type: "pie",
              data: [1],
              label: { show: true, color: "red" },
            },
            { name: "B", type: "pie", data: [2] },
          ],
        };
        const update: EChartsOption = {
          legend: { data: ["A", "B"] },
          series: [
            { name: "A", type: "pie", data: [1], label: { show: true } },
            { name: "B", type: "pie", data: [2] },
          ],
        };
        const chart = createChart();

        try {
          chart.setOption(base);
          chart.dispatchAction({ type: "legendUnSelect", name: "B" });

          const plan = planUpdate(buildSignature(base), update).plan;
          chart.setOption(update, plan);
          const applied = chart.getOption() as AppliedOption;

          expect(plan).toEqual({ notMerge: false, replaceMerge: ["series"] });
          expect(applied.series?.[0]?.label?.color).toBeUndefined();
          expect(applied.legend?.[0]?.selected?.B).toBe(false);
        } finally {
          chart.dispose();
        }
      });

      it("rebuilds when removing an ID would leave a leading hole", () => {
        const base: EChartsOption = {
          series: [
            { id: "a", type: "pie", data: [1] },
            { id: "b", type: "pie", data: [2] },
          ],
        };
        const update: EChartsOption = {
          series: [{ id: "b", type: "pie", data: [2] }],
        };
        const { applied, plan } = applyPlannedUpdate(base, update);

        expect(plan).toEqual({ notMerge: true });
        expect(applied.series?.map(({ id }) => id)).toEqual(["b"]);
      });

      it("adds replaceMerge when an id changes without shrinking", () => {
        const prev = buildSignature({ series: [{ id: "a" }, { id: "b" }] });
        const next = planUpdate(prev, { series: [{ id: "a" }, { id: "c" }] });

        expect(next.plan.replaceMerge).toEqual(["series"]);
        expect(next.plan.notMerge).toBe(false);
      });

      it.each(["root", ...optionContainers] as const)(
        "replaces a singleton component when its id changes in %s",
        (container) => {
          const baseOption: EChartsOption = {
            series: { id: "a", type: "pie", data: [1] },
          };
          const updateOption: EChartsOption = {
            series: { id: "b", type: "pie", data: [2] },
          };
          const base = container === "root" ? baseOption : wrapOption(container, baseOption);
          const update = container === "root" ? updateOption : wrapOption(container, updateOption);
          const { applied, plan } = applyPlannedUpdate(base, update);

          expect(plan).toEqual(
            container === "root"
              ? { notMerge: false, replaceMerge: ["series"] }
              : { notMerge: true },
          );
          expect(applied.series?.map(({ id }) => id)).toEqual(["b"]);
        },
      );

      it("adds replaceMerge when anonymous count shrinks", () => {
        const prev = buildSignature({ series: [{}, {}] });
        const next = planUpdate(prev, { series: [{}] });

        expect(next.plan.replaceMerge).toEqual(["series"]);
        expect(next.plan.notMerge).toBe(false);
      });

      it("rebuilds when adding colors so default entries do not survive", () => {
        const update: EChartsOption = { color: ["red", "blue"] };
        const { applied, plan } = applyPlannedUpdate({}, update);

        expect(plan).toEqual({ notMerge: true });
        expect(applied.color).toEqual(["red", "blue"]);
      });

      it("rebuilds when aria is first added so ECharts enables it", () => {
        const update: EChartsOption = { aria: { decal: { show: true } } };
        const { applied, plan } = applyPlannedUpdate({}, update);

        expect(plan).toEqual({ notMerge: true });
        expect((applied as { aria?: unknown }).aria).toMatchObject({
          enabled: true,
          decal: { show: true },
          label: { enabled: true },
        });
      });

      it("rebuilds for destructive global array changes", () => {
        const base: EChartsOption = { color: ["red", "blue"] };
        const update: EChartsOption = { color: ["red"] };
        const result = planUpdate(buildSignature(base), update);
        const chart = createChart();

        try {
          chart.setOption(base);
          expect(() => chart.setOption(update, result.plan)).not.toThrow();
          expect(chart.getOption().color).toEqual(["red"]);
        } finally {
          chart.dispose();
        }

        expect(result.plan).toEqual({ notMerge: true });
      });

      it("removes nested properties from object options", () => {
        const base: EChartsOption = { title: { text: "Coffee", subtext: "Daily sales" } };
        const update: EChartsOption = { title: { text: "Coffee" } };
        const { applied, plan } = applyPlannedUpdate(base, update);

        expect(applied.title?.[0]?.subtext).not.toBe("Daily sales");
        expect(plan).toEqual({ notMerge: false, replaceMerge: ["title"] });
      });

      it("removes nested properties from identified and named items together", () => {
        const base: EChartsOption = {
          series: [
            { name: "named", type: "pie", data: [1], label: { color: "red" } },
            { id: "identified", type: "pie", data: [2], label: { color: "blue" } },
          ],
        };
        const update: EChartsOption = {
          series: [
            { name: "named", type: "pie", data: [1], label: {} },
            { id: "identified", type: "pie", data: [2], label: {} },
          ],
        };
        const { applied, plan } = applyPlannedUpdate(base, update);

        expect(plan).toEqual({ notMerge: true });
        expect(applied.series?.map(({ label }) => label?.color)).toEqual([undefined, undefined]);
      });

      it("rebuilds when an ID moves around anonymous items", () => {
        const base: EChartsOption = {
          series: [
            { type: "pie", data: [1] },
            { id: "named", type: "pie", data: [2] },
            { type: "pie", data: [3], label: { color: "red" } },
          ],
        };
        const update: EChartsOption = {
          series: [
            { id: "named", type: "pie", data: [2] },
            { type: "pie", data: [1] },
            { type: "pie", data: [3], label: {} },
          ],
        };
        const { applied, plan } = applyPlannedUpdate(base, update);

        expect(plan).toEqual({ notMerge: true });
        expect(applied.series?.map(({ id }) => id)).toEqual(["named", undefined, undefined]);
      });

      it("replaces reordered named components before clearing nested properties", () => {
        const base: EChartsOption = {
          series: [
            {
              name: "latte",
              type: "pie",
              data: [1],
              label: { show: true, color: "red" },
            },
            { name: "mocha", type: "pie", data: [2], label: { show: true } },
          ],
        };
        const update: EChartsOption = {
          series: [
            {
              name: "mocha",
              type: "pie",
              data: [2],
              label: { show: true, color: "brown" },
            },
            { name: "latte", type: "pie", data: [1], label: { show: true } },
          ],
        };

        const { applied, plan } = applyPlannedUpdate(base, update);
        const seriesByName = Object.fromEntries(
          (applied.series ?? []).map((series) => [series.name, series]),
        );

        expect(plan).toEqual({ notMerge: false, replaceMerge: ["series"] });
        expect(applied.series?.map(({ name }) => name)).toEqual(["mocha", "latte"]);
        expect(seriesByName.latte.label?.color).toBeUndefined();
        expect(seriesByName.mocha.label?.color).toBe("brown");
      });
    });

    describe("real data scenarios", () => {
      it("combines object removal with a series replacement", () => {
        const base: EChartsOption = {
          legend: { show: true },
          dataset: [
            {
              id: "sales",
              source: [
                ["product", "2015", "2016"],
                ["Matcha Latte", 43.3, 85.8],
              ],
            },
          ],
          series: [
            { id: "2015", type: "bar", datasetId: "sales" },
            { id: "2016", type: "bar", datasetId: "sales" },
          ],
        };

        const update: EChartsOption = {
          dataset: [
            {
              id: "sales",
              source: [
                ["product", "2015"],
                ["Matcha Latte", 55.1],
              ],
            },
          ],
          series: [{ id: "2015", type: "bar", datasetId: "sales" }],
        };

        const result = planUpdate(buildSignature(base), update);

        expect(result.plan).toEqual({
          notMerge: false,
          replaceMerge: ["legend", "series"],
        });
      });

      it("clears dataset when removed entirely", () => {
        const base: EChartsOption = {
          dataset: [
            {
              id: "sales",
              source: [
                ["product", "value"],
                ["Latte", 30],
              ],
            },
          ],
          series: [{ id: "sales-series", type: "pie", datasetId: "sales" }],
        };

        const update: EChartsOption = {
          series: [{ id: "sales-series", type: "pie", data: [35] }],
        };

        const { applied, plan } = applyPlannedUpdate(base, update);

        expect(applied.dataset).toBeUndefined();
        expect(applied.series?.[0]?.datasetId).toBeUndefined();
        expect(plan).toEqual({ notMerge: true });
      });

      it("tracks multiple array shrink operations", () => {
        const base: EChartsOption = {
          legend: { show: true },
          dataset: [
            {
              id: "2015",
              source: [
                ["Latte", 30],
                ["Mocha", 24],
              ],
            },
            {
              id: "2016",
              source: [
                ["Latte", 40],
                ["Mocha", 35],
              ],
            },
          ],
          series: [
            { id: "latte", type: "bar", datasetId: "2015" },
            { id: "mocha", type: "bar", datasetId: "2016" },
          ],
        };

        const update: EChartsOption = {
          series: [{ id: "latte", type: "bar", datasetId: "2015" }],
        };

        const result = planUpdate(buildSignature(base), update);

        expect(result.plan).toEqual({
          notMerge: false,
          replaceMerge: ["dataset", "legend", "series"],
        });
      });

      it("handles single-object series shape without array replacement planning", () => {
        const base: EChartsOption = {
          series: {
            type: "line",
            data: [1, 2, 3],
          },
        };

        const update: EChartsOption = {
          series: {
            type: "line",
            data: [2, 3, 4],
          },
        };

        const result = planUpdate(buildSignature(base), update);

        expect(result.plan.notMerge).toBe(false);
        expect(result.plan.replaceMerge).toBeUndefined();
      });

      it("replaces series when its shape changes from an object to an array", () => {
        const base: EChartsOption = {
          series: {
            type: "bar",
            data: [10, 20],
          },
        };

        const update: EChartsOption = {
          series: [{ id: "latte", type: "bar", data: [12, 24] }],
        };

        const result = planUpdate(buildSignature(base), update);

        expect(result.plan.notMerge).toBe(false);
        expect(result.plan.replaceMerge).toEqual(["series"]);
      });

      it("replaces series when its shape changes from an array to an object", () => {
        const base: EChartsOption = {
          series: [
            { id: "latte", type: "bar", data: [10, 20] },
            { id: "mocha", type: "line", data: [15, 25] },
          ],
        };

        const update: EChartsOption = {
          series: {
            id: "latte",
            type: "bar",
            data: [12, 24],
          },
        };

        const result = planUpdate(buildSignature(base), update);

        expect(result.plan.notMerge).toBe(false);
        expect(result.plan.replaceMerge).toEqual(["series"]);
      });

      it("prioritizes notMerge when leaf removal happens with array shrink", () => {
        const base: EChartsOption = {
          color: "#000",
          series: [
            { id: "a", type: "line", data: [1] },
            { id: "b", type: "line", data: [2] },
          ],
        };

        const update: EChartsOption = {
          series: [{ id: "a", type: "line", data: [3] }],
        };

        const result = planUpdate(buildSignature(base), update);

        expect(result.plan.notMerge).toBe(true);
        expect(result.plan.replaceMerge).toBeUndefined();
      });
    });
  });
});
