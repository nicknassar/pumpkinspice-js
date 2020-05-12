function MatchingTester(display, setup, expectations, expectationToTestFunc, expectationText, getCallLog, getErrorLog) {
  var tests = testsFromExpectations();
  var tester = BaseTester(display, setup, tests);

  function testsFromExpectations() {
    var tests = [];
    for (var i=0;i<expectations.length;i++) {
      tests.push({
        description: expectations[i].description,
        run: (function(expectation) {
          var test = expectationToTestFunc(expectation);
          return function(onComplete) {
            test(function() {
              checkResults(expectation, getCallLog(), getErrorLog());
              onComplete();
            });
          };
        })(expectations[i])
      });
    }
    return tests;
  }


  function compareNestedLists(listA, listB) {
    if (listA.length !== listB.length)
      return false;
    for (var i=0;i<listA.length;i++) {
      if (listA[i].length !== listB[i].length)
        return false;
      for (var j=0;j<listA[i].length;j++) {
        // Handle list parameters - for subroutine args, etc.
        if (listA[i][j] && listA[i][j].push !== undefined) {
          if (!listB[i][j] || listB[i][j].length !== listA[i][j].length)
            return false;
          for (var k=0;k<listA[i][j].length;k++) {
            if (listA[i][j][k] !== listB[i][j][k])
              return false;
          }
        } else if (listA[i][j] !== listB[i][j])
          return false;
      }
    }
    return true;
  }


  // Exact error messages aren't matched
  // We want to know that an error on the same line is reported
  function compareErrorLists(listA, listB) {
    if (listA.length !== listB.length)
      return false;
    // First line is line number of error
    for (var i=0;i<listA.length;i++) {
      if (listA[i][0] !== listB[i][0])
        return false;
    }
    return true;
  }

  function stringifyExpectedItem(item) {
    var elements = [];
    for (var i = 0;i<item.length;i++) {
      var element = item[i];
      if (element === null) {
        elements.push("null");
      } else if (element === undefined) {
        elements.push("undefined");
      } else if (element.length !== undefined) { // string or array
        if (element.push !== undefined) { // array
          elements.push("["+stringifyExpectedItem(element)+"]");
        } else { // string
          elements.push("\""+element.replace("\"","\\\"")+"\"");
        }
      } else {
        elements.push(element);
      }
    }
    return elements.join(", ");
  }

  function stringifyExpectedList(expected) {
    var lines = [];
    for (var i=0;i<expected.length;i++) {
      lines.push(stringifyExpectedItem(expected[i]));
    }
    return lines.join("\n");
  }

  function printResultMismatch(expectation, handlerLog) {
    display.setColor(4);
    display.print("Parser gave unexpected results for test "+expectation.description+":\n");
    display.setColor(7);
    display.print(expectationText(expectation)+"\n\n");
    display.setColor(15);
    display.print("expected:\n")
    display.setColor(7);
    display.print(stringifyExpectedList(expectation.calls)+"\n");
    display.setColor(15);
    display.print("got:\n")
    display.setColor(7);
    display.print(stringifyExpectedList(handlerLog)+"\n\n");
  }

  function printErrorMismatch(expectation, errorLog) {
    display.setColor(4);
    display.print("Parser gave unexpected errors for test "+expectation.description+":\n");
    display.setColor(7);
    display.print(expectationText(expectation)+"\n");
    display.setColor(15);
    display.print("expected:\n")
    display.setColor(7);
    display.print(stringifyExpectedList(expectation.errors)+"\n");
    display.setColor(15);
    display.print("got:\n")
    display.setColor(7);
    display.print(stringifyExpectedList(errorLog)+"\n\n");
  }

  function checkResults(expectation, handlerLog, errorLog) {
    var result = compareNestedLists(expectation.calls, handlerLog);
    tester.assert(result, "result matches expectations");
    if (!result) {
      printResultMismatch(expectation, handlerLog);
    }
    var errors = compareErrorLists(expectation.errors, errorLog);
    tester.assert(errors, "error result matches expectations");
    if (!errors) {
      printErrorMismatch(expectation, errorLog);
    }
  }

  return {
    assert: tester.assert,
    run:tester.run,
    getSuccessCount:tester.getSuccessCount,
    getErrorCount:tester.getErrorCount
  };
}
