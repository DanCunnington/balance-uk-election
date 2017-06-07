const request = require('request')
const endpoint = 'http://localhost:6020/'

let getSocial = (req, res) => {
  request.get(endpoint + 'ukelection/social', (err, response, body) => {
    res.send(body)
  })
}

let getPublishers = (req, res) => {
  request.get(endpoint + 'ukelection/publishers', (err, response, body) => {
    res.send(body)
  })
}

let getAnalysis = (req, res) => {
  request.get(endpoint + 'output/ukelection/analysed.json', (err, response, body) => {
    res.send(body)
  })
}

module.exports = {
  getSocial: getSocial,
  getPublishers: getPublishers,
  getAnalysis: getAnalysis
}
