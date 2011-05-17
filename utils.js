this.trim = function(stringToTrim) {
	return stringToTrim.replace(/^\s+|\s+$/g, '');
};

this.ltrim = function(stringToTrim) {
	return stringToTrim.replace(/^\s+/, '');
};

this.rtrim = function(stringToTrim) {
	return stringToTrim.replace(/\s+$/, '');
};

this.urlRE = /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s]*(\?\S+)?)?)?/g,

this.escape = function(inputHtml) {
	inputHtml = inputHtml.toString();
	return inputHtml.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
};

this.zeroPad = function(digits, n) {
	n = n.toString();
	while (n.length < digits) {
		n = '0' + n;
	}
	return n;
};

this.timeString = function(date) {
	var minutes = date.getMinutes().toString();
	var hours = date.getHours().toString();
	return this.zeroPad(2, hours) + ':' + this.zeroPad(2, minutes);
};

this.isBlank = function(text) {
	var blank = /^\s*$/;
	return (text.match(blank) !== null);
};