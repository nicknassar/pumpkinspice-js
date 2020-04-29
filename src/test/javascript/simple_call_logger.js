function SimpleCallLogger() {
    var callLog = [];

  function loggerWithName(name) {
    return function() {
      var call = [name];
      for (var i=0;i<arguments.length;i++)
        call.push(arguments[i]);
      callLog.push(call);
      return callLog.length-1;
    }
  }

  function getLog() {
    return callLog;
  }

  return {
    loggerWithName: loggerWithName,
    getLog: getLog
  };
}
