import { describe, it, expect } from "vitest";
import { buildSignature, planUpdate } from "../src/update";
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
  backgroundColor?: unknown;
  dataset?: unknown;
  title?: Array<{ subtext?: string }>;
  series?: Array<{ name?: string; datasetId?: string; label?: { color?: string } }>;
};

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
    it("collects leaves, objects, and array summaries", () => {
      const option: EChartsOption = {
        title: { text: "foo" },
        tooltip: { show: true },
        color: "#000",
        dataset: [{ id: "ds1", source: [] }, { source: [] }],
        series: [{ id: "a", type: "bar" }, { type: "line" }],
      };

      const signature = buildSignature(option);

      expect(Object.keys(signature.objectShapes).sort()).toEqual(["title", "tooltip"]);
      expect(signature.leaves).toEqual(["color"]);
      expect(signature.arrays.dataset).toMatchObject({ idsSorted: ["ds1"], noIdCount: 1 });
      expect(signature.arrays.series).toMatchObject({ idsSorted: ["a"], noIdCount: 1 });
      expect(signature.objectShapes.color).toBeUndefined();
      expect(signature.leaves).not.toContain("title");
      expect(signature.arrays.tooltip).toBeUndefined();
    });

    it("treats numeric ids as strings and ignores unsupported ids", () => {
      const option: EChartsOption = {
        series: [
          { id: 2, type: "bar" },
          { id: 1, type: "line" },
          { id: { nested: true } as unknown, type: "pie" },
          { id: true as unknown as string, type: "scatter" },
          { type: "area" },
        ] as unknown as EChartsOption["series"],
      };

      const signature = buildSignature(option);
      expect(signature.arrays.series).toMatchObject({ idsSorted: ["1", "2"], noIdCount: 3 });
    });

    it("filters primitive component items and sorts leaf keys", () => {
      const option: EChartsOption = {
        dataset: ["raw", { id: "has-id" }],
        backgroundColor: "#000",
        color: "#fff",
      } as unknown as EChartsOption;

      const signature = buildSignature(option);

      expect(signature.arrays.dataset).toMatchObject({ idsSorted: ["has-id"], noIdCount: 0 });
      expect(signature.leaves).toEqual(["backgroundColor", "color"]);
    });

    it("handles malformed option container entries", () => {
      const signature = buildSignature({
        options: [null],
        media: [null, { query: {} }],
      } as unknown as EChartsOption);

      expect(signature.arrays.options?.noIdCount).toBe(1);
      expect(signature.arrays.media?.noIdCount).toBe(2);
    });

    it("ignores explicit undefined values in leaves", () => {
      const option: EChartsOption = {
        backgroundColor: undefined,
        color: "#fff",
      } as unknown as EChartsOption;

      const signature = buildSignature(option);

      expect(signature.leaves).toEqual(["color"]);
    });

    it("handles cyclic option objects", () => {
      const title: Record<string, unknown> = { text: "cycle", unused: undefined };
      title.self = title;

      const signature = buildSignature({ title } as EChartsOption);
      const serialized = JSON.stringify(signature);

      expect(serialized).not.toContain("cycle");
      expect(serialized).not.toContain("unused");
    });

    it("reads each structural value once", () => {
      const reads: Record<string, number> = {};
      const tracked = (key: string, value: unknown): PropertyDescriptor => ({
        enumerable: true,
        get: () => {
          reads[key] = (reads[key] ?? 0) + 1;
          return value;
        },
      });
      const baseOption = Object.defineProperty({}, "title", tracked("baseTitle", {}));
      const mediaOption = Object.defineProperty({}, "title", tracked("mediaTitle", {}));
      const media = Object.defineProperty({}, "option", tracked("mediaOption", mediaOption));
      const seriesOption = Object.defineProperties(
        {},
        {
          id: tracked("seriesId", "series"),
          name: tracked("seriesName", "Sales"),
        },
      );
      const series = Object.defineProperty(new Array(1), 0, tracked("seriesItem", seriesOption));

      buildSignature({ baseOption, media: [media], series } as EChartsOption);

      expect(reads).toEqual({
        baseTitle: 1,
        mediaOption: 1,
        mediaTitle: 1,
        seriesItem: 1,
        seriesId: 1,
        seriesName: 1,
      });
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
    describe("bootstrap & neutral cases", () => {
      it("returns neutral plan when previous signature missing", () => {
        const option: EChartsOption = {
          legend: { show: true },
          series: [{ type: "bar", data: [1, 2, 3] }],
        };

        const result = planUpdate(undefined, option);

        expect(result.plan.notMerge).toBe(false);
        expect(result.plan.replaceMerge).toBeUndefined();
      });

      it("returns neutral plan when signatures match", () => {
        const option: EChartsOption = {
          title: { text: "foo" },
          series: [{ id: "a" }],
        };

        const prev = buildSignature(option);
        const next = planUpdate(prev, option);

        expect(next.plan.notMerge).toBe(false);
        expect(next.plan.replaceMerge).toBeUndefined();
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

      it("keeps merge when new IDs surround existing IDs", () => {
        const prev = buildSignature({ series: [{ id: "b" }, { id: "d" }] });
        const next = planUpdate(prev, {
          series: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
        });

        expect(next.plan).toEqual({ notMerge: false });
      });

      it("keeps merge when dataset items reorder without shrink", () => {
        const prev = buildSignature({
          dataset: [
            { id: "a", source: [[1]] },
            { id: "b", dimensions: ["value"] },
          ],
        });
        const update: EChartsOption = {
          dataset: [
            { id: "b", dimensions: ["value"] },
            { id: "a", source: [[1]] },
          ],
        };

        const result = planUpdate(prev, update);

        expect(result.plan.notMerge).toBe(false);
        expect(result.plan.replaceMerge).toBeUndefined();
      });
    });

    describe("removal detection", () => {
      it("does not mark replace when previously empty array is removed", () => {
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

      it("forces rebuild when leaves disappear", () => {
        const prev = buildSignature({ color: "red", title: { text: "foo" } });
        const { plan } = planUpdate(prev, { title: { text: "foo" } });
        expect(plan.notMerge).toBe(true);
        expect(plan.replaceMerge).toBeUndefined();
      });

      it("forces rebuild when an object option is removed", () => {
        const prev = buildSignature({ legend: { show: true } });
        const next = planUpdate(prev, {});

        expect(next.plan.notMerge).toBe(true);
        expect(next.plan.replaceMerge).toBeUndefined();
      });

      it("removes top-level values explicitly cleared with null", () => {
        const title = { title: { text: "before" } };
        const background = { backgroundColor: "red" };
        const clearedTitle = { title: null } as unknown as EChartsOption;
        const clearedBackground = { backgroundColor: null } as unknown as EChartsOption;
        const { applied, plan } = applyPlannedUpdate(background, clearedBackground);

        expect(planUpdate(buildSignature(title), clearedTitle).plan).toEqual({ notMerge: true });
        expect(plan).toEqual({ notMerge: true });
        expect(applied.backgroundColor).toBeUndefined();
      });

      it("removes component entries replaced by null holes", () => {
        const base: EChartsOption = {
          series: [{ type: "pie", data: [1] }],
        };
        const update = { series: [null] } as unknown as EChartsOption;
        const { applied, plan } = applyPlannedUpdate(base, update);

        expect(plan).toEqual({ notMerge: false, replaceMerge: ["series"] });
        expect(applied.series).toEqual([]);
      });

      it.each(optionContainers)("aligns component shapes around null holes in %s", (container) => {
        const base = wrapOption(container, {
          series: [{ type: "pie", data: [1], label: { show: true, color: "red" } }, null],
        } as unknown as EChartsOption);
        const update = wrapOption(container, {
          series: [null, { type: "pie", data: [2], label: { show: true } }],
        } as unknown as EChartsOption);
        const { applied, plan } = applyPlannedUpdate(base, update);

        expect(plan).toEqual({ notMerge: true });
        expect(applied.series?.[0]?.label?.color).toBeUndefined();
      });

      it("removes planned object and array options from the ECharts model", () => {
        const title: EChartsOption = { title: { text: "before" } };
        const series: EChartsOption = { series: [{ type: "pie", data: [1] }] };
        const empty: EChartsOption = {};
        const chart = createChart();

        try {
          chart.setOption(title);
          chart.setOption(empty, planUpdate(buildSignature(title), empty).plan);
          expect(chart.getOption().title).toBeUndefined();

          chart.setOption(series, { notMerge: true });
          chart.setOption(empty, planUpdate(buildSignature(series), empty).plan);
          expect(chart.getOption().series).toEqual([]);
        } finally {
          chart.dispose();
        }
      });

      it("adds replaceMerge when an array option is removed", () => {
        const prev = buildSignature({ series: [{ id: "a" }, {}] });
        const next = planUpdate(prev, {});

        expect(next.plan.replaceMerge).toEqual(["series"]);
        expect(next.plan.notMerge).toBe(false);
      });

      it("adds replaceMerge when ids shrink", () => {
        const prev = buildSignature({ series: [{ id: "a" }, { id: "b" }] });
        const next = planUpdate(prev, { series: [{ id: "a" }] });

        expect(next.plan.replaceMerge).toEqual(["series"]);
        expect(next.plan.notMerge).toBe(false);
      });

      it("adds replaceMerge when an id changes without shrinking", () => {
        const prev = buildSignature({ series: [{ id: "a" }, { id: "b" }] });
        const next = planUpdate(prev, { series: [{ id: "a" }, { id: "c" }] });

        expect(next.plan.replaceMerge).toEqual(["series"]);
        expect(next.plan.notMerge).toBe(false);
      });

      it("adds replaceMerge when anonymous count shrinks", () => {
        const prev = buildSignature({ series: [{}, {}] });
        const next = planUpdate(prev, { series: [{}] });

        expect(next.plan.replaceMerge).toEqual(["series"]);
        expect(next.plan.notMerge).toBe(false);
      });

      it("sorts multiple replaceMerge components", () => {
        const prev = buildSignature({
          series: { type: "line" } as unknown as EChartsOption["series"],
          dataset: [{ id: "a" }, { id: "b" }],
        });
        const next = planUpdate(prev, {
          series: [{ id: "line", type: "line" }],
          dataset: [{ id: "a" }],
        });

        expect(next.plan).toEqual({ notMerge: false, replaceMerge: ["dataset", "series"] });
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

        const gradient: EChartsOption = { color: linearGradient };
        expect(planUpdate(buildSignature(gradient), update).plan).toEqual({ notMerge: true });

        const palette: EChartsOption = { color: [linearGradient] };
        const shorterPalette: EChartsOption = {
          color: [{ ...linearGradient, global: undefined }],
        };
        expect(planUpdate(buildSignature(palette), shorterPalette).plan).toEqual({
          notMerge: true,
        });
      });

      it("removes nested properties from object options", () => {
        const base: EChartsOption = { title: { text: "Coffee", subtext: "Daily sales" } };
        const update: EChartsOption = { title: { text: "Coffee" } };
        const { applied, plan } = applyPlannedUpdate(base, update);

        expect(applied.title?.[0]?.subtext).not.toBe("Daily sales");
        expect(plan).toEqual({ notMerge: true });
      });

      it("removes nested properties from retained component IDs", () => {
        const base: EChartsOption = {
          series: [{ id: "sales", type: "pie", data: [1], label: { show: true, color: "red" } }],
        };
        const update: EChartsOption = {
          series: [{ id: "sales", type: "pie", data: [1], label: { show: true } }],
        };
        const { applied, plan } = applyPlannedUpdate(base, update);

        expect(applied.series?.[0]?.label?.color).not.toBe("red");
        expect(plan).toEqual({ notMerge: true });
      });

      it("aligns anonymous item shapes around named items", () => {
        const prev = buildSignature({
          series: [{}, { id: "named" }, { label: { color: "red" } }],
        });
        const next = planUpdate(prev, {
          series: [{ id: "named" }, {}, { label: {} }],
        });

        expect(next.plan).toEqual({ notMerge: true });
      });

      it("matches anonymous component shapes by name before index", () => {
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

        expect(
          planUpdate(buildSignature(base), {
            series: [
              {
                name: "mocha",
                type: "pie",
                data: [2],
                label: { show: true, color: "brown" },
              },
              {
                name: "latte",
                type: "pie",
                data: [1],
                label: { show: true, color: "blue" },
              },
            ],
          }).plan,
        ).toEqual({ notMerge: false });

        const { applied, plan } = applyPlannedUpdate(base, update);
        const seriesByName = Object.fromEntries(
          (applied.series ?? []).map((series) => [series.name, series]),
        );

        expect(plan).toEqual({ notMerge: true });
        expect(seriesByName.latte.label?.color).toBeUndefined();
        expect(seriesByName.mocha.label?.color).toBe("brown");
      });

      it("keeps merge across duplicate and renamed component names", () => {
        const prev = buildSignature({
          series: [
            { name: "duplicate", label: { show: true } },
            { name: "duplicate", label: { show: true } },
            { name: "before", label: { show: true } },
            { id: "fixed", name: "fixed", label: { show: true } },
          ],
        });
        const next = planUpdate(prev, {
          series: [
            { id: "fixed", name: "fixed", label: { show: true } },
            { name: "duplicate", label: { show: true } },
            { name: "duplicate", label: { show: true } },
            { name: "after", label: { show: true } },
          ],
        });

        expect(next.plan).toEqual({ notMerge: false });
      });
    });

    describe("real data scenarios", () => {
      it("prioritizes rebuild when object removal accompanies series shrink", () => {
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

        expect(result.plan.notMerge).toBe(true);
        expect(result.plan.replaceMerge).toBeUndefined();
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

        expect(result.plan.notMerge).toBe(true);
        expect(result.plan.replaceMerge).toBeUndefined();
      });

      it("forces rebuild when tooltip is removed", () => {
        const base: EChartsOption = {
          tooltip: { trigger: "axis" },
          xAxis: [{ type: "category", data: ["Jan", "Feb"] }],
          series: [{ type: "line", data: [10, 20] }],
        };

        const update: EChartsOption = {
          xAxis: [{ type: "category", data: ["Jan", "Feb"] }],
          series: [{ type: "line", data: [12, 18] }],
        };

        const result = planUpdate(buildSignature(base), update);

        expect(result.plan.notMerge).toBe(true);
        expect(result.plan.replaceMerge).toBeUndefined();
      });

      it("tracks series ID removal while keeping modifications", () => {
        const base: EChartsOption = {
          series: [
            { id: "latte", type: "bar", data: [10, 20] },
            { id: "mocha", type: "bar", data: [15, 25] },
          ],
        };

        const update: EChartsOption = {
          series: [{ id: "latte", type: "line", data: [11, 22] }],
        };

        const result = planUpdate(buildSignature(base), update);

        expect(result.plan.replaceMerge).toEqual(["series"]);
        expect(result.plan.notMerge).toBe(false);
      });

      it("adds replaceMerge when ids disappear entirely", () => {
        const base: EChartsOption = {
          series: [
            { id: "espresso", type: "bar" },
            { id: "mocha", type: "line" },
          ],
        };

        const update: EChartsOption = {
          series: [{ type: "bar" }, { type: "line" }],
        };

        const result = planUpdate(buildSignature(base), update);

        expect(result.plan.replaceMerge).toEqual(["series"]);
      });

      it("ignores undefined array summaries carried over in previous signatures", () => {
        const base: EChartsOption = {
          series: [{ id: "flat-white", type: "bar" }],
        };

        const prev = buildSignature(base);
        const signatureWithPhantom = {
          ...prev,
          arrays: { ...prev.arrays, phantom: undefined },
        };

        const result = planUpdate(signatureWithPhantom, base);

        expect(result.plan.notMerge).toBe(false);
        expect(result.plan.replaceMerge).toBeUndefined();
      });

      it("handles single-object series shape without array replacement planning", () => {
        const base: EChartsOption = {
          series: {
            type: "line",
            data: [1, 2, 3],
          } as unknown as EChartsOption["series"],
        };

        const update: EChartsOption = {
          series: {
            type: "line",
            data: [2, 3, 4],
          } as unknown as EChartsOption["series"],
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
          } as unknown as EChartsOption["series"],
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
          } as unknown as EChartsOption["series"],
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
