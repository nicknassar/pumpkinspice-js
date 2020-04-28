function BaseTester(display) {
  var successCount = 0;
  var errorCount = 0;

  // Failures for the CURRENT test
  var failures = [];
  var setup = function (){};
  var tests;

  function init(setupParam, testsParam) {
    setup = setupParam;
    tests = testsParam;
  }

  function getSuccessCount() {
    return successCount;
  }

  function getErrorCount() {
    return errorCount;
  }

  function assert(test, message) {
    if (test !== true)
      failures.push(message);
  }

  function printFailure(description, failures) {
    display.setColor(4);
    display.print("TestManager failed test \"");
    display.setColor(12);
    display.print(description);
    display.setColor(4);
    display.print("\":\n");

    for (var i=0;i<failures.length;i++) {
      display.setColor(7);
      display.print("Assertion \"");
      display.setColor(15);
      display.print(failures[i]);
      display.setColor(7);
      display.print("\" failed\n");
    }
    display.print("\n");
  }

  function check(test) {
    failures = [];

    test.run();
    if (failures.length > 0) {
      printFailure(test.description, failures);
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
    init: init,
    assert: assert,
    run:run,
    getSuccessCount:getSuccessCount,
    getErrorCount:getErrorCount
  };
}
