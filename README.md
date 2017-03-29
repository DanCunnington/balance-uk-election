# Boilerplate for Angular with Webpack, Babel and Bluemix

Modified from LoganArnett's [Demo for Angular 1.x with Webpack and Babel](https://github.com/LoganArnett/angular-webpack-demo).

Updated webpack to include fixes from [Preboot angularjs-webpack starter kit](https://github.com/preboot/angularjs-webpack).

### Setup
  * Clone the repo locally
  * Run:

```
npm install
npm install -g bower
bower install
npm start
```

And you should be able to see the basics up and running in your browser at `http://localhost:6001`

### Build for production

```
npm install
npm install -g forever
npm install -g bower
bower install

npm run build
export NODE_ENV=production

npm run forever
```

Stop the process:

```
npm run stop
```

Logs output to `out.log` and errors to `err.log`.
