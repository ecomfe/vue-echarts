// Store Echart instance

class ChartStorage {
  constructor () {
    this.instances = {}
  }
}

export default (new ChartStorage()).instances
