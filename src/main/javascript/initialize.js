// Sample initialization code
(function(){
  // get the text of the first pumpkinspice script
  function getProgramText() {
    var scripts = document.getElementsByTagName('script');
    for (var i=0;i<scripts.length;i++) {
      for (var j=0;j<scripts[i].attributes.length;j++) {
        if (scripts[i].attributes[j].name==='type' &&
            scripts[i].attributes[j].value==='text/pumpkinspice') {
          return scripts[i].text;
        }
      }
    }
  }
  
  function main() {
    initPumpkinSpice(
      getProgramText(),
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
