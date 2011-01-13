var assert = require('assert');
var plate = require (__dirname+'/plate');

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
};

exports.simple = function() {
	// normal style
	var m1 = new Mock();
	var t1 = setTimeout(function() { assert.fail('never called back'); }, 100);
	m1.asyncReturningSelf(function(err, data) {
		clearTimeout(t1);
		assert.equal(err, null);
		assert.ok(data);
		assert.deepEqual(m1.history, ['asyncReturningSelf']);
	});

	// plate style
	var m2 = new Mock();
	var pm2 = plate(m2);
	var t2 = setTimeout(function() { assert.fail('never called back'); }, 100);
	pm2.asyncReturningSelf().end(function(err, data) {
		clearTimeout(t2);
		assert.equal(err, null);
		assert.ok(data);
		assert.deepEqual(m2.history, ['asyncReturningSelf']);
	});
};

exports.chain = function() {
	// normal style
	var m1 = new Mock();
	var t1 = setTimeout(function() { assert.fail('never reached end'); }, 100);
	m1.asyncReturningNew(function(err, m2) {
		assert.equal(err, null);
		assert.ok(m2);
		assert.notEqual(m1, m2);
		assert.deepEqual(m1.history, ['asyncReturningNew']);
		assert.deepEqual(m2.history, []);
		m2.asyncReturningSelf(function(err, m3) {
			clearTimeout(t1);
			assert.equal(err, null);
			assert.ok(m3);
			assert.equal(m3, m2);
			assert.deepEqual(m2.history, ['asyncReturningSelf']);
		});
	});

	// plate style
	var n1 = new Mock();
	var t2 = setTimeout(function() { assert.fail('never reached end'); }, 100);
	var pn1 = plate(n1);
	pn1.asyncReturningNew().asyncReturningSelf().end(function(err, n2) {
		clearTimeout(t2);
		assert.equal(err, null);
		assert.ok(n2);
		assert.notEqual(n1, n2);
		assert.deepEqual(n1.history, ['asyncReturningNew']);
		assert.deepEqual(n2.history, ['asyncReturningSelf']);
	});
};

exports.sequence = function() {
	// normal style
	var t1 = setTimeout(function() { assert.fail('never reached end'); }, 500);
	var m1 = new Mock();
	m1.asyncReturningValue(1, 100, function(err, val1) { // first call is slower to make sure we're sync
		assert.equal(err, null);
		assert.equal(val1, 1);
		assert.deepEqual(m1.history, ['asyncReturningValue 1']);
		m1.asyncReturningValue(2, 50, function(err, val1) {
			clearTimeout(t1);
			assert.equal(err, null);
			assert.equal(val1, 2);
			assert.deepEqual(m1.history, ['asyncReturningValue 1', 'asyncReturningValue 2']);
		});
	});

	// plate style
	var t2 = setTimeout(function() { assert.fail('never reached end'); }, 500);
	var t3 = setTimeout(function() { assert.fail('never delivered value1'); }, 500);
	var t4 = setTimeout(function() { assert.fail('never delivered value2'); }, 500);
	var m2 = new Mock();
	var pm2 = plate(m2);
	pm2.asyncReturningValue(1, 100).deliver(function(value){
		clearTimeout(t3);
		assert.equal(value, 1);
	});
	pm2.asyncReturningValue(2, 50).deliver(function(value){
		clearTimeout(t4);
		assert.equal(value, 2);
	});
	pm2.end(function(err) {
		assert.equal(err, null);
		clearTimeout(t2);
	});
};
