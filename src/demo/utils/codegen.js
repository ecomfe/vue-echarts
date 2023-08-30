// Modified from https://github.com/apache/echarts-examples/blob/b644ced5325ea2522cb11606df54eae69bba3a3a/common/buildCode.js
// See license at `./LICENSE`.

const COMPONENTS_MAP = {
  grid: "GridComponent",
  polar: "PolarComponent",
  geo: "GeoComponent",
  singleAxis: "SingleAxisComponent",
  parallel: "ParallelComponent",
  calendar: "CalendarComponent",
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
  aria: "AriaComponent",
  dataset: "DatasetComponent",

  // Dependencies
  xAxis: "GridComponent",
  yAxis: "GridComponent",
  angleAxis: "PolarComponent",
  radiusAxis: "PolarComponent"
};

const CHARTS_MAP = {
  line: "LineChart",
  bar: "BarChart",
  pie: "PieChart",
  scatter: "ScatterChart",
  radar: "RadarChart",
  map: "MapChart",
  tree: "TreeChart",
  treemap: "TreemapChart",
  graph: "GraphChart",
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
  custom: "CustomChart"
};

const COMPONENTS_GL_MAP = {
  grid3D: "Grid3DComponent",
  geo3D: "Geo3DComponent",
  globe: "GlobeComponent",
  mapbox3D: "Mapbox3DComponent",
  maptalks3D: "Maptalks3DComponent",

  // Dependencies
  xAxis3D: "Grid3DComponent",
  yAxis3D: "Grid3DComponent",
  zAxis3D: "Grid3DComponent"
};

const CHARTS_GL_MAP = {
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
  linesGL: "LinesGLChart"
};

const FEATURES = ["UniversalTransition", "LabelLayout"];
const RENDERERS_MAP = {
  canvas: "CanvasRenderer",
  svg: "SVGRenderer"
};

const EXTENSIONS_MAP = {
  bmap: "bmap/bmap"
  // PENDING: There seem no examples that use dataTool
  // dataTool: 'dataTool'
};

// Component that will be injected automatically in preprocessor
// These should be excluded util find they were used explicitly.
const MARKERS = ["markLine", "markArea", "markPoint"];
const INJECTED_COMPONENTS = [
  ...MARKERS,
  "grid",
  "axisPointer",
  "aria" // TODO aria
];

// Component that was dependent.
const DEPENDENT_COMPONENTS = [
  "xAxis",
  "yAxis",
  "angleAxis",
  "radiusAxis",
  "xAxis3D",
  "yAxis3D",
  "zAxis3D"
];

