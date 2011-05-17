
/**
 * Module dependencies.
 */

var express = require('express'),
	rooms = require('./rooms');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
	app.set('views', __dirname + '/views');
	app.set('view engine', 'jade');
	app.use(express.bodyParser());
	app.use(express.methodOverride());
	app.use(require('stylus').middleware({ src: __dirname + '/public' }));
	app.use(app.router);
	app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
	app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
	app.use(express.errorHandler()); 
});

// Routes

// GET methods
app.get('/', rooms.views.index);
app.get('/create', rooms.views.create);
app.get('/:id', rooms.middleware.getRoomOr404, rooms.views.show);
app.get('/:id/receive', rooms.middleware.getRoomOr404, rooms.views.receive);
app.get('/:id/who', rooms.middleware.getRoomOr404, rooms.views.who);

// POST methods
app.post('/:id/leave', rooms.middleware.getRoomOr404, rooms.views.leave);
app.post('/:id/send', rooms.middleware.getRoomOr404, rooms.views.send);
app.post('/:id/join', rooms.middleware.getRoomOr404, rooms.views.join);

if (!module.parent) {
	app.listen(80);
	console.log("Express server listening on port %d", app.address().port);
}
