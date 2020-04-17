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

/***********************************************************************
  BEGIN Compiler Type Pass statement functions

  Statement functions return true on success, false if there's an error
***********************************************************************/
    function trueFunc() {
      return true;
    }

    function printString(value,newline,pause,num) {
      return (value !== null && value !== undefined);
    }

    function printExp(exp,newline,pause,num) {
      var result = typeManager.genTypesForStringExpression(exp);
      if (!result) {
        logger.error("Type mismatch for PRINT. I need text");
      }
      return result;
    }

    function ifStatement(boolExp,num){
      if (boolExp === null) {
        logger.error("Invalid comparison for IF");
        return false;
      }
      return true;
    }

    function whileStatement(exp,num){
      if (exp === null) {
        logger.error("Type mismath for WHILE");
        return false;
      }
      return true;
    }

    function beginSubroutine(name, args, num) {
      // XXX CHECK THAT VARIABLE HASN'T BEEN DEFINED
      // XXX WHEN VARS ARE DEFINED, CHECK THAT SUBROUTINE HASN'T BEEN DEFINED
      // If there's an existing subArgNames entry, this had already been defined!
      if (typeManager.subIsDefined(name)) {
        logger.error("SUBROUTINE "+name+" REDEFINED");
        return false;
      } else {
        // This is the current sub now.
        currentSub = name;

        // We've never seen this before. Save the count, too
        if (typeManager.getSubArgCount(name) === undefined ||
            typeManager.getSubArgCount(name) == args.length) {
          typeManager.setSubArgNames(name, args);

        } else { // We've seen this called. Check that the param count matches.
          logger.error("SUBROUTINE "+name+" HAS "+args.length+" args but was called with "+typeManager.getSubArgCount(name));
          return false;
        }
        return true;
      }
    }

    function callSubroutine(name, argExps, num) {
      return typeManager.callSubroutineStatement(name, argExps);
    }

    function endSubroutine(num) {
      currentSub = undefined;
      return true;
    }

    function returnStatement(exp, num) {
      return typeManager.returnStatement(currentSub, exp);
    }

    function beginAsk(promptExp,num) {
      var result = typeManager.genTypesForStringExpression(promptExp);
      if (result === null) {
        logger.error("Type mismatch for ASK");
        return false;
      } else {
        return true;
      }
    }

    function beginMenu(promptExp,num) {
      var result = typeManager.genTypesForStringExpression(promptExp);
      if (result === null) {
        logger.error("Type mismatch for BEGIN MENU");
        return false;
      } else {
        return true;
      }
    }

    function menuChoice(charExp,textExp,num) {
      var result = typeManager.genTypesForStringExpression(textExp);
      if (result === null) {
        logger.error("Type mismatch for MENU CHOICE");
        return false;
      } else {
        return true;
      }
    }

    function menuHideIf(boolExp,num) {
      if (boolExp === null) {
        logger.error("Type mismatch for HIDE IF");
        return false;
      } else {
        return true;
      }
    }

    function color(valueExp,num) {
      var result = typeManager.genTypesForNumericExpression(valueExp);
      if (result === null) {
        logger.error("Type mismatch for COLOR");
        return false;
      } else {
        return true;
      }
    }

    function bgColor(valueExp,num) {
      var result = typeManager.genTypesForNumericExpression(valueExp);
      if (result === null) {
        logger.error("Type mismatch for BGCOLOR");
        return false;
      } else {
        return true;
      }
    }

    function sleep(valueExp,num) {
      var result = typeManager.genTypesForNumericExpression(valueExp);
      if (result === null) {
        logger.error("Type mismatch for SLEEP");
        return false;
      } else {
        return true;
      }
    }

    function input(valueExp,num) {
      return typeManager.assignGlobalStringType(valueExp);
    }

    function play(valueExp,num) {
      var result = typeManager.genTypesForStringExpression(valueExp);
      if (result === null) {
	logger.error("Type mismatch for PLAY");
	return false;
      } else {
	return true;
      }
    }

    function forStatement(varExp,startExp,endExp,num) {
      if (!typeManager.assignGlobalNumericType(varExp) ||
          typeManager.genTypesForNumericExpression(startExp)===null ||
          typeManager.genTypesForNumericExpression(endExp)===null) {
        logger.error("Type mismatch for FOR");
      } else {
        return true;
      }

    }

    function letStatement(varExp,valueExp) {
      if (varExp === null || valueExp === null) {
        logger.error("Type mismatch for assignment to "+varExp);
        return false;
      }
      if (typeManager.localVariableDefined(currentSub, varExp)) {
        logger.error("Local variable assignment not supported, yet!");
        return false;
      }
      // Value exp has an unknown type
      if (typeManager.isStringType(valueExp)) {
        if (!typeManager.assignGlobalStringType(varExp)) {
          logger.error("Type mismatch for assignment to "+varExp);
          return false;
        } else
          return true;
      } else if (typeManager.isNumericType(valueExp)) {
        if (!typeManager.assignGlobalNumericType(varExp)) {
          logger.error("Type mismatch for assignment to "+varExp);
          return false;
        } else
          return true;
      } else {
        // The variable has a type- set the arg based on that
        if (typeManager.globalHasStringType(varExp)) {
          return typeManager.assignUnknownsStringTypes(valueExp);
        } else if (typeManager.globalHasNumericType(varExp)) {
          return typeManager.assignUnknownsNumericType(valueExp);
        } else {
          // There are no types yet

          typeManager.addGlobalToUnassignedType(valueExp, varExp);
          return true;
        }
      }
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
        if (typeManager.genTypesForNumericExpression(a) &&
            typeManager.genTypesForNumericExpression(b))
          return typeManager.numericTypeIndicator();
        else
          return null;
      }

      function variableExpression(name) {
        if (typeManager.localVariableDefined(currentSub, name)) {
          if (typeManager.localHasUndefinedType(currentSub, name)) {
            return typeManager.localVariableIndicator(currentSub, name);
          } else if (typeManager.localHasStringType(currentSub, name)) {
            return typeManager.stringTypeIndicator();
          } else if (typeManager.localHasNumericType(currentSub, name)) {
            return typeManager.numericTypeIndicator();
          }
        } else {
          if (typeManager.globalHasUndefinedType(name)) {
            return typeManager.globalVariableIndicator(name); // unknown
          } else if (typeManager.globalHasStringType(name)) {
            return typeManager.stringTypeIndicator();
          } else if (typeManager.globalHasNumericType(name)) {
            return typeManager.numericTypeIndicator();
          }
        }
      }

      function validateNumericSubExpression(subExp) {
        if (!typeManager.isNumericType(subExp)) {
          // if it's not an exact match, check it out
          subExp = typeManager.genTypesForNumericExpression(subExp)
          if (!subExp) {
            logger.error("TYPE MISMATCH. I was expecting a number");
            return null;
          }
        }
        return subExp;
      }

      function validateStringSubExpression(subExp) {
        if (!typeManager.isStringType(subExp)) {
          // if it's not an exact match, check it out
          subExp = typeManager.genTypesForStringExpression(subExp)
          if (!subExp) {
            logger.error("TYPE MISMATCH. I was expecting text");
            return null;
          }
        }
        return subExp;
      }

      function passthroughExpression(exp) {
        return exp;
      }

      function binaryBoolExpression(exp1,exp2) {
        // XXX This doesn't make sense. There is no boolean type
        if (!exp1 || !exp2)
          return null;
        return exp1;
      }

      function callSubroutineExpression(name,argExps) {
        return typeManager.callSubroutineExpression(name, argExps);
      }

    var expressionHandler = {

    };

