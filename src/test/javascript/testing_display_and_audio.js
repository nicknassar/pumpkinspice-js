function TestingDisplayAndAudio() {
  var callLogger = SimpleCallLogger();
  var loggerWithName = callLogger.loggerWithName;

  return {
    display: {
      getInputValue: loggerWithName("getInputValue"),
      setInputHandler: loggerWithName("setInputHandler"),
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
      clear: callLogger.clear
    },
    audio: {
      setOnAudioComplete: loggerWithName("setOnAudioComplete"),
      play: loggerWithName("play"),
      isPlaying: loggerWithName("isPlaying"),
      go: loggerWithName("go"),

      getLog: callLogger.getLog,
      clear: callLogger.clear
    }
  };
}
