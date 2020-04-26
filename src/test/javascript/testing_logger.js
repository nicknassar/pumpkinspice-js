function TestingLogger() {
  var lineNumber;
  var log = [];
  return {
    setLineNumber: function(num)  {
      lineNumber = num;
    },
    clearLineNumber: function() {
      lineNumber = undefined;
    },
    error: function(message) {
      log.push([lineNumber, message]);
    },
    getLog: function() {
      return log;
    }
  }
}
