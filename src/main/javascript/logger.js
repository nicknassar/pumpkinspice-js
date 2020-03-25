function Logger(display) {
  return {
    error: function(message) {
      if (window.console && window.console.error)
	window.console.error(message);
      display.print(message);
    }
  }
}
