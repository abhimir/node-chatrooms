var express = require('express'),
	mongoose = require('mongoose'),
	path = require('path');

var app = express.createServer();

app.configure(function() {
	app.set('views', path.join(__dirname, 'templates'));
	app.set('view engine', 'jade');
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(require('stylus').middleware({ src: path.join(__dirname, 'public') }));
	app.use(app.router);
	app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
	app.use(express.errorHandler()); 
});

this.app = app;
this.socket = require('socket.io').listen(app);

var urls = require('./urls');

for (var name in urls) {
	var url = urls[name];
	if (!url.method) {
		url.method = 'get';
	}
	if (!(url.view instanceof Array)) {
		var args = [url.path, url.view];
	} else {
		url.view.unshift(url.path);
		var args = url.view;
	}
	app[url.method].apply(app, args);
}
mongoose.connect('mongodb://localhost/test');

if (!module.parent) {
	app.listen(3000);
	console.log("Express server listening on port %d", app.address().port);
}