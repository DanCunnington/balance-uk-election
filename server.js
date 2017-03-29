/* eslint no-console: 0 */

const path = require('path')

const webpack = require('webpack')
const webpackMiddleware = require('webpack-dev-middleware')
const webpackHotMiddleware = require('webpack-hot-middleware')
const config = require('./webpack.config.js')

const express = require('express')
const app = express()

const bodyParser = require('body-parser')
app.use(bodyParser.json())

const DEFAULT_PORT = 6001
app.set('port', process.env.PORT || DEFAULT_PORT)

const isDeveloping = process.env.NODE_ENV !== 'production'

require('./server/routes')(app)

if (isDeveloping) {
  console.log('development')
  const compiler = webpack(config)
  const middleware = webpackMiddleware(compiler, {
    publicPath: config.output.publicPath,
    stats: {
      colors: true
    }
  })

  app.use(middleware)
  app.use(webpackHotMiddleware(compiler, {
    log: console.log
  }))
  app.get('*', function response(req, res) {
    res.sendFile(path.join(__dirname, 'src', 'index.html'))
  })
} else {
  console.log('production')
  app.use(express.static(path.join(__dirname, 'dist')))

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'))
  })
}

app.listen(app.get('port'), err => {
  if (err) {
    return console.log(err)
  }
  console.info('==> 🌎 Listening on port %s. Open up http://localhost:%s/ in your browser.', app.get('port'), app.get('port'))
})
