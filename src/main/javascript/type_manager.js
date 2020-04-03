  function TypeManager() {
    /*

      Types are determined in the first pass of the compiler by
      building a map of variables to their types.

      The second pass uses this type data to generate code

      Variables with unknown types are associated with a list of
      variables with the same type. As types are determined, these
      lists are used to fill in missing types

      Possible return values:
      STRING_TYPE - this is a string
      NUMERIC_TYPE - this is a numeric type
      null - something is wrong
      Array - we haven't figured it out - this is a list of identifiers

    */

    // Constants representing types
    var STRING_TYPE = {};
    var NUMERIC_TYPE = {}

    var subArgNames = {};      // Map of subroutine to list of param names

    var subArgCount = {}; // Map of subroutine to integer param count                                                     // Used when subs are called before declaration


    // Map of variable name to STRING_TYPE, NUMERIC_TYPE, or list of
    // matches of unknown type
    // Includes subroutine args and return types via special names
    var varTypes = {};

    var calledSubs = [];  // Subroutines that were called before being defined
    // So we can check that they eventually get defined

    function localVarName(sub, name) {
      if (sub !== undefined) {
        var pos = 0;
        while (pos < subArgNames[sub].length){
          if (subArgNames[sub][pos] === name) {
            return argNameByArity(sub,pos);
          }
          pos++;
        }
      }
      return name;
    };

    // Call with FOO,0 to get the name of the first arg of subroutine FOO
    // Call with FOO,1 to get the name of the second arg of subroutine FOO
    // Used internally in varTypes to keep track of type
    function argNameByArity(sub,pos) {
      return sub+"!"+pos; // Implicit conversion from number to string
    };

    // Name of the return value for the given sub
    // Used internally in varTypes to keep track of type
    function returnValueName(sub) {
      return sub+"!";
    }

    function getVarsObject() {
      // Initialize numeric values to 0, strings to empty string
      // Variables with unknown types remain undefined, always fail in comparisons
      // XXX I don't like this because it assumes the machine uses a
      //     hash for variables
      var vars = {};
      for (var v in varTypes) {
        if (varTypes[v] === NUMERIC_TYPE)
          vars[v] = 0;
        else if (varTypes[v] === STRING_TYPE)
          vars[v] = "";
      }
      return vars;
    }

    function assignTypes(variables,type) {
      // type must be resolved before this is called
      if (type !== STRING_TYPE && type !== NUMERIC_TYPE) {
        logger.error("TYPE SYSTEM ERROR\n");
        return false;
      }
      var sameTypeVars = [];
      for (var i=0;i<variables.length;i++) {
        if (varTypes[variables[i]] &&
            varTypes[variables[i]] !== STRING_TYPE &&
            varTypes[variables[i]] !== NUMERIC_TYPE) {
          var sameTypeTemp = varTypes[variables[i]];
          for (var j=0;j<sameTypeTemp.length;j++)
            sameTypeVars.push(sameTypeTemp[j]);
          varTypes[variables[i]] = type;
        } else if (varTypes[variables[i]] !== undefined &&
                   varTypes[variables[i]] !== type) {
          logger.error("TYPE MISMATCH\n");
          return false;
        } else {
          varTypes[variables[i]] = type;
        }
      }
      if (sameTypeVars.length > 0) {
        return assignTypes(sameTypeVars,type);
      } else {
        return true;
      }

    }

    function assignGlobalNumericType(variable) {
      return assignTypes([variable], NUMERIC_TYPE);
    }

    function assignGlobalStringType(variable) {
      return assignTypes([variable], STRING_TYPE);
    }

    function assignUnknownsNumericType(variables) {
      return assignTypes(variables, NUMERIC_TYPE);
    }

    function assignUnknownsStringType(variables) {
      return assignTypes(variables, STRING_TYPE);
    }

    function saveUnassignedTypes(variables) {
      // This is O(n^2) in the worst case
      //
      // There's a much better way to handle this

      for (var i=0;i<variables.length;i++) {
        if (varTypes[variables[i]] &&
            (varTypes[variables[i]]===STRING_TYPE ||
             varTypes[variables[i]]===NUMERIC_TYPE)) {
          logger.error("UNASSIGNED TYPE NOT RESOLVED CORRECTLY\n");
          throw "typeassignerror"; // We should never get here
        }
        if (varTypes[variables[i]]) {
          for (var j=0;j<variables.length;j++) {
            varTypes[variables[i]].push(variables[j]);
          }
        } else {
          // Copy the current list to varTypes
          varTypes[variables[i]] = variables.slice(0);
        }
      }
    }

    function addGlobalToUnassignedType(unassigned, variable) {
      var newUnassigned = [variable];
      for (var i=0;i<unassigned.length;i++) {
        newUnassigned.push(unassigned[i]);
      }
      return saveUnassignedTypes(newUnassigned);
    }

    function genTypesForExpressionPair(type1,type2) {
      // Returns type of expression pair
      // Just like findTypeOfTokenExpression can return
      //   STRING_TYPE, NUMERIC_TYPE, null, or list

      // Something is bad
      if (type1 === null || type2 === null)
        return null;

      // The first expression can be resolved
      if (type1 === STRING_TYPE || type1 === NUMERIC_TYPE) {
        if (type2 === type1) {
          return type1;
        } else if (type2 !== STRING_TYPE && type2 !== NUMERIC_TYPE) {
          // Type 2 is a list of unknowns
          assignTypes(type2,type1);
          return type1;
        } else {
          // It's not a match and it's not unknown
          return null;
        }
      }

      // The first expression could not be resolved

      // The second expression can be resolved
      if (type2 === STRING_TYPE || type2 === NUMERIC_TYPE) {
        assignTypes(type1,type2);
        return type2;
      }

      // There's probably a better way to combine two lists
      var undefineds = [];
      for (var i=0;i<type1.length;i++) {
        undefineds.push(type1[i]);
      }
      for (var i=0;i<type2.length;i++) {
        undefineds.push(type2[i]);
      }
      if (undefineds.length === 0)
        return null;
      else {
        saveUnassignedTypes(undefineds);
        return undefineds;
      }
    }

    function isStringType(type) {
      return type === STRING_TYPE;
    }

    function isNumericType(type) {
      return type === NUMERIC_TYPE;
    }

    function genTypesForStringExpression(exp) {
      return genTypesForExpressionPair(exp, STRING_TYPE);
    }

    function genTypesForNumericExpression(exp) {
      return genTypesForExpressionPair(exp, NUMERIC_TYPE);
    }

    function stringTypeIndicator() {
      return STRING_TYPE;
    }

    function numericTypeIndicator() {
      return NUMERIC_TYPE;
    }

    function globalVariableIndicator(name) {
      return [name];
    }

    function globalHasStringType(name) {
      return varTypes[name] === STRING_TYPE;
    }

    function globalHasNumericType(name) {
      return varTypes[name] === NUMERIC_TYPE;
    }

    function globalHasUndefinedType(name) {
      return varTypes[name] === undefined;
    }

    function localVariableDefined(sub, name) {
      return localVarName(sub, name) != name;
    }

    function localVariableIndicator(sub, name) {
      return [localVarName(sub, name)];
    }

    function localHasStringType(sub, name) {
      return varTypes[localVarName(sub, name)] === STRING_TYPE;
    }

    function localHasNumericType(sub, name) {
      return varTypes[localVarName(sub, name)] === NUMERIC_TYPE;
    }

    function localHasUndefinedType(sub, name) {
      return varTypes[localVarName(sub, name)] === undefined;
    }

    function subIsDefined(name) {
      return subArgNames[name] !== undefined;
    }

    function getSubArgCount(name) {
      return subArgCount[name];
    }

    function setSubArgNames(name, args) {
      subArgCount[name] = args.length;
      subArgNames[name] = args;
    }

    function getSubArgNames(name) {
      return subArgNames[name];
    }

    function subArgHasStringType(sub, argNum) {
      return varTypes[argNameByArity(sub, argNum)] === STRING_TYPE;
    }

    function subArgHasNumericType(sub, argNum) {
      return varTypes[argNameByArity(sub, argNum)] === NUMERIC_TYPE;
    }

    function subArgHasUndefinedType(sub, argNum) {
      return varTypes[argNameByArity(sub, argNum)] === undefined;
    }

    function subHasStringReturnType(sub) {
      return varTypes[returnValueName(sub)] === STRING_TYPE;
    }

    function subHasNumericReturnType(sub) {
      return varTypes[returnValueName(sub)] === NUMERIC_TYPE;
    }

    function subHasUndefinedReturnType(sub) {
      return varTypes[returnValueName(sub)] === undefined;
    }

    function callSubroutineStatement(name, argExps) {
      if (subArgCount[name] === undefined) {
        subArgCount[name] = argExps.length;
        calledSubs[calledSubs.length] = name;
      }
      if (subArgCount[name] !== argExps.length) {
        logger.error("SUBROUTINE "+name+" HAS "+argExps.length+" args but expected "+subArgCount[name]+"\n");
        return false;
      }
      for (var i=0;i<argExps.length;i++) {
        if (argExps[i] === null) {
          logger.error("Invalid argument to "+name+"\n");
          return false;
        }
        var varName = argNameByArity(name,i);
        if (varTypes[varName]) {
          var result = genTypesForExpressionPair(argExps[i],varTypes[varName])
          if (!result) {
            logger.error("Invalid argument type mismatch in "+name+"\n");
            return false;
          } else {
            // XXX should this be assignTypes?
            varTypes[varName] = result;
          }
        } else {
          // XXX should this be assignTypes?
          varTypes[varName] = argExps[i];
        }
      }
      return true;
    }

    function returnStatement(sub, exp) {
      if (exp === null) {
        logger.error("INVALID RETURN EXPRESSION\n");
        return false;
      }
      if (sub === undefined) {
        logger.error("RETURN OUTSIDE OF SUBROUTINE\n");
        return false;
      }
      var retValName=returnValueName(sub);
      if (varTypes[retValName]) {
        var result = genTypesForExpressionPair(exp,varTypes[retValName]);
        if (!result) {
          logger.error("TYPE MISMATCH IN RETURN\n");
          return false;
        } else {
          // XXX should this be assignTypes?
          varTypes[retValName] = result;
        }
      } else {
        // XXX should this be assignTypes?
        varTypes[retValName] = exp;
      }
      return true;
    }

    function callSubroutineExpression(name, argExps) {
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
              // XXX should this be assignTypes?
              varTypes[varName] = result;
            }
          } else {
            // XXX should this be assignTypes?
            varTypes[varName] = argExps[i];
          }
        }
        var retName = returnValueName(name);
        if (varTypes[retName])
          return varTypes[retName];
        else
          return [retName];
    }

    function validate() {
      // Calling fake subroutines is stupid
      // XXX There's probably more we can check for
    for (var i=0;i<calledSubs.length;i++) {
      var name=calledSubs[i];
      if (!machine.isSubroutineDefined(name)) {
        logger.error("ERROR: CALL TO FAKE SUBROUTINE "+name+"!\n");
        return false;
      }
    }
    return true;
    }

    return {
      // Type assigning functions
      assignGlobalNumericType: assignGlobalNumericType,
      assignGlobalStringType: assignGlobalStringType,
      assignUnknownsStringType: assignUnknownsStringType,
      assignUnknownsNumericType: assignUnknownsNumericType,
      genTypesForExpressionPair: genTypesForExpressionPair,
      genTypesForStringExpression: genTypesForStringExpression,
      genTypesForNumericExpression: genTypesForNumericExpression,

      isNumericType: isNumericType,
      isStringType: isStringType,

      addGlobalToAssignedType: addGlobalToUnassignedType,
      callSubroutineStatement: callSubroutineStatement,
      callSubroutineExpression: callSubroutineExpression,
      returnStatement: returnStatement,
      localVariableIndicator: localVariableIndicator,
      globalVariableIndicator: globalVariableIndicator,
      numericTypeIndicator: numericTypeIndicator,
      stringTypeIndicator: stringTypeIndicator,
      setSubArgNames: setSubArgNames,

      // Type reading functions
      globalHasStringType: globalHasStringType,
      globalHasNumericType: globalHasNumericType,
      globalHasUndefinedType: globalHasUndefinedType,
      localVariableDefined: localVariableDefined,
      localHasStringType: localHasStringType,
      localHasNumericType: localHasNumericType,
      localHasUndefinedType: localHasUndefinedType,
      subIsDefined: subIsDefined,
      getSubArgNames: getSubArgNames,
      getSubArgCount: getSubArgCount,
      subArgHasStringType: subArgHasStringType,
      subArgHasNumericType: subArgHasNumericType,
      subArgHasUndefinedType: subArgHasUndefinedType,
      subHasStringReturnType: subHasStringReturnType,
      subHasNumericReturnType: subHasNumericReturnType,
      subHasUndefinedReturnType: subHasUndefinedReturnType,
      validate: validate,

      getVarsObject: getVarsObject,
    };
  }
