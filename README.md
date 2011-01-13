= Plate =

Plate lets you write less callbacks.

== Work in progress! ==

These examples show where it's going, not what it does currently!

Currently, method chaining works, but the other stuff is coming. Also maybe some more flexible error handling rather than all errors at the end.

== Introduction ==

The convention in node.js is that an asynchronous library function takes a callback as its last parameter.
When it finishes, it invokes this callback - the first parameter is the error, and the rest are the data.

This is powerful:
    fs.readFile('/etc/passwd', function(err, data) {
    	if(err) throw err;
    	console.log(data);
    });

But quickly becomes verbose and tangled:
    fs.readFile('/etc/passwd', function(err, data) [
    	if(err) throw err;
    	fs.writeFile('/etc/passwd.bak', data, function(err) {
    		if(err throw err);
    		console.log("It's saved");
    	}
    }

What about this:
    var pfs = plate(fs);
    pfs.writeFile('/etc/passwd.bak', pfs.readFile('/etc/passwd'));
    pfs.end(function(err) { 
    	if(err) throw err; 
    	console.log("It's saved");
    });

Another example: method chaining.

Before:
    var thing = new Thing();
    thing.asyncOne(function(err, data) {
    	if(err) throw err;
    	data.asyncTwo(function(err) {
    		if(err) throw err;
    		console.log("Success");
    	}
    }

After:
    var pthing = plate(new Thing());
    thing.asyncOne().asyncTwo().end(function(err) {
    	if(err) throw err;
    	console.log("Success");
    });
