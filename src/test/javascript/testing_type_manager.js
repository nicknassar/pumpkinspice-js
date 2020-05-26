function TestingTypeManager() {
  var callLogger = SimpleCallLogger();
  var loggerWithName = callLogger.loggerWithName;

 return {
    // Type assigning functions
   typeForGlobal: loggerWithName("typeForGlobal"),
   typeForLocal: loggerWithName("typeForLocal"),
   typeForCallSubroutine: loggerWithName("typeForCallSubroutine"),
   typeForReturnStatement: loggerWithName("typeForReturnStatement"),
   typeForVoidReturnStatement: loggerWithName("typeForVoidReturnStatement"),
   registerSubroutineDefinition: loggerWithName("registerSubroutineDefinition"),
   numericType: loggerWithName("numericType"),
   stringType: loggerWithName("stringType"),
   boolType: loggerWithName("boolType"),
   typeForPair: loggerWithName("typeForPair"),

    // Convenience functions for typeForPair(<type>Type, expression)
   typeForStringExpression: loggerWithName("typeForStringExpression"),
   typeForNumericExpression: loggerWithName("typeForNumericExpression"),
   typeForBoolExpression: loggerWithName("typeForBoolExpression"),

    // Type reading functions
   globalHasStringType: loggerWithName("globalHasStringType"),
   globalHasNumericType: loggerWithName("globalHasNumericType"),
   localVariableDefined: loggerWithName("localVariableDefined", false),
   localHasStringType: loggerWithName("localHasStringType"),
   localHasNumericType: loggerWithName("localHasNumericType"),
   getSubArgNames: loggerWithName("getSubArgNames"),
   subHasReturnType: loggerWithName("subHasReturnType"),
   subHasStringReturnType: loggerWithName("subHasStringReturnType"),
   subHasNumericReturnType: loggerWithName("subHasNumericReturnType"),
   subHasVoidReturnType: loggerWithName("subHasVoidReturnType"),

   getNumericGlobals: loggerWithName("getNumericGlobals"),
   getStringGlobals: loggerWithName("getStringGlobals"),

   validate: loggerWithName("validate"),

   getLog: callLogger.getLog
  };
}
