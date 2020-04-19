function Parser(handlers,logger){
  var started = false;
  var finished = false;

  // Unique identifiers for token types

  var STRING={};
  var NUMERIC={};
  var IDENTIFIER={};
  var COLON={};
  var SEMICOLON={};
  var SINGLEQUOTE={};
  var OPENPAREN={};
  var CLOSEPAREN={};
  var COMMA={};
  var EQUALS={};
  var NOTEQUAL={};
  var GREATEROREQUAL={};
  var GREATER={};
  var LESSOREQUAL={};
  var LESS={};
  var PLUS={};
  var MINUS={};
  var TIMES={};
  var DIV={};
  var NOT={};


  function tokenizeLine(line) {
    var minlow='a'.charCodeAt(0);
    var maxlow='z'.charCodeAt(0);
    var mincap='A'.charCodeAt(0);
    var maxcap='Z'.charCodeAt(0);
    var minnum='0'.charCodeAt(0);
    var maxnum='9'.charCodeAt(0);
    var dolla='$'.charCodeAt(0);
    var unda='_'.charCodeAt(0);
    var dot='.'.charCodeAt(0);
    var validIdChar = function (p) {
      p = p.charCodeAt(0);
      return ((maxlow >= p && p>=minlow) ||
              (maxcap >= p && p>=mincap) ||
              (p === dolla) ||
              (p === unda));
    };
    var validDigit = function (p) {
      p = p.charCodeAt(0);
      return (maxnum >= p && p>=minnum);
    }
    var validNumericChar = function (p) {
      if (validDigit(p))
        return true;
      p = p.charCodeAt(0);
      return (p===dot);
    }
    var tokens=[];
    var pos=0;
    while (pos<line.length) {
      // skip whitespace
      while (pos<line.length &&
             (line[pos]===' ' || line[pos]==='\t'))
        pos++;
      if (pos>=line.length)
        break;

      // Ignore nonsense on a comment line
      if (tokens.length > 0 && (tokens[0].value==='REM' || tokens[0].value==='\'')) {
        tokens.push({type:STRING,value:line.substring(pos,line.length)});
        pos=line.length;
        break;
      }

      // there's a string
      if (line[pos] === '"') {
        pos++;
        var s="";
        while (pos<line.length && (line[pos]!='"' ||
                                   (pos<line.length-1 && line[pos]==='\"' && line[pos+1]==='\"')))
        {
          if (line[pos] === '\"') {
            pos+=2;
            if (pos>=line.length) {
              logger.error("Parser Error: Unterminated text. You need to add or remove a \"");
              return null;
            }
            s+="\"";
          } else {
            s += line[pos];
            pos++;
          }
        }
        if (line[pos] !== '"') {
          logger.error("Parser Error: Unterminated text. You need a \"");
          return null;
        }
        pos++;
        tokens.push({type:STRING,value:s});
      } else if (validIdChar(line[pos])) {
        var i="";
        // Digits are valid in IDs after the first character
        while (pos<line.length && (validIdChar(line[pos]) || validDigit(line[pos]))) {
          i += line[pos];
          pos++;
        }
        tokens.push({type:IDENTIFIER,value:i.toUpperCase()});
      } else if (validNumericChar(line[pos])) {
        var seenDot = false;
        var n = "";
        while (pos<line.length && validNumericChar(line[pos]) &&
               !(seenDot && line[pos]==='.')) {
          n += line[pos];
          if (line[pos]==='.')
            seenDot = true;
          pos++;
        }
        while(n.length>1 && n[0]==="0") {
          n = n.substring(1);
        }
        tokens.push({type:NUMERIC,value:n});
      } else if (line[pos] === '=') {
        var c='=';
        pos++;
        if (pos<line.length && line[pos] === '=') {
          c='==';
          pos++;
        }
        tokens.push({type:EQUALS,value:c});
      } else if (line[pos] === ':') {
        pos++;
        tokens.push({type:COLON,value:':'});
      } else if (line[pos] === ';') {
        pos++;
        tokens.push({type:SEMICOLON,value:';'});
      } else if (line[pos] === '+') {
        pos++;
        tokens.push({type:PLUS,value:'+'});
      } else if (line[pos] === '\'') {
        pos++;
        tokens.push({type:SINGLEQUOTE,value:'\''});
      } else if (line[pos] === '-') {
        pos++;
        tokens.push({type:MINUS,value:'-'});
      } else if (line[pos] === '*') {
        pos++;
        tokens.push({type:TIMES,value:'*'});
      } else if (line[pos] === '/') {
        pos++;
        tokens.push({type:DIV,value:'/'});
      } else if (line[pos] === '(') {
        pos++;
        tokens.push({type:OPENPAREN,value:'('});
      } else if (line[pos] === ')') {
        pos++;
        tokens.push({type:CLOSEPAREN,value:')'});
      } else if (line[pos] === ',') {
        pos++;
        tokens.push({type:COMMA,value:','});
      } else if (line[pos] === '>') {
        pos++;
        if (pos<line.length && line[pos] === '=') {
          pos++;
          tokens.push({type:GREATEROREQUAL,value:'>='});
        } else {
          tokens.push({type:GREATER,value:'>'});
        }
      } else if (line[pos] === '<') {
        pos++;
        if (pos<line.length && line[pos] === '=') {
          pos++;
          tokens.push({type:LESSOREQUAL,value:'<='});
        } else if (pos<line.length && line[pos] === '>') {
          pos++;
          tokens.push({type:NOTEQUAL,value:'<>'});
        } else {
          tokens.push({type:LESS,value:'<'});
        }
      } else if (line[pos] === '!') {
        pos++;
        if (pos<line.length && line[pos] === '=') {
          pos++;
          tokens.push({type:NOTEQUAL,value:'!='});
        } else {
          tokens.push({type:NOT,value:'!'});
        }
      } else {
        logger.error("Unexpected character: "+line[pos]);
        return null;
      }
    }
    return tokens;
  }

  function parseLine(line,num,handler) {
    var tokens = tokenizeLine(line);
    if (!tokens) {
      return false;
    } else {
      parseLineWithHandler(handler,tokens,num);
      return true;
    }
  }

  function isPredefinedFunction(identifier) {
    return ['ABS','CINT','FIX','INT','LEFT$','LEN','RIGHT$','STR$','VAL','RANDOM'].indexOf(identifier)!=-1;
  }
  function parseLineWithHandler(handler,tokens,num) {
    function boolExpression(tokens) {
      // Given tokens for a boolean expression, return
      // bool expression

      function _boolExpression(tokens, handler) {
        // Generate a bool expression from tokens

        // The smallest possible bool expression is
        // three tokens: literal operator literal
        if (tokens.length < 3)
          return null;
        if (tokens[0].type === IDENTIFIER && tokens[0].value === 'NOT') {
          var result = _boolExpression(tokens.slice(1,tokens.length),handler);
          if (!result) {
            return null;
          }
          return handler.boolNotExpression(result);
        } else if (tokens[0].type === OPENPAREN) {
          var openparens=1;
          var pos = 1;
          var isBoolParen = false;
          while (pos<tokens.length && openparens>0) {
            if (tokens[pos].type===OPENPAREN) {
              openparens++;
            } else if (tokens[pos].type===CLOSEPAREN) {
              openparens--;
            } else if (tokens[pos].type === EQUALS ||
                       tokens[pos].type === NOTEQUAL ||
                       tokens[pos].type === LESS ||
                       tokens[pos].type === GREATER ||
                       tokens[pos].type === LESSOREQUAL ||
                       tokens[pos].type === GREATEROREQUAL) {
              isBoolParen = true;
            }
            pos++;
          }

          if (pos===tokens.length && tokens[pos-1].type!==CLOSEPAREN) {
            return null;
          }
          if (isBoolParen){
            var result = _boolExpression(tokens.slice(1,pos-1),handler);
            if (!result) {
              return null;
            }
            var exp1 = handler.parenExpression(result);
            if (pos < tokens.length && tokens[pos].type === IDENTIFIER) {
              var exp2 = _boolExpression(tokens.slice(pos+1,tokens.length),handler);
              if (!exp2) {
                return null
              }
              if (tokens[pos].value === 'AND') {
                return handler.boolAndExpression(exp1,exp2);
              } else if (tokens[pos].value === 'OR') {
                return handler.boolOrExpression(exp1,exp2);
              }
            }
            return exp1;
          }
          // fall through if this isn't a bool paren expression
        }
        var pos = 0;
        var endpos;
        while (pos<tokens.length && tokens[pos].type !== EQUALS &&
               tokens[pos].type !== NOTEQUAL &&
               tokens[pos].type !== LESS &&
               tokens[pos].type !== GREATER &&
               tokens[pos].type !== LESSOREQUAL &&
               tokens[pos].type !== GREATEROREQUAL) {
          pos++;
        }
        if (pos === tokens.length) {
          logger.error("No comparison operator");
          return null;
        }
        endpos = pos+1;
        while (endpos<tokens.length && !(tokens[endpos].type === IDENTIFIER &&
                                         (tokens[endpos].value === "AND" || tokens[endpos].value === "OR")))
        {
          endpos++;
        }
        var exp1=expression(tokens.slice(0,pos), handler);
        var exp2=expression(tokens.slice(pos+1,endpos), handler);
        if (!exp1 || !exp2)
          return null;
	var opType = tokens[pos].type;
	if (opType === EQUALS) {
	  exp1 =  handler.boolEqualExpression(exp1,exp2);
	} else if (opType === LESS) {
	  exp1 =  handler.boolLessExpression(exp1,exp2);
	} else if (opType === GREATER) {
	  exp1 =  handler.boolGreaterExpression(exp1,exp2);
	} else if (opType === GREATEROREQUAL) {
	  exp1 =  handler.boolGreaterOrEqualExpression(exp1,exp2);
	} else if (opType === LESSOREQUAL) {
	  exp1 =  handler.boolLessOrEqualExpression(exp1,exp2);
	} else if (opType === NOTEQUAL) {
	  exp1 =  handler.boolNotEqualExpression(exp1,exp2);
	} else {
	  logger.error("Invalid comparison type for boolean");
          exp1 = null;
	}

        // Handle a binary operator
        if (endpos !== tokens.length) {
          if (tokens[endpos].value !== "AND" && tokens[endpos].value !== "OR") {
            return null;
          }

          exp2 = boolExpression(tokens.slice(endpos+1,tokens.length));
          if (!exp2)
            return null;
          else {
            if (tokens[endpos].value === "AND")
              return handler.boolAndExpression(exp1,exp2);
            else // OR
              return handler.boolOrExpression(exp1,exp2);
          }
        } else {
          return exp1;
        }
      }

      var result = _boolExpression(tokens, handler);
      if (!result)
        return null;
      else
        return result;

    }

    if (!started && tokens.length>0) {
      started = true;
      if (tokens.length>=4 && tokens[0].type===LESS && tokens[1].type===NOT && tokens[2].type===MINUS && tokens[3].type===MINUS ) {
        tokens = tokens.slice(4);
      }
    }
    if (tokens.length>0 && !finished) {
      if (tokens[0].type===IDENTIFIER) {
        if (tokens[0].value==='PRINT' || tokens[0].value==='PAUSE') {
          var pause = (tokens[0].value==='PAUSE');
          var newline = true;
          if (tokens[tokens.length-1].type === SEMICOLON) {
            tokens = tokens.slice(0,tokens.length-1);
            newline=false;
          }
          tokens = tokens.slice(1,tokens.length);
          if (tokens.length === 0) {
            return handler.printString("",newline,pause);
          } else if (tokens.length === 1 && tokens[0].type === STRING)
            return handler.printString(tokens[0].value,newline,pause);
          else {
            var printExp = expression(tokens, handler);
            if (printExp === null) {
              return null;
            } else {
              return handler.printExp(printExp,newline,pause);
            }
          }
        } else if (tokens[0].value==='REM') {
          if (tokens.length>1)
            return handler.comment(tokens[1].value);
          else
            return handler.comment("");
        } else if (tokens[0].value==='CLS') {
          return handler.clear(num);
        } else if (tokens[0].value==='NEXT') {
          if (tokens.length !== 2) {
            return false;
          } else {
            return handler.next([tokens[1]],num);
          }
        } else if (tokens[0].value==='IF') {
          var exp2end;
          if (tokens[tokens.length-1].type===IDENTIFIER &&
              tokens[tokens.length-1].value==='THEN')
            exp2end = tokens.length-1;
          else
            exp2end = tokens.length;

          var boolExp = boolExpression(tokens.slice(1,exp2end));
          if (!boolExp) {
            logger.error("Invalid IF");
            return false;
          }
          return handler.ifStatement(boolExp, num);

	} else if (tokens[0].value==='WAIT' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[2].type === IDENTIFIER && tokens[1].value==='FOR' && tokens[2].value==='MUSIC') {
	  return handler.waitForMusic();
        } else if (tokens[0].value==='BEGIN' && tokens.length === 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'RANDOM') {
          return handler.beginRandom(num);

        } else if (tokens[0].value==='SUBROUTINE' && tokens.length >= 2 && tokens[1].type === IDENTIFIER) {
          var args = [];
          var pos = 2;
          while (pos < tokens.length) {
            if (tokens[pos].type === IDENTIFIER)
              args.push(tokens[pos].value);
            else
              return false;
            pos++;
            if (pos < tokens.length) {
              if (tokens[pos].type === COMMA) {
                pos++;
              } else {
                return false;
              }
            }
          }
          return handler.beginSubroutine(tokens[1].value,args);
        } else if (tokens[0].value==='CALL' && tokens.length >= 2 && tokens[1].type === IDENTIFIER) {
	  // XXX this is duplicated in the expression handler
          var argExps = [];
          var start = 2;
          var pos = start;
	  var parendepth = 0;
          while (pos < tokens.length) {
	    while (pos < tokens.length && (tokens[pos].type !== COMMA || parendepth > 0)) {
	      if (tokens[pos].type === OPENPAREN)
		parendepth++;
	      if (tokens[pos].type === CLOSEPAREN)
		parendepth--;
	      pos++;
	    }

            argExps.push(expression(tokens.slice(start,pos), handler));
            pos++; // skip the comma
            start = pos;
          }
          return handler.callSubroutine(tokens[1].value,argExps);

        } else if (tokens[0].value==='END' && tokens.length == 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'SUBROUTINE') {
          return handler.endSubroutine();

        } else if (tokens[0].value==='RETURN' && tokens.length >= 2) {
          return handler.returnStatement(expression(tokens.slice(1,tokens.length), handler),num);

        } else if (tokens[0].value==='END' && tokens.length == 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'RANDOM') {
          return handler.endRandom(num);

        } else if (tokens[0].value==='WITH' && tokens.length == 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'CHANCE' && tokens[2].type === NUMERIC) {
          return handler.withChance(tokens[2].value,num);

        } else if (tokens[0].value==='WITH' && tokens.length == 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'CHANCE') {
          return handler.withEvenChance(num);

        } else if (tokens[0].value==='ASK' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'COLOR' && tokens[2].type === NUMERIC) {
          return handler.askColor(tokens[2].value,num);

        } else if (tokens[0].value==='ASK' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'BGCOLOR' && tokens[2].type === NUMERIC) {
          return handler.askBGColor(tokens[2].value,num);

        } else if (tokens[0].value==='ASK' && tokens.length === 4 && tokens[1].type === IDENTIFIER && tokens[1].value === 'PROMPT' && tokens[2].type === IDENTIFIER && tokens[2].value === 'COLOR' && tokens[3].type === NUMERIC) {
          return handler.askPromptColor(tokens[3].value,num);

        } else if (tokens[0].value==='ASK' && tokens.length >= 2) {
          return handler.beginAsk(expression(tokens.slice(1,tokens.length), handler),num);

        } else if (tokens[0].value==='DEFAULT' && tokens.length === 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'NO') {
          return handler.askDefault(false,num);

        } else if (tokens[0].value==='DEFAULT' && tokens.length === 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'YES') {
          return handler.askDefault(true,num);

        } else if (tokens[0].value==='ON' && tokens.length === 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'NO') {
          return handler.onNo(num);

        } else if (tokens[0].value==='ON' && tokens.length === 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'YES') {
          return handler.onYes(num);

        } else if (tokens[0].value==='END' && tokens.length === 2 && tokens[1].value==='ASK') {
          return handler.endAsk(num);

        } else if (tokens[0].value==='BEGIN' && tokens.length > 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'MENU') {
          return handler.beginMenu(expression(tokens.slice(2,tokens.length), handler),num);

        } else if (tokens[0].value==='MENU' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'COLOR' && tokens[2].type===NUMERIC) {
          return handler.menuColor(tokens[2].value,num);

        } else if (tokens[0].value==='MENU' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'BGCOLOR' && tokens[2].type===NUMERIC) {
          return handler.menuBGColor(tokens[2].value,num);

        } else if (tokens[0].value==='MENU' && tokens.length === 4 && tokens[1].type === IDENTIFIER && tokens[1].value === 'CHOICE' && tokens[2].type === IDENTIFIER && tokens[2].value === 'COLOR' && tokens[3].type===NUMERIC) {
          return handler.menuChoiceColor(tokens[3].value,num);
        } else if (tokens[0].value==='HIDE' && tokens.length >= 5 && tokens[1].type === IDENTIFIER && tokens[1].value === 'IF' ) {
          var boolExp = boolExpression(tokens.slice(2,tokens.length));
          if (!boolExp) {
            logger.error("Invalid HIDE IF");
            return false;
          }
          return handler.menuHideIf(boolExp, num);

        } else if (tokens[0].value==='MENU' && tokens.length === 4 && tokens[1].type === IDENTIFIER && tokens[1].value === 'PROMPT' && tokens[2].type === IDENTIFIER && tokens[2].value === 'COLOR' && tokens[3].type===NUMERIC) {
          return handler.menuPromptColor(tokens[3].value,num);

        } else if (tokens[0].value==='END' && tokens.length == 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'MENU') {
          return handler.endMenu(num);

        } else if (tokens[0].value==='CHOICE' && tokens.length > 2 && tokens[1].type === IDENTIFIER) {
          return handler.menuChoice(tokens[1].value,expression(tokens.slice(2,tokens.length), handler),num);
        } else if (tokens[0].value==='CHOICE' && tokens.length > 2 && tokens[1].type === NUMERIC) {
          return handler.menuChoice((tokens[1].value).toString(10),expression(tokens.slice(2,tokens.length), handler),num);

        } else if (tokens[0].value==='WHILE') {
          var exp2end;
          if (tokens[tokens.length-1].type===IDENTIFIER &&
              tokens[tokens.length-1].value==='DO')
            exp2end = tokens.length-1;
          else
            exp2end = tokens.length;
          var boolExp = boolExpression(tokens.slice(1,exp2end));
          if (!boolExp) {
            logger.error("Invalid WHILE");
            return false;
          }
          return handler.whileStatement(boolExp, num);

        } else if (tokens[0].value==='END' && tokens.length===2 &&
                   tokens[1].type===IDENTIFIER && tokens[1].value==='IF') {
          return handler.endIf(num);

        } else if ((tokens[0].value==='WEND' && tokens.length===1) ||
                   (tokens[0].value==='END' && tokens.length===2 &&
                    tokens[1].value==='WHILE')) {
          return handler.endWhile(num);

        } else if (tokens[0].value==='ELSE' && tokens.length===1) {
          return handler.elseStatement(num);

        } else if (tokens[0].value==='COLOR') {
          return handler.color(expression(tokens.slice(1,tokens.length), handler),num);

        } else if (tokens[0].value==='BGCOLOR') {
          return handler.bgColor(expression(tokens.slice(1,tokens.length), handler),num);

        } else if (tokens[0].value==='SLEEP') {
          return handler.sleep(expression(tokens.slice(1,tokens.length), handler),num);
        } else if (tokens[0].value==='INPUT') {
          if (tokens.length !== 2 || tokens[1].type !== IDENTIFIER) {
            logger.error("Invalid INPUT");
            return false;
          } else {
            return handler.input(tokens[1].value,num);
          }
        } else if (tokens[0].value==='PLAY') {
          return handler.play(expression(tokens.slice(1,tokens.length), handler),num);
        } else if (tokens[0].value==='FOR') {
          if(!(tokens.length>=6 && tokens[2].type === EQUALS && tokens[2].value === '=' && tokens[1].type === IDENTIFIER)) {
            logger.error("Invalid FOR");
            return false;
          }

          var pos  = 3;
          while (pos < tokens.length &&
                 !(tokens[pos].type === IDENTIFIER &&
                   tokens[pos].value === 'TO')) {
            pos++;
          }
          if (pos === tokens.length) {
            logger.error("Missing TO in FOR");
            return false;
          }
          return handler.forStatement(tokens[1].value, expression(tokens.slice(3,pos), handler),
                                      expression(tokens.slice(pos+1,tokens.length), handler),num);

        } else if (tokens.length>=3 && tokens[1].type===EQUALS &&
                   tokens[1].value==='=') {
          var letExp = expression(tokens.slice(2,tokens.length), handler);
          if (letExp === null) {
            return false;
          } else {
            return handler.letStatement(tokens[0].value, letExp);
          }
        } else {
          logger.error("I do not recognize "+tokens[0].value);
          return false;
        }
      } else if (tokens[0].type===SINGLEQUOTE) {
        if (tokens.length>1)
          return handler.comment(tokens[1].value);
        else
          return handler.comment("");
      } else if (tokens.length>=3 && tokens[0].type === MINUS && tokens[1].type === MINUS && tokens[2].type === GREATER) {
        finished = true;
      } else {
        logger.error("I am confused. I did not expect "+tokens[0].value);
        return false;
      }
    }
    return true;
  }

  function expression(tokens, handler) {
    function continueExpression(head, tokens) {
      if (tokens[0].type === PLUS ||tokens[0].type === MINUS ||
                 tokens[0].type === TIMES || tokens[0].type === DIV) {
        var tail = expression(tokens.slice(1),handler);
        if (tail === null) {
          return null;
        }
	return binaryExpression(tokens[0].type,head,tail);
      } else {
        logger.error("Invalid expression");
        return null;
      }
    }
    function binaryExpression(expType,head,tail) {
      if (expType === PLUS) {
        return handler.additionExpression(head,tail);
      } else if (expType === MINUS) {
        return handler.subtractionExpression(head,tail);
      } else if (expType === TIMES) {
        return handler.multiplicationExpression(head,tail);
      } else if (expType === DIV) {
        return handler.divisionExpression(head,tail);
      }
    }

    if (tokens.length === 0) {
      logger.error("No expression found");
      return null;
    } else if (tokens.length === 1) {
      if (tokens[0].type===NUMERIC){
        return handler.numericLiteralExpression(tokens[0].value);
      } else if (tokens[0].type===STRING){
        // silently truncate long strings
        if (tokens[0].value.length>255)
          tokens[0].value=tokens[0].value.slice(0,255);
        return handler.stringLiteralExpression(tokens[0].value);
      } else if (tokens[0].type===IDENTIFIER) {
        if (tokens[0].value==='PI') {
          return handler.piBuiltinExpression();
        } if (isPredefinedFunction(tokens[0].value)) {
          logger.error("Function "+tokens[0].value+" needs parameters enclosed in parentheses");
          return null;
        } else {
          return handler.variableExpression(tokens[0].value);
        }
      } else {
        logger.error("Invalid expression");
        return null;
      }
      // Predefined functions
    } else if (tokens[0].type===IDENTIFIER &&isPredefinedFunction(tokens[0].value)) {
      if (tokens.length < 3 || tokens[1].type!==OPENPAREN) {
        logger.error("Function "+tokens[0].value+" expects parameters between parantheses");
        return null;
      }

      // Find the matching paren
      var i;
      var depth = 1;
      for (i=2;i<tokens.length&&depth>0;i++) {
        if (tokens[i].type===CLOSEPAREN)
          depth--;
        else if (tokens[i].type===OPENPAREN) {
          depth++;
        }
      }
      // No closing paren
      if (depth > 0) {
        logger.error("No closing parenthesis for function "+tokens[0].value);
        return null;
      }
      // No closing paren
      if (depth < 0) {
        logger.error("Too many closing parentheses for function "+tokens[0].value);
        return null;
      }

      var head;
      if (['LEFT$','RIGHT$','RANDOM'].indexOf(tokens[0].value)!=-1) {
        // 2 params
        var j;
        var parenCount = 0;
        for (j=1;j<(i-1) && (tokens[j].type !== COMMA || parenCount !== 1);j++) {
          if (tokens[j].type===OPENPAREN)
            parenCount++;
          if (tokens[j].type===CLOSEPAREN)
            parenCount--;
        }
        var firstParam = tokens.slice(2,j);
        var secondParam = tokens.slice(j+1,i-1);
        if (firstParam.length == 0 || secondParam.length == 0) {
          if (firstParam.length == 0)
            logger.error("First parameter of "+tokens[0].value+" is missing");
          if (secondParam.length == 0)
            logger.error("Second parameter of "+tokens[0].value+" is missing");
          return null;
        }
        firstParam = expression(firstParam, handler);
        secondParam = expression(secondParam, handler);
        if (tokens[0].value === 'LEFT$') {
          head = handler.leftzBuiltinExpression(firstParam, secondParam);
        } else if (tokens[0].value === 'RIGHT$') {
          head = handler.rightzBuiltinExpression(firstParam, secondParam);
        } else if (tokens[0].value === 'RANDOM') {
          head = handler.randomBuiltinExpression(firstParam, secondParam);
        }
      } else {
        // Single param
        var param = tokens.slice(2,i-1);
        if (param.length == 0) {
          logger.error("Parameter of "+tokens[0].value+" is missing");
          return null;
        }
        param = expression(param, handler);
        if (tokens[0].value === 'ABS') {
          head = handler.absBuiltinExpression(param);
        } else if (tokens[0].value === 'CINT') {
          head = handler.cintBuiltinExpression(param);
        } else if (tokens[0].value === 'FIX') {
          head = handler.fixBuiltinExpression(param);
        } else if (tokens[0].value === 'INT') {
          head = handler.intBuiltinExpression(param);
        } else if (tokens[0].value === 'LEN') {
          head = handler.lenBuiltinExpression(param);
        } else if (tokens[0].value === 'STR$') {
          head = handler.strzBuiltinExpression(param);
        } else if (tokens[0].value === 'VAL') {
          head = handler.valBuiltinExpression(param);
        }
      }
      // XXX Consider adding MID$()
      // MID$(x$,n[,m]) To return a string of m characters from x$ beginning with the nth character. n >= 1 - MID$(x$,1,n) is LEFT$(x$,n)


      // There is nothing following this function
      if (i == tokens.length) {
        return head;
        // There is a binary operator following this function
      } else {
        return continueExpression(head, tokens.slice(i));
      }
    } else if (tokens[0].value==='CALL' && tokens[0].type===IDENTIFIER && tokens.length >= 2 && tokens[1].type === IDENTIFIER) {
      // XXX this is duplicated in the statement handler
      var argExps = [];
      var start = 2;
      var pos = start;
      var parendepth = 0;
      while (pos < tokens.length) {
        while (pos < tokens.length && (tokens[pos].type !== COMMA || parendepth > 0)) {
	  if (tokens[pos].type === OPENPAREN)
	    parendepth++;
	  if (tokens[pos].type === CLOSEPAREN)
	    parendepth--;
          pos++;
	}
        argExps.push(expression(tokens.slice(start,pos),handler));
        pos++; // skip the comma
        start = pos;
      }
      return handler.callSubroutineExpression(tokens[1].value,argExps);

    } else if (tokens.length >= 2 && tokens[0].type===PLUS && tokens[1].type===NUMERIC) {
      // A numeric expression starting with plus
      var head = expression([tokens[1]], handler);
      if (tokens.length > 2) {
        return continueExpression(head, tokens.slice(2));
      }
      return head;
    } else if (tokens.length >= 2 && tokens[0].type===MINUS && tokens[1].type===NUMERIC) {
      // A numeric expression starting with minus - combine the minus into the number
      return expression([{type:NUMERIC,value:("-"+tokens[1].value)}].concat(tokens.slice(2,tokens.length)), handler);
    } else if (tokens[0].type===OPENPAREN) {
      var openparens=1;
      var pos = 1;
      while (pos<tokens.length && openparens>0) {
        if (tokens[pos].type===OPENPAREN) {
          openparens++;
        } else if (tokens[pos].type===CLOSEPAREN) {
          openparens--;
        }
        pos++;
      }
      if (pos===tokens.length && tokens[pos-1].type!==CLOSEPAREN) {
        logger.error("Mismatched parens");
        return null;
      }
      var parenExp = expression(tokens.slice(1,pos-1),handler);
      if (parenExp === null) {
        return null;
      }
      var result = handler.parenExpression(parenExp);
      // we're done - the whole thing was in parens
      // or what's in the parens is bad
      if (pos==tokens.length || result === null)
        return result;

      return continueExpression(result, tokens.slice(pos));
      // This is a + expression starting with an identifier
    } else {
      // Starts with identifier
      var head = expression([tokens[0]],handler);
      if (head === null)
        return null;
      return continueExpression(head, tokens.slice(1));
    }
  }
  function compileText(text, handler) {
    var success = true;
    var lines = text.split("\r\n");
    if (lines.length===1)
      lines = text.split("\n");
    if (lines.length===1)
      lines = text.split("\r");
    for (var n=0;n<lines.length;n++) {
      logger.set_line_number(n);
      if (!parseLine(lines[n],n,handler)) {
        success = false;
      }
    }
    logger.clear_line_number();
    return success;
  }

  function compile(programText) {
    var success = true;
    for (var pass = 0;success && pass < handlers.length;pass++) {
      started = false;
      finished = false;
      if (!compileText(programText, handlers[pass])) {
        success = false;
      }
      if (!handlers[pass].finalize()) {
        // The handler decides if the next pass should run
        // Running even though the previous pass failed can give better error messages
        return false;
      }
    }
    return success;
  }

  // export just one funtion
  return {
    compile: compile
  };
}
