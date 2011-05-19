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
	Room.findById(req.param('id'), function(error, room) {
		if (room) {
			req.room = room;
			next();
		} else {
			next(new Error('Room not found with an ID of ' + req.params.id));
		}
	});
};

var roomSessions = {};

var nicknames = function(roomId) {
	var nicknames = [];
	for (var id in roomSessions[roomId]) {
		nicknames.push(roomSessions[roomId][id].nickname);
	}
	return nicknames;
}
	
var who = function(roomId) {
	var sessionIds = [];
	for (var id in roomSessions[roomId]) {
		sessionIds.push(id);
	}
	return sessionIds;
}

Room.find({}, function(err, rooms) {
	for (var i=0; i < rooms.length; i++) {
		var room = rooms[i];
		roomSessions[room.id] = {}
	}
});

this.rooms = {
	index: function(req, res) {
		Room.find({}, function(err, rooms) {
			console.log('Showing ' + Object.keys(rooms).length + ' rooms');
			res.render('index', {
				rooms: rooms,
				title: 'node chat'
			});
		});
	},
	create: function(req, res) {
		var room = new Room();
		room.save();
		roomSessions[room.id] = {}
		res.redirect('/' + room.id);
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
			for (var sessionId in roomSessions[req.room.id]) {
				var session = roomSessions[req.room.id];
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

	client.send({ type: 'init', sessionId: client.sessionId });
	
	client.on('message', function(message) {
		Room.findById(message.roomId, function(error, room) {
			var session = roomSessions[room.id][message.sessionId];
			var msg = { type: message.type }
			if (message.type === 'joined' && !session) {
				if (!session) {
					session = roomSessions[room.id][message.sessionId] = {
						nickname: message.nickname,
						client: client
					}
				}
				msg.who = nicknames(room.id);
				msg.text = 'joined';
				msg.nickname = session.nickname;
			} else if (message.type === 'left') {
				msg.nickname = session.nickname;
				msg.who = nicknames(room.id);
				msg.text = 'left';
				delete roomSessions[room.id][message.sessionId];
			} else {
				msg.nickname = session.nickname;
				msg.text = message.text;
			}
			room.messages.push({
				type: msg.type,
				text: msg.text,
				nickname: msg.nickname,
				timestamp: Date.now()
			});
			room.save();
			for (var sessionId in roomSessions[room.id]) {
				roomSessions[room.id][sessionId].client.send(msg);
			}
		});
		//socket.broadcast(msg);
	});
	
});