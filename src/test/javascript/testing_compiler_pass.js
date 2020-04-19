function TestingCompilerPass() {
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
    printString: loggerWithName("printString"),
    printExp: loggerWithName("printExp"),
    ifStatement: loggerWithName("ifStatement"),
    endIf: loggerWithName("endIf"),
    elseStatement: loggerWithName("elseStatement"),
    endWhile: loggerWithName("endWhile"),
    whileStatement: loggerWithName("whileStatement"),
    beginRandom: loggerWithName("beginRandom"),
    waitForMusic: loggerWithName("waitForMusic"),
    beginSubroutine: loggerWithName("beginSubroutine"),
    callSubroutine: loggerWithName("callSubroutine"),
    endSubroutine: loggerWithName("endSubroutine"),
    returnStatement: loggerWithName("returnStatement"),
    endRandom: loggerWithName("endRandom"),
    withChance: loggerWithName("withChance"),
    withEvenChance: loggerWithName("withEvenChance"),
    beginAsk: loggerWithName("beginAsk"),
    askColor: loggerWithName("askColor"),
    askBGColor: loggerWithName("askBGColor"),
    askPromptColor: loggerWithName("askPromptColor"),
    onNo: loggerWithName("onNo"),
    onYes: loggerWithName("onYes"),
    askDefault: loggerWithName("askDefault"),
    endAsk: loggerWithName("endAsk"),
    beginMenu: loggerWithName("beginMenu"),
    menuColor: loggerWithName("menuColor"),
    menuBGColor: loggerWithName("menuBGColor"),
    menuChoiceColor: loggerWithName("menuChoiceColor"),
    menuPromptColor: loggerWithName("menuPromptColor"),
    endMenu: loggerWithName("endMenu"),
    menuChoice: loggerWithName("menuChoice"),
    menuHideIf: loggerWithName("menuHideIf"),
    color: loggerWithName("color"),
    bgColor: loggerWithName("bgColor"),
    sleep: loggerWithName("sleep"),
    input: loggerWithName("input"),
    play: loggerWithName("play"),
    forStatement: loggerWithName("forStatement"),
    letStatement: loggerWithName("letStatement"),
    comment: loggerWithName("comment"),
    clear: loggerWithName("clear"),
    next: loggerWithName("next"),
    numericLiteralExpression: loggerWithName("numericLiteralExpression"),
    stringLiteralExpression: loggerWithName("stringLiteralExpression"),
    randomBuiltinExpression: loggerWithName("randomBuiltinExpression"),
    piBuiltinExpression: loggerWithName("piBuiltinExpression"),
    variableExpression: loggerWithName("variableExpression"),
    cintBuiltinExpression: loggerWithName("cintBuiltinExpression"),
    intBuiltinExpression: loggerWithName("intBuiltinExpression"),
    fixBuiltinExpression: loggerWithName("fixBuiltinExpression"),
    absBuiltinExpression: loggerWithName("absBuiltinExpression"),
    strzBuiltinExpression: loggerWithName("strzBuiltinExpression"),
    leftzBuiltinExpression: loggerWithName("leftzBuiltinExpression"),
    rightzBuiltinExpression: loggerWithName("rightzBuiltinExpression"),
    valBuiltinExpression: loggerWithName("valBuiltinExpression"),
    lenBuiltinExpression: loggerWithName("lenBuiltinExpression"),
    parenExpression: loggerWithName("parenExpression"),
    boolOrExpression: loggerWithName("boolOrExpression"),
    boolAndExpression: loggerWithName("boolAndExpression"),
    boolNotExpression: loggerWithName("boolNotExpression"),
    boolEqualExpression: loggerWithName("boolEqualExpression"),
    boolLessExpression: loggerWithName("boolLessExpression"),
    boolGreaterExpression: loggerWithName("boolGreaterExpression"),
    boolLessOrEqualExpression: loggerWithName("boolLessOrEqualExpression"),
    boolGreaterOrEqualExpression: loggerWithName("boolGreaterOrEqualExpression"),
    boolNotEqualExpression: loggerWithName("boolNotEqualExpression"),
    callSubroutineExpression: loggerWithName("callSubroutineExpression"),
    additionExpression: loggerWithName("additionExpression"),
    subtractionExpression: loggerWithName("subtractionExpression"),
    multiplicationExpression: loggerWithName("multiplicationExpression"),
    divisionExpression: loggerWithName("divisionExpression"),
    finalize: loggerWithName("finalize"),

    getLog: getLog
  };
}
