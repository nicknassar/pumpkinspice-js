function BaseTester(display, setup, tests) {
  var successCount = 0;
  var errorCount = 0;
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
    if (tests.length > i+1) {
      setup();
      check(i+1);
    } else {
      display.sendUpdates();
      onComplete();
    }
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

  function run(onCompleteFunc) {
    onComplete = onCompleteFunc;
    if (tests.length > 0) {
      setup();
      check(0);
    } else {
      display.sendUpdates();
      onComplete();
    }
  }

  return {
    assert: assert,
    run:run,
    getSuccessCount:getSuccessCount,
    getErrorCount:getErrorCount
  };
}
