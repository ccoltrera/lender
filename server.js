'use strict';
var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));
app.use(express.static('lender'));

app.get('/', function (req, res) {
  res.send('Secret Message!');
});


app.use('/', function (req, res, next) {

  var fileName = req.params.name;
  res.sendFile('./404.html', options, function (err) {
    if (err) {
      console.log(err);
      res.status(err.status).end();
    }
    else {
      console.log('Sent:', './404.html');
    }
  });
})

var server = app.listen(process.env.PORT || 5000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);

});
