// import whole ECharts package when prebuilding the bundled version
import echartslib from 'echarts'
import china from 'echarts/map/json/china.json';
import ECharts from './components/ECharts.vue'

echartslib.registerMap('china', china);
export default ECharts
