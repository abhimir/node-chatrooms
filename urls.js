var views = require('./views');

module.exports = {
	'index': { path: '/', view: views.rooms.index },
	'create': { path: '/create', view: views.rooms.create },
	'show': { path: '/:id', view: [views.getRoomOr404, views.rooms.show]},
	'join': { path: '/:id/join', method: 'post', view: [views.getRoomOr404, views.rooms.join] }
}