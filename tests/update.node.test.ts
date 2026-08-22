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
};

describe("smart-update", () => {
  describe("buildSignature", () => {
    it("collects scalars, objects, and array summaries", () => {
      const option: EChartsOption = {
        title: { text: "foo" },
        tooltip: { show: true },
        color: "#000",
        dataset: [{ id: "ds1", source: [] }, { source: [] }],
        series: [{ id: "a", type: "bar" }, { type: "line" }],
      };

      const signature = buildSignature(option);

      expect(signature.objects).toEqual(["title", "tooltip"]);
      expect(signature.scalars).toEqual(["color"]);
      expect(signature.arrays.dataset).toEqual({ idsSorted: ["ds1"], noIdCount: 1 });
      expect(signature.arrays.series).toEqual({ idsSorted: ["a"], noIdCount: 1 });
      expect(signature.objects).not.toContain("color");
      expect(signature.scalars).not.toContain("title");
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
      expect(signature.arrays.series).toEqual({ idsSorted: ["1", "2"], noIdCount: 3 });
    });

    it("counts primitive array items and sorts scalar keys", () => {
      const option: EChartsOption = {
        dataset: ["raw", { id: "has-id" }],
        backgroundColor: "#000",
        color: "#fff",
      } as unknown as EChartsOption;

      const signature = buildSignature(option);

      expect(signature.arrays.dataset).toEqual({ idsSorted: ["has-id"], noIdCount: 1 });
      expect(signature.scalars).toEqual(["backgroundColor", "color"]);
    });

    it("ignores explicit undefined values in scalars", () => {
      const option: EChartsOption = {
        backgroundColor: undefined,
        color: "#fff",
      } as unknown as EChartsOption;

      const signature = buildSignature(option);

      expect(signature.scalars).toEqual(["color"]);
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

      it("keeps merge when scalar value changes", () => {
        const prev = buildSignature({ color: "red" });
        const next = planUpdate(prev, { color: "blue" });

        expect(next.plan.notMerge).toBe(false);
        expect(next.plan.replaceMerge).toBeUndefined();
      });

      it("keeps merge when an object setting becomes scalar", () => {
        const prev = buildSignature({
          backgroundColor: linearGradient,
        });
        const next = planUpdate(prev, { backgroundColor: "transparent" });

        expect(next.plan.notMerge).toBe(false);
        expect(next.plan.replaceMerge).toBeUndefined();
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

      it("keeps merge when dataset items reorder without shrink", () => {
        const prev = buildSignature({ dataset: [{ id: "a" }, { id: "b" }] });
        const update: EChartsOption = {
          dataset: [{ id: "b" }, { id: "a" }],
        };

        const result = planUpdate(prev, update);

        expect(result.plan.notMerge).toBe(false);
        expect(result.plan.replaceMerge).toBeUndefined();
      });
    });

    describe("shrink detection", () => {
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

      it("forces rebuild when scalars disappear", () => {
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

      it("removes planned object and array options from the ECharts model", () => {
        const title: EChartsOption = { title: { text: "before" } };
        const series: EChartsOption = { series: [{ type: "pie", data: [1] }] };
        const empty: EChartsOption = {};
        const chart = init(null, undefined, {
          renderer: "svg",
          ssr: true,
          width: 100,
          height: 100,
        });

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

      it("adds replaceMerge when anonymous count shrinks", () => {
        const prev = buildSignature({ series: [{}, {}] });
        const next = planUpdate(prev, { series: [{}] });

        expect(next.plan.replaceMerge).toEqual(["series"]);
        expect(next.plan.notMerge).toBe(false);
      });

      it("rebuilds for destructive global array changes", () => {
        const base: EChartsOption = { color: ["red", "blue"] };
        const update: EChartsOption = { color: ["red"] };
        const result = planUpdate(buildSignature(base), update);
        const chart = init(null, undefined, {
          renderer: "svg",
          ssr: true,
          width: 100,
          height: 100,
        });

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
                ["product", "2015"],
                ["Latte", 30],
              ],
            },
          ],
          series: [{ id: "sales-series", type: "bar", datasetId: "sales" }],
        };

        const update: EChartsOption = {
          series: [{ id: "sales-series", type: "bar", data: [35] }],
        };

        const result = planUpdate(buildSignature(base), update);

        expect(result.plan.notMerge).toBe(false);
        expect(result.plan.replaceMerge).toContain("dataset");
        expect(result.plan.replaceMerge).not.toContain("series");
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

      it("handles dataset to series data migration", () => {
        const base: EChartsOption = {
          dataset: [
            {
              id: "sales",
              source: [
                ["Latte", 30],
                ["Mocha", 40],
              ],
            },
          ],
          series: [{ id: "sales", type: "bar", datasetId: "sales" }],
        };

        const update: EChartsOption = {
          series: [{ id: "sales", type: "bar", data: [35, 44] }],
        };

        const result = planUpdate(buildSignature(base), update);

        expect(result.plan.replaceMerge).toEqual(["dataset"]);
        expect(result.plan.notMerge).toBe(false);
        expect(result.plan.replaceMerge).not.toContain("series");
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

      it("prioritizes notMerge when scalar removal happens with array shrink", () => {
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
