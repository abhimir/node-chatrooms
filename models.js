var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
	
var MessageSchema = new Schema({
	nickname: String,
	timestamp: { type: Date, default: Date.now },
	type: { type: String, enum: ['msg', 'joined', 'left'] }
});

var RoomSchema = new Schema({
	messages: [this.MessageSchema],
	name: String,
	created: { type: Date, default: Date.now }
});

this.Room = mongoose.model('Room', RoomSchema);