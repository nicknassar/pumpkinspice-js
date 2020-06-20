function TestingTypeManager() {
  var callLogger = SimpleCallLogger();
  var loggerWithName = callLogger.loggerWithName;
  var subLocalNames = {};

  // Keep track of local variables, so localVariableDefined() works
  var logRegisterLocals = loggerWithName("registerLocals");
  var logRegisterSubroutineDefinition = loggerWithName("registerSubroutineDefinition");
  var logLocalVariableDefined = loggerWithName("localVariableDefined");
  
  function registerLocals(sub, names) {
    logRegisterLocals(sub, names);
    if (subLocalNames[sub] === undefined) {
      return false;
    } else {
      for (var i=0;i<names.length;i++) {
	subLocalNames[sub].push(names[i]);
      }
      return true;
    }
  };
  function registerSubroutineDefinition(sub, args) {
    subLocalNames[sub] = [];
    for (var i=0;i<args.length;i++) {
      subLocalNames[sub].push(args[i]);
    }
    logRegisterSubroutineDefinition(sub, args);
    return true;
  }
  function localVariableDefined(sub, name) {
    logLocalVariableDefined(sub, name);
    return subLocalNames[sub].indexOf(name) !== -1;
  }
  
  
 return {
    // Type assigning functions
   typeForGlobal: loggerWithName("typeForGlobal"),
   typeForLocal: loggerWithName("typeForLocal"),
   typeForCallSubroutine: loggerWithName("typeForCallSubroutine"),
   typeForReturnStatement: loggerWithName("typeForReturnStatement"),
   typeForVoidReturnStatement: loggerWithName("typeForVoidReturnStatement"),
   registerSubroutineDefinition: registerSubroutineDefinition,
   registerLocals: registerLocals,
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
   localVariableDefined: localVariableDefined,
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
