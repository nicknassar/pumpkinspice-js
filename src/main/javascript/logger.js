function Logger(display) {
  var line_number;
  return {
    set_line_number: function(num)  {
      line_number = num;
    },
    clear_line_number: function() {
      line_number = undefined;
    },
    error: function(message) {
      var long_message;
      if (line_number !== undefined)
        long_message = message+" on line "+line_number;
      else
        long_message = message;
      if (window.console && window.console.error)
	window.console.error(long_message);
      display.print(long_message+"\n");
    }
  }
}
