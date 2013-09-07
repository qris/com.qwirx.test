goog.provide('com.qwirx.test.assertThrows');
goog.provide('com.qwirx.test.assertInstanceof');

goog.require('goog.testing.asserts');
goog.require('goog.debug.reflect');

/**
 * Modified {assertThrows} that checks the type of the exception.
 *
 * @param {function} type The type (class) of exception expected.
 *
 * @param {function=} func the function expected to throw the 
 * exception.
 *
 * @param {string=} opt_comment Failure message (optional).
 * 
 * @return {*} The error thrown by the function.
 */
com.qwirx.test.assertThrows = function(type, func, opt_comment)
{
	_assert(opt_comment, typeof func == 'function',
		'Argument passed to assertThrows is not a function');
	
	if (opt_comment)
	{
		goog.asserts.assertString(opt_comment,
			'Third argument passed to assertThrows is not a string');
	}
	
	var exception;
	if (opt_comment)
	{
		exception = assertThrows(opt_comment, func);
	}
	else
	{
		exception = assertThrows(func);
	}

	// com.qwirx.test.assertInstanceof(exception, type, opt_comment);
	
	if (exception instanceof type)
	{
		return exception;
	}
	else
	{
		throw exception;
	}	
};

/**
 * Checks if the value is an instance of the user-defined type if
 * goog.asserts.ENABLE_ASSERTS is true.
 *
 * The compiler may tighten the type returned by this function.
 *
 * @param {*} value The value to check.
 * @param {!Function} type A user-defined constructor.
 * @param {string=} opt_message Error message in case of failure.
 * @param {...*} var_args The items to substitute into the failure message.
 * @throws {goog.asserts.AssertionError} When the value is not an instance of
 *     type.
 * @return {!Object}
 */
com.qwirx.test.assertInstanceof = function(actual_value, expected_type,
	opt_message, var_args)
{
	goog.debug.reflect.init_();
	goog.debug.reflect.registerType_('TypeError', TypeError);

	if (goog.asserts.ENABLE_ASSERTS &&
		!(actual_value instanceof expected_type))
	{
		var detailed_message = goog.testing.asserts.getDefaultErrorMsg_(
			expected_type, goog.debug.reflect.typeOf(actual_value));
		goog.asserts.doAssertFailure_(
			'instanceof check failed: ' + detailed_message, null,	
			opt_message + ': ' + detailed_message,
			Array.prototype.slice.call(arguments, 3));
	}
	
	return /** @type {!Object} */(value);
};

/**
 * Pass a block of code that takes a callback function c as its only
 * parameter, and passes that to the async method. If c is not called,
 * the assertion fails. Note that it assumes that the async method
 * will call the callback synchronously, in the same thread, e.g.
 * because it has been mocked to do so! So it's not a fully async test.
 * 
 * @param {Function} f A code block to call with a single parameter, c.
 * The block must do something to ensure that c is called. It would normally
 * pass c as a callback parameter to a pseudo-asynchronous functions.
 * @return {*} The array of arguments passed to the callback, c.
 */
com.qwirx.test.assertCallback = function(f)
{
	var calledBack = false;
	var result;
	
	function c()
	{
		calledBack = true;
		result = arguments;
	}
	
	f(c);
	
	assertTrue("Callback was not called as expected", calledBack);
	return result;
}

/**
 * Assert that particular event(s) are fired at the specified target (or
 * one of its event target children, so that they bubbles up the event chain)
 * by a function call. It does this by listening on the target for the
 * specified event types, which may have side effects and may prevent other
 * event handlers from running. Another event handler may also intercept
 * the events first, preventing us from receiving them.
 * 
 * @param {goog.events.EventTarget} target The object on which to listen
 * for the event.
 * @param {string|Array<string>} type The type(s) of the expected event(s).
 * This is required to listen for event(s).
 * @param {function eventing_callback The function which should fire the event.
 * @param {string=} opt_message The message to display if the event is not
 * fired and <code>opt_continue_if_events_not_sent</code> is false.
 * @param {boolean=} opt_continue_if_events_not_sent Don't fail the test if
 * the specified event(s) are not thrown, but return <code>null</code>
 * instead. This provides a convenient way to temporarily listen for events,
 * although side-effects are possible.
 * @param {function=} opt_eventHandler An optional callback that receives
 * each event and can process it. If none is supplied, the handler 
 * @return {goog.events.Event} the array of captured Event objects for
 * further testing, if all were received or
 * <code>opt_continue_if_events_not_sent</code> is <code>true</code>.
 */
