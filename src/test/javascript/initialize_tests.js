(function(){
  function main() {
    runPumpkinSpiceTests(
      document.getElementById("inpad"),
      document.getElementById("return"),
      document.getElementById("inpadform"),
      document.getElementById("cursor"),
      document.getElementById("quiet"),
      document.getElementById("history"),
      document.getElementById("latest"),
      document.getElementById("display")
    );
  }

  // If we're ready, run the main function
  // If we're not ready, queue it up to run when we are
  if (document.readyState == "complete") {
    main();
  } else {
    window.addEventListener("load",main);
  }
})();
