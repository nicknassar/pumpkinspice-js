function BaseTester(display, setup, tests) {
  var successCount = 0;
  var errorCount = 0;
  var lastCompletedTest = -1;
  var onComplete;

  // Failures for the CURRENT test
  var description = "";
  var failures = [];
  function getSuccessCount() {
    return successCount;
  }

  function getErrorCount() {
    return errorCount;
  }

  function assert(test, message) {
    if (test !== true) {
      if (failures.length === 0)
        printFailureHeader();
      printFailure(message);
      failures.push(message);
    }

  }

  function printFailureHeader() {
    display.setColor(4);
    display.print("\"");
    display.setColor(12);
    display.print(description);
    display.setColor(4);
    display.print("\" failed:\n");
  }

  function printFailure(failure) {
    display.setColor(7);
    display.print("Assertion \"");
    display.setColor(15);
    display.print(failure);
    display.setColor(7);
    display.print("\" failed\n");
  }

  function testComplete(i) {
    if (failures.length > 0) {
      errorCount++;
    } else {
      successCount++;
    }
    lastCompletedTest = i;
  }

  function check(i) {
    var test = tests[i];
    failures = [];

    description = test.description;
    test.run(function() {
      testComplete(i);
    }
    );
  }

  function restartFrom(n) {
    if (lastCompletedTest != n) {
      window.setTimeout(
	(function() {
	  restartFrom(n);
	}),0);
    } else {
      go(n+1);
    }
  }

  function go(start) {
    for (var n=start;n<tests.length;n++) {
      setup();
      check(n);
      if (lastCompletedTest != n) {
	window.setTimeout(
	  (function() {
	    restartFrom(n);
	  }),0);
	return;
      }
    }
    display.sendUpdates();
    onComplete();
  }
  
  function run(onCompleteFunc) {
    onComplete = onCompleteFunc;
    go(0);
  }

  return {
    assert: assert,
    run:run,
    getSuccessCount:getSuccessCount,
    getErrorCount:getErrorCount
  };
}