/***********************************************************************
  END Compiler Type Pass expression functions

  Expression functions return a type indicator created and managed by
  the TypeManager

***********************************************************************/

  function finalize() {
    return true;
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
    numericLiteralExpression: typeManager.numericTypeIndicator,
    stringLiteralExpression: typeManager.stringTypeIndicator,
    randomBuiltinExpression: typeManager.numericTypeIndicator,
    piBuiltinExpression: typeManager.numericTypeIndicator,
    variableExpression: variableExpression,
    validateNumericSubExpression: validateNumericSubExpression,
    validateStringSubExpression: validateStringSubExpression,
    cintBuiltinExpression: typeManager.numericTypeIndicator,
    intBuiltinExpression: typeManager.numericTypeIndicator,
    fixBuiltinExpression: typeManager.numericTypeIndicator,
    absBuiltinExpression: typeManager.numericTypeIndicator,
    strzBuiltinExpression: typeManager.stringTypeIndicator,
    leftzBuiltinExpression: typeManager.stringTypeIndicator,
    rightzBuiltinExpression: typeManager.stringTypeIndicator,
    valBuiltinExpression: typeManager.numericTypeIndicator,
    lenBuiltinExpression: typeManager.numericTypeIndicator,
    parenExpression: passthroughExpression,
    // XXX Bool expressions doesn't make sense. There is no boolean type
    //     They return the type of the expressions being compared
    boolParenExpression: passthroughExpression,
    boolOrExpression: binaryBoolExpression,
    boolAndExpression: binaryBoolExpression,
    boolNotExpression: passthroughExpression,
    boolEqualExpression: typeManager.genTypesForExpressionPair,
    boolLessExpression: typeManager.genTypesForExpressionPair,
    boolGreaterExpression: typeManager.genTypesForExpressionPair,
    boolLessOrEqualExpression: typeManager.genTypesForExpressionPair,
    boolGreaterOrEqualExpression: typeManager.genTypesForExpressionPair,
    boolNotEqualExpression: typeManager.genTypesForExpressionPair,
    callSubroutineExpression: callSubroutineExpression,
    additionExpression: typeManager.genTypesForExpressionPair,
    subtractionExpression: numericExpression,
    multiplicationExpression: numericExpression,
    divisionExpression: numericExpression,

    // When we're done
    finalize: finalize
  };
}
