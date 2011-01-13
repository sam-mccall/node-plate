var proxy = require('node-proxy');

var buildProxyHandler = function(handler) {
	return {
		enumerate: function() {
		},
		delete: function() {
		},
		fix: function() {
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
		},
		getPropertyNames: function() {
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
			if(property.substr(-1) == '$') {
				property = property.substr(0, property.length-1);
				var sync = true;
			}
			return function() {
				var args = [];
				Array.prototype.forEach.call(arguments, function(arg) {
					if(arg && typeof(arg)=='object' && arg.plate_promise__)
						arg = arg.plate_promise__;
					args.push(arg);
				});
				var invoc_promise = create_invocation_promise(promise, property, args, sync);
				return promise_proxy(invoc_promise);
			};
		},
	}));
}

function plate(obj) {
	var obj_promise = create_promise(obj);
	return promise_proxy(obj_promise);
}

function create_promise(target) {
	return {
		plate_: true,
		pending_values: [target],
		queue: [],
		notifications: [],
	};
}

function create_invocation_promise(receiver_promise, property, args, sync) {
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
	if(receiver_promise.queue.locked)
		throw new Error("Queue is locked! Did you already call end()?");
	receiver_promise.queue.push({
		receiver: receiver_promise,
		property: property,
		args: argument_promises,
		dest: this_promise,
		sync: sync,
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
	if(queue.locked)
		return error_handler(new Error("Queue is locked. Did you call end() twice?"));
	queue.locked = true;
	var head = queue.shift();
	if(!head)
		return;
	if(!head.receiver.value)
		if(head.receiver.pending_values)
			satisfy_promise(head.receiver, head.receiver.pending_values);
		else
			return error_handler(new Error("Receiver is null"));
	if(typeof(head.receiver.value[head.property]) == 'undefined')
		return error_handler(new Error("Receiver doesn't have property "+head.property));
	var property = head.receiver.value[head.property];
	if(typeof(property) != 'function') {
		satisfy_promise(head.dest, [property]);
		queue.locked = false;
		return process_queue(queue, error_handler);
	}
	var args = [];
	head.args.forEach(function(x) { args.push(x.value); });
	if(head.sync) {
		try {
			var result = property.apply(head.receiver.value, args);
		} catch (x) {
			return error_handler(x);
		}
		satisfy_promise(head.dest, [result]);
		queue.locked = false;
		return process_queue(queue, error_handler);
	} else {
		args.push(function(err) {
			if(err)
				return error_handler(err);
			var args = Array.prototype.slice.apply(arguments);
			args.shift(); // err
			satisfy_promise(head.dest, args);
			queue.locked = false;
			return process_queue(queue, error_handler);
		});
		property.apply(head.receiver.value, args);
	}
}

module.exports = plate;
