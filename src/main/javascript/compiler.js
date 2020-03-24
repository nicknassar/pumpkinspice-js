//   Pumpkin Spice - A simplistic language for interactive text applications
//   Copyright © 2020 Nicholas Nassar
//   All Rights Reserved

// The code is wrapped inside a function to protect namespaces
// programText - string with the program to run
// inputTextElement - The input text area
// inputSubmitElement - The input form submit button
// inputFormElement - the form associated with the inppad
// cursorElement - that which must be blinked
// quietBlockElement - text which is displayed but not to be read by a screen reader
// historyBlockElement - text which has already been displayed
// latestBlockElement - text which should be read by a screen reader
// displayBlockElement - scrollable area where text is displayed

function initPumpkinSpice(programText, inputTextElement, inputSubmitElement, inputFormElement, cursorElement, quietBlockElement, historyBlockElement, latestBlockElement, displayBlockElement){
/***********************************************************************
  BEGIN LEGACY COMPATIBILITY
***********************************************************************/

  // This code strives to be compatible with just about every browser
  // except for older versions of Internet Explorer.

  // It should run on ancient browsers with smaller footprints than
  // modern browsers, especially old WebKit and Gecko based browsers,
  // so it has a chance of running on very small machines.
  
  // If it all possible, compatibility should be acheived by using the APIs
  // in a compatible way, rather than polyfills.

  // Legacy Math.trunc for IE 11
  if (!Math.trunc) {
    Math.trunc = function(v) {
      v = +v;
      return (v - v % 1)   ||   (!isFinite(v) || v === 0 ? v : v < 0 ? -0 : 0);
    };
  }

/***********************************************************************
  END LEGACY COMPATIBILITY
***********************************************************************/

/***********************************************************************
  BEGIN Global Variables
***********************************************************************/

  // Unique identifiers for various things
  // Some are token types, some are variable types, some are for loop types
  // Some are used interchangably for more than one type (For example, string
  // expressions and string tokens both use STRING)
  var IDENTIFIER={}; //
  var STRING={};
  var NUMERIC={};
  var EQUALS={};
  var COLON={};
  var SEMICOLON={};
  var PLUS={};
  var SINGLEQUOTE={};
  var MINUS={};
  var TIMES={};
  var DIV={};
  var OPENPAREN={};
  var CLOSEPAREN={};
  var COMMA={};
  var GREATEROREQUAL={};
  var GREATER={};
  var LESSOREQUAL={};
  var NOTEQUAL={};
  var LESS={};
  var NOT={};
  var EXPRESSION={};
  var FOR={};
  var IF={};
  var RANDOM={};
  var MENU={};
  var ASK={};
  var WHILE={};
  var SUBROUTINE={};
  var BOOLEXPRESSION={};

/***********************************************************************
  END Global Variables
***********************************************************************/

/***********************************************************************
  BEGIN Global Functions
***********************************************************************/

  // Optimize these calls by wrapping them in a function
  //
  // Maybe all API calls should be wrapped this way?
  function addEventListener(obj,on,fn) {
    obj.addEventListener(on,fn);
  }
  function removeEventListener(obj,on,fn) {
    obj.removeEventListener(on,fn);
  }

  // Utility function to convert a color number to an RGB triplet
  function intToColor(c) {
    if (c == 0) { // Black
      return [0,0,0];
    } else if (c == 1) { // Blue
      return [0,0,170];
    } else if (c == 2) { // Green
      return [0,170,0]; 
    } else if (c == 3) { // Cyan
      return [0,170,170]; 
    } else if (c == 4) { // Red
      return [170,0,0];
    } else if (c == 5) { // Magenta
      return [170,0,170];
    } else if (c == 6) { // Brown
      return [170,85,0];
    } else if (c == 7) { // White
      return [170,170,170];
    } else if (c == 8) { // Gray
      return [85,85,85];
    } else if (c == 9) { // Light Blue
      return [85, 85, 255];
    } else if (c == 10) { // Light Green
      return [85, 255, 85]; 
    } else if (c == 11) { // Light Cyan
      return [85, 255, 255];  
    } else if (c == 12) { // Light Red
      return [255, 85, 85];
    } else if (c == 13) { // Light Magenta
      return [255, 85, 255];
    } else if (c == 14) { // Yellow
      return [255, 255, 85];
    } else if (c == 15) { // Optic White
      return [255, 255, 255];
    } else {
      // Invalid color

      // Any function calling intToColor should check for null return values
      return null;
    }
  };  

  // This is outside of any class because it's exposed to HTML
  //
  // This runs on form submit or when an menu option is clicked,
  // grabbing and processing the text in the inputTextElement
  function handleInput(e) {
    audio.go();
    if (machine.isWaitingForInput()) {
      machine.acceptInput(inputTextElement.value);
      inputTextElement.value="";
    }
    if (e)
      e.preventDefault();

    // Scroll to the input
    globalDisplay.scroll();
  }

  // The "choose" function for use in HTML
  //
  // Calling this is the equivalent of typing t and submitting
  // the form
  function choose(t) {
    inputTextElement.value = t;
    handleInput(null);
  };

/***********************************************************************
  END Global Functions
***********************************************************************/

/***********************************************************************
  BEGIN Display object
***********************************************************************/
  var globalDisplay = function() {
    // Keep track of functions listening for menu clicks
    var menuListeners = [];
    
    // list of HTML elements to add to display
    var pendingUpdates = [];
    
    var color = [170,170,170]; // This is used to decide when to create a new
                               // span tag with color
    var bgColor = [0,0,0];

    function queueUpdate(node) {
      pendingUpdates.push(node);
    };

    function blink() {
      if (cursorElement.style.visibility === "visible") {
        cursorElement.style.visibility="hidden";
      } else {
        cursorElement.style.visibility="visible";
      }
    }
    window.setInterval(blink,200);

    return {
      hasPendingUpdates: function () {
	return pendingUpdates.length > 0;
      },
      sendQuietBlockElementUpdates: function() {
	var spanNode=document.createElement("span");
	for (var i=0;i<pendingUpdates.length;i++) {
          spanNode.appendChild(pendingUpdates[i]);
	}
	pendingUpdates = [];
	quietBlockElement.appendChild(spanNode);
	this.scroll();
      },
      sendUpdates: function() {
	// Move old stuff over to the historyBlockElement
	var oldNodes = latestBlockElement.childNodes;
	while (oldNodes.length > 0) {
          var node = oldNodes.item(0);
          latestBlockElement.removeChild(node);
          historyBlockElement.appendChild(node);
	}
	
	// Read the quietBlockElement nodes
	oldNodes = quietBlockElement.childNodes;
	while (oldNodes.length > 0) {
          var node = oldNodes.item(0);
          quietBlockElement.removeChild(node);
          latestBlockElement.appendChild(node);
	}
	
	var spanNode=document.createElement("span");
	for (var i=0;i<pendingUpdates.length;i++) {
          spanNode.appendChild(pendingUpdates[i]);
	}
	pendingUpdates = [];
	
	latestBlockElement.appendChild(spanNode);
	
	this.scroll();
      },
      clear: function() {
	displayBlockElement.setAttribute("style","background-color:rgb("+bgColor[0]+","+bgColor[1]+","+bgColor[2]+")");
	
	// Delete current stuff
	var oldNodes = latestBlockElement.childNodes;
	while (oldNodes.length > 0) {
          var node = oldNodes.item(0);
          latestBlockElement.removeChild(node);
	}
	
	// Delete historyBlockElement
	oldNodes = historyBlockElement.childNodes;
	while (oldNodes.length > 0) {
          var node = oldNodes.item(0);
          historyBlockElement.removeChild(node);
	}
	
	// Delete the quietBlockElement nodes
	oldNodes = quietBlockElement.childNodes;
	while (oldNodes.length > 0) {
          var node = oldNodes.item(0);
          quietBlockElement.removeChild(node);
	}
	
	pendingUpdates = [];
      },
      print: function(text) {
	// Printing nothing does nothing
	if (text.length === 0)
          return;
	var spanNode=document.createElement("span");
	spanNode.setAttribute("style","color:rgb("+color[0]+","+color[1]+","+color[2]+");background-color:rgb("+bgColor[0]+","+bgColor[1]+","+bgColor[2]+")");
	var lines=text.split("\n");
	for (var i=0;i<lines.length;i++) {
          // Put a line break before each line, except the first one
          if (i !== 0) {
            var lineBreak = document.createElement("br");
            spanNode.appendChild(lineBreak);
          }
          if (lines[i].length > 0) {
            var textNode=document.createTextNode(lines[i]);
            spanNode.appendChild(textNode);
          }
	}
	
	queueUpdate(spanNode);
      },
      printAsk: function(text,defaultValue,color,bgColor,promptColor) {
	var prompt = '[Yes/No]';
	if (defaultValue === true) {
          prompt = '[Yes]';
	} else if (defaultValue === false) {
          prompt = '[No ]';
	}
	var textSpanNode=document.createElement("span");
	textSpanNode.setAttribute("style","color:rgb("+color[0]+","+color[1]+","+color[2]+");background-color:rgb("+bgColor[0]+","+bgColor[1]+","+bgColor[2]+")");
	var textNode = document.createTextNode(text());
	textSpanNode.appendChild(textNode);
	
	var promptSpanNode=document.createElement("span");
	promptSpanNode.setAttribute("style","color:rgb("+promptColor[0]+","+promptColor[1]+","+promptColor[2]+");background-color:rgb("+bgColor[0]+","+bgColor[1]+","+bgColor[2]+")");
	var promptNode = document.createTextNode(prompt);
	promptSpanNode.appendChild(promptNode);
	
	queueUpdate(textSpanNode);
	queueUpdate(promptSpanNode);      
      },
      // Scroll to the bottom of the page
      scroll: function() {
	if (displayBlockElement.scrollHeight - displayBlockElement.scrollTop !== displayBlockElement.clientHeight)
          displayBlockElement.scrollTop = displayBlockElement.scrollHeight - displayBlockElement.clientHeight;
	
      },
      // choiceText - array of functions returning menu choice text
      // choiceKeys - array of strings containing keys for menu choices
      // prompt - optional function returning prompt text
      // colors - optional RGB triples
      printMenu: function(choiceText,choiceKeys,prompt,menuColor,menuBGColor,menuPromptColor,menuChoiceColor) {
	var onclickFuncs = [];
	for (var n=0;n<choiceKeys.length;n++) {
          onclickFuncs.push(function(){
            var key = choiceKeys[n];
            return function(e) {
              choose(key);
            }}());
	}
	if (menuColor===undefined) {
          menuColor = color;
	}
	if (menuBGColor===undefined) {
          menuBGColor = bgColor;
	}
	if (menuPromptColor===undefined) {
          menuPromptColor = color;
	}
	if (menuChoiceColor===undefined) {
          menuChoiceColor = color;
	}
	
	// Create the top level span element
	var menuSpan=document.createElement("span");
	menuSpan.setAttribute("style","color:rgb("+menuColor[0]+","+menuColor[1]+","+menuColor[2]+");background-color:rgb("+menuBGColor[0]+","+menuBGColor[1]+","+menuBGColor[2]+")");
	
	// create the choices
	for (var n=0;n<choiceText.length;n++){
          var choiceSpan=document.createElement("span");
	  // XXX Add a unique identifier to each menuitem, in case there are multiple
	  //     instances in the same browser
          choiceSpan.setAttribute("id","menuitem"+n);
          choiceSpan.setAttribute("class","menuitem");
          var parts = choiceText[n]().split("("+choiceKeys[n]+")");
          for (var i=0;i<parts.length;i++){
            if (i>0) {
              var keySpan=document.createElement("span");
              keySpan.setAttribute("style","color:rgb("+menuChoiceColor[0]+","+menuChoiceColor[1]+","+menuChoiceColor[2]+")");
              var keyText = document.createTextNode("("+choiceKeys[n]+")");
              keySpan.appendChild(keyText);
              choiceSpan.appendChild(keySpan);
            }
            var partText=document.createTextNode(parts[i]);
            choiceSpan.appendChild(partText);
          }
          addEventListener(choiceSpan,"click",onclickFuncs[n]);
          menuListeners.push(onclickFuncs[n]);
          menuSpan.appendChild(choiceSpan);
          var newLine = document.createElement("br");
          menuSpan.appendChild(newLine);
	}
	queueUpdate(menuSpan);
	if (prompt!==undefined) {
          var promptSpan=document.createElement("span");
          promptSpan.setAttribute("style","color:rgb("+menuPromptColor[0]+","+menuPromptColor[1]+","+menuPromptColor[2]+")");
          var promptText=document.createTextNode(prompt());
          promptSpan.appendChild(promptText);
          queueUpdate(promptSpan);
	}
      },
      clearMenu: function() {
	// De-activate the menu
	for (var n=0;n<menuListeners.length;n++) {
          var item = document.getElementById("menuitem"+n);
          removeEventListener(item,"click",menuListeners[n]);
          item.attributes.removeNamedItem("id");
          item.attributes.removeNamedItem("class");
	}
	menuListeners=[];
      },
      setColor: function(c) {
	var newColor = intToColor(c);
	if (newColor === null) {
          return;
	} else {
          color = newColor;
	}
      },
      setBGColor: function(c) {
	var newColor = intToColor(c);
	if (newColor == null) {
          return;
	} else {
          bgColor = newColor;
	}      
      }
    };
  }(); 

/***********************************************************************
  END Display class
***********************************************************************/

/***********************************************************************
  BEGIN audio class
***********************************************************************/

/*

Pumpkin Spice implements music in ABC notation, which is a text format
for representation of Western music. It has tools for generating sheet
music and MIDI files.

*/
  var audio = function(display) {
  // private
  var queue = [];
  var playing = false;
  var audioCtx = null;
  var mainGain = null;
  var onDone;

  return {
    // Takes in a function to be called when done playing
    // all of the music in the queue
    init: function(onDoneParam) {
      onDone = onDoneParam;
      var AudioContext= window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
	display.print("PC SPEAKER ERROR! AUDIO DISABLED\n\n");
	return;
      }
      audioCtx = new AudioContext();
      
      mainGain = audioCtx.createGain();
      mainGain.gain.setValueAtTime(0.5,audioCtx.currentTime);
      mainGain.connect(audioCtx.destination);

    },


    play: function(abc) {
      // XXX Add support for ABC configuration so the defaults
      //     can be changed
      var bpm = 120;
      var noteLen = 7.0/8.0;
      
      // takes in a string to parse and a position to start parsing at
      // returns triplet of piano key number, duration, and ending pos of string
      function nextABCNote(note, start=0) {
	// XXX skip spaces and vertical bars
	var pos = start;
	var octave = 5;    // lowercase
	var sharpness = 0; // positive for sharp, negative for flat
	var baseNote; // c is 0, d is 2, e is 4, f is 5, g is 7, a is 9, b is 11, rest is null
	
	var duration = 1.0; // number of default note lengths
	
	// sharps and flats
	if (note.length > pos && (note[pos] === "^" || note[pos] === "_")) {
	  if (note[pos++] === "^") {
	    sharpness += 1;
	  } else {
	    sharpness -= 1;
	  }
	}
	if (note.length > pos && (note[pos] === "^" || note[pos] === "_")) {
	  if (note[pos++] === "^") {
	    sharpness += 1;
	  } else {
	    sharpness -= 1;
	  }
	}
	
	if (note.length > pos) {
	  var letter = note[pos].toLowerCase();
	  if (letter !== note[pos]) octave--; // uppercase letters lower the octave
	  if (letter === "c") {
	    baseNote = 0;
	  } else if (letter === "d") {
	    baseNote = 2;
	  } else if (letter === "e") {
	    baseNote = 4;
	  } else if (letter === "f") {
	    baseNote = 5;
	  } else if (letter === "g") {
	    baseNote = 7;
	  } else if (letter === "a") {
	    baseNote = 9;
	  } else if (letter === "b") {
	    baseNote = 11;
	  } else if (letter === "x" || letter === "z") {
	    baseNote = null;
	  } else {
	    // Not a musical note
	    
	    // XXX Maybe return null note and duration, but advance the pos?
	    // It's better to ignore the crap we don't understand than to give up on the whole song
	    return null;
	  }
	  pos++;
	} else {
	  // There is no letter for the note
	  //console.log("Couldn't find a note");
	  return null;
	}
	for (;note.length > pos && (note[pos] === "," || note[pos] === "'");pos++) {
	  if (note[pos] === ",") {
	    octave -= 1;
	  } else {
	    octave += 1;
	  }
	}
	
	if (note.length > pos && (note[pos] === "/" || (note.charCodeAt(pos) >= "0".charCodeAt(0) &&note.charCodeAt(pos) <= "9".charCodeAt(0)))) {
	  var numeratorString = "";
	  var denominatorString = "";
	  var numerator = 1;
	  var denominator = 1;
	  var slashes = 0;
	  
	  while (note.length > pos && (note.charCodeAt(pos) >= "0".charCodeAt(0) &&note.charCodeAt(pos) <= "9".charCodeAt(0))) {
	    numeratorString += note[pos]; 
	    pos++;
	  }
	  if (numeratorString.length>0) {
	    numerator = parseInt(numeratorString,10);
	  }
	  
	  while (note.length > pos && note[pos] === "/") {
	    slashes++;
	    pos++;
	  }
	  
	  if (slashes > 0) {
	    if (slashes>1) {
              denominator = Math.pow(2,slashes);
	    } else if(note.length === pos ||
		      (note.charCodeAt(pos) < "0".charCodeAt(0) || note.charCodeAt(pos) > "9".charCodeAt(0))) {
              denominator = 2;
	    } else {
              while (note.length > pos && (note.charCodeAt(pos) >= "0".charCodeAt(0) &&note.charCodeAt(pos) <= "9".charCodeAt(0))) {
		denominatorString += note[pos]; 
		pos++;
              }
              if (denominatorString.length > 0) {
		denominator = parseInt(denominatorString,10);
              }
	    }
	  }
	  duration = numerator/denominator;
	}

	// XXX parse broken rhythms using < and >

	if (baseNote === null)
	  return [null, duration, pos];
	else
	  return [-8+12*octave+baseNote+sharpness,duration, pos];
      }
      
      function pianoKeyToFrequency(note) {
	// a4 is piano key 49 and is 440Hz
	return Math.pow(2,(note-49)/12 )*440;
      }

      // Called when the current ABC string has been decoded
      function onStringPlayed() {
      }
      
      function playFromPos(pos) {
	var note = nextABCNote(abc,pos);
	if (note !== null) {
	  pos = note[2];
	  if (mainGain) { // same effect as "if (audioCtx)" but hints closureCompiler better
	    var osc;
	    // Actually play the note
	    if (note[0] !== null) {
	      osc = audioCtx.createOscillator();
	      
	      osc.type='square';
	      osc.frequency.setValueAtTime(pianoKeyToFrequency(note[0]),audioCtx.currentTime);
	      osc.connect(mainGain);
	      osc.start();
	      osc.stop(audioCtx.currentTime + note[1]*noteLen*60/bpm);
	    }
	    //Is the onended hook more accurate than setTimeout?
	    window.setTimeout(function() {
	      if (osc) {
		osc.stop();
		osc.disconnect(mainGain);
	      }
	      playFromPos(pos);
	    }, Math.floor(note[1]*60000/bpm));
	    return;
	  } else {
	    // Wait as if we were playing the note
	    window.setTimeout(function() {
	      playFromPos(pos);
	    }, Math.floor(note[1]*60000/bpm));
	    return;	    
	  }
	}
	
	// There are no more notes or this note string was bad
	//
	// Play the next one, if there is one
	if (queue.length > 0) {
	  abc = queue.shift();
	  playFromPos(0);
	} else {
	  // There's nothing left to play
	  // Set playing to false and notify the listener
	  playing = false;
	  onDone();
	}
      }

      // Actual play function
      if (playing) {
	queue[queue.length] = abc;
      } else {
	playing = true;
	playFromPos(0);
      }

    },

    isPlaying: function() {
      return playing;
    },
    
    go: function() {
      if (audioCtx)
	audioCtx.resume();

      // this.go = function(){};
    }
  };  
}(globalDisplay);
  
