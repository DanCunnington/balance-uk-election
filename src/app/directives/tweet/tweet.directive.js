/* global d3 */

export default class Tweet {
  constructor() {
    this.template = require('./tweet.html')
    this.restrict = 'E'
    this.scope = {
      article: '=',
      comparison: '=',
      i: '='
    }

    this.controller = TweetController
    this.controllerAs = 'ctrl'
    this.bindToController = true
  }
}

class TweetController {
  constructor ($timeout) {
    this.similarity = 20

    $timeout(() => {
      let data = []
      let colours = ['#d21919', '#5daf31','#f6f737',  '#fdaa34', '#5e9a9c', ]

      for (let emotion in this.article.sentiment.emotions) {
        data.push({
          emotion: emotion,
          value: this.article.sentiment.emotions[emotion]
        })
      }

      let element = document.getElementsByClassName('tweet-details')[0]
      let positionInfo = element.getBoundingClientRect()
      let margin = {top: 0, right: 5, bottom: 0, left: 5}
      let height = positionInfo.height - margin.top - margin.bottom
      let width = positionInfo.width - margin.left - margin.right

      let svg = d3.select('#sentiment-chart-' + this.i)
          .style('opacity', 0)

      let g = svg.append('g')
          .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

      let x = d3.scaleLinear()
          .range([0, width])
          .domain([0, 1])

      let y = d3.scaleBand()
          .range([height, 0])
          .domain(data.map(function(d) {
            return d.emotion
          }))
          .padding(0.1)

      let bars = g.append('g')

      let xAxis = g.append('g')
          .attr('class', 'x axis')
          .attr('transform', 'translate(0,' + height + ')')
          .call(d3.axisBottom(x))

      xAxis.selectAll('line')
          .style('stroke-width', 0)

      xAxis.selectAll('path')
          .style('stroke-width', 0)

      let yAxis = g.append('g')
          .attr('class', 'y axis')
          .call(d3.axisLeft(y))

      yAxis.selectAll('text')
          .attr('x', 4)
          .style('text-anchor', 'start')

      yAxis.selectAll('line')
          .style('stroke-width', 0)

      yAxis.selectAll('path')
          .style('stroke-width', 0)

      bars.selectAll('.bar')
          .data(data)
        .enter().append('rect')
          .attr('class', 'bar')
          .attr('x', 0)
          .attr('fill', function(d, i) { return colours[i] })
          .attr('height', y.bandwidth())
          .attr('y', function(d) { return y(d.emotion) })
          .attr('width', function(d) { return x(d.value) })
    })
  }

  compareOpposing() {
    if (this.comparison) {
      let result = Math.abs(this.comparison.analysed.percentage - this.article.analysed.percentage) >= this.similarity
      return result
    } else {
      return false
    }
  }

  compareSupporting() {
    if (this.comparison) {
      let result = Math.abs(this.comparison.analysed.percentage - this.article.analysed.percentage) < this.similarity
      return result
    } else {
      return false
    }
  }

  showDetails() {
    this.showingDetails = true
    d3.select('#sentiment-chart-' + this.i)
        .style('opacity', 1)

    d3.selectAll('.tweet-details')
        .style('z-index', 5)
  }

  hideDetails() {
    this.showingDetails = false
    d3.select('#sentiment-chart-' + this.i)
        .style('opacity', 0)

    d3.selectAll('.tweet-details')
        .style('z-index', -5)
  }
}
