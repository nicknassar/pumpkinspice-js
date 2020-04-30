function BaseTester(display, setup, tests) {
  var successCount = 0;
  var errorCount = 0;

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

  function check(test) {
    failures = [];

    description = test.description;
    test.run();
    if (failures.length > 0) {
      errorCount++;
    } else {
      successCount++;
    }
  }

  function run() {
    for (var i=0;i<tests.length;i++) {
      setup();
      check(tests[i]);
    }
    display.sendUpdates();
  }

  return {
    assert: assert,
    run:run,
    getSuccessCount:getSuccessCount,
    getErrorCount:getErrorCount
  };
}
