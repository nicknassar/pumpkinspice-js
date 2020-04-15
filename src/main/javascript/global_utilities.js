  // This file contains miscellaneous crap

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
  }
