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

  // There is also some IE specific code for focus behavior
