// Modified from https://github.com/apache/echarts-examples/blob/b644ced5325ea2522cb11606df54eae69bba3a3a/common/buildCode.js
// See license at `./LICENSE`.

type PlainObject = Record<string, unknown>;

export type Quote = "'" | '"';

interface FormatterOptions {
  includeType?: boolean;
  semi?: boolean;
  quote?: Quote;
  multiline?: boolean;
  indent?: string;
  maxLen?: number;
  type?: boolean;
}

type FormatterOptionsWithDefaults = Required<Omit<FormatterOptions, "type" | "includeType">> &
  Pick<FormatterOptions, "type" | "includeType">;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null;
}

const COMPONENTS_MAP: Record<string, string> = {
  grid: "GridComponent",
  polar: "PolarComponent",
  geo: "GeoComponent",
  singleAxis: "SingleAxisComponent",
  parallel: "ParallelComponent",
  calendar: "CalendarComponent",
  matrix: "MatrixComponent",
  graphic: "GraphicComponent",
  toolbox: "ToolboxComponent",
  tooltip: "TooltipComponent",
  axisPointer: "AxisPointerComponent",
  brush: "BrushComponent",
  title: "TitleComponent",
  timeline: "TimelineComponent",
  markPoint: "MarkPointComponent",
  markLine: "MarkLineComponent",
  markArea: "MarkAreaComponent",
  legend: "LegendComponent",
  dataZoom: "DataZoomComponent",
  visualMap: "VisualMapComponent",
  thumbnail: "ThumbnailComponent",
  aria: "AriaComponent",
  dataset: "DatasetComponent",

  // Dependencies
  xAxis: "GridComponent",
  yAxis: "GridComponent",
  angleAxis: "PolarComponent",
  radiusAxis: "PolarComponent",
};

const CHARTS_MAP: Record<string, string> = {
  line: "LineChart",
  bar: "BarChart",
  pie: "PieChart",
  scatter: "ScatterChart",
  radar: "RadarChart",
  map: "MapChart",
  tree: "TreeChart",
  treemap: "TreemapChart",
  graph: "GraphChart",
  chord: "ChordChart",
  gauge: "GaugeChart",
  funnel: "FunnelChart",
  parallel: "ParallelChart",
  sankey: "SankeyChart",
  boxplot: "BoxplotChart",
  candlestick: "CandlestickChart",
  effectScatter: "EffectScatterChart",
  lines: "LinesChart",
  heatmap: "HeatmapChart",
  pictorialBar: "PictorialBarChart",
  themeRiver: "ThemeRiverChart",
  sunburst: "SunburstChart",
  custom: "CustomChart",
};

const COMPONENTS_GL_MAP: Record<string, string> = {
  grid3D: "Grid3DComponent",
  geo3D: "Geo3DComponent",
  globe: "GlobeComponent",
  mapbox3D: "Mapbox3DComponent",
  maptalks3D: "Maptalks3DComponent",

  // Dependencies
  xAxis3D: "Grid3DComponent",
  yAxis3D: "Grid3DComponent",
  zAxis3D: "Grid3DComponent",
};

const CHARTS_GL_MAP: Record<string, string> = {
  bar3D: "Bar3DChart",
  line3D: "Line3DChart",
  scatter3D: "Scatter3DChart",
  lines3D: "Lines3DChart",
  polygons3D: "Polygons3DChart",
  surface: "SurfaceChart",
  map3D: "Map3DChart",

  scatterGL: "ScatterGLChart",
  graphGL: "GraphGLChart",
  flowGL: "FlowGLChart",
  linesGL: "LinesGLChart",
};

const FEATURES: string[] = [
  "UniversalTransition",
  "LabelLayout",
  "AxisBreak",
  // "LegacyGridContainLabel",
  "ScatterJitter",
];
const RENDERERS_MAP: Record<string, string> = {
  canvas: "CanvasRenderer",
  svg: "SVGRenderer",
};

const EXTENSIONS_MAP: Record<string, string> = {
  bmap: "bmap/bmap",
  // PENDING: There seem no examples that use dataTool
  // dataTool: 'dataTool'
};

// Component that will be injected automatically in preprocessor
// These should be excluded util find they were used explicitly.
const MARKERS: string[] = ["markLine", "markArea", "markPoint"];
const INJECTED_COMPONENTS: string[] = [
  ...MARKERS,
  "grid",
  "axisPointer",
  "aria", // TODO aria
];

