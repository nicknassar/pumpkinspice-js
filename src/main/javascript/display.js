function Display(inputFormElement, inputTextElement, inputSubmitElement, cursorElement, quietBlockElement, historyBlockElement, latestBlockElement, displayBlockElement) {
    // Keep track of functions listening for menu clicks
    var menuListeners = [];
    
    // list of HTML elements to add to display
    var pendingUpdates = [];
    
    var color = [170,170,170]; // This is used to decide when to create a new
                               // span tag with color
    var bgColor = [0,0,0];

    var handleInputEvent = function(e){};

    function queueUpdate(node) {
      pendingUpdates.push(node);
    };

    // The "choose" function for use in HTML
    //
    // Calling this is the equivalent of typing t and submitting
    // the form
    function choose(t) {
      inputTextElement.value = t;
      handleInputEvent(null);
    };

    // Scroll the display to the bottom
    function scroll() {
     if (displayBlockElement.scrollHeight - displayBlockElement.scrollTop !== displayBlockElement.clientHeight)
       displayBlockElement.scrollTop = displayBlockElement.scrollHeight - displayBlockElement.clientHeight;
    } 
  
    function blink() {
      if (cursorElement.style.visibility === "visible") {
        cursorElement.style.visibility="hidden";
      } else {
        cursorElement.style.visibility="visible";
      }
    }
    window.setInterval(blink,200);

    // On desktop, the user should be able to start typing immediately
    // On mobile, this doesn't bring up the keybard, which is the behavior we want.
    inputTextElement.focus();
    
    // Legacy support for IE
    addEventListener(inputSubmitElement,"focus",function(e) {
      // IE changes focus to the submit button on submit
      // User should stay "clicked into" the input pad
      // and play entirely with the keyboard    
      
      inputTextElement.focus();
    });

    // Make submitting the form handle the input
    addEventListener(inputFormElement,"submit",function(e){handleInputEvent(e);});

    return {
      getInputValue: function() {
	var val = inputTextElement.value;
	inputTextElement.value = "";
	return val;
      },
      setInputHandler: function(handler) {
	handleInputEvent = handler;
      },
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
	scroll();
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
	
	scroll();
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
      scroll: scroll,
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
}

