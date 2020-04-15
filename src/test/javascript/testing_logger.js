function TestingLogger() {
  var line_number;
  var log = [];
  return {
    set_line_number: function(num)  {
      line_number = num;
    },
    clear_line_number: function() {
      line_number = undefined;
    },
    error: function(message) {
      log.push([line_number, message]);
    },
    getLog: function() {
      return log;
    }
  }
}
