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

this.Room = Room;