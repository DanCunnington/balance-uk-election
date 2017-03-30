const request = require('request')
const endpoint = 'http://facebook-hack-nodejs-server.eu-gb.mybluemix.net/'

let getSocial = (req, res) => {
  request.get(endpoint + 'social', (err, response, body) => {
    res.send(body)
  })
}

let getPublishers = (req, res) => {
  request.get(endpoint + 'publishers', (err, response, body) => {
    res.send(body)
  })
}

let getAnalysis = (req, res) => {
  request.get(endpoint + 'output/analysed.json', (err, response, body) => {
    res.send(body)
  })
}

module.exports = {
  getSocial: getSocial,
  getPublishers: getPublishers,
  getAnalysis: getAnalysis
}
