var infraHtml = require('./index.js');

exports.test_infraHtml = function(test) {
	var Index = function() {
		return {};
	}
	var HTML = '<html></html>';
	var url_path = '/';
	var req = {
		ROOT: __dirname + '/../../'
	};
	infraHtml.getInfraHtml(HTML, Index, url_path, req, function(err, html) {
		if (err) {
			test.ok(!false, err);
		} else {
			console.log(html);
		}
		test.done();
	}, '../../infra/core/', true);
}
