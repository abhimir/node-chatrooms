var utils = require('./utils');

var MESSAGE_BACKLOG = 1000,
	SESSION_TIMEOUT = 1 * 60 * 1000, // 2 minute
	CALLBACK_TIMEOUT = 2 * 60 * 1000; // 2 minute
	
function validateNickname(nickname) {
	if (nickname.length <= 0) {
		return 'Nickname must not be blank.';
	} else if (nickname.length > 50) {
		return 'Nickname can not be longer than 50 characters.';
	} else if (/[^\w-]/.test(nickname)) {
		return 'Bad character found in nickname. Only letters, numbers, "-", and "_" are allowed';
	} else {
		return null;
	}
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

function Room(id) {
	this.id = id;
	this.messages = [];
	this.sessions = {};
	this.callbacks = [];
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

Room.prototype.join = function(nickname) {
	nickname = utils.trim(nickname);
	
	if (nickname in this.sessions) {
		return { error: 'Nickname already exists. Choose another one.', status: 400 };
	}
	
	var error = validateNickname(nickname);
	if (error) {
		return { error: error, status: 400 };
	}
	
	var id = generateId();
	while (id in this.sessions) {
		id = generateId();
	}
	var session = this.sessions[id] = {
		id: id,
		nickname: nickname,
		lastActive: new Date(),
		poke: function() {
			session.lastActive = new Date();
		}
	}
	
	this.addMessage(nickname, 'joined', 'joined');
	
	return session;
};

Room.prototype.addMessage = function(nickname, type, text) {
	
	switch (type) {
		case 'msg':
			console.log('<' + nickname + '> ' + text);
			break;
		case 'joined':
			console.log(nickname + ' joined');
			break;
		case 'left':
			console.log(nickname + ' left');
			break;
	}
	
	var message = {
		nickname: nickname,
		type: type,
		text: text,
		timestamp: (new Date()).getTime()
	};
	
	this.messages.push(message);
	
	while (this.callbacks.length > 0) {
		this.callbacks.shift().callback([message]);
	}
	
	while (this.messages.length > MESSAGE_BACKLOG) {
		this.messages.shift();
	}
};

Room.prototype.getMessages = function(since, callback) {
	var matching = [];
	for (var i=0; i < this.messages.length; i++) {
		var message = this.messages[i];
		if (message.timestamp > since) {
			matching.push(message);
		}
	}
	
	if (matching.length != 0) {
		callback(matching);
	} else {
		this.callbacks.push({
			timestamp: new Date(),
			callback: callback
		});
	}
};

Room.prototype.who = function() {
	var nicknames = [];
	for (var id in this.sessions) {
		nicknames.push(this.sessions[id].nickname);
	}
	return nicknames;
}

var rooms = {};

function createRoom() {
	
	// Make sure that the room ID is unique
	var id = generateId();
	while(id in rooms) {
		id = generateId();
	}
	
	rooms[id] = new Room(id);
	return id;
}


setInterval(function() {
	var now = new Date();
	for (var roomId in rooms) {
		var room = rooms[roomId];
		while (room.callbacks.length > 0 && now - room.callbacks[0].timestamp > CALLBACK_TIMEOUT) {
			room.callbacks.shift().callback([]);
		}
	}
}, 3000);

setInterval(function() {
	var now = new Date();
	for (var roomId in rooms) {
		var room = rooms[roomId];
		for (var sessionId in room.sessions) {
			var session = room.sessions[sessionId];
			if (now - session.lastActive > SESSION_TIMEOUT) {
				room.leave(sessionId);
			}
		}
	}
}, 1000);

// Views

this.views = {}

this.views.index = function(req, res) {
	console.log('Showing ' + Object.keys(rooms).length + ' rooms');
	res.render('index', {
		rooms: rooms,
		title: 'node chat'
	});
};

this.views.create = function(req, res) {
	var id = createRoom();
	res.redirect('/' + id);
};

this.views.show = function(req, res) {
	console.log('Showing room ' + req.room.id);
	res.render('show', {
		room: req.room,
		title: 'node chat'
	});
};

this.views.join = function(req, res) {
	res.contentType('json');
	var session = req.room.join(req.param('nickname'));
	if (session.error) {
		res.send(session.error, session.status);
		return;
	}
	
	res.send(session, 200);
};

this.views.leave = function(req, res) {
	var sessionId = req.param('sessionId');
	var response = req.room.leave(sessionId);
	if (response) {
		res.contentType('json');
		res.send(response.error, response.status);
	} else {
		res.redirect('/');
	}
	
};

this.views.send = function(req, res) {
	res.contentType('json');
	var sessionId = req.param('sessionId');
	var text = req.param('text');
	var session = req.room.sessions[sessionId];
	session.poke();
	if (!session || !text) {
		res.send('No such session id', 400);
		return;
	}
	req.room.addMessage(session.nickname, 'msg', text);
	res.send({ success: 'success' }, 200);
};

this.views.receive = function(req, res) {
	res.contentType('json');
	var since = req.param('since');
	if (!since) {
		res.send('Must supply since parameter', 400);
		return;
	}
	var sessionId = req.param('sessionId');
	var session;
	if (sessionId && req.room.sessions[sessionId]) {
		session = req.room.sessions[sessionId];
		session.poke();
	}
	
	since = parseInt(since, 10);
	
	req.room.getMessages(since, function(messages) {
		if (session) session.poke();
		res.send({ messages: messages }, 200);
	});
};

this.views.who = function(req, res) {
	res.contentType('json');
	res.send({
		nicknames: req.room.who(),
	}, 200);
};

this.middleware = {}

this.middleware.getRoomOr404 = function(req, res, next) {
	var room = rooms[req.params.id];
	if (room) {
		req.room = room;
		next();
	} else {
		next(new Error('Room not found with an ID of ' + req.params.id));
	}
};

