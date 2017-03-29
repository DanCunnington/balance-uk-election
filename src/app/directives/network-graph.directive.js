/* global d3, $ */

export default class NetworkGraph {
  constructor() {
    this.template = require('./network-graph.html')
    this.restrict = 'E'
    this.scope = {}

    this.controller = NetworkGraphController
    this.controllerAs = 'ctrl'
    this.bindToController = true
  }
}

class NetworkGraphController {
  constructor ($http, $interval) {
    this.$http = $http

    // Websocket Object
    // srcnem: '6'
    // src: 'UKHQ'
    // dstnem: '4'
    // dst: 'PJHQ'
    // bearer: 'C'
    // dataitem: 'xfer'
    // value: object
    //   tx: 0
    //   rx: 0

    // let ex = {'srcnem': '11', 'src': 'UKHQ', 'dstnem': '9', 'dst': 'CCN', 'bearer': 'D','dataitem': 'xfer', 'value': {'tx': 0,'rx': 98}}

    let json = {
      nodes: [],
      links: []
    }
    let graph

    this.dataDirection = 'rx'
    this.showTx = true
    this.showRx = true

    $http.get('clients').then((response) => {
      let clients = response.data
      console.log(clients)
      constructGraph(clients)
      setup()
      setupWebSocket()
      listenOnWebSocket()
      buildLegend()
      restart()
      createLineChart()
    })

    // ============ Set up SVG ============

    let width = $(window).width()
    let height = $(window).height()

    let svg = d3.select('svg')
        .style('width', width)
        .style('height', height)

    let lineGraph = svg.append('g')

    let selectColour = '#ceb02b'
    let color = d3.scaleOrdinal(d3.schemeDark2)
    let pathgen = d3.line().curve(d3.curveBasis)

    let bearerNames = {
      A: 'Falcon',
      B: 'Satcom',
      C: '3G',
      D: 'BOO',
      RED: 'Red traffic'
    }

    let bearerColours = {
      A: '#00a1ff',  // Falcon
      B: '#ffffff',  // Satcom
      C: '#ff8d00',  // 3G
      D: '#33ad00',  // BOO
      RED: '#ff0000' // Red traffic
    }

    let simulation, helperSim

    let nodes, helperLinks, helperNodes, nodeById
    let hlink, hnode, link, node
    let newLinks, bilinks, intermediateLinks

    let websocket

    let maxRateSeen = 1
    let maxRateSet = Date.now()
    let dataSeen = []

    let setMaxSeen = () => {
      this.maxSeen = maxRateSeen
    }

    setMaxSeen()

    function setup() {
      // ============ Simulations ============

      simulation = d3.forceSimulation()
        .force('link', d3.forceLink().distance(40)) //.strength(0.5))
        .force('charge', d3.forceManyBody().strength(500))
        .force('collide', d3.forceCollide().radius(25))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .on('tick', ticked)

      helperSim = d3.forceSimulation()
        .force('link', d3.forceLink().distance(40)) //.strength(0.5))
        .force('charge', d3.forceManyBody().strength(-500))
        .force('center', d3.forceCenter(width / 2, height / 2))

      helperSim.stop()

      // ============ Nodes and Links ============

      nodes = graph.nodes.slice()
      helperLinks = graph.links.slice()
      helperNodes = graph.nodes.slice()
      nodeById = d3.map(nodes, function(d) { return d.name })

      hlink = svg.append('g').selectAll('.link')
      hnode = svg.append('g').selectAll('.node')

      link = svg.append('g').selectAll('.link')
      node = svg.append('g').selectAll('.node')

      // ============ Bezier Curves ============

      newLinks = []
      bilinks = []
      intermediateLinks = []

      createBezierCurves(helperLinks, bilinks, intermediateLinks)
    }

    function constructGraph(clients) {
      // ============ Construct graph ============

      let bearers = {}

      for (let client of Object.keys(clients)) {
        json.nodes.push({
          name: client,
          client: clients[client]
        })

        for (let port of Object.values(clients[client].client_hardware.static)) {
          if (port.nem) {
            port.name = port.client

            if (!bearers[port.bearer]) {
              bearers[port.bearer] = []
            }

            bearers[port.bearer].push(port)
          }
        }
      }

      for (let bearer of Object.keys(bearers)) {
        let nems = bearers[bearer]

        for (let i = 0; i < nems.length; ++i) {
          for (let j = i + 1; j < nems.length; ++j) {
            json.links.push({
              source: nems[i].name,
              target: nems[j].name,
              bearer: bearer,
              active: true,
              datarate: parseInt(nems[i].datarate, 10),
              max_datarate: parseInt(nems[i].max_datarate, 10)
            })

            json.links.push({
              source: nems[j].name,
              target: nems[i].name,
              bearer: bearer,
              active: true,
              datarate: parseInt(nems[j].datarate, 10),
              max_datarate: parseInt(nems[j].max_datarate, 10)
            })
          }
        }
      }

      console.log(bearers)
      console.log(json)

      graph = json
      return graph
    }

    function setupWebSocket() {
      websocket = new WebSocket('ws://192.168.10.10:1880/ws/metrics')

      websocket.onopen = () => {
        console.log('opened socket!')
      }
    }

    function listenOnWebSocket() {
      websocket.onmessage = (e) => {
        let d = JSON.parse(e.data)
        let now = Math.floor(Date.now() / 1000)

        for (let i in graph.links) {
          let l = graph.links[i]
          if (l.bearer === d.bearer && ((l.source.name === d.src
              && l.target.name === d.dst) || (l.source.name === d.client || l.target.name === d.client))) {
            if (d.dataitem === 'datarate') {
              l.datarate = parseInt(d.value, 10)
            } else if (d.dataitem === 'xfer') {
              l.tx = parseInt(d.value.tx, 10)
              l.rx = parseInt(d.value.rx, 10)

              if (l.tx > maxRateSeen || maxRateSet < Date.now() - 60000) {
                maxRateSeen = l.tx
                maxRateSet = Date.now()
                setMaxSeen()
              }
              if (l.rx > maxRateSeen || maxRateSet < Date.now() - 60000) {
                maxRateSeen = l.rx
                maxRateSet = Date.now()
                setMaxSeen()
              }

              if (dataSeen.length && dataSeen[dataSeen.length - 1].time === now) {
                let dsTx = dataSeen[dataSeen.length - 1][l.bearer + '_tx']
                let dsRx = dataSeen[dataSeen.length - 1][l.bearer + '_rx']
                dataSeen[dataSeen.length - 1][l.bearer + '_tx'] = Math.max(d.value.tx, dsTx)
                dataSeen[dataSeen.length - 1][l.bearer + '_rx'] = Math.max(d.value.rx, dsRx)
              } else {
                let dataPoint = {
                  time: now,
                  A_tx: 0,
                  A_rx: 0,
                  B_tx: 0,
                  B_rx: 0,
                  C_tx: 0,
                  C_rx: 0,
                  D_tx: 0,
                  D_rx: 0
                }

                dataPoint[l.bearer + '_tx'] = d.value.tx
                dataPoint[l.bearer + '_rx'] = d.value.rx

                dataSeen.push(dataPoint)

                if (dataSeen.length > 20) {
                  dataSeen.splice(0, 1)
                }
                console.log(dataSeen.length)
              }
            }
          }
        }
      }

      $interval(() => {
        updateLineChart()
      }, 1000)

      $interval(() => {
        restart()
      }, 3000)

      console.log(dataSeen)
    }

    function createBezierCurves(newLinks, bilinks, intermediateLinks) {
      for (let l of newLinks) {
        let s = l.source
        let t = l.target

        if (typeof s === 'string') {
          s = nodeById.get(s)
          l.source = s
        }
        if (typeof t === 'string') {
          t = nodeById.get(t)
          l.target = t
        }

        let i = {}
        let j = {}
        helperNodes.push(i);
        helperNodes.push(j);
        intermediateLinks.push({source: s, target: i}, {source: i, target: j}, {source: j, target: t});
        bilinks.push({
          nodes: [s, i, j, t],
          link: l
        });
      }

      newLinks = []
    }

    let getLineStatus = () => {
      return {
        tx: this.showTx,
        rx: this.showRx
      }
    }

    function restart() {
      createBezierCurves(newLinks, bilinks, intermediateLinks)

      // ============ Helper ============

      // Node enter
      hnode = hnode.data(helperNodes)

      // Node exit
      hnode.exit().remove()

      // Node update
      hnode = hnode
        .enter().append('circle')
          .attr('class', function(d) {
            return 'node' + (d.name ? '' : ' helper')
          })
          .style('display', function(d) {
            return d.name ? 'none' : 'block'
          })
          .attr('r', 4)
        .merge(hnode)

      // Link enter
      hlink = hlink.data(bilinks)

      // Link exit
      hlink.exit().remove()

      // Link update
      let hgroup = hlink
        .enter().append('g')

      hgroup.append('defs').append('marker')
          .attr('id', 'arrow')
          .attr('viewBox', '0 -5 10 10')
          .attr('refX', 5)
          .attr('refY', 0)
          .attr('markerWidth', 10)
          .attr('markerHeight', 10)
          .attr('markerUnits', 'userSpaceOnUse')
          .attr('orient', 'auto')
        .append('svg:path')
          .attr('d', 'M0,-5L10,0L0,5')
          .attr('fill', '#111')
          .attr('stroke', '#fff')

      hlink = hgroup.append('path')
          .attr('class', 'link')
          .attr('marker-mid', 'url(#arrow)')
        .on('mouseenter', mouseenterLink)
        .on('mouseleave', mouseleaveLink)
        .on('click', clickLink)
        .merge(hlink)
          .style('stroke', function(d) {
            return bearerColours[d.link.bearer]
          })
          .style('stroke-width', function(d) {
            if (d.link.datarate) {
              if (d.link.datarate === 1) {
                return 5
              } else {
                return Math.sqrt(d.link.datarate / 20000)
              }
            }
          })
          .style('stroke-dasharray', function(d) {
            let result

            if (!d.link.active || d.link.datarate === 1) {
              result = 15
            } else {
              result = 0
            }

            return result
          })
          .style('opacity', (d) => {
            let tx = d.link.tx ? d.link.tx : 0
            let rx = d.link.rx ? d.link.rx : 0

            maxRateSeen = maxRateSeen ? maxRateSeen : 1

            let opacity = (Math.max(tx, rx) / maxRateSeen) * 0.8
            opacity = opacity > 0.1 ? opacity : 0.1

            return opacity
          })

      // ============ Display ============

      // Node enter
      node = node.data(nodes.filter(function(d) { return d.name }))

      // Node exit
      node.exit().remove()

      // Node update
      node = node
        .enter().append('g')
        .attr('class', function(d) {
          return d.name
        })
        .attr('fill', function(d) { return color(d.name) })
        .call(d3.drag()
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended))
        .on('mouseenter', mouseenterNode)
        .on('mouseleave', mouseleaveNode)
        .on('click', clickNode)
        .merge(node)

      node.append('circle')
          .attr('class', 'node')
          .attr('r', 15)

      node.append('text')
          .attr('dx', 20)
          .attr('dy', '.35em')
          .text(function(d) { return d.name })

      // ============ Simulation ============

      // Update and restart the simulation.
      simulation.nodes(nodes)
      simulation.alpha(1).restart()

      helperSim.nodes(helperNodes)
      helperSim.force('link').links(intermediateLinks)
      helperSim.alpha(1).restart()
    }

