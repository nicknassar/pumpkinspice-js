  //     Maybe pass in an error handler?

function CodeGen(machine, logger) {

  // Constants representing types
  var STRING_TYPE = {};
  var NUMERIC_TYPE = {}

  // expression types
  var BOOLEXPRESSION={};
  var EXPRESSION={};

  // Block types for loop stack
  var FOR={};
  var IF={};
  var RANDOM={};
  var MENU={};
  var ASK={};
  var WHILE={};
  var SUBROUTINE={};

  // Private variables
  var loopStack = [];  // Keeps track of nested loops

  // Map of variable name to STRING_TYPE, NUMERIC_TYPE, or list of matches
  // There are special names for subtroutine args
  var varTypes = {};

  var subArgNames = {};      // Map of subroutine to list of param names

  var subArgCount = {}; // Map of subroutine to integer param count                                                     // Used when subs are called before declaration

  var code = {"!":[]}; // map of function names to list of instructions
  var currentSub = "!"; // Name of the sub we're currently adding code to

  var calledSubs = [];  // Subroutines that were called before being defined
  // So we can check that they eventually get defined

  // XXX move code related functions to Machine
  //     In general, this class shouldn't know the Machine how is
  //     implemented. This class should know how to compose
  //     machine operations to form code

  // location of the next instruction
  function nextInstruction() {
    return code[currentSub].length;
  };
  function pushInstruction(instruction) {
    return code[currentSub].push(instruction);
  };
  function addInstructionAt(loc,instruction) {
    code[currentSub][loc] = instruction;
  };

  function localVarName(name) {
    if (currentSub !== "!") {
      var pos = 0;
      while (pos < subArgNames[currentSub].length){
        if (subArgNames[currentSub][pos] === name) {
          return argNameByArity(currentSub,pos);
        }
        pos++;
      }
    }
    return name;
  };

  // Name of the return value for the given sub
  // Used internally in varTypes to keep track of type
  function returnValueName(sub) {
    return sub+"!";
  };

  // Call with FOO,0 to get the name of the first arg of subroutine FOO
  // Call with FOO,1 to get the name of the second arg of subroutine FOO
  // Used internally in varTypes to keep track of type
  function argNameByArity(sub,pos) {
    return sub+"!"+pos; // Implicit conversion from number to string
  };


  function TypeGeneratorPass() {
    /* Pumpkin Spice has implied, static typing

       Certain types of expressions have a specific type
       FOR loop variables are numeric, for example

       Certain types of expressions have the same type
       as their counterpart.
       IF statements compare two expressions of the same type, for example

       A variable that's not used might not have a type
       Anything that's used ends up with a type


       Types are determined in the first pass of the compiler by
       building a map of variables to their types.

       Variables with unknown types are associated with a list of
       variables with the same type. As types are determined, these
       lists are used to fill in missing types

       Possible return values:
       STRING_TYPE - this is a string
       NUMERIC_TYPE - this is a numeric type
       null - something is wrong
       Array - we haven't figured it out - this is a list of identifiers

       The second pass uses this type data to generate code

    */

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

    };
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
    };
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
    };