// Component that was dependent.
const DEPENDENT_COMPONENTS: string[] = [
  "xAxis",
  "yAxis",
  "angleAxis",
  "radiusAxis",
  "xAxis3D",
  "yAxis3D",
  "zAxis3D",
];

function createReverseMap(map: Record<string, string>): Record<string, string> {
  const reverseMap: Record<string, string> = {};
  Object.keys(map).forEach((key) => {
    // Exclude dependencies.
    if (DEPENDENT_COMPONENTS.includes(key)) {
      return;
    }
    reverseMap[map[key]] = key;
  });

  return reverseMap;
}

const COMPONENTS_MAP_REVERSE = createReverseMap(COMPONENTS_MAP);
const CHARTS_MAP_REVERSE = createReverseMap(CHARTS_MAP);
const COMPONENTS_GL_MAP_REVERSE = createReverseMap(COMPONENTS_GL_MAP);
const CHARTS_GL_MAP_REVERSE = createReverseMap(CHARTS_GL_MAP);

type DependencyList = string[];

type OptionLike = PlainObject & {
  options?: unknown;
  baseOption?: unknown;
  series?: unknown;
  dataset?: unknown;
};

type SeriesOptionLike = PlainObject & {
  type?: unknown;
  coordinateSystem?: unknown;
  labelLayout?: unknown;
  universalTransition?: unknown;
};

function isOptionLike(value: unknown): value is OptionLike {
  return isPlainObject(value);
}

function isSeriesOptionLike(value: unknown): value is SeriesOptionLike {
  return isPlainObject(value);
}

function toOptionLike(value: unknown): OptionLike | null {
  return isOptionLike(value) ? value : null;
}

function toSeriesList(value: unknown): SeriesOptionLike[] {
  const list: SeriesOptionLike[] = [];
  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (isSeriesOptionLike(item)) {
        list.push(item);
      }
    });
  } else if (isSeriesOptionLike(value)) {
    list.push(value);
  }
  return list;
}

function collectDeps(option: unknown): DependencyList {
  const deps: DependencyList = [];
  const optionObject = toOptionLike(option);
  if (!optionObject) {
    return deps;
  }

  const nestedOptions = optionObject.options;
  if (Array.isArray(nestedOptions)) {
    // TODO getOption() doesn't have baseOption and options.
    nestedOptions.forEach((opt) => {
      deps.push(...collectDeps(opt));
    });
  }

  if (optionObject.baseOption) {
    deps.push(...collectDeps(optionObject.baseOption));
  }

  if (deps.length === 0) {
    Object.keys(optionObject).forEach((key) => {
      if (INJECTED_COMPONENTS.includes(key)) {
        return;
      }
      const value = optionObject[key];

      if (Array.isArray(value) && value.length === 0) {
        return;
      }

      if (COMPONENTS_MAP[key]) {
        deps.push(COMPONENTS_MAP[key]);
      }
      if (COMPONENTS_GL_MAP[key]) {
        deps.push(COMPONENTS_GL_MAP[key]);
      }
      if (EXTENSIONS_MAP[key]) {
        deps.push(key);
      }
    });

    const seriesList = toSeriesList(optionObject.series);
    let hasScatterSeries = false;
    seriesList.forEach((seriesOpt) => {
      const type = typeof seriesOpt.type === "string" ? seriesOpt.type : "";
      if (type === "scatter") {
        hasScatterSeries = true;
      }
      if (CHARTS_MAP[type]) {
        deps.push(CHARTS_MAP[type]);
      }
      if (CHARTS_GL_MAP[type]) {
        deps.push(CHARTS_GL_MAP[type]);
      }
      if (type === "map") {
        deps.push(COMPONENTS_MAP.geo);
      }
      if (seriesOpt.coordinateSystem === "bmap") {
        deps.push("bmap");
      }
      MARKERS.forEach((markerType) => {
        if (isPlainObject(seriesOpt[markerType])) {
          deps.push(COMPONENTS_MAP[markerType]);
        }
      });
      if (seriesOpt.labelLayout) {
        deps.push("LabelLayout");
      }
      if (seriesOpt.universalTransition) {
        deps.push("UniversalTransition");
      }
    });

    Object.keys(optionObject).forEach((key) => {
      if (!key.endsWith("Axis")) {
        return;
      }
      const value = optionObject[key];
      const axes = Array.isArray(value) ? value : [value];
      axes.forEach((axisOption) => {
        if (!isPlainObject(axisOption)) {
          return;
        }
        if (hasScatterSeries && Number(axisOption.jitter) > 0) {
          deps.push("ScatterJitter");
        }
        const breaks = axisOption.breaks;
        if (Array.isArray(breaks) && breaks.length > 0) {
          deps.push("AxisBreak");
        }
      });
    });

    const dataset = optionObject.dataset;
    if (Array.isArray(dataset)) {
      dataset.forEach((item) => {
        if (isPlainObject(item) && item.transform) {
          deps.push("TransformComponent");
        }
      });
    }
  }

  return Array.from(new Set(deps));
}

