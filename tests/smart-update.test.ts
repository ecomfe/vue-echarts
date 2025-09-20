import { describe, it, expect } from "vitest";
import { buildSignature, planUpdate } from "../src/smart-update";
import type { EChartsOption } from "echarts";

describe("smart-update", () => {
  describe("buildSignature", () => {
    it("collects scalars, objects, and array summaries", () => {
      const option: EChartsOption = {
        title: { text: "foo" },
        tooltip: { show: true },
        color: "#000",
        dataset: [{ id: "ds1", source: [] }, { source: [] }],
        series: [
          { id: "a", type: "bar" },
          { type: "line" },
        ],
      };

      const signature = buildSignature(option);

      expect(signature.objects).toEqual(["title", "tooltip"]);
      expect(signature.scalars).toEqual(["color"]);
      expect(signature.arrays.dataset?.idsSorted).toEqual(["ds1"]);
      expect(signature.arrays.dataset?.noIdCount).toBe(1);
      expect(signature.arrays.series?.idsSorted).toEqual(["a"]);
      expect(signature.arrays.series?.noIdCount).toBe(1);
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
        expect(result.option).toEqual(option);
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
        expect(next.option).toEqual(option);
      });

      it("keeps merge when scalar value changes", () => {
        const prev = buildSignature({ color: "red" });
        const next = planUpdate(prev, { color: "blue" });

        expect(next.plan.notMerge).toBe(false);
        expect(next.plan.replaceMerge).toBeUndefined();
        expect(next.option.color).toBe("blue");
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
        expect(result.option.series).toEqual(update.series);
      });
    });

    describe("shrink detection", () => {
      it("forces rebuild when options shrink", () => {
        const prev = buildSignature({ options: [{}, {}] });
        const { plan } = planUpdate(prev, { options: [{}] });
        expect(plan.notMerge).toBe(true);
      });

      it("forces rebuild when scalars disappear", () => {
        const prev = buildSignature({ color: "red", title: { text: "foo" } });
        const { plan } = planUpdate(prev, { title: { text: "foo" } });
        expect(plan.notMerge).toBe(true);
      });

      it("injects null for removed objects", () => {
        const prev = buildSignature({ legend: { show: true } });
        const next = planUpdate(prev, {});

        expect(next.option.legend).toBeNull();
        expect(next.plan.notMerge).toBe(false);
      });

      it("injects empty array and replaceMerge when array removed", () => {
        const prev = buildSignature({ series: [{ id: "a" }, {}] });
        const next = planUpdate(prev, {});

        expect(next.option.series).toEqual([]);
        expect(next.plan.replaceMerge).toEqual(["series"]);
      });

      it("adds replaceMerge when ids shrink", () => {
        const prev = buildSignature({ series: [{ id: "a" }, { id: "b" }] });
        const next = planUpdate(prev, { series: [{ id: "a" }] });

        expect(next.plan.replaceMerge).toEqual(["series"]);
      });

      it("adds replaceMerge when anonymous count shrinks", () => {
        const prev = buildSignature({ series: [{}, {}] });
        const next = planUpdate(prev, { series: [{}] });

        expect(next.plan.replaceMerge).toEqual(["series"]);
      });
    });

    describe("real data scenarios", () => {
      it("handles legend removal and series shrink", () => {
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

        expect(result.option.legend).toBeNull();
        expect(result.option.series).toEqual(update.series);
        expect(result.plan.notMerge).toBe(false);
        expect(result.plan.replaceMerge).toEqual(["series"]);
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

        expect(result.option.dataset).toEqual([]);
        expect(result.plan.notMerge).toBe(false);
        expect(result.plan.replaceMerge).toContain("dataset");
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

        expect(result.option.legend).toBeNull();
        expect(result.option.dataset).toEqual([]);
        expect(result.plan.notMerge).toBe(false);
        expect(result.plan.replaceMerge).toEqual(["dataset", "series"]);
      });

      it("injects null for tooltip removal while keeping explicit arrays", () => {
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

        expect(result.option.tooltip).toBeNull();
        expect(result.option.xAxis).toEqual(update.xAxis);
        expect(result.plan.notMerge).toBe(false);
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

        expect(result.option.dataset).toEqual([]);
        expect(result.option.series).toEqual(update.series);
        expect(result.plan.replaceMerge).toEqual(["dataset"]);
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

        expect(result.option.series).toEqual(update.series);
        expect(result.plan.replaceMerge).toEqual(["series"]);
      });
    });
  });
});
