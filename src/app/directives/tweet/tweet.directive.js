export default class Tweet {
  constructor() {
    this.template = require('./tweet.html')
    this.restrict = 'E'
    this.scope = {
      article: '=',
      comparison: '='
    }

    this.controller = TweetController
    this.controllerAs = 'ctrl'
    this.bindToController = true
  }
}

class TweetController {
  constructor () {
    this.similarity = 20
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
}
