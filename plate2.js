var proxy = require('node-proxy');

var buildProxyHandler = function(handler) {
	return {
		enumerate: function() {
			console.error("enumerate: "+JSON.stringify(arguments));
		},
		delete: function() {
			console.error("delete: "+JSON.stringify(arguments));
		},
		fix: function() {
			console.error("fix: "+JSON.stringify(arguments));
		},
		getOwnPropertyDescriptor: function(property) {
			if(handler.properties && handler.properties.hasOwnProperty(property))
				return {value: handler.properties[property]};
			var result = handler.createProperty(property);
			if(typeof(result) == 'undefined')
				return;
			return { value: result };
		},
		getOwnPropertyNames: function() {
			console.error("getOwnPropertynames: "+JSON.stringify(arguments));
		},
		getPropertyNames: function() {
			console.error("getPropertynames: "+JSON.stringify(arguments));
		},
	};
};

function promise_proxy(promise) {
	return proxy.create(buildProxyHandler({
		properties: {
			deliver: function(notification) {
				add_notification(promise, notification);
				return this;
			},
			end: function(handler) {
				if(handler) {
					this.deliver(function() {
						var args = Array.prototype.slice.apply(arguments);
						args.unshift(null);
						handler.apply(null, args);
					});
					process_queue(promise.queue, handler);
				} else {
					process_queue(promise.queue, function(err) { throw err; });
				}
			},
			toString: function() {
				return "(Promise)";
			},
			plate_promise__: promise,
		},
		createProperty: function(property) {
			return function() {
				var args = [];
				Array.prototype.forEach.call(arguments, function(arg) {
					if(arg && typeof(arg)=='object' && arg.plate_promise__)
						arg = arg.plate_promise__;
					args.push(arg);
				});
				var invoc_promise = create_invocation_promise(promise, property, args);
				return promise_proxy(invoc_promise);
			};
		},
	}));
}

function plate(obj) {
	var obj_promise = create_promise(obj);
	return promise_proxy(obj_promise);
}


function Mock(){
        this.history = [];
};
Mock.prototype = {
        asyncReturningSelf: function(cb) {
                this.history.push('asyncReturningSelf');
                var that=this;
                setTimeout(function() {
                        cb(null, that);
                }, 25);
        },
        asyncReturningNew: function(cb) {
                this.history.push('asyncReturningNew');
                setTimeout(function() {
                        cb(null, new Mock());
                }, 25);
        },
        asyncReturningValue: function(value, timeout, cb) {
                this.history.push('asyncReturningValue '+value);
                setTimeout(function() {
                        cb(null, value);
                }, timeout);
        },
	asyncPrintingArg: function(value, cb) {
		console.log("asyncPrintingArg");
		console.log(value);
		setTimeout(function() { cb(); }, 25);
	},
};


function create_promise(target) {
	return {
		plate_: true,
		pending_values: [target],
		queue: [],
		notifications: [],
	};
}

function create_invocation_promise(receiver_promise, property, args) {
	var argument_promises = [];
	args.forEach(function(arg) {
		if(!arg || typeof(arg) != 'object' || !arg.plate_) // literal
			arg = {value: arg, queue: receiver_promise.queue, plate_: true, notifications: []};
		if(arg.queue != receiver_promise.queue)
			throw new Error("Mixing separate plates is not currently supported");
		argument_promises.push(arg);
	});
	var this_promise = {
		plate_: true,
		queue: receiver_promise.queue,
		notifications: [],
	};
	receiver_promise.queue.push({
		receiver: receiver_promise,
		property: property,
		args: argument_promises,
		dest: this_promise,
	});
	return this_promise;
};

function add_notification(receiver_promise, cb) {
	receiver_promise.notifications.push(cb);
}

function satisfy_promise(promise, values) {
	promise.value = values[0];
	promise.notifications.forEach(function(notification) {
		notification.apply(null, values);
	});
}

function process_queue(queue, error_handler) {
	var head = queue.shift();
//	console.log("Processing:");
//	console.log(head);
	if(!head)
		return;
	if(!head.receiver.value)
		if(head.receiver.pending_values)
			satisfy_promise(head.receiver, head.receiver.pending_values);
		else
			return error_handler("Receiver is null");
	if(typeof(head.receiver.value[head.property]) == 'undefined')
		return error_handler("Receiver doesn't have property "+head.property);
	var property = head.receiver.value[head.property];
	if(typeof(property) != 'function')
		return error_handler("Receiver property is not a function");
	var args = [];
	head.args.forEach(function(x) { args.push(x.value); });
	args.push(function(err) {
		if(err)
			return error_handler(err);
		var args = Array.prototype.slice.apply(arguments);
		args.shift(); // err
		satisfy_promise(head.dest, args);
		return process_queue(queue, error_handler);
	});
	property.apply(head.receiver.value, args);
}

/*
var m = new Mock();

var pm = create_promise(m); // pm = plate(m);
var t1 = create_invocation_promise(pm, 'asyncReturningNew', []); // var t1 = pm.asyncReturningNew()
var t2 = create_invocation_promise(t1, 'asyncReturningSelf', []); // var t2 = t1.asyncReturningSelf()
var t3 = create_invocation_promise(t2, 'asyncReturningSelf', []); // var t3 = t2.asyncReturningSelf()
add_notification(t3, function(value) {
	console.log("GOT t3 value");
	console.log(value);
});
add_notification(t1, function(value) {
	console.log("GOT t1 value");
	console.log(value);
});
add_notification(pm, function(value) {
	console.log("GOT pm value");
	console.log(value);
});
process_queue(t2.queue, function(err) { 
	console.log(err);
	throw err; 
}); // t3.end(function(err){})


var m2 = new Mock();
var pm2 = plate(m2);
pm2
.deliver(function(){console.log("pm2!")})
.asyncReturningNew()
.deliver(function(){console.log("t22");})
.asyncReturningSelf()
.asyncReturningSelf()
.deliver(function(){console.log("t23");})
.end();
*/

module.exports = plate;
