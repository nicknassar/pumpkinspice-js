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

    var calledSubs = [];

    var currentSub; // Name of the sub we're currently adding code to

    var valid = true; // Have we run into errors

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

      return exp.value;
    }

    // find name of a variable in the machine
    function variableName(name) {
      return function() {
        return machine.getGlobal(name);
      };
    };

    // Find name of local variable in the machine
    function localVariableName(name) {
      return function() {
        return machine.getLocal(name);
      };
    }

/***********************************************************************
  BEGIN Code Gen functions
***********************************************************************/

    function printString(text,newline,pause) {
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
          machine.print(text);
          machine.advance();
        });
      }
      return true;
    }

    function printExp(exp,newline,pause) {
      if (exp === null) {
        return false;
      }
      var text;
      exp = expressionToFunction(exp);
      if (newline) {
        text = (function() {
          return exp()+"\n";
        });
      } else {
        text = exp;
      }
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
          machine.print(text());
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
    if (calledSubs.indexOf(sub) === -1) {
      calledSubs.push(sub);
    }
    return true;
  }

    function ifStatement(boolExp){
      if (boolExp === null) {
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

    function endIf() {
    // type generator pass ensures this is valid
      var obj = loopStack.pop();
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
      return true;
    }

    function elseStatement() {
      var obj = loopStack[loopStack.length-1];
      // type generator pass ensures this is valid
      obj.elseloc=nextInstruction();
      pushInstruction(null);
      return true;
    }

    function endWhile() {
      var obj = loopStack.pop();
      // type generator pass ensures this is valid
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
      return true;
    }

    function whileStatement(exp){
      if (exp === null) {
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

    function beginRandom() {
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
        valid = false;
        return false;
      } else {
        loopStack.push({type:SUBROUTINE});
        currentSub = sub;
        machine.createSubroutine(sub);
        return true;
      }
    }

    function endSubroutine() {
      loopStack.pop();
      currentSub = undefined;
      return true;
    }

    function voidReturnStatement() {
      pushInstruction(function() {
        machine.returnFromSub(function() { return undefined; });
      });
      return true;
    }

    function returnStatement(exp) {
      // Make sure there's a subroutine somewhere
      exp = expressionToFunction(exp);
      pushInstruction(function() {
        machine.returnFromSub(exp);
      });
      return true;
    }

    function endRandom() {
      var obj = loopStack.pop();
      var events = obj.events;
      if (events.length>0 && events[0].chance === null) {
        for (var n=0;n<events.length;n++) {
          events[n].chance = 100.0/events.length;
        }
      }
      var total = 0;
      for (var n=0;n<events.length;n++) {
        total += events[n].chance;
      }
      if (total < 99.999 || total > 100.001) {
        logger.error("THE CHANCES OF RANDOM EVENTS SHOULD ADD UP TO 100%");
        valid = false;
        return false;
      }

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
      return true;
    }

    function withChance(percent) {
      var obj = loopStack[loopStack.length-1];
      if (percent === undefined) {
        if (obj.events.length > 0) // Leave room for the jump to the end
          pushInstruction(null);
        obj.events.push({loc:nextInstruction(),
                         chance:null});

      } else {
        var chance = Number(percent);
        if (chance < 0.001 || chance > 99.999) {
          logger.error("HANCES MUST BE BETWEEN 0 and 100");
          valid = false;
          return false;
        } else {
          if (obj.events.length > 0) // Leave room for the jump to the end
            pushInstruction(null);
          obj.events.push({loc:nextInstruction(),
                           chance:chance});
        }
      }
      return true;
    }

    function withEvenChance() {
      return withChance(undefined);
    }

    function beginAsk(prompt) {
      if (prompt === null) {
        return false;
      }
      var top = nextInstruction();
      prompt = expressionToFunction(prompt);
      loopStack.push({type:ASK,
                      prompt:prompt,
                      color: 14,
                      promptColor: 11,
                      bgColor: 0,
                      noloc:null,
                      defaultValue:null,
                      top:top,
		      yes_first: null,
                      loc:nextInstruction()});
      pushInstruction(null); // Save space for prompt
      pushInstruction(null);
      return true;
    }

    function askColor(color) {
      color = Number(color);
      if (color !== Math.floor(color) || color < 0 || color > 15) {
        logger.error("INVALID ASK COLOR");
        valid = false;
        return false;
      }
      loopStack[loopStack.length-1].color = color;
      return true;
    }

    function askBGColor(color) {
      color = Number(color);
      if (color !== Math.floor(color) || color < 0 || color > 7) {
        logger.error("INVALID ASK BGCOLOR");
        valid = false;
        return false;
      }
      loopStack[loopStack.length-1].bgColor = color;
      return true;
    }

    function askPromptColor(color) {
      color = Number(color);
      if (color !== Math.floor(color) || color < 0 || color > 15) {
        logger.error("INVALID ASK PROMPT COLOR");
        valid = false;
        return false;
      }
      loopStack[loopStack.length-1].promptColor = color;
      return true;
    }

    function onNo() {
      var ask = loopStack[loopStack.length-1];
      if (ask.yes_first === null) {
	ask.yes_first = false;
      } else {
	ask.noLoc = nextInstruction();
	pushInstruction(null);
      }
      return true;
    }

    function onYes() {
      var ask = loopStack[loopStack.length-1];
      if (ask.yes_first === null) {
	ask.yes_first = true;
      } else {
	ask.noLoc = nextInstruction();
	pushInstruction(null);
      }
      return true;
    }

    function askDefault(value) {
      loopStack[loopStack.length-1].defaultValue = value;
      return true;
    }

    function endAsk() {
      var ask = loopStack.pop();
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
        machine.printAsk(prompt(),ask.defaultValue,ask.color,ask.bgColor,ask.promptColor);
        machine.setInterruptDelay(0);
        machine.setInputVariable("!"); // Invalid as an identifier
        machine.advance();
      });
      addInstructionAt(ask.loc+1, function(){
        if (machine.getGlobal("!")!==null) {
          if (machine.getGlobal("!").length>0) {
            var key=machine.getGlobal("!").toUpperCase()[0];
            if ((key === "Y" && ask.yes_first) ||
		(key === "N" && !ask.yes_first)) {
              machine.advance();
              return;
            } else if ((key === "N" && ask.yes_first) ||
		       (key === "Y" && !ask.yes_first)) {
              machine.setLoc(noLoc);
              return;
            }
          } else {
            if ((ask.defaultValue === true && ask.yes_first) ||
		(ask.defaultValue === false && !ask.yes_first)) {
              machine.advance();
              return;
            } else if ((ask.defaultValue === false && ask.yes_first) ||
		       (ask.defaultValue === true && !ask.yes_first)) {
              machine.setLoc(noLoc);
              return;
            }
          }
        }
        machine.setLoc(top);
      });
      return true;
    }

    function beginMenu(prompt) {
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

    function menuColor(color) {
      var c = intToColor(color);
      if (c === null) {
        logger.error("INVALID MENU COLOR");
        valid = false;
        return false;
      }
      loopStack[loopStack.length-1].color = c;
      return true;
    }

    function menuBGColor(color) {
      var c = intToColor(color);
      if (c === null) {
        logger.error("INVALID MENU BGCOLOR");
        valid = false;
        return false;
      }
      loopStack[loopStack.length-1].bgColor = c;
      return true;
    }

    function menuChoiceColor(color) {
      var c = intToColor(color);
      if (c === null) {
        logger.error("INVALID MENU CHOICE COLOR");
        valid = false;
        return false;
      }
      loopStack[loopStack.length-1].choiceColor = c;
      return true;
    }

    function menuPromptColor(color) {
      var c = intToColor(color);
      if (c === null) {
        logger.error("INVALID MENU PROMPT COLOR");
        valid = false;
        return false;
      }
      loopStack[loopStack.length-1].promptColor = c;
      return true;
    }

    function endMenu() {
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
      return true;
    }

    function menuChoice(key,exp1) {
      if (loopStack[loopStack.length-1].choices.length > 0)
        pushInstruction(null); // Replace with goto end
      loopStack[loopStack.length-1].choices.push({key:key,
                                                  exp:exp1,
                                                    loc:nextInstruction()});
      return true;
    }

    function menuHideIf(boolExp) {
      if (boolExp === null) {
        return false;
      }
      var choices = loopStack[loopStack.length-1].choices;
      choices[choices.length-1].hideIf = boolExp;

      return true;

    }

    function color(exp) {
      var color = expressionToFunction(exp);
      pushInstruction(function(){
        machine.setColor(color());
        machine.advance();
      });
      return true;
    }

    function bgColor(c) {
      var color = expressionToFunction(c);
      pushInstruction(function(){
        machine.setBGColor(color());
        machine.advance();
      });
      return true;
    }

    function sleep(duration) {
      if (duration === false) {
        return false;
      }
      duration = expressionToFunction(duration);
      pushInstruction(function() {
        machine.advance();
        machine.setInterruptDelay(duration());
      });
      return true;
    }

    function input(varname) {
      pushInstruction(function() {
        machine.setInterruptDelay(0);
        machine.setInputVariable(varname);
        machine.advance();
      });
      return true;
    }

    function play(abc) {
      if (abc === null) {
	return false;
      }
      var notes = expressionToFunction(abc);
      pushInstruction(function() {
	machine.play(notes());
        machine.advance();
      });
      return true;
    }

    function forStatement(varname,first,last) {
      if (first === null || last === null) {
        return false;
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
      var value = expressionToFunction(exp);
      pushInstruction(function() {
        machine.setGlobal(varname,value());
        machine.advance();
      });
      return true;
    }

    function comment(tokens) {
      return true;
    }

    function clear() {
      pushInstruction(function(){
        machine.clear();
        machine.advance();
      });
      return true;
    }

    function next(varname) {
      var obj = loopStack.pop();
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

      // expression result types
      var NUMERIC_TYPE={};
      var STRING_TYPE={};
      var BOOL_TYPE={};

      function numericLiteralExpression(value) {
        value = Number(value);
        return numericExpressionWithSubs(function() {return value;},[]);
      }

      function numericExpressionWithSubs(value, subs) {
        return {value:value,resultType:NUMERIC_TYPE,subs:subs};
      }

      function numericBinaryExpression(op,exp1,exp2) {
        if (exp1 === null || exp2 === null)
          return null;
        if (exp1.resultType !== NUMERIC_TYPE ||
            exp2.resultType !== NUMERIC_TYPE) {
          logger.error("Type mismatch in binary expression "+op);
          valid = false;
          return null;
        }
        var f1 = exp1.value;
        var f2 = exp2.value;
        var newExp;
        if (op === '+') {
          newExp = (function() {
            return f1()+f2();
          });
        } else if (op === '-') {
          newExp = (function() {
            return f1()-f2();
          });
        } else if (op === '*') {
          newExp = (function() {
            return f1()*f2();
          });
        } else if (op === '/') {
          newExp = (function() {
            return f1()/f2();
          });
        } else {
          logger.error('Unrecognized op in numeric binary expression: '+op);
          valid = false;
          return null;
        }
        return numericExpressionWithSubs(newExp,exp1.subs.concat(exp2.subs));
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
        if (exp1 === null || exp2 === null)
          return null;
        var f1 = exp1.value;
        var f2 = exp2.value;
        var newExp;
        if (op === '===') {
          newExp = (function() {
            return f1()===f2();
          });
        } else if (op === '!==') {
          newExp = (function() {
            return f1()!==f2();
          });
        } else if (op === '>') {
          newExp = (function() {
            return f1()>f2();
          });
        } else if (op === '<') {
          newExp = (function() {
            return f1()<f2();
          });
        } else if (op === '>=') {
          newExp = (function() {
            return f1()>=f2();
          });
        } else if (op === '<=') {
          newExp = (function() {
            return f1()<=f2();
          });
        } else if (op === '&&') {
          newExp = (function() {
            return f1()&&f2();
          });
        } else if (op === '||') {
          newExp = (function() {
            return f1()||f2();
          });
        } else {
          logger.error('Unrecognized op in bool binary expression: '+op);
          valid = false;
          return null;
        }
        return boolExpressionWithSubs(newExp,exp1.subs.concat(exp2.subs));
      }

      function stringLiteralExpression(value) {
        value = value.toString();
        return stringExpression(function() { return value; });
      }

      function randomBuiltinExpression(l,h){
        var f1 = l.value;
        var f2 = h.value;
        return numericExpressionWithSubs(function() {
          return machine.random(f1(),f2())
        },l.subs.concat(h.subs));
      }

      function piBuiltinExpression() {
        return numericLiteralExpression(Math.PI);
      }

      function variableExpression(name) {
        // Handle case of subroutine local
        if (typeManager.localVariableDefined(currentSub, name)) {
          if (typeManager.localHasStringType(currentSub, name))
            return stringExpression(localVariableName(name));
          else if (typeManager.localHasNumericType(currentSub, name))
            return numericExpressionWithSubs(localVariableName(name),[]);

        } else { // It's a plain old global variable
          if (typeManager.globalHasStringType(name))
            return stringExpression(variableName(name));
          else if (typeManager.globalHasNumericType(name))
            return numericExpressionWithSubs(variableName(name),[]);
        }
        logger.error('Variable without type '+name);
        valid = false;
        return null;
      }

      function cintBuiltinExpression(p) {
        var f = p.value;
        return numericExpressionWithSubs(function(){return Math.ceil(f());},p.subs);
      }
      function intBuiltinExpression(p) {
        var f = p.value;
        return numericExpressionWithSubs(function(){return Math.floor(f());},p.subs);
      }
      function fixBuiltinExpression(p) {
        var f = p.value;
        return numericExpressionWithSubs(function(){return Math.trunc(f());},p.subs);
      }
      function absBuiltinExpression(p) {
        var f = p.value;
        return numericExpressionWithSubs(function(){return Math.abs(f());},p.subs);
      }
      function strzBuiltinExpression(p) {
        var f = p.value;
        return stringExpressionWithSubs(function(){return f().toString(10);},p.subs);
      }
      function leftzBuiltinExpression(p,n) {
        var f1 = p.value;
        var f2 = n.value;
        return stringExpressionWithSubs((function(){
          return f1().substring(0,f2());
        }),
                                        p.subs.concat(n.subs));
      }
      function rightzBuiltinExpression(p,n) {
        var f1 = p.value;
        var f2 = n.value;
        return stringExpressionWithSubs((function(){
          var s = f1();
          return s.substring(s.length-f2());
        }),
                                        p.subs.concat(n.subs));
      }
      function valBuiltinExpression(p) {
        var f1 = p.value;
        return numericExpressionWithSubs(function() {return Number(f1());},p.subs);
      }
      function lenBuiltinExpression(p) {
        var f1 = p.value;
        return numericExpressionWithSubs(function(){return f1().length;},p.subs);
      }
      function boolOrExpression(exp1,exp2) {
        return boolBinaryExpression('||',exp1,exp2);
      }
      function boolAndExpression(exp1,exp2) {
        return boolBinaryExpression('&&',exp1,exp2);
      }
      function boolNotExpression(exp1) {
        if (exp1 === null)
          return null;
        var f = exp1.value;
        return boolExpressionWithSubs(function(){return !f();},exp1.subs);
      }
      function boolEqualExpression(exp1,exp2) {
        if (exp1 === null || exp2 === null)
          return null;
        if (exp1.resultType === STRING_TYPE) { // && exp2.resultType === STRING_TYPE
          var f1 = exp1.value;
          var f2 = exp2.value;

          exp1.value = function() {return f1().toUpperCase();};
          exp2.value = function() {return f2().toUpperCase();};
        }
        return boolBinaryExpression('===',exp1,exp2);
      }
      function boolLessExpression(exp1,exp2) {
        if (exp1.resultType === STRING_TYPE) { // && exp2.resultType === STRING_TYPE
          var f1 = exp1.value;
          var f2 = exp2.value;

          exp1.value = function() {return f1().toUpperCase();};
          exp2.value = function() {return f2().toUpperCase();};
        }
        return boolBinaryExpression('<',exp1,exp2);
      }
      function boolGreaterExpression(exp1,exp2) {
        if (exp1.resultType === STRING_TYPE) { // && exp2.resultType === STRING_TYPE
          var f1 = exp1.value;
          var f2 = exp2.value;

          exp1.value = function() {return f1().toUpperCase();};
          exp2.value = function() {return f2().toUpperCase();};
        }
        return boolBinaryExpression('>',exp1,exp2);
      }
      function boolLessOrEqualExpression(exp1,exp2) {
        if (exp1.resultType === STRING_TYPE) { // && exp2.resultType === STRING_TYPE
          var f1 = exp1.value;
          var f2 = exp2.value;

          exp1.value = function() {return f1().toUpperCase();};
          exp2.value = function() {return f2().toUpperCase();};
        }
        return boolBinaryExpression('<=',exp1,exp2);
      }
      function boolGreaterOrEqualExpression(exp1,exp2) {
        if (exp1.resultType === STRING_TYPE) { // && exp2.resultType === STRING_TYPE
          var f1 = exp1.value;
          var f2 = exp2.value;

          exp1.value = function() {return f1().toUpperCase();};
          exp2.value = function() {return f2().toUpperCase();};
        }
        return boolBinaryExpression('>=',exp1,exp2);
      }
      function boolNotEqualExpression(exp1,exp2) {
        if (exp1 === null || exp2 === null)
          return null;
        if (exp1.resultType === STRING_TYPE) { // && exp2.resultType === STRING_TYPE
          var f1 = exp1.value;
          var f2 = exp2.value;

          exp1.value = function() {return f1().toUpperCase();};
          exp2.value = function() {return f2().toUpperCase();};
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
        if (typeManager.subHasStringReturnType(name)) {
          if (calledSubs.indexOf(name) === -1) {
            calledSubs.push(name);
          }
          return stringExpressionWithSubs(t,subs);
        } else if (typeManager.subHasNumericReturnType(name)) {
          if (calledSubs.indexOf(name) === -1) {
            calledSubs.push(name);
          }
          return numericExpressionWithSubs(t,subs);
        } else if (typeManager.subHasVoidReturnType(name)) {
          logger.error("Calling subroutine "+name+" which does not return either text or a number");
          valid = false;
          return null;
        } else {
          logger.error("Subroutine "+name+" not defined");
          valid = false;
          return null;
        }

      }
      function additionExpression(a,b) {
	if (a.resultType === STRING_TYPE && b.resultType === STRING_TYPE) {
	  // Silently truncate long strings
          var f1 = a.value;
          var f2 = b.value;
          return stringExpressionWithSubs(function(){return (f1()+f2()).slice(0,255);},a.subs.concat(b.subs));
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
    if (typeManager.validate() && valid) {
      for (var n=0;n<calledSubs.length;n++) {
        if (!machine.isSubroutineDefined(calledSubs[n])) {
          logger.error("Subroutine "+calledSubs[n]+" not defined");
          valid = false;
          return false;
        }
      }
      machine.init(typeManager.getNumericGlobals(), typeManager.getStringGlobals());
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
    voidReturnStatement: voidReturnStatement,
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
