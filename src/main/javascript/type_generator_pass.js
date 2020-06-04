function TypeGeneratorPass(typeManager, logger) {
    /* Pumpkin Spice has implied, static typing

       Certain types of expressions have a specific type
       FOR loop variables are numeric, for example

       Certain types of expressions have the same type
       as their counterpart.
       IF statements compare two expressions of the same type, for example

       A variable that's not used might not have a type
       Anything that's used ends up with a type

    */

  var currentSub; // Name of the sub we're currently adding code to
  var sawReturnStatement = false;

/***********************************************************************
  BEGIN Compiler Type Pass statement functions

  Statement functions return true on success, false if there's an error
***********************************************************************/
    function trueFunc() {
      return true;
    }

    function stringLiteralExpression(identifier) {
      return typeManager.stringType();
    }

    function numericLiteralExpression(identifier) {
      return typeManager.numericType();
    }

    function printString(value,newline,pause) {
      return (value !== null && value !== undefined);
    }

    function printExp(exp,newline,pause) {
      return typeManager.typeForStringExpression(exp) !== null;
    }

    function ifStatement(boolExp){
      if (boolExp === null) {
        return false;
      }
      return true;
    }

    function whileStatement(exp){
      if (exp === null) {
        return false;
      }
      return true;
    }

  function beginSubroutine(name, args) {
    sawReturnStatement = false;
      if (typeManager.registerSubroutineDefinition(name, args) !== null) {
        currentSub = name;
        return true;
      } else {
        return false;
      }
    }

    function callSubroutine(name, argExps) {
      return typeManager.typeForCallSubroutine(name, argExps) !== null;
    }

    function endSubroutine() {
      if (!sawReturnStatement) {
        if (typeManager.typeForVoidReturnStatement(currentSub) === null) {
          return false;
        }
      }
      currentSub = undefined;
      return true;
    }

  function returnStatement(exp) {
    sawReturnStatement = true;
      return typeManager.typeForReturnStatement(currentSub, exp) !== null;
    }

  function voidReturnStatement() {
    sawReturnStatement = true;
      return typeManager.typeForVoidReturnStatement(currentSub) !== null;
    }

    function beginAsk(promptExp) {
      var result = typeManager.typeForStringExpression(promptExp);
      if (result === null) {
        return false;
      } else {
        return true;
      }
    }

    function beginMenu(promptExp) {
      var result = typeManager.typeForStringExpression(promptExp);
      if (result === null) {
        return false;
      } else {
        return true;
      }
    }

    function menuChoice(charExp,textExp) {
      var result = typeManager.typeForStringExpression(textExp);
      if (result === null) {
        return false;
      } else {
        return true;
      }
    }

    function menuHideIf(boolExp) {
      if (boolExp === null) {
        return false;
      } else {
        return true;
      }
    }

    function color(valueExp) {
      var result = typeManager.typeForNumericExpression(valueExp);
      if (result === null) {
        return false;
      } else {
        return true;
      }
    }

    function bgColor(valueExp) {
      var result = typeManager.typeForNumericExpression(valueExp);
      if (result === null) {
        return false;
      } else {
        return true;
      }
    }

    function sleep(valueExp) {
      var result = typeManager.typeForNumericExpression(valueExp);
      if (result === null) {
        return false;
      } else {
        return true;
      }
    }

    function input(valueExp) {
      return typeManager.typeForStringExpression(typeManager.typeForGlobal(valueExp));
    }

    function play(valueExp) {
      var result = typeManager.typeForStringExpression(valueExp);
      if (result === null) {
	return false;
      } else {
	return true;
      }
    }

    function forStatement(varExp,startExp,endExp) {
      if (typeManager.typeForNumericExpression(typeManager.typeForGlobal(varExp))===null  ||
          typeManager.typeForNumericExpression(startExp)===null ||
          typeManager.typeForNumericExpression(endExp)===null) {
      } else {
        return true;
      }

    }

    function letStatement(varExp,valueExp) {
      if (varExp === null || valueExp === null) {
        return false;
      }
      if (currentSub !== undefined && typeManager.localVariableDefined(currentSub, varExp)) {
        logger.error("Local variable assignment not supported, yet!");
        return false;
      }
      return !!typeManager.typeForPair(valueExp, typeManager.typeForGlobal(varExp));
    }

/***********************************************************************
  END Compiler Type Pass statement functions
***********************************************************************/
/***********************************************************************
  BEGIN Compiler Type Pass expression functions

  Expression functions return a type indicator created and managed by
  the TypeManager

***********************************************************************/

      function numericExpression(a,b) {
	if (a === null || b === null) {
          return null;
        }
        return typeManager.typeForPair(
          typeManager.typeForNumericExpression(a),
          typeManager.typeForNumericExpression(b)
        );
      }

      function variableExpression(name) {
        if (currentSub !== undefined && typeManager.localVariableDefined(currentSub, name)) {
          return typeManager.typeForLocal(currentSub, name);
        } else {
          return typeManager.typeForGlobal(name);
        }
      }

      function validateNumericSubExpression(subExp) {
        if (subExp === null)
          return null;
        var newType = typeManager.typeForNumericExpression(subExp);
        if (newType === null)  {
          return null;
        }
        return newType;
      }

      function validateStringSubExpression(subExp) {
        if (subExp === null)
          return null;
        var newType = typeManager.typeForStringExpression(subExp);
        if (newType === null)  {
          return null;
        }
        return newType;
      }

      function notExpression(exp) {
        if (exp === null)
          return null;
        var newType = typeManager.typeForBoolExpression(exp);
        if (newType === null)  {
          return null;
        }
        return newType;
      }

      function orExpression(exp1,exp2) {
        if (exp1 === null || exp2 === null)
          return null;
        var newType1 = typeManager.typeForBoolExpression(exp1);
        var newType2 = typeManager.typeForBoolExpression(exp2);
        if (newType1 === null || newType2 === null)  {
          return null;
        }
        return typeManager.typeForPair(newType1, newType2);
      }

      function andExpression(exp1,exp2) {
        if (exp1 === null || exp2 === null)
          return null;
        var newType1 = typeManager.typeForBoolExpression(exp1);
        var newType2 = typeManager.typeForBoolExpression(exp2);
        if (newType1 === null || newType2 === null)  {
          return null;
        }
        return typeManager.typeForPair(newType1, newType2);
      }

      function callSubroutineExpression(name,argExps) {
        return typeManager.typeForCallSubroutine(name, argExps);
      }

  function comparison(exp1, exp2) {
    if (!typeManager.typeForPair(exp1, exp2))
      return null;
    return typeManager.boolType();
  }

  function numericToNumericFunction(exp) {
    if (validateNumericSubExpression(exp) !== null)
      return typeManager.numericType();
    else
      return null;
  }
  function numericNumericToNumericFunction(exp1, exp2) {
    if (validateNumericSubExpression(exp1) !== null &&
        validateNumericSubExpression(exp2) !== null)
      return typeManager.numericType();
    else
      return null;
  }
  function stringNumericToStringFunction(exp1, exp2) {
    if (validateStringSubExpression(exp1) !== null &&
        validateNumericSubExpression(exp2) !== null)
      return typeManager.stringType();
    else
      return null;
  }
  function stringToNumericFunction(exp) {
    if (validateStringSubExpression(exp) !== null)
      return typeManager.numericType();
    else
      return null;
  }
  function numericToStringFunction(exp) {
    if (validateNumericSubExpression(exp) !== null)
      return typeManager.stringType();
    else
      return null;
  }
/***********************************************************************
  END Compiler Type Pass expression functions

  Expression functions return a type indicator created and managed by
  the TypeManager

***********************************************************************/

  function finalize() {
    return typeManager.validate();
  }

  return {
    // Statements
    printString: printString,
    printExp: printExp,
    ifStatement: ifStatement,
    endIf: trueFunc,
    elseStatement: trueFunc,
    endWhile: trueFunc,
    whileStatement: whileStatement,
    beginRandom: trueFunc,
    waitForMusic: trueFunc,
    beginSubroutine: beginSubroutine,
    callSubroutine: callSubroutine,
    endSubroutine: endSubroutine,
    returnStatement: returnStatement,
    voidReturnStatement: voidReturnStatement,
    endRandom: trueFunc,
    withChance: trueFunc,
    withEvenChance: trueFunc,
    beginAsk: beginAsk,
    askColor: trueFunc,
    askBGColor: trueFunc,
    askPromptColor: trueFunc,
    onNo: trueFunc,
    onYes: trueFunc,
    askDefault: trueFunc,
    endAsk: trueFunc,
    beginMenu: beginMenu,
    menuColor: trueFunc,
    menuBGColor: trueFunc,
    menuChoiceColor: trueFunc,
    menuPromptColor: trueFunc,
    endMenu: trueFunc,
    menuChoice: menuChoice,
    menuHideIf: menuHideIf,
    color: color,
    bgColor: bgColor,
    sleep: sleep,
    input: input,
    play: play,
    forStatement: forStatement,
    letStatement: letStatement,
    comment: trueFunc,
    clear: trueFunc,
    next: trueFunc,

    // Expressions
    numericLiteralExpression: numericLiteralExpression,
    stringLiteralExpression: stringLiteralExpression,
    randomBuiltinExpression: numericNumericToNumericFunction,
    piBuiltinExpression: typeManager.numericType,
    variableExpression: variableExpression,
    cintBuiltinExpression: numericToNumericFunction,
    intBuiltinExpression: numericToNumericFunction,
    fixBuiltinExpression: numericToNumericFunction,
    absBuiltinExpression: numericToNumericFunction,
    strzBuiltinExpression: numericToStringFunction,
    leftzBuiltinExpression: stringNumericToStringFunction,
    rightzBuiltinExpression: stringNumericToStringFunction,
    valBuiltinExpression: stringToNumericFunction,
    lenBuiltinExpression: stringToNumericFunction,
    boolOrExpression: orExpression,
    boolAndExpression: andExpression,
    boolNotExpression: notExpression,
    boolEqualExpression: comparison,
    boolLessExpression: comparison,
    boolGreaterExpression: comparison,
    boolLessOrEqualExpression: comparison,
    boolGreaterOrEqualExpression: comparison,
    boolNotEqualExpression: comparison,
    callSubroutineExpression: callSubroutineExpression,
    additionExpression: typeManager.typeForPair,
    subtractionExpression: numericExpression,
    multiplicationExpression: numericExpression,
    divisionExpression: numericExpression,

    // When we're done
    finalize: finalize
  };
}
