# Plate

Plate lets you write less callbacks.

## Introduction 

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
    	data.asyncTwo(function(err, result) {
    		if(err) throw err;
    		console.log("Success: "+result);
    	}
    }

After:
    var pthing = plate(new Thing());
    thing.asyncOne().asyncTwo().end(function(err, result) {
    	if(err) throw err;
    	console.log("Success: result");
    });

## How it works

The things returned by plate, and subsequent method calls, are basically promises. 

Things will be done to the actual objects in the same order as you do things to the promises.

If a function invoked on a promise takes another promise as a parameter, the value will be passed instead.

## API

### plate(obj)

Returns: a promise for obj

### promise.foo(args...)

Adds promise.foo(args...) to the queue. Args can be promises (from the same queue), or any other values.

The actual call made will be &lt;promise>;.foo(&lt;args...>, cb) where &lt;promise> is the value of promise, &lt;args> is args with all promises evaluated, and cb is a node-style callback.

If you pass an error to cb, further execution will be skipped and the error will be handled.

Returns: a promise for the first return value (i.e. the second argument passed to cb).

### promise.deliver(func)

Registers a listener, when the value(s) for the promise is available, func will be called with the values as arguments.

Func will not be called if the promise doesn't get a value because an earlier invocation raises an error.

Returns: promise (for chaining)

### promise.end(cb)

Starts the queue. This must only be done once per queue (i.e per call to plate()).

Upon completion, cb will be called. If there was an error, it will be the first argument. 
Otherwise the first argument is null, and the second argument is the value of this promise.

Returns: undefined.

## Limitations

This works: 
    var pthing = plate(new Thing());
    var derivedValue = pthing.getValue();
    pthing.doSomething(derivedValue); // passes the actual value, not the promise

This can never work:
    console.log(derivedValue); // passes the promise

This doesn't either, but maybe one day:
    var pconsole = plate(console); // each call to plate() creates an independent queue
    pconsole.log(derivedValue);    // you can't mix promises from different queues

This doesn't work but will real soon:
    var pobj = plate({a:'a'});
    pobj.a().end(function(err, value) { console.log(value); });
    // note pobj.a() not .a - we can't tell in advance that it's a field not a function