/***********************************************************************
  END audio class
***********************************************************************/

/***********************************************************************
  BEGIN Machine class
***********************************************************************/

  // XXX Error handling?
  
  var machine = function(display) {
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
	
      // Disable this while single key input is disabled
      
      // addEventListener(inputTextElement,"input",function(e) {
      //   this._vars[this._inputVariable] = inputTextElement.value;
      // });

      // Don't allow machine to be re-init If we want to allow
      // re-init, we need to add code to clear everything and avoid
      // re-adding listeners, etc.
      this.init = undefined;

      // On desktop, the user should be able to start typing immediately
      // On mobile, this doesn't bring up the keybard, which is the behavior we want.
      inputTextElement.focus();
    },
    isWaitingForInput: function() {
      return !!this._inputVariable;
    },
    acceptInput: function(value) {
      display.print(value);
      this._vars[this._inputVariable] = value;
      this._inputVariable = null;
      var me = this;
      window.setTimeout(function(){me.go();},0);
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
	  me.go();
	}
      };
    },
    go: function() {
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
          window.setTimeout(function() {me.go();},0);
          display.sendQuietBlockElementUpdates();
        } else {
          var me = this;
          window.setTimeout(function() {me.go();},this._interruptDelay);
                display.sendQuietBlockElementUpdates();
        }
        this._interruptDelay = null;
      } else if (this._callstack.length>0) {
        display.print("STACK OVERFLOW\nARE YOU TRYING SOME COMPUTER SCIENCE OR SOMETHING?\n");
              display.sendUpdates();
      }

      // The program ended
      if (this._callstack.length == 0 && display.hasPendingUpdates())
        display.sendUpdates();

    }
  };
}(globalDisplay);

/***********************************************************************
  END Machine class
***********************************************************************/

