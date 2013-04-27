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
 * Assert that a particular event is fired at the specified target (or
 * one of its event target children, so that it bubbles up the evcent chain)
 * by a function call. It does this by listening on the target for the
 * specified event type, which may have side effects and may prevent other
 * event handlers from running. Another event handler may also intercept
 * the event first, preventing us from receiving it.
 * 
 * @param {goog.events.EventTarget} target The object on which to listen
 * for the event.
 * @param {string} type The type of the expected event. This is required
 * to listen for an event.
 * @param {Function eventing_callback The function which should fire the event.
 * @param {string=} opt_message The message to display if the event is not
 * fired and <code>opt_continue_if_exception_not_thrown</code> is true.
 * @param {boolean=} Don't fail the test if the specified event is not
 * thrown, but return <code>null</code> instead. This provides a convenient
 * way to temporarily listen for events, although side-effects are possible.
 * @return {goog.events.Event} the captured Event object for further testing,
 * or <code>null</code> if it was not received and
 * <code>opt_continue_if_exception_not_thrown</code> is <code>true</code>.
 */
com.qwirx.test.assertEvent = function(target, type, eventing_callback,
	opt_message, opt_continue_if_exception_not_thrown)
{
	goog.asserts.assertString(type, "You should pass the event's " +
		".type property to assertEvent(), not a class constructor.");
	
	var thrown = null;
	goog.events.listenOnce(target, type,
		function(event)
		{
			thrown = event;
			return false; // handle the event
		});
	eventing_callback();
	
	if (!opt_continue_if_exception_not_thrown)
	{
		var message = opt_message ? (opt_message + ": ") : "";
		message += "Expected " + type + " event was not thrown at " + target;
		assertNotNull(message, thrown);
	}
	
	return thrown;
}
