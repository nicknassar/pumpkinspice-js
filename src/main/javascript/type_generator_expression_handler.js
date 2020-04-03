/***********************************************************************
  BEGIN Type Gen pass expression handler
***********************************************************************/

    function ExpressionHandler() {
      // Finds the type of an unknown expression, returning
      // the type or a list of variables with the type

      // XXX Handle errors so we can differentiate between
      //     parser errors and type errors

      // Possible return values for all functions
      // are type indicators returned by the TypeManager

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

      function variable(name) {
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
            logger.error("TYPE MISMATCH.");
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
            logger.error("TYPE MISMATCH.");
            return null;
          }
        }
        return subExp;
      }

      function passthrough(exp) {
        return exp;
      }

      function binaryBoolExpression(exp1,exp2) {
        // XXX This doesn't make sense. There is no boolean type
        if (!exp1 || !exp2)
          return null;
        return exp1;
      }

      function callSubroutine(name,argExps) {
        return typeManager.callSubroutineExpression(name, argExps);
      }

      return {
        numericLiteral: typeManager.numericTypeIndicator,
        stringLiteral: typeManager.stringTypeIndicator,
        randomBuiltin: typeManager.numericTypeIndicator,
        piBuiltin: typeManager.numericTypeIndicator,
        variable: variable,
        validateNumericSubExpression: validateNumericSubExpression,
        validateStringSubExpression: validateStringSubExpression,
        cintBuiltin: typeManager.numericTypeIndicator,
        intBuiltin: typeManager.numericTypeIndicator,
        fixBuiltin: typeManager.numericTypeIndicator,
        absBuiltin: typeManager.numericTypeIndicator,
        strzBuiltin: typeManager.stringTypeIndicator,
        leftzBuiltin: typeManager.stringTypeIndicator,
        rightzBuiltin: typeManager.stringTypeIndicator,
        valBuiltin: typeManager.numericTypeIndicator,
        lenBuiltin: typeManager.numericTypeIndicator,
        parenExpression: passthrough,
        // XXX Bool expressions doesn't make sense. There is no boolean type
        //     They return the type of the expressions being compared
        boolParenExpression: passthrough,
        boolOrExpression: binaryBoolExpression,
        boolAndExpression: binaryBoolExpression,
        boolNotExpression: passthrough,
        boolEqualExpression: typeManager.genTypesForExpressionPair,
        boolLessExpression: typeManager.genTypesForExpressionPair,
        boolGreaterExpression: typeManager.genTypesForExpressionPair,
        boolLessOrEqualExpression: typeManager.genTypesForExpressionPair,
        boolGreaterOrEqualExpression: typeManager.genTypesForExpressionPair,
        boolNotEqualExpression: typeManager.genTypesForExpressionPair,
        callSubroutine: callSubroutine,
        additionExpression: typeManager.genTypesForExpressionPair,
        subtractionExpression: numericExpression,
        multiplicationExpression: numericExpression,
        divisionExpression: numericExpression
      };
    }

/***********************************************************************
  END Type Gen pass expression handler
***********************************************************************/
