var express = require('express')
var controller = require('./api.controller')

var router = express.Router()

router.get('/social', controller.getSocial)
router.get('/publishers', controller.getPublishers)
router.get('/analysed', controller.getAnalysis)

module.exports = router
