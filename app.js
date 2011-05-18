var express = require('express');

var app = module.exports = express.createServer(),
	socket = require('socket.io').listen(app);

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

if (!module.parent) {
	app.listen(3000);
	console.log("Express server listening on port %d", app.address().port);
}

var rooms = {};

function Room(id) {

	this.id = id;
	this.messages = [];
	this.sessions = {};
	this.created = new Date();
	
}
	
Room.prototype.leave = function(sessionId) {
	var session = this.sessions[sessionId];
	if (!session) {
		return { error: 'No session exists with that ID.', status: 400 }
	}
	this.addMessage(session.nickname, 'left', 'left');
	delete this.sessions[sessionId];
	return null;
};
	
Room.prototype.addMessage = function(message) {
	switch (message.type) {
		case 'msg':
			console.log('<' + message.nickname + '> ' + message.text);
			break;
		case 'joined':
			console.log(message.nickname + ' joined');
			break;
		case 'left':
			console.log(message.nickname + ' left');
			break;
	}
	
	message.timestamp = (new Date()).getTime();
	this.messages.push(message);
	return message;
};

Room.prototype.nicknames = function() {
	var nicknames = [];
	for (var id in this.sessions) {
		nicknames.push(this.sessions[id].nickname);
	}
	return nicknames;
}
	
Room.prototype.who = function() {
	var sessionIds = [];
	for (var id in this.sessions) {
		sessionIds.push(id);
	}
	return sessionIds;
}

function generateId(length) {
	var id = '';
	var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	length = length || 26;

	for (var i=0; i < length; i++) {
		id += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return id;
}

function getRoomOr404(req, res, next) {
	var room = rooms[req.params.id];
	if (room) {
		req.room = room;
		next();
	} else {
		next(new Error('Room not found with an ID of ' + req.params.id));
	}
};

app.get('/', function(req, res) {
	console.log('Showing ' + Object.keys(rooms).length + ' rooms');
	res.render('index', {
		rooms: rooms,
		title: 'node chat'
	});
});

app.get('/create', function(req, res) {
	var id = generateId();
	while(id in rooms) {
		id = generateId();
	}
	rooms[id] = new Room(id);
	res.redirect('/' + id);
});

app.get('/:id', getRoomOr404, function(req, res) {
	console.log('Showing room ' + req.room.id);
	res.render('show', {
		room: req.room,
		title: 'node chat'
	});
});

app.post('/:id/join', getRoomOr404, function(req, res) {
	var error = null;
	var nickname = req.param('nickname');
	if (nickname.length <= 0) {
		error = 'Nickname must not be blank.';
	} else if (nickname.length > 50) {
		error = 'Nickname can not be longer than 50 characters.';
	} else if (/[^\w-]/.test(nickname)) {
		error = 'Bad character found in nickname. Only letters, numbers, "-", and "_" are allowed';
	} else {
		for (var sessionId in req.room.sessions) {
			var session = req.room.sessions[sessionId];
			if (session.nickname === nickname) {
				error = 'Nickname already exists. Pick another one.';
			}
		}
	}
	if (error) {
		res.send({ error: error }, 400);
	} else {
		res.send({ nickname: nickname }, 200);
	}
});

socket.on('connection', function(client) {

	console.log(client.sessionId);
	client.send({ type: 'init', sessionId: client.sessionId });
	
	client.on('message', function(message) {
		var room = rooms[message.roomId];
		var session = room.sessions[message.sessionId];
		var msg = { type: message.type }
		if (message.type === 'joined' && !session) {
			if (!session) {
				session = room.sessions[message.sessionId] = {
					nickname: message.nickname
				}
			}
			msg.who = room.nicknames();
			msg.text = 'joined';
			msg.nickname = session.nickname;
		} else if (message.type === 'left') {
			msg.nickname = session.nickname;
			msg.who = room.nicknames();
			msg.text = 'left';
			delete room.sessions[message.sessionId];
		} else {
			msg.nickname = session.nickname;
			msg.text = message.text;
		}
		room.addMessage(msg);
		socket.broadcast(msg);
	});
	
});