    this.restart = restart

    function mouseenterNode(d) {
      let html = '<h4>' + d.name + '</h4>'

      let x = d.x
      let y = d.y

      d3.select(this)
          .attr('fill', selectColour)

      let tooltip = d3.select('#tooltip')
          .style('left', x + 'px')
          .style('top', y + 'px')
          .html(html)

      tooltip.classed('hidden', false)
    }

    function mouseleaveNode() {
      d3.select(this)
          .attr('fill', function(d) { return color(d.name) })

      d3.select('#tooltip')
          .classed('hidden', true)
    }

    function mouseenterLink(d) {
      let l = d.link
      let x = l.target.x + (l.source.x - l.target.x) / 2
      let y = l.target.y + (l.source.y - l.target.y) / 2

      let html = '<h4>' + l.source.name + ' - ' + l.target.name + '</h4>'

      html += '<h5 style="color: ' + bearerColours[l.bearer] + '; opacity: 0.8">' + bearerNames[l.bearer] + '</h5>'

      html += '<table>'
      html += '<tr>'
      html += '<td class="tooltip-label">Datarate</td>'
      html += '<td>' + l.datarate + '</td>'
      html += '</tr>'

      html += '<tr>'
      html += '<td class="tooltip-label">Max Datarate</td>'
      html += '<td>' + l.max_datarate + '</td>'
      html += '</tr>'

      let tx = l.tx ? l.tx : '0'
      let rx = l.rx ? l.rx : '0'

      html += '<tr>'
      html += '<td class="tooltip-label">Tx</td>'
      html += '<td>' + tx + '</td>'
      html += '</tr>'

      html += '<tr>'
      html += '<td class="tooltip-label">Rx</td>'
      html += '<td>' + rx + '</td>'
      html += '</tr>'

      html += '</table>'

      d3.select('.' + l.source.name)
          .attr('fill', selectColour)
      d3.select('.' + l.target.name)
          .attr('fill', selectColour)

      d3.select(this)
          .style('stroke', selectColour)
          .style('opacity', 0.8)

      let tooltip = d3.select('#tooltip')
          .style('left', x + 'px')
          .style('top', y + 'px')
          .html(html)

      tooltip.classed('hidden', false)
    }

