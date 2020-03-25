  //     Maybe pass in an error handler?

function CodeGen(display, audio, machine, logger) {

    // BEGIN Initialize integration between components
    
    audio.setOnAudioComplete(machine.getOnAudioComplete());

    // This runs on form submit or when an menu option is clicked,
    // grabbing and processing the text in the inputTextElement
    display.setInputHandler(function(e) {
      audio.go();
      if (machine.isWaitingForInput()) {
	machine.acceptInput(display.getInputValue());
      }
      if (e)
	e.preventDefault();
      
      // Scroll to the input
      display.scroll();
    });

    // END Initialize integration between components
    
    // Private variables
    var loopStack;  // Keeps track of nested loops

    // Map of variable name to STRING, NUMERIC, or list of matches
    // There are special names for subtroutine args
    var varTypes;

    var subArgNames;      // Map of subroutine to list of param names
      
    var subArgCount; // Map of subroutine to integer param count                                                     // Used when subs are called before declaration

    var code; // map of function names to list of instructions
    var currentSub; // Name of the sub we're currently adding code to
      
    var calledSubs;  // Subroutines that were called before being defined
                     // So we can check that they eventually get defined


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

    function comparisonOpToCode(opToken) {
      if (opToken.type === EQUALS) {
        return '===';
      } else if (opToken.type === LESS) {
        return '<';
      } else if (opToken.type === GREATER) {
        return '>';
      } else if (opToken.type === GREATEROREQUAL) {
        return '>=';
      } else if (opToken.type === LESSOREQUAL) {
        return '<=';
      } else if (opToken.type === NOTEQUAL) {
        return '!=';
      } else {
        return null
      }
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

    return {
    init: function() {
      loopStack = [];
      varTypes = {};
      subArgNames = {};
      subArgCount = {};
      code = {"!":[]}; // ! is the main block
      currentSub = "!";
      calledSubs = [];
    },
    // Called after code generation is complete to check for stupidness
    validate: function () {
      // Calling fake subroutines is stupid
      for (var i=0;i<calledSubs.length;i++) {
        var name=calledSubs[i];
        if (!code[name]) {
          logger.error("ERROR: CALL TO FAKE SUBROUTINE "+name+"!\n");
          return false;
        }
      }
      return true;
    },
    // Called after code generation is complete and validated
    // Make the code
    generate: function () {
      // Initialize numeric values to 0, strings to empty string
      // Variables with unknown types remain undefined, always fail in comparisons
      var vars = {};
      for (var v in varTypes) {
        if (varTypes[v] === NUMERIC)
          vars[v] = 0;
        else if (varTypes[v] === STRING)
          vars[v] = "";
      }
      machine.init(code, vars);
    },
    argType: function(sub,pos) {
      return varTypes[argNameByArity(sub,pos)];
    },

    typeGeneratorPass: function() {
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
            STRING - this is a string
            NUMERIC - this is a numeric type
            null - something is wrong
            Array - we haven't figured it out - this is a list of identifiers

         The second pass uses this type data to generate code
         
      */

      function assignTypes(variables,type) {
        // type must be resolved before this is called
        if (type !== STRING && type !== NUMERIC) {
          logger.error("TYPE SYSTEM ERROR\n");
          return false;
        }
        var sameTypeVars = [];
        for (var i=0;i<variables.length;i++) {
          if (varTypes[variables[i]] &&
              varTypes[variables[i]] !== STRING &&
              varTypes[variables[i]] !== NUMERIC) {
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
              (varTypes[variables[i]]===STRING ||
               varTypes[variables[i]]===NUMERIC)) {
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
        //   STRING, NUMERIC, null, or list
        
        // Something is bad
        if (type1 === null || type2 === null)
          return null;
        
        // The first expression can be resolved
        if (type1 === STRING || type1 === NUMERIC) {
          if (type2 === type1) {
            return type1;
          } else if (type2 !== STRING && type2 !== NUMERIC) {
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
        if (type2 === STRING || type2 === NUMERIC) {
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

      return {
      expressionHandler:  function() {
        // Finds the type of an unknown expression, returning
        // the type or a list of variables with the type
        
        // XXX Handle errors so we can differentiate between
        //     parser errors and type errors
        
        // Possible return values for all functions:
        // STRING - this is a string
        // NUMERIC - this is a numeric type
        // null - something is wrong
        // Array - we haven't figured it out - this is a list of identifiers
	return {
        numericLiteral: function(value) {
          return NUMERIC;
        },
        stringLiteral: function(value) {
          return STRING;
        },
        randomBuiltin: function(value) {
          return NUMERIC;
        },
        piBuiltin: function() {
          return NUMERIC;
        },
        variable: function(name) {
          name = localVarName(name);
          // If this is local to a sub, use the local
          if (varTypes[name]===undefined) {
            return [name]; // unknown
          } else {
            return varTypes[name];
          }
        },
        expression: function(value,resultType) {
          return null; // Expression tokens shouldn't exist in the first pass
        },
        validateSubExpression: function(subExp,type) {
          if (type !== undefined && subExp !== type) {
            // if it's not an exact match, check it out
            subExp = genTypesForExpressionPair(type,subExp)
            if (!subExp) {
              logger.error("TYPE MISMATCH.");
              return null;
            }
          }
          return subExp;
        },
        cintBuiltin: function(value) {
          return NUMERIC;
        },
        intBuiltin: function(param) {
          return NUMERIC;
        },
        fixBuiltin: function(param) {
          return NUMERIC;
        },
        absBuiltin: function(param) {
          return NUMERIC;
        },
        strzBuiltin: function(param) {
          return STRING;
        },
        leftzBuiltin: function(param) {
          return STRING;
        },
        rightzBuiltin: function(param) {
          return STRING;
        },
        valBuiltin: function(param) {
          return NUMERIC;
        },
        lenBuiltin: function(param) {
          return NUMERIC;
        },
        parenExpression: function(subExp) {
          return subExp;
        },
        boolParenExpression: function(subExp) {
          return subExp;
        },
        boolOrExpression: function(exp1,exp2) {
          // XXX This doesn't make sense. There is no boolean type
          if (!exp1 || !exp2)
            return null;
          return exp1;
        },
        boolAndExpression: function(exp1,exp2) {
          // XXX This doesn't make sense. There is no boolean type
          if (!exp1 || !exp2)
            return null;
          return exp1;
        },
        boolNotExpression: function(exp1) {
          // XXX This doesn't make sense. There is no boolean type
          return exp1;
        },
        boolBinaryExpression: function(exp1,op,exp2) {
          // Returns the type of exp1, exp2 rather than type BOOL
          return genTypesForExpressionPair(exp1,exp2);         
        },
        callSubroutine: function(name,argExps) {
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
        },
        binaryExpression: function(operator,a,b) {
          if (a === null || b === null) {
            return null;
          }
          if (operator===PLUS) {
            return genTypesForExpressionPair(a,b);
          } else {
            if (genTypesForExpressionPair(a,NUMERIC) &&
                genTypesForExpressionPair(b,NUMERIC))
              return NUMERIC;
            else
              return null;
          }
        }
        };
      }(),
      printString: function(value,newline,pause,num) {
        return (value !== null && value !== undefined);
      },
      printExp: function(exp,newline,pause,num) {
        var result = genTypesForExpressionPair(exp,STRING);
        if (!result) {
          logger.error("Type mismatch for PRINT on line "+num+"\n");
        }
        return result;
      },
      ifStatement: function(boolExp,num){
        if (boolExp === null) {
          logger.error("Invalid comparison for IF on line "+num+"\n");
          return false;
        }
        return true;
        
      },
      endIf: function(num) {
        return true;
      },
      elseStatement: function(num) {
        return true;
      },
      endWhile: function(num) {
        return true;
      },
      whileStatement: function(exp,num){
        if (exp === null) {
          logger.error("Type mismath for WHILE on line "+num+"\n");
          return false;
        }
        return true;
        
      },
      beginRandom: function(num) {
        return true;
      },
      waitForMusic: function() {
	return true;
      },
      beginSubroutine: function(name, args, num) {
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
      },
      callSubroutine: function(name, argExps, num) {
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
      },
      endSubroutine: function(num) {
        currentSub = "!";
        return true;
      },
      returnStatement: function(exp, num) {
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
      },
      endRandom: function(num) {
        return true;
      },
      withChance: function(chance, num) {
        return true;
      },
      withEvenChance: function(num) {
        return true;
      },
      beginAsk: function(promptExp,num) {
        var result = genTypesForExpressionPair(promptExp,STRING);
        if (result === null) {
          logger.error("Type mismatch for ASK on line "+num+"\n");
          return false;
        } else {
          return true;
        }      
      },
      askColor: function(value,num) {
        return true;
      },
      askBGColor: function(value,num) {
        return true;
      },
      askPromptColor: function(value,num) {
        return true;
      },
      onNo: function(num) {
        return true;
      },
      onYes: function(num) {
        return true;
      },
      askDefault: function(value,num) {
        return true;
      },
      endAsk: function(num) {
        return true;
      },
      beginMenu: function(promptExp,num) {
        var result = genTypesForExpressionPair(promptExp,STRING);
        if (result === null) {
          logger.error("Type mismatch for BEGIN MENU on line "+num+"\n");
          return false;
        } else {
          return true;
        }
      },
      menuColor: function(colorExp,num) {
        return true;
      },
      menuBGColor: function(colorExp,num) {
        return true;
      },
      menuChoiceColor: function(colorExp,num) {
        return true;
      },
      menuPromptColor: function(colorExp,num) {
        return true;
      },
      endMenu: function(num) {
        return true;
      },
      menuChoice: function(charExp,textExp,num) {
        var result = genTypesForExpressionPair(textExp,STRING);
        if (result === null) {
          logger.error("Type mismatch for MENU CHOICE on line "+num+"\n");
          return false;
        } else {
          return true;
        }
      },
      menuHideIf: function(boolExp,num) {
        if (boolExp === null) {
          logger.error("Type mismatch for HIDE IF on line "+num+"\n");
          return false;
        } else {
          return true;
        }
      },
      color: function(valueExp,num) {
        var result = genTypesForExpressionPair(valueExp,NUMERIC);
        if (result === null) {
          logger.error("Type mismatch for COLOR on line "+num+"\n");
          return false;
        } else {
          return true;
        }
      },
      bgColor: function(valueExp,num) {
        var result = genTypesForExpressionPair(valueExp,NUMERIC);
        if (result === null) {
          logger.error("Type mismatch for BGCOLOR on line "+num+"\n");
          return false;
        } else {
          return true;
        }
      },
      sleep: function(valueExp,num) {
        var result = genTypesForExpressionPair(valueExp,NUMERIC);
        if (result === null) {
          logger.error("Type mismatch for SLEEP on line "+num+"\n");
          return false;
        } else {
          return true;
        }       
      },
      input: function(valueExp,num) {
        assignTypes([valueExp],STRING);
        return true;
      },
      play: function(valueExp,num) {
	var result = genTypesForExpressionPair(valueExp,STRING);
	if (result === null) {
	  logger.error("Type mismatch for PLAY on line "+num+"\n");
	  return false;
	} else {
	  return true;
	}
      },
      forStatement: function(varExp,startExp,endExp,num) {
        if (!assignTypes([varExp],NUMERIC) ||
            genTypesForExpressionPair(startExp,NUMERIC)===null ||
            genTypesForExpressionPair(endExp,NUMERIC)===null) {
          logger.error("Type mismatch for FOR on line "+num+"\n");       
        } else {
          return true;
        }
        
      },
      letStatement: function(varExp,valueExp,num) {
        if (varExp === null || valueExp === null) {
          logger.error("Type mismatch for assignment to "+varExp+" on line "+num+"\n");
          return false;
        }
        varExp = localVarName(varExp);
        // Value exp has an unknown type
        if (valueExp !== STRING && valueExp !== NUMERIC) {
          // The variable has a type- set the arg based on that
          if (varTypes[varExp] &&
              (varTypes[varExp] === STRING ||
               varTypes[varExp] === NUMERIC)) {
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
      },
      comment: function(tokens, num) {
        return true;
      },
      clear: function(num) {
        return true;
      },
      next: function(varExp,num) {
        return true;
      }
    };
    }(),
      codeGeneratorPass: function(){
	return {
        expressionHandler: function(){
          // generate expressions
          // XXX Handle errors
          // Returns an EXPRESSION token or null
          
          // This is vastly simplified because we keep JavaScript semantics for
          // operator precendence.
          
          // XXX Fail if types are incorrect in every case

          /*
            Ugghhhhh....
            
            I'm working really hard to avoid parsing expressions
            and instead pass them off to JavaScript.
            
            It's maybe not worth it. I don't know.
            
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
            // Use in .vars in machine._callstack objects
            // Must not conflict with other local variables
            return "!"+next;
          };
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
          // The name of the object with all the local subroutine variables in it,
          // the .vars object at the top of the stack
          function expressionSubTempObjName() {
            /** @suppress {uselessCode} */
            var o = function(){machine._callstack[machine._callstack.length-1].vars}.toString();
            return nameFromFunctionString(o);
          };

          // find name of a variable in the machine
          function variableName(name) {
            /** @suppress {uselessCode} */
            var vname = (function(){machine._vars}).toString();
            vname = nameFromFunctionString(vname);
            
            var escaped = name.replace("\\","\\\\").replace("'","\\'").replace('"','\\"').replace('\n','\\n').replace('\r','\\r')
            return vname+'[\''+escaped+'\']';
          };

          // Find name of local variable in the machine
          function localVariableName(name) {
            /** @suppress {uselessCode} */
            var vname = (function(){machine._callstack[machine._callstack.length-1].vars}).toString();
            vname = nameFromFunctionString(vname);
            
            var escaped = name.replace("\\","\\\\").replace("'","\\'").replace('"','\\"').replace('\n','\\n').replace('\r','\\r')
            return vname+'[\''+escaped+'\']';
          };

	  return {          
          numericLiteral: function(value) {
            return {type:EXPRESSION,value:value,resultType:NUMERIC,subs:[]};
          },
          stringLiteral: function(value) {
            return {type:EXPRESSION,value:JSON.stringify(value),resultType:STRING,subs:[]};
          },
          randomBuiltin: function(l,h) {
            // XXX make constant
            // Hack to find name of variable, so optimizers can do their work
            /** @suppress {uselessCode} */
            var rndname = (function(){machine.random}).toString();
            rndname = nameFromFunctionString(rndname);
            return {type:EXPRESSION,value:(rndname+'('+l.value+','+h.value+')'),resultType:NUMERIC,subs:l.subs.concat(h.subs)};
          },
          piBuiltin: function() {
            return {type:EXPRESSION,value:'Math.PI',resultType:NUMERIC,subs:[]};
          },
          variable: function(name) {
            // Check to see that variable has type data
            var localName = localVarName(name);
            if (!varTypes[localName]) {
              return null;
            }

            // Handle case of subroutine local
            if (localName !== name) {
              return {type:EXPRESSION,value:localVariableName(name),resultType:varTypes[localName],subs:[]};

            } else { // It's a plain old global variable
              return {type:EXPRESSION,value:variableName(name),resultType:varTypes[localName],subs:[]};
            }
          },
          expression: function(value,resultType,subs) {
            return {type:EXPRESSION,value:value,resultType:resultType,subs:subs};
          },
          validateSubExpression: function(result,type) {
            if (!result || result.resultType !== type) {
              return null;
            } else {
              return result;
            }
          },
          cintBuiltin: function(p) {
            return {type:EXPRESSION,value:('Math.ceil('+p.value+')'),resultType:NUMERIC,subs:p.subs};
          },
          intBuiltin: function(p) {
            return {type:EXPRESSION,value:('Math.floor('+p.value+')'),resultType:NUMERIC,subs:p.subs};
          },
          fixBuiltin: function(p) {
            return {type:EXPRESSION,value:('Math.trunc('+p.value+')'),resultType:NUMERIC,subs:p.subs};
          },
          absBuiltin: function(p) {
            return {type:EXPRESSION,value:('Math.abs('+p.value+')'),resultType:NUMERIC,subs:p.subs};
          },
          strzBuiltin: function(p) {
            return {type:EXPRESSION,value:('('+p.value+').toString(10)'),resultType:STRING,subs:p.subs};
          },
          leftzBuiltin: function(p,n) {
            return {type:EXPRESSION,value:('('+p.value+').substring(0,'+n.value+')'),resultType:STRING,subs:p.subs.concat(n.subs)};
          },
          rightzBuiltin: function(p,n) {
            return {type:EXPRESSION,value:('('+p.value+').substring(('+p.value+').length-'+n.value+',('+p.value+').length)'),resultType:STRING,subs:p.subs.concat(n.subs)};
          },
          valBuiltin: function(p) {
            return {type:EXPRESSION,value:('Number('+p.value+')'),resultType:NUMERIC,subs:p.subs};
          },
          lenBuiltin: function(p) {
            return {type:EXPRESSION,value:('('+p.value+').length'),resultType:NUMERIC,subs:p.subs};
          },
          parenExpression: function(inner) {
            if (!inner)
              return null;
            return {type:EXPRESSION,value:('('+inner.value+')'),resultType:inner.resultType,subs:inner.subs};
          },
          boolParenExpression: function(result) {
            if (!result)
              return null;
            return {type:BOOLEXPRESSION,value:'('+result.value+')',subs:result.subs};
          },
          boolOrExpression: function(exp1,exp2) {
            if (!exp1 || !exp2)
              return null;
            return {type:BOOLEXPRESSION,value:exp1.value+'||'+exp2.value,subs:exp1.subs.concat(exp2.subs)};
          },
          boolAndExpression: function(exp1,exp2) {
            if (!exp1 || !exp2)
              return null;
            return {type:BOOLEXPRESSION,value:exp1.value+'&&'+exp2.value,subs:exp1.subs.concat(exp2.subs)};
          },
          boolNotExpression: function(exp1) {
            if (!exp1)
              return null;
            return {type:BOOLEXPRESSION,value:'!'+exp1.value,subs:exp1.subs};
          },
          boolBinaryExpression: function(exp1,opToken,exp2) {
            var op = comparisonOpToCode(opToken);
            return {type:BOOLEXPRESSION,value:exp1.value+op+exp2.value,subs:exp1.subs.concat(exp2.subs)};
          },
          callSubroutine: function(name,argExps) {
            // subroutine results are saved in a temp variable
            var temp = nextExpressionSubroutineName();
            // Expressions have a list of subroutines the need to be called
            // before they are run
            var subs = [{temp:temp,name:name,args:argExps}];
            var retName = returnValueName(name);

            // The name of the variable where the temps are stored
            var t = expressionSubTempObjName();
            return {type:EXPRESSION,value:t+'["'+temp+'"]',resultType:varTypes[retName],subs:subs};
          },
          binaryExpression: function(operator,a,b) {
            if (a.resultType !== b.resultType ||
                (a.resultType === STRING && operator !== PLUS)) {
              return null;
            }
            switch (operator) {
            case PLUS:
              if (a.resultType === STRING) {
                // Silently truncate long strings
                return {type:EXPRESSION,value:'('+a.value+'+'+b.value+').slice(0,255)',resultType:a.resultType,subs:a.subs.concat(b.subs)};
              } else {
                return {type:EXPRESSION,value:a.value+'+'+b.value,resultType:a.resultType,subs:a.subs.concat(b.subs)};
              }
            case MINUS:
              return {type:EXPRESSION,value:a.value+'-'+b.value,resultType:a.resultType,subs:a.subs.concat(b.subs)};    
            case TIMES:
              return {type:EXPRESSION,value:a.value+'*'+b.value,resultType:a.resultType,subs:a.subs.concat(b.subs)};    
            case DIV:
              return {type:EXPRESSION,value:a.value+'/'+b.value,resultType:a.resultType,subs:a.subs.concat(b.subs)};
            default:
              return null;
            }
            
          }
        };
	}(),

        // XXX handle errors by throwing an exception
        // XXX don't pass in the line number- let the caller handle the exception and print errors
        
        // Adds instructions with calls to all of the function
        // referenced in the expression, then returns function that
        // evaluates the expression
        _expressionToFunction: function(exp) {
          function stringToFunction(expr) {
            // Actually convert a JS expression string to a function
            // Put it in a list to work around bug in some older browsers
            // evaluating a function expression directly
            var text = '[(function(){return '+expr+';})]';
            var listFunc = eval(text);
            return listFunc[0];
          };

          for (var i=0;i<exp.subs.length;i++) {
            this.callSubroutine(exp.subs[i].name,exp.subs[i].args,0);
            // wrap in function tocreate new temp for each iteration
            (function(){
              var temp = exp.subs[i].temp;
              pushInstruction(function() {
                machine._callstack[machine._callstack.length-1].vars[temp]=machine._ret;
                machine.advance();
              });})();
          }
      
          return stringToFunction(exp.value);
        },

        printString: function(text,newline,pause,num) {
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
              display.printMenu([function(){return text;}],[""],
                                undefined,undefined,undefined,undefined,undefined);
              
              machine._interruptDelay = 0;
              machine._inputVariable = "!"; // Internal name
              machine.advance();
            });
          } else {
            pushInstruction(function(){
              if (display.print(text))
                // Give up the CPU to allow display
                machine._interruptDelay = 0;
              machine.advance();
            });
          }
          return true;
        },
        printExp: function(exp,newline,pause,num) {
          if (!exp || (exp.resultType !== STRING)) {
            logger.error("Invalid PRINT on line "+num+"\n");
            return false;
          }
          if (newline) {
            exp.value = exp.value+"+\"\\n\"";
          }
          var text = this._expressionToFunction(exp);
          if (pause) {
            pushInstruction(function() {
              display.printMenu([text],[""],
                                undefined,undefined,undefined,undefined,undefined);
              machine._interruptDelay = 0;
              machine._inputVariable = "!"; // Internal name
              machine.advance();
            });
          } else {
            pushInstruction(function(){
              if (display.print(text()))
                // Give up the CPU to allow display
                machine._interruptDelay = 0;
              machine.advance();
            });
          }
          return true;
        },
        ifStatement: function(boolExp,num){
          if (!boolExp) {
            logger.error("Invalid IF on line "+num+"\n");
            return false;
          }
          var test = this._expressionToFunction(boolExp);
          loopStack.push({type:IF,
                                  test:test,
                                  elseloc:null,
                                  loc:nextInstruction()});
          pushInstruction(null);
          return true;
        },
        endIf: function(num) {
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
        },
        elseStatement: function(num) {
          var obj = loopStack[loopStack.length-1];
          if ((!obj) || obj.type !== IF) {
            logger.error("ERROR: ELSE WITHOUT MATCHING IF\n");
          } else {
            obj.elseloc=nextInstruction();
            pushInstruction(null);
          }
          return true;
        },
        endWhile: function(num) {
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
        },
        whileStatement: function(exp,num){
          if (!exp) {
            logger.error("Invalid WHILE on line "+num+"\n");
            return false;
          }
          var top = nextInstruction();
          var test = this._expressionToFunction(exp);

          loopStack.push({type:WHILE,
                                  test:test,
                                  elseloc:null,
                                  top:top,
                                  loc:nextInstruction()});
          pushInstruction(null);
          return true;
        },
        beginRandom: function(num) {
          loopStack.push({type:RANDOM,
                                  events:[],
                                  loc:nextInstruction()});
          pushInstruction(null);
          return true;
        },
	waitForMusic: function() {
	  pushInstruction(function(){
	    // Wait flag 1 is wait for music
	    machine._waitFlags = (machine._waitFlags | 1);
	    machine._interruptDelay = 0;
	    machine.advance();
	  }
				 );
	  return true;
	 
	},
        beginSubroutine: function(sub, args, num) {
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
        },
        callSubroutine: function(sub, argExps, num) {
          var argNames = subArgNames[sub];
          var fArgs = [];
          for (var i=0;i<argExps.length;i++) {
            fArgs.push(this._expressionToFunction(argExps[i]));
          }
          var retName = returnValueName(sub);
          var ret;
          if (varTypes[retName] === STRING) {
            ret = "";
          } else if (varTypes[retName] === NUMERIC) {
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
        },
        endSubroutine: function(num) {
          if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== SUBROUTINE) {
            logger.error("UNEXPECTED END SUBROUTINE");
	    return false;
          } else {
            loopStack.pop();
            currentSub = "!";
          }
          return true;
        },
        returnStatement: function(exp,num) {
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
          exp = this._expressionToFunction(exp);
          pushInstruction(function() {
            machine._callstack[machine._callstack.length-1].ret = exp();
            machine._callstack[machine._callstack.length-1].loc = machine._code[machine._callstack[machine._callstack.length-1].sub].length;
          });
          return true;
        },
        endRandom: function(num) {
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
        },
        withChance: function(percent, num) {
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
        },
        withEvenChance: function(num) {
          this.withChance(undefined,num);
          return true;
        },
        beginAsk: function(prompt,num) {
          if (!prompt) {
            logger.error("Invalid ASK statement line "+num+"\n");
            return false;
          }
          var top = nextInstruction();
          prompt = this._expressionToFunction(prompt);
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
        },
        askColor: function(color,num) {
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
        },
        askBGColor: function(color,num) {
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
        },
        askPromptColor: function(color,num) {
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
        },
        onNo: function(num) {
          var ask = loopStack[loopStack.length-1];
          if (ask && ask.type === ASK) {
            ask.noLoc = nextInstruction();
            pushInstruction(null);
          } else {
            logger.error("ON NO outside of an ASK\n");
            return false;
          }
          return true;
        },
        onYes: function(num) {
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
        },
        askDefault: function(value,num) {
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
        },
        endAsk: function(num) {
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
              display.printAsk(prompt,ask.defaultValue,ask.color,ask.bgColor,ask.promptColor);
              machine._interruptDelay = 0;
              machine._inputVariable = "!"; // Invalid as an identifier
              machine.advance();
            });
            addInstructionAt(ask.loc+1, function(){
              if (machine._vars["!"]!==null) {
                if (machine._vars["!"].length>0) {
                  var key=machine._vars["!"].toUpperCase()[0];
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
        },
        beginMenu: function(prompt,num) {
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
        },
        menuColor: function(color,num) {
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
        },
        menuBGColor: function(color,num) {
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
        },
        menuChoiceColor: function(color,num) {
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
        },
        menuPromptColor: function(color,num) {
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
        },
        endMenu: function(num) {
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
              choiceText.push(this._expressionToFunction(menu.choices[n].exp));
              choiceKeys.push(menu.choices[n].key);
              if (menu.choices[n].hideIf) {
                hideConditions.push(this._expressionToFunction(menu.choices[n].hideIf));
              } else {
                hideConditions.push(function(){return false;});
              }
            }
            var prompt = this._expressionToFunction(menu.prompt);
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
              display.printMenu(filteredText,filteredKeys,prompt,menu.color,menu.bgColor,menu.promptColor,menu.choiceColor);
              machine._interruptDelay = 0;
              machine._inputVariable = "!"; // Invalid as an identifier
              machine.advance();
            });
            addInstructionAt(menu.loc+2, function(){
              for (var n=0;n<menu.choices.length;n++){
                if (!hideConditions[n]()) {
                  if (machine._vars["!"] && machine._vars["!"].toUpperCase() == menu.choices[n].key) {
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
        },
        menuChoice: function(key,exp1,num) {
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
        },
        menuHideIf: function(boolExp,num) {
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
          
        },
        color: function(exp,num) {
          var color = this._expressionToFunction(exp);
          pushInstruction(function(){
            display.setColor(color());
            machine.advance();
          });
          return true;
        },
        bgColor: function(c,num) {
          var color = this._expressionToFunction(c);
          pushInstruction(function(){
            display.setBGColor(color());
            machine.advance();
          });
          return true;
        },
        sleep: function(duration,num) {
          if (!duration) {
            logger.error("Invalid SLEEP on line "+num+"\n");
            return false;
          }
          duration = this._expressionToFunction(duration);
          pushInstruction(function() {
            machine.advance();
            machine._interruptDelay = duration();
          });
          return true;
        },
        input: function(varname,num) {
          if (varTypes[varname] === undefined) {
            logger.error(varname+" undefined in INPUT\n");
            return;
          }
          pushInstruction(function() {
            machine._interruptDelay = 0;
            machine._inputVariable = varname;
            machine.advance();
          });
          return true;
        },
        play: function(abc,num) {
	  if (!abc) {
	    logger.error("Invalid PLAY on line "+num+"\n");
	    return false;
	  }
	  var notes = this._expressionToFunction(abc);
          pushInstruction(function() {
	    audio.play(notes());
            machine.advance();
          });
          return true;
        },
        forStatement: function(varname,first,last,num) {
          if (!first || !last) {
            logger.error("what the FOR on line "+num+"\n");
            return false;
          }
          //addFor: function(varname,first,last) {
          if (varTypes[varname] === undefined) {
            logger.error(varname+" undefined in FOR\n");
            return;
          }
          
          first = this._expressionToFunction(first);
          last = this._expressionToFunction(last);

          pushInstruction(null); // Fill it in when we get the NEXT
          loopStack.push({type:FOR,varname:varname,
                                  last:last,
                                  first:first,
                                  top:nextInstruction()});

          return true;
        },
        letStatement: function(varname,exp,num) {
          if (!varname) {
            logger.error("Invalid expression assigned to "+varname+" on line "+num+"\n");
            return false;
          }
          if (varTypes[varname] === undefined) {
            logger.error(varname+" undefined in assignment\n");
            return;
          }
          var value = this._expressionToFunction(exp);
          pushInstruction(function() {
            machine._vars[varname] = value();
            machine.advance();
          });
          return true;
        },
        comment: function(tokens, num) {
          return true;
        },
        clear: function(num) {
          pushInstruction(function(){
            display.clear();
            machine.advance();
            // Give up the CPU to allow display
            machine._interruptDelay = 0;
          });
          return true;
        },
        next: function(varExp,num) {
          var varname = varExp[0].value;
          var obj = loopStack.pop();
          if ((!obj) || obj.type !== FOR || varname != obj.varname) {
            logger.error("ERROR: NEXT WITHOUT MATCHING FOR\n");
          } else {
            var first = obj.first;
            var last = obj.last;
            pushInstruction(function(){
              if (machine._vars[varname]>=last()){
                machine.advance();
              } else {
                machine._vars[varname]++;
                machine.setLoc(obj.top);
              }
            });
            var after = nextInstruction();
            addInstructionAt(obj.top-1,function(){
              machine._vars[obj.varname] = first();
              if (machine._vars[obj.varname]<=last()){
                machine.advance()
              } else {
                machine._vars[obj.varname]++;
                machine.setLoc(after);
              }
            });
          }
          return true;
        }
      };
      }()
    }
}