function createReverseMap(map) {
  const reverseMap = {};
  Object.keys(map).forEach(key => {
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

function collectDeps(option) {
  let deps = [];
  if (option.options) {
    // TODO getOption() doesn't have baseOption and options.
    option.options.forEach(opt => {
      deps = deps.concat(collectDeps(opt));
    });

    if (option.baseOption) {
      deps = deps.concat(collectDeps(option.baseOption));
    }

    // Remove duplicates
    return Array.from(new Set(deps));
  }

  Object.keys(option).forEach(key => {
    if (INJECTED_COMPONENTS.includes(key)) {
      return;
    }
    const val = option[key];

    if (Array.isArray(val) && !val.length) {
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

  let series = option.series;
  if (!Array.isArray(series)) {
    series = [series];
  }

  series.forEach(seriesOpt => {
    if (CHARTS_MAP[seriesOpt.type]) {
      deps.push(CHARTS_MAP[seriesOpt.type]);
    }
    if (CHARTS_GL_MAP[seriesOpt.type]) {
      deps.push(CHARTS_GL_MAP[seriesOpt.type]);
    }
    if (seriesOpt.type === "map") {
      // Needs geo component when using map
      deps.push(COMPONENTS_MAP.geo);
    }
    if (seriesOpt.coordinateSystem === "bmap") {
      deps.push("bmap");
    }
    MARKERS.forEach(markerType => {
      if (seriesOpt[markerType]) {
        deps.push(COMPONENTS_MAP[markerType]);
      }
    });
    // Features
    if (seriesOpt.labelLayout) {
      deps.push("LabelLayout");
    }
    if (seriesOpt.universalTransition) {
      deps.push("UniversalTransition");
    }
  });
  // Dataset transform
  if (option.dataset && Array.isArray(option.dataset)) {
    option.dataset.forEach(dataset => {
      if (dataset.transform) {
        deps.push("TransformComponent");
      }
    });
  }

  // Remove duplicates
  return Array.from(new Set(deps));
}

function buildMinimalBundleCode(
  deps,
  {
    includeType,
    semi = false,
    quote = "'",
    multiline = false,
    indent = "  ",
    maxLen = 80
  }
) {
  const options = {
    semi,
    quote,
    multiline,
    indent,
    maxLen
  };

  const chartsImports = [];
  const componentsImports = [];
  const chartsGLImports = [];
  const componentsGLImports = [];
  const featuresImports = [];
  const renderersImports = [];
  const extensionImports = [];

  deps.forEach(dep => {
    if (dep.endsWith("Renderer")) {
      renderersImports.push(dep);
    } else if (CHARTS_MAP_REVERSE[dep]) {
      chartsImports.push(dep);
      if (includeType) {
        chartsImports.push(dep.replace(/Chart$/, "SeriesOption"));
      }
    } else if (COMPONENTS_MAP_REVERSE[dep]) {
      componentsImports.push(dep);
      if (includeType) {
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
    ...featuresImports
  ];

  const ECOptionTypeCode = typeItems(
    allImports.filter(a => a.endsWith("Option")),
    options
  );

  const importSources = [
    [chartsImports, "echarts/charts"],
    [componentsImports, "echarts/components"],
    [featuresImports, "echarts/features"],
    [renderersImports, "echarts/renderers"],
    [chartsGLImports, "echarts-gl/charts"],
    [componentsGLImports, "echarts-gl/components"]
  ].filter(a => a[0].length > 0);
  const importStatements = importSources.map(([imports, mod]) =>
    importItems(
      imports.filter(a => !a.endsWith("Option")),
      mod,
      options
    )
  );

  const semiStr = semi ? ";" : "";

  getExtensionDeps(extensionImports, includeType).forEach(ext => {
    importStatements.push(`import ${quote}${ext}${quote}${semiStr}`);
  });

  if (includeType) {
    importStatements.push(
      `import type { ComposeOption } from ${quote}echarts/core${quote}${semiStr}`
    );
    const importTypeStatements = importSources.map(([imports, mod]) =>
      importItems(
        imports.filter(a => a.endsWith("Option")),
        mod,
        { ...options, type: true }
      )
    );
    importStatements.push(...importTypeStatements);
  }

  return `import { use } from ${quote}echarts/core${quote}${semiStr}
${importStatements.join("\n")}

${useItems(
  allImports.filter(a => !a.endsWith("Option")),
  options
)}
${includeType ? `\n${ECOptionTypeCode}` : ""}
`;
}
function getExtensionDeps(deps, ts) {
  return deps
    .filter(dep => EXTENSIONS_MAP[dep])
    .map(dep => `echarts/extension${ts ? "-src" : ""}/${EXTENSIONS_MAP[dep]}`);
}

/** import */
function importItems(items, module, options) {
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
function importSingleLine(items, module, { type, semi, quote }) {
  const typeStr = type ? "type " : "";
  const semiStr = semi ? ";" : "";

  return `import ${typeStr}{ ${items.join(
    ", "
  )} } from ${quote}${module}${quote}${semiStr}`;
}

// import {
//   foo,
//   bar
// } from 'module'
function importMultiLine(items, module, { type, indent, semi, quote }) {
  const typeStr = type ? "type " : "";
  const semiStr = semi ? ";" : "";

  return `import ${typeStr}{
${items.map(item => `${indent}${item}`).join(",\n")}
} from ${quote}${module}${quote}${semiStr}`;
}

/** use */
function useItems(items, options) {
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
function useSingleLine(items, { semi }) {
  const semiStr = semi ? ";" : "";

  return `use([${items.join(`, `)}])${semiStr}`;
}

// use([
//   foo,
//   bar
// ])
function useMultiLine(items, { indent, semi }) {
  const semiStr = semi ? ";" : "";

  return `use([
${items.map(item => `${indent}${item}`).join(`,\n`)}
])${semiStr}`;
}

/** type */
function typeItems(items, options) {
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
function typeSingleLine(items, { semi }) {
  const semiStr = semi ? ";" : "";

  return `type EChartsOption = ComposeOption<${items.join(` | `)}>${semiStr}`;
}

// type EChartsOption = ComposeOption<
//   | FooOption
//   | BarOption
// >
function typeMultiLine(items, { indent, semi }) {
  const semiStr = semi ? ";" : "";

  return `type EChartsOption = ComposeOption<
${items.map(item => `${indent}| ${item}`).join("\n")}
>${semiStr}`;
}

export function getImportsFromOption(
  option,
  { renderer = "canvas", ...options }
) {
  return buildMinimalBundleCode(
    [...collectDeps(option), RENDERERS_MAP[renderer]],
    options
  );
}