    function mouseleaveLink(d) {
      let l = d.link

      d3.select('.' + l.source.name)
          .attr('fill', function(d) { return color(d.name) })
      d3.select('.' + l.target.name)
          .attr('fill', function(d) { return color(d.name) })

      d3.select(this)
          .style('stroke', function(d) {
            return bearerColours[d.link.bearer]
          })
          .style('opacity', function(d) {
            let tx = d.link.tx ? d.link.tx : 0
            let rx = d.link.rx ? d.link.rx : 0
            maxRateSeen = maxRateSeen ? maxRateSeen : 1

            let opacity = (Math.max(tx, rx) / maxRateSeen) * 0.8
            opacity = opacity > 0.1 ? opacity : 0.1

            return opacity
          })

      d3.select('#tooltip')
          .classed('hidden', true)
    }

    let lastClicked = {}

    function clickNode(d) {
      console.log('click node')
      lastClicked = {
        type: 'node',
        d: d
      }

      d3.select('.selected')
          .classed('selected', false)
      d3.select(this)
          .classed('selected', true)
    }

    function clickLink(d) {
      if (lastClicked.type === 'node') {
        let value = (d.link.datarate === 1) ? d.link.max_datarate : 1
        let body = {}
        body[lastClicked.d.name] = {}
        body[lastClicked.d.name][d.link.bearer] = value

        console.log(body)
        $http.post('bandwidth', body).then(() => {
          console.log('sent bandwidth update')
        })
      }

      d3.select('.selected')
          .classed('selected', false)

      lastClicked = {
        type: 'link',
        d: d
      }
    }

