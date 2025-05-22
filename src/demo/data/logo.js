import logo from "../assets/Vue-ECharts.svg?raw";

const d = logo.match(/\bd="([^"]+)"/)[1];

export default {
  series: [
    {
      type: "liquidFill",
      data: [0.7, 0.6, 0.55, 0.45],
      amplitude: 6,
      outline: {
        show: false
      },
      radius: "60%",
      color: ["#4fc08d", "#44d64a", "#33c762", "#4acc80"],
      backgroundStyle: {
        color: "#fff",
        borderColor: "#2c3e50",
        borderWidth: 1
      },
      shape: `path://${d}`,
      label: {
        normal: {
          formatter() {
            return "";
          }
        }
      },
      itemStyle: {
        shadowBlur: 12,
        shadowColor: "rgba(0, 0, 0, 0.25)"
      }
    }
  ]
};
