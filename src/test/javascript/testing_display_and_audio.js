function TestingDisplayAndAudio() {
  var callLogger = SimpleCallLogger();
  var loggerWithName = callLogger.loggerWithName;
  var inputValue = "";
  var inputHandlerLogger = loggerWithName("setInputHandler");
  var inputHandler =  function(){};

  var getInputValueLogger = loggerWithName("getInputValue");


  function setInputHandler(f) {
    inputHandlerLogger(f);
    inputHandler = f;
  }

  function getInputValue() {
    getInputValueLogger();
    return inputValue;
  }

  function setInputAndRunHandler(input, onComplete) {
    inputValue = input;
    window.setTimeout(function() {
      inputHandler();
      onComplete();
    }, 0);
  }

  return {
    display: {
      _setInputAndRunHandler: setInputAndRunHandler,
      getInputValue: getInputValue,
      setInputHandler: setInputHandler,
      sendQuietBlockElementUpdates: loggerWithName("sendQuietBlockElementUpdates"),
      sendUpdates: loggerWithName("sendUpdates"),
      clear: loggerWithName("clear"),
      print: loggerWithName("print"),
      printAsk: loggerWithName("printAsk"),
      scroll: loggerWithName("scroll"),
      printMenu: loggerWithName("printMenu"),
      clearMenu: loggerWithName("clearMenu"),
      setColor: loggerWithName("setColor"),
      setBGColor: loggerWithName("setBGColor"),

      getLog: callLogger.getLog,
      clearLog: callLogger.clearLog
    },
    audio: {
      setOnAudioComplete: loggerWithName("setOnAudioComplete"),
      play: loggerWithName("play"),
      isPlaying: loggerWithName("isPlaying"),
      go: loggerWithName("go"),

      getLog: callLogger.getLog,
      clearLog: callLogger.clearLog
    }
  };
}
