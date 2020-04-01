/***********************************************************************
  BEGIN Type Gen pass expression handler
***********************************************************************/

    function ExpressionHandler() {
      // Finds the type of an unknown expression, returning
      // the type or a list of variables with the type

      // XXX Handle errors so we can differentiate between
      //     parser errors and type errors

      // Possible return values for all functions:
      // STRING_TYPE - this is a string
      // NUMERIC_TYPE - this is a numeric type
      // null - something is wrong
      // Array - we haven't figured it out - this is a list of identifiers

      function numeric() {
        return NUMERIC_TYPE;
      }

      function string() {
        return STRING_TYPE;
      }

      function numericExpression(a,b) {
	if (a === null || b === null) {
          return null;
        }
        if (genTypesForExpressionPair(a,NUMERIC_TYPE) &&
            genTypesForExpressionPair(b,NUMERIC_TYPE))
          return NUMERIC_TYPE;
        else
          return null;
      }

      function variable(name) {
        name = localVarName(name);
        // If this is local to a sub, use the local
        if (varTypes[name]===undefined) {
          return [name]; // unknown
        } else {
          return varTypes[name];
        }
      }

      function validateNumericSubExpression(subExp) {
        if (subExp !== NUMERIC_TYPE) {
          // if it's not an exact match, check it out
          subExp = genTypesForExpressionPair(NUMERIC_TYPE,subExp)
          if (!subExp) {
            logger.error("TYPE MISMATCH.");
            return null;
          }
        }
        return subExp;
      }

      function validateStringSubExpression(subExp) {
        if (subExp !== STRING_TYPE) {
          // if it's not an exact match, check it out
          subExp = genTypesForExpressionPair(STRING_TYPE,subExp)
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
        // XXX similar to statement
        if (subArgCount[name] === undefined) {
          subArgCount[name] = argExps.length;
        }
        if (subArgCount[name] !== argExps.length) {
          logger.error("SUBROUTINE CALL "+name+" HAS "+argExps.length+" args but expected "+subArgCount[name]+"\n");
          return null;
        }
        for (var i=0;i<argExps.length;i++) {
          if (argExps[i] === null) {
            logger.error("Invalid argument to SUBROUTINE CALL "+name+"\n");
            return null;
          }
          var varName = argNameByArity(name,i);
          if (varTypes[varName]) {
            var result = genTypesForExpressionPair(argExps[i],varTypes[varName])
            if (!result) {
              logger.error("Invalid argument type mismatch in CALL "+name+"\n");
              return null;
            } else {
              varTypes[varName] = result;
            }
          } else {
            varTypes[varName] = argExps[i];
          }
        }
        var retName = returnValueName(name);
        if (varTypes[retName])
          return varTypes[retName];
        else
          return [retName];
      }

      return {
        numericLiteral: numeric,
        stringLiteral: string,
        randomBuiltin: numeric,
        piBuiltin: numeric,
        variable: variable,
        validateNumericSubExpression: validateNumericSubExpression,
        validateStringSubExpression: validateStringSubExpression,
        cintBuiltin: numeric,
        intBuiltin: numeric,
        fixBuiltin: numeric,
        absBuiltin: numeric,
        strzBuiltin: string,
        leftzBuiltin: string,
        rightzBuiltin: string,
        valBuiltin: numeric,
        lenBuiltin: numeric,
        parenExpression: passthrough,
        // XXX Bool expressions doesn't make sense. There is no boolean type
        //     They return the type of the expressions being compared
        boolParenExpression: passthrough,
        boolOrExpression: binaryBoolExpression,
        boolAndExpression: binaryBoolExpression,
        boolNotExpression: passthrough,
        boolEqualExpression: genTypesForExpressionPair,
        boolLessExpression: genTypesForExpressionPair,
        boolGreaterExpression: genTypesForExpressionPair,
        boolLessOrEqualExpression: genTypesForExpressionPair,
        boolGreaterOrEqualExpression: genTypesForExpressionPair,
        boolNotEqualExpression: genTypesForExpressionPair,
        callSubroutine: callSubroutine,
        additionExpression: genTypesForExpressionPair,
        subtractionExpression: numericExpression,
        multiplicationExpression: numericExpression,
        divisionExpression: numericExpression
      };
    }

/***********************************************************************
  END Type Gen pass expression handler
***********************************************************************/