/***********************************************************************
  BEGIN Type Gen functions
***********************************************************************/
    function trueFunc() {
      return true;
    }

    function printString(value,newline,pause,num) {
      return (value !== null && value !== undefined);
    }

    function printExp(exp,newline,pause,num) {
      var result = genTypesForExpressionPair(exp,STRING_TYPE);
      if (!result) {
        logger.error("Type mismatch for PRINT on line "+num+"\n");
      }
      return result;
    }

    function ifStatement(boolExp,num){
      if (boolExp === null) {
        logger.error("Invalid comparison for IF on line "+num+"\n");
        return false;
      }
      return true;
    }

    function whileStatement(exp,num){
      if (exp === null) {
        logger.error("Type mismath for WHILE on line "+num+"\n");
        return false;
      }
      return true;
    }

    function beginSubroutine(name, args, num) {
      // XXX CHECK THAT VARIABLE HASN'T BEEN DEFINED
      // XXX WHEN VARS ARE DEFINED, CHECK THAT SUBROUTINE HASN'T BEEN DEFINED
      // If there's an existing subArgNames entry, this had already been defined!
      if (subArgNames[name] !== undefined) {
        logger.error("SUBROUTINE "+name+" REDEFINED on line "+num+"\n");
        return false;
      } else {
        // This is the current sub now.
        currentSub = name;

        // Save the arg names
        subArgNames[name] = args;

        // We've never seen this before. Save the count, too
        if (subArgCount[name] === undefined) {
          subArgCount[name] = args.length;
        } else { // We've seen this called. Check that the param count matches.
          if (subArgCount[name] !== args.length) {
            logger.error("SUBROUTINE "+name+" HAS "+args.length+" args but was called with "+subArgCount[name]+" on line "+num+"\n");
            return false;

          }
        }
        return true;
      }
    }

    function callSubroutine(name, argExps, num) {
      if (subArgCount[name] === undefined) {
        subArgCount[name] = argExps.length;
        calledSubs[calledSubs.length] = name;
      }
      if (subArgCount[name] !== argExps.length) {
        logger.error("SUBROUTINE "+name+" HAS "+argExps.length+" args but expected "+subArgCount[name]+" on line "+num+"\n");
        return false;
      }
      for (var i=0;i<argExps.length;i++) {
        if (argExps[i] === null) {
          logger.error("Invalid argument to "+name+" on line "+num+"\n");
          return false;
        }
        var varName = argNameByArity(name,i);
        if (varTypes[varName]) {
          var result = genTypesForExpressionPair(argExps[i],varTypes[varName])
          if (!result) {
            logger.error("Invalid argument type mismatch in "+name+" on line "+num+"\n");
            return false;
          } else {
            varTypes[varName] = result;
          }
        } else {
          varTypes[varName] = argExps[i];
        }
      }
      return true;
    }

    function endSubroutine(num) {
      currentSub = "!";
      return true;
    }

    function returnStatement(exp, num) {
      if (exp === null) {
        logger.error("INVALID RETURN EXPRESSION ON LINE "+num+"\n");
        return false;

      }
      if (currentSub === "!") {
        logger.error("RETURN OUTSIDE OF SUBROUTINE ON LINE "+num+"\n");
        return false;
      }
      var retValName=returnValueName(currentSub);
      if (varTypes[retValName]) {
        var result = genTypesForExpressionPair(exp,varTypes[retValName]);
        if (!result) {
          logger.error("TYPE MISMATCH IN RETURN ON "+num+"\n");
          return false;
        } else {
          varTypes[retValName] = result;
        }
      } else {
        varTypes[retValName] = exp;
      }
      return true;
    }

    function beginAsk(promptExp,num) {
      var result = genTypesForExpressionPair(promptExp,STRING_TYPE);
      if (result === null) {
        logger.error("Type mismatch for ASK on line "+num+"\n");
        return false;
      } else {
        return true;
      }
    }

    function beginMenu(promptExp,num) {
      var result = genTypesForExpressionPair(promptExp,STRING_TYPE);
      if (result === null) {
        logger.error("Type mismatch for BEGIN MENU on line "+num+"\n");
        return false;
      } else {
        return true;
      }
    }

    function menuChoice(charExp,textExp,num) {
      var result = genTypesForExpressionPair(textExp,STRING_TYPE);
      if (result === null) {
        logger.error("Type mismatch for MENU CHOICE on line "+num+"\n");
        return false;
      } else {
        return true;
      }
    }

    function menuHideIf(boolExp,num) {
      if (boolExp === null) {
        logger.error("Type mismatch for HIDE IF on line "+num+"\n");
        return false;
      } else {
        return true;
      }
    }

    function color(valueExp,num) {
      var result = genTypesForExpressionPair(valueExp,NUMERIC_TYPE);
      if (result === null) {
        logger.error("Type mismatch for COLOR on line "+num+"\n");
        return false;
      } else {
        return true;
      }
    }

    function bgColor(valueExp,num) {
      var result = genTypesForExpressionPair(valueExp,NUMERIC_TYPE);
      if (result === null) {
        logger.error("Type mismatch for BGCOLOR on line "+num+"\n");
        return false;
      } else {
        return true;
      }
    }

    function sleep(valueExp,num) {
      var result = genTypesForExpressionPair(valueExp,NUMERIC_TYPE);
      if (result === null) {
        logger.error("Type mismatch for SLEEP on line "+num+"\n");
        return false;
      } else {
        return true;
      }
    }

    function input(valueExp,num) {
      assignTypes([valueExp],STRING_TYPE);
      return true;
    }

    function play(valueExp,num) {
      var result = genTypesForExpressionPair(valueExp,STRING_TYPE);
      if (result === null) {
	logger.error("Type mismatch for PLAY on line "+num+"\n");
	return false;
      } else {
	return true;
      }
    }

    function forStatement(varExp,startExp,endExp,num) {
      if (!assignTypes([varExp],NUMERIC_TYPE) ||
          genTypesForExpressionPair(startExp,NUMERIC_TYPE)===null ||
          genTypesForExpressionPair(endExp,NUMERIC_TYPE)===null) {
        logger.error("Type mismatch for FOR on line "+num+"\n");
      } else {
        return true;
      }

    }

    function letStatement(varExp,valueExp,num) {
      if (varExp === null || valueExp === null) {
        logger.error("Type mismatch for assignment to "+varExp+" on line "+num+"\n");
        return false;
      }
      varExp = localVarName(varExp);
      // Value exp has an unknown type
      if (valueExp !== STRING_TYPE && valueExp !== NUMERIC_TYPE) {
        // The variable has a type- set the arg based on that
        if (varTypes[varExp] &&
            (varTypes[varExp] === STRING_TYPE ||
             varTypes[varExp] === NUMERIC_TYPE)) {
          return assignTypes(valueExp,varTypes[varExp]);
        } else {

          // There are no types yet
          var unassigned = [varExp];
          for (var i=0;i<valueExp.length;i++) {
            unassigned.push(valueExp[i]);
          }
          saveUnassignedTypes(unassigned);
          return true;
        }
      } else {
        if (!assignTypes([varExp],valueExp)) {
          logger.error("Type mismatch for assignment to "+varExp+" on line "+num+".\n");
          return false;
        } else {
          return true;
        }
      }
    }

