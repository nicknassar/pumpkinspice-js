  function TypeManager(logger) {
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
      BOOL_TYPE - this is a boolean -- only expressions can have boolean values - there are no boolean variables
      VOID_TYPE - this is returned by a subroutine with no return value
      null - something is wrong
      Array - we haven't figured it out - this is a list of identifiers

    */

    // Constants representing types
    var STRING_TYPE = {};
    var NUMERIC_TYPE = {};
    var BOOL_TYPE = {};
    var VOID_TYPE = {};

    var subArgNames = {};      // Map of subroutine to list of param names

    var subArgCount = {}; // Map of subroutine to integer param count
                          // Used when subs are called before declaration


    // Map of variable name to STRING_TYPE, NUMERIC_TYPE, or list of
    // matches of unknown type
    // Includes subroutine args and return types via special names
    var varTypes = {};

    var calledSubs = [];  // Subroutines that were called before being defined
    // So we can check that they eventually get defined

    // Set to false if validation fails at any point
    var valid = true;

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

    function typeExpressionForGlobal(name) {
      if (varTypes[name] === undefined)
        varTypes[name] = [name];
      return varTypes[name];
    }

    function typeExpressionForLocal(sub, name) {
      name = localVarName(sub, name);
      if (varTypes[name] === undefined)
        varTypes[name] = [name];
      return varTypes[name];
    }


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

    function getNumericGlobals() {
      var varNames = [];
      for (var v in varTypes) {
        if (v.indexOf("!") === -1 && varTypes[v] === NUMERIC_TYPE)
          varNames.push(v);
      }
      return varNames;
    }

    function getStringGlobals() {
      var varNames = [];
      for (var v in varTypes) {
        if (v.indexOf("!") === -1 && varTypes[v] === STRING_TYPE)
          varNames.push(v);
      }
      return varNames;
    }

    function assignTypes(variables,type) {
      // type must be resolved before this is called
      if (type !== STRING_TYPE && type !== NUMERIC_TYPE) {
        logger.error("TYPE SYSTEM ERROR. This is neither text nor a number");
        valid = false;
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
          // Maybe display more specific error
          logger.error("type mismatch");
          valid = false;
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

    function saveUnassignedTypes(variables) {
      // This is O(n^2) in the worst case
      //
      // There's a much better way to handle this

      for (var i=0;i<variables.length;i++) {
        // if (varTypes[variables[i]] &&
        //     (varTypes[variables[i]]===STRING_TYPE ||
        //      varTypes[variables[i]]===NUMERIC_TYPE)) {
        //   logger.error("UNASSIGNED TYPE NOT RESOLVED CORRECTLY");
        //   valid = false;
        //   return false;
        // }
        if (varTypes[variables[i]]) {
          // Can this result in duplicates?
          for (var j=0;j<variables.length;j++) {
            varTypes[variables[i]].push(variables[j]);
          }
        } else {
          // Copy the current list to varTypes
          varTypes[variables[i]] = variables.slice(0);
        }
      }
      return true;
    }

    function genTypesForExpressionPair(type1,type2) {
      // Returns type of expression pair
      //   *_TYPE, null, or list

      // Something is bad
      if (type1 === null || type2 === null)
        return null;

      // The first expression can be resolved
      if (type1 === STRING_TYPE || type1 === NUMERIC_TYPE || type1 === BOOL_TYPE || type1 === VOID_TYPE) {
        if (type2 === type1) {
          return type1;
        } else if (type2 !== STRING_TYPE && type2 !== NUMERIC_TYPE && type2 !== BOOL_TYPE && type2 !== VOID_TYPE) {
          // Type 2 is a list of unknowns
          if (assignTypes(type2,type1))
            return type1;
          else
            return null;
        } else {
          // It's not a match and it's not unknown
          logger.error("type mismatch");
          valid = false;
          return null;
        }
      }

      // The first expression could not be resolved

      // The second expression can be resolved
      if (type2 === STRING_TYPE || type2 === NUMERIC_TYPE || type2 === BOOL_TYPE || type2 === VOID_TYPE) {
        if (assignTypes(type1,type2))
          return type2;
        else
          return null;
      }

      // There's probably a better way to combine two lists
      var undefineds = [];
      for (var i=0;i<type1.length;i++) {
        undefineds.push(type1[i]);
      }
      for (var i=0;i<type2.length;i++) {
        undefineds.push(type2[i]);
      }
      if (undefineds.length === 0) {
        logger.error("Assigning type to empty expression");
        valid = false;
        return null;
      } else {
        if (!saveUnassignedTypes(undefineds))
          return null;
        return undefineds;
      }
    }

    function isStringType(type) {
      return type === STRING_TYPE;
    }

    function isNumericType(type) {
      return type === NUMERIC_TYPE;
    }

    function isBoolType(type) {
      return type === BOOL_TYPE;
    }

    function isVoidType(type) {
      return type === BOOL_TYPE;
    }

    function genTypesForStringExpression(exp) {
      return genTypesForExpressionPair(exp, STRING_TYPE);
    }

    function genTypesForNumericExpression(exp) {
      return genTypesForExpressionPair(exp, NUMERIC_TYPE);
    }

    function genTypesForBoolExpression(exp) {
      return genTypesForExpressionPair(exp, BOOL_TYPE);
    }

    function stringTypeExpression() {
      return STRING_TYPE;
    }

    function numericTypeExpression() {
      return NUMERIC_TYPE;
    }

    function boolTypeExpression() {
      return BOOL_TYPE;
    }

    function globalHasStringType(name) {
      return varTypes[name] === STRING_TYPE;
    }

    function globalHasNumericType(name) {
      return varTypes[name] === NUMERIC_TYPE;
    }

    function localVariableDefined(sub, name) {
      return localVarName(sub, name) != name;
    }

    function localHasStringType(sub, name) {
      return varTypes[localVarName(sub, name)] === STRING_TYPE;
    }

    function localHasNumericType(sub, name) {
      return varTypes[localVarName(sub, name)] === NUMERIC_TYPE;
    }

    function registerSubroutineDefinition(name, args) {
      if (subArgCount[name] === undefined)
        subArgCount[name] = args.length;
      if (subArgCount[name] !== args.length) {
        logger.error("SUBROUTINE "+name+" called with "+subArgCount[name]+" arguments, but defined with "+args.length+" arguments");
        valid = false;
        return false;
      }
      if (subArgNames[name] !== undefined) {
        logger.error("SUBROUTINE "+name+" redefined");
        valid = false;
        return false;
      }
      subArgNames[name] = args;
      return true;
    }

    function getSubArgNames(name) {
      return subArgNames[name];
    }

    function subHasStringReturnType(sub) {
      return varTypes[returnValueName(sub)] === STRING_TYPE;
    }

    function subHasNumericReturnType(sub) {
      return varTypes[returnValueName(sub)] === NUMERIC_TYPE;
    }

    function subHasVoidReturnType(sub) {
      return varTypes[returnValueName(sub)] === VOID_TYPE;
    }
    function subHasReturnType(sub) {
      return varTypes[returnValueName(sub)] !== undefined;
    }

    function typeExpressionForReturnStatement(sub, exp) {
      if (exp === null) {
        return null;
      }
      if (sub === undefined) {
        logger.error("RETURN OUTSIDE OF SUBROUTINE");
        valid = false;
        return null;
      }
      var retValName=returnValueName(sub);
      if (varTypes[retValName]) {
        var result = genTypesForExpressionPair(exp,varTypes[retValName]);
        if (result === null) {
          return null;
        }
      } else {
        varTypes[retValName] = exp;
      }
      return varTypes[retValName];
    }

    function typeExpressionForVoidReturnStatement(sub) {
      return typeExpressionForReturnStatement(sub, VOID_TYPE);
    }

    function typeExpressionForCallSubroutine(name, argExps) {
        if (subArgCount[name] === undefined) {
          subArgCount[name] = argExps.length;
        }
        if (subArgCount[name] !== argExps.length) {
          logger.error("SUBROUTINE CALL "+name+" HAS "+argExps.length+" args but expected "+subArgCount[name]);
          valid = false;
          return null;
        }
        for (var i=0;i<argExps.length;i++) {
          if (argExps[i] === null) {
            return null;
          }
          var varName = argNameByArity(name,i);
          if (varTypes[varName] !== undefined) {
            var result = genTypesForExpressionPair(argExps[i],varTypes[varName])
            if (result === null) {
              return null;
            }
          } else {
            varTypes[varName] = argExps[i];
          }
        }
        var retName = returnValueName(name);
        if (varTypes[retName] === undefined)
          varTypes[retName] = [retName];
        return varTypes[retName];
    }

    function validate() {
      if (!valid)
        return false;
      // XXX incomplete
      // Check that all subroutines called exist and have types
      // Check that subroutines and variables don't share names
      // for (var i=0;i<calledSubs.length;i++) {
      //   var name=calledSubs[i];
      //   if (!machine.isSubroutineDefined(name)) {
      //     logger.error("ERROR: CALL TO FAKE SUBROUTINE "+name);
      //     return false;
      //   }
      // }
      return true;
    }

    return {
      // Type assigning functions
      typeExpressionForGlobal: typeExpressionForGlobal,
      typeExpressionForLocal: typeExpressionForLocal,
      typeExpressionForCallSubroutine: typeExpressionForCallSubroutine,
      typeExpressionForReturnStatement: typeExpressionForReturnStatement,
      typeExpressionForVoidReturnStatement: typeExpressionForVoidReturnStatement,
      registerSubroutineDefinition: registerSubroutineDefinition,
      numericTypeExpression: numericTypeExpression,
      stringTypeExpression: stringTypeExpression,
      boolTypeExpression: boolTypeExpression,

      genTypesForExpressionPair: genTypesForExpressionPair,
      genTypesForStringExpression: genTypesForStringExpression,
      genTypesForNumericExpression: genTypesForNumericExpression,
      genTypesForBoolExpression: genTypesForBoolExpression,

      // Type reading functions
      globalHasStringType: globalHasStringType,
      globalHasNumericType: globalHasNumericType,
      localVariableDefined: localVariableDefined,
      localHasStringType: localHasStringType,
      localHasNumericType: localHasNumericType,
      getSubArgNames: getSubArgNames,
      subHasReturnType: subHasReturnType,
      subHasStringReturnType: subHasStringReturnType,
      subHasNumericReturnType: subHasNumericReturnType,
      subHasVoidReturnType: subHasVoidReturnType,

      getNumericGlobals: getNumericGlobals,
      getStringGlobals: getStringGlobals,

      validate: validate
    };
  }