/***********************************************************************
  BEGIN Codegen class
***********************************************************************/

  //     Maybe pass in an error handler?

  var codegen = function(display, machine) {

    // Private variables
    var loopStack;  // Keeps track of nested loops

    // Map of variable name to STRING, NUMERIC, or list of matches
    // There are special names for subtroutine args
    var varTypes;

    var subArgNames;      // Map of subroutine to list of param names
      
    var subArgCount; // Map of subroutine to integer param count                                                     // Used when subs are called before declaration

    var code; // map of function names to list of instructions
    var currentSub; // Name of the sub we're currently adding code to
      
    var calledSubs;  // Subroutines that were called before being defined
                     // So we can check that they eventually get defined


    // location of the next instruction
    function nextInstruction() {
      return code[currentSub].length;
    };
    function pushInstruction(instruction) {
      return code[currentSub].push(instruction);
    };
    function addInstructionAt(loc,instruction) {
      code[currentSub][loc] = instruction;
    };

    function comparisonOpToCode(opToken) {
      if (opToken.type === EQUALS) {
        return '===';
      } else if (opToken.type === LESS) {
        return '<';
      } else if (opToken.type === GREATER) {
        return '>';
      } else if (opToken.type === GREATEROREQUAL) {
        return '>=';
      } else if (opToken.type === LESSOREQUAL) {
        return '<=';
      } else if (opToken.type === NOTEQUAL) {
        return '!=';
      } else {
        return null
      }
    };

    function localVarName(name) {
      if (currentSub !== "!") {
        var pos = 0;
        while (pos < subArgNames[currentSub].length){
          if (subArgNames[currentSub][pos] === name) {
            return argNameByArity(currentSub,pos);
          }
          pos++;
        }
      }
      return name;
    };
    
    // Name of the return value for the given sub
    // Used internally in varTypes to keep track of type
    function returnValueName(sub) {
      return sub+"!";
    };

    // Call with FOO,0 to get the name of the first arg of subroutine FOO
    // Call with FOO,1 to get the name of the second arg of subroutine FOO
    // Used internally in varTypes to keep track of type
    function argNameByArity(sub,pos) {
      return sub+"!"+pos; // Implicit conversion from number to string
    };

    return {
    init: function() {
      loopStack = [];
      varTypes = {};
      subArgNames = {};
      subArgCount = {};
      code = {"!":[]}; // ! is the main block
      currentSub = "!";
      calledSubs = [];
    },
    // Called after code generation is complete to check for stupidness
    validate: function () {
      // Calling fake subroutines is stupid
      for (var i=0;i<calledSubs.length;i++) {
        var name=calledSubs[i];
        if (!code[name]) {
          display.print("ERROR: CALL TO FAKE SUBROUTINE "+name+"!\n");
          return false;
        }
      }
      return true;
    },
    // Called after code generation is complete and validated
    // Make the code
    generate: function () {
      // Initialize numeric values to 0, strings to empty string
      // Variables with unknown types remain undefined, always fail in comparisons
      var vars = {};
      for (var v in varTypes) {
        if (varTypes[v] === NUMERIC)
          vars[v] = 0;
        else if (varTypes[v] === STRING)
          vars[v] = "";
      }
      machine.init(code, vars);
    },
    argType: function(sub,pos) {
      return varTypes[argNameByArity(sub,pos)];
    },

    typeGeneratorPass: function() {
      /* Pumpkin Spice has implied, static typing
         
         Certain types of expressions have a specific type
         FOR loop variables are numeric, for example

         Certain types of expressions have the same type
         as their counterpart.
         IF statements compare two expressions of the same type, for example

         A variable that's not used might not have a type
         Anything that's used ends up with a type
         
         
         Types are determined in the first pass of the compiler by
         building a map of variables to their types.

         Variables with unknown types are associated with a list of
         variables with the same type. As types are determined, these
         lists are used to fill in missing types
         
          Possible return values:
            STRING - this is a string
            NUMERIC - this is a numeric type
            null - something is wrong
            Array - we haven't figured it out - this is a list of identifiers

         The second pass uses this type data to generate code
         
      */

      function assignTypes(variables,type) {
        // type must be resolved before this is called
        if (type !== STRING && type !== NUMERIC) {
          display.print("TYPE SYSTEM ERROR\n");
          return false;
        }
        var sameTypeVars = [];
        for (var i=0;i<variables.length;i++) {
          if (varTypes[variables[i]] &&
              varTypes[variables[i]] !== STRING &&
              varTypes[variables[i]] !== NUMERIC) {
            var sameTypeTemp = varTypes[variables[i]];
            for (var j=0;j<sameTypeTemp.length;j++)
              sameTypeVars.push(sameTypeTemp[j]);
            varTypes[variables[i]] = type;
          } else if (varTypes[variables[i]] !== undefined &&
              varTypes[variables[i]] !== type) {
            display.print("TYPE MISMATCH\n");
            return false;
          } else {
            varTypes[variables[i]] = type;
          }
        }
        if (sameTypeVars.length > 0) {
          return assignTypes(sameTypeVars,type);
        } else {
          return true;
        }
        
      };
      function saveUnassignedTypes(variables) {
        // This is O(n^2) in the worst case
        // 
        // There's a much better way to handle this
        
        for (var i=0;i<variables.length;i++) {
          if (varTypes[variables[i]] &&
              (varTypes[variables[i]]===STRING ||
               varTypes[variables[i]]===NUMERIC)) {
            display.print("UNASSIGNED TYPE NOT RESOLVED CORRECTLY\n");
            throw "typeassignerror"; // We should never get here
          }
          if (varTypes[variables[i]]) {
            for (var j=0;j<variables.length;j++) {
              varTypes[variables[i]].push(variables[j]);
            }
          } else {
            // Copy the current list to varTypes
            varTypes[variables[i]] = variables.slice(0);
          }
        }
      };
      function genTypesForExpressionPair(type1,type2) {
        // Returns type of expression pair
        // Just like findTypeOfTokenExpression can return
        //   STRING, NUMERIC, null, or list
        
        // Something is bad
        if (type1 === null || type2 === null)
          return null;
        
        // The first expression can be resolved
        if (type1 === STRING || type1 === NUMERIC) {
          if (type2 === type1) {
            return type1;
          } else if (type2 !== STRING && type2 !== NUMERIC) {
            // Type 2 is a list of unknowns
            assignTypes(type2,type1);
            return type1;
          } else {
            // It's not a match and it's not unknown
            return null;
          }
        }
        
        // The first expression could not be resolved
        
        // The second expression can be resolved
        if (type2 === STRING || type2 === NUMERIC) {
          assignTypes(type1,type2);
          return type2;
        }

        // There's probably a better way to combine two lists
        var undefineds = [];
        for (var i=0;i<type1.length;i++) {
          undefineds.push(type1[i]);
        }
        for (var i=0;i<type2.length;i++) {
          undefineds.push(type2[i]);
        }
        if (undefineds.length === 0)
          return null;
        else {
          saveUnassignedTypes(undefineds);
          return undefineds;
        }
      };

      return {
      expressionHandler:  function() {
        // Finds the type of an unknown expression, returning
        // the type or a list of variables with the type
        
        // XXX Handle errors so we can differentiate between
        //     parser errors and type errors
        
        // Possible return values for all functions:
        // STRING - this is a string
        // NUMERIC - this is a numeric type
        // null - something is wrong
        // Array - we haven't figured it out - this is a list of identifiers
	return {
        numericLiteral: function(value) {
          return NUMERIC;
        },
        stringLiteral: function(value) {
          return STRING;
        },
        randomBuiltin: function(value) {
          return NUMERIC;
        },
        piBuiltin: function() {
          return NUMERIC;
        },
        variable: function(name) {
          name = localVarName(name);
          // If this is local to a sub, use the local
          if (varTypes[name]===undefined) {
            return [name]; // unknown
          } else {
            return varTypes[name];
          }
        },
        expression: function(value,resultType) {
          return null; // Expression tokens shouldn't exist in the first pass
        },
        validateSubExpression: function(subExp,type) {
          if (type !== undefined && subExp !== type) {
            // if it's not an exact match, check it out
            subExp = genTypesForExpressionPair(type,subExp)
            if (!subExp) {
              display.print("TYPE MISMATCH.");
              return null;
            }
          }
          return subExp;
        },
        cintBuiltin: function(value) {
          return NUMERIC;
        },
        intBuiltin: function(param) {
          return NUMERIC;
        },
        fixBuiltin: function(param) {
          return NUMERIC;
        },
        absBuiltin: function(param) {
          return NUMERIC;
        },
        strzBuiltin: function(param) {
          return STRING;
        },
        leftzBuiltin: function(param) {
          return STRING;
        },
        rightzBuiltin: function(param) {
          return STRING;
        },
        valBuiltin: function(param) {
          return NUMERIC;
        },
        lenBuiltin: function(param) {
          return NUMERIC;
        },
        parenExpression: function(subExp) {
          return subExp;
        },
        boolParenExpression: function(subExp) {
          return subExp;
        },
        boolOrExpression: function(exp1,exp2) {
          // XXX This doesn't make sense. There is no boolean type
          if (!exp1 || !exp2)
            return null;
          return exp1;
        },
        boolAndExpression: function(exp1,exp2) {
          // XXX This doesn't make sense. There is no boolean type
          if (!exp1 || !exp2)
            return null;
          return exp1;
        },
        boolNotExpression: function(exp1) {
          // XXX This doesn't make sense. There is no boolean type
          return exp1;
        },
        boolBinaryExpression: function(exp1,op,exp2) {
          // Returns the type of exp1, exp2 rather than type BOOL
          return genTypesForExpressionPair(exp1,exp2);         
        },
        callSubroutine: function(name,argExps) {
          // XXX similar to statement
          if (subArgCount[name] === undefined) {
            subArgCount[name] = argExps.length;
          }
          if (subArgCount[name] !== argExps.length) {
            display.print("SUBROUTINE CALL "+name+" HAS "+argExps.length+" args but expected "+subArgCount[name]+"\n");
            return null;
          }
          for (var i=0;i<argExps.length;i++) {
            if (argExps[i] === null) {
              display.print("Invalid argument to SUBROUTINE CALL "+name+"\n");
              return null;
            }
            var varName = argNameByArity(name,i);
            if (varTypes[varName]) {
              var result = genTypesForExpressionPair(argExps[i],varTypes[varName])
              if (!result) {
                display.print("Invalid argument type mismatch in CALL "+name+"\n");
                return null;
              } else {
                varTypes[varName] = result;
              }
            } else {
              varTypes[varName] = argExps[i];
            }
          }
          var retName = returnValueName(name);
          if (varTypes[retName])
            return varTypes[retName];
          else
            return [retName];
        },
        binaryExpression: function(operator,a,b) {
          if (a === null || b === null) {
            return null;
          }
          if (operator===PLUS) {
            return genTypesForExpressionPair(a,b);
          } else {
            if (genTypesForExpressionPair(a,NUMERIC) &&
                genTypesForExpressionPair(b,NUMERIC))
              return NUMERIC;
            else
              return null;
          }
        }
        };
      }(),
      printString: function(value,newline,pause,num) {
        return (value !== null && value !== undefined);
      },
      printExp: function(exp,newline,pause,num) {
        var result = genTypesForExpressionPair(exp,STRING);
        if (!result) {
          display.print("Type mismatch for PRINT on line "+num+"\n");
        }
        return result;
      },
      ifStatement: function(boolExp,num){
        if (boolExp === null) {
          display.print("Invalid comparison for IF on line "+num+"\n");
          return false;
        }
        return true;
        
      },
      endIf: function(num) {
        return true;
      },
      elseStatement: function(num) {
        return true;
      },
      endWhile: function(num) {
        return true;
      },
      whileStatement: function(exp,num){
        if (exp === null) {
          display.print("Type mismath for WHILE on line "+num+"\n");
          return false;
        }
        return true;
        
      },
      beginRandom: function(num) {
        return true;
      },
      waitForMusic: function() {
	return true;
      },
      beginSubroutine: function(name, args, num) {
        // XXX CHECK THAT VARIABLE HASN'T BEEN DEFINED
        // XXX WHEN VARS ARE DEFINED, CHECK THAT SUBROUTINE HASN'T BEEN DEFINED
        // If there's an existing subArgNames entry, this had already been defined!
        if (subArgNames[name] !== undefined) {
          display.print("SUBROUTINE "+name+" REDEFINED on line "+num+"\n");
          return false;
        } else {
          // This is the current sub now.
          currentSub = name;

          // Save the arg names
          subArgNames[name] = args;

          // We've never seen this before. Save the count, too
          if (subArgCount[name] === undefined) {
            subArgCount[name] = args.length;
          } else { // We've seen this called. Check that the param count matches.
            if (subArgCount[name] !== args.length) {
              display.print("SUBROUTINE "+name+" HAS "+args.length+" args but was called with "+subArgCount[name]+" on line "+num+"\n");
              return false;

            }
          }
          return true;
        }
      },
      callSubroutine: function(name, argExps, num) {
        if (subArgCount[name] === undefined) {
          subArgCount[name] = argExps.length;
          calledSubs[calledSubs.length] = name;
        }
        if (subArgCount[name] !== argExps.length) {
          display.print("SUBROUTINE "+name+" HAS "+argExps.length+" args but expected "+subArgCount[name]+" on line "+num+"\n");
          return false;
        }
        for (var i=0;i<argExps.length;i++) {
          if (argExps[i] === null) {
            display.print("Invalid argument to "+name+" on line "+num+"\n");
            return false;
          }
          var varName = argNameByArity(name,i);
          if (varTypes[varName]) {
            var result = genTypesForExpressionPair(argExps[i],varTypes[varName])
            if (!result) {
              display.print("Invalid argument type mismatch in "+name+" on line "+num+"\n");
              return false;
            } else {
              varTypes[varName] = result;
            }
          } else {
            varTypes[varName] = argExps[i];
          }
        }
        return true;
      },
      endSubroutine: function(num) {
        currentSub = "!";
        return true;
      },
      returnStatement: function(exp, num) {
        if (exp === null) {
          display.print("INVALID RETURN EXPRESSION ON LINE "+num+"\n");
          return false;

        }
        if (currentSub === "!") {
          display.print("RETURN OUTSIDE OF SUBROUTINE ON LINE "+num+"\n");
          return false;
        }
        var retValName=returnValueName(currentSub);
        if (varTypes[retValName]) {
          var result = genTypesForExpressionPair(exp,varTypes[retValName]);
          if (!result) {
            display.print("TYPE MISMATCH IN RETURN ON "+num+"\n");
            return false;
          } else {
            varTypes[retValName] = result;
          }
        } else {
          varTypes[retValName] = exp;
        }
        return true;
      },
      endRandom: function(num) {
        return true;
      },
      withChance: function(chance, num) {
        return true;
      },
      withEvenChance: function(num) {
        return true;
      },
      beginAsk: function(promptExp,num) {
        var result = genTypesForExpressionPair(promptExp,STRING);
        if (result === null) {
          display.print("Type mismatch for ASK on line "+num+"\n");
          return false;
        } else {
          return true;
        }      
      },
      askColor: function(value,num) {
        return true;
      },
      askBGColor: function(value,num) {
        return true;
      },
      askPromptColor: function(value,num) {
        return true;
      },
      onNo: function(num) {
        return true;
      },
      onYes: function(num) {
        return true;
      },
      askDefault: function(value,num) {
        return true;
      },
      endAsk: function(num) {
        return true;
      },
      beginMenu: function(promptExp,num) {
        var result = genTypesForExpressionPair(promptExp,STRING);
        if (result === null) {
          display.print("Type mismatch for BEGIN MENU on line "+num+"\n");
          return false;
        } else {
          return true;
        }
      },
      menuColor: function(colorExp,num) {
        return true;
      },
      menuBGColor: function(colorExp,num) {
        return true;
      },
      menuChoiceColor: function(colorExp,num) {
        return true;
      },
      menuPromptColor: function(colorExp,num) {
        return true;
      },
      endMenu: function(num) {
        return true;
      },
      menuChoice: function(charExp,textExp,num) {
        var result = genTypesForExpressionPair(textExp,STRING);
        if (result === null) {
          display.print("Type mismatch for MENU CHOICE on line "+num+"\n");
          return false;
        } else {
          return true;
        }
      },
      menuHideIf: function(boolExp,num) {
        if (boolExp === null) {
          display.print("Type mismatch for HIDE IF on line "+num+"\n");
          return false;
        } else {
          return true;
        }
      },
      color: function(valueExp,num) {
        var result = genTypesForExpressionPair(valueExp,NUMERIC);
        if (result === null) {
          display.print("Type mismatch for COLOR on line "+num+"\n");
          return false;
        } else {
          return true;
        }
      },
      bgColor: function(valueExp,num) {
        var result = genTypesForExpressionPair(valueExp,NUMERIC);
        if (result === null) {
          display.print("Type mismatch for BGCOLOR on line "+num+"\n");
          return false;
        } else {
          return true;
        }
      },
      sleep: function(valueExp,num) {
        var result = genTypesForExpressionPair(valueExp,NUMERIC);
        if (result === null) {
          display.print("Type mismatch for SLEEP on line "+num+"\n");
          return false;
        } else {
          return true;
        }       
      },
      input: function(valueExp,num) {
        assignTypes([valueExp],STRING);
        return true;
      },
      play: function(valueExp,num) {
	var result = genTypesForExpressionPair(valueExp,STRING);
	if (result === null) {
	  display.print("Type mismatch for PLAY on line "+num+"\n");
	  return false;
	} else {
	  return true;
	}
      },
      forStatement: function(varExp,startExp,endExp,num) {
        if (!assignTypes([varExp],NUMERIC) ||
            genTypesForExpressionPair(startExp,NUMERIC)===null ||
            genTypesForExpressionPair(endExp,NUMERIC)===null) {
          display.print("Type mismatch for FOR on line "+num+"\n");       
        } else {
          return true;
        }
        
      },
      letStatement: function(varExp,valueExp,num) {
        if (varExp === null || valueExp === null) {
          display.print("Type mismatch for assignment to "+varExp+" on line "+num+"\n");
          return false;
        }
        varExp = localVarName(varExp);
        // Value exp has an unknown type
        if (valueExp !== STRING && valueExp !== NUMERIC) {
          // The variable has a type- set the arg based on that
          if (varTypes[varExp] &&
              (varTypes[varExp] === STRING ||
               varTypes[varExp] === NUMERIC)) {
            return assignTypes(valueExp,varTypes[varExp]);
          } else {
            
            // There are no types yet
            var unassigned = [varExp];
            for (var i=0;i<valueExp.length;i++) {
              unassigned.push(valueExp[i]);
            }
            saveUnassignedTypes(unassigned);
            return true;
          }
        } else {
          if (!assignTypes([varExp],valueExp)) {
            display.print("Type mismatch for assignment to "+varExp+" on line "+num+".\n");
            return false;
          } else {
            return true;
          }
        }
      },
      comment: function(tokens, num) {
        return true;
      },
      clear: function(num) {
        return true;
      },
      next: function(varExp,num) {
        return true;
      }
    };
    }(),
      codeGeneratorPass: function(){
	return {
        expressionHandler: function(){
          // generate expressions
          // XXX Handle errors
          // Returns an EXPRESSION token or null
          
          // This is vastly simplified because we keep JavaScript semantics for
          // operator precendence.
          
          // XXX Fail if types are incorrect in every case

          /*
            Ugghhhhh....
            
            I'm working really hard to avoid parsing expressions
            and instead pass them off to JavaScript.
            
            It's maybe not worth it. I don't know.
            
            I'm implementing subroutine expressions by running each
            subroutine referenced in the expression and saving the results
            of each subroutine in a temp variable, then using the temp variable
            in the expression.
            
            This counter guarantees that there's no overlap in the names of
            those variables.
          */
	  var expressionSubroutineCount = 0;
          function nextExpressionSubroutineName() {
            var next = expressionSubroutineCount;
            expressionSubroutineCount++;
            // Use in .vars in machine._callstack objects
            // Must not conflict with other local variables
            return "!"+next;
          };
          // Hack to get variable names from optimised code by stringifying a
          // function definition This let's us fully optimize and still eval()
          // code
          //
          // Typical Usage: nameFromFunctionString(function{NAME}.toString())
          function nameFromFunctionString(o) {
            var start = o.indexOf('{')+1;
            
            // Some old Firefoxen insert whitespace in the stringified function
            while (o[start] < o.length && o[start]===' ' || o[start]==='\n' || o[start]==='\r' || o[start]==='\t')
              start++;
            
            //  Some old Firefoxen insert semicolons
            var end = o.indexOf(';');
            if (end === -1)
              end = o.indexOf('}');
            return o.substr(start,end-start);
          };
          // The name of the object with all the local subroutine variables in it,
          // the .vars object at the top of the stack
          function expressionSubTempObjName() {
            /** @suppress {uselessCode} */
            var o = function(){machine._callstack[machine._callstack.length-1].vars}.toString();
            return nameFromFunctionString(o);
          };

          // find name of a variable in the machine
          function variableName(name) {
            /** @suppress {uselessCode} */
            var vname = (function(){machine._vars}).toString();
            vname = nameFromFunctionString(vname);
            
            var escaped = name.replace("\\","\\\\").replace("'","\\'").replace('"','\\"').replace('\n','\\n').replace('\r','\\r')
            return vname+'[\''+escaped+'\']';
          };

          // Find name of local variable in the machine
          function localVariableName(name) {
            /** @suppress {uselessCode} */
            var vname = (function(){machine._callstack[machine._callstack.length-1].vars}).toString();
            vname = nameFromFunctionString(vname);
            
            var escaped = name.replace("\\","\\\\").replace("'","\\'").replace('"','\\"').replace('\n','\\n').replace('\r','\\r')
            return vname+'[\''+escaped+'\']';
          };

	  return {          
          numericLiteral: function(value) {
            return {type:EXPRESSION,value:value,resultType:NUMERIC,subs:[]};
          },
          stringLiteral: function(value) {
            return {type:EXPRESSION,value:JSON.stringify(value),resultType:STRING,subs:[]};
          },
          randomBuiltin: function(l,h) {
            // XXX make constant
            // Hack to find name of variable, so optimizers can do their work
            /** @suppress {uselessCode} */
            var rndname = (function(){machine.random}).toString();
            rndname = nameFromFunctionString(rndname);
            return {type:EXPRESSION,value:(rndname+'('+l.value+','+h.value+')'),resultType:NUMERIC,subs:l.subs.concat(h.subs)};
          },
          piBuiltin: function() {
            return {type:EXPRESSION,value:'Math.PI',resultType:NUMERIC,subs:[]};
          },
          variable: function(name) {
            // Check to see that variable has type data
            var localName = localVarName(name);
            if (!varTypes[localName]) {
              return null;
            }

            // Handle case of subroutine local
            if (localName !== name) {
              return {type:EXPRESSION,value:localVariableName(name),resultType:varTypes[localName],subs:[]};

            } else { // It's a plain old global variable
              return {type:EXPRESSION,value:variableName(name),resultType:varTypes[localName],subs:[]};
            }
          },
          expression: function(value,resultType,subs) {
            return {type:EXPRESSION,value:value,resultType:resultType,subs:subs};
          },
          validateSubExpression: function(result,type) {
            if (!result || result.resultType !== type) {
              return null;
            } else {
              return result;
            }
          },
          cintBuiltin: function(p) {
            return {type:EXPRESSION,value:('Math.ceil('+p.value+')'),resultType:NUMERIC,subs:p.subs};
          },
          intBuiltin: function(p) {
            return {type:EXPRESSION,value:('Math.floor('+p.value+')'),resultType:NUMERIC,subs:p.subs};
          },
          fixBuiltin: function(p) {
            return {type:EXPRESSION,value:('Math.trunc('+p.value+')'),resultType:NUMERIC,subs:p.subs};
          },
          absBuiltin: function(p) {
            return {type:EXPRESSION,value:('Math.abs('+p.value+')'),resultType:NUMERIC,subs:p.subs};
          },
          strzBuiltin: function(p) {
            return {type:EXPRESSION,value:('('+p.value+').toString(10)'),resultType:STRING,subs:p.subs};
          },
          leftzBuiltin: function(p,n) {
            return {type:EXPRESSION,value:('('+p.value+').substring(0,'+n.value+')'),resultType:STRING,subs:p.subs.concat(n.subs)};
          },
          rightzBuiltin: function(p,n) {
            return {type:EXPRESSION,value:('('+p.value+').substring(('+p.value+').length-'+n.value+',('+p.value+').length)'),resultType:STRING,subs:p.subs.concat(n.subs)};
          },
          valBuiltin: function(p) {
            return {type:EXPRESSION,value:('Number('+p.value+')'),resultType:NUMERIC,subs:p.subs};
          },
          lenBuiltin: function(p) {
            return {type:EXPRESSION,value:('('+p.value+').length'),resultType:NUMERIC,subs:p.subs};
          },
          parenExpression: function(inner) {
            if (!inner)
              return null;
            return {type:EXPRESSION,value:('('+inner.value+')'),resultType:inner.resultType,subs:inner.subs};
          },
          boolParenExpression: function(result) {
            if (!result)
              return null;
            return {type:BOOLEXPRESSION,value:'('+result.value+')',subs:result.subs};
          },
          boolOrExpression: function(exp1,exp2) {
            if (!exp1 || !exp2)
              return null;
            return {type:BOOLEXPRESSION,value:exp1.value+'||'+exp2.value,subs:exp1.subs.concat(exp2.subs)};
          },
          boolAndExpression: function(exp1,exp2) {
            if (!exp1 || !exp2)
              return null;
            return {type:BOOLEXPRESSION,value:exp1.value+'&&'+exp2.value,subs:exp1.subs.concat(exp2.subs)};
          },
          boolNotExpression: function(exp1) {
            if (!exp1)
              return null;
            return {type:BOOLEXPRESSION,value:'!'+exp1.value,subs:exp1.subs};
          },
          boolBinaryExpression: function(exp1,opToken,exp2) {
            var op = comparisonOpToCode(opToken);
            return {type:BOOLEXPRESSION,value:exp1.value+op+exp2.value,subs:exp1.subs.concat(exp2.subs)};
          },
          callSubroutine: function(name,argExps) {
            // subroutine results are saved in a temp variable
            var temp = nextExpressionSubroutineName();
            // Expressions have a list of subroutines the need to be called
            // before they are run
            var subs = [{temp:temp,name:name,args:argExps}];
            var retName = returnValueName(name);

            // The name of the variable where the temps are stored
            var t = expressionSubTempObjName();
            return {type:EXPRESSION,value:t+'["'+temp+'"]',resultType:varTypes[retName],subs:subs};
          },
          binaryExpression: function(operator,a,b) {
            if (a.resultType !== b.resultType ||
                (a.resultType === STRING && operator !== PLUS)) {
              return null;
            }
            switch (operator) {
            case PLUS:
              if (a.resultType === STRING) {
                // Silently truncate long strings
                return {type:EXPRESSION,value:'('+a.value+'+'+b.value+').slice(0,255)',resultType:a.resultType,subs:a.subs.concat(b.subs)};
              } else {
                return {type:EXPRESSION,value:a.value+'+'+b.value,resultType:a.resultType,subs:a.subs.concat(b.subs)};
              }
            case MINUS:
              return {type:EXPRESSION,value:a.value+'-'+b.value,resultType:a.resultType,subs:a.subs.concat(b.subs)};    
            case TIMES:
              return {type:EXPRESSION,value:a.value+'*'+b.value,resultType:a.resultType,subs:a.subs.concat(b.subs)};    
            case DIV:
              return {type:EXPRESSION,value:a.value+'/'+b.value,resultType:a.resultType,subs:a.subs.concat(b.subs)};
            default:
              return null;
            }
            
          }
        };
	}(),

        // XXX handle errors by throwing an exception
        // XXX don't pass in the line number- let the caller handle the exception and print errors
        
        // Adds instructions with calls to all of the function
        // referenced in the expression, then returns function that
        // evaluates the expression
        _expressionToFunction: function(exp) {
          function stringToFunction(expr) {
            // Actually convert a JS expression string to a function
            // Put it in a list to work around bug in some older browsers
            // evaluating a function expression directly
            var text = '[(function(){return '+expr+';})]';
            var listFunc = eval(text);
            return listFunc[0];
          };

          for (var i=0;i<exp.subs.length;i++) {
            this.callSubroutine(exp.subs[i].name,exp.subs[i].args,0);
            // wrap in function tocreate new temp for each iteration
            (function(){
              var temp = exp.subs[i].temp;
              pushInstruction(function() {
                machine._callstack[machine._callstack.length-1].vars[temp]=machine._ret;
                machine.advance();
              });})();
          }
      
          return stringToFunction(exp.value);
        },

        printString: function(text,newline,pause,num) {
          if (text === null || text.length === 0) {
            // bare naked print
            if (newline)
              text = "\n";
          } else {
            if (newline)
              text = text+"\n";
          }
          if (pause) {
            pushInstruction(function() {
              display.printMenu([function(){return text;}],[""],
                                undefined,undefined,undefined,undefined,undefined);
              
              machine._interruptDelay = 0;
              machine._inputVariable = "!"; // Internal name
              machine.advance();
            });
          } else {
            pushInstruction(function(){
              if (display.print(text))
                // Give up the CPU to allow display
                machine._interruptDelay = 0;
              machine.advance();
            });
          }
          return true;
        },
        printExp: function(exp,newline,pause,num) {
          if (!exp || (exp.resultType !== STRING)) {
            display.print("Invalid PRINT on line "+num+"\n");
            return false;
          }
          if (newline) {
            exp.value = exp.value+"+\"\\n\"";
          }
          var text = this._expressionToFunction(exp);
          if (pause) {
            pushInstruction(function() {
              display.printMenu([text],[""],
                                undefined,undefined,undefined,undefined,undefined);
              machine._interruptDelay = 0;
              machine._inputVariable = "!"; // Internal name
              machine.advance();
            });
          } else {
            pushInstruction(function(){
              if (display.print(text()))
                // Give up the CPU to allow display
                machine._interruptDelay = 0;
              machine.advance();
            });
          }
          return true;
        },
        ifStatement: function(boolExp,num){
          if (!boolExp) {
            display.print("Invalid IF on line "+num+"\n");
            return false;
          }
          var test = this._expressionToFunction(boolExp);
          loopStack.push({type:IF,
                                  test:test,
                                  elseloc:null,
                                  loc:nextInstruction()});
          pushInstruction(null);
          return true;
        },
        endIf: function(num) {
          var obj = loopStack.pop();
          if ((!obj) || obj.type !== IF) {
            display.print("ERROR: END IF WITHOUT MATCHING IF\n");
          } else {
            var pos;
            if (!obj.elseloc) {
              pos=nextInstruction();
            } else {
              pos = obj.elseloc+1;
            }
            var test = obj.test;
            addInstructionAt(obj.loc,function(){
              if (test())
                machine.advance();
              else
                machine.setLoc(pos);
            });
            
            if (!!obj.elseloc) {
              var end=nextInstruction();
              addInstructionAt(obj.elseloc,function(){
                machine.setLoc(end);
              });
            }
          }
          return true;
        },
        elseStatement: function(num) {
          var obj = loopStack[loopStack.length-1];
          if ((!obj) || obj.type !== IF) {
            display.print("ERROR: ELSE WITHOUT MATCHING IF\n");
          } else {
            obj.elseloc=nextInstruction();
            pushInstruction(null);
          }
          return true;
        },
        endWhile: function(num) {
          var obj = loopStack.pop();
          if ((!obj) || obj.type !== WHILE) {
            display.print("ERROR: WEND IF WITHOUT MATCHING WHILE\n");
          } else {
            var test = obj.test;
            pushInstruction(function(){
              machine.setLoc(obj.top);
            });
            var pos=nextInstruction();
            addInstructionAt(obj.loc,function(){
              if (test())
                machine.advance();
              else
                machine.setLoc(pos);
            });
          }
          return true;
        },
        whileStatement: function(exp,num){
          if (!exp) {
            display.print("Invalid WHILE on line "+num+"\n");
            return false;
          }
          var top = nextInstruction();
          var test = this._expressionToFunction(exp);

          loopStack.push({type:WHILE,
                                  test:test,
                                  elseloc:null,
                                  top:top,
                                  loc:nextInstruction()});
          pushInstruction(null);
          return true;
        },
        beginRandom: function(num) {
          loopStack.push({type:RANDOM,
                                  events:[],
                                  loc:nextInstruction()});
          pushInstruction(null);
          return true;
        },
	waitForMusic: function() {
	  pushInstruction(function(){
	    // Wait flag 1 is wait for music
	    machine._waitFlags = (machine._waitFlags | 1);
	    machine._interruptDelay = 0;
	    machine.advance();
	  }
				 );
	  return true;
	 
	},
        beginSubroutine: function(sub, args, num) {
          if (code[sub] !== undefined) {
            display.print("SUBROUTINE "+sub+" ALREADY DEFINED");
          } else {
            var i
            for (i=0;i<loopStack.length;i++) {
              if (loopStack[i].type === SUBROUTINE) {
                display.print("NESTED SUBROUTINES NOT ALLOWED");
                break;
              }
            }
            if (i === loopStack.length) {
              loopStack.push({type:SUBROUTINE});
              currentSub = sub;
              code[sub] = [];
            }
          }
          return true;
        },
        callSubroutine: function(sub, argExps, num) {
          var argNames = subArgNames[sub];
          var fArgs = [];
          for (var i=0;i<argExps.length;i++) {
            fArgs.push(this._expressionToFunction(argExps[i]));
          }
          var retName = returnValueName(sub);
          var ret;
          if (varTypes[retName] === STRING) {
            ret = "";
          } else if (varTypes[retName] === NUMERIC) {
            ret = 0;
          }
          pushInstruction(function () {
            var argVals = {};
            for (var i=0;i<fArgs.length;i++) {
              argVals[argNames[i]] = fArgs[i]();
            };
            // If we had local variables, we'd set them to 0 here
            machine.callSub(sub,argVals,ret);
          });
          return true;
        },
        endSubroutine: function(num) {
          if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== SUBROUTINE) {
            display.print("UNEXPECTED END SUBROUTINE");
	    return false;
          } else {
            loopStack.pop();
            currentSub = "!";
          }
          return true;
        },
        returnStatement: function(exp,num) {
          // XXX Keep track of returns - if there's at least one
          // return or the sub is used in an expression, all code
          // paths in the sub should have returns

          // Make sure there's a subroutine somewhere
          for (var i=loopStack.length-1;i>=0;i--) {
            if (loopStack[i].type === SUBROUTINE) {
              break;
            }
          }
          if (i===-1) {
            display.print("UNEXPECTED RETURN OUTSIDE OF SUB");
            return false;
          }
          exp = this._expressionToFunction(exp);
          pushInstruction(function() {
            machine._callstack[machine._callstack.length-1].ret = exp();
            machine._callstack[machine._callstack.length-1].loc = machine._code[machine._callstack[machine._callstack.length-1].sub].length;
          });
          return true;
        },
        endRandom: function(num) {
          var obj = loopStack.pop();
          if ((!obj) || obj.type !== RANDOM) {
            display.print("ERROR: END RANDOM WITHOUT MATCHING BEGIN RANDOM on "+num+"\n");
          } else {
            var events = obj.events;
            if (events.length < 1) {
              display.print("ERROR: RANDOM STATEMENTS REQUIRE AT LEAST 1 CHOICE\n");
            } else {
              var numNulls = 0;
              for (var n=0;n<events.length;n++) {
                if (events[n].chance === null) {
                  numNulls++;
                }
              }
              if (numNulls === events.length) {
                for (var n=0;n<events.length;n++) {
                  events[n].chance = 100.0/events.length;
                }
              } else if (numNulls > 0) {
                display.print("ERROR: MIXED RANDOM MODES - EITHER SPECIFY CHANCE PERCENT OR DON'T\n");
              }
              
              var total = 0;
              for (var n=0;n<events.length;n++) {
                total += events[n].chance;
              }
              if (total < 99.999 || total > 100.001) {
                display.print("ERROR: THE CHANCES OF RANDOM EVENTS SHOULD ADD UP TO 100%\n");
              } else {
                var endloc = nextInstruction();
                for (var n=1;n<events.length;n++) {
                  addInstructionAt(events[n].loc-1, function() {
                    machine.setLoc(endloc);
                  });
                }
                addInstructionAt(obj.loc, function () {
                  var r = Math.random()*100;
                  for (var n=0;n<events.length;n++) {
                    r -= events[n].chance;
                    if (r<0 || n == events.length-1) {
                      machine.setLoc(events[n].loc);
                      break;
                    }
                  }
                });
              }
            }
          }
          return true;
        },
        withChance: function(percent, num) {
          var obj = loopStack[loopStack.length-1];
          if ((!obj) || obj.type !== RANDOM) {
            display.print("ERROR: WITH CHANCE WITHOUT MATCHING BEGIN RANDOM\n");
          } else {
            if (obj.events.length === 0 && nextInstruction() !== obj.loc+1) {
              display.print("ERROR: NO CODE ALLOWED BETWEEN BEGIN RANDOM AND FIRST WITH CHOICE\n");
            } else {
              if (percent === undefined) {
                if (obj.events.length > 0) // Leave room for the jump to the end
                  pushInstruction(null);
                obj.events.push({loc:nextInstruction(),
                                 chance:null});
                
              } else {
                var chance = Number(percent);
                if (chance < 0.001 || chance > 99.999) {
                  display.print("ERROR: CHANCES MUST BE BETWEEN 0 and 100\n");
                } else {
                  if (obj.events.length > 0) // Leave room for the jump to the end
                    pushInstruction(null);
                  obj.events.push({loc:nextInstruction(),
                                   chance:chance});
                }
              }
            }
          }
          return true;
        },
        withEvenChance: function(num) {
          this.withChance(undefined,num);
          return true;
        },
        beginAsk: function(prompt,num) {
          if (!prompt) {
            display.print("Invalid ASK statement line "+num+"\n");
            return false;
          }
          var top = nextInstruction();
          prompt = this._expressionToFunction(prompt);
          loopStack.push({type:ASK,
                                  prompt:prompt,
                                  color:[255,255,85],
                                  promptColor:[85,255,255],
                                  bgColor:[0,0,0],
                                  noloc:null,
                                  defaultValue:null,
                                  top:top,
                                  loc:nextInstruction()});
          pushInstruction(null); // Save space for prompt
          pushInstruction(null);
          return true;
        },
        askColor: function(color,num) {
          var c = intToColor(color);
          if (c === null) {
            display.print("INVALID ASK COLOR\n");
            return false;
          }
          if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== ASK) {
            display.print("ASK COLOR OUTSIDE OF AN ASK\n");
            return false;
          }
          if (loopStack[loopStack.length-1].loc !== nextInstruction()-2) {
            display.print("ASK COLOR AFTER CODE\n");
            return false;
          }
          loopStack[loopStack.length-1].color = c;
          return true;
        },
        askBGColor: function(color,num) {
          var c = intToColor(color);
          if (c === null) {
            display.print("INVALID ASK BGCOLOR\n");
            return false;
          }
          if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== ASK) {
            display.print("ASK BGCOLOR OUTSIDE OF AN ASK\n");
            return false;
          }
          if (loopStack[loopStack.length-1].loc !== nextInstruction()-2) {
            display.print("ASK BGCOLOR AFTER CODE\n");
            return false;
          }
          loopStack[loopStack.length-1].bgColor = c;
          return true;
        },
        askPromptColor: function(color,num) {
          var c = intToColor(color);
          if (c === null) {
            display.print("INVALID ASK PROMPT COLOR\n");
            return false;
          }
          if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== ASK) {
            display.print("ASK PROMPT COLOR OUTSIDE OF AN ASK\n");
            return false;
          }
          if (loopStack[loopStack.length-1].loc !== nextInstruction()-2) {
            display.print("ASK PROMPT COLOR AFTER CODE\n");
            return false;
          }
          loopStack[loopStack.length-1].promptColor = c;
          return true;
        },
        onNo: function(num) {
          var ask = loopStack[loopStack.length-1];
          if (ask && ask.type === ASK) {
            ask.noLoc = nextInstruction();
            pushInstruction(null);
          } else {
            display.print("ON NO outside of an ASK\n");
            return false;
          }
          return true;
        },
        onYes: function(num) {
          var ask = loopStack[loopStack.length-1];
          if (ask && ask.type === ASK) {
            if (loopStack[loopStack.length-1].loc !== nextInstruction()-2) {
              display.print("ASK ON YES AFTER CODE\n");
              return false;
            }
          } else {
            display.print("ON YES outside of an ASK\n");
            return false;
          }
          return true;
        },
        askDefault: function(value,num) {
          if (value !== true && value !== false) {
            display.print("INVALID ASK DEFAULT\n");
            return false;
          }
          if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== ASK) {
            display.print("DEFAULT OUTSIDE OF AN ASK\n");
            return false;
          }
          if (loopStack[loopStack.length-1].loc !== nextInstruction()-2) {
            display.print("ASK DEFAULT AFTER CODE\n");
            return false;
          }
          loopStack[loopStack.length-1].defaultValue = value;
          return true;
        },
        endAsk: function(num) {
          var ask = loopStack.pop();
          if (ask && ask.type === ASK) {
            var noLoc = nextInstruction();
            if (ask.noLoc) {
              var nextI = nextInstruction();
              addInstructionAt(ask.noLoc,function(){
                machine.setLoc(nextI);
              });
              noLoc = ask.noLoc+1;
            }
            var prompt = ask.prompt;
            var top = ask.top;
            addInstructionAt(ask.loc, function(){
              display.printAsk(prompt,ask.defaultValue,ask.color,ask.bgColor,ask.promptColor);
              machine._interruptDelay = 0;
              machine._inputVariable = "!"; // Invalid as an identifier
              machine.advance();
            });
            addInstructionAt(ask.loc+1, function(){
              if (machine._vars["!"]!==null) {
                if (machine._vars["!"].length>0) {
                  var key=machine._vars["!"].toUpperCase()[0];
                  if (key === "Y") {
                    machine.advance();
                    return;
                  } else if (key === "N") {
                    machine.setLoc(noLoc);
                    return;
                  }
                } else {
                  if (ask.defaultValue === true) {
                    machine.advance();
                    return;
                  } else if (ask.defaultValue === false) {
                    machine.setLoc(noLoc);
                    return;
                  }
                }
              }
              machine.setLoc(top);
            });
          } else {
            display.print("END ASK WITHOUT ASK\n");
	    return false;
          }
          return true;
        },
        beginMenu: function(prompt,num) {
          if (!prompt) {
            display.print("Invalid MENU statement line "+num+"\n");
            return false;
          }
          loopStack.push({type:MENU,
                                  color:[255,255,85],
                                  choiceColor:[255,255,255],
                                  promptColor:[85,255,255],
                                  bgColor:[0,0,0],
                                  choices:[],
                                  prompt:prompt,
                                  loc:nextInstruction()});
          pushInstruction(null); // Goto subroutines and setup
          pushInstruction(null); // Display menu and throw interrupt
          pushInstruction(null); // process response
          return true;
        },
        menuColor: function(color,num) {
          var c = intToColor(color);
          if (c === null) {
            display.print("INVALID MENU COLOR\n");
            return false;
          }
          if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== MENU) {
            display.print("MENU COLOR OUTSIDE OF A MENU\n");
            return false;
          }
          if (loopStack[loopStack.length-1].choices.length > 0) {
            display.print("MENU COLOR AFTER CHOICE\n");
            return false;
          }
          loopStack[loopStack.length-1].color = c;
          return true;
        },
        menuBGColor: function(color,num) {
          var c = intToColor(color);
          if (c === null) {
            display.print("INVALID MENU BGCOLOR\n");
            return false;
          }
          if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== MENU) {
            display.print("MENU BGCOLOR OUTSIDE OF A MENU\n");
            return false;
          }
          if (loopStack[loopStack.length-1].choices.length > 0) {
            display.print("MENU BGCOLOR AFTER CHOICE\n");
            return false;
          }
          loopStack[loopStack.length-1].bgColor = c;
          return true;
        },
        menuChoiceColor: function(color,num) {
          var c = intToColor(color);
          if (c === null) {
            display.print("INVALID MENU CHOICE COLOR\n");
            return false;
          }
          if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== MENU) {
            display.print("MENU CHOICE COLOR OUTSIDE OF A MENU\n");
            return false;
          }
          if (loopStack[loopStack.length-1].choices.length > 0) {
            display.print("MENU CHOICE COLOR AFTER CHOICE\n");
            return false;
          }
          loopStack[loopStack.length-1].choiceColor = c;
          return true;
        },
        menuPromptColor: function(color,num) {
          var c = intToColor(color);
          if (c === null) {
            display.print("INVALID MENu PROMPT COLOR\n");
            return false;
          }
          if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== MENU) {
            display.print("MENU PROMPT COLOR OUTSIDE OF A MENU\n");
            return false;
          }
          if (loopStack[loopStack.length-1].choices.length > 0) {
            display.print("MENU PROMPT COLOR AFTER CHOICE\n");
            return false;
          }
          loopStack[loopStack.length-1].promptColor = c;
          return true;
        },
        endMenu: function(num) {
          /* Subroutine expressions are tricky for menus.

             Subroutine expressions require adding instructions to
             call the subroutine before the instruction using the
             expression function.

             We don't know what those subroutines are until we get to
             the end of the menu.

             The strategy is to put the subroutine calls at the end,
             start the menu with a jump to those calls, and
             follow the calls with a jump back to the second
             instruction in the menu.

             Another strategy might be to stuff all the calls into the
             first instruction and avoid the jumps.
             
          */
          var menu = loopStack.pop();
          if (menu && menu.type === MENU) {
            var lastMenuI = nextInstruction();
            pushInstruction(null); // replace with
                                           // setLoc(newI); so last
                                           // choice continues past
                                           // the menu
            var choiceText = [];
            var choiceKeys = [];
            var hideConditions = [];
            for (var n=0;n<menu.choices.length;n++) {
              choiceText.push(this._expressionToFunction(menu.choices[n].exp));
              choiceKeys.push(menu.choices[n].key);
              if (menu.choices[n].hideIf) {
                hideConditions.push(this._expressionToFunction(menu.choices[n].hideIf));
              } else {
                hideConditions.push(function(){return false;});
              }
            }
            var prompt = this._expressionToFunction(menu.prompt);
            pushInstruction(function(){
              machine.setLoc(menu.loc+1);
            });
            addInstructionAt(menu.loc+1, function(){
              var filteredText = [];
              var filteredKeys = [];
              for (var n=0;n<hideConditions.length;n++) {
                if (!hideConditions[n]()) {
                  filteredText.push(choiceText[n]);
                  filteredKeys.push(choiceKeys[n]);
                }
              }
              display.printMenu(filteredText,filteredKeys,prompt,menu.color,menu.bgColor,menu.promptColor,menu.choiceColor);
              machine._interruptDelay = 0;
              machine._inputVariable = "!"; // Invalid as an identifier
              machine.advance();
            });
            addInstructionAt(menu.loc+2, function(){
              for (var n=0;n<menu.choices.length;n++){
                if (!hideConditions[n]()) {
                  if (machine._vars["!"] && machine._vars["!"].toUpperCase() == menu.choices[n].key) {
                    machine.setLoc(menu.choices[n].loc);
                    return;
                  }
                }
              }
              machine.retreat();
            });
            
            addInstructionAt(menu.loc,function(){
              machine.setLoc(lastMenuI+1);
            });
            var newI = nextInstruction();
            for (var n=1;n<menu.choices.length;n++) {
              addInstructionAt(menu.choices[n].loc-1, function(){
                machine.setLoc(newI);
              });
            }
            addInstructionAt(lastMenuI, function(){
              machine.setLoc(newI);
            });
          } else {
            display.print("END MENU WITHOUT BEGIN MENU\n");
	    return false;
          }
          return true;
        },
        menuChoice: function(key,exp1,num) {
          if (loopStack[loopStack.length-1] && loopStack[loopStack.length-1].type === MENU) {
            if (loopStack[loopStack.length-1].choices.length > 0)
              pushInstruction(null); // Replace with goto end
            loopStack[loopStack.length-1].choices.push({key:key,
                                                                        exp:exp1,
                                                                        loc:nextInstruction()});
          } else {
            // XXX handle errors
            display.print("CHOICE OUTSIDE OF A MENU\n");
	    return false;
          }
          return true;
        },
        menuHideIf: function(boolExp,num) {
          if (!boolExp) {
            display.print("Invalid HIDE IF on line "+num+"\n");
            return false;
          }
          if (!loopStack[loopStack.length-1] || loopStack[loopStack.length-1].type !== MENU) {
            display.print("HIDE IF OUTSIDE OF A MENU\n");
            return false;
          }
          var choices = loopStack[loopStack.length-1].choices;
          if (choices.length === 0) {
            display.print("HIDE IF found before CHOICE\n");
            return false;
          }
          if (choices[choices.length-1].loc !== nextInstruction()) {
            display.print("HIDE IF does not immediately follow CHOICE\n");
            return false;
          }
          if (choices[choices.length-1].hideIf) {
            display.print("Multiple HIDE IFs for single CHOICE\n");
            return false;
          }
          choices[choices.length-1].hideIf = boolExp;
 
          return true;
          
        },
        color: function(exp,num) {
          var color = this._expressionToFunction(exp);
          pushInstruction(function(){
            display.setColor(color());
            machine.advance();
          });
          return true;
        },
        bgColor: function(c,num) {
          var color = this._expressionToFunction(c);
          pushInstruction(function(){
            display.setBGColor(color());
            machine.advance();
          });
          return true;
        },
        sleep: function(duration,num) {
          if (!duration) {
            display.print ("Invalid SLEEP on line "+num+"\n");
            return false;
          }
          duration = this._expressionToFunction(duration);
          pushInstruction(function() {
            machine.advance();
            machine._interruptDelay = duration();
          });
          return true;
        },
        input: function(varname,num) {
          if (varTypes[varname] === undefined) {
            display.print(varname+" undefined in INPUT\n");
            return;
          }
          pushInstruction(function() {
            machine._interruptDelay = 0;
            machine._inputVariable = varname;
            machine.advance();
          });
          return true;
        },
        play: function(abc,num) {
	  if (!abc) {
	    display.print("Invalid PLAY on line "+num+"\n");
	    return false;
	  }
	  var notes = this._expressionToFunction(abc);
          pushInstruction(function() {
	    audio.play(notes());
            machine.advance();
          });
          return true;
        },
        forStatement: function(varname,first,last,num) {
          if (!first || !last) {
            display.print("what the FOR on line "+num+"\n");
            return false;
          }
          //addFor: function(varname,first,last) {
          if (varTypes[varname] === undefined) {
            display.print(varname+" undefined in FOR\n");
            return;
          }
          
          first = this._expressionToFunction(first);
          last = this._expressionToFunction(last);

          pushInstruction(null); // Fill it in when we get the NEXT
          loopStack.push({type:FOR,varname:varname,
                                  last:last,
                                  first:first,
                                  top:nextInstruction()});

          return true;
        },
        letStatement: function(varname,exp,num) {
          if (!varname) {
            display.print ("Invalid expression assigned to "+varname+" on line "+num+"\n");
            return false;
          }
          if (varTypes[varname] === undefined) {
            display.print(varname+" undefined in assignment\n");
            return;
          }
          var value = this._expressionToFunction(exp);
          pushInstruction(function() {
            machine._vars[varname] = value();
            machine.advance();
          });
          return true;
        },
        comment: function(tokens, num) {
          return true;
        },
        clear: function(num) {
          pushInstruction(function(){
            display.clear();
            machine.advance();
            // Give up the CPU to allow display
            machine._interruptDelay = 0;
          });
          return true;
        },
        next: function(varExp,num) {
          var varname = varExp[0].value;
          var obj = loopStack.pop();
          if ((!obj) || obj.type !== FOR || varname != obj.varname) {
            display.print("ERROR: NEXT WITHOUT MATCHING FOR\n");
          } else {
            var first = obj.first;
            var last = obj.last;
            pushInstruction(function(){
              if (machine._vars[varname]>=last()){
                machine.advance();
              } else {
                machine._vars[varname]++;
                machine.setLoc(obj.top);
              }
            });
            var after = nextInstruction();
            addInstructionAt(obj.top-1,function(){
              machine._vars[obj.varname] = first();
              if (machine._vars[obj.varname]<=last()){
                machine.advance()
              } else {
                machine._vars[obj.varname]++;
                machine.setLoc(after);
              }
            });
          }
          return true;
        }
      };
  }()
};
}(globalDisplay, machine);

