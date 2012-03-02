var path = require('path');
exports.test_infraHtml = function(test) {
	var Mustache = require('mustache');
	var Infra = require(path.join(__dirname, '../infrajs/dist/infra.js'));
	Infra.ext(function() {
		var infra = this;
		infra.parsetpl = function(html, ctx, callback) {
			callback(Mustache.to_html(html, ctx));
		};
		infra.index = {
			tag: 'body',
			html: '123'
		};
	});
	var infrajs = require('./index.js');
	infrajs({
		root_dir: __dirname,
		index_html: '<html><head></head><body></body></html>',
		Infra: Infra,
		logger: 'DEBUG'
	});
	test.done();
};

