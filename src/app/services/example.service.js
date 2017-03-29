export default class ExampleService {
  constructor($http) {
    this.$http = $http
  }

  getData () {
    return this.$http
      .get('www.google.com')
      .then(() => {
        return 'got data'
      })
  }
}

ExampleService.$inject = ['$http']
