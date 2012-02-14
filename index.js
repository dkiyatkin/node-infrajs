/*
// передается полный путь
this.loadNJS = function (path, get, post, req, res, callback) {
	req.ROOT = this.ROOT;
	require(path).init(get, post, req, res, function(ans) {
		callback(ans);
	})
}

*/

var getInfraHtml = require('./getInfraHtml.js');
var path = require('path');
var url = require('url');

/* Возвращает страницу с status code, либо next() для статических файлов */
module.exports = function(options) {
	var prefix = options.infra;
	var Infra = require(prefix + 'core.js');
	Infra.ext(require(prefix + 'props/logger.js'));
	Infra.ext(require(prefix + 'props/events.js'));
	Infra.ext(require(prefix + 'props/load.js'));
	Infra.ext(require(prefix + 'props/check.js'));
	Infra.ext(require(prefix + 'props/compile1lvl.js'));
	Infra.ext(require(prefix + 'props/compile2lvl.js'));
	Infra.ext(require(prefix + 'props/checkLayer.js'));
	Infra.ext(require(prefix + 'props/layer.js'));
	Infra.ext(require(prefix + 'props/external.js'));
	Infra.ext(require(prefix + 'props/template.js'));
	Infra.ext(require(prefix + 'props/tools.js'));
	Infra.ext(require(options.layers));
	var _infra = Infra.init();
	var infrajs = function(req, res, next) {
		// собрать слои, если не собраны и проверить есть ли такой state
		var state = decodeURI(req.originalUrl);
		if (!url.parse(state).search) { // если есть ? значит это не к infrajs
			_infra.checkExists(state, function(exist) {
				if (exist) {
					var infra = Infra.init();
					infra.log.logger = 'DEBUG';
					getInfraHtml(infra, options.html, state, req, options.root, function(status_code, html) {
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
						} else next();
					})
				} else next();
			})
		} else next();
	}
	return infrajs
}
