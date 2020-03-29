function Machine(display, audio, logger) {

  // BEGIN Initialize integration between components

  // Maybe this should happen on init?
  audio.setOnAudioComplete(onAudioComplete);

  // This runs on form submit or when an menu option is clicked,
  // grabbing and processing the text in the inputTextElement
  display.setInputHandler(function(e) {
    audio.go();
    if (isWaitingForInput()) {
      acceptInput(display.getInputValue());
    }
    if (e)
      e.preventDefault();

    // Scroll to the input
    display.scroll();
  });

  // END Initialize integration between components


  /*
    There's a lot of weird stuff here to avoid creating an
    intermediate form for instructions.

    The machine provides an API for the compiler to
    create code. It can also execute that code.

    "Instructions" are just functions and the code is a list of
    those functions. Instruction functions can manipulate the
    machine (setting interrupts, advancing the instruction pointer,
    setting and reading variables, etc.) and the display.

    Subroutines and functions are stored in separate lists
    rather than being in the same "memory segment" as the main
    code.

    This allows them to be anywhere in the source file without
    having to store them in an intermediate format or perform a
    second pass to fill in the location of the subroutines later.
  */

  // List of stack frames containing:
  // The name of the sub, the location in that sub, and the local vars
  var callstack=[{sub:"!",loc:0,vars:{}}];

  // return value of last function called
  var returnValue;

  // hash of function names to list of functions
  var code;

  // hash of global variables by name
  var vars;

  // Set to non-null to interrupt
  // non-zero values are a timeout
  var interruptDelay = null;

  // name of variable to input into
  var inputVariable = null;
  var waitFlags = 0;

  function onAudioComplete() {
    // If we're waiting for the music and it's done, it's time to go
    if (waitFlags & 1) { /** @suppress {uselessCode} */
      // clear all the wait flags
      waitFlags = 0;
      go();
    }
  }
  function isWaitingForInput() {
      return !!inputVariable;
  }
  function acceptInput(value) {
    display.print(value);
    vars[inputVariable] = value;
    inputVariable = null;
    window.setTimeout(go,0);
    display.print("\n");
    display.clearMenu();
  }

// The main loop
function go() {
  // XXX Trap division by 0, Array Out of Bounds when we have arrays

  // Handle any function returns (signaled by falling off the end of the code)
  while (callstack.length>0 &&
         (code[callstack[callstack.length-1].sub]===undefined ||
          callstack[callstack.length-1].loc >= code[callstack[callstack.length-1].sub].length)) {
    returnValue = callstack.pop().ret;
  }

  while(callstack.length>0 && callstack.length<=16 && interruptDelay === null) {
    // Actually run the code functions
    code[callstack[callstack.length-1].sub][callstack[callstack.length-1].loc]();

    // Code Repeated above
    while (callstack.length>0 &&
           (code[callstack[callstack.length-1].sub]===undefined ||
            callstack[callstack.length-1].loc >= code[callstack[callstack.length-1].sub].length)) {
      returnValue = callstack.pop().ret;
    }
    // console.log("i: "+this.i+" N:"+vars['N']+' X:'+vars['X']+' Q:'+vars['Q']);
  }
  if (interruptDelay !== null) {
    if (inputVariable !== null) {
      display.sendUpdates();
      // this.inputMode();
    } else if (waitFlags !== 0) {
      display.sendQuietBlockElementUpdates();
      // flag 1 is wait for music

    } else if (interruptDelay === 0) {
      window.setTimeout(go,0);
      display.sendQuietBlockElementUpdates();
    } else {
      window.setTimeout(go,interruptDelay);
      display.sendQuietBlockElementUpdates();
    }
    interruptDelay = null;
  } else if (callstack.length>0) {
    logger.error("STACK OVERFLOW\nARE YOU TRYING SOME COMPUTER SCIENCE OR SOMETHING?\n");
    display.sendUpdates();
  }

  // The program ended
  if (callstack.length == 0 && display.hasPendingUpdates())
    display.sendUpdates();
}

  // XXX Error handling?
   return {
    // Data functions
    getGlobal: function(varname) {
       return vars[varname];
    },
    setGlobal: function(varname, value) {
       vars[varname] = value;
    },
    incGlobal: function(varname) {
      vars[varname]++;
    },
    getLocal: function(varname) {
      return callstack[callstack.length-1].vars[varname];
    },
    setLocal: function(varname, value) {
      return callstack[callstack.length-1].vars[varname] = value;
    },
    saveRetToLocal: function(name) {
      callstack[callstack.length-1].vars[name]=returnValue;
    },
    returnFromSub: function(returnExp) {
      callstack[callstack.length-1].ret = returnExp();
      callstack[callstack.length-1].loc = code[callstack[callstack.length-1].sub].length;
    },

    setInterruptDelay: function(delay) {
       interruptDelay = delay;
    },
    setInputVariable: function(varname) {
      inputVariable = varname;
    },
    setAudioWaitFlag: function() {
      waitFlags = (waitFlags | 1);
    },

    // Execution control functions
    advance: function () {
      callstack[callstack.length-1].loc++;
    },
    retreat: function () {
      callstack[callstack.length-1].loc--;
    },
    setLoc: function (loc) {
      callstack[callstack.length-1].loc=loc;
    },
    callSub: function(sub,vars,ret) {
      callstack[callstack.length-1].loc++;
      callstack.push({sub:sub,loc:0,vars:vars,ret:ret});
    },
    random: function(l,h) {
      return Math.floor(Math.floor(l)+Math.random()*(1+Math.floor(h)-Math.floor(l)));
    },
    play: function(notes) {
      audio.play(notes);
    },
    init: function(code_param, vars_param) {
      code = code_param;
      vars = vars_param; // Variables

      // register for return values
      // returnValue = undefined;

      // Uncomment to prevent the machine from be re-init. If we want
      // to allow re-init, we need to add code to clear everything and
      // avoid re-adding listeners, etc.

      // this.init = undefined;
    },
     go: function() {
       // There was something output. Display it now
      // in case it was an error and go() is going to crash
      if (display.hasPendingUpdates())
	display.sendUpdates();

       go();
     }
   };
}
