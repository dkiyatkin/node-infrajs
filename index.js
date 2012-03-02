var getInfraHtml = require('./getInfraHtml.js');
var path = require('path');
var url = require('url');

/* Возвращает страницу с status code, либо next() для статических файлов */
module.exports = function(options) {
	var _infra = options.Infra.init();
	return function(req, res, next) {
		// собрать слои, если не собраны и проверить есть ли такой state
		var state = decodeURI(req.originalUrl);
		if (!url.parse(state).search) { // если есть ? значит это не к infrajs
			_infra.checkExists(state, function(exist) {
				if (exist) {
					var infra = options.Infra.init();
					infra.log.logger = options.logger;
					getInfraHtml(infra, options.index_html, state, req, options.root_dir, function(status_code, html) {
						res.writeHead(status_code, { 'Content-Type': 'text/html' });
						res.end(html);
					});
				// проверка на последний слэш
				} else if (state.slice(-1) != '/') {
					state = state + '/';
					_infra.checkExists(state, function(exist) {
						if (exist) {
							res.writeHead(301, {"Location":req.originalUrl+'/'}); // moved permanently
							res.end();
						} else { next(); }
					});
				} else { next(); }
			});
		} else { next(); }
	};
};