/***********************************************************************
  END Type Gen functions
***********************************************************************/

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

    var expressionHandler = ExpressionHandler();

    return {
      expressionHandler: expressionHandler,
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
      next: trueFunc
    };
  }

  function CodeGeneratorPass(){
    // XXX handle errors by throwing an exception
    // XXX don't pass in the line number- let the caller handle the exception and print errors

    /*
      I'm implementing subroutine expressions by running each
      subroutine referenced in the expression and saving the results
      of each subroutine in a temp variable, then using the temp variable
      in the expression.

      This counter guarantees that there's no overlap in the names of
      those variables.
    */
    var expressionSubroutineCount = 0;
    function nextExpressionSubroutineName() {
      var next = expressionSubroutineCount;
      expressionSubroutineCount++;
      // Use in local vars in machine callstack objects
      // Must not conflict with other local variables
      return "!"+next;
    };
    // Adds instructions with calls to all of the function
    // referenced in the expression, then returns function that
    // evaluates the expression
    function expressionToFunction(exp) {
      function stringToFunction(expr) {
        // Actually convert a JS expression string to a function
        // Put it in a list to work around bug in some older browsers
        // evaluating a function expression directly
        var text = '[(function(){return '+expr+';})]';
        var listFunc = eval(text);
        return listFunc[0];
      };

      for (var i=0;i<exp.subs.length;i++) {
        callSubroutine(exp.subs[i].name,exp.subs[i].args,0);
        // wrap in function tocreate new temp for each iteration
        (function(){
          var temp = exp.subs[i].temp;
          pushInstruction(function() {
	    machine.saveRetToLocal(temp);
	    machine.advance();
          });})();
      }

      return stringToFunction(exp.value);
    }

    // Hack to get variable names from optimised code by stringifying a
    // function definition This let's us fully optimize and still eval()
    // code
    //
    // Typical Usage: nameFromFunctionString(function{NAME}.toString())
    function nameFromFunctionString(o) {
      var start = o.indexOf('{')+1;

      // Some old Firefoxen insert whitespace in the stringified function
      while (o[start] < o.length && o[start]===' ' || o[start]==='\n' || o[start]==='\r' || o[start]==='\t')
        start++;

      //  Some old Firefoxen insert semicolons
      var end = o.indexOf(';');
      if (end === -1)
        end = o.indexOf('}');
      return o.substr(start,end-start);
    };

    // find name of a variable in the machine
    function variableName(name) {
      /** @suppress {uselessCode} */
      var vname = (function(){machine.getGlobal}).toString();
      vname = nameFromFunctionString(vname);

      var escaped = name.replace("\\","\\\\").replace("'","\\'").replace('"','\\"').replace('\n','\\n').replace('\r','\\r')
      return vname+'(\''+escaped+'\')';
    };

    // Find name of local variable in the machine
    function localVariableName(name) {
      /** @suppress {uselessCode} */
      var vname = (function(){machine.getLocal}).toString();
      vname = nameFromFunctionString(vname);

      var escaped = name.replace("\\","\\\\").replace("'","\\'").replace('"','\\"').replace('\n','\\n').replace('\r','\\r')
      return vname+'(\''+escaped+'\')';
    };

/***********************************************************************
  BEGIN Code Gen functions
***********************************************************************/

    function printString(text,newline,pause,num) {
      if (text === null || text.length === 0) {
        // bare naked print
        if (newline)
          text = "\n";
      } else {
        if (newline)
          text = text+"\n";
      }
      if (pause) {
        pushInstruction(function() {
          machine.printMenu([function(){return text;}],[""],
                            undefined,undefined,undefined,undefined,undefined);

          machine.setInterruptDelay(0);
          machine.setInputVariable("!"); // Internal name
          machine.advance();
        });
      } else {
        pushInstruction(function(){
          if (machine.print(text))
            // Give up the CPU to allow display
            machine.setInterruptDelay(0);
          machine.advance();
        });
      }
      return true;
    }

    function printExp(exp,newline,pause,num) {
      if (!exp || (exp.resultType !== STRING_TYPE)) {
        logger.error("Invalid PRINT on line "+num+"\n");
        return false;
      }
      if (newline) {
        exp.value = exp.value+"+\"\\n\"";
      }
      var text = expressionToFunction(exp);
      if (pause) {
        pushInstruction(function() {
          machine.printMenu([text],[""],
                            undefined,undefined,undefined,undefined,undefined);
          machine.setInterruptDelay(0);
          machine.setInputVariable("!"); // Internal name
          machine.advance();
        });
      } else {
        pushInstruction(function(){
          if (machine.print(text()))
            // Give up the CPU to allow display
            machine.setInterruptDelay(0);
          machine.advance();
        });
      }
      return true;
    }

    function callSubroutine(sub, argExps, num) {
      var argNames = subArgNames[sub];
      var fArgs = [];
      for (var i=0;i<argExps.length;i++) {
        fArgs.push(expressionToFunction(argExps[i]));
      }
      var retName = returnValueName(sub);
      var ret;
      if (varTypes[retName] === STRING_TYPE) {
        ret = "";
      } else if (varTypes[retName] === NUMERIC_TYPE) {
        ret = 0;
      }
      pushInstruction(function () {
        var argVals = {};
        for (var i=0;i<fArgs.length;i++) {
          argVals[argNames[i]] = fArgs[i]();
        };
        // If we had local variables, we'd set them to 0 here
        machine.callSub(sub,argVals,ret);
      });
      return true;
    }

    function ifStatement(boolExp,num){
      if (!boolExp) {
        logger.error("Invalid IF on line "+num+"\n");
        return false;
      }
      var test = expressionToFunction(boolExp);
      loopStack.push({type:IF,
                      test:test,
                      elseloc:null,
                      loc:nextInstruction()});
      pushInstruction(null);
      return true;
    }

    function endIf(num) {
      var obj = loopStack.pop();
      if ((!obj) || obj.type !== IF) {
        logger.error("ERROR: END IF WITHOUT MATCHING IF\n");
      } else {
        var pos;
        if (!obj.elseloc) {
          pos=nextInstruction();
        } else {
          pos = obj.elseloc+1;
        }
        var test = obj.test;
        addInstructionAt(obj.loc,function(){
          if (test())
            machine.advance();
          else
            machine.setLoc(pos);
        });

        if (!!obj.elseloc) {
          var end=nextInstruction();
          addInstructionAt(obj.elseloc,function(){
            machine.setLoc(end);
          });
        }
      }
      return true;
    }

    function elseStatement(num) {
      var obj = loopStack[loopStack.length-1];
      if ((!obj) || obj.type !== IF) {
        logger.error("ERROR: ELSE WITHOUT MATCHING IF\n");
      } else {
        obj.elseloc=nextInstruction();
        pushInstruction(null);
      }
      return true;
    }

    function endWhile(num) {
      var obj = loopStack.pop();
      if ((!obj) || obj.type !== WHILE) {
        logger.error("ERROR: WEND IF WITHOUT MATCHING WHILE\n");
      } else {
        var test = obj.test;
        pushInstruction(function(){
          machine.setLoc(obj.top);
        });
        var pos=nextInstruction();
        addInstructionAt(obj.loc,function(){
          if (test())
            machine.advance();
          else
            machine.setLoc(pos);
        });
      }
      return true;
    }

    function whileStatement(exp,num){
      if (!exp) {
        logger.error("Invalid WHILE on line "+num+"\n");
        return false;
      }
      var top = nextInstruction();
      var test = expressionToFunction(exp);

      loopStack.push({type:WHILE,
                      test:test,
                      elseloc:null,
                      top:top,
                      loc:nextInstruction()});
      pushInstruction(null);
      return true;
    }

    function beginRandom(num) {
      loopStack.push({type:RANDOM,
                      events:[],
                      loc:nextInstruction()});
      pushInstruction(null);
      return true;
    }

    function waitForMusic() {
      pushInstruction(function(){
	// Wait flag 1 is wait for music
	machine.setAudioWaitFlag();
	machine.setInterruptDelay(0);
	machine.advance();
      }
		     );
      return true;
    }

    function beginSubroutine(sub, args, num) {
      if (code[sub] !== undefined) {
        logger.error("SUBROUTINE "+sub+" ALREADY DEFINED");
      } else {
        var i
        for (i=0;i<loopStack.length;i++) {
          if (loopStack[i].type === SUBROUTINE) {
            logger.error("NESTED SUBROUTINES NOT ALLOWED");
            break;
          }
        }
        if (i === loopStack.length) {
          loopStack.push({type:SUBROUTINE});
          currentSub = sub;
          code[sub] = [];
        }
      }
      return true;
    }

    function endSubroutine(num) {
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== SUBROUTINE) {
        logger.error("UNEXPECTED END SUBROUTINE");
	return false;
      } else {
        loopStack.pop();
        currentSub = "!";
      }
      return true;
    }

    function returnStatement(exp,num) {
      // XXX Keep track of returns - if there's at least one
      // return or the sub is used in an expression, all code
      // paths in the sub should have returns

      // Make sure there's a subroutine somewhere
      for (var i=loopStack.length-1;i>=0;i--) {
        if (loopStack[i].type === SUBROUTINE) {
          break;
        }
      }
      if (i===-1) {
        logger.error("UNEXPECTED RETURN OUTSIDE OF SUB");
        return false;
      }
      exp = expressionToFunction(exp);
      pushInstruction(function() {
        machine.returnFromSub(exp);
      });
      return true;
    }

    function endRandom(num) {
      var obj = loopStack.pop();
      if ((!obj) || obj.type !== RANDOM) {
        logger.error("ERROR: END RANDOM WITHOUT MATCHING BEGIN RANDOM on "+num+"\n");
      } else {
        var events = obj.events;
        if (events.length < 1) {
          logger.error("ERROR: RANDOM STATEMENTS REQUIRE AT LEAST 1 CHOICE\n");
        } else {
          var numNulls = 0;
          for (var n=0;n<events.length;n++) {
            if (events[n].chance === null) {
              numNulls++;
            }
          }
          if (numNulls === events.length) {
            for (var n=0;n<events.length;n++) {
              events[n].chance = 100.0/events.length;
            }
          } else if (numNulls > 0) {
            logger.error("ERROR: MIXED RANDOM MODES - EITHER SPECIFY CHANCE PERCENT OR DON'T\n");
          }

          var total = 0;
          for (var n=0;n<events.length;n++) {
            total += events[n].chance;
          }
          if (total < 99.999 || total > 100.001) {
            logger.error("ERROR: THE CHANCES OF RANDOM EVENTS SHOULD ADD UP TO 100%\n");
          } else {
            var endloc = nextInstruction();
            for (var n=1;n<events.length;n++) {
              addInstructionAt(events[n].loc-1, function() {
                machine.setLoc(endloc);
              });
            }
            addInstructionAt(obj.loc, function () {
              var r = Math.random()*100;
              for (var n=0;n<events.length;n++) {
                r -= events[n].chance;
                if (r<0 || n == events.length-1) {
                  machine.setLoc(events[n].loc);
                  break;
                }
              }
            });
          }
        }
      }
      return true;
    }

    function withChance(percent, num) {
      var obj = loopStack[loopStack.length-1];
      if ((!obj) || obj.type !== RANDOM) {
        logger.error("ERROR: WITH CHANCE WITHOUT MATCHING BEGIN RANDOM\n");
      } else {
        if (obj.events.length === 0 && nextInstruction() !== obj.loc+1) {
          logger.error("ERROR: NO CODE ALLOWED BETWEEN BEGIN RANDOM AND FIRST WITH CHOICE\n");
        } else {
          if (percent === undefined) {
            if (obj.events.length > 0) // Leave room for the jump to the end
              pushInstruction(null);
            obj.events.push({loc:nextInstruction(),
                             chance:null});

          } else {
            var chance = Number(percent);
            if (chance < 0.001 || chance > 99.999) {
              logger.error("ERROR: CHANCES MUST BE BETWEEN 0 and 100\n");
            } else {
              if (obj.events.length > 0) // Leave room for the jump to the end
                pushInstruction(null);
              obj.events.push({loc:nextInstruction(),
                               chance:chance});
            }
          }
        }
      }
      return true;
    }

    function withEvenChance(num) {
      return withChance(undefined,num);
    }

    function beginAsk(prompt,num) {
      if (!prompt) {
        logger.error("Invalid ASK statement line "+num+"\n");
        return false;
      }
      var top = nextInstruction();
      prompt = expressionToFunction(prompt);
      loopStack.push({type:ASK,
                      prompt:prompt,
                      color:[255,255,85],
                      promptColor:[85,255,255],
                      bgColor:[0,0,0],
                      noloc:null,
                      defaultValue:null,
                      top:top,
                      loc:nextInstruction()});
      pushInstruction(null); // Save space for prompt
      pushInstruction(null);
      return true;
    }

    function askColor(color,num) {
      var c = intToColor(color);
      if (c === null) {
        logger.error("INVALID ASK COLOR\n");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== ASK) {
        logger.error("ASK COLOR OUTSIDE OF AN ASK\n");
        return false;
      }
      if (loopStack[loopStack.length-1].loc !== nextInstruction()-2) {
        logger.error("ASK COLOR AFTER CODE\n");
        return false;
      }
      loopStack[loopStack.length-1].color = c;
      return true;
    }

    function askBGColor(color,num) {
      var c = intToColor(color);
      if (c === null) {
        logger.error("INVALID ASK BGCOLOR\n");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== ASK) {
        logger.error("ASK BGCOLOR OUTSIDE OF AN ASK\n");
        return false;
      }
      if (loopStack[loopStack.length-1].loc !== nextInstruction()-2) {
        logger.error("ASK BGCOLOR AFTER CODE\n");
        return false;
      }
      loopStack[loopStack.length-1].bgColor = c;
      return true;
    }

    function askPromptColor(color,num) {
      var c = intToColor(color);
      if (c === null) {
        logger.error("INVALID ASK PROMPT COLOR\n");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== ASK) {
        logger.error("ASK PROMPT COLOR OUTSIDE OF AN ASK\n");
        return false;
      }
      if (loopStack[loopStack.length-1].loc !== nextInstruction()-2) {
        logger.error("ASK PROMPT COLOR AFTER CODE\n");
        return false;
      }
      loopStack[loopStack.length-1].promptColor = c;
      return true;
    }

    function onNo(num) {
      var ask = loopStack[loopStack.length-1];
      if (ask && ask.type === ASK) {
        ask.noLoc = nextInstruction();
        pushInstruction(null);
      } else {
        logger.error("ON NO outside of an ASK\n");
        return false;
      }
      return true;
    }

    function onYes(num) {
      var ask = loopStack[loopStack.length-1];
      if (ask && ask.type === ASK) {
        if (loopStack[loopStack.length-1].loc !== nextInstruction()-2) {
          logger.error("ASK ON YES AFTER CODE\n");
          return false;
        }
      } else {
        logger.error("ON YES outside of an ASK\n");
        return false;
      }
      return true;
    }

    function askDefault(value,num) {
      if (value !== true && value !== false) {
        logger.error("INVALID ASK DEFAULT\n");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== ASK) {
        logger.error("DEFAULT OUTSIDE OF AN ASK\n");
        return false;
      }
      if (loopStack[loopStack.length-1].loc !== nextInstruction()-2) {
        logger.error("ASK DEFAULT AFTER CODE\n");
        return false;
      }
      loopStack[loopStack.length-1].defaultValue = value;
      return true;
    }

    function endAsk(num) {
      var ask = loopStack.pop();
      if (ask && ask.type === ASK) {
        var noLoc = nextInstruction();
        if (ask.noLoc) {
          var nextI = nextInstruction();
          addInstructionAt(ask.noLoc,function(){
            machine.setLoc(nextI);
          });
          noLoc = ask.noLoc+1;
        }
        var prompt = ask.prompt;
        var top = ask.top;
        addInstructionAt(ask.loc, function(){
          machine.printAsk(prompt,ask.defaultValue,ask.color,ask.bgColor,ask.promptColor);
          machine.setInterruptDelay(0);
          machine.setInputVariable("!"); // Invalid as an identifier
          machine.advance();
        });
        addInstructionAt(ask.loc+1, function(){
          if (machine.getGlobal("!")!==null) {
            if (machine.getGlobal("!").length>0) {
              var key=machine.getGlobal("!").toUpperCase()[0];
              if (key === "Y") {
                machine.advance();
                return;
              } else if (key === "N") {
                machine.setLoc(noLoc);
                return;
              }
            } else {
              if (ask.defaultValue === true) {
                machine.advance();
                return;
              } else if (ask.defaultValue === false) {
                machine.setLoc(noLoc);
                return;
              }
            }
          }
          machine.setLoc(top);
        });
      } else {
        logger.error("END ASK WITHOUT ASK\n");
	return false;
      }
      return true;
    }

    function beginMenu(prompt,num) {
      if (!prompt) {
        logger.error("Invalid MENU statement line "+num+"\n");
        return false;
      }
      loopStack.push({type:MENU,
                      color:[255,255,85],
                      choiceColor:[255,255,255],
                      promptColor:[85,255,255],
                      bgColor:[0,0,0],
                      choices:[],
                      prompt:prompt,
                      loc:nextInstruction()});
      pushInstruction(null); // Goto subroutines and setup
      pushInstruction(null); // Display menu and throw interrupt
      pushInstruction(null); // process response
      return true;
    }

    function menuColor(color,num) {
      var c = intToColor(color);
      if (c === null) {
        logger.error("INVALID MENU COLOR\n");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== MENU) {
        logger.error("MENU COLOR OUTSIDE OF A MENU\n");
        return false;
      }
      if (loopStack[loopStack.length-1].choices.length > 0) {
        logger.error("MENU COLOR AFTER CHOICE\n");
        return false;
      }
      loopStack[loopStack.length-1].color = c;
      return true;
    }

    function menuBGColor(color,num) {
      var c = intToColor(color);
      if (c === null) {
        logger.error("INVALID MENU BGCOLOR\n");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== MENU) {
        logger.error("MENU BGCOLOR OUTSIDE OF A MENU\n");
        return false;
      }
      if (loopStack[loopStack.length-1].choices.length > 0) {
        logger.error("MENU BGCOLOR AFTER CHOICE\n");
        return false;
      }
      loopStack[loopStack.length-1].bgColor = c;
      return true;
    }

    function menuChoiceColor(color,num) {
      var c = intToColor(color);
      if (c === null) {
        logger.error("INVALID MENU CHOICE COLOR\n");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== MENU) {
        logger.error("MENU CHOICE COLOR OUTSIDE OF A MENU\n");
        return false;
      }
      if (loopStack[loopStack.length-1].choices.length > 0) {
        logger.error("MENU CHOICE COLOR AFTER CHOICE\n");
        return false;
      }
      loopStack[loopStack.length-1].choiceColor = c;
      return true;
    }

    function menuPromptColor(color,num) {
      var c = intToColor(color);
      if (c === null) {
        logger.error("INVALID MENU PROMPT COLOR\n");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== MENU) {
        logger.error("MENU PROMPT COLOR OUTSIDE OF A MENU\n");
        return false;
      }
      if (loopStack[loopStack.length-1].choices.length > 0) {
        logger.error("MENU PROMPT COLOR AFTER CHOICE\n");
        return false;
      }
      loopStack[loopStack.length-1].promptColor = c;
      return true;
    }

    function endMenu(num) {
      /* Subroutine expressions are tricky for menus.

         Subroutine expressions require adding instructions to
         call the subroutine before the instruction using the
         expression function.

         We don't know what those subroutines are until we get to
         the end of the menu.

         The strategy is to put the subroutine calls at the end,
         start the menu with a jump to those calls, and
         follow the calls with a jump back to the second
         instruction in the menu.

         Another strategy might be to stuff all the calls into the
         first instruction and avoid the jumps.

      */
      var menu = loopStack.pop();
      if (menu && menu.type === MENU) {
        var lastMenuI = nextInstruction();
        pushInstruction(null); // replace with
        // setLoc(newI); so last
        // choice continues past
        // the menu
        var choiceText = [];
        var choiceKeys = [];
        var hideConditions = [];
        for (var n=0;n<menu.choices.length;n++) {
          choiceText.push(expressionToFunction(menu.choices[n].exp));
          choiceKeys.push(menu.choices[n].key);
          if (menu.choices[n].hideIf) {
            hideConditions.push(expressionToFunction(menu.choices[n].hideIf));
          } else {
            hideConditions.push(function(){return false;});
          }
        }
        var prompt = expressionToFunction(menu.prompt);
        pushInstruction(function(){
          machine.setLoc(menu.loc+1);
        });
        addInstructionAt(menu.loc+1, function(){
          var filteredText = [];
          var filteredKeys = [];
          for (var n=0;n<hideConditions.length;n++) {
            if (!hideConditions[n]()) {
              filteredText.push(choiceText[n]);
              filteredKeys.push(choiceKeys[n]);
            }
          }
          machine.printMenu(filteredText,filteredKeys,prompt,menu.color,menu.bgColor,menu.promptColor,menu.choiceColor);
          machine.setInterruptDelay(0);
          machine.setInputVariable("!"); // Invalid as an identifier
          machine.advance();
        });
        addInstructionAt(menu.loc+2, function(){
          for (var n=0;n<menu.choices.length;n++){
            if (!hideConditions[n]()) {
              if (machine.getGlobal("!") && machine.getGlobal("!").toUpperCase() == menu.choices[n].key) {
                machine.setLoc(menu.choices[n].loc);
                return;
              }
            }
          }
          machine.retreat();
        });

        addInstructionAt(menu.loc,function(){
          machine.setLoc(lastMenuI+1);
        });
        var newI = nextInstruction();
        for (var n=1;n<menu.choices.length;n++) {
          addInstructionAt(menu.choices[n].loc-1, function(){
            machine.setLoc(newI);
          });
        }
        addInstructionAt(lastMenuI, function(){
          machine.setLoc(newI);
        });
      } else {
        logger.error("END MENU WITHOUT BEGIN MENU\n");
	return false;
      }
      return true;
    }

    function menuChoice(key,exp1,num) {
      if (loopStack[loopStack.length-1] && loopStack[loopStack.length-1].type === MENU) {
        if (loopStack[loopStack.length-1].choices.length > 0)
          pushInstruction(null); // Replace with goto end
        loopStack[loopStack.length-1].choices.push({key:key,
                                                    exp:exp1,
                                                    loc:nextInstruction()});
      } else {
        // XXX handle errors
        logger.error("CHOICE OUTSIDE OF A MENU\n");
	return false;
      }
      return true;
    }

    function menuHideIf(boolExp,num) {
      if (!boolExp) {
        logger.error("Invalid HIDE IF on line "+num+"\n");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== MENU) {
        logger.error("HIDE IF OUTSIDE OF A MENU\n");
        return false;
      }
      var choices = loopStack[loopStack.length-1].choices;
      if (choices.length === 0) {
        logger.error("HIDE IF found before CHOICE\n");
        return false;
      }
      if (choices[choices.length-1].loc !== nextInstruction()) {
        logger.error("HIDE IF does not immediately follow CHOICE\n");
        return false;
      }
      if (choices[choices.length-1].hideIf) {
        logger.error("Multiple HIDE IFs for single CHOICE\n");
        return false;
      }
      choices[choices.length-1].hideIf = boolExp;

      return true;

    }

    function color(exp,num) {
      var color = expressionToFunction(exp);
      pushInstruction(function(){
        machine.setColor(color());
        machine.advance();
      });
      return true;
    }

    function bgColor(c,num) {
      var color = expressionToFunction(c);
      pushInstruction(function(){
        machine.setBGColor(color());
        machine.advance();
      });
      return true;
    }

    function sleep(duration,num) {
      if (!duration) {
        logger.error("Invalid SLEEP on line "+num+"\n");
        return false;
      }
      duration = expressionToFunction(duration);
      pushInstruction(function() {
        machine.advance();
        machine.setInterruptDelay(duration());
      });
      return true;
    }

    function input(varname,num) {
      if (varTypes[varname] === undefined) {
        logger.error(varname+" undefined in INPUT\n");
        return;
      }
      pushInstruction(function() {
        machine.setInterruptDelay(0);
        machine.setInputVariable(varname);
        machine.advance();
      });
      return true;
    }

    function play(abc,num) {
      if (!abc) {
	logger.error("Invalid PLAY on line "+num+"\n");
	return false;
      }
      var notes = expressionToFunction(abc);
      pushInstruction(function() {
	machine.play(notes());
        machine.advance();
      });
      return true;
    }

    function forStatement(varname,first,last,num) {
      if (!first || !last) {
        logger.error("what the FOR on line "+num+"\n");
        return false;
      }
      //addFor: function(varname,first,last) {
      if (varTypes[varname] === undefined) {
        logger.error(varname+" undefined in FOR\n");
        return;
      }

      first = expressionToFunction(first);
      last = expressionToFunction(last);

      pushInstruction(null); // Fill it in when we get the NEXT
      loopStack.push({type:FOR,varname:varname,
                      last:last,
                      first:first,
                      top:nextInstruction()});

      return true;
    }
    function letStatement(varname,exp,num) {
      if (!varname) {
        logger.error("Invalid expression assigned to "+varname+" on line "+num+"\n");
        return false;
      }
      if (varTypes[varname] === undefined) {
        logger.error(varname+" undefined in assignment\n");
        return;
      }
      var value = expressionToFunction(exp);
      pushInstruction(function() {
        machine.setGlobal(varname,value());
        machine.advance();
      });
      return true;
    }

    function comment(tokens, num) {
      return true;
    }

    function clear(num) {
      pushInstruction(function(){
        machine.clear();
        machine.advance();
        // Give up the CPU to allow display
        machine.setInterruptDelay(0);
      });
      return true;
    }

    function next(varExp,num) {
      var varname = varExp[0].value;
      var obj = loopStack.pop();
      if ((!obj) || obj.type !== FOR || varname != obj.varname) {
        logger.error("ERROR: NEXT WITHOUT MATCHING FOR\n");
      } else {
        var first = obj.first;
        var last = obj.last;
        pushInstruction(function(){
          if (machine.getGlobal(varname)>=last()){
            machine.advance();
          } else {
            machine.incGlobal(varname);
            machine.setLoc(obj.top);
          }
        });
        var after = nextInstruction();
        addInstructionAt(obj.top-1,function(){
          machine.setGlobal(obj.varname, first());
          if (machine.getGlobal(obj.varname)<=last()){
            machine.advance()
          } else {
            machine.incGlobal(obj.varname);
            machine.setLoc(after);
          }
        });
      }
      return true;
    }
