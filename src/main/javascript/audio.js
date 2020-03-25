/*

Pumpkin Spice implements music in ABC notation, which is a text format
for representation of Western music. It has tools for generating sheet
music and MIDI files.

*/
function Audio(logger) {
  // private
  var queue = [];
  var playing = false;
  var audioCtx = null;
  var mainGain = null;
  var onDone = function(){};

  // Init audio
  (function() {
    var AudioContext= window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      logger.error("PC SPEAKER ERROR! AUDIO DISABLED\n\n");
      return;
    }
    audioCtx = new AudioContext();
    
    mainGain = audioCtx.createGain();
    mainGain.gain.setValueAtTime(0.5,audioCtx.currentTime);
    mainGain.connect(audioCtx.destination);
  })();
 
  return {
    // Takes in a function to be called when done playing
    // all of the music in the queue
    setOnAudioComplete: function(onDoneParam) {
      onDone = onDoneParam;
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
}
