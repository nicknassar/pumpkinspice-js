function Parser(handlers,logger){
  var started = false;
  var finished = false;
  var handler;

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
  var AND={};
  var OR={};
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
        i = i.toUpperCase();
        // Keyword operators
        if (i == "AND") {
          tokens.push({type:AND,value:i});
        } else if (i == "OR") {
          tokens.push({type:OR,value:i});
        } else if (i == "NOT") {
          tokens.push({type:NOT,value:i});
        } else {
          tokens.push({type:IDENTIFIER,value:i});
        }
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

  function parseLine(line,num) {
    var tokens = tokenizeLine(line);
    if (tokens === null) {
      return false;
    } else {
      parseLineTokens(tokens);
      return true;
    }
  }

  function isPredefinedFunction(identifier) {
    return ['ABS','CINT','FIX','INT','LEFT$','LEN','RIGHT$','STR$','VAL','RANDOM'].indexOf(identifier)!=-1;
  }

  // Used to parse subroutine params
  // returns pair with list of expressions and remaining tokens
  function parseExpressionList(tokens) {
    var argExps = [];
    var pos = 0;
    var start = 0;
    var parendepth = 0;
    while (pos < tokens.length &&
           !isBooleanOperator(tokens[pos])) {
      while (pos < tokens.length && (tokens[pos].type !== COMMA || parendepth > 0) &&
             !isBooleanOperator(tokens[pos])) {
	if (tokens[pos].type === OPENPAREN)
	  parendepth++;
	if (tokens[pos].type === CLOSEPAREN)
	  parendepth--;
        pos++;
      }
      var tempExp = expression(tokens.slice(start,pos));
      if (tempExp === null) {
        return [null, []];
      }
            argExps.push(tempExp);
      if (pos < tokens.length && !isBooleanOperator(tokens[pos]))
        pos++; // skip the comma
      start = pos;
    }
    return [argExps, tokens.slice(pos)];
  }

  // returns the expression up to the next infix operator, plus the remaining tokens
  function nextSimpleExpression(tokens) {
    if (tokens.length === 0) {
      logger.error("Expected expression");
      return [null, []];
    } else if (tokens[0].type===NUMERIC){
        return [handler.numericLiteralExpression(tokens[0].value), tokens.slice(1)];
    } else if (tokens[0].type===STRING){
      // silently truncate long strings
      if (tokens[0].value.length>255)
        tokens[0].value=tokens[0].value.slice(0,255);
      return [handler.stringLiteralExpression(tokens[0].value), tokens.slice(1)];
    } else if (tokens[0].type===IDENTIFIER) {
      if (tokens[0].value==='PI') {
        return [handler.piBuiltinExpression(), tokens.slice(1)];
      } else if (isPredefinedFunction(tokens[0].value)) {
	if (tokens.length < 3 || tokens[1].type!==OPENPAREN) {
          logger.error("Function "+tokens[0].value+" expects parameters between parantheses");
          return [null, []];
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
          return [null, []];
	}
	// No closing paren
	if (depth < 0) {
          logger.error("Too many closing parentheses for function "+tokens[0].value);
          return [null, []];
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
            return [null, []];
          }
          firstParam = expression(firstParam);
          secondParam = expression(secondParam);
          if (tokens[0].value === 'LEFT$') {
            return [handler.leftzBuiltinExpression(firstParam, secondParam), tokens.slice(i)];
          } else if (tokens[0].value === 'RIGHT$') {
            return [handler.rightzBuiltinExpression(firstParam, secondParam), tokens.slice(i)];
          } else if (tokens[0].value === 'RANDOM') {
            return [handler.randomBuiltinExpression(firstParam, secondParam), tokens.slice(i)];
          }
	} else {
          // Single param
          var param = tokens.slice(2,i-1);
          if (param.length == 0) {
            logger.error("Parameter of "+tokens[0].value+" is missing");
            return [null, []];
          }
          param = expression(param);
          if (tokens[0].value === 'ABS') {
            return [handler.absBuiltinExpression(param), tokens.slice(i)];
          } else if (tokens[0].value === 'CINT') {
            return [handler.cintBuiltinExpression(param), tokens.slice(i)];
          } else if (tokens[0].value === 'FIX') {
            return [handler.fixBuiltinExpression(param), tokens.slice(i)];
          } else if (tokens[0].value === 'INT') {
            return [handler.intBuiltinExpression(param), tokens.slice(i)];
          } else if (tokens[0].value === 'LEN') {
            return [handler.lenBuiltinExpression(param), tokens.slice(i)];
          } else if (tokens[0].value === 'STR$') {
            return [handler.strzBuiltinExpression(param), tokens.slice(i)];
          } else if (tokens[0].value === 'VAL') {
            return [handler.valBuiltinExpression(param), tokens.slice(i)];
          }
	}
      } else if (tokens[0].value==='CALL') {
	if (tokens.length < 2 || tokens[1].type !== IDENTIFIER) {
	  logger.error("CALL expression expects the name of a subroutine to call");
	  return [null, []];
	}
        var expressionList = parseExpressionList(tokens.slice(2));
        var argExps = expressionList[0];
        if (argExps === null)
          return [null, []];
        var remaining = expressionList[1];
	return [handler.callSubroutineExpression(tokens[1].value,argExps), remaining];

      } else {
	return [handler.variableExpression(tokens[0].value), tokens.slice(1)];
      }
    } else if (tokens[0].type===PLUS) {
      if (tokens.length < 2 || tokens[1].type !== NUMERIC) {
	logger.error("Number expected after + in expression");
	return [null, []];
      }
      // A numeric expression starting with plus
      return [handler.numericLiteralExpression(tokens[1].value), tokens.slice(2)];
    } else if (tokens[0].type===MINUS) {
      if (tokens.length < 2 || tokens[1].type !== NUMERIC) {
	logger.error("Number expected after - in expression");
	return [null, []];
      }
      // A numeric expression starting with minus - combine the minus into the number
      return [handler.numericLiteralExpression("-"+tokens[1].value), tokens.slice(2)];

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
        return [null, []];
      }
      var parenExp = expression(tokens.slice(1,pos-1));
      if (parenExp === null) {
        return [null, []];
      }
      return [handler.parenExpression(parenExp), tokens.slice(pos)];
      // This is a + expression starting with an identifier
    } else {
      logger.error("Unexpected token "+tokens[0].value+" in expression");
      return [null, []];
    }
  }

  function parseLineTokens(tokens) {
    if (!started && tokens.length>0) {
      started = true;
      if (tokens.length>=4 && tokens[0].type===LESS && tokens[1].value==="!" && tokens[2].type===MINUS && tokens[3].type===MINUS ) {
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
            var printExp = expression(tokens);
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
          return handler.clear();
        } else if (tokens[0].value==='NEXT') {
          if (tokens.length !== 2 || tokens[1].type !== IDENTIFIER) {
            return false;
          } else {
            return handler.next(tokens[1].value);
          }
        } else if (tokens[0].value==='IF') {
          var exp2end;
          if (tokens[tokens.length-1].type===IDENTIFIER &&
              tokens[tokens.length-1].value==='THEN')
            exp2end = tokens.length-1;
          else
            exp2end = tokens.length;

          var boolExp = expression(tokens.slice(1,exp2end));
          if (boolExp == null) {
            logger.error("Invalid IF");
            return false;
          }
          return handler.ifStatement(boolExp);

	} else if (tokens[0].value==='WAIT' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[2].type === IDENTIFIER && tokens[1].value==='FOR' && tokens[2].value==='MUSIC') {
	  return handler.waitForMusic();
        } else if (tokens[0].value==='BEGIN' && tokens.length === 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'RANDOM') {
          return handler.beginRandom();

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
          var expressionList = parseExpressionList(tokens.slice(2));
          var argExps = expressionList[0];
          if (argExps === null) {
            return null;
          } else if (expressionList[1].length > 0) {
            logger.error("Extra junk at the end of this CALL statement");
            return null;
          } else {
            return handler.callSubroutine(tokens[1].value,argExps);
          }
        } else if (tokens[0].value==='END' && tokens.length == 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'SUBROUTINE') {
          return handler.endSubroutine();

        } else if (tokens[0].value==='RETURN' && tokens.length === 1) {
          return handler.voidReturnStatement();

        } else if (tokens[0].value==='RETURN' && tokens.length >= 2) {
          return handler.returnStatement(expression(tokens.slice(1,tokens.length)));

        } else if (tokens[0].value==='END' && tokens.length == 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'RANDOM') {
          return handler.endRandom();

        } else if (tokens[0].value==='WITH' && tokens.length == 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'CHANCE' && tokens[2].type === NUMERIC) {
          return handler.withChance(tokens[2].value);

        } else if (tokens[0].value==='WITH' && tokens.length == 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'CHANCE') {
          return handler.withEvenChance();

        } else if (tokens[0].value==='ASK' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'COLOR' && tokens[2].type === NUMERIC) {
          return handler.askColor(tokens[2].value);

        } else if (tokens[0].value==='ASK' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'BGCOLOR' && tokens[2].type === NUMERIC) {
          return handler.askBGColor(tokens[2].value);

        } else if (tokens[0].value==='ASK' && tokens.length === 4 && tokens[1].type === IDENTIFIER && tokens[1].value === 'PROMPT' && tokens[2].type === IDENTIFIER && tokens[2].value === 'COLOR' && tokens[3].type === NUMERIC) {
          return handler.askPromptColor(tokens[3].value);

        } else if (tokens[0].value==='ASK' && tokens.length >= 2) {
          return handler.beginAsk(expression(tokens.slice(1,tokens.length)));

        } else if (tokens[0].value==='DEFAULT' && tokens.length === 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'NO') {
          return handler.askDefault(false);

        } else if (tokens[0].value==='DEFAULT' && tokens.length === 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'YES') {
          return handler.askDefault(true);

        } else if (tokens[0].value==='ON' && tokens.length === 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'NO') {
          return handler.onNo();

        } else if (tokens[0].value==='ON' && tokens.length === 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'YES') {
          return handler.onYes();

        } else if (tokens[0].value==='END' && tokens.length === 2 && tokens[1].value==='ASK') {
          return handler.endAsk();

        } else if (tokens[0].value==='BEGIN' && tokens.length > 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'MENU') {
          return handler.beginMenu(expression(tokens.slice(2,tokens.length)));

        } else if (tokens[0].value==='MENU' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'COLOR' && tokens[2].type===NUMERIC) {
          return handler.menuColor(tokens[2].value);

        } else if (tokens[0].value==='MENU' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'BGCOLOR' && tokens[2].type===NUMERIC) {
          return handler.menuBGColor(tokens[2].value);

        } else if (tokens[0].value==='MENU' && tokens.length === 4 && tokens[1].type === IDENTIFIER && tokens[1].value === 'CHOICE' && tokens[2].type === IDENTIFIER && tokens[2].value === 'COLOR' && tokens[3].type===NUMERIC) {
          return handler.menuChoiceColor(tokens[3].value);
        } else if (tokens[0].value==='HIDE' && tokens.length >= 5 && tokens[1].type === IDENTIFIER && tokens[1].value === 'IF' ) {
          var boolExp = expression(tokens.slice(2,tokens.length));
          if (boolExp === null) {
            logger.error("Invalid HIDE IF");
            return false;
          }
          return handler.menuHideIf(boolExp);

        } else if (tokens[0].value==='MENU' && tokens.length === 4 && tokens[1].type === IDENTIFIER && tokens[1].value === 'PROMPT' && tokens[2].type === IDENTIFIER && tokens[2].value === 'COLOR' && tokens[3].type===NUMERIC) {
          return handler.menuPromptColor(tokens[3].value);

        } else if (tokens[0].value==='END' && tokens.length == 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'MENU') {
          return handler.endMenu();

        } else if (tokens[0].value==='CHOICE' && tokens.length > 2 && tokens[1].type === IDENTIFIER) {
          return handler.menuChoice(tokens[1].value,expression(tokens.slice(2,tokens.length)));
        } else if (tokens[0].value==='CHOICE' && tokens.length > 2 && tokens[1].type === NUMERIC) {
          return handler.menuChoice((tokens[1].value).toString(10),expression(tokens.slice(2,tokens.length)));

        } else if (tokens[0].value==='WHILE') {
          var exp2end;
          if (tokens[tokens.length-1].type===IDENTIFIER &&
              tokens[tokens.length-1].value==='DO')
            exp2end = tokens.length-1;
          else
            exp2end = tokens.length;
          var boolExp = expression(tokens.slice(1,exp2end));
          if (boolExp === null) {
            logger.error("Invalid WHILE");
            return false;
          }
          return handler.whileStatement(boolExp);

        } else if (tokens[0].value==='END' && tokens.length===2 &&
                   tokens[1].type===IDENTIFIER && tokens[1].value==='IF') {
          return handler.endIf();

        } else if ((tokens[0].value==='WEND' && tokens.length===1) ||
                   (tokens[0].value==='END' && tokens.length===2 &&
                    tokens[1].value==='WHILE')) {
          return handler.endWhile();

        } else if (tokens[0].value==='ELSE' && tokens.length===1) {
          return handler.elseStatement();

        } else if (tokens[0].value==='COLOR') {
          return handler.color(expression(tokens.slice(1,tokens.length)));

        } else if (tokens[0].value==='BGCOLOR') {
          return handler.bgColor(expression(tokens.slice(1,tokens.length)));

        } else if (tokens[0].value==='SLEEP') {
          return handler.sleep(expression(tokens.slice(1,tokens.length)));
        } else if (tokens[0].value==='INPUT') {
          if (tokens.length !== 2 || tokens[1].type !== IDENTIFIER) {
            logger.error("Invalid INPUT");
            return false;
          } else {
            return handler.input(tokens[1].value);
          }
        } else if (tokens[0].value==='PLAY') {
          return handler.play(expression(tokens.slice(1,tokens.length)));
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
          return handler.forStatement(tokens[1].value, expression(tokens.slice(3,pos)),
                                      expression(tokens.slice(pos+1,tokens.length)));

        } else if (tokens.length>=3 && tokens[1].type===EQUALS &&
                   tokens[1].value==='=') {
          var letExp = expression(tokens.slice(2,tokens.length));
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

  function isBooleanOperator(token) {
    return (token.type === EQUALS ||
            token.type === NOTEQUAL ||
            token.type === GREATEROREQUAL ||
            token.type === GREATER ||
            token.type === LESSOREQUAL ||
            token.type === LESS ||
            token.type === AND ||
            token.type === OR ||
            token.type === NOT);
  }

  function isInfixOperator(token) {
    return (token.type === PLUS ||
            token.type === MINUS ||
            token.type === TIMES ||
            token.type === DIV ||
            token.type === EQUALS ||
            token.type === NOTEQUAL ||
            token.type === GREATEROREQUAL ||
            token.type === GREATER ||
            token.type === LESSOREQUAL ||
            token.type === LESS ||
            token.type === AND ||
            token.type === OR);
  }
  function isUnaryOperator(token) {
    return (token.type === NOT);
  }

  // Lower numers are higher priority
  // takes in a token type
  function operatorPrecedence(operator) {
    if (operator === TIMES || operator === DIV) {
      return 1;
    } else if (operator === PLUS || operator === MINUS) {
      return 2;
    } else if (operator === EQUALS || operator === NOTEQUAL ||
               operator === GREATER || operator === GREATEROREQUAL ||
               operator === LESS || operator === LESSOREQUAL) {
      return 3;
    } else if (operator === NOT) {
      return 4;
    } else if (operator === AND) {
      return 5;
    } else if (operator === OR) {
      return 6;
    }
  }


  // return true iff infix operator tokenType1 has higher precedence
  function hasHigherPrecedence(tokenType1, tokenType2) {
    return operatorPrecedence(tokenType1.type) < operatorPrecedence(tokenType2.type);
  }

  function expression(tokens) {
    function binaryExpression(opToken,head,tail) {
      var expType = opToken.type;
      if (expType === PLUS) {
        return handler.additionExpression(head,tail);
      } else if (expType === MINUS) {
        return handler.subtractionExpression(head,tail);
      } else if (expType === TIMES) {
        return handler.multiplicationExpression(head,tail);
      } else if (expType === DIV) {
        return handler.divisionExpression(head,tail);
      } else if (expType === NOTEQUAL) {
        return handler.boolNotEqualExpression(head,tail);
      } else if (expType === EQUALS) {
        return handler.boolEqualExpression(head,tail);
      } else if (expType === GREATER) {
        return handler.boolGreaterExpression(head,tail);
      } else if (expType === GREATEROREQUAL) {
        return handler.boolGreaterOrEqualExpression(head,tail);
      } else if (expType === LESS) {
        return handler.boolLessExpression(head,tail);
      } else if (expType === LESSOREQUAL) {
        return handler.boolLessOrEqualExpression(head,tail);
      } else if (expType === AND) {
        return handler.boolAndExpression(head,tail);
      } else if (expType === OR) {
        return handler.boolOrExpression(head,tail);
      } else {
        logger.error("Unexpected expression type?!");
        return null;
      }
    }

    function unaryExpression(opToken, param) {
      if (opToken.type === NOT) {
        return handler.boolNotExpression(param);
      } else {
        logger.error("Unexpected expression type?");
        return null;
      }
    }

    var remaining = tokens;
    var operatorStack = [];
    var expStack = [];

    if (remaining.length === 0) {
      logger.error("Expected expression");
      return null;
    } else if (isUnaryOperator(remaining[0])) {
      operatorStack.push(remaining[0]);
      remaining = remaining.slice(1);
    }

    var result = nextSimpleExpression(remaining);
    if (result[0] === null)
      return null;
    expStack.push(result[0]);
    remaining = result[1];

    while (remaining.length > 0) {
      if (!(isInfixOperator(remaining[0]) || isUnaryOperator(remaining[0]))) {
        logger.error("Unexpected token "+remaining[0].value+" in expression");
        return null;
      }
      var finalOp = remaining[0];
      while (operatorStack.length > 0 && !hasHigherPrecedence(finalOp, operatorStack[operatorStack.length - 1])) {
        // The final infix operator has the same or lower precedence then the next-to-last
        // Combine the previous two simple expressions
        var currentOp = operatorStack.pop();
        if (isUnaryOperator(currentOp)) {
          var param = expStack.pop();
          var newExp = unaryExpression(currentOp, param);
          if (newExp === null)
            return null;
          expStack.push(newExp);
        } else { // isBinaryOperator
          var secondParam = expStack.pop();
          var firstParam = expStack.pop();
          var newExp = binaryExpression(currentOp, firstParam, secondParam);
          if (newExp === null)
            return null;
          expStack.push(newExp);
        }
      }
      operatorStack.push(finalOp);
      var startOfNextSimpleExp = 1;
      while (remaining.length > startOfNextSimpleExp && isUnaryOperator(remaining[startOfNextSimpleExp])) {
        operatorStack.push(remaining[startOfNextSimpleExp]);
        startOfNextSimpleExp++;
      }
      result = nextSimpleExpression(remaining.slice(startOfNextSimpleExp));
      if (result[0] === null)
        return null;
      expStack.push(result[0]);
      remaining = result[1];
    }
    while (operatorStack.length > 0) {
      // Combine the expressions
      var currentOp = operatorStack.pop();
      if (isUnaryOperator(currentOp)) {
        var param = expStack.pop();
          var newExp = unaryExpression(currentOp, param);
          if (newExp === null)
            return null;
          expStack.push(newExp);
      } else { // isBinaryOperator
        var secondParam = expStack.pop();
        var firstParam = expStack.pop();
        var newExp = binaryExpression(currentOp, firstParam, secondParam);
        if (newExp === null)
          return null;
        expStack.push(newExp);
      }
    }
    return expStack[0];
  }
  function compileText(text) {
    var success = true;
    var lines = text.split("\r\n");
    if (lines.length===1)
      lines = text.split("\n");
    if (lines.length===1)
      lines = text.split("\r");
    for (var n=0;n<lines.length;n++) {
      logger.set_line_number(n);
      if (!parseLine(lines[n],n)) {
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
      handler = handlers[pass];
      if (!compileText(programText)) {
        success = false;
      }
      if (!handler.finalize()) {
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
