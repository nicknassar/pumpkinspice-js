/***********************************************************************
  BEGIN Code Gen pass expression handler
***********************************************************************/
    function ExpressionHandler(){
      // generate expressions
      // Returns an EXPRESSION token or null
      // XXX Handle errors
      // XXX Fail if types are incorrect in every case

      // expression types
      var BOOLEXPRESSION={};
      var EXPRESSION={};

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