function withDefaults(options: FormatterOptions): FormatterOptionsWithDefaults {
  return {
    semi: options.semi ?? false,
    quote: options.quote ?? "'",
    multiline: options.multiline ?? false,
    indent: options.indent ?? "  ",
    maxLen: options.maxLen ?? 80,
    includeType: options.includeType,
    type: options.type,
  };
}

function buildMinimalBundleCode(deps: string[], optionsInput: FormatterOptions): string {
  const options = withDefaults(optionsInput);

  const chartsImports: string[] = [];
  const componentsImports: string[] = [];
  const chartsGLImports: string[] = [];
  const componentsGLImports: string[] = [];
  const featuresImports: string[] = [];
  const renderersImports: string[] = [];
  const extensionImports: string[] = [];

  deps.forEach((dep) => {
    if (dep.endsWith("Renderer")) {
      renderersImports.push(dep);
    } else if (CHARTS_MAP_REVERSE[dep]) {
      chartsImports.push(dep);
      if (options.includeType) {
        chartsImports.push(dep.replace(/Chart$/, "SeriesOption"));
      }
    } else if (COMPONENTS_MAP_REVERSE[dep]) {
      componentsImports.push(dep);
      if (options.includeType) {
        componentsImports.push(dep.replace(/Component$/, "ComponentOption"));
      }
    } else if (dep === "TransformComponent") {
      // TransformComponent don't have individual option type.
      // TODO will put in to an config if there are other similar components
      componentsImports.push(dep);
    } else if (CHARTS_GL_MAP_REVERSE[dep]) {
      chartsGLImports.push(dep);
    } else if (COMPONENTS_GL_MAP_REVERSE[dep]) {
      componentsGLImports.push(dep);
    } else if (FEATURES.includes(dep)) {
      featuresImports.push(dep);
    } else if (EXTENSIONS_MAP[dep]) {
      extensionImports.push(dep);
    }
  });

  const allImports = [
    ...componentsImports,
    ...chartsImports,
    ...componentsGLImports,
    ...chartsGLImports,
    ...renderersImports,
    ...featuresImports,
  ];

  const ECOptionTypeCode = typeItems(
    allImports.filter((a) => a.endsWith("Option")),
    options,
  );

  const importSources: Array<[string[], string]> = [];
  if (chartsImports.length) {
    importSources.push([chartsImports, "echarts/charts"]);
  }
  if (componentsImports.length) {
    importSources.push([componentsImports, "echarts/components"]);
  }
  if (featuresImports.length) {
    importSources.push([featuresImports, "echarts/features"]);
  }
  if (renderersImports.length) {
    importSources.push([renderersImports, "echarts/renderers"]);
  }
  if (chartsGLImports.length) {
    importSources.push([chartsGLImports, "echarts-gl/charts"]);
  }
  if (componentsGLImports.length) {
    importSources.push([componentsGLImports, "echarts-gl/components"]);
  }
  const importStatements = importSources.map(([imports, mod]) =>
    importItems(
      imports.filter((a) => !a.endsWith("Option")),
      mod,
      options,
    ),
  );

  const semiStr = options.semi ? ";" : "";

  getExtensionDeps(extensionImports, options.includeType).forEach((ext) => {
    importStatements.push(`import ${options.quote}${ext}${options.quote}${semiStr}`);
  });

  if (options.includeType) {
    importStatements.push(
      `import type { ComposeOption } from ${options.quote}echarts/core${options.quote}${semiStr}`,
    );
    const importTypeStatements = importSources
      .map(([imports, mod]) => {
        const typeImports = imports.filter((item) => item.endsWith("Option"));
        return typeImports.length > 0
          ? importItems(typeImports, mod, { ...options, type: true })
          : "";
      })
      .filter((statement): statement is string => statement.length > 0);
    importStatements.push(...importTypeStatements);
  }

  return `import { use } from ${options.quote}echarts/core${options.quote}${semiStr}
${importStatements.join("\n")}

${useItems(
  allImports.filter((a) => !a.endsWith("Option")),
  options,
)}
${options.includeType ? `\n${ECOptionTypeCode}` : ""}
`;
}
function getExtensionDeps(deps: string[], includeTypes?: boolean): string[] {
  return deps
    .filter((dep) => EXTENSIONS_MAP[dep])
    .map((dep) => `echarts/extension${includeTypes ? "-src" : ""}/${EXTENSIONS_MAP[dep]}`);
}

