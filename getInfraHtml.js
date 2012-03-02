var fs = require("fs");
var path = require("path");
var url = require("url");
var request = require('request');
var htmlparser = require("htmlparser");
require('fibers');
var emptyTags = [];
for (var prop in htmlparser.DefaultHandler._emptyTags) if (htmlparser.DefaultHandler._emptyTags.hasOwnProperty(prop)) {
	emptyTags.push(prop);
}

var innerHTML = function(html, parent_elem, dom) {
	var _innerHTML = function(dom, dom2) {
		for (var i = dom.length; --i >= 0;) {
			var val = dom[i];
			if (val == parent_elem) {
				val.children = dom2
				return true
			}
			if (val.children) _innerHTML(val.children, dom2);
		}
	}
	if (emptyTags.indexOf(parent_elem.name) == -1) {
		var handler = new htmlparser.DefaultHandler(function (err, dom2) {
			if (err) {
				console.log(err);
				dom2 = [];
			}
			_innerHTML(dom, dom2);
		});
		var parser = new htmlparser.Parser(handler);
		parser.parseComplete(html);
	}
}

/* Возвращает массив true/false для соответсвующих показанных/непоказанных слоев */
var getShownLayers = function(layers) {
	var shown_layers = [];
	for (var i = layers.length; --i >= 0;) {
		shown_layers[i] = layers[i].show;
	}
	return shown_layers;
}

var appendChild = function(elem, parent_elem, dom) {
	var _appendChild = function(dom) {
		for (var i = dom.length; --i >= 0;) {
			var val = dom[i];
			if (val == parent_elem) {
				if (val.children) val.children.push(elem);
				else val.children = [elem];
				return true;
			}
			if (val.children) _appendChild(val.children);
		}
	}
	if (emptyTags.indexOf(parent_elem.name) == -1) {
		_appendChild(dom);
	}
}

/* Возвращает html сделанные из dom htmlparser'а */
var createHtml = function(dom) {
	var HTML5 = '';
	var _create = function(dom) {
		for (var i = dom.length; --i >= 0;) {
			var val = dom[i];
			switch (val.type) {
				case 'text':
					HTML5 = val.raw + HTML5;
					break;
				case "tag":
					if (emptyTags.indexOf(val.name) == -1) {
						HTML5 = '</' + val.name + '>' + HTML5;
						if (val.children) _create(val.children);
						HTML5 = '<' + val.raw + '>' + HTML5;
					} else {
						HTML5 = '<' + val.raw + '>' + HTML5;
					}
					break;
				case "script":
				case "style":
					HTML5 = '</' + val.name + '>' + HTML5;
					if (val.children) _create(val.children);
					HTML5 = '<' + val.raw + '>' + HTML5;
					break;
				case "comment":
					HTML5 = '<!--' + val.raw + '-->' + HTML5;
					break;
				case 'directive':
					HTML5 = '<' + val.raw + '>' + HTML5;
					break;
			}
		}
	}
	_create(dom);
	return HTML5;
}
module.exports = function(infra, html, state, req, root, cb) {
	var host = req.headers.host;
	infra.state = state;
	var handler = new htmlparser.DefaultHandler(function (error, dom) {
		if (error) throw error;
		infra.eqLayerNodes = function(node1, node2) {
			if (infra.existLayerNode(node1) && infra.existLayerNode(node2)) {
				var i = node1.length;
				if (i && (i == node2.length)) {
					for (; --i >= 0;) {
						if (node1[i] != node2[i]) return false;
					}
					return true
				} else if (node1 == node2) return true
			}
		}
		infra.pasteNode = function(node, htmlString) {
			if (node.length) {
				for (var n=0, ll=node.length; n<ll; n++) {
					innerHTML(htmlString, node[n], dom);
				}
			} else {
				innerHTML(htmlString, node, dom);
			}
		};
		infra.load._load = function(file, callback) {
			var writeHead = function(){};
			var end = function(data){callback(0,data)};
			var path_url = url.parse(encodeURI(file), true);
			path_url.pathname = decodeURI(path_url.pathname);
			//path_url.href = decodeURI(path_url.href);
			path_url.search = decodeURI(path_url.search);
			var njs = new RegExp('([^/]+/node-[^/]+/[^/]+\.js)|(/[^/]+\.njs)$').test(path_url.pathname);
			if (path_url.host || (!njs && path_url.search)) { // загружаем через веб
				if (!path_url.host) {
					if (path_url.href[0] != '/') path_url.href = path.join(encodeURI(state), path_url.href);
					path_url.href = 'http://' + host + path_url.href
				}
				request({ url: path_url.href, timeout: 60000 }, function(error, response, body) {
					if (!error && response.statusCode == 200) {
						callback(0, body);
					} else {
						console.log('load error', error, response?response.statusCode:'', file);
						callback(0, '');
					}
				})
			} else { // читаем файл
				var filename = path.join(root, path_url.pathname);
				if (new RegExp('^'+root).test(filename)) {
					if (njs) {
						try {
							req.query = path_url.query;
							Fiber(function() {
								require(filename).init(req, {writeHead:writeHead, end:end}, null, root);
							}).run();
						} catch(e) {
							console.log('wrong njs ' + filename + ' ' + e);
							callback(0, '');
						}
					} else {
						fs.readFile(filename, 'utf-8', function(err, data) {
							callback(err, data);
						})
					}
				} else {
					console.log('wrong root path')
					callback(0, '');
				}
			}
		}
		infra.getLayerNode = function(layer, parent_element) {
			if (!parent_element) parent_element = dom;
			var tag = layer.tag;
			if (!tag) {
				infra.log.warning('error set node, where layer.state ' + layer.state);
				return
			}
			var node = false;
			var selector = tag.slice(1);
			if (tag[0] == '#') {
				if (parent_element == dom) node = htmlparser.DomUtils.getElementById(selector, dom);
				else {
					var child_elements = htmlparser.DomUtils.getElements({ tag_name: function(value) { return value; } }, parent_element);
					for (var i = child_elements.length; --i >= 0;) {
						if (child_elements[i].attribs && (selector == child_elements[i].attribs.id)) node = child_elements[i];
					}
				}
			} else if (tag[0] == '.') {
				node = htmlparser.DomUtils.getElementsByClassName(selector, parent_element);
			} else {
				node = htmlparser.DomUtils.getElementsByTagName(tag, parent_element);
			}
			return node;
		};
		infra.once('end', function() {
			// вставить собранный кэш
			var server_cache = JSON.stringify(infra.load.cache).replace(/\//gim, '\\/');
			//server_cache = server_cache.replace(/\\\//gim, '/')
			var head = htmlparser.DomUtils.getElementsByTagName('head', dom);
			var script = {
				raw: 'script id="infra_server_cache" type="text/javascript"', type: 'script',
				attribs: { id: 'infra_server_cache', type: 'text/javascript' },
				children: [ {
					raw: 'if (window.Infra) { Infra.server = {}; Infra.server.showns = ' + JSON.stringify(getShownLayers(infra.layers)) + ';Infra.server.cache = '+server_cache + ' }',
					type: 'text' } ]
			}
			script.data = script.raw;
			script.name = script.type;
			script.children[0].data = script.children[0].raw;
			appendChild(script, head[0], dom);
			if (infra.title) { innerHTML(infra.title, htmlparser.DomUtils.getElementsByTagName('title', dom)[0], dom); }
			// определить status_code
			if (!infra.status_code) infra.status_code = 200;
			// передать страницу
			cb(infra.status_code, createHtml(dom));
		})
		infra.check(false, 10);
	})
	var parser = new htmlparser.Parser(handler);
	parser.parseComplete(html);
}
