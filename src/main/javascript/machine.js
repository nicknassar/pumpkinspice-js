function Machine(display, logger) {
  // XXX Error handling?
   return {
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
    // Execution control functions
    advance: function () {
      this._callstack[this._callstack.length-1].loc++;
    },
    retreat: function () {
      this._callstack[this._callstack.length-1].loc--;
    },
    setLoc: function (loc) {
      this._callstack[this._callstack.length-1].loc=loc;
    },
    callSub: function(sub,vars,ret) {
      this._callstack[this._callstack.length-1].loc++;
      this._callstack.push({sub:sub,loc:0,vars:vars,ret:ret});
    },
    random: function(l,h) {
      return Math.floor(Math.floor(l)+Math.random()*(1+Math.floor(h)-Math.floor(l)));
    },
    init: function(code,vars) {
      this._code = code;
      this._vars = vars; // Variables

      this._callstack=[{sub:"!",loc:0,vars:{}}];  // "!" is the main code
      this._interruptDelay = null;
      this._inputVariable = null;
      this._waitFlags = 0;

      // register for return values	
      // this._ret = undefined;
	
      // Don't allow machine to be re-init If we want to allow
      // re-init, we need to add code to clear everything and avoid
      // re-adding listeners, etc.
      this.init = undefined;
    },
    isWaitingForInput: function() {
      return !!this._inputVariable;
    },
    acceptInput: function(value) {
      display.print(value);
      this._vars[this._inputVariable] = value;
      this._inputVariable = null;
      var me = this;
      window.setTimeout(function(){me._go();},0);
      display.print("\n");
      display.clearMenu();
    },
    getOnAudioComplete: function() {
      var me=this;
      return function () {
	// If we're waiting for the music and it's done, it's time to go
	if (me._waitFlags & 1) { /** @suppress {uselessCode} */
	  // clear all the wait flags
	  me._waitFlags = 0;
	  me._go();
	}
      };
    },
     go: function() {
       // There was something output. Display it now
      // in case it was an error and go() is going to crash
      if (display.hasPendingUpdates())
	display.sendUpdates();

       this._go();
     },
    _go: function() {
      // XXX Trap division by 0, Array Out of Bounds when we have arrays

      // Handle any function returns (signaled by falling off the end of the code)
      while (this._callstack.length>0 &&
             (this._code[this._callstack[this._callstack.length-1].sub]===undefined ||
              this._callstack[this._callstack.length-1].loc >= this._code[this._callstack[this._callstack.length-1].sub].length)) {
          this._ret = this._callstack.pop().ret;
        }

      while(this._callstack.length>0 && this._callstack.length<=16 && this._interruptDelay === null) {
	// Actually run the code functions
        this._code[this._callstack[this._callstack.length-1].sub][this._callstack[this._callstack.length-1].loc]();

        // Code Repeated above
        while (this._callstack.length>0 &&
               (this._code[this._callstack[this._callstack.length-1].sub]===undefined ||
                this._callstack[this._callstack.length-1].loc >= this._code[this._callstack[this._callstack.length-1].sub].length)) {
          this._ret = this._callstack.pop().ret;
        }
        // console.log("i: "+this.i+" N:"+this._vars['N']+' X:'+this._vars['X']+' Q:'+this._vars['Q']);
      }
      if (this._interruptDelay !== null) {
        if (this._inputVariable !== null) {
          display.sendUpdates();
          // this.inputMode();
        } else if (this._waitFlags !== 0) {
	  display.sendQuietBlockElementUpdates();
	  // flag 1 is wait for music
	  
	} else if (this._interruptDelay === 0) {
          var me = this;
          window.setTimeout(function() {me._go();},0);
          display.sendQuietBlockElementUpdates();
        } else {
          var me = this;
          window.setTimeout(function() {me._go();},this._interruptDelay);
                display.sendQuietBlockElementUpdates();
        }
        this._interruptDelay = null;
      } else if (this._callstack.length>0) {
        logger.error("STACK OVERFLOW\nARE YOU TRYING SOME COMPUTER SCIENCE OR SOMETHING?\n");
        display.sendUpdates();
      }

      // The program ended
      if (this._callstack.length == 0 && display.hasPendingUpdates())
        display.sendUpdates();

    }
  };
}
