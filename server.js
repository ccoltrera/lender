var express = require("express");
var app = express();

app.set("port", (process.env.PORT || 4000));

app.get("/", function(request, response) {
  response.sendFile("index.html", {root: __dirname + "/public"});
});

app.use(express.static(__dirname + '/public'));

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
