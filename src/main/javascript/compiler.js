// XXX Pass error handler into the compile() function?
function Compiler(codegen,logger){
    var started = false;
    var finished = false;
    var pass = null;
    return {
    started: false,
    finished: false,
    tokenizeLine:function(line) {
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
                logger.error("Parser Error: Unterminated string\n");
                return null;
              }
              s+="\"";
            } else {
              s += line[pos];
              pos++;
            }
          }
          if (line[pos] !== '"') {
            logger.error("Parser Error: Unterminated string\n");
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
          return null;
        }
      }
      return tokens;
    },

    parseExpressionWithHandler: function(tokens,handler) {
      function subExpression(tokens,type) {
        var exp = compiler.parseExpressionWithHandler(tokens,handler);
        return handler.validateSubExpression(exp,type);
      };
      if (tokens.length === 0) {
        return null;
      } else if (tokens.length === 1) {
        if (tokens[0].type===NUMERIC){
          return handler.numericLiteral(tokens[0].value);
        } else if (tokens[0].type===STRING){
          // silently truncate long strings
          if (tokens[0].value.length>255)
            tokens[0].value=tokens[0].value.slice(0,255);
          return handler.stringLiteral(tokens[0].value);
        } else if (tokens[0].type===IDENTIFIER) {
          if (tokens[0].value==='PI') {
            return handler.piBuiltin();
          } else {
            return handler.variable(tokens[0].value);
          }
        } else if (tokens[0].type===EXPRESSION) {
          return handler.expression(tokens[0].value,tokens[0].resultType,tokens[0].subs);
        } else {
          // Something doesn't make sense
          return null;
        }
        // Predefined functions
        // XXX add isPredefinedFunction() instead of listing them all
      } else if (tokens.length >= 3 && tokens[0].type===IDENTIFIER &&
                 tokens[1].type===OPENPAREN && (['ABS','CINT','FIX','INT','LEFT$','LEN','RIGHT$','STR$','VAL','RANDOM'].indexOf(tokens[0].value)!=-1)) {
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
        if (depth >= tokens.length) {
          return null;
        }
        var paramTypes;
        var paramExp;
        if (['LEFT$','RIGHT$','RANDOM'].indexOf(tokens[0].value)!=-1) {
          // 2 params
          if (tokens[0].value === 'RANDOM')
            paramTypes = [NUMERIC,NUMERIC];
          else
            paramTypes = [STRING,NUMERIC];
          var j;
          var parenCount = 0;
          for (j=1;j<i && tokens[j].type !== COMMA || parenCount !== 1;j++) {if (tokens[j].type===OPENPAREN) parenCount++;if (tokens[j].type===CLOSEPAREN) parenCount--;}
          paramExp = [subExpression(tokens.slice(2,j),paramTypes[0]),
                      subExpression(tokens.slice(j+1,i-1),paramTypes[1])];
        } else {
          // Single param
          paramTypes = (['LEN','VAL'].indexOf(tokens[0].value)!=-1)?[STRING]:[NUMERIC];
          paramExp = [subExpression(tokens.slice(2,i-1),paramTypes[0])];
        }
        for (var p=0;p<paramExp.length;p++) {
          if (paramExp[p]===null) {
            return null;
          }
        }
        // XXX Consider adding MID$()
        // MID$(x$,n[,m]) To return a string of m characters from x$ beginning with the nth character. n >= 1 - MID$(x$,1,n) is LEFT$(x$,n)

        var head;
        if (tokens[0].value === 'ABS') {
          head = handler.absBuiltin(paramExp[0]);
        } else if (tokens[0].value === 'CINT') {
          head = handler.cintBuiltin(paramExp[0]);
        } else if (tokens[0].value === 'FIX') {
          head = handler.fixBuiltin(paramExp[0]);
        } else if (tokens[0].value === 'INT') {
          head = handler.intBuiltin(paramExp[0]);
        } else if (tokens[0].value === 'LEN') {
          head = handler.lenBuiltin(paramExp[0]);
        } else if (tokens[0].value === 'STR$') {
          head = handler.strzBuiltin(paramExp[0]);
        } else if (tokens[0].value === 'VAL') {
          head = handler.valBuiltin(paramExp[0]);
        } else if (tokens[0].value === 'LEFT$') {
          head = handler.leftzBuiltin(paramExp[0],paramExp[1]);
        } else if (tokens[0].value === 'RIGHT$') {
          head = handler.rightzBuiltin(paramExp[0],paramExp[1]);
        } else if (tokens[0].value === 'RANDOM') {
          head = handler.randomBuiltin(paramExp[0],paramExp[1]);
        }
        
        // There is nothing following this function
        if (i == tokens.length) {
          return head;
          // There is a binary operator following this function
        } else if (tokens[i].type === PLUS ||tokens[i].type === MINUS ||
                   tokens[i].type === TIMES || tokens[i].type === DIV) {
          var tail = compiler.parseExpressionWithHandler(tokens.slice(i+1),handler);
          if (tail === null) {
            return null;
          }
          return handler.binaryExpression(tokens[i].type,head,tail);      
        } else {
          // Invalid expression
          return null;
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
          var type = codegen.argType(tokens[1].value,argExps.length);
          argExps.push(subExpression(tokens.slice(start,pos),type));
          pos++; // skip the comma
          start = pos;
        }
        return handler.callSubroutine(tokens[1].value,argExps);

      } else if (tokens.length >= 2 && tokens[0].type===PLUS && tokens[1].type===NUMERIC) {
        // A numeric expression starting with plus
        return subExpression(tokens.slice(1,tokens.length),NUMERIC);
      } else if (tokens.length >= 2 && tokens[0].type===MINUS && tokens[1].type===NUMERIC) {
        // A numeric expression starting with minus
        return subExpression([{type:NUMERIC,value:("-"+tokens[1].value)}].concat(tokens.slice(2,tokens.length)),NUMERIC);
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
          return null;
        }
        var result = handler.parenExpression(compiler.parseExpressionWithHandler(tokens.slice(1,pos-1),handler));
        // we're done - the whole thing was in parens
        // or what's in the parens is bad
        if (pos==tokens.length || result === null)
          return result;
        
        // There's a binary operator after this
        if (tokens[pos].type === MINUS ||
            tokens[pos].type === TIMES || tokens[pos].type === DIV) {
          var tail = subExpression(tokens.slice(pos+1,tokens.length),NUMERIC);
          if (tail === null)
            return null;
          else
            return handler.binaryExpression(tokens[pos].type,result,tail);
        } else if (tokens[pos].type === PLUS) {
          var tail = compiler.parseExpressionWithHandler(tokens.slice(pos+1,tokens.length),handler);
          if (tail===null)
            return null;
          return handler.binaryExpression(tokens[pos].type,
                                          result,
                                          tail);
        } else {
          return null;
        }

        // This is a + expression starting with an identifier
      } else if (tokens[1].type === PLUS || tokens[1].type === MINUS ||
                 tokens[1].type === TIMES || tokens[1].type === DIV) {
        if (tokens[1].type === PLUS) {
          var head = compiler.parseExpressionWithHandler([tokens[0]],handler);
          if (head===null)
            return null;
          var tail = compiler.parseExpressionWithHandler(tokens.slice(2,tokens.length),handler);
          if (tail===null)
            return null;
          return handler.binaryExpression(tokens[1].type,
                                          head,
                                          tail);
        } else {
          var head = subExpression([tokens[0]],NUMERIC);
          if (head===null)
            return null;
          var tail = subExpression(tokens.slice(2,tokens.length),NUMERIC);
          if (tail===null)
            return null;
          return handler.binaryExpression(tokens[1].type,head,tail);
          
        }
      } else {
        // Something unrecognized
        return null;
      }      
    },
    parseLine: function(line,num) {
      var tokens = compiler.tokenizeLine(line);
      if (!tokens) {
        logger.error("Could not parse line "+num);
        return false;
      }
      if (pass === 1) {
        return compiler.parseLineWithHandler(codegen.typeGeneratorPass,tokens,num);
      } else if (pass === 2) {
        return compiler.parseLineWithHandler(codegen.codeGeneratorPass,tokens,num);
      } else {
        // XXX die gracefully
        throw "parse failed";
      }
    },
    parseLineWithHandler: function(handler,tokens,num) {
      function expression(tokens) {
        return compiler.parseExpressionWithHandler(tokens,handler.expressionHandler);
      };
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
              var exp1 = handler.boolParenExpression(result);
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
            logger.error("No comparison operator on line "+num+"\n");
            return null;
          }
          endpos = pos+1;
          while (endpos<tokens.length && !(tokens[endpos].type === IDENTIFIER &&
                                           (tokens[endpos].value === "AND" || tokens[endpos].value === "OR")))
          {
              endpos++;
          }
          var exp1=expression(tokens.slice(0,pos));
          var exp2=expression(tokens.slice(pos+1,endpos));
          if (!exp1 || !exp2)
            return null;
          exp1 =  handler.boolBinaryExpression(exp1,tokens[pos],exp2);
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

        var result = _boolExpression(tokens, handler.expressionHandler);
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
              return handler.printString("",newline,pause,num);
            } else if (tokens.length === 1 && tokens.type === STRING)
              return handler.printString(tokens[0].value,newline,pause,num);
            else
              return handler.printExp(expression(tokens),newline,pause,num);
          } else if (tokens[0].value==='REM') {
            return handler.comment(tokens.slice(1,tokens.length));
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
              logger.error("Invalid IF on line "+num+"\n");
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
            return handler.beginSubroutine(tokens[1].value,args,num);
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

              argExps.push(expression(tokens.slice(start,pos)));
              pos++; // skip the comma
              start = pos;
            }
            return handler.callSubroutine(tokens[1].value,argExps,num);

          } else if (tokens[0].value==='END' && tokens.length == 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'SUBROUTINE') {
            return handler.endSubroutine(num);

          } else if (tokens[0].value==='RETURN' && tokens.length >= 2) {
            return handler.returnStatement(expression(tokens.slice(1,tokens.length)),num);

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
            return handler.beginAsk(expression(tokens.slice(1,tokens.length)),num);

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
            return handler.beginMenu(expression(tokens.slice(2,tokens.length)),num);
            
          } else if (tokens[0].value==='MENU' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'COLOR' && tokens[2].type===NUMERIC) {
            return handler.menuColor(tokens[2].value,num);

          } else if (tokens[0].value==='MENU' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'BGCOLOR' && tokens[2].type===NUMERIC) {
            return handler.menuBGColor(tokens[2].value,num);

          } else if (tokens[0].value==='MENU' && tokens.length === 4 && tokens[1].type === IDENTIFIER && tokens[1].value === 'CHOICE' && tokens[2].type === IDENTIFIER && tokens[2].value === 'COLOR' && tokens[3].type===NUMERIC) {
            return handler.menuChoiceColor(tokens[3].value,num);
          } else if (tokens[0].value==='HIDE' && tokens.length >= 5 && tokens[1].type === IDENTIFIER && tokens[1].value === 'IF' ) {
            var boolExp = boolExpression(tokens.slice(2,tokens.length));
            if (!boolExp) {
              logger.error("Invalid HIDE IF on line "+num+"\n");
              return false;
            }
            return handler.menuHideIf(boolExp, num);

          } else if (tokens[0].value==='MENU' && tokens.length === 4 && tokens[1].type === IDENTIFIER && tokens[1].value === 'PROMPT' && tokens[2].type === IDENTIFIER && tokens[2].value === 'COLOR' && tokens[3].type===NUMERIC) {
            return handler.menuPromptColor(tokens[3].value,num);            

          } else if (tokens[0].value==='END' && tokens.length == 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'MENU') {
            return handler.endMenu(num);

          } else if (tokens[0].value==='CHOICE' && tokens.length > 2 && tokens[1].type === IDENTIFIER) {
            return handler.menuChoice(tokens[1].value,expression(tokens.slice(2,tokens.length)),num);
          } else if (tokens[0].value==='CHOICE' && tokens.length > 2 && tokens[1].type === NUMERIC) {
            return handler.menuChoice((tokens[1].value).toString(10),expression(tokens.slice(2,tokens.length)),num);
            
          } else if (tokens[0].value==='WHILE') {
            var exp2end;
            if (tokens[tokens.length-1].type===IDENTIFIER &&
                tokens[tokens.length-1].value==='DO')
              exp2end = tokens.length-1;
            else
              exp2end = tokens.length;
            var boolExp = boolExpression(tokens.slice(1,exp2end));
            if (!boolExp) {
              logger.error("Invalid WHILE on line "+num+"\n");
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
            return handler.color(expression(tokens.slice(1,tokens.length)),num);

          } else if (tokens[0].value==='BGCOLOR') {
            return handler.bgColor(expression(tokens.slice(1,tokens.length)),num);

          } else if (tokens[0].value==='SLEEP') {
            return handler.sleep(expression(tokens.slice(1,tokens.length)),num);
          } else if (tokens[0].value==='INPUT') {
            if (tokens.length !== 2 || tokens[1].type !== IDENTIFIER) {
              logger.error("Invalid INPUT on line "+num+"\n");
              return false;
            } else {
              return handler.input(tokens[1].value,num);
            }
          } else if (tokens[0].value==='PLAY') {
            return handler.play(expression(tokens.slice(1,tokens.length)),num);
          } else if (tokens[0].value==='FOR') {
            if(!(tokens.length>=6 && tokens[2].type === EQUALS && tokens[2].value === '=' && tokens[1].type === IDENTIFIER)) {
              logger.error("Invalid FOR on line "+num+"\n");
              return false;
            }
            
            var pos  = 3;
            while (pos < tokens.length &&
                   !(tokens[pos].type === IDENTIFIER &&
                     tokens[pos].value === 'TO')) {
              pos++;
            }
            if (pos === tokens.length) {
              logger.error("Missing TO in FOR on line "+num+"\n");
              return false;
            }
            return handler.forStatement(tokens[1].value, expression(tokens.slice(3,pos)),
                                        expression(tokens.slice(pos+1,tokens.length)),num);

          } else if (tokens.length>=3 && tokens[1].type===EQUALS &&
                     tokens[1].value==='=') {
            return handler.letStatement(tokens[0].value,
                                        expression(tokens.slice(2,tokens.length)),num);
          } else {
            logger.error("Unrecognized "+tokens[0].value+" on line "+num+"\n");
            return false;
          }
        } else if (tokens[0].type===SINGLEQUOTE) {
          return handler.comment(tokens.slice(1,tokens.length),num);
        } else if (tokens.length>=3 && tokens[0].type === MINUS && tokens[1].type === MINUS && tokens[2].type === GREATER) {
          finished = true;
        } else {
          logger.error("Unexpected token on line "+num+": "+tokens[0].value+"\n");
          return false;
        }
      }
      return true;

    },
    compileText: function(text) {
      var lines = text.split("\r\n");
      if (lines.length===1)
        lines = text.split("\n");
      if (lines.length===1)
        lines = text.split("\r");
      for (var n=0;n<lines.length;n++) {
        if (!compiler.parseLine(lines[n],n)) {
          logger.error("ERROR ON LINE "+(n)+"\n");
          return false;
        }
      }
      return true;
    },
    compile: function(programText) {
      codegen.init();
      for (pass = 1;pass <= 2;pass++) {
        started = false;
        finished = false;
	if (!compiler.compileText(programText)) {
          // XXX Reset things here?
          return false;
	}
      }
      if (codegen.validate()) {
        codegen.generate();
        return true;
      } else {
        return false;
      }
    }
  };
}
