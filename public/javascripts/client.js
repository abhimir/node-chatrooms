var CONFIG = {
	debug: false,
	roomId: $('#messages').attr('rev'),
	nickname: '#',
	sessionId: null,
	lastMessageTime: (new Date()).getTime(),
	unread: 0
};

var $messageTemplate = $('#message-template').clone().removeAttr('id').remove(),
	title = document.title,
	nicknames = [],
	transmissionErrors = 0,
	startTime;
	
function dateToRelativeTime(date, nowThreshold) {
	var delta = new Date() - date;

	nowThreshold = parseInt(nowThreshold, 10);

	if (isNaN(nowThreshold)) {
		nowThreshold = 0;
	}

	if (delta <= nowThreshold) {
		return 'Just now';
	}

	var units = null;
	var conversions = {
		millisecond: 1, // ms -> ms
		second: 1000, // ms -> sec
		minute: 60, // sec -> min
		hour: 60, // min -> hour
		day: 24, // hour -> day
		month: 30, // day -> month (roughly)
		year: 12 // month -> year
	};

	for (var key in conversions) {
		if (delta < conversions[key]) {
			break;
		} else {
			units = key; // keeps track of the selected key over the iteration
			delta = delta / conversions[key];
		}
	}

	// pluralize a unit when the difference is greater than 1.
	delta = Math.floor(delta);
	if (delta !== 1) { units += "s"; }
	return [delta, units].join(" ");
};

function dateFromString(str) {
	return new Date(Date.parse(str));
};

util = {
	urlRE: /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s]*(\?\S+)?)?)?/g,
	escape: function(inputHtml) {
		inputHtml = inputHtml.toString();
		return inputHtml.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	},
	zeroPad: function(digits, n) {
		n = n.toString();
		while (n.length < digits) {
			n = '0' + n;
		}
		return n;
	},
	timeString: function(date) {
		var minutes = date.getMinutes().toString();
		var hours = date.getHours().toString();
		return this.zeroPad(2, hours) + ':' + this.zeroPad(2, minutes);
	},
	isBlank: function(text) {
		var blank = /^\s*$/;
		return (text.match(blank) !== null);
	}
};

function scrollDown() {
	window.scrollBy(0, 100000000000000000);
	$('#entry').focus();
}

function addMessage(type, timestamp, nickname, text) {
	
	if (text === null) return;
	
	var $message = $messageTemplate.clone();
	
	text = util.escape(text);
	
	var nicknameRe = new RegExp(CONFIG.nickname);
	if (nicknameRe.exec(text)) {
		$message.addClass('personal');
	}
	
	text = text.replace(util.urlRE, '<a target="_blank" href="$&">$&</a>');
	
	$message.addClass(type)
		.find('.timestamp').html(util.timeString(timestamp)).end()
		.find('.nickname').html(util.escape(nickname)).end()
		.find('.text').html(text);
	
	$('#messages').append($message);
	scrollDown();
}

function clearUnread() {
	CONFIG.unread = 0;
	updateTitle();
}

function updateTitle() {
	if (CONFIG.unread) {
		document.title = '(' + CONFIG.unread.toString() + ') ' + title;
	} else {
		document.title = title;
	}
}

function updateUptime() {
	if (startTime) {
		$('#uptime').text(dateToRelativeTime(startTime));
	}
}

var hasLeft = false;

function leave() {
	if (!hasLeft) {
		// Change this to a POST method
		$.get('/' + CONFIG.roomId + '/leave', {
			sessionId: CONFIG.sessionId
		}, function (data) {
			hasLeft = true;
		}, 'json');
	}
}

function onConnect(session) {
	CONFIG.nickname = session.nickname
	CONFIG.sessionId = session.id
	
	showChat(CONFIG.nick);
	
	$(window).bind('beforeunload unload', leave);
}

function join(nickname) {
	
	$.ajax({
		cached: false,
		url: '/' + CONFIG.roomId + '/join',
		data: {
			nickname: nickname
		},
		dataType: 'json',
		error: function(data) {
			alert(data.responseText);
			showConnect();
		},
		success: onConnect
	});
	
}

function send(message) {
	// This should be POST
	$.get('/' + CONFIG.roomId + '/send', {
		sessionId: CONFIG.sessionId,
		text: message
	}, function(data) {}, 'json');
	
}

function hasFocus() {
	return $('#entry').is(':focus');
}

function receive(data) {
	if (transmissionErrors > 2) {
		showConnect();
		return;
	}
	
	if (data && data.messages) {
		for (var i in data.messages) {
			var message = data.messages[i];
			if (message.timestamp > CONFIG.lastMessageTime) {
				CONFIG.lastMessageTime = message.timestamp;
			}
			
			if (message.type == 'msg' && !hasFocus()) {
				CONFIG.unread++;
			} else if (message.type == 'joined' || message.type == 'left') {
				who();
			}
			addMessage(message.type, new Date(message.timestamp), message.nickname, message.text);
		}
		if (CONFIG.unread) {
			updateTitle();
		}
	}
	
	$.ajax({
		cache: false,
		url: '/' + CONFIG.roomId + '/receive',
		dataType: 'json',
		data: {
			since: CONFIG.lastMessageTime,
			id: CONFIG.id
		},
		error: function() {
			addMessage('error', new Date(), 'error', 'long poll error. trying again...');
			transmissionErrors += 1;
			setTimeout(receive, 10 * 1000);
		},
		success: function(data) {
			transmissionErrors = 0;
			receive(data);
		}
	});
}

function who() {
	$.get('/' + CONFIG.roomId + '/who', {}, function(data, status) {
		if (status != 'success') return;
		nicknames = data.nicknames;
		$('span', '#users').text(nicknames.length);
	}, 'json');
}

function showConnect() {

	$('#connect').show();
	$('#loading').hide();
	$('#chat').hide();
	$('#nickname').focus();

}

function showChat() {

	$('#connect').hide();
	$('#loading').hide();
	$('#chat').show();
	$('#entry').focus();
	scrollDown();
	
}

function showLoading() {

	$('#connect').hide();
	$('#chat').hide();
	$('#loading').show();
	
}

$(function() {

	$('span.timestamp', '#messages').each(function() {
		var time = parseInt($(this).text());
		var dateString = util.timeString(new Date(time));
		$(this).text(dateString);
	});
	
	startTime = new Date($('#uptime').text());
	
	updateUptime();
	receive();
	showConnect();
	
	setInterval(function() {
		updateUptime();
	}, 25 * 1000);
	
	$('#entry').mousedown(clearUnread);

	$('#talk').submit(function(e) {
		e.preventDefault();
		var $entry = $('#entry');
		var message = $entry.val();
		$entry.val('');
		
		if (message.length > 0) {
			send(message);
		}
	});
	
	$('#join').submit(function(e) {
		e.preventDefault();
		showLoading();
		var nickname = $('#nickname').val();
		join(nickname);
	});
	
	$('#users').click(function(e) {
		e.preventDefault();
		who();
		var nicknamesString = '(none)';
		if (nicknames.length > 0) {
			nicknamesString = nicknames.join(', ');
		}
		addMessage('notice', new Date(), 'users:', nicknamesString);
	});
	
	if (CONFIG.debug) {
		showChat();
	}
	
});