    function ticked() {
      link.attr('x1', function(d) { return d.source.x })
          .attr('y1', function(d) { return d.source.y })
          .attr('x2', function(d) { return d.target.x })
          .attr('y2', function(d) { return d.target.y })
      node.attr('transform', positionNode)

      hlink.attr('d', positionLink)
      hnode.attr('transform', positionNode)
    }

    function positionLink(d) {
      let n = d.nodes
      let lineData = [
        [n[0].x, n[0].y],
        [n[1].x, n[1].y],
        [n[2].x, n[2].y],
        [n[3].x, n[3].y]
      ]

      return pathgen(lineData)
    }

    function positionNode(d) {
      return 'translate(' + d.x + ',' + d.y + ')'
    }

    function dragstarted(d) {
      if (!d3.event.active) {
        simulation.alphaTarget(0.3).restart()
        helperSim.alphaTarget(0.3).restart()
      }
      d.fx = d.x, d.fy = d.y
    }

    function dragged(d) {
      d.fx = d3.event.x, d.fy = d3.event.y
    }

    function dragended(d) {
      if (!d3.event.active) {
        simulation.alphaTarget(0)
        helperSim.alphaTarget(0)
      }
      d.fx = null, d.fy = null
    }

    function buildLegend() {
      let nodeLegend = svg.append('g')
          .attr('class', 'legend')
          .attr('transform', 'translate(-10, 10)')
        .selectAll('g')
        .data(json.nodes)
        .enter().append('g')
          .attr('transform', function(d, i) { return 'translate(0,' + i * 20 + ')' })

      nodeLegend.append('circle')
          .attr('cx', width - 11)
          .attr('cy', 9)
          .attr('r', 8)
          .attr('stroke', 'white')
          .attr('stroke-width', '0.5px')
          .attr('fill', function(d) {
            return color(d.name)
          });

      nodeLegend.append('text')
          .attr('x', width - 24)
          .attr('y', 9.5)
          .attr('dy', '0.32em')
          .text(function(d) { return d.name; })

      let linkLegend = svg.append('g')
          .attr('class', 'legend')
          .attr('transform', 'translate(-10, 100)')
        .selectAll('g')
        .data(Object.keys(bearerNames))
        .enter().append('g')
          .attr('transform', function(d, i) { return 'translate(0,' + i * 20 + ')' })

      linkLegend.append('rect')
          .attr('x', width - 19)
          .attr('width', 16)
          .attr('height', 16)
          .attr('opacity', 0.8)
          .attr('fill', function(d) {
            return bearerColours[d]
          });

      linkLegend.append('text')
          .attr('x', width - 24)
          .attr('y', 9.5)
          .attr('dy', '0.32em')
          .text(function(d) { return bearerNames[d] })
    }