/***********************************************************************
  END Code Gen functions
***********************************************************************/

/***********************************************************************
  BEGIN Code Gen pass expression handler
***********************************************************************/
    function ExpressionHandler(){
      // generate expressions
      // Returns an EXPRESSION token or null
      // XXX Handle errors
      // XXX Fail if types are incorrect in every case


      // This is vastly simplified because we keep JavaScript semantics for
      // operator precendence.

      function numericExpression(value) {
        return numericExpressionWithSubs(value,[]);
      }
      function numericExpressionWithSubs(value, subs) {
        return {type:EXPRESSION,value:value,resultType:NUMERIC_TYPE,subs:subs};
      }
      function numericBinaryExpression(op,exp1,exp2) {
        if ((!exp1 || !exp2) ||
            (exp1.resultType !== NUMERIC_TYPE) ||
            (exp2.resultType !== NUMERIC_TYPE)) {
          return null;
        }
        return numericExpressionWithSubs(exp1.value+op+exp2.value,exp1.subs.concat(exp2.subs));
      }

      function stringExpression(value) {
        return stringExpressionWithSubs(value,[]);
      }
      function stringExpressionWithSubs(value, subs) {
        return {type:EXPRESSION,value:value,resultType:STRING_TYPE,subs:subs};
      }
      function boolExpressionWithSubs(value,subs) {
        return {type:BOOLEXPRESSION,value:value,subs:subs};
      }
      function boolBinaryExpression(op,exp1,exp2) {
        if (!exp1 || !exp2)
          return null;
        return boolExpressionWithSubs(exp1.value+op+exp2.value,exp1.subs.concat(exp2.subs));
      }

      function stringLiteral(value) {
        return stringExpression(JSON.stringify(value));
      }

      function randomBuiltin(l,h){
        // XXX make constant
        // Hack to find name of variable, so optimizers can do their work
        /** @suppress {uselessCode} */
        var rndname = (function(){machine.random}).toString();
        rndname = nameFromFunctionString(rndname);
        return numericExpressionWithSubs(rndname+'('+l.value+','+h.value+')',l.subs.concat(h.subs));
      }

      function piBuiltin() {
        return numericExpression('Math.PI');
      }

      function variable(name) {
        // Check to see that variable has type data
        var localName = localVarName(name);
        var varType = varTypes[localName];
        if (!varType) {
          return null;
        }

        // Handle case of subroutine local
        if (localName !== name) {
          if (varType == STRING_TYPE)
            return stringExpression(localVariableName(name));
          else if (varType == NUMERIC_TYPE)
            return numericExpression(localVariableName(name));

        } else { // It's a plain old global variable
          if (varType == STRING_TYPE)
            return stringExpression(variableName(name));
          else if (varType == NUMERIC_TYPE)
            return numericExpression(variableName(name));
        }
      }

      function validateStringSubExpression(result) {
        if (!result || result.resultType !== STRING_TYPE) {
          return null;
        } else {
          return result;
        }
      }
      function validateNumericSubExpression(result) {
        if (!result || result.resultType !== NUMERIC_TYPE) {
          return null;
        } else {
          return result;
        }
      }

      function cintBuiltin(p) {
        return numericExpressionWithSubs('Math.ceil('+p.value+')',p.subs);
      }
      function intBuiltin(p) {
        return numericExpressionWithSubs('Math.floor('+p.value+')',p.subs);
      }
      function fixBuiltin(p) {
        return numericExpressionWithSubs('Math.trunc('+p.value+')',p.subs);
      }
      function absBuiltin(p) {
        return numericExpressionWithSubs('Math.abs('+p.value+')',p.subs);
      }
      function strzBuiltin(p) {
        return stringExpressionWithSubs('('+p.value+').toString(10)',p.subs);
      }
      function leftzBuiltin(p,n) {
        return stringExpressionWithSubs('('+p.value+').substring(0,'+n.value+')',p.subs.concat(n.subs));
      }
      function rightzBuiltin(p,n) {
        return stringExpressionWithSubs('('+p.value+').substring(('+p.value+').length-'+n.value+',('+p.value+').length)',p.subs.concat(n.subs));
      }
      function valBuiltin(p) {
        return numericExpressionWithSubs('Number('+p.value+')',p.subs);
      }
      function lenBuiltin(p) {
        return numericExpressionWithSubs('('+p.value+').length',p.subs);
      }
      function parenExpression(inner) {
        if (!inner)
          return null;
        if (inner.resultType === NUMERIC_TYPE)
          return numericExpressionWithSubs('('+inner.value+')',inner.subs);
        else if (inner.resultType === STRING_TYPE)
          return stringExpressionWithSubs('('+inner.value+')',inner.subs);
        else
          return null;
      }
      function boolParenExpression(result) {
        if (!result)
          return null;
        return boolExpressionWithSubs('('+result.value+')',result.subs);
      }
      function boolOrExpression(exp1,exp2) {
        return boolBinaryExpression('||',exp1,exp2);
      }
      function boolAndExpression(exp1,exp2) {
        return boolBinaryExpression('&&',exp1,exp2);
      }
      function boolNotExpression(exp1) {
        if (!exp1)
          return null;
        return boolExpressionWithSubs('!'+exp1.value,exp1.subs);
      }
      function boolEqualExpression(exp1,exp2) {
        return boolBinaryExpression('===',exp1,exp2);
      }
      function boolLessExpression(exp1,exp2) {
        return boolBinaryExpression('<',exp1,exp2);
      }
      function boolGreaterExpression(exp1,exp2) {
        return boolBinaryExpression('>',exp1,exp2);
      }
      function boolLessOrEqualExpression(exp1,exp2) {
        return boolBinaryExpression('<=',exp1,exp2);
      }
      function boolGreaterOrEqualExpression(exp1,exp2) {
        return boolBinaryExpression('>=',exp1,exp2);
      }
      function boolNotEqualExpression(exp1,exp2) {
        return boolBinaryExpression('!==',exp1,exp2);
      }
      function callSubroutine(name,argExps) {
	// Check the types of the argument expressions
	for (var i = 0; i < argExps.length ; i++) {
	  var type = varTypes[argNameByArity(name,i)];
	  if (type === STRING_TYPE)
	    argExps[i] = validateStringSubExpression(argExps[i]);
	  else if (type === NUMERIC_TYPE)
	    argExps[i] = validateNumericSubExpression(argExps[i]);
	  else if (type !== undefined) {
	    logger.error("Invalid type for subroutine "+name+" argument "+i);
	    argExps[i] = null;
	  }
	}

	// subroutine results are saved in a temp variable
	var temp = nextExpressionSubroutineName();
	// Expressions have a list of subroutines the need to be called
	// before they are run
	var subs = [{temp:temp,name:name,args:argExps}];
	var retName = returnValueName(name);

	// The name of the variable where the temps are stored
	var t = localVariableName(temp);
        var returnType = varTypes[retName];
        if (returnType === STRING_TYPE)
          return stringExpressionWithSubs(t,subs);
        else if (returnType === NUMERIC_TYPE)
          return numericExpressionWithSubs(t,subs);
      }
      function additionExpression(a,b) {
	if (a.resultType === STRING_TYPE && b.resultType === STRING_TYPE) {
	  // Silently truncate long strings
          return stringExpressionWithSubs('('+a.value+'+'+b.value+').slice(0,255)',a.subs.concat(b.subs));
        } else {
          return numericBinaryExpression('+',a,b);
        }
      }
      function subtractionExpression(a,b) {
        return numericBinaryExpression('-',a,b);
      }
      function multiplicationExpression(a,b) {
        return numericBinaryExpression('*',a,b);
      }
      function divisionExpression(a,b) {
        return numericBinaryExpression('/',a,b);
      }
      return {
        numericLiteral: numericExpression,
        stringLiteral: stringLiteral,
        randomBuiltin: randomBuiltin,
        piBuiltin: piBuiltin,
        variable: variable,
        validateStringSubExpression: validateStringSubExpression,
        validateNumericSubExpression: validateNumericSubExpression,
        cintBuiltin: cintBuiltin,
        intBuiltin: intBuiltin,
        fixBuiltin: fixBuiltin,
        absBuiltin: absBuiltin,
        strzBuiltin: strzBuiltin,
        leftzBuiltin: leftzBuiltin,
        rightzBuiltin: rightzBuiltin,
        valBuiltin: valBuiltin,
        lenBuiltin: lenBuiltin,
        parenExpression: parenExpression,
        boolParenExpression: boolParenExpression,
        boolOrExpression: boolOrExpression,
        boolAndExpression: boolAndExpression,
        boolNotExpression: boolNotExpression,
        boolEqualExpression: boolEqualExpression,
        boolLessExpression: boolLessExpression,
        boolGreaterExpression: boolGreaterExpression,
        boolLessOrEqualExpression: boolLessOrEqualExpression,
        boolGreaterOrEqualExpression: boolGreaterOrEqualExpression,
        boolNotEqualExpression: boolNotEqualExpression,
        callSubroutine: callSubroutine,
	additionExpression: additionExpression,
	subtractionExpression: subtractionExpression,
	multiplicationExpression: multiplicationExpression,
	divisionExpression: divisionExpression
      };
    }

