function CodeGeneratorPass(typeManager, machine, logger){
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

    var currentSub; // Name of the sub we're currently adding code to


    // Adding instructions to the machine
    function pushInstruction(instruction) {
      return machine.pushInstruction(instruction, currentSub);
    }
    function addInstructionAt(loc, instruction) {
      machine.addInstructionAt(loc, instruction, currentSub);
    }
    function nextInstruction() {
      return machine.nextInstruction(currentSub);
    }

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
        callSubroutine(exp.subs[i].name,exp.subs[i].args);
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

    function callSubroutine(sub, argExps) {
      var argNames = typeManager.getSubArgNames(sub);
      var fArgs = [];
      for (var i=0;i<argExps.length;i++) {
        fArgs.push(expressionToFunction(argExps[i]));
      }
      var ret;
      if (typeManager.subHasStringReturnType(sub)) {
        ret = "";
      } else if (typeManager.subHasNumericReturnType(sub)) {
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
        logger.error("Invalid IF");
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
        logger.error("ERROR: END IF WITHOUT MATCHING IF");
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
        logger.error("ERROR: ELSE WITHOUT MATCHING IF");
      } else {
        obj.elseloc=nextInstruction();
        pushInstruction(null);
      }
      return true;
    }

    function endWhile(num) {
      var obj = loopStack.pop();
      if ((!obj) || obj.type !== WHILE) {
        logger.error("ERROR: WEND IF WITHOUT MATCHING WHILE");
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
        logger.error("Invalid WHILE");
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

    function beginSubroutine(sub, args) {
      if (machine.isSubroutineDefined(sub)) {
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
          machine.createSubroutine(sub);
        }
      }
      return true;
    }

    function endSubroutine() {
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== SUBROUTINE) {
        logger.error("UNEXPECTED END SUBROUTINE");
	return false;
      } else {
        loopStack.pop();
        currentSub = undefined;
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
        logger.error("ERROR: END RANDOM WITHOUT MATCHING BEGIN RANDOM");
      } else {
        var events = obj.events;
        if (events.length < 1) {
          logger.error("ERROR: RANDOM STATEMENTS REQUIRE AT LEAST 1 CHOICE");
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
            logger.error("ERROR: MIXED RANDOM MODES - EITHER SPECIFY CHANCE PERCENT OR DON'T");
          }

          var total = 0;
          for (var n=0;n<events.length;n++) {
            total += events[n].chance;
          }
          if (total < 99.999 || total > 100.001) {
            logger.error("ERROR: THE CHANCES OF RANDOM EVENTS SHOULD ADD UP TO 100%");
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
        logger.error("ERROR: WITH CHANCE WITHOUT MATCHING BEGIN RANDOM");
      } else {
        if (obj.events.length === 0 && nextInstruction() !== obj.loc+1) {
          logger.error("ERROR: NO CODE ALLOWED BETWEEN BEGIN RANDOM AND FIRST WITH CHOICE");
        } else {
          if (percent === undefined) {
            if (obj.events.length > 0) // Leave room for the jump to the end
              pushInstruction(null);
            obj.events.push({loc:nextInstruction(),
                             chance:null});

          } else {
            var chance = Number(percent);
            if (chance < 0.001 || chance > 99.999) {
              logger.error("ERROR: CHANCES MUST BE BETWEEN 0 and 100");
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
        logger.error("Invalid ASK statement");
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
        logger.error("INVALID ASK COLOR");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== ASK) {
        logger.error("ASK COLOR OUTSIDE OF AN ASK");
        return false;
      }
      if (loopStack[loopStack.length-1].loc !== nextInstruction()-2) {
        logger.error("ASK COLOR AFTER CODE");
        return false;
      }
      loopStack[loopStack.length-1].color = c;
      return true;
    }

    function askBGColor(color,num) {
      var c = intToColor(color);
      if (c === null) {
        logger.error("INVALID ASK BGCOLOR");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== ASK) {
        logger.error("ASK BGCOLOR OUTSIDE OF AN ASK");
        return false;
      }
      if (loopStack[loopStack.length-1].loc !== nextInstruction()-2) {
        logger.error("ASK BGCOLOR AFTER CODE");
        return false;
      }
      loopStack[loopStack.length-1].bgColor = c;
      return true;
    }

    function askPromptColor(color,num) {
      var c = intToColor(color);
      if (c === null) {
        logger.error("INVALID ASK PROMPT COLOR");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== ASK) {
        logger.error("ASK PROMPT COLOR OUTSIDE OF AN ASK");
        return false;
      }
      if (loopStack[loopStack.length-1].loc !== nextInstruction()-2) {
        logger.error("ASK PROMPT COLOR AFTER CODE");
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
        logger.error("ON NO outside of an ASK");
        return false;
      }
      return true;
    }

    function onYes(num) {
      var ask = loopStack[loopStack.length-1];
      if (ask && ask.type === ASK) {
        if (loopStack[loopStack.length-1].loc !== nextInstruction()-2) {
          logger.error("ASK ON YES AFTER CODE");
          return false;
        }
      } else {
        logger.error("ON YES outside of an ASK");
        return false;
      }
      return true;
    }

    function askDefault(value,num) {
      if (value !== true && value !== false) {
        logger.error("INVALID ASK DEFAULT");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== ASK) {
        logger.error("DEFAULT OUTSIDE OF AN ASK");
        return false;
      }
      if (loopStack[loopStack.length-1].loc !== nextInstruction()-2) {
        logger.error("ASK DEFAULT AFTER CODE");
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
        logger.error("END ASK WITHOUT ASK");
	return false;
      }
      return true;
    }

    function beginMenu(prompt,num) {
      if (!prompt) {
        logger.error("Invalid MENU statement");
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
        logger.error("INVALID MENU COLOR");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== MENU) {
        logger.error("MENU COLOR OUTSIDE OF A MENU");
        return false;
      }
      if (loopStack[loopStack.length-1].choices.length > 0) {
        logger.error("MENU COLOR AFTER CHOICE");
        return false;
      }
      loopStack[loopStack.length-1].color = c;
      return true;
    }

    function menuBGColor(color,num) {
      var c = intToColor(color);
      if (c === null) {
        logger.error("INVALID MENU BGCOLOR");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== MENU) {
        logger.error("MENU BGCOLOR OUTSIDE OF A MENU");
        return false;
      }
      if (loopStack[loopStack.length-1].choices.length > 0) {
        logger.error("MENU BGCOLOR AFTER CHOICE");
        return false;
      }
      loopStack[loopStack.length-1].bgColor = c;
      return true;
    }

    function menuChoiceColor(color,num) {
      var c = intToColor(color);
      if (c === null) {
        logger.error("INVALID MENU CHOICE COLOR");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== MENU) {
        logger.error("MENU CHOICE COLOR OUTSIDE OF A MENU");
        return false;
      }
      if (loopStack[loopStack.length-1].choices.length > 0) {
        logger.error("MENU CHOICE COLOR AFTER CHOICE");
        return false;
      }
      loopStack[loopStack.length-1].choiceColor = c;
      return true;
    }

    function menuPromptColor(color,num) {
      var c = intToColor(color);
      if (c === null) {
        logger.error("INVALID MENU PROMPT COLOR");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== MENU) {
        logger.error("MENU PROMPT COLOR OUTSIDE OF A MENU");
        return false;
      }
      if (loopStack[loopStack.length-1].choices.length > 0) {
        logger.error("MENU PROMPT COLOR AFTER CHOICE");
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
        logger.error("END MENU WITHOUT BEGIN MENU");
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
        logger.error("CHOICE OUTSIDE OF A MENU");
	return false;
      }
      return true;
    }

    function menuHideIf(boolExp,num) {
      if (!boolExp) {
        logger.error("Invalid HIDE IF");
        return false;
      }
      if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== MENU) {
        logger.error("HIDE IF OUTSIDE OF A MENU");
        return false;
      }
      var choices = loopStack[loopStack.length-1].choices;
      if (choices.length === 0) {
        logger.error("HIDE IF found before CHOICE");
        return false;
      }
      if (choices[choices.length-1].loc !== nextInstruction()) {
        logger.error("HIDE IF does not immediately follow CHOICE");
        return false;
      }
      if (choices[choices.length-1].hideIf) {
        logger.error("Multiple HIDE IFs for single CHOICE");
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
        logger.error("Invalid SLEEP");
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
      if (typeManager.globalHasUndefinedType(varname)) {
        logger.error(varname+" undefined in INPUT");
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
	logger.error("Invalid PLAY");
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
        logger.error("what the FOR");
        return false;
      }
      //addFor: function(varname,first,last) {
      if (typeManager.globalHasUndefinedType(varname)) {
        logger.error(varname+" undefined in FOR");
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
    function letStatement(varname,exp) {
      if (!varname) {
        logger.error("Invalid expression assigned to "+varname);
        return false;
      }
      if (typeManager.globalHasUndefinedType(varname)) {
        logger.error(varname+" undefined in assignment");
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
        logger.error("ERROR: NEXT WITHOUT MATCHING FOR");
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
      // generate expressions
      // Returns an EXPRESSION token or null
      // XXX Fail if types are incorrect in every case

      // expression result types
      var NUMERIC_TYPE={};
      var STRING_TYPE={};
      var BOOL_TYPE={};

      // This is vastly simplified because we keep JavaScript semantics for
      // operator precendence.

      function numericLiteralExpression(value) {
        return numericExpressionWithSubs(value,[]);
      }

      function numericExpressionWithSubs(value, subs) {
        return {value:value,resultType:NUMERIC_TYPE,subs:subs};
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
        return {value:value,resultType:STRING_TYPE,subs:subs};
      }
      function boolExpressionWithSubs(value,subs) {
        return {value:value,resultType:BOOL_TYPE,subs:subs};
      }
      function boolBinaryExpression(op,exp1,exp2) {
        if (!exp1 || !exp2)
          return null;
        return boolExpressionWithSubs(exp1.value+op+exp2.value,exp1.subs.concat(exp2.subs));
      }

      function stringLiteralExpression(value) {
        return stringExpression(JSON.stringify(value));
      }

      function randomBuiltinExpression(l,h){
        // XXX make constant
        // Hack to find name of variable, so optimizers can do their work
        /** @suppress {uselessCode} */
        var rndname = (function(){machine.random}).toString();
        rndname = nameFromFunctionString(rndname);
        return numericExpressionWithSubs(rndname+'('+l.value+','+h.value+')',l.subs.concat(h.subs));
      }

      function piBuiltinExpression() {
        return numericLiteralExpression('Math.PI');
      }

      function variableExpression(name) {
        // Handle case of subroutine local
        if (typeManager.localVariableDefined(currentSub, name)) {
          if (typeManager.localHasStringType(currentSub, name))
            return stringExpression(localVariableName(name));
          else if (typeManager.localHasNumericType(currentSub, name))
            return numericLiteralExpression(localVariableName(name));

        } else { // It's a plain old global variable
          if (typeManager.globalHasStringType(name))
            return stringExpression(variableName(name));
          else if (typeManager.globalHasNumericType(name))
            return numericLiteralExpression(variableName(name));
        }

        // Fall through if the varible doesn't have a type
        return null;
      }

      function cintBuiltinExpression(p) {
        return numericExpressionWithSubs('Math.ceil('+p.value+')',p.subs);
      }
      function intBuiltinExpression(p) {
        return numericExpressionWithSubs('Math.floor('+p.value+')',p.subs);
      }
      function fixBuiltinExpression(p) {
        return numericExpressionWithSubs('Math.trunc('+p.value+')',p.subs);
      }
      function absBuiltinExpression(p) {
        return numericExpressionWithSubs('Math.abs('+p.value+')',p.subs);
      }
      function strzBuiltinExpression(p) {
        return stringExpressionWithSubs('('+p.value+').toString(10)',p.subs);
      }
      function leftzBuiltinExpression(p,n) {
        return stringExpressionWithSubs('('+p.value+').substring(0,'+n.value+')',p.subs.concat(n.subs));
      }
      function rightzBuiltinExpression(p,n) {
        return stringExpressionWithSubs('('+p.value+').substring(('+p.value+').length-'+n.value+',('+p.value+').length)',p.subs.concat(n.subs));
      }
      function valBuiltinExpression(p) {
        return numericExpressionWithSubs('Number('+p.value+')',p.subs);
      }
      function lenBuiltinExpression(p) {
        return numericExpressionWithSubs('('+p.value+').length',p.subs);
      }
      function parenExpression(inner) {
        if (!inner)
          return null;
        if (inner.resultType === NUMERIC_TYPE)
          return numericExpressionWithSubs('('+inner.value+')',inner.subs);
        else if (inner.resultType === STRING_TYPE)
          return stringExpressionWithSubs('('+inner.value+')',inner.subs);
        else if (inner.resultType === BOOL_TYPE)
          return boolExpressionWithSubs('('+inner.value+')', inner.subs);
        else
          return null;
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
        if (exp1 === null || exp2 === null)
          return null;
        if (exp1.resultType === STRING_TYPE) { // && exp2.resultType === STRING_TYPE
          exp1.value = '('+exp1.value+').toUpperCase()';
          exp2.value = '('+exp2.value+').toUpperCase()';
        }
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
        if (exp1 === null || exp2 === null)
          return null;
        if (exp1.resultType === STRING_TYPE) { // && exp2.resultType === STRING_TYPE
          exp1.value = '('+exp1.value+').toUpperCase()';
          exp2.value = '('+exp2.value+').toUpperCase()';
        }
        return boolBinaryExpression('!==',exp1,exp2);
      }
      function callSubroutineExpression(name,argExps) {
	// subroutine results are saved in a temp variable
	var temp = nextExpressionSubroutineName();
	// Expressions have a list of subroutines the need to be called
	// before they are run
	var subs = [{temp:temp,name:name,args:argExps}];

	// The name of the variable where the temps are stored
	var t = localVariableName(temp);
        if (typeManager.subHasStringReturnType(name))
          return stringExpressionWithSubs(t,subs);
        else if (typeManager.subHasNumericReturnType(name))
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

/***********************************************************************
  END Code Gen pass expression handler
***********************************************************************/
  function finalize() {
    // XXX check that there are no empty code locations, etc.
    if (typeManager.validate()) {
      // Maybe make this less machine specific?
      machine.init(typeManager.getVarsObject());
      return true;
    } else {
      return false;
    }
  }

  return {

    // Statements
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
    next: next,

    // Expressions
    numericLiteralExpression: numericLiteralExpression,
    stringLiteralExpression: stringLiteralExpression,
    randomBuiltinExpression: randomBuiltinExpression,
    piBuiltinExpression: piBuiltinExpression,
    variableExpression: variableExpression,
    cintBuiltinExpression: cintBuiltinExpression,
    intBuiltinExpression: intBuiltinExpression,
    fixBuiltinExpression: fixBuiltinExpression,
    absBuiltinExpression: absBuiltinExpression,
    strzBuiltinExpression: strzBuiltinExpression,
    leftzBuiltinExpression: leftzBuiltinExpression,
    rightzBuiltinExpression: rightzBuiltinExpression,
    valBuiltinExpression: valBuiltinExpression,
    lenBuiltinExpression: lenBuiltinExpression,
    parenExpression: parenExpression,
    boolOrExpression: boolOrExpression,
    boolAndExpression: boolAndExpression,
    boolNotExpression: boolNotExpression,
    boolEqualExpression: boolEqualExpression,
    boolLessExpression: boolLessExpression,
    boolGreaterExpression: boolGreaterExpression,
    boolLessOrEqualExpression: boolLessOrEqualExpression,
    boolGreaterOrEqualExpression: boolGreaterOrEqualExpression,
    boolNotEqualExpression: boolNotEqualExpression,
    callSubroutineExpression: callSubroutineExpression,
    additionExpression: additionExpression,
    subtractionExpression: subtractionExpression,
    multiplicationExpression: multiplicationExpression,
    divisionExpression: divisionExpression,

    // Call at end of data
    finalize: finalize
  };
}
