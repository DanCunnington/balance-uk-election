const request = require('request')
const endpoint = 'https://facebook-hack-server.eu-gb.mybluemix.net/'

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
  request.get(endpoint + 'analysed', (err, response, body) => {
    res.send(body)
  })
}

module.exports = {
  getSocial: getSocial,
  getPublishers: getPublishers,
  getAnalysis: getAnalysis
}
