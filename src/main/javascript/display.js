function Display(inputFormElement, inputTextElement, inputSubmitElement, cursorElement, quietBlockElement, historyBlockElement, latestBlockElement, displayBlockElement) {
  // Keep track of functions listening for menu clicks
  var menuListeners = [];

  // list of HTML elements to add to display
  var pendingUpdates = [];

  var color = [170,170,170]; // This is used to decide when to create a new
  // span tag with color
  var bgColor = [0,0,0];

  var handleInputEvent = function(e){};

  // Optimize these calls by wrapping them in a function
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
  }
  
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

  function getInputValue() {
    var val = inputTextElement.value;
    inputTextElement.value = "";
    return val;
  }

  function setInputHandler(handler) {
    handleInputEvent = handler;
  }

  function sendQuietBlockElementUpdates() {
    var spanNode=document.createElement("span");
    for (var i=0;i<pendingUpdates.length;i++) {
      spanNode.appendChild(pendingUpdates[i]);
    }
    pendingUpdates = [];
    quietBlockElement.appendChild(spanNode);
    scroll();
  }

  function sendUpdates() {
    var quietNodes = quietBlockElement.childNodes;
    if (pendingUpdates.length === 0 && quietNodes.length === 0) {
      return;
    }

    // Move old stuff over to the historyBlockElement
    var oldNodes = latestBlockElement.childNodes;
    while (oldNodes.length > 0) {
      var node = oldNodes.item(0);
      latestBlockElement.removeChild(node);
      historyBlockElement.appendChild(node);
    }

    // Read the quietBlockElement nodes

    while (quietNodes.length > 0) {
      var node = quietNodes.item(0);
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
  }

  function clear() {
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
  }

  function print(text) {
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
  }

  function printAsk(text,defaultValue,color,bgColor,promptColor) {
    var prompt = '[Yes/No]';
    if (defaultValue === true) {
      prompt = '[Yes]';
    } else if (defaultValue === false) {
      prompt = '[No ]';
    }
    var colorRGB = intToColor(color);
    var bgColorRGB = intToColor(bgColor);
    var promptColorRGB = intToColor(promptColor);
    var textSpanNode=document.createElement("span");
    if (colorRGB !== null && bgColorRGB !== null) {
      textSpanNode.setAttribute("style","color:rgb("+colorRGB[0]+","+colorRGB[1]+","+colorRGB[2]+");background-color:rgb("+bgColorRGB[0]+","+bgColorRGB[1]+","+bgColorRGB[2]+")");
    }
    var textNode = document.createTextNode(text);
    textSpanNode.appendChild(textNode);

    var promptSpanNode=document.createElement("span");
    if (promptColorRGB !== null && bgColorRGB !== null) {
      promptSpanNode.setAttribute("style","color:rgb("+promptColorRGB[0]+","+promptColorRGB[1]+","+promptColorRGB[2]+");background-color:rgb("+bgColorRGB[0]+","+bgColorRGB[1]+","+bgColorRGB[2]+")");
    }
    var promptNode = document.createTextNode(prompt);
    promptSpanNode.appendChild(promptNode);

    queueUpdate(textSpanNode);
    queueUpdate(promptSpanNode);
  }

  // choiceText - array of functions returning menu choice text
  // choiceKeys - array of strings containing keys for menu choices
  // prompt - optional function returning prompt text
  // colors - optional RGB triples
  function printMenu(choiceText,choiceKeys,prompt,menuColor,menuBGColor,menuPromptColor,menuChoiceColor) {
    var onclickFuncs = [];
    for (var n=0;n<choiceKeys.length;n++) {
      onclickFuncs.push(function(){
        var key = choiceKeys[n];
        return function(e) {
          choose(key);
        }}());
    }
    var menuColorRGB, menuBGColorRGB, menuPromptColorRGB, menuChoiceColorRGB;
    if (menuColor===undefined) {
      menuColorRGB = color;
    } else {
      menuColorRGB = intToColor(menuColor);
    }
    if (menuBGColor===undefined) {
      menuBGColorRGB = bgColor;
    } else {
      menuBGColorRGB = intToColor(menuBGColor);
    }
    if (menuPromptColor===undefined) {
      menuPromptColorRGB = color;
    } else {
      menuPromptColorRGB = intToColor(menuPromptColor);
    }
    if (menuChoiceColor===undefined) {
      menuChoiceColorRGB = color;
    } else {
      menuChoiceColorRGB = intToColor(menuChoiceColor);
    }

    // Create the top level span element
    var menuSpan=document.createElement("span");
    menuSpan.setAttribute("style","color:rgb("+menuColorRGB[0]+","+menuColorRGB[1]+","+menuColorRGB[2]+");background-color:rgb("+menuBGColorRGB[0]+","+menuBGColorRGB[1]+","+menuBGColorRGB[2]+")");

    // create the choices
    for (var n=0;n<choiceText.length;n++){
      var choiceSpan=document.createElement("span");
      // XXX Add a unique identifier to each menuitem, in case there are multiple
      //     instances in the same browser
      choiceSpan.setAttribute("id","menuitem"+n);
      choiceSpan.setAttribute("class","menuitem");
      var parts = choiceText[n].split("("+choiceKeys[n]+")");
      for (var i=0;i<parts.length;i++){
        if (i>0) {
          var keySpan=document.createElement("span");
          keySpan.setAttribute("style","color:rgb("+menuChoiceColorRGB[0]+","+menuChoiceColorRGB[1]+","+menuChoiceColorRGB[2]+")");
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
      // Don't make a new line at the end if there's no prompt
      if (n<choiceText.length-1 || prompt!==undefined) {
	var newLine = document.createElement("br");
	menuSpan.appendChild(newLine);
      }
    }
    queueUpdate(menuSpan);
    if (prompt!==undefined) {
      var promptSpan=document.createElement("span");
      promptSpan.setAttribute("style","color:rgb("+menuPromptColorRGB[0]+","+menuPromptColorRGB[1]+","+menuPromptColorRGB[2]+")");
      var promptText=document.createTextNode(prompt);
      promptSpan.appendChild(promptText);
      queueUpdate(promptSpan);
    }
  }

  function clearMenu() {
    // De-activate the menu
    for (var n=0;n<menuListeners.length;n++) {
      var item = document.getElementById("menuitem"+n);
      removeEventListener(item,"click",menuListeners[n]);
      item.attributes.removeNamedItem("id");
      item.attributes.removeNamedItem("class");
    }
    menuListeners=[];
  }

  function setColor(c) {
    var newColor = intToColor(c);
    if (newColor === null) {
      return;
    } else {
      color = newColor;
    }
  }

  function setBGColor(c) {
    var newColor = intToColor(c);
    if (newColor == null) {
      return;
    } else {
      bgColor = newColor;
    }
  }

  return {
    getInputValue: getInputValue,
    setInputHandler: setInputHandler,
    sendQuietBlockElementUpdates: sendQuietBlockElementUpdates,
    sendUpdates: sendUpdates,
    clear: clear,
    print: print,
    printAsk: printAsk,
    scroll: scroll,
    printMenu: printMenu,
    clearMenu: clearMenu,
    setColor: setColor,
    setBGColor: setBGColor
  };
}
