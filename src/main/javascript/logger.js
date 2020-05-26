function Logger(display) {
  // Simple error logger

  // The convention is that when a function encounters an error, it
  // logs it and returns null or false (depending on whether the
  // expected result is an object or success/failure). When a function
  // encounters a null or false return value from another pumpkinspice
  // function, it knows that the error has already been logged and
  // returns null or false without additional logging.
  var lineNumber;
  return {
    setLineNumber: function(num)  {
      lineNumber = num;
    },
    clearLineNumber: function() {
      lineNumber = undefined;
    },
    error: function(message) {
      var longMessage;
      if (lineNumber !== undefined)
        longMessage = message+" on line "+lineNumber;
      else
        longMessage = message;
      if (window.console && window.console.error)
	window.console.error(longMessage);
      display.print(longMessage+"\n");
    }
  }
}