com.qwirx.test.assertEvents = function(target, types, eventing_callback,
	opt_message, opt_continue_if_events_not_sent, opt_eventHandler)
{
	goog.asserts.assertArray(types, "You should pass an array of event " +
		"type strings to assertEvents(), not class constructors.");
	goog.asserts.assert(types.length > 0, "You should pass a non-empty " +
		"array of event type strings to assertEvents()");
	
	if (opt_eventHandler)
	{
		goog.asserts.assertFunction(opt_eventHandler, "You should pass " +
			"an event handler function to assertEvents(), or nothing");
	}
	
	var eventMap = {};
	var all_events_captured = [];
	
	for (var i = 0; i < types.length; i++)
	{
		goog.asserts.assertString(types[i], "You should pass the event's " +
			".type property (sting value) to assertEvents(), not a " +
			"class constructor.");
		var key = goog.events.listen(target, types[i],
			function(event)
			{
				var info = eventMap[event.type];
				info.captured.push(event);
				all_events_captured.push(event);
				
				if (opt_eventHandler)
				{
					return opt_eventHandler(event);
				}
				else
				{
					return true;
				}
			});
		eventMap[types[i]] = {
			key: key,
			captured: []
		};
	}
	
	eventing_callback();
	
	for (var i = 0; i < types.length; i++)
	{
		var info = eventMap[types[i]];
		goog.events.unlistenByKey(info.key);
	}
	
	if (!opt_continue_if_events_not_sent)
	{
		for (var i = 0; i < types.length; i++)
		{
			var info = eventMap[types[i]];
			var message = opt_message ? (opt_message + ": ") : "";
			message += "Expected " + types[i] + " event was not thrown " +
				"at " + target;
			assertObjectNotEquals(message, [], info.captured);
		}
	}
	
	return all_events_captured;
}

/**
 * @param {number} a The number that should be greater than <code>b</code>.
 * @param {number} b The number that should be less than <code>a</code>.
 * @param {string} comment The message if the assertion fails
 */
com.qwirx.test.assertGreaterThan = function(a, b, comment)
{
	_validateArguments(3, arguments);
	goog.asserts.assertNumber(a, 'Bad argument to assertGreaterThan' +
		'(number, number, string)');
	goog.asserts.assertNumber(b, 'Bad argument to assertGreaterThan' +
		'(number, number, string)');
	goog.asserts.assertString(comment, 'Bad argument to assertGreaterThan' +
		'(number, number, string)');
	assertTrue(comment, a > b);
};

/**
 * Compares two arrays, or array-like objects, ignoring negative indexes
 * and extra properties on the array objects. Use case: HTMLCollection is
 * array-like, but it's a pain to call slice on it every time just to compare
 * it with a real array. {@link assertObjectEquals} doesn't work either.
 * @param {*} a The expected array (2 args) or the debug message (3 args).
 * @param {*} b The actual array (2 args) or the expected array (3 args).
 * @param {*=} opt_c The actual array (3 args only).
 */
com.qwirx.test.assertArrayEquals = function(a, b, opt_c)
{
	_validateArguments(2, arguments);
	var v1 = nonCommentArg(1, 2, arguments);
	var v2 = nonCommentArg(2, 2, arguments);
	var failureMessage = commentArg(2, arguments) ? commentArg(2, arguments) : '';

	var typeOfVar1 = _trueTypeOf(v1);
	_assert(failureMessage,
		'length' in v1,
		'Expected an array for assertArrayEquals but found a ' + typeOfVar1);

	var typeOfVar2 = _trueTypeOf(v2);
	_assert(failureMessage,
		'length' in v2,
		'Expected an array for assertArrayEquals but found a ' + typeOfVar2);

	assertObjectEquals(failureMessage,
		Array.prototype.slice.call(v1, 0), Array.prototype.slice.call(v2, 0));
};

/**
 * Compares two values, asserting that one is greater than the other.
 * Generates a more useful message on failure than assertTrue.
 * @param {*} greater The expected greater value.
 * @param {*} lesser The expected lesser value.
 * @param {*=} opt_comment The debug message.
 */
com.qwirx.test.assertGreaterThan = function(greater, lesser, opt_comment)
{
	var msg = 'Expected ' + _displayStringForValue(greater) + ' to be ' +
		'greater than ' + _displayStringForValue(lesser);
	_assert(opt_comment, greater > lesser, msg)
};

/**
 * Compares two values, asserting that one is greater than the other.
 * Generates a more useful message on failure than assertTrue.
 * @param {*} greater The expected greater value.
 * @param {*} lesser The expected lesser value.
 * @param {*=} opt_comment The debug message.
 */
com.qwirx.test.assertGreaterThanOrEqual = function(greater, lesser, opt_comment)
{
	var msg = 'Expected ' + _displayStringForValue(greater) + ' to be ' +
		'greater than or equal to ' + _displayStringForValue(lesser);
	_assert(opt_comment, greater >= lesser, msg)
};