/** import */
function importItems(
  items: string[],
  module: string,
  options: FormatterOptionsWithDefaults,
): string {
  if (items.length === 0) {
    return "";
  }

  const { multiline, maxLen } = options;

  if (multiline) {
    return importMultiLine(items, module, options);
  }

  const singleLine = importSingleLine(items, module, options);
  if (singleLine.length <= maxLen) {
    return singleLine;
  }

  return importMultiLine(items, module, options);
}

// import { foo, bar } from 'module'
function importSingleLine(
  items: string[],
  module: string,
  { type, semi, quote }: FormatterOptionsWithDefaults,
): string {
  const typeStr = type ? "type " : "";
  const semiStr = semi ? ";" : "";

  return `import ${typeStr}{ ${items.join(", ")} } from ${quote}${module}${quote}${semiStr}`;
}

// import {
//   foo,
//   bar
// } from 'module'
function importMultiLine(
  items: string[],
  module: string,
  { type, indent, semi, quote }: FormatterOptionsWithDefaults,
): string {
  const typeStr = type ? "type " : "";
  const semiStr = semi ? ";" : "";

  return `import ${typeStr}{
${items.map((item) => `${indent}${item}`).join(",\n")}
} from ${quote}${module}${quote}${semiStr}`;
}

/** use */
function useItems(items: string[], options: FormatterOptionsWithDefaults): string {
  if (items.length === 0) {
    return "";
  }

  const { multiline, maxLen } = options;

  if (multiline) {
    return useMultiLine(items, options);
  }

  const singleLine = useSingleLine(items, options);
  if (singleLine.length <= maxLen) {
    return singleLine;
  }

  return useMultiLine(items, options);
}

// use([foo, bar])
function useSingleLine(items: string[], { semi }: FormatterOptionsWithDefaults): string {
  const semiStr = semi ? ";" : "";

  return `use([${items.join(`, `)}])${semiStr}`;
}

// use([
//   foo,
//   bar
// ])
function useMultiLine(items: string[], { indent, semi }: FormatterOptionsWithDefaults): string {
  const semiStr = semi ? ";" : "";

  return `use([
${items.map((item) => `${indent}${item}`).join(`,\n`)}
])${semiStr}`;
}

/** type */
function typeItems(items: string[], options: FormatterOptionsWithDefaults): string {
  const { multiline, maxLen } = options;

  if (items.length === 0) {
    return "";
  }

  if (multiline) {
    return typeMultiLine(items, options);
  }

  const singleLine = typeSingleLine(items, options);
  if (singleLine.length <= maxLen) {
    return singleLine;
  }

  return typeMultiLine(items, options);
}

// type EChartsOption = ComposeOption<FooOption | BarOption>
function typeSingleLine(items: string[], { semi }: FormatterOptionsWithDefaults): string {
  const semiStr = semi ? ";" : "";

  return `type EChartsOption = ComposeOption<${items.join(` | `)}>${semiStr}`;
}

// type EChartsOption = ComposeOption<
//   | FooOption
//   | BarOption
// >
function typeMultiLine(items: string[], { indent, semi }: FormatterOptionsWithDefaults): string {
  const semiStr = semi ? ";" : "";

  return `type EChartsOption = ComposeOption<
${items.map((item) => `${indent}| ${item}`).join("\n")}
>${semiStr}`;
}

export interface PublicCodegenOptions extends FormatterOptions {
  renderer?: keyof typeof RENDERERS_MAP;
}

export function getImportsFromOption(
  option: unknown,
  { renderer = "canvas", ...options }: PublicCodegenOptions = {},
): string {
  return buildMinimalBundleCode([...collectDeps(option), RENDERERS_MAP[renderer]], options);
}
