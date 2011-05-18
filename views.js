var socket = require('./app').socket,
	Room = require('./models').Room;
	
function generateId(length) {
	var id = '';
	var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	length = length || 26;

	for (var i=0; i < length; i++) {
		id += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return id;
}

this.getRoomOr404 = function(req, res, next) {
	var room = rooms[req.params.id];
	if (room) {
		req.room = room;
		next();
	} else {
		next(new Error('Room not found with an ID of ' + req.params.id));
	}
};

var rooms = {};

this.rooms = {
	index: function(req, res) {
		console.log('Showing ' + Object.keys(rooms).length + ' rooms');
		res.render('index', {
			rooms: rooms,
			title: 'node chat'
		});
	},
	create: function(req, res) {
		var id = generateId();
		while(id in rooms) {
			id = generateId();
		}
		rooms[id] = new Room(id);
		res.redirect('/' + id);
	},
	show: function(req, res) {
		console.log('Showing room ' + req.room.id);
		res.render('show', {
			room: req.room,
			title: 'node chat'
		});
	},
	join: function(req, res) {
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
	}
};

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