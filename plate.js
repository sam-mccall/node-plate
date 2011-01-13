var proxy = require('node-proxy');

var plate_handler = function(target) {
	var queue = [];
	function tick(target, cb) {
		var next = queue.shift();
		if(!next) {
			cb(null, target);
			return;
		}
		next(target, function(err, data) {
			if(err)
				cb(err);
			else
				tick(data, cb);
		});
	}
	var properties = {
		receiver: function(){ console.log('boo'); },
		end: function(cb) {
			tick(target, cb);
		},
	};
	
	return {
		enumerate: function() {
			console.log("enumerate: "+JSON.stringify(arguments));
		},
		delete: function() {
			console.log("delete: "+arguments);		
		},
		fix: function() {
			console.log("fix: "+arguments);
		},
		getOwnPropertyDescriptor: function(property) {
			if(typeof(properties[property]) != 'undefined') {
				return {
					value: properties[property],
				};
			}
			var that = this;
			var value = function() {
				var args = Array.prototype.slice.apply(arguments);
				queue.push(function(top, callback) {
					args.push(callback);
					if(typeof(top[property]) == 'function')
						top[property].apply(top, args);
					else if(typeof(top[property]) == 'undefined')
						callback(new Error("Object has no method/property "+property));
					else
						callback(null, top[property]);
				});
				return that;
			};
			
			return {
				value: value,
			};
		},
		getOwnPropertyNames: function() {
			console.log("getOwnPropertyNames: "+arguments);				
		},
		getPropertyNames: function() {
			console.log("getPropertyNames: "+arguments);			
		},
	};
};

var plate = function(target) {
	return proxy.create(new plate_handler(target));
};

module.exports = plate;
