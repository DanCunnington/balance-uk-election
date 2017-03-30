import angular from 'angular'

import './bower_components/angular-bootstrap/ui-bootstrap'
import './bower_components/angular-bootstrap/ui-bootstrap-tpls'
import './bower_components/angular-ui-router/release/angular-ui-router'
import './bower_components/angular-pageslide-directive/dist/angular-pageslide-directive'
import './bower_components/bootstrap/dist/js/bootstrap'
import './bower_components/tiny-angular-wordcloud/dist/tangCloud'

import './bower_components/html5-boilerplate/dist/css/normalize.css'
import './bower_components/html5-boilerplate/dist/css/main.css'
import './bower_components/bootstrap/dist/css/bootstrap-theme.css'
import './bower_components/bootstrap/dist/css/bootstrap.css'

import ExampleController from './app/routes/example/example.controller'
import Article from './app/directives/article/article.directive'
import Tweet from './app/directives/tweet/tweet.directive'

import './styles/styles.scss'
import './styles/wordCloud.scss'

angular.module('angularWebpack', [
  'ui.router',
  'ui.bootstrap',
  'pageslide-directive',
  'tangcloud'
])

.controller('exampleController', ExampleController)
.directive('article', () => new Article)
.directive('tweet', () => new Tweet)

.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
  $locationProvider.html5Mode({
    enabled: true
  })

  $stateProvider
    .state('home', {
      url: '/',
      template: require('./app/routes/example/example.html'),
      controller: 'exampleController',
      controllerAs: 'ctrl'
    })

  $urlRouterProvider
    .otherwise('/')
})
