function SimpleCallLogger() {
    var callLog = [];

  function loggerWithName(name, retval = undefined) {
    return function() {
      var call = [name];
      for (var i=0;i<arguments.length;i++)
        call.push(arguments[i]);
      callLog.push(call);
      if (retval !== undefined)
        return retval
      else
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