/***********************************************************************
  END Codegen class
***********************************************************************/

/***********************************************************************
  BEGIN Compiler class
***********************************************************************/

  // XXX Pass error handler into the compile() function?

  var compiler = function(display,codegen){
    var started = false;
    var finished = false;
    var pass = null;
    return {
    started: false,
    finished: false,
    tokenizeLine:function(line) {
      var minlow='a'.charCodeAt(0);
      var maxlow='z'.charCodeAt(0);
      var mincap='A'.charCodeAt(0);
      var maxcap='Z'.charCodeAt(0);
      var minnum='0'.charCodeAt(0);
      var maxnum='9'.charCodeAt(0);
      var dolla='$'.charCodeAt(0);
      var unda='_'.charCodeAt(0);
      var dot='.'.charCodeAt(0);
      var validIdChar = function (p) {
        p = p.charCodeAt(0);
        return ((maxlow >= p && p>=minlow) ||
                (maxcap >= p && p>=mincap) ||
                (p === dolla) ||
                (p === unda));
      };
      var validDigit = function (p) {
        p = p.charCodeAt(0);
        return (maxnum >= p && p>=minnum);
      }
      var validNumericChar = function (p) {
        if (validDigit(p))
          return true;
        p = p.charCodeAt(0);
        return (p===dot);
      }
      var tokens=[];
      var pos=0;
      while (pos<line.length) {
        // skip whitespace
        while (pos<line.length &&
               (line[pos]===' ' || line[pos]==='\t'))
          pos++;
        if (pos>=line.length)
          break;

        // Ignore nonsense on a comment line
        if (tokens.length > 0 && (tokens[0].value==='REM' || tokens[0].value==='\'')) {
          pos=line.length;
          break;
        }

        // there's a string
        if (line[pos] === '"') {
          pos++;
          var s="";
          while (pos<line.length && (line[pos]!='"' ||
                                     (pos<line.length-1 && line[pos]==='\"' && line[pos+1]==='\"')))
          {
            if (line[pos] === '\"') {
              pos+=2;
              if (pos>=line.length) {
                display.print("Parser Error: Unterminated string\n");
                return null;
              }
              s+="\"";
            } else {
              s += line[pos];
              pos++;
            }
          }
          if (line[pos] !== '"') {
            display.print("Parser Error: Unterminated string\n");
            return null;
          }
          pos++;
          tokens.push({type:STRING,value:s});
        } else if (validIdChar(line[pos])) {
          var i="";
          // Digits are valid in IDs after the first character
          while (pos<line.length && (validIdChar(line[pos]) || validDigit(line[pos]))) {
            i += line[pos];
            pos++;
          }
          tokens.push({type:IDENTIFIER,value:i.toUpperCase()});
        } else if (validNumericChar(line[pos])) {
          var seenDot = false;
          var n = "";
          while (pos<line.length && validNumericChar(line[pos]) &&
                 !(seenDot && line[pos]==='.')) {
            n += line[pos];
            if (line[pos]==='.')
              seenDot = true;
            pos++;
          }
          while(n.length>1 && n[0]==="0") {
            n = n.substring(1);
          }
          tokens.push({type:NUMERIC,value:n});
        } else if (line[pos] === '=') {
          var c='=';
          pos++;
          if (pos<line.length && line[pos] === '=') {
            c='==';
            pos++;
          }
          tokens.push({type:EQUALS,value:c});
        } else if (line[pos] === ':') {
          pos++;
          tokens.push({type:COLON,value:':'});
        } else if (line[pos] === ';') {
          pos++;
          tokens.push({type:SEMICOLON,value:';'});
        } else if (line[pos] === '+') {
          pos++;
          tokens.push({type:PLUS,value:'+'});
        } else if (line[pos] === '\'') {
          pos++;
          tokens.push({type:SINGLEQUOTE,value:'\''});
        } else if (line[pos] === '-') {
          pos++;
          tokens.push({type:MINUS,value:'-'});
        } else if (line[pos] === '*') {
          pos++;
          tokens.push({type:TIMES,value:'*'});
        } else if (line[pos] === '/') {
          pos++;
          tokens.push({type:DIV,value:'/'});
        } else if (line[pos] === '(') {
          pos++;
          tokens.push({type:OPENPAREN,value:'('});
        } else if (line[pos] === ')') {
          pos++;
          tokens.push({type:CLOSEPAREN,value:')'});
        } else if (line[pos] === ',') {
          pos++;
          tokens.push({type:COMMA,value:','});
        } else if (line[pos] === '>') {
          pos++;
          if (pos<line.length && line[pos] === '=') {
            pos++;
            tokens.push({type:GREATEROREQUAL,value:'>='});
          } else {
            tokens.push({type:GREATER,value:'>'});
          }
        } else if (line[pos] === '<') {
          pos++;
          if (pos<line.length && line[pos] === '=') {
            pos++;
            tokens.push({type:LESSOREQUAL,value:'<='});
          } else if (pos<line.length && line[pos] === '>') {
            pos++;
            tokens.push({type:NOTEQUAL,value:'<>'});
          } else {
            tokens.push({type:LESS,value:'<'});
          }
        } else if (line[pos] === '!') {
          pos++;
          if (pos<line.length && line[pos] === '=') {
            pos++;
            tokens.push({type:NOTEQUAL,value:'!='});
          } else {
            tokens.push({type:NOT,value:'!'});
          }
        } else {
          return null;
        }
      }
      return tokens;
    },

    parseExpressionWithHandler: function(tokens,handler) {
      function subExpression(tokens,type) {
        var exp = compiler.parseExpressionWithHandler(tokens,handler);
        return handler.validateSubExpression(exp,type);
      };
      if (tokens.length === 0) {
        return null;
      } else if (tokens.length === 1) {
        if (tokens[0].type===NUMERIC){
          return handler.numericLiteral(tokens[0].value);
        } else if (tokens[0].type===STRING){
          // silently truncate long strings
          if (tokens[0].value.length>255)
            tokens[0].value=tokens[0].value.slice(0,255);
          return handler.stringLiteral(tokens[0].value);
        } else if (tokens[0].type===IDENTIFIER) {
          if (tokens[0].value==='PI') {
            return handler.piBuiltin();
          } else {
            return handler.variable(tokens[0].value);
          }
        } else if (tokens[0].type===EXPRESSION) {
          return handler.expression(tokens[0].value,tokens[0].resultType,tokens[0].subs);
        } else {
          // Something doesn't make sense
          return null;
        }
        // Predefined functions
        // XXX add isPredefinedFunction() instead of listing them all
      } else if (tokens.length >= 3 && tokens[0].type===IDENTIFIER &&
                 tokens[1].type===OPENPAREN && (['ABS','CINT','FIX','INT','LEFT$','LEN','RIGHT$','STR$','VAL','RANDOM'].indexOf(tokens[0].value)!=-1)) {
        // Find the matching paren
        var i;
        var depth = 1;
        for (i=2;i<tokens.length&&depth>0;i++) {
          if (tokens[i].type===CLOSEPAREN)
            depth--;
          else if (tokens[i].type===OPENPAREN) {
            depth++;
          }
        }
        // No closing paren
        if (depth >= tokens.length) {
          return null;
        }
        var paramTypes;
        var paramExp;
        if (['LEFT$','RIGHT$','RANDOM'].indexOf(tokens[0].value)!=-1) {
          // 2 params
          if (tokens[0].value === 'RANDOM')
            paramTypes = [NUMERIC,NUMERIC];
          else
            paramTypes = [STRING,NUMERIC];
          var j;
          var parenCount = 0;
          for (j=1;j<i && tokens[j].type !== COMMA || parenCount !== 1;j++) {if (tokens[j].type===OPENPAREN) parenCount++;if (tokens[j].type===CLOSEPAREN) parenCount--;}
          paramExp = [subExpression(tokens.slice(2,j),paramTypes[0]),
                      subExpression(tokens.slice(j+1,i-1),paramTypes[1])];
        } else {
          // Single param
          paramTypes = (['LEN','VAL'].indexOf(tokens[0].value)!=-1)?[STRING]:[NUMERIC];
          paramExp = [subExpression(tokens.slice(2,i-1),paramTypes[0])];
        }
        for (var p=0;p<paramExp.length;p++) {
          if (paramExp[p]===null) {
            return null;
          }
        }
        // XXX Consider adding MID$()
        // MID$(x$,n[,m]) To return a string of m characters from x$ beginning with the nth character. n >= 1 - MID$(x$,1,n) is LEFT$(x$,n)

        var head;
        if (tokens[0].value === 'ABS') {
          head = handler.absBuiltin(paramExp[0]);
        } else if (tokens[0].value === 'CINT') {
          head = handler.cintBuiltin(paramExp[0]);
        } else if (tokens[0].value === 'FIX') {
          head = handler.fixBuiltin(paramExp[0]);
        } else if (tokens[0].value === 'INT') {
          head = handler.intBuiltin(paramExp[0]);
        } else if (tokens[0].value === 'LEN') {
          head = handler.lenBuiltin(paramExp[0]);
        } else if (tokens[0].value === 'STR$') {
          head = handler.strzBuiltin(paramExp[0]);
        } else if (tokens[0].value === 'VAL') {
          head = handler.valBuiltin(paramExp[0]);
        } else if (tokens[0].value === 'LEFT$') {
          head = handler.leftzBuiltin(paramExp[0],paramExp[1]);
        } else if (tokens[0].value === 'RIGHT$') {
          head = handler.rightzBuiltin(paramExp[0],paramExp[1]);
        } else if (tokens[0].value === 'RANDOM') {
          head = handler.randomBuiltin(paramExp[0],paramExp[1]);
        }
        
        // There is nothing following this function
        if (i == tokens.length) {
          return head;
          // There is a binary operator following this function
        } else if (tokens[i].type === PLUS ||tokens[i].type === MINUS ||
                   tokens[i].type === TIMES || tokens[i].type === DIV) {
          var tail = compiler.parseExpressionWithHandler(tokens.slice(i+1),handler);
          if (tail === null) {
            return null;
          }
          return handler.binaryExpression(tokens[i].type,head,tail);      
        } else {
          // Invalid expression
          return null;
        }
      } else if (tokens[0].value==='CALL' && tokens[0].type===IDENTIFIER && tokens.length >= 2 && tokens[1].type === IDENTIFIER) {
        // XXX this is duplicated in the statement handler
        var argExps = [];
        var start = 2;
        var pos = start;
	var parendepth = 0;
        while (pos < tokens.length) {
          while (pos < tokens.length && (tokens[pos].type !== COMMA || parendepth > 0)) {
	    if (tokens[pos].type === OPENPAREN)
	      parendepth++;
	    if (tokens[pos].type === CLOSEPAREN)
	      parendepth--;
            pos++;
	  }
          var type = codegen.argType(tokens[1].value,argExps.length);
          argExps.push(subExpression(tokens.slice(start,pos),type));
          pos++; // skip the comma
          start = pos;
        }
        return handler.callSubroutine(tokens[1].value,argExps);

      } else if (tokens.length >= 2 && tokens[0].type===PLUS && tokens[1].type===NUMERIC) {
        // A numeric expression starting with plus
        return subExpression(tokens.slice(1,tokens.length),NUMERIC);
      } else if (tokens.length >= 2 && tokens[0].type===MINUS && tokens[1].type===NUMERIC) {
        // A numeric expression starting with minus
        return subExpression([{type:NUMERIC,value:("-"+tokens[1].value)}].concat(tokens.slice(2,tokens.length)),NUMERIC);
      } else if (tokens[0].type===OPENPAREN) {
        var openparens=1;
        var pos = 1;
        while (pos<tokens.length && openparens>0) {
          if (tokens[pos].type===OPENPAREN) {
            openparens++;
          } else if (tokens[pos].type===CLOSEPAREN) {
            openparens--;
          }
          pos++;
        }
        if (pos===tokens.length && tokens[pos-1].type!==CLOSEPAREN) {
          return null;
        }
        var result = handler.parenExpression(compiler.parseExpressionWithHandler(tokens.slice(1,pos-1),handler));
        // we're done - the whole thing was in parens
        // or what's in the parens is bad
        if (pos==tokens.length || result === null)
          return result;
        
        // There's a binary operator after this
        if (tokens[pos].type === MINUS ||
            tokens[pos].type === TIMES || tokens[pos].type === DIV) {
          var tail = subExpression(tokens.slice(pos+1,tokens.length),NUMERIC);
          if (tail === null)
            return null;
          else
            return handler.binaryExpression(tokens[pos].type,result,tail);
        } else if (tokens[pos].type === PLUS) {
          var tail = compiler.parseExpressionWithHandler(tokens.slice(pos+1,tokens.length),handler);
          if (tail===null)
            return null;
          return handler.binaryExpression(tokens[pos].type,
                                          result,
                                          tail);
        } else {
          return null;
        }

        // This is a + expression starting with an identifier
      } else if (tokens[1].type === PLUS || tokens[1].type === MINUS ||
                 tokens[1].type === TIMES || tokens[1].type === DIV) {
        if (tokens[1].type === PLUS) {
          var head = compiler.parseExpressionWithHandler([tokens[0]],handler);
          if (head===null)
            return null;
          var tail = compiler.parseExpressionWithHandler(tokens.slice(2,tokens.length),handler);
          if (tail===null)
            return null;
          return handler.binaryExpression(tokens[1].type,
                                          head,
                                          tail);
        } else {
          var head = subExpression([tokens[0]],NUMERIC);
          if (head===null)
            return null;
          var tail = subExpression(tokens.slice(2,tokens.length),NUMERIC);
          if (tail===null)
            return null;
          return handler.binaryExpression(tokens[1].type,head,tail);
          
        }
      } else {
        // Something unrecognized
        return null;
      }      
    },
    parseLine: function(line,num) {
      var tokens = compiler.tokenizeLine(line);
      if (!tokens) {
        display.print("Could not parse line "+num);
        return false;
      }
      if (pass === 1) {
        return compiler.parseLineWithHandler(codegen.typeGeneratorPass,tokens,num);
      } else if (pass === 2) {
        return compiler.parseLineWithHandler(codegen.codeGeneratorPass,tokens,num);
      } else {
        // XXX die gracefully
        throw "parse failed";
      }
    },
    parseLineWithHandler: function(handler,tokens,num) {
      function expression(tokens) {
        return compiler.parseExpressionWithHandler(tokens,handler.expressionHandler);
      };
      function boolExpression(tokens) {
        // Given tokens for a boolean expression, return
        // bool expression

        function _boolExpression(tokens, handler) {
          // Generate a bool expression from tokens

          // The smallest possible bool expression is
          // three tokens: literal operator literal
          if (tokens.length < 3)
            return null;
          if (tokens[0].type === IDENTIFIER && tokens[0].value === 'NOT') {
            var result = _boolExpression(tokens.slice(1,tokens.length),handler);
            if (!result) {
              return null;
            }
            return handler.boolNotExpression(result);
          } else if (tokens[0].type === OPENPAREN) {
            var openparens=1;
            var pos = 1;
            var isBoolParen = false;
            while (pos<tokens.length && openparens>0) {
              if (tokens[pos].type===OPENPAREN) {
                openparens++;
              } else if (tokens[pos].type===CLOSEPAREN) {
                openparens--;
              } else if (tokens[pos].type === EQUALS ||
                         tokens[pos].type === NOTEQUAL ||
                         tokens[pos].type === LESS ||
                         tokens[pos].type === GREATER ||
                         tokens[pos].type === LESSOREQUAL ||
                         tokens[pos].type === GREATEROREQUAL) {
                isBoolParen = true;
              }
              pos++;
            }
            
            if (pos===tokens.length && tokens[pos-1].type!==CLOSEPAREN) {
              return null;
            }
            if (isBoolParen){ 
              var result = _boolExpression(tokens.slice(1,pos-1),handler);
              if (!result) {
                return null;
              }
              var exp1 = handler.boolParenExpression(result);
              if (pos < tokens.length && tokens[pos].type === IDENTIFIER) {
                var exp2 = _boolExpression(tokens.slice(pos+1,tokens.length),handler);
                if (!exp2) {
                  return null
                }
                if (tokens[pos].value === 'AND') {
                  return handler.boolAndExpression(exp1,exp2);
                } else if (tokens[pos].value === 'OR') {
                  return handler.boolOrExpression(exp1,exp2);
                }
              }
              return exp1;
            }
            // fall through if this isn't a bool paren expression
          }
          var pos = 0;
          var endpos;
          while (pos<tokens.length && tokens[pos].type !== EQUALS &&
                 tokens[pos].type !== NOTEQUAL &&
                 tokens[pos].type !== LESS &&
                 tokens[pos].type !== GREATER &&
                 tokens[pos].type !== LESSOREQUAL &&
                 tokens[pos].type !== GREATEROREQUAL) {
            pos++;
          }
          if (pos === tokens.length) {
            
            display.print("No comparison operator on line "+num+"\n");
            return null;
          }
          endpos = pos+1;
          while (endpos<tokens.length && !(tokens[endpos].type === IDENTIFIER &&
                                           (tokens[endpos].value === "AND" || tokens[endpos].value === "OR")))
          {
              endpos++;
          }
          var exp1=expression(tokens.slice(0,pos));
          var exp2=expression(tokens.slice(pos+1,endpos));
          if (!exp1 || !exp2)
            return null;
          exp1 =  handler.boolBinaryExpression(exp1,tokens[pos],exp2);
          // Handle a binary operator
          if (endpos !== tokens.length) {
            if (tokens[endpos].value !== "AND" && tokens[endpos].value !== "OR") {
              return null;
            }
            
            exp2 = boolExpression(tokens.slice(endpos+1,tokens.length));
            if (!exp2)
              return null;
            else {
              if (tokens[endpos].value === "AND")
                return handler.boolAndExpression(exp1,exp2);
              else // OR
                return handler.boolOrExpression(exp1,exp2);
              }
          } else {
            return exp1;
          }
        }

        var result = _boolExpression(tokens, handler.expressionHandler);
        if (!result)
          return null;
        else
          return result;
          
      }
      
      if (!started && tokens.length>0) {
        started = true;
        if (tokens.length>=4 && tokens[0].type===LESS && tokens[1].type===NOT && tokens[2].type===MINUS && tokens[3].type===MINUS ) {
          tokens = tokens.slice(4);
        }
      }
      if (tokens.length>0 && !finished) {
        if (tokens[0].type===IDENTIFIER) {
          if (tokens[0].value==='PRINT' || tokens[0].value==='PAUSE') {
            var pause = (tokens[0].value==='PAUSE');
            var newline = true;
            if (tokens[tokens.length-1].type === SEMICOLON) {
              tokens = tokens.slice(0,tokens.length-1);
              newline=false;
            }
            tokens = tokens.slice(1,tokens.length);
            if (tokens.length === 0) {
              return handler.printString("",newline,pause,num);
            } else if (tokens.length === 1 && tokens.type === STRING)
              return handler.printString(tokens[0].value,newline,pause,num);
            else
              return handler.printExp(expression(tokens),newline,pause,num);
          } else if (tokens[0].value==='REM') {
            return handler.comment(tokens.slice(1,tokens.length));
          } else if (tokens[0].value==='CLS') {
            return handler.clear(num);
          } else if (tokens[0].value==='NEXT') {
            if (tokens.length !== 2) {
              return false;
            } else {
              return handler.next([tokens[1]],num);
            }
          } else if (tokens[0].value==='IF') {
            var exp2end;
            if (tokens[tokens.length-1].type===IDENTIFIER &&
                tokens[tokens.length-1].value==='THEN')
              exp2end = tokens.length-1;
            else
              exp2end = tokens.length;

            var boolExp = boolExpression(tokens.slice(1,exp2end));
            if (!boolExp) {
              display.print("Invalid IF on line "+num+"\n");
              return false;
            }
            return handler.ifStatement(boolExp, num);

	  } else if (tokens[0].value==='WAIT' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[2].type === IDENTIFIER && tokens[1].value==='FOR' && tokens[2].value==='MUSIC') {
	    return handler.waitForMusic();
          } else if (tokens[0].value==='BEGIN' && tokens.length === 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'RANDOM') {
            return handler.beginRandom(num);
            
          } else if (tokens[0].value==='SUBROUTINE' && tokens.length >= 2 && tokens[1].type === IDENTIFIER) {
            var args = [];
            var pos = 2;
            while (pos < tokens.length) {
              if (tokens[pos].type === IDENTIFIER)
                args.push(tokens[pos].value);
              else
                return false;
              pos++;
              if (pos < tokens.length) {
                if (tokens[pos].type === COMMA) {
                  pos++;
                } else {
                  return false;
                }
              }
            }
            return handler.beginSubroutine(tokens[1].value,args,num);
          } else if (tokens[0].value==='CALL' && tokens.length >= 2 && tokens[1].type === IDENTIFIER) {
	    // XXX this is duplicated in the expression handler
            var argExps = [];
            var start = 2;
            var pos = start;
	    var parendepth = 0;
            while (pos < tokens.length) {
	      while (pos < tokens.length && (tokens[pos].type !== COMMA || parendepth > 0)) {
		if (tokens[pos].type === OPENPAREN)
		  parendepth++;
		if (tokens[pos].type === CLOSEPAREN)
		  parendepth--;
		pos++;
	      }

              argExps.push(expression(tokens.slice(start,pos)));
              pos++; // skip the comma
              start = pos;
            }
            return handler.callSubroutine(tokens[1].value,argExps,num);

          } else if (tokens[0].value==='END' && tokens.length == 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'SUBROUTINE') {
            return handler.endSubroutine(num);

          } else if (tokens[0].value==='RETURN' && tokens.length >= 2) {
            return handler.returnStatement(expression(tokens.slice(1,tokens.length)),num);

          } else if (tokens[0].value==='END' && tokens.length == 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'RANDOM') {
            return handler.endRandom(num);
            
          } else if (tokens[0].value==='WITH' && tokens.length == 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'CHANCE' && tokens[2].type === NUMERIC) {
            return handler.withChance(tokens[2].value,num);
            
          } else if (tokens[0].value==='WITH' && tokens.length == 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'CHANCE') {
            return handler.withEvenChance(num);

          } else if (tokens[0].value==='ASK' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'COLOR' && tokens[2].type === NUMERIC) {
            return handler.askColor(tokens[2].value,num);

          } else if (tokens[0].value==='ASK' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'BGCOLOR' && tokens[2].type === NUMERIC) {
            return handler.askBGColor(tokens[2].value,num);

          } else if (tokens[0].value==='ASK' && tokens.length === 4 && tokens[1].type === IDENTIFIER && tokens[1].value === 'PROMPT' && tokens[2].type === IDENTIFIER && tokens[2].value === 'COLOR' && tokens[3].type === NUMERIC) {
            return handler.askPromptColor(tokens[3].value,num);
            
          } else if (tokens[0].value==='ASK' && tokens.length >= 2) {
            return handler.beginAsk(expression(tokens.slice(1,tokens.length)),num);

          } else if (tokens[0].value==='DEFAULT' && tokens.length === 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'NO') {
            return handler.askDefault(false,num);

          } else if (tokens[0].value==='DEFAULT' && tokens.length === 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'YES') {
            return handler.askDefault(true,num);

          } else if (tokens[0].value==='ON' && tokens.length === 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'NO') {
            return handler.onNo(num);

          } else if (tokens[0].value==='ON' && tokens.length === 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'YES') {
            return handler.onYes(num);

          } else if (tokens[0].value==='END' && tokens.length === 2 && tokens[1].value==='ASK') {
            return handler.endAsk(num);
            
          } else if (tokens[0].value==='BEGIN' && tokens.length > 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'MENU') {
            return handler.beginMenu(expression(tokens.slice(2,tokens.length)),num);
            
          } else if (tokens[0].value==='MENU' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'COLOR' && tokens[2].type===NUMERIC) {
            return handler.menuColor(tokens[2].value,num);

          } else if (tokens[0].value==='MENU' && tokens.length === 3 && tokens[1].type === IDENTIFIER && tokens[1].value === 'BGCOLOR' && tokens[2].type===NUMERIC) {
            return handler.menuBGColor(tokens[2].value,num);

          } else if (tokens[0].value==='MENU' && tokens.length === 4 && tokens[1].type === IDENTIFIER && tokens[1].value === 'CHOICE' && tokens[2].type === IDENTIFIER && tokens[2].value === 'COLOR' && tokens[3].type===NUMERIC) {
            return handler.menuChoiceColor(tokens[3].value,num);
          } else if (tokens[0].value==='HIDE' && tokens.length >= 5 && tokens[1].type === IDENTIFIER && tokens[1].value === 'IF' ) {
            var boolExp = boolExpression(tokens.slice(2,tokens.length));
            if (!boolExp) {
              display.print("Invalid HIDE IF on line "+num+"\n");
              return false;
            }
            return handler.menuHideIf(boolExp, num);

          } else if (tokens[0].value==='MENU' && tokens.length === 4 && tokens[1].type === IDENTIFIER && tokens[1].value === 'PROMPT' && tokens[2].type === IDENTIFIER && tokens[2].value === 'COLOR' && tokens[3].type===NUMERIC) {
            return handler.menuPromptColor(tokens[3].value,num);            

          } else if (tokens[0].value==='END' && tokens.length == 2 && tokens[1].type === IDENTIFIER && tokens[1].value === 'MENU') {
            return handler.endMenu(num);

          } else if (tokens[0].value==='CHOICE' && tokens.length > 2 && tokens[1].type === IDENTIFIER) {
            return handler.menuChoice(tokens[1].value,expression(tokens.slice(2,tokens.length)),num);
          } else if (tokens[0].value==='CHOICE' && tokens.length > 2 && tokens[1].type === NUMERIC) {
            return handler.menuChoice((tokens[1].value).toString(10),expression(tokens.slice(2,tokens.length)),num);
            
          } else if (tokens[0].value==='WHILE') {
            var exp2end;
            if (tokens[tokens.length-1].type===IDENTIFIER &&
                tokens[tokens.length-1].value==='DO')
              exp2end = tokens.length-1;
            else
              exp2end = tokens.length;
            var boolExp = boolExpression(tokens.slice(1,exp2end));
            if (!boolExp) {
              display.print("Invalid WHILE on line "+num+"\n");
              return false;
            }
            return handler.whileStatement(boolExp, num);

          } else if (tokens[0].value==='END' && tokens.length===2 &&
                     tokens[1].type===IDENTIFIER && tokens[1].value==='IF') {
            return handler.endIf(num);
            
          } else if ((tokens[0].value==='WEND' && tokens.length===1) ||
                     (tokens[0].value==='END' && tokens.length===2 &&
                      tokens[1].value==='WHILE')) {
            return handler.endWhile(num);
            
          } else if (tokens[0].value==='ELSE' && tokens.length===1) {
            return handler.elseStatement(num);
            
          } else if (tokens[0].value==='COLOR') {
            return handler.color(expression(tokens.slice(1,tokens.length)),num);

          } else if (tokens[0].value==='BGCOLOR') {
            return handler.bgColor(expression(tokens.slice(1,tokens.length)),num);

          } else if (tokens[0].value==='SLEEP') {
            return handler.sleep(expression(tokens.slice(1,tokens.length)),num);
          } else if (tokens[0].value==='INPUT') {
            if (tokens.length !== 2 || tokens[1].type !== IDENTIFIER) {
              display.print ("Invalid INPUT on line "+num+"\n");
              return false;
            } else {
              return handler.input(tokens[1].value,num);
            }
          } else if (tokens[0].value==='PLAY') {
            return handler.play(expression(tokens.slice(1,tokens.length)),num);
          } else if (tokens[0].value==='FOR') {
            if(!(tokens.length>=6 && tokens[2].type === EQUALS && tokens[2].value === '=' && tokens[1].type === IDENTIFIER)) {
              display.print("Invalid FOR on line "+num+"\n");
              return false;
            }
            
            var pos  = 3;
            while (pos < tokens.length &&
                   !(tokens[pos].type === IDENTIFIER &&
                     tokens[pos].value === 'TO')) {
              pos++;
            }
            if (pos === tokens.length) {
              display.print("Missing TO in FOR on line "+num+"\n");
              return false;
            }
            return handler.forStatement(tokens[1].value, expression(tokens.slice(3,pos)),
                                        expression(tokens.slice(pos+1,tokens.length)),num);

          } else if (tokens.length>=3 && tokens[1].type===EQUALS &&
                     tokens[1].value==='=') {
            return handler.letStatement(tokens[0].value,
                                        expression(tokens.slice(2,tokens.length)),num);
          } else {
            display.print ("Unrecognized "+tokens[0].value+" on line "+num+"\n");
            return false;
          }
        } else if (tokens[0].type===SINGLEQUOTE) {
          return handler.comment(tokens.slice(1,tokens.length),num);
        } else if (tokens.length>=3 && tokens[0].type === MINUS && tokens[1].type === MINUS && tokens[2].type === GREATER) {
          finished = true;
        } else {
          // console.log(tokens);
          display.print ("Unexpected token on line "+num+": "+tokens[0].value+"\n");
          return false;
        }
      }
      return true;

    },
    compileText: function(text) {
      var lines = text.split("\r\n");
      if (lines.length===1)
        lines = text.split("\n");
      if (lines.length===1)
        lines = text.split("\r");
      for (var n=0;n<lines.length;n++) {
        if (!compiler.parseLine(lines[n],n)) {
          display.print("ERROR ON LINE "+(n)+"\n");
          return false;
        }
      }
      return true;
    },
    compile: function() {
      codegen.init();
      for (pass = 1;pass <= 2;pass++) {
        started = false;
        finished = false;
	if (!compiler.compileText(programText)) {
          // XXX Reset things here?
          return false;
	}
      }
      if (codegen.validate()) {
        codegen.generate();
        return true;
      } else {
        return false;
      }
    }
  };
}(globalDisplay,codegen);

/***********************************************************************
  END Compiler class
***********************************************************************/

/***********************************************************************
  BEGIN entry point
***********************************************************************/

  // Legacy support for IE
  addEventListener(inputSubmitElement,"focus",function(e) {
    // IE changes focus to the submit button on submit
    // User should stay "clicked into" the input pad
    // and play entirely with the keyboard    
    
      // If the inputVariable is not set, this must
    // be immediately following a submit
    if (!this._inputVariable) {
      inputTextElement.focus();
    }
  });

  // Make submitting the form handle the input
  addEventListener(inputFormElement,"submit",handleInput);

  audio.init(machine.getOnAudioComplete());
  compiler.compile();
  // XXX add function to check if compile is valid
  // XXX verify that error handling works with accessibility
  
  // There was something output. Display it now
  // in case it was an error and go() is going to crash
  if (globalDisplay.hasPendingUpdates())
    globalDisplay.sendUpdates();
  machine.go();
}

/***********************************************************************
  END entry point
***********************************************************************/

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