    // Line Charts

    let x, y
    let ATxLine, ARxLine, BTxLine, BRxLine, CTxLine, CRxLine, DTxLine, DRxLine

    function createLineChart() {
      x = d3.scaleTime().rangeRound([0, width])
      y = d3.scaleLinear().rangeRound([height, 0])

      ATxLine = d3.line()
          .x(function(d) { return x(d.time) })
          .y(function(d) { return y(d.A_tx) })

      ARxLine = d3.line()
          .x(function(d) { return x(d.time) })
          .y(function(d) { return y(d.A_rx) })

      BTxLine = d3.line()
          .x(function(d) { return x(d.time) })
          .y(function(d) { return y(d.B_tx) })

      BRxLine = d3.line()
          .x(function(d) { return x(d.time) })
          .y(function(d) { return y(d.B_rx) })

      CTxLine = d3.line()
          .x(function(d) { return x(d.time) })
          .y(function(d) { return y(d.C_tx) })

      CRxLine = d3.line()
          .x(function(d) { return x(d.time) })
          .y(function(d) { return y(d.C_rx) })

      DTxLine = d3.line()
          .x(function(d) { return x(d.time) })
          .y(function(d) { return y(d.D_tx) })

      DRxLine = d3.line()
          .x(function(d) { return x(d.time) })
          .y(function(d) { return y(d.D_rx) })

      x.domain(d3.extent(dataSeen, function(d) { return d.time }))
      y.domain([0, d3.max(dataSeen, function(d) {
        return Math.max(d.A_tx, d.A_rx, d.B_tx, d.B_rx, d.C_tx, d.C_rx, d.D_tx, d.D_rx) + 5
      })])

      lineGraph.append('g')
          .attr('transform', 'translate(0,' + height + ')')
          .attr('class', 'x axis')
          .call(d3.axisBottom(x))
      lineGraph.append('g')
          .attr('class', 'y axis')
          .call(d3.axisLeft(y))

      lineGraph.append('path')
          .datum(dataSeen)
          .attr('class', 'data-line A_tx tx')
          .attr('stroke', bearerColours['A'])
          .attr('d', ATxLine)
      lineGraph.append('path')
          .datum(dataSeen)
          .attr('class', 'data-line A_rx rx')
          .attr('stroke', bearerColours['A'])
          .attr('d', ARxLine)

      lineGraph.append('path')
          .datum(dataSeen)
          .attr('class', 'data-line B_tx tx')
          .attr('stroke', bearerColours['B'])
          .attr('d', BTxLine)
      lineGraph.append('path')
          .datum(dataSeen)
          .attr('class', 'data-line B_rx rx')
          .attr('stroke', bearerColours['B'])
          .attr('d', BRxLine)

      lineGraph.append('path')
          .datum(dataSeen)
          .attr('class', 'data-line C_tx tx')
          .attr('stroke', bearerColours['C'])
          .attr('d', CTxLine)
      lineGraph.append('path')
          .datum(dataSeen)
          .attr('class', 'data-line C_rx rx')
          .attr('stroke', bearerColours['C'])
          .attr('d', CRxLine)

      lineGraph.append('path')
          .datum(dataSeen)
          .attr('class', 'data-line D_tx tx')
          .attr('stroke', bearerColours['D'])
          .attr('d', DTxLine)
      lineGraph.append('path')
          .datum(dataSeen)
          .attr('class', 'data-line D_rx rx')
          .attr('stroke', bearerColours['D'])
          .attr('d', DRxLine)

      let lineLegend = svg.append('g')
          .attr('class', 'legend')
          .attr('transform', 'translate(-10, 220)')
        .selectAll('g')
        .data([{name: 'tx', dash: '0.5, 10'}, {name: 'rx', dash: '0'}])
        .enter().append('g')
          .attr('transform', function(d, i) { return 'translate(0,' + i * 20 + ')' })

      lineLegend.append('line')
          .attr('x1', width - 50)
          .attr('y1', 10)
          .attr('x2', width - 5)
          .attr('y2', 10)
          .attr('stroke-width', 3)
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap', 'round')
          .attr('stroke-dasharray', function(d) {
            return d.dash
          })
          .attr('stroke', 'white')
          .attr('opacity', 0.4)

      lineLegend.append('text')
          .attr('x', width - 60)
          .attr('y', 9.5)
          .attr('dy', '0.32em')
          .text(function(d) { return d.name })
    }

