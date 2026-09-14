import { createApp, defineComponent, h, nextTick, ref, version as vueVersion } from "vue";
import { getInstanceByDom, use, version as echartsVersion } from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import ECharts from "../src/ECharts";
import { GRect } from "../src/graphic";

use([LineChart, GridComponent, CanvasRenderer]);

const UPDATES = 20;
const ROUNDS = 5;

function median(values: number[]): number {
  return Number([...values].sort((a, b) => a - b)[Math.floor(values.length / 2)].toFixed(2));
}

async function measure(count: number) {
  const offsets = Array.from({ length: count }, () => ref(0));
  const Marker = defineComponent({
    props: { index: { type: Number, required: true } },
    setup: (props) => () =>
      h(GRect, {
        id: `rect-${props.index}`,
        name: `rect-${props.index}`,
        x: (props.index % 20) * 10 + offsets[props.index].value,
        y: Math.floor(props.index / 20) * 10,
        width: 8,
        height: 8,
        fill: "#5470c6",
      }),
  });
  const option = {
    animation: false,
    xAxis: { type: "category" },
    yAxis: {},
    series: [{ type: "line", data: Array.from({ length: 2000 }, (_, index) => index % 100) }],
  };
  const host = document.body.appendChild(document.createElement("div"));
  const app = createApp({
    render: () =>
      h(
        ECharts,
        { option, style: "width: 800px; height: 600px" },
        {
          graphic: () => offsets.map((_, index) => h(Marker, { key: index, index })),
        },
      ),
  });
  const originalWalker = document.createTreeWalker;
  let scans = 0;
  let calls = 0;
  let nativeMs = 0;
  let elements = 0;
  let bytes = 0;
  const samples = [];
  try {
    app.mount(host);
    await nextTick();
    const chart = getInstanceByDom(host.querySelector<HTMLElement>(".echarts-host")!)!;
    const sibling = () =>
      chart
        .getZr()
        .storage.getDisplayList()
        .find((el) => el.name === "rect-1");
    const originalSibling = sibling();
    if (!originalSibling) throw new Error("Expected an unchanged graphic sibling.");
    chart.setOption = new Proxy(chart.setOption, {
      apply(target, receiver, args) {
        calls++;
        elements += args[0].graphic?.elements?.length ?? 0;
        bytes += new TextEncoder().encode(JSON.stringify(args[0])).length;
        const start = performance.now();
        const result = Reflect.apply(target, receiver, args);
        nativeMs += performance.now() - start;
        return result;
      },
    });
    document.createTreeWalker = new Proxy(originalWalker, {
      apply(target, receiver, args) {
        scans++;
        return Reflect.apply(target, receiver, args);
      },
    });
    for (let index = 0; index < 5; index++) {
      offsets[0].value++;
      await nextTick();
    }
    for (let round = 0; round < ROUNDS; round++) {
      scans = calls = nativeMs = elements = bytes = 0;
      const start = performance.now();
      for (let index = 0; index < UPDATES; index++) {
        offsets[0].value++;
        await nextTick();
      }
      samples.push({ totalMs: performance.now() - start, nativeMs, scans, elements, bytes });
      if (sibling() !== originalSibling)
        throw new Error("An unchanged graphic sibling was replaced.");
      if (calls !== UPDATES || elements !== UPDATES)
        throw new Error("Expected one sparse submission per update.");
    }
    return {
      nodes: count,
      updatesPerRound: UPDATES,
      rounds: ROUNDS,
      totalMs: median(samples.map((sample) => sample.totalMs)),
      nativeMs: median(samples.map((sample) => sample.nativeMs)),
      scansPerUpdate: median(samples.map((sample) => sample.scans / UPDATES)),
      elementsPerUpdate: median(samples.map((sample) => sample.elements / UPDATES)),
      bytesPerUpdate: median(samples.map((sample) => sample.bytes / UPDATES)),
    };
  } finally {
    document.createTreeWalker = originalWalker;
    app.unmount();
    host.remove();
  }
}

export async function run() {
  const results = [];
  for (const count of [100, 500, 2000]) results.push(await measure(count));
  return { vue: vueVersion, echarts: echartsVersion, results };
}
