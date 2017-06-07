export default class ExampleController {
  constructor($scope, $http, $sce) {
    $scope.searchQuery = 'UK Election'

    function shuffle(array) {
      var currentIndex = array.length, temporaryValue, randomIndex;

      // While there remain elements to shuffle...
      while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
      }

      return array;
    }

    $http.get('analysed').then(response => {
      console.log(response.data)
      $scope.latest = response.data.social.concat(response.data.publisher)

      for (let article of $scope.latest) {
        article.similarity = article.analysed.percentage
        article.dissimilarity = 100 - article.similarity
        article.analysed.percentage = Math.round(article.analysed.percentage)
        article.trustedUrl = $sce.trustAsResourceUrl(article.url)

        let htmlText = article.text

        if (article.entities) {
          for (let entity of article.entities) {
            let className = entity.sentiment.type + '-text'
            entity.text = entity.text.replace(')', '\\)')
            htmlText = htmlText.replace(new RegExp(entity.text, 'g'), '<span class=' + className + '>' + entity.text + '</span>');
          }
        }

        article.trustedText = $sce.trustAsHtml(htmlText)
      }

      let categoriesCount = {}
      $scope.categories = []

      for (let article of $scope.latest) {
        if (article.platform) {
          if (!categoriesCount[article.platform]) {
            categoriesCount[article.platform] = 0
          }

          categoriesCount[article.platform]++

        } else if (article.source) {
          if (!categoriesCount[article.source]) {
            categoriesCount[article.source] = 0
          }

          categoriesCount[article.source]++
        }
      }

      for (let category in categoriesCount) {
        $scope.categories.push({
          name: category,
          count: categoriesCount[category]
        })
      }

      $scope.latest = shuffle($scope.latest);
      $scope.removed = $scope.latest.splice($scope.latest.length - 2, 2)
    })

    $scope.openArticle = (article) => {
      $scope.isArticleOpen = true
      $scope.selectedArticle = article

      $scope.words = []
      let i = 0

      for (let entity of $scope.selectedArticle.entities) {
        let weight = 5

        if (entity.sentiment.score) {
          if (entity.sentiment.score < -0.8) {
            weight = 10
          } else if (entity.sentiment.score < -0.6) {
            weight = 8
          } else if (entity.sentiment.score < -0.4) {
            weight = 6
          } else if (entity.sentiment.score < -0.2) {
            weight = 3
          } else if (entity.sentiment.score < 0) {
            weight = 1
          } else if (entity.sentiment.score < 0.2) {
            weight = 2
          } else if (entity.sentiment.score < 0.4) {
            weight = 2
          } else if (entity.sentiment.score < 0.6) {
            weight = 4
          } else if (entity.sentiment.score < 0.8) {
            weight = 7
          } else {
            weight = 9
          }
        }

        $scope.words.push({
          id: i++,
          word: entity.text,
          size: weight
        })
        console.log(weight)
      }

      console.log($scope.words)

      // $scope.data = [
      //   {text: 'Lorem', weight: 15}, //if your tag has a link.
      //   {text: 'Ipsum', weight: 9},
      //   {text: 'Dolor', weight: 6},
      //   {text: 'Sit', weight: 7},
      //   {text: 'Amet', weight: 5}
      //   // ...as many words as you want
      // ];
    }
  }
}
