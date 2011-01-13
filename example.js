require.paths.unshift('.');
var plate = require('plate');

var Mock = function() {	
};
Mock.prototype = {
	asyncOne: function(cb) {
		console.log(1);
		var that=this;
		setTimeout(function(){cb(null, that)}, 200);
	},
	asyncTwo: function(cb) {
		console.log(2);
		var that=this;
		setTimeout(function(){cb(null, that)}, 200);
	},
	asyncErr: function(cb) {
		console.log('e');
		var that=this;
		setTimeout(function(){cb(new Error('ERR'))}, 200);
	},
};

/*
new Mock().asyncOne(function(err,data) {
	if(err)
		throw err;
	data.asyncTwo(function(err, data) {
		if(err)
			throw err;
		data.asyncErr(function(err, data) {
			if(err)
				throw err;
		});
	});
});
*/

var n = new Mock();
var pn = plate(n);
pn.asyncOne().asyncTwo().asyncErr().end(function(err, result) {
	if(err)
		console.log("ERROR: "+JSON.stringify(err));
	else
		console.log("RESULT: "+result);
});
