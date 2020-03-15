//   Pumpkin Spice - A simplistic language for interactive text applications
//   Copyright © 2020 Nicholas Nassar
//   All Rights Reserved

// Everything is wrapped inside a function to protect namespaces
(function(){

/***********************************************************************
  BEGIN LEGACY COMPATIBILITY
***********************************************************************/

  // Legacy Arracy.slice
  // Based on
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
/**
 * Shim for "fixing" IE's lack of support (IE < 9) for applying slice
 * on host objects like NamedNodeMap, NodeList, and HTMLCollection
 * (technically, since host objects have been implementation-dependent,
 * at least before ES2015, IE hasn't needed to work this way).
 * Also works on strings, fixes IE < 9 to allow an explicit undefined
 * for the 2nd argument (as in Firefox), and prevents errors when
 * called on other DOM objects.
 */
(function () {
  'use strict';
  var _slice = Array.prototype.slice;
  try {
    // Can't be used with DOM elements in IE < 9
    _slice.call(document.all);
  } catch (e) { // Fails in IE < 9
    // This will work for genuine arrays, array-like objects, 
    // NamedNodeMap (attributes, entities, notations),
    // NodeList (e.g., getElementsByTagName), HTMLCollection (e.g., childNodes),
    // and will not fail on other DOM objects (as do DOM elements in IE < 9)
    Array.prototype.slice = function(begin, end) {
      // IE < 9 gets unhappy with an undefined end argument
      end = (typeof end !== 'undefined') ? Number(end) : this.length;

      // For native Array objects, we use the native slice function
      if (Object.prototype.toString.call(this) === '[object Array]'){
        return _slice.call(this, begin, end); 
      }

      // For array like object we handle it ourselves.
      var i, cloned = [],
        size, len = this.length;

      // Handle negative value for "begin"
      begin = Number(begin);
      if (begin < 0)
        begin = 0;

      // Handle negative value for "end"
      var upTo = (typeof end == 'number') ? Math.min(end, len) : len;
      if (end < 0) {
        upTo = len + end;
      }

      // Actual expected size of the slice
      size = upTo - begin;

      if (size > 0) {
        cloned = new Array(size);
        if (this.charAt) {
          for (i = 0; i < size; i++) {
            cloned[i] = this.charAt(begin + i);
          }
        } else {
          for (i = 0; i < size; i++) {
            cloned[i] = this[begin + i];
          }
        }
      }

      return cloned;
    };
  }
}());

  // Legacy Array.indexOf()
  // Based on
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
  // There's a lot of weirdness here that I'm not sure I completely understand -NN
if (!Array.prototype.indexOf)  Array.prototype.indexOf = (function(o, max, min){
  "use strict";
  return function indexOf(member, fromIndex) {
    if(this===null||this===undefined)throw TypeError("Array.prototype.indexOf called on null or undefined");    
      var that = o(this), Len = that.length >>> 0, i = min(fromIndex | 0, Len);
      if (i < 0) i = max(0, Len+i); else if (i >= Len) return -1;

      if(member===void 0){
        for(; i !== Len; ++i)
          if(that[i]===void 0 && i in that) return i; // undefined
      } else if(member !== member) {
        for(; i !== Len; ++i)
          if(that[i] !== that[i]) return i; // NaN
      } else
        for(; i !== Len; ++i)
          if(that[i] === member) return i; // all else
      
      return -1; // if the value was not found, then return -1
    };
  })(Object, Math.max, Math.min);


  // Legacy addEventListener
  //
  // Adding "polyfill" versions of these functions to all of the
  // prototypes of all of the objects where it should be available for all the
  // degenerate browsers out there is tricky.
  // Just make a plain function
  function addEventListener(obj,on,fn) {
    if (obj.addEventListener !== undefined) {
      obj.addEventListener(on,fn);
    } else {
      var f = function(e){
        if (e) {
          if (!e.preventDefault)
            e.preventDefault = function(){e.returnValue = false};
          if (!e.stopPropagation)
            e.stopPropagation = function(){e.cancelBubble = true};
        }
        fn.call(obj, e);
      };
      if (!obj.listeners) {
        obj.listeners = [];
      }
      obj.listeners[obj.listeners.length]={orig:fn,actual:f};
      return obj.attachEvent('on' + on, f);
    }
  }
  function removeEventListener(obj,on,fn) {
    if (obj.removeEventListener !== undefined) {
      obj.removeEventListener(on,fn);
    } else {
      if (obj.listeners) {
        for (var i=0;i<obj.listeners.length;i++) {
          if (obj.listeners[i].orig === fn) {
            obj.detachEvent('on' + on, obj.listeners[i].actual);
            obj.listeners.splice(i,1);
            break;
          }
        }
      }

    }
  }

  // Legacy Math.trunc for IE
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

// HTML document elements. 
// inpad - The input text area
// inpadform - the form associated with the inppad
// cursor - that which must be blinked
// quiet - text which is displayed but not to be read by a screen reader
// history - text which has already been displayed
// latest - text which should be read by a screen reader

// These are all set by main();

var inpad;
var inpadform;
var cursor;
var quiet;
var history;
var latest;
var disp;

/***********************************************************************
  END Global Variables
***********************************************************************/

  // This is outside of any class because it's exposed to HTML
  //
  // This runs on form submit or when an menu option is clicked,
  // grabbing and processing the text in the inpad
  function handleInput(e) {
    audio.go();
    if (machine.isWaitingForInput()) {
      machine.acceptInput(inpad.value);
      inpad.value="";
    }
    if (e)                // If e is defined, it has preventDefault,
      e.preventDefault(); // thanks to custom addEventListener

    // Scroll to the input
    display.scroll();
  }

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


  // The "choose" function for use in HTML
  //
  // Calling this is the equivalent of typing t and submitting
  // the form
  function choose(t) {
    inpad.value = t;
    handleInput(null);
  };
  
/***********************************************************************
  BEGIN Display object
***********************************************************************/
  var display = function() {
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

    return {
      hasPendingUpdates: function () {
	return pendingUpdates.length > 0;
      },
      init: function() {
	// make the cursor blinky
	function blink() {
          if (cursor.style.visibility === "visible") {
            cursor.style.visibility="hidden";
          } else {
          cursor.style.visibility="visible";
          }
	}
	window.setInterval(blink,200);
      },
      sendQuietUpdates: function() {
	var spanNode=document.createElement("span");
	for (var i=0;i<pendingUpdates.length;i++) {
          spanNode.appendChild(pendingUpdates[i]);
	}
	pendingUpdates = [];
	quiet.appendChild(spanNode);
	display.scroll();
      },
      sendUpdates: function() {
	// Move old stuff over to the history
	var oldNodes = latest.childNodes;
	while (oldNodes.length > 0) {
          var node = oldNodes.item(0);
          latest.removeChild(node);
          history.appendChild(node);
	}
	
	// Read the quiet nodes
	oldNodes = quiet.childNodes;
	while (oldNodes.length > 0) {
          var node = oldNodes.item(0);
          quiet.removeChild(node);
          latest.appendChild(node);
	}
	
	var spanNode=document.createElement("span");
	for (var i=0;i<pendingUpdates.length;i++) {
          spanNode.appendChild(pendingUpdates[i]);
	}
	pendingUpdates = [];
	
	latest.appendChild(spanNode);
	
	display.scroll();
      },
      clear: function() {
	// XXX The background is always black
	//     It should change to the current bgcolor when
	//     the screen is cleared
	
	// Delete current stuff
	var oldNodes = latest.childNodes;
	while (oldNodes.length > 0) {
          var node = oldNodes.item(0);
          latest.removeChild(node);
	}
	
	// Delete history
	oldNodes = history.childNodes;
	while (oldNodes.length > 0) {
          var node = oldNodes.item(0);
          history.removeChild(node);
	}
	
	// Delete the quiet nodes
	oldNodes = quiet.childNodes;
	while (oldNodes.length > 0) {
          var node = oldNodes.item(0);
          quiet.removeChild(node);
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
	if (disp.scrollHeight - disp.scrollTop !== disp.clientHeight)
          disp.scrollTop = disp.scrollHeight - disp.clientHeight;
	
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
      if (!audioCtx)
	return;
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
	var osc;
	var note = nextABCNote(abc,pos);
	if (note !== null) {
	  pos = note[2];
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
}(display);
  
/***********************************************************************
  END audio class
***********************************************************************/

/***********************************************************************
  BEGIN Compiler class
***********************************************************************/

  // XXX the compiler knows about the global codegen class
  // XXX the compiler knows about the global display class  
  //      Maybe pass the codegen and error handler into the compile()
  //      function?

  var compiler = {
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
          var argName = codegen._argNameByArity(tokens[1].value,argExps.length);
          var type = codegen.varTypes[argName];
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
      if (compiler.pass === 1) {
        return compiler.parseLineWithHandler(codegen.typeGeneratorPass,tokens,num);
      } else if (compiler.pass === 2) {
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
      
      if (!compiler.started && tokens.length>0) {
        compiler.started = true;
        if (tokens.length>=4 && tokens[0].type===LESS && tokens[1].type===NOT && tokens[2].type===MINUS && tokens[3].type===MINUS ) {
          tokens = tokens.slice(4);
        }
      }
      if (tokens.length>0 && !compiler.finished) {
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
          compiler.finished = true;
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
      for (compiler.pass = 1;compiler.pass <= 2;compiler.pass++) {
        compiler.started = false;
        compiler.finished = false;
        var scripts = document.getElementsByTagName('script');
        for (var i=0;i<scripts.length;i++) {
          for (var j=0;j<scripts[i].attributes.length;j++) {
            if (scripts[i].attributes[j].name==='type' &&
                scripts[i].attributes[j].value==='text/pumpkinspice') {
              var t = scripts[i].text;
              // XXX Do we need to check textContent? Browsers that
              // support it, are probably newer and already support
              // .text for script elements
              if (!t)
                t = scripts[i].textContent;
              if (!compiler.compileText(t)) {
                // XXX Reset things here?
                return false;
              }
            }
          }
        }
      }
      if (codegen.validate()) {
        codegen.generate();
        return true;
      } else {
        return false;
      }
    }
  }

/***********************************************************************
  END Compiler class
***********************************************************************/

/***********************************************************************
  BEGIN Codegen class
***********************************************************************/

  // XXX Codegen uses the global display class for error handling
  //     Maybe pass in an error handler?
  
  // Codegen knows about machine, and it MUST know about machine so
  // it can generate code that manipulates machine
  var codegen = {
    init: function() {
      codegen.loopStack = [];        // Keeps track of nested loops

      // Map of variable name to STRING, NUMERIC, or list of matches
      // There are special names for subtroutine args
      codegen.varTypes = {};
      
      codegen.subArgNames = {};      // Map of subroutine to list of param names
      
      codegen.subArgCount = {}; // Map of subroutine to integer param count                                                     // Used when subs are called before declaration

      codegen.code = {"!":[]};// ! is the main block
      codegen.currentSub = "!";
      
      codegen.calledSubs = []; // Subroutines that were called before being defined
                               // So we can check that they eventually get defined
    },
    nextInstruction: function() {
      return codegen.code[codegen.currentSub].length;
    },
    pushInstruction: function(instruction) {
      return codegen.code[codegen.currentSub].push(instruction);
    },
    addInstructionAt: function(loc,instruction) {
      codegen.code[codegen.currentSub][loc] = instruction;
    },
    // Called after code generation is complete to check for stupidness
    validate: function () {
      // Calling fake subroutines is stupid
      for (var i=0;i<codegen.calledSubs.length;i++) {
        var name=codegen.calledSubs[i];
        if (!codegen.code[name]) {
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
      for (var v in codegen.varTypes) {
        if (codegen.varTypes[v] === NUMERIC)
          vars[v] = 0;
        else if (codegen.varTypes[v] === STRING)
          vars[v] = "";
      }
      machine.init(codegen.code, vars);
    },
    _opToCode: function(opToken) {
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
    },
    _localVarName: function(name) {
      if (codegen.currentSub !== "!") {
        var pos = 0;
        while (pos < codegen.subArgNames[codegen.currentSub].length){
          if (codegen.subArgNames[codegen.currentSub][pos] === name) {
            return codegen._argNameByArity(codegen.currentSub,pos);
          }
          pos++;
        }
      }
      return name;
    },
    
    // Name of the return value for the given sub
    // Used internally in varTypes to keep track of type
    _retName: function(sub) {
      return sub+"!";
    },
    // Call with FOO,0 to get the name of the first arg of subroutine FOO
    // Call with FOO,1 to get the name of the second arg of subroutine FOO
    // Used internally in varTypes to keep track of type
    _argNameByArity: function(sub,pos) {
      return sub+"!"+pos; // Implicit conversion from number to string
    },

    typeGeneratorPass: {
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
      expressionHandler:  {
        // Finds the type of an unknown expression, returning
        // the type or a list of variables with the type
        
        // XXX Handle errors so we can differentiate between
        //     parser errors and type errors
        
        // Possible return values for all functions:
        // STRING - this is a string
        // NUMERIC - this is a numeric type
        // null - something is wrong
        // Array - we haven't figured it out - this is a list of identifiers

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
          name = codegen._localVarName(name);
          // If this is local to a sub, use the local
          if (codegen.varTypes[name]===undefined) {
            return [name]; // unknown
          } else {
            return codegen.varTypes[name];
          }
        },
        expression: function(value,resultType) {
          return null; // Expression tokens shouldn't exist in the first pass
        },
        validateSubExpression: function(subExp,type) {
          if (type !== undefined && subExp !== type) {
            // if it's not an exact match, check it out
            subExp = codegen.typeGeneratorPass._genTypesForExpressionPair(type,subExp)
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
          return codegen.typeGeneratorPass._genTypesForExpressionPair(exp1,exp2);         
        },
        callSubroutine: function(name,argExps) {
          // XXX similar to statement
          if (codegen.subArgCount[name] === undefined) {
            codegen.subArgCount[name] = argExps.length;
          }
          if (codegen.subArgCount[name] !== argExps.length) {
            display.print("SUBROUTINE CALL "+name+" HAS "+argExps.length+" args but expected "+codegen.subArgCount[name]+"\n");
            return null;
          }
          for (var i=0;i<argExps.length;i++) {
            if (argExps[i] === null) {
              display.print("Invalid argument to SUBROUTINE CALL "+name+"\n");
              return null;
            }
            var varName = codegen._argNameByArity(name,i);
            if (codegen.varTypes[varName]) {
              var result = codegen.typeGeneratorPass._genTypesForExpressionPair(argExps[i],codegen.varTypes[varName])
              if (!result) {
                display.print("Invalid argument type mismatch in CALL "+name+"\n");
                return null;
              } else {
                codegen.varTypes[varName] = result;
              }
            } else {
              codegen.varTypes[varName] = argExps[i];
            }
          }
          var retName = codegen._retName(name);
          if (codegen.varTypes[retName])
            return codegen.varTypes[retName];
          else
            return [retName];
        },
        binaryExpression: function(operator,a,b) {
          if (a === null || b === null) {
            return null;
          }
          if (operator===PLUS) {
            return codegen.typeGeneratorPass._genTypesForExpressionPair(a,b);
          } else {
            if (codegen.typeGeneratorPass._genTypesForExpressionPair(a,NUMERIC) &&
                codegen.typeGeneratorPass._genTypesForExpressionPair(b,NUMERIC))
              return NUMERIC;
            else
              return null;
          }
        }
        
      },
      _assignTypes: function(variables,type) {
        // type must be resolved before this is called
        if (type !== STRING && type !== NUMERIC) {
          display.print("TYPE SYSTEM ERROR\n");
          return false;
        }
        var sameTypeVars = [];
        for (var i=0;i<variables.length;i++) {
          if (codegen.varTypes[variables[i]] &&
              codegen.varTypes[variables[i]] !== STRING &&
              codegen.varTypes[variables[i]] !== NUMERIC) {
            var sameTypeTemp = codegen.varTypes[variables[i]];
            for (var j=0;j<sameTypeTemp.length;j++)
              sameTypeVars.push(sameTypeTemp[j]);
            codegen.varTypes[variables[i]] = type;
          } else if (codegen.varTypes[variables[i]] !== undefined &&
              codegen.varTypes[variables[i]] !== type) {
            display.print("TYPE MISMATCH\n");
            return false;
          } else {
            codegen.varTypes[variables[i]] = type;
          }
        }
        if (sameTypeVars.length > 0) {
          return this._assignTypes(sameTypeVars,type);
        } else {
          return true;
        }
        
      },
      _saveUnassignedTypes: function(variables) {
        // This is O(n^2) in the worst case
        // 
        // There's a much better way to handle this
        
        for (var i=0;i<variables.length;i++) {
          if (codegen.varTypes[variables[i]] &&
              (codegen.varTypes[variables[i]]===STRING ||
               codegen.varTypes[variables[i]]===NUMERIC)) {
            display.print("UNASSIGNED TYPE NOT RESOLVED CORRECTLY\n");
            throw "typeassignerror"; // We should never get here
          }
          if (codegen.varTypes[variables[i]]) {
            for (var j=0;j<variables.length;j++) {
              codegen.varTypes[variables[i]].push(variables[j]);
            }
          } else {
            // Copy the current list to varTypes
            codegen.varTypes[variables[i]] = variables.slice(0);
          }
        }
      },
      _genTypesForExpressionPair: function(type1,type2) {
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
            this._assignTypes(type2,type1);
            return type1;
          } else {
            // It's not a match and it's not unknown
            return null;
          }
        }
        
        // The first expression could not be resolved
        
        // The second expression can be resolved
        if (type2 === STRING || type2 === NUMERIC) {
          this._assignTypes(type1,type2);
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
          this._saveUnassignedTypes(undefineds);
          return undefineds;
        }
      },

      printString: function(value,newline,pause,num) {
        return (value !== null && value !== undefined);
      },
      printExp: function(exp,newline,pause,num) {
        var result = this._genTypesForExpressionPair(exp,STRING);
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
        if (codegen.subArgNames[name] !== undefined) {
          display.print("SUBROUTINE "+name+" REDEFINED on line "+num+"\n");
          return false;
        } else {
          // This is the current sub now.
          codegen.currentSub = name;

          // Save the arg names
          codegen.subArgNames[name] = args;

          // We've never seen this before. Save the count, too
          if (codegen.subArgCount[name] === undefined) {
            codegen.subArgCount[name] = args.length;
          } else { // We've seen this called. Check that the param count matches.
            if (codegen.subArgCount[name] !== args.length) {
              display.print("SUBROUTINE "+name+" HAS "+args.length+" args but was called with "+codegen.subArgCount[name]+" on line "+num+"\n");
              return false;

            }
          }
          return true;
        }
      },
      callSubroutine: function(name, argExps, num) {
        if (codegen.subArgCount[name] === undefined) {
          codegen.subArgCount[name] = argExps.length;
          codegen.calledSubs[codegen.calledSubs.length] = name;
        }
        if (codegen.subArgCount[name] !== argExps.length) {
          display.print("SUBROUTINE "+name+" HAS "+argExps.length+" args but expected "+codegen.subArgCount[name]+" on line "+num+"\n");
          return false;
        }
        for (var i=0;i<argExps.length;i++) {
          if (argExps[i] === null) {
            display.print("Invalid argument to "+name+" on line "+num+"\n");
            return false;
          }
          var varName = codegen._argNameByArity(name,i);
          if (codegen.varTypes[varName]) {
            var result = this._genTypesForExpressionPair(argExps[i],codegen.varTypes[varName])
            if (!result) {
              display.print("Invalid argument type mismatch in "+name+" on line "+num+"\n");
              return false;
            } else {
              codegen.varTypes[varName] = result;
            }
          } else {
            codegen.varTypes[varName] = argExps[i];
          }
        }
        return true;
      },
      endSubroutine: function(num) {
        codegen.currentSub = "!";
        return true;
      },
      returnStatement: function(exp, num) {
        if (exp === null) {
          display.print("INVALID RETURN EXPRESSION ON LINE "+num+"\n");
          return false;

        }
        if (codegen.currentSub === "!") {
          display.print("RETURN OUTSIDE OF SUBROUTINE ON LINE "+num+"\n");
          return false;
        }
        var retValName=codegen._retName(codegen.currentSub);
        if (codegen.varTypes[retValName]) {
          var result = this._genTypesForExpressionPair(exp,codegen.varTypes[retValName]);
          if (!result) {
            display.print("TYPE MISMATCH IN RETURN ON "+num+"\n");
            return false;
          } else {
            codegen.varTypes[retValName] = result;
          }
        } else {
          codegen.varTypes[retValName] = exp;
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
        var result = this._genTypesForExpressionPair(promptExp,STRING);
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
        var result = this._genTypesForExpressionPair(promptExp,STRING);
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
        var result = this._genTypesForExpressionPair(textExp,STRING);
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
        var result = this._genTypesForExpressionPair(valueExp,NUMERIC);
        if (result === null) {
          display.print("Type mismatch for COLOR on line "+num+"\n");
          return false;
        } else {
          return true;
        }
      },
      bgColor: function(valueExp,num) {
        var result = this._genTypesForExpressionPair(valueExp,NUMERIC);
        if (result === null) {
          display.print("Type mismatch for BGCOLOR on line "+num+"\n");
          return false;
        } else {
          return true;
        }
      },
      sleep: function(valueExp,num) {
        var result = this._genTypesForExpressionPair(valueExp,NUMERIC);
        if (result === null) {
          display.print("Type mismatch for SLEEP on line "+num+"\n");
          return false;
        } else {
          return true;
        }       
      },
      input: function(valueExp,num) {
        this._assignTypes([valueExp],STRING);
        return true;
      },
      play: function(valueExp,num) {
	var result = this._genTypesForExpressionPair(valueExp,STRING);
	if (result === null) {
	  display.print("Type mismatch for PLAY on line "+num+"\n");
	  return false;
	} else {
	  return true;
	}
      },
      forStatement: function(varExp,startExp,endExp,num) {
        if (!this._assignTypes([varExp],NUMERIC) ||
            this._genTypesForExpressionPair(startExp,NUMERIC)===null ||
            this._genTypesForExpressionPair(endExp,NUMERIC)===null) {
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
        varExp = codegen._localVarName(varExp);
        // Value exp has an unknown type
        if (valueExp !== STRING && valueExp !== NUMERIC) {
          // The variable has a type- set the arg based on that
          if (codegen.varTypes[varExp] &&
              (codegen.varTypes[varExp] === STRING ||
               codegen.varTypes[varExp] === NUMERIC)) {
            return this._assignTypes(valueExp,codegen.varTypes[varExp]);
          } else {
            
            // There are no types yet
            var unassigned = [varExp];
            for (var i=0;i<valueExp.length;i++) {
              unassigned.push(valueExp[i]);
            }
            this._saveUnassignedTypes(unassigned);
            return true;
          }
        } else {
          if (!this._assignTypes([varExp],valueExp)) {
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
    },
      codeGeneratorPass: {
        expressionHandler: {
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
          _expressionSubroutineCount: 0,
          _nextExpressionSubroutineName: function() {
            var next = this._expressionSubroutineCount;
            this._expressionSubroutineCount++;
            // Use in .vars in machine._callstack objects
            // Must not conflict with other local variables
            return "!"+next;
          },
          
          // Hack to get variable names from optimised code by stringifying a
          // function definition This let's us fully optimize and still eval()
          // code
          //
          // Typical Usage: nameFromFunctionString(function{NAME}.toString())
          _nameFromFunctionString:function(o) {
            var start = o.indexOf('{')+1;
            
            // Some old Firefoxen insert whitespace in the stringified function
            while (o[start] < o.length && o[start]===' ' || o[start]==='\n' || o[start]==='\r' || o[start]==='\t')
              start++;
            
            //  Some old Firefoxen insert semicolons
            var end = o.indexOf(';');
            if (end === -1)
              end = o.indexOf('}');
            return o.substr(start,end-start);
          },
          // The name of the object with all the local subroutine variables in it,
          // the .vars object at the top of the stack
          _expressionSubTempObjName: function() {
            /** @suppress {uselessCode} */
            var o = function(){machine._callstack[machine._callstack.length-1].vars}.toString();
            return this._nameFromFunctionString(o);
          },
          // find name of a variable in the machine
          _variableName: function(name) {
            /** @suppress {uselessCode} */
            var vname = (function(){machine._vars}).toString();
            vname = this._nameFromFunctionString(vname);
            
            var escaped = name.replace("\\","\\\\").replace("'","\\'").replace('"','\\"').replace('\n','\\n').replace('\r','\\r')
            return vname+'[\''+escaped+'\']';
          },
          // Find name of local variable in the machine
          _localVariableName: function(name) {
            /** @suppress {uselessCode} */
            var vname = (function(){machine._callstack[machine._callstack.length-1].vars}).toString();
            vname = this._nameFromFunctionString(vname);
            
            var escaped = name.replace("\\","\\\\").replace("'","\\'").replace('"','\\"').replace('\n','\\n').replace('\r','\\r')
            return vname+'[\''+escaped+'\']';
          },
          _stringToFunction: function(expr) {
            // Actually convert a JS expression string to a function
            // Put it in a list to work around bug in some older browsers
            // evaluating a function expression directly
            var text = '[(function(){return '+expr+';})]';
            var listFunc = eval(text);
            return listFunc[0];
          },
          
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
            rndname = this._nameFromFunctionString(rndname);
            return {type:EXPRESSION,value:(rndname+'('+l.value+','+h.value+')'),resultType:NUMERIC,subs:l.subs.concat(h.subs)};
          },
          piBuiltin: function() {
            return {type:EXPRESSION,value:'Math.PI',resultType:NUMERIC,subs:[]};
          },
          variable: function(name) {
            // Check to see that variable has type data
            var localName = codegen._localVarName(name);
            if (!codegen.varTypes[localName]) {
              return null;
            }

            // Handle case of subroutine local
            if (localName !== name) {
              return {type:EXPRESSION,value:this._localVariableName(name),resultType:codegen.varTypes[localName],subs:[]};

            } else { // It's a plain old global variable
              return {type:EXPRESSION,value:this._variableName(name),resultType:codegen.varTypes[localName],subs:[]};
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
            var op = codegen._opToCode(opToken);
            return {type:BOOLEXPRESSION,value:exp1.value+op+exp2.value,subs:exp1.subs.concat(exp2.subs)};
          },
          callSubroutine: function(name,argExps) {
            // subroutine results are saved in a temp variable
            var temp = this._nextExpressionSubroutineName();
            // Expressions have a list of subroutines the need to be called
            // before they are run
            var subs = [{temp:temp,name:name,args:argExps}];
            var retName = codegen._retName(name);

            // The name of the variable where the temps are stored
            var t = this._expressionSubTempObjName();
            return {type:EXPRESSION,value:t+'["'+temp+'"]',resultType:codegen.varTypes[retName],subs:subs};
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
        },

        // XXX handle errors by throwing an exception
        // XXX don't pass in the line number- let the caller handle the exception and print errors
        
        // Adds instructions with calls to all of the function
        // referenced in the expression, then returns function that
        // evaluates the expression
        _expressionToFunction: function(exp) {
          for (var i=0;i<exp.subs.length;i++) {
            this.callSubroutine(exp.subs[i].name,exp.subs[i].args,0);
            // wrap in function tocreate new temp for each iteration
            (function(){
              var temp = exp.subs[i].temp;
              codegen.pushInstruction(function() {
                machine._callstack[machine._callstack.length-1].vars[temp]=machine._ret;
                machine.advance();
              });})();
          }
      
          return this.expressionHandler._stringToFunction(exp.value);
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
            codegen.pushInstruction(function() {
              display.printMenu([function(){return text;}],[""],
                                undefined,undefined,undefined,undefined,undefined);
              
              machine._interruptDelay = 0;
              machine._inputVariable = "!"; // Internal name
              machine.advance();
            });
          } else {
            codegen.pushInstruction(function(){
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
            codegen.pushInstruction(function() {
              display.printMenu([text],[""],
                                undefined,undefined,undefined,undefined,undefined);
              machine._interruptDelay = 0;
              machine._inputVariable = "!"; // Internal name
              machine.advance();
            });
          } else {
            codegen.pushInstruction(function(){
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
          codegen.loopStack.push({type:IF,
                                  test:test,
                                  elseloc:null,
                                  loc:codegen.nextInstruction()});
          codegen.pushInstruction(null);
          return true;
        },
        endIf: function(num) {
          var obj = codegen.loopStack.pop();
          if ((!obj) || obj.type !== IF) {
            display.print("ERROR: END IF WITHOUT MATCHING IF\n");
          } else {
            var pos;
            if (!obj.elseloc) {
              pos=codegen.nextInstruction();
            } else {
              pos = obj.elseloc+1;
            }
            var test = obj.test;
            codegen.addInstructionAt(obj.loc,function(){
              if (test())
                machine.advance();
              else
                machine.setLoc(pos);
            });
            
            if (!!obj.elseloc) {
              var end=codegen.nextInstruction();
              codegen.addInstructionAt(obj.elseloc,function(){
                machine.setLoc(end);
              });
            }
          }
          return true;
        },
        elseStatement: function(num) {
          var obj = codegen.loopStack[codegen.loopStack.length-1];
          if ((!obj) || obj.type !== IF) {
            display.print("ERROR: ELSE WITHOUT MATCHING IF\n");
          } else {
            obj.elseloc=codegen.nextInstruction();
            codegen.pushInstruction(null);
          }
          return true;
        },
        endWhile: function(num) {
          var obj = codegen.loopStack.pop();
          if ((!obj) || obj.type !== WHILE) {
            display.print("ERROR: WEND IF WITHOUT MATCHING WHILE\n");
          } else {
            var test = obj.test;
            codegen.pushInstruction(function(){
              machine.setLoc(obj.top);
            });
            var pos=codegen.nextInstruction();
            codegen.addInstructionAt(obj.loc,function(){
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
          var top = codegen.nextInstruction();
          var test = this._expressionToFunction(exp);

          codegen.loopStack.push({type:WHILE,
                                  test:test,
                                  elseloc:null,
                                  top:top,
                                  loc:codegen.nextInstruction()});
          codegen.pushInstruction(null);
          return true;
        },
        beginRandom: function(num) {
          codegen.loopStack.push({type:RANDOM,
                                  events:[],
                                  loc:codegen.nextInstruction()});
          codegen.pushInstruction(null);
          return true;
        },
	waitForMusic: function() {
	  codegen.pushInstruction(function(){
	    // Wait flag 1 is wait for music
	    machine._waitFlags = (machine._waitFlags | 1);
	    machine._interruptDelay = 0;
	    machine.advance();
	  }
				 );
	  return true;
	 
	},
        beginSubroutine: function(sub, args, num) {
          if (codegen.code[sub] !== undefined) {
            display.print("SUBROUTINE "+sub+" ALREADY DEFINED");
          } else {
            var i
            for (i=0;i<codegen.loopStack.length;i++) {
              if (codegen.loopStack[i].type === SUBROUTINE) {
                display.print("NESTED SUBROUTINES NOT ALLOWED");
                break;
              }
            }
            if (i === codegen.loopStack.length) {
              codegen.loopStack.push({type:SUBROUTINE});
              codegen.currentSub = sub;
              codegen.code[sub] = [];
            }
          }
          return true;
        },
        callSubroutine: function(sub, argExps, num) {
          var argNames = codegen.subArgNames[sub];
          var fArgs = [];
          for (var i=0;i<argExps.length;i++) {
            fArgs.push(this._expressionToFunction(argExps[i]));
          }
          var retName = codegen._retName(sub);
          var ret;
          if (codegen.varTypes[retName] === STRING) {
            ret = "";
          } else if (codegen.varTypes[retName] === NUMERIC) {
            ret = 0;
          }
          codegen.pushInstruction(function () {
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
          if (!codegen.loopStack[codegen.loopStack.length-1] || codegen.loopStack[codegen.loopStack.length-1].type !== SUBROUTINE) {
            display.print("UNEXPECTED END SUBROUTINE");
	    return false;
          } else {
            codegen.loopStack.pop();
            codegen.currentSub = "!";
          }
          return true;
        },
        returnStatement: function(exp,num) {
          // XXX Keep track of returns - if there's at least one
          // return or the sub is used in an expression, all code
          // paths in the sub should have returns

          // Make sure there's a subroutine somewhere
          for (var i=codegen.loopStack.length-1;i>=0;i--) {
            if (codegen.loopStack[i].type === SUBROUTINE) {
              break;
            }
          }
          if (i===-1) {
            display.print("UNEXPECTED RETURN OUTSIDE OF SUB");
            return false;
          }
          exp = this._expressionToFunction(exp);
          codegen.pushInstruction(function() {
            machine._callstack[machine._callstack.length-1].ret = exp();
            machine._callstack[machine._callstack.length-1].loc = machine._code[machine._callstack[machine._callstack.length-1].sub].length;
          });
          return true;
        },
        endRandom: function(num) {
          var obj = codegen.loopStack.pop();
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
                var endloc = codegen.nextInstruction();
                for (var n=1;n<events.length;n++) {
                  codegen.addInstructionAt(events[n].loc-1, function() {
                    machine.setLoc(endloc);
                  });
                }
                codegen.addInstructionAt(obj.loc, function () {
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
          var obj = codegen.loopStack[codegen.loopStack.length-1];
          if ((!obj) || obj.type !== RANDOM) {
            display.print("ERROR: WITH CHANCE WITHOUT MATCHING BEGIN RANDOM\n");
          } else {
            if (obj.events.length === 0 && codegen.nextInstruction() !== obj.loc+1) {
              display.print("ERROR: NO CODE ALLOWED BETWEEN BEGIN RANDOM AND FIRST WITH CHOICE\n");
            } else {
              if (percent === undefined) {
                if (obj.events.length > 0) // Leave room for the jump to the end
                  codegen.pushInstruction(null);
                obj.events.push({loc:codegen.nextInstruction(),
                                 chance:null});
                
              } else {
                var chance = Number(percent);
                if (chance < 0.001 || chance > 99.999) {
                  display.print("ERROR: CHANCES MUST BE BETWEEN 0 and 100\n");
                } else {
                  if (obj.events.length > 0) // Leave room for the jump to the end
                    codegen.pushInstruction(null);
                  obj.events.push({loc:codegen.nextInstruction(),
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
          var top = codegen.nextInstruction();
          prompt = this._expressionToFunction(prompt);
          codegen.loopStack.push({type:ASK,
                                  prompt:prompt,
                                  color:[255,255,85],
                                  promptColor:[85,255,255],
                                  bgColor:[0,0,0],
                                  noloc:null,
                                  defaultValue:null,
                                  top:top,
                                  loc:codegen.nextInstruction()});
          codegen.pushInstruction(null); // Save space for prompt
          codegen.pushInstruction(null);
          return true;
        },
        askColor: function(color,num) {
          var c = intToColor(color);
          if (c === null) {
            display.print("INVALID ASK COLOR\n");
            return false;
          }
          if (!codegen.loopStack[codegen.loopStack.length-1] || codegen.loopStack[codegen.loopStack.length-1].type !== ASK) {
            display.print("ASK COLOR OUTSIDE OF AN ASK\n");
            return false;
          }
          if (codegen.loopStack[codegen.loopStack.length-1].loc !== codegen.nextInstruction()-2) {
            display.print("ASK COLOR AFTER CODE\n");
            return false;
          }
          codegen.loopStack[codegen.loopStack.length-1].color = c;
          return true;
        },
        askBGColor: function(color,num) {
          var c = intToColor(color);
          if (c === null) {
            display.print("INVALID ASK BGCOLOR\n");
            return false;
          }
          if (!codegen.loopStack[codegen.loopStack.length-1] || codegen.loopStack[codegen.loopStack.length-1].type !== ASK) {
            display.print("ASK BGCOLOR OUTSIDE OF AN ASK\n");
            return false;
          }
          if (codegen.loopStack[codegen.loopStack.length-1].loc !== codegen.nextInstruction()-2) {
            display.print("ASK BGCOLOR AFTER CODE\n");
            return false;
          }
          codegen.loopStack[codegen.loopStack.length-1].bgColor = c;
          return true;
        },
        askPromptColor: function(color,num) {
          var c = intToColor(color);
          if (c === null) {
            display.print("INVALID ASK PROMPT COLOR\n");
            return false;
          }
          if (!codegen.loopStack[codegen.loopStack.length-1] || codegen.loopStack[codegen.loopStack.length-1].type !== ASK) {
            display.print("ASK PROMPT COLOR OUTSIDE OF AN ASK\n");
            return false;
          }
          if (codegen.loopStack[codegen.loopStack.length-1].loc !== codegen.nextInstruction()-2) {
            display.print("ASK PROMPT COLOR AFTER CODE\n");
            return false;
          }
          codegen.loopStack[codegen.loopStack.length-1].promptColor = c;
          return true;
        },
        onNo: function(num) {
          var ask = codegen.loopStack[codegen.loopStack.length-1];
          if (ask && ask.type === ASK) {
            ask.noLoc = codegen.nextInstruction();
            codegen.pushInstruction(null);
          } else {
            display.print("ON NO outside of an ASK\n");
            return false;
          }
          return true;
        },
        onYes: function(num) {
          var ask = codegen.loopStack[codegen.loopStack.length-1];
          if (ask && ask.type === ASK) {
            if (codegen.loopStack[codegen.loopStack.length-1].loc !== codegen.nextInstruction()-2) {
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
          if (!codegen.loopStack[codegen.loopStack.length-1] || codegen.loopStack[codegen.loopStack.length-1].type !== ASK) {
            display.print("DEFAULT OUTSIDE OF AN ASK\n");
            return false;
          }
          if (codegen.loopStack[codegen.loopStack.length-1].loc !== codegen.nextInstruction()-2) {
            display.print("ASK DEFAULT AFTER CODE\n");
            return false;
          }
          codegen.loopStack[codegen.loopStack.length-1].defaultValue = value;
          return true;
        },
        endAsk: function(num) {
          var ask = codegen.loopStack.pop();
          if (ask && ask.type === ASK) {
            var noLoc = codegen.nextInstruction();
            if (ask.noLoc) {
              var nextI = codegen.nextInstruction();
              codegen.addInstructionAt(ask.noLoc,function(){
                machine.setLoc(nextI);
              });
              noLoc = ask.noLoc+1;
            }
            var prompt = ask.prompt;
            var top = ask.top;
            codegen.addInstructionAt(ask.loc, function(){
              display.printAsk(prompt,ask.defaultValue,ask.color,ask.bgColor,ask.promptColor);
              machine._interruptDelay = 0;
              machine._inputVariable = "!"; // Invalid as an identifier
              machine.advance();
            });
            codegen.addInstructionAt(ask.loc+1, function(){
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
          codegen.loopStack.push({type:MENU,
                                  color:[255,255,85],
                                  choiceColor:[255,255,255],
                                  promptColor:[85,255,255],
                                  bgColor:[0,0,0],
                                  choices:[],
                                  prompt:prompt,
                                  loc:codegen.nextInstruction()});
          codegen.pushInstruction(null); // Goto subroutines and setup
          codegen.pushInstruction(null); // Display menu and throw interrupt
          codegen.pushInstruction(null); // process response
          return true;
        },
        menuColor: function(color,num) {
          var c = intToColor(color);
          if (c === null) {
            display.print("INVALID MENU COLOR\n");
            return false;
          }
          if (!codegen.loopStack[codegen.loopStack.length-1] || codegen.loopStack[codegen.loopStack.length-1].type !== MENU) {
            display.print("MENU COLOR OUTSIDE OF A MENU\n");
            return false;
          }
          if (codegen.loopStack[codegen.loopStack.length-1].choices.length > 0) {
            display.print("MENU COLOR AFTER CHOICE\n");
            return false;
          }
          codegen.loopStack[codegen.loopStack.length-1].color = c;
          return true;
        },
        menuBGColor: function(color,num) {
          var c = intToColor(color);
          if (c === null) {
            display.print("INVALID MENU BGCOLOR\n");
            return false;
          }
          if (!codegen.loopStack[codegen.loopStack.length-1] || codegen.loopStack[codegen.loopStack.length-1].type !== MENU) {
            display.print("MENU BGCOLOR OUTSIDE OF A MENU\n");
            return false;
          }
          if (codegen.loopStack[codegen.loopStack.length-1].choices.length > 0) {
            display.print("MENU BGCOLOR AFTER CHOICE\n");
            return false;
          }
          codegen.loopStack[codegen.loopStack.length-1].bgColor = c;
          return true;
        },
        menuChoiceColor: function(color,num) {
          var c = intToColor(color);
          if (c === null) {
            display.print("INVALID MENU CHOICE COLOR\n");
            return false;
          }
          if (!codegen.loopStack[codegen.loopStack.length-1] || codegen.loopStack[codegen.loopStack.length-1].type !== MENU) {
            display.print("MENU CHOICE COLOR OUTSIDE OF A MENU\n");
            return false;
          }
          if (codegen.loopStack[codegen.loopStack.length-1].choices.length > 0) {
            display.print("MENU CHOICE COLOR AFTER CHOICE\n");
            return false;
          }
          codegen.loopStack[codegen.loopStack.length-1].choiceColor = c;
          return true;
        },
        menuPromptColor: function(color,num) {
          var c = intToColor(color);
          if (c === null) {
            display.print("INVALID MENu PROMPT COLOR\n");
            return false;
          }
          if (!codegen.loopStack[codegen.loopStack.length-1] || codegen.loopStack[codegen.loopStack.length-1].type !== MENU) {
            display.print("MENU PROMPT COLOR OUTSIDE OF A MENU\n");
            return false;
          }
          if (codegen.loopStack[codegen.loopStack.length-1].choices.length > 0) {
            display.print("MENU PROMPT COLOR AFTER CHOICE\n");
            return false;
          }
          codegen.loopStack[codegen.loopStack.length-1].promptColor = c;
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
          var menu = codegen.loopStack.pop();
          if (menu && menu.type === MENU) {
            var lastMenuI = codegen.nextInstruction();
            codegen.pushInstruction(null); // replace with
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
            codegen.pushInstruction(function(){
              machine.setLoc(menu.loc+1);
            });
            codegen.addInstructionAt(menu.loc+1, function(){
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
            codegen.addInstructionAt(menu.loc+2, function(){
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
            
            codegen.addInstructionAt(menu.loc,function(){
              machine.setLoc(lastMenuI+1);
            });
            var newI = codegen.nextInstruction();
            for (var n=1;n<menu.choices.length;n++) {
              codegen.addInstructionAt(menu.choices[n].loc-1, function(){
                machine.setLoc(newI);
              });
            }
            codegen.addInstructionAt(lastMenuI, function(){
              machine.setLoc(newI);
            });
          } else {
            display.print("END MENU WITHOUT BEGIN MENU\n");
	    return false;
          }
          return true;
        },
        menuChoice: function(key,exp1,num) {
          if (codegen.loopStack[codegen.loopStack.length-1] && codegen.loopStack[codegen.loopStack.length-1].type === MENU) {
            if (codegen.loopStack[codegen.loopStack.length-1].choices.length > 0)
              codegen.pushInstruction(null); // Replace with goto end
            codegen.loopStack[codegen.loopStack.length-1].choices.push({key:key,
                                                                        exp:exp1,
                                                                        loc:codegen.nextInstruction()});
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
          if (!codegen.loopStack[codegen.loopStack.length-1] || codegen.loopStack[codegen.loopStack.length-1].type !== MENU) {
            display.print("HIDE IF OUTSIDE OF A MENU\n");
            return false;
          }
          var choices = codegen.loopStack[codegen.loopStack.length-1].choices;
          if (choices.length === 0) {
            display.print("HIDE IF found before CHOICE\n");
            return false;
          }
          if (choices[choices.length-1].loc !== codegen.nextInstruction()) {
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
          codegen.pushInstruction(function(){
            display.setColor(color());
            machine.advance();
          });
          return true;
        },
        bgColor: function(c,num) {
          var color = this._expressionToFunction(c);
          codegen.pushInstruction(function(){
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
          codegen.pushInstruction(function() {
            machine.advance();
            machine._interruptDelay = duration();
          });
          return true;
        },
        input: function(varname,num) {
          if (codegen.varTypes[varname] === undefined) {
            display.print(varname+" undefined in INPUT\n");
            return;
          }
          codegen.pushInstruction(function() {
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
          codegen.pushInstruction(function() {
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
          if (codegen.varTypes[varname] === undefined) {
            display.print(varname+" undefined in FOR\n");
            return;
          }
          
          first = this._expressionToFunction(first);
          last = this._expressionToFunction(last);

          codegen.pushInstruction(null); // Fill it in when we get the NEXT
          codegen.loopStack.push({type:FOR,varname:varname,
                                  last:last,
                                  first:first,
                                  top:codegen.nextInstruction()});

          return true;
        },
        letStatement: function(varname,exp,num) {
          if (!varname) {
            display.print ("Invalid expression assigned to "+varname+" on line "+num+"\n");
            return false;
          }
          if (codegen.varTypes[varname] === undefined) {
            display.print(varname+" undefined in assignment\n");
            return;
          }
          var value = this._expressionToFunction(exp);
          codegen.pushInstruction(function() {
            machine._vars[varname] = value();
            machine.advance();
          });
          return true;
        },
        comment: function(tokens, num) {
          return true;
        },
        clear: function(num) {
          codegen.pushInstruction(function(){
            display.clear();
            machine.advance();
            // Give up the CPU to allow display
            machine._interruptDelay = 0;
          });
          return true;
        },
        next: function(varExp,num) {
          var varname = varExp[0].value;
          var obj = codegen.loopStack.pop();
          if ((!obj) || obj.type !== FOR || varname != obj.varname) {
            display.print("ERROR: NEXT WITHOUT MATCHING FOR\n");
          } else {
            var first = obj.first;
            var last = obj.last;
            codegen.pushInstruction(function(){
              if (machine._vars[varname]>=last()){
                machine.advance();
              } else {
                machine._vars[varname]++;
                machine.setLoc(obj.top);
              }
            });
            var after = codegen.nextInstruction();
            codegen.addInstructionAt(obj.top-1,function(){
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
      }

  };
  
/***********************************************************************
  END Codegen class
***********************************************************************/

/***********************************************************************
  BEGIN Machine class
***********************************************************************/

  // XXX There's some direct use of the display class here
  //     maybe it should be passed in on init?
  // XXX Error handling?
  
  var machine = {
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
      machine._callstack[machine._callstack.length-1].loc++;
    },
    retreat: function () {
      machine._callstack[machine._callstack.length-1].loc--;
    },
    setLoc: function (loc) {
      machine._callstack[machine._callstack.length-1].loc=loc;
    },
    callSub: function(sub,vars,ret) {
      machine._callstack[machine._callstack.length-1].loc++;
      machine._callstack.push({sub:sub,loc:0,vars:vars,ret:ret});
    },
    random: function(l,h) {
      return Math.floor(Math.floor(l)+Math.random()*(1+Math.floor(h)-Math.floor(l)));
    },
    init: function(code,vars) {
      machine._code = code;
      machine._vars = vars; // Variables

      machine._callstack=[{sub:"!",loc:0,vars:{}}];  // "!" is the main code
      machine._interruptDelay = null;
      machine._inputVariable = null;
      machine._waitFlags = 0;

      // register for return values	
      // machine._ret = undefined;
	
      addEventListener(inpadform,"submit",handleInput);

      // Disable this while single key input is disabled
      
      // addEventListener(inpad,"input",function(e) {
      //   machine._vars[machine._inputVariable] = inpad.value;
      // });

      var ret = document.getElementById("return");
      addEventListener(ret,"focus",function(e) {
        // IE changes focus to the submit button on submit
        // User should stay "clicked into" the input pad
        // and play entirely with the keyboard    

        // If the inputVariable is not set, this must
        // be immediately following a submit
        if (!machine._inputVariable) {
          inpad.focus();
        }
      });

      // Don't allow machine to be re-init If we want to allow
      // re-init, we need to add code to clear everything and avoid
      // re-adding listeners, etc.
      machine.init = undefined;

      // On desktop, the user should be able to start typing immediately
      // On mobile, this doesn't bring up the keybard, which is the behavior we want.
      inpad.focus();
    },
    isWaitingForInput: function() {
      return !!machine._inputVariable;
    },
    acceptInput: function(value) {
      display.print(value);
      machine._vars[machine._inputVariable] = value;
      machine._inputVariable = null;
      window.setTimeout(machine.go,0);
      display.print("\n");
      display.clearMenu();
    },
    onAudioComplete: function () {
      // If we're waiting for the music and it's done, it's time to go
      if (machine._waitFlags & 1) { /** @suppress {uselessCode} */
	// clear all the wait flags
	machine._waitFlags = 0;
	machine.go();
      }
    },
    go: function() {
      // XXX Trap division by 0, Array Out of Bounds when we have arrays

      // Handle any function returns (signaled by falling off the end of the code)
      while (machine._callstack.length>0 &&
             (machine._code[machine._callstack[machine._callstack.length-1].sub]===undefined ||
              machine._callstack[machine._callstack.length-1].loc >= machine._code[machine._callstack[machine._callstack.length-1].sub].length)) {
          machine._ret = machine._callstack.pop().ret;
        }

      while(machine._callstack.length>0 && machine._callstack.length<=16 && machine._interruptDelay === null) {
	// Actually run the code functions
        machine._code[machine._callstack[machine._callstack.length-1].sub][machine._callstack[machine._callstack.length-1].loc]();

        // Code Repeated above
        while (machine._callstack.length>0 &&
               (machine._code[machine._callstack[machine._callstack.length-1].sub]===undefined ||
                machine._callstack[machine._callstack.length-1].loc >= machine._code[machine._callstack[machine._callstack.length-1].sub].length)) {
          machine._ret = machine._callstack.pop().ret;
        }
        // console.log("i: "+machine.i+" N:"+machine._vars['N']+' X:'+machine._vars['X']+' Q:'+machine._vars['Q']);
      }
      if (machine._interruptDelay !== null) {
        if (machine._inputVariable !== null) {
          display.sendUpdates();
          // machine.inputMode();
        } else if (machine._waitFlags !== 0) {
	  display.sendQuietUpdates();
	  // flag 1 is wait for music
	  
	} else if (machine._interruptDelay === 0) {
          window.setTimeout(machine.go,0);
          display.sendQuietUpdates();
        } else {
          window.setTimeout(machine.go,machine._interruptDelay);
                display.sendQuietUpdates();
        }
        machine._interruptDelay = null;
      } else if (machine._callstack.length>0) {
        display.print("STACK OVERFLOW\nARE YOU TRYING SOME COMPUTER SCIENCE OR SOMETHING?\n");
              display.sendUpdates();
      }

      // The program ended
      if (machine._callstack.length == 0 && display.hasPendingUpdates())
        display.sendUpdates();

    }
  };

/***********************************************************************
  END Machine class
***********************************************************************/
  
/***********************************************************************
  BEGIN main function
***********************************************************************/

  // This is the entry point
  function main() {
    // This is the only place we grab HTML elements
    // All of these variables are global
    inpad = document.getElementById("inpad");
    inpadform = document.getElementById("inpadform");
    cursor = document.getElementById("cursor");
    quiet = document.getElementById("quiet");
    history = document.getElementById("history");
    latest = document.getElementById("latest");
    disp = document.getElementById("display");

    display.init();
    audio.init(machine.onAudioComplete);
    compiler.compile();
    // XXX add function to check if compile is valid
    // XXX verify that error handling works with accessibility

    // There was something output. Display it now
    // in case it was an error and go() is going to crash
    if (display.hasPendingUpdates())
      display.sendUpdates();
    machine.go();
  }

  // If we're ready, run the main function
  if (document.readyState == "complete") {
    main();

  // If we're not ready, queue this up to run when we are
  } else {
    addEventListener(window,"load",main);
  }

/***********************************************************************
  END main function
***********************************************************************/
})();