/***********************************************************************
  END Code Gen pass expression handler
***********************************************************************/
    var expressionHandler = ExpressionHandler();

    return {
      expressionHandler: expressionHandler,
      printString: printString,
      printExp: printExp,
      ifStatement: ifStatement,
      endIf: endIf,
      elseStatement: elseStatement,
      endWhile: endWhile,
      whileStatement: whileStatement,
      beginRandom: beginRandom,
      waitForMusic: waitForMusic,
      beginSubroutine: beginSubroutine,
      callSubroutine: callSubroutine,
      endSubroutine: endSubroutine,
      returnStatement: returnStatement,
      endRandom: endRandom,
      withChance: withChance,
      withEvenChance: withEvenChance,
      beginAsk: beginAsk,
      askColor: askColor,
      askBGColor: askBGColor,
      askPromptColor: askPromptColor,
      onNo: onNo,
      onYes: onYes,
      askDefault: askDefault,
      endAsk: endAsk,
      beginMenu: beginMenu,
      menuColor: menuColor,
      menuBGColor: menuBGColor,
      menuChoiceColor: menuChoiceColor,
      menuPromptColor: menuPromptColor,
      endMenu: endMenu,
      menuChoice: menuChoice,
      menuHideIf: menuHideIf,
      color: color,
      bgColor: bgColor,
      sleep: sleep,
      input: input,
      play: play,
      forStatement: forStatement,
      letStatement: letStatement,
      comment: comment,
      clear: clear,
      next: next
    };
  }

  var handler1 = TypeGeneratorPass();
  var handler2 = CodeGeneratorPass();

  function numPasses() {
    return 2;
  }

  function handlerForPass(pass) {
      if (pass === 0)
	return handler1;
      else if (pass === 1)
	return handler2;
  }

  function validate() {
    // Calling fake subroutines is stupid
    for (var i=0;i<calledSubs.length;i++) {
      var name=calledSubs[i];
      if (!code[name]) {
        logger.error("ERROR: CALL TO FAKE SUBROUTINE "+name+"!\n");
        return false;
      }
    }
    return true;
  }

  function generate() {
    // Initialize numeric values to 0, strings to empty string
    // Variables with unknown types remain undefined, always fail in comparisons
    var vars = {};
    for (var v in varTypes) {
      if (varTypes[v] === NUMERIC_TYPE)
        vars[v] = 0;
      else if (varTypes[v] === STRING_TYPE)
        vars[v] = "";
    }
    machine.init(code, vars);
  }

  return {
    numPasses: numPasses,
    handlerForPass: handlerForPass,
    // Called after code generation is complete to check for stupidness
    validate: validate,
    // Called after code generation is complete and validated
    // Make the code
    generate: generate
  };
}