    function updateLineChart() {
      let xDomain = d3.extent(dataSeen, function(d) { return d.time })

      if (xDomain[1] - xDomain[0] > 10.5) {
        xDomain[0] = xDomain[1] - 10
      }

      x.domain(xDomain)
      y.domain([0, d3.max(dataSeen, function(d) {
        return Math.max(d.A_tx, d.A_rx, d.B_tx, d.B_rx, d.C_tx, d.C_rx, d.D_tx, d.D_rx) + 5
      })])

      let transitionSvg = d3.select('body').transition()

      transitionSvg.select('.x.axis')
          .duration(750)
          .call(d3.axisBottom(x))
      transitionSvg.select('.y.axis')
          .duration(750)
          .call(d3.axisLeft(y))

      transitionSvg.select('.A_tx')
          .duration(750)
          .attr('d', ATxLine(dataSeen))
      transitionSvg.select('.A_rx')
          .duration(750)
          .attr('d', ARxLine(dataSeen))

      transitionSvg.select('.B_tx')
          .duration(750)
          .attr('d', BTxLine(dataSeen))
      transitionSvg.select('.B_rx')
          .duration(750)
          .attr('d', BRxLine(dataSeen))

      transitionSvg.select('.C_tx')
          .duration(750)
          .attr('d', CTxLine(dataSeen))
      transitionSvg.select('.C_rx')
          .duration(750)
          .attr('d', CRxLine(dataSeen))

      transitionSvg.select('.D_tx')
          .duration(750)
          .attr('d', DTxLine(dataSeen))
      transitionSvg.select('.D_rx')
          .duration(750)
          .attr('d', DRxLine(dataSeen))

      d3.selectAll('.tx')
          .classed('hidden', () => {
            return !getLineStatus().tx
          })

      d3.selectAll('.rx')
          .classed('hidden', () => {
            return !getLineStatus().rx
          })
    }

    this.updateLineChart = updateLineChart
  }

  swapData() {
    this.dataDirection = (this.dataDirection === 'rx') ? 'tx' : 'rx'
    this.restart()
  }

  resetConnectivity() {
    this.$http.put('reset').then(() => {
      console.log('done reset')
    })
  }

  toggleTx() {
    this.showTx = !this.showTx
    this.updateLineChart()
  }

  toggleRx() {
    this.showRx = !this.showRx
    this.updateLineChart()
  }
}
