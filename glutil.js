/**
* Contains classes and methods for easing development
* of WebGL applications.
* @module glutil
* @license CC0-1.0
*/
/* global Binders, BufferedMesh, FrameBuffer, GLMath, JSON, LightsBinder, LoadedTexture, Mesh, Promise, ShaderProgram, Transform, define, exports */
(function (root, factory) {
  "use strict";
if (typeof define === "function" && define.amd) {
    define([ "exports" ], factory);
  } else if (typeof exports === "object") {
    factory(exports);
  } else {
    factory(root);
  }
}(this, function (exports) {
  "use strict";
if (exports.GLUtil) { return; }

/*
  Polyfills
*/
if(!window.requestAnimationFrame){
 window.requestAnimationFrame=window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
 if(!window.requestAnimationFrame){
  window.requestAnimationFrame=function(func){
   window.setTimeout(function(){
    func(window.performance.now());
   },17);
  };
 }
}
if(!window.performance){
 window.performance={};
}
if(!window.performance.now){
 window.performance.now=function(){
   return (new Date().getTime()*1000)-window.performance._startTime;
 };
 window.performance._startTime=new Date().getTime()*1000;
}

/**
* Contains miscellaneous utility methods.
* @class
* @alias glutil.GLUtil
*/
var GLUtil={
/**
* This method will call a function once before returning,
* and queue requests to call that function once per frame,
* using <code>window.requestAnimationFrame</code>
* or a "polyfill" method.
* @param {Function} func The function to call.  The function
* takes one parameter, "time", which is the number of
* milliseconds since the page was loaded.
*/
"renderLoop":function(func){
  func(window.performance.now());
  var selfRefFunc=function(time){
   window.requestAnimationFrame(selfRefFunc);
   func(time);
  };
  window.requestAnimationFrame(selfRefFunc);
},
/**
* Creates an HTML canvas element, optionally appending
* it to an existing HTML element.
* @param {HTMLElement|null} parent If non-null, the parent
* element of the new HTML canvas element. The element will be
* appended as a child of this parent.
* @param {number|null} width Width of the new canvas
* element, or if null, the width a <code>canvas</code>
* element would ordinarily have
* under the CSS rules currently in effect where the canvas is. The resulting width will be rounded up.
* This parameter can't be a negative number.
* @param {number|null} height Height of the new canvas
* element, or if null, the height a <code>canvas</code>
* element would ordinarily have
* under the CSS rules currently in effect where the canvas is. The resulting height will be rounded up.
* This parameter can't be a negative number.
* @return {HTMLCanvasElement} The resulting canvas element.
*/
"createCanvasElement":function(parent, width, height){
 var canvas=document.createElement("canvas");
 if(parent){
  parent.appendChild(canvas);
 }
 if((width===null || typeof width==="undefined")){
  canvas.width=Math.ceil(canvas.clientWidth)+"";
 } else if(width<0){
  throw new Error("width negative");
 } else {
  canvas.width=Math.ceil(width)+"";
 }
 if((height===null || typeof height==="undefined")){
  canvas.height=Math.ceil(canvas.clientHeight)+"";
 } else if(height<0){
  throw new Error("height negative");
 } else {
  canvas.height=Math.ceil(height)+"";
 }
 return canvas;
},
/**
* Creates a 3D rendering context from an HTML canvas element,
* falling back to a 2D context if that fails.
* @param {HTMLCanvasElement} canvasElement An HTML
* canvas element.
* @return {WebGLRenderingContext} A 3D or 2D rendering context, or null
* if an error occurred in creating the context. Returns null if "canvasElement"
* is null or not an HTML canvas element.
*/
"get3DOr2DContext":function(canvasElement){
  if(!canvasElement)return null;
  if(!canvasElement.getContext)return null;
  var context=null;
  var options={"preserveDrawingBuffer":true};
  if(window.devicePixelRatio && window.devicePixelRatio>1){
   options.antialias=false;
  } else {
   options.antialias=true;
  }
  try { context=canvasElement.getContext("webgl", options);
  } catch(ex) { context=null; }
  if(!context){
    try { context=canvasElement.getContext("experimental-webgl", options);
    } catch(ex) { context=null; }
  }
  if(!context){
    try { context=canvasElement.getContext("moz-webgl", options);
    } catch(ex) { context=null; }
  }
  if(!context){
    try { context=canvasElement.getContext("webkit-3d", options);
    } catch(ex) { context=null; }
  }
  if(!context){
    try { context=canvasElement.getContext("2d", options);
    } catch(ex) { context=null; }
  }
  if(GLUtil.is3DContext(context)){
   context.getExtension("OES_element_index_uint");
   context.getExtension("OES_standard_derivatives");
  }
  return context;
},
/**
* Creates a 3D rendering context from an HTML canvas element.
* @param {HTMLCanvasElement} canvasElement An HTML
* canvas element.
* @param {function} err A function to call if an error occurs in creating
* the context.  The function takes one parameter consisting of a human-
* readable error message.  If "err" is null, window.alert() will be used instead.
* @return {WebGLRenderingContext} A 3D rendering context, or null
* if an error occurred in creating the context.  Returns null if "canvasElement"
* is null or not an HTML canvas element.
*/
"get3DContext":function(canvasElement,err){
  var c=GLUtil.get3DOr2DContext(canvasElement);
  var errmsg=null;
  if(!c && window.WebGLShader){
    errmsg="Failed to initialize graphics support required by this page.";
  } else if(window.WebGLShader && !GLUtil.is3DContext(c)){
    errmsg="This page requires WebGL, but it failed to start. Your computer might not support WebGL.";
  } else if(!c || !GLUtil.is3DContext(c)){
    errmsg="This page requires a WebGL-supporting browser.";
  }
  if(errmsg){
   (err || window.alert)(errmsg);
   return null;
  }
  return c;
},
/**
* Returns whether the given object is a 3D rendering context.
* @return {boolean} Return value.*/
"is3DContext":function(context){
 return context && ("compileShader" in context);
},
/**
* Utility function that returns a promise that
 * resolves after the given list of promises finishes
 * its work.
 * @param {Array<Promise>} promises - an array containing promise objects
 *  @param {Function} [progressResolve] - a function called as each
 *   individual promise is resolved; optional
 *  @param {Function} [progressReject] - a function called as each
 *   individual promise is rejected; optional
 * @return {Promise} A promise that is never rejected and resolves when
* all of the promises are each resolved or rejected. The result
 * of the promise will be an object with
 * three keys:<ul>
 *  <li>"successes" - contains a list of results from the
 *  promises that succeeded, in the order in which those promises were listed.
 *  <li>"failures" - contains a list of results from the
 *  promises that failed, in the order in which those promises were listed.
 *  <li>"results" - contains a list of boolean values for each
 * promise, in the order in which the promises were listed.
 * True means success, and false means failure.</ul>
 */
"getPromiseResults":function(promises,
   progressResolve, progressReject){
 if(!promises || promises.length===0){
  return Promise.resolve({
    successes:[], failures:[], results:[]});
 }
 function promiseResolveFunc(pr,ret,index){
   return function(x){
    if(pr)pr(x);
    ret.successes[index]=x;
    return true;
   };
 }
 function promiseRejectFunc(pr,ret,index){
   return function(x){
    if(pr)pr(x);
    ret.failures[index]=x;
    return true;
   };
 }
 var ret={successes:[], failures:[], results:[]};
 var newPromises=[];
 for(var i=0;i<promises.length;i++){
  var index=i;
  newPromises.push(promises[i].then(
    promiseResolveFunc(progressResolve,ret,index),
    promiseRejectFunc(progressReject,ret,index)
  ));
 }
 return Promise.all(newPromises).then(function(results){
  // compact the successes and failures arrays
  for(var i=0;i<ret.successes.length;i++){
   if(typeof ret.successes[i]==="undefined"){
    ret.successes.splice(i,1);
    i-=1;
   }
  }
  for(i=0;i<ret.failures.length;i++){
   if(typeof ret.failures[i]==="undefined"){
    ret.failures.splice(i,1);
    i-=1;
   }
  }
  ret.results=results;
  return Promise.resolve(ret);
 });
},
/**
* Loads a file from a URL asynchronously, using XMLHttpRequest.
* @param {string} url URL of the file to load.
* @param {string|null} responseType Expected data type of
* the file.  Can be "json", "xml", "text", or "arraybuffer".
* If null or omitted, the default is "text".
* @return {Promise} A promise that resolves when the data
* file is loaded successfully (the result will be an object with
* two properties: "url", the URL of the file, and "data", the
* file's text or data), as given below, and is rejected when an error occurs (the
* result may be an object with
* one property: "url", the URL of the file).  If the promise resolves,
* the parameter's "data" property will be:<ul>
* <li>For response type "xml", an XML document object.
* <li>For response type "arraybuffer", an ArrayBuffer object.
* <li>For response type "json", the JavaScript object decoded
* from JSON.
* <li>For any other type, a string of the file's text.</ul>
*/
"loadFileFromUrl":function(url,responseType){
 var urlstr=url;
 var respType=responseType||"text";
 return new Promise(function(resolve, reject){
   var xhr=new XMLHttpRequest();
   xhr.onreadystatechange=function(e){
    var t=e.target;
    if(t.readyState===4){
     if(t.status>=200 && t.status<300){
      var resp="";
      if(respType==="xml")resp=t.responseXML;
      else if(respType==="json")
        resp=("response" in t) ? t.response : JSON.parse(t.responseText);
      else if(respType==="arraybuffer")
        resp=t.response;
      else resp=t.responseText+"";
      resolve({"url": urlstr, "data": resp});
     } else {
      reject({"url": urlstr});
     }
    }
   };
   xhr.onerror=function(e){
    reject({"url": urlstr, "error": e});
   };
   xhr.open("get", url, true);
   xhr.responseType=respType;
   xhr.send();
 });
}
};

/**
* Gets the position of a time value within an interval.
* This is useful for doing animation cycles lasting a certain number
* of seconds, such as rotating a shape in a 5-second cycle.
* This method may be called any number of times each frame.
* @param {object} timer An object that will hold two
* properties:<ul>
* <li>"time" - initial time value, in milliseconds.
* <li>"lastTime" - last known time value, in milliseconds.
* Will be set to the value given in "timeInMs" before returning.
* </ul>
* The object should be initialized using the idiom <code>{}</code>
* or <code>new Object()</code>.
* @param {number} timeInMs A time value, in milliseconds.
* This could be the parameter received in a
* <code>requestAnimationFrame()</code> callback method.
* </code>.
* @param {number} intervalInMs The length of the interval
* (animation cycle), in milliseconds.
* @return {number} A value in the range [0, 1), where closer
* to 0 means "timeInMs" lies
* closer to the start, and closer to 1 means closer
* to the end of the interval.  If an initial time wasn't set, returns 0.
* @example <caption>The following code sets an angle of
* rotation, in degrees, such that an object rotated with the
* angle does a 360-degree turn in 5 seconds (5000 milliseconds).
* The variable <code>time</code> is assumed to be a time
* value in milliseconds, such as the parameter of a
* <code>requestAnimationFrame()</code> callback method.
* </caption>
* var angle = 360 * GLUtil.getTimePosition(timer, time, 5000);
*/
GLUtil.getTimePosition=function(timer,timeInMs,intervalInMs){
 if(((typeof timer.time==="undefined" || timer.time===null))) {
  timer.time=timeInMs;
  timer.lastTime=timeInMs;
  return 0;
 } else {
  if(((typeof timer.lastTime==="undefined" || timer.lastTime===null)))timer.lastTime=timeInMs;
  return (((timeInMs-timer.time)*1.0)%intervalInMs)/intervalInMs;
 }
};
/**
* Returns the number of frame-length intervals that occurred since
* the last known time, where a frame's length is 1/60 of a second.
* This method should be called only once each frame.
* @param {object} timer An object described
* in {@link glutil.GLUtil.getTimePosition}.
* @param {number} timeInMs A time value, in milliseconds.
* This could be the parameter received in a
* <code>requestAnimationFrame()</code> callback method.
* </code>.
* @return {number} The number of frame-length intervals relative to
* the last known time held in the parameter "timer".
* The number can include fractional frames.  If an
* initial time or last known time wasn't set, returns 0.
*/
GLUtil.newFrames=function(timer,timeInMs){
 if(((typeof timer.time==="undefined" || timer.time===null))) {
  timer.time=timeInMs;
  timer.lastTime=timeInMs;
  return 0;
 } else if(((typeof timer.lastTime==="undefined" || timer.lastTime===null))){
  timer.lastTime=timeInMs;
  return 0;
 } else {
  var diff=(timeInMs-timer.lastTime);
  timer.lastTime=timeInMs;
  return diff*60.0/1000.0;
 }
};

(function(exports){

var hlsToRgb=function(hls) {

var hueval=hls[0]*1.0;//[0-360)
 var lum=hls[1]*1.0;//[0-255]
 var sat=hls[2]*1.0;//[0-255]
 lum=(lum<0 ? 0 : (lum>255 ? 255 : lum));
 sat=(sat<0 ? 0 : (sat>255 ? 255 : sat));
 if(sat===0){
  return [lum,lum,lum];
 }
 var b=0;
 if (lum<=127.5){
  b=(lum*(255.0+sat))/255.0;
 } else {
  b=lum*sat;
  b=b/255.0;
  b=lum+sat-b;
 }
 var a=(lum*2)-b;
 var r,g,bl;
 if(hueval<0||hueval>=360)hueval=(((hueval%360)+360)%360);
 var hue=hueval+120;
 if(hue>=360)hue-=360;
 if (hue<60) r=(a+(b-a)*hue/60);
 else if (hue<180) r=b;
 else if (hue<240) r=(a+(b-a)*(240-hue)/60);
 else r=a;
 hue=hueval;
 if (hue<60) g=(a+(b-a)*hue/60);
 else if (hue<180) g=b;
 else if (hue<240) g=(a+(b-a)*(240-hue)/60);
 else g=a;
 hue=hueval-120;
 if(hue<0)hue+=360;
 if (hue<60) bl=(a+(b-a)*hue/60);
 else if (hue<180) bl=b;
 else if (hue<240) bl=(a+(b-a)*(240-hue)/60);
 else bl=a;
 return [(r<0 ? 0 : (r>255 ? 255 : r)),
   (g<0 ? 0 : (g>255 ? 255 : g)),
   (bl<0 ? 0 : (bl>255 ? 255 : bl))];
};
// Converts a representation of a color to its RGB form
// Returns a 4-item array containing the intensity of red,
// green, blue, and alpha (each from 0-255)
// Returns null if the color can't be converted
var colorToRgba=function(x){

 function parsePercent(x){ var c; return ((c=parseFloat(x))<0 ? 0 : (c>100 ? 100 : c))*255/100; }
 function parseAlpha(x){ var c; return ((c=parseFloat(x))<0 ? 0 : (c>1 ? 1 : c))*255; }
 function parseByte(x){ var c; return ((c=parseInt(x,10))<0 ? 0 : (c>255 ? 255 : c)); }
 function parseHue(x){ var r1=parseFloat(e[1]);if(r1<0||r1>=360)r1=(((r1%360)+360)%360); return r1; }
var e=null;
 if(!x)return null;
 var b,c,r1,r2,r3,r4,rgb;
 if((e=(/^#([A-Fa-f0-9]{2})([A-Fa-f0-9]{2})([A-Fa-f0-9]{2})$/.exec(x)))!==null){
  return [parseInt(e[1],16),parseInt(e[2],16),parseInt(e[3],16),255];
 } else if((e=(/^rgb\(\s*([\+\-]?\d+(?:\.\d+)?%)\s*,\s*([\+\-]?\d+(?:\.\d+)?%)\s*,\s*([\+\-]?\d+(?:\.\d+)?%)\s*\)$/.exec(x)))!==null){
  return [parsePercent(e[1]),parsePercent(e[2]),parsePercent(e[3]),255];
 } else if((e=(/^rgb\(\s*([\+\-]?\d+)\s*,\s*([\+\-]?\d+)\s*,\s*([\+\-]?\d+)\s*\)$/.exec(x)))!==null){
  return [parseByte(e[1]),parseByte(e[2]),parseByte(e[3]),255];
 } else if((e=(/^rgba\(\s*([\+\-]?\d+(?:\.\d+)?%)\s*,\s*([\+\-]?\d+(?:\.\d+)?%)\s*,\s*([\+\-]?\d+(?:\.\d+)?%)\s*,\s*([\+\-]?\d+(?:\.\d+)?)\s*\)$/.exec(x)))!==null){
  return [parsePercent(e[1]),parsePercent(e[2]),parsePercent(e[3]),parseAlpha(e[4])];
 } else if((e=(/^rgba\(\s*([\+\-]?\d+)\s*,\s*([\+\-]?\d+)\s*,\s*([\+\-]?\d+)\s*,\s*([\+\-]?\d+(?:\.\d+)?)\s*\)$/.exec(x)))!==null){
  return [parseByte(e[1]),parseByte(e[2]),parseByte(e[3]),parseAlpha(e[4])];
 } else if((e=(/^#([A-Fa-f0-9]{1})([A-Fa-f0-9]{1})([A-Fa-f0-9]{1})$/.exec(x)))!==null){
  var a=parseInt(e[1],16); b=parseInt(e[2],16); c=parseInt(e[3],16);
  return [a+(a<<4),b+(b<<4),c+(c<<4),255];
 } else if((e=(/^hsl\(\s*([\+\-]?\d+(?:\.\d+)?)\s*,\s*([\+\-]?\d+(?:\.\d+)?)%\s*,\s*([\+\-]?\d+(?:\.\d+)?)%\s*\)$/.exec(x)))!==null){
  rgb=hlsToRgb([parseHue(e[1]),parsePercent(e[3]),parsePercent(e[2])]);
  return [rgb[0],rgb[1],rgb[2],255];
 } else if((e=(/^hsla\(\s*([\+\-]?\d+(?:\.\d+)?)\s*,\s*([\+\-]?\d+(?:\.\d+)?)%\s*,\s*([\+\-]?\d+(?:\.\d+)?)%\s*,\s*([\+\-]?\d+(?:\.\d+)?)\s*\)$/.exec(x)))!==null){
  rgb=hlsToRgb([parseHue(e[1]),parsePercent(e[3]),parsePercent(e[2])]);
  return [rgb[0],rgb[1],rgb[2],parseAlpha(e[4])];
 } else {
  setUpNamedColors();
  x=x.toLowerCase();
  if(x.indexOf("grey")>=0)x=x.replace("grey","gray");// support "grey" variants
  var ret=namedColors[x];
  if(typeof ret==="string")return colorToRgba(ret);
  if(x==="transparent")return [0,0,0,0];
  return null;
 }
};

var clampRgba=function(x){
 x[0]=(x[0]<0 ? 0 : Math.min(x[0],1));
 x[1]=(x[1]<0 ? 0 : Math.min(x[1],1));
 x[2]=(x[2]<0 ? 0 : Math.min(x[2],1));
 x[3]=(x[3]<0 ? 0 : Math.min(x[3],1));
 return x
}
/**
* Creates a 4-element array representing a color.  Each element
* can range from 0 to 1 and specifies the red, green, blue or alpha
* component, respectively.
* This method also converts HTML and CSS colors to 4-element RGB
* colors.  The following lists the kinds of colors accepted:
* <ul>
* <li>HTML colors with the syntax <code>#RRGGBB</code>, where
* RR is the hexadecimal form of the red component (00-FF), GG
* is the hexadecimal green component, and BB is the hexadecimal
* blue component.  Example: #88DFE0.
* <li>HTML colors with the syntax <code>#RGB</code>, where
* R is the hexadecimal form of the red component (0-F), G
* is the hexadecimal green component, and B is the hexadecimal
* blue component.  Example: #8DE.
* <li>CSS colors with the syntax <code>rgb(red, green, blue)</code> or
* <code>rgba(red, green, blue, alpha)</code> where
* <code>red</code>, <code>green</code>, and <code>blue</code>
* are the red, green, and blue components, respectively, either as a
* number (0-255) or as a percent, and <code>alpha</code> is
* a number from 0-1 specifying the alpha component.
* Examples: <code>rgb(255,0,0)</code>,
* <code>rgb(100%,50%,0%)</code>, <code>rgba(20,255,255,0.5)</code>.
* <li>CSS colors with the syntax <code>hsl(hue, sat, light)</code> or
* <code>hsla(hue, sat, light, alpha)</code> where
* <code>hue</code> is the hue component in degrees (0-360),
* <code>sat</code> and <code>light</code>
* are the saturation and lightness components, respectively, as percents,
* and <code>alpha</code> is
* a number from 0-1 specifying the alpha component.
* Examples: <code>rgb(255,0,0)</code>,
* <code>hsl(200,50%,50%)</code>, <code>hsla(20,80%,90%,0.5)</code>.
* <li>CSS colors such as <code>red</code>, <code>green</code>,
* <code>white</code>, <code>lemonchiffon</code>, <code>chocolate</code>,
* and so on, including the newly added <code>rebeccapurple</code>.
* <li>The value <code>transparent</code>, meaning transparent black.
* </ul>
* For more information:
* [Colors in HTML and How to Enter Them]{@link http://upokecenter.dreamhosters.com/articles/miscellaneous/how-to-enter-colors/}.
* @alias glutil.GLUtil.toGLColor
* @param {Array<number>|number|string} r One of the following:<ul>
* <li>A <b>color vector or string</b>, which can be one of these:<ul>
* <li>An array of three color components, each of which ranges from 0 to 1.
The three components are red, green, and blue in that order.</li>
* <li>An array of four color components, each of which ranges from 0 to 1.
The three components are red, green, blue, and alpha in that order.</li>
* <li>A string specifying an HTML or CSS color, in one of the formats mentioned
* above in the method description.</li></ul></li>
* <li>A number specifying the red component.  Must range from 0 to 1.</li>
* </ul>
* Returns (0,0,0,0) if this value is null.
* @param {number} g Green color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} b Blue color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} [a] Alpha color component (0-1).
* If the "r" parameter is given and this parameter is null or omitted,
* this value is treated as 1.0.
* @return the color as a 4-element array; if the color is
* invalid, returns [0,0,0,0] (transparent black). Numbers less
* than 0 are clamped to 0, and numbers greater than 1 are
* clamped to 1.
*/
exports.toGLColor=function(r,g,b,a){
 if((r===null || typeof r==="undefined"))return [0,0,0,0];
 if(typeof r==="string"){
   var rgba=colorToRgba(r) || [0,0,0,0];
   var mul=1.0/255;
   rgba[0]*=mul;
   rgba[1]*=mul;
   rgba[2]*=mul;
   rgba[3]*=mul;
   return clampRgba(rgba);
 }
 if(typeof r==="number" &&
     typeof g==="number" && typeof b==="number"){
   return [r,g,b,(typeof a!=="number") ? 1.0 : a];
 } else if(r.constructor===Array){
   return clampRgba([r[0]||0,r[1]||0,r[2]||0,
     (typeof r[3]!=="number") ? 1.0 : r[3]]);
 } else {
   return clampRgba(r || [0,0,0,0]);
 }
};

var namedColors=null;
var setUpNamedColors=function(){

if(!namedColors){
    var nc=("aliceblue,f0f8ff,antiquewhite,faebd7,aqua,00ffff,aquamarine,7fffd4,azure,f0ffff,beige,f5f5dc,bisque,ffe4c4,black,000000,blanchedalmond,ffebcd,blue,0000ff,"+
"blueviolet,8a2be2,brown,a52a2a,burlywood,deb887,cadetblue,5f9ea0,chartreuse,7fff00,chocolate,d2691e,coral,ff7f50,cornflowerblue,6495ed,cornsilk,fff8dc,"+
"crimson,dc143c,cyan,00ffff,darkblue,00008b,darkcyan,008b8b,darkgoldenrod,b8860b,darkgray,a9a9a9,darkgreen,006400,darkkhaki,bdb76b,darkmagenta,8b008b,"+
"darkolivegreen,556b2f,darkorange,ff8c00,darkorchid,9932cc,darkred,8b0000,darksalmon,e9967a,darkseagreen,8fbc8f,darkslateblue,483d8b,darkslategray,2f4f4f,"+
"darkturquoise,00ced1,darkviolet,9400d3,deeppink,ff1493,deepskyblue,00bfff,dimgray,696969,dodgerblue,1e90ff,firebrick,b22222,floralwhite,fffaf0,forestgreen,"+
"228b22,fuchsia,ff00ff,gainsboro,dcdcdc,ghostwhite,f8f8ff,gold,ffd700,goldenrod,daa520,gray,808080,green,008000,greenyellow,adff2f,honeydew,f0fff0,hotpink,"+
"ff69b4,indianred,cd5c5c,indigo,4b0082,ivory,fffff0,khaki,f0e68c,lavender,e6e6fa,lavenderblush,fff0f5,lawngreen,7cfc00,lemonchiffon,fffacd,lightblue,add8e6,"+
"lightcoral,f08080,lightcyan,e0ffff,lightgoldenrodyellow,fafad2,lightgray,d3d3d3,lightgreen,90ee90,lightpink,ffb6c1,lightsalmon,ffa07a,lightseagreen,20b2aa,"+
"lightskyblue,87cefa,lightslategray,778899,lightsteelblue,b0c4de,lightyellow,ffffe0,lime,00ff00,limegreen,32cd32,linen,faf0e6,magenta,ff00ff,maroon,800000,"+
"mediumaquamarine,66cdaa,mediumblue,0000cd,mediumorchid,ba55d3,mediumpurple,9370d8,mediumseagreen,3cb371,mediumslateblue,7b68ee,mediumspringgreen,"+
"00fa9a,mediumturquoise,48d1cc,mediumvioletred,c71585,midnightblue,191970,mintcream,f5fffa,mistyrose,ffe4e1,moccasin,ffe4b5,navajowhite,ffdead,navy,"+
"000080,oldlace,fdf5e6,olive,808000,olivedrab,6b8e23,orange,ffa500,orangered,ff4500,orchid,da70d6,palegoldenrod,eee8aa,palegreen,98fb98,paleturquoise,"+
"afeeee,palevioletred,d87093,papayawhip,ffefd5,peachpuff,ffdab9,peru,cd853f,pink,ffc0cb,plum,dda0dd,powderblue,b0e0e6,purple,800080,rebeccapurple,663399,red,ff0000,rosybrown,"+
"bc8f8f,royalblue,4169e1,saddlebrown,8b4513,salmon,fa8072,sandybrown,f4a460,seagreen,2e8b57,seashell,fff5ee,sienna,a0522d,silver,c0c0c0,skyblue,87ceeb,"+
"slateblue,6a5acd,slategray,708090,snow,fffafa,springgreen,00ff7f,steelblue,4682b4,tan,d2b48c,teal,008080,thistle,d8bfd8,tomato,ff6347,turquoise,40e0d0,violet,"+
"ee82ee,wheat,f5deb3,white,ffffff,whitesmoke,f5f5f5,yellow,ffff00,yellowgreen,9acd32").split(",");
    namedColors={};
    for(var i=0;i<nc.length;i+=2){
     namedColors[nc[i]]="#"+nc[i+1];
    }
  }
};
})(GLUtil);

/** @private */
GLUtil._toContext=function(context){
 return (context && context.getContext) ? context.getContext() : context;
};
/** @private */
GLUtil._isPowerOfTwo=function(a){
   if(Math.floor(a)!==a || a<=0)return false;
   while(a>1 && (a&1)===0){
    a>>=1;
   }
   return (a===1);
};
/** @private */
GLUtil._isIdentityExceptTranslate=function(mat){
return (
    mat[0]===1 && mat[1] === 0 && mat[2] === 0 && mat[3] === 0 &&
    mat[4] === 0 && mat[5] === 1 && mat[6] === 0 && mat[7] === 0 &&
    mat[8] === 0 && mat[9] === 0 && mat[10] === 1 && mat[11] === 0 &&
    mat[15] === 1
 );
};
///////////////////////

/**
* Specifies parameters for light sources.
* @class
* @alias glutil.LightSource
*/
function LightSource(position, ambient, diffuse, specular) {
 /**
 * A 4-element vector giving an additional color to multiply with the ambient
 * color of each object, in the red, green,
 * and blue components respectively.
 * The default is (0,0,0,1), or black. Not used in the default shader program.
 */
 this.ambient=ambient || [0,0,0,1.0];
 /**
 * Light position.  An array of four numbers, where the first three numbers are the X, Y, and Z components and the fourth number is the W component.<ul>
<li>    If W is 0, then X, Y, and Z specify a 3-element vector giving the direction of the light; the light will shine everywhere in the given direction.
 <li>   If W is 1, then X, Y, and Z specify the position of the light in world space; the light will shine brightest, and in every direction, at the given position.</ul>
*/
 this.position=position ? [position[0],position[1],position[2],1.0] :
   [0, 0, 1, 0];
 /**
 * A 4-element vector giving an additional color to multiply with the diffusion
 * color of each object (which is also called "albedo"), in the red, green,
 * and blue components respectively. Diffuse color is the color
 * seen when light passes through a material and bounces back (diffusion).  Each component ranges from 0 to 1.
 * The simulated diffusion scatters evenly, in every direction.
 * The default is (1,1,1,1), or white.
 */
 this.diffuse=diffuse||[1,1,1,1];
 /**
 * A 3-element vector giving the color of the light when it causes a specular
 * reflection, in the red, green,
 * and blue components respectively.  Each component ranges from 0 to 1.
 * A specular reflection is a reflection in the same angle as the light reaches
 * an object, like a mirror.  Specular reflections can cause shiny
 * highlights depending on the viewing angle.
 * The default is (1,1,1), or white.
 */
 this.specular=specular||[1,1,1];
}
/**
* Sets parameters for this material object.
* @param {object} params An object whose keys have
* the possibilities given below, and whose values are those
* allowed for each key.<ul>
* <li><code>position</code> - Light position.  (See {@link glutil.LightSource#position}.)
* <li><code>ambient</code> - Not used in the default shader program.
* <li><code>diffuse</code> - A [color vector or string]{@link glutil.GLUtil.toGLColor} giving an additional color to multiply with the diffusion
 * color of each object (which is also called "albedo").
 * The default is (1, 1, 1, 1) for light index 0 and (0, 0, 0, 0) otherwise.
* <li><code>specular</code> - A [color vector or string]{@link glutil.GLUtil.toGLColor} giving the color of specular highlights caused by the light.
 * The default is (1, 1, 1) for light index 0 and (0, 0, 0) otherwise.
* </ul>
* If a value is null or undefined, it is ignored.
* @return {glutil.Material} This object.
*/
LightSource.prototype.setParams=function(params){
 if(((typeof params.ambient!=="undefined" && ((typeof params.ambient!=="undefined" && ((typeof params.ambient!=="undefined" && params.ambient!==null))))))){
  this.ambient=GLUtil.toGLColor(params.ambient);
  this.ambient=this.ambient.slice(0,4);
 }
 if(((typeof params.position!=="undefined" && ((typeof params.position!=="undefined" && ((typeof params.position!=="undefined" && params.position!==null))))))){
  var position=params.position;
  this.position=[position[0],position[1],position[2],
    (position[3]===null) ? 0.0 : position[3]];
 }
 if(((typeof params.specular!=="undefined" && ((typeof params.specular!=="undefined" && ((typeof params.specular!=="undefined" && params.specular!==null))))))){
  this.specular=GLUtil.toGLColor(params.specular);
 }
 if(((typeof params.diffuse!=="undefined" && ((typeof params.diffuse!=="undefined" && ((typeof params.diffuse!=="undefined" && params.diffuse!==null))))))){
  this.diffuse=GLUtil.toGLColor(params.diffuse);
 }
 return this;
};

/**
* A collection of light sources.  It stores the scene's
* ambient color as well as data on one or more light sources.
* When constructed, the default lighting will have a default
* ambient color and one directional light source.
* @class
* @alias glutil.Lights
*/
function Lights(){
 this.lights=[new LightSource()];
 /**
 *  Ambient color for the scene.  This is the color of the light
 *  that shines on every part of every object equally and in
 *  every direction. In the absence of
 *  other lighting effects, all objects will be given this color.<p>
 *  <small>Ambient light is a simplified simulation of the
 * real-world effect of light bouncing back and forth between
 * many different objects in an area.  One example of this
 * phenomenon is sunlight reaching an indoor room without
 * directly hitting it, such that the sunlight bounces off the walls
 * and so illuminates most of the room pretty much uniformly.
 * Ambient lights simulate this phenomenon.</small>
 *  @default
 */
 this.sceneAmbient=[0.2,0.2,0.2];
}
/** Maximum number of lights supported
   by the default shader program.
   @const
   */
Lights.MAX_LIGHTS = 3;
/** @private */
Lights._createNewLight=function(index){
 var ret=new LightSource();
 if(index!==0){
  ret.diffuse=[0,0,0,0];
  ret.specular=[0,0,0];
 }
 return ret;
};
/**
 * Gets the number of lights defined in this object.
 * @return {number} Return value. */
Lights.prototype.getCount=function(){
 return this.lights.length;
};

/**
 * Gets information about the light source at the given index.
 * @param {number} index Zero-based index of the light to set.  The first
 * light has index 0, the second has index 1, and so on.
 * If the light doesn't exist at that index, it will be created.
 * @return {LightSource} The corresponding light source object.
 */
Lights.prototype.getLight=function(index){
 var oldLength=this.lights.length;
 if(!this.lights[index])this.lights[index]=Lights._createNewLight(index);
 if(this.lights.length-oldLength>=2){
  // Ensure existence of lights that come between the new
  // light and the last light
  for(var i=oldLength;i<this.lights.length;i++){
   if(!this.lights[i]){
    this.lights[i]=Lights._createNewLight(i);
   }
  }
 }
 return this.lights[index];
};
/**
 * Not documented yet.
 * @param {number} index Zero-based index of the light to set.  The first
 * light has index 0, the second has index 1, and so on.
 * If the light doesn't exist at that index, it will be created.
 * @param {object} params An object as described in {@link glutil.LightSource.setParams}.
 * @return {Lights} This object.
 */
Lights.prototype.setParams=function(index,params){
 this.getLight(index).setParams(params);
 return this;
};

/**
 * Sets a directional light.
 * @param {number} index Zero-based index of the light to set.  The first
 * light has index 0, the second has index 1, and so on.
 * If the light doesn't exist at that index, it will be created.
 * @param {Array<number>} direction A 3-element vector giving the direction of the light, along the X, Y, and Z
 * axes, respectively.
 * @param {Array<number>} [diffuse] A [color vector or string]{@link glutil.GLUtil.toGLColor}  giving the diffuse color of the light.
 * If null or omitted, the diffuse color will remain unchanged. The default is (1, 1, 1, 1) for light index 0 and (0, 0, 0, 0) otherwise.
 * @param {Array<number>} [specular] A [color vector or string]{@link glutil.GLUtil.toGLColor}  giving the color of specular highlights caused by
 * the light.
 * If null or omitted, the specular highlight color will
 * remain unchanged.  The default is (1, 1, 1) for light index 0 and (0, 0, 0) otherwise.
 * @return {Lights} This object.
 */
Lights.prototype.setDirectionalLight=function(index,direction,diffuse,specular){
 var ret=this.setParams(index,{"position":[direction[0],direction[1],direction[2],0]});
 if(diffuse!=null)
   ret=ret.setParams({"diffuse":diffuse});
 if(specular!=null)
   ret=ret.setParams({"specular":specular});
 return ret;
};
/**
 * Sets a point light.
 * @param {number} index Zero-based index of the light to set.  The first
 * light has index 0, the second has index 1, and so on.
 * If the light doesn't exist at that index, it will be created.
 * @param {Array<number>} position A 3-element vector giving the X, Y, and Z
 * coordinates, respectively, of the light, in world coordinates.
 * @param {Array<number>} [diffuse] Diffuse color, as described in {@link glutil.Lights.setDirectionalLight}.
 * @param {Array<number>} [specular] Specular color, as described in {@link glutil.Lights.setDirectionalLight}.
 * @return {Lights} This object.
 */
Lights.prototype.setPointLight=function(index,position){
 var ret=this.setParams(index,{"position":[position[0],position[1],position[2],1]});
 if(diffuse!=null)
   ret=ret.setParams({"diffuse":diffuse});
 if(specular!=null)
   ret=ret.setParams({"specular":specular});
 return ret;
};

/**
 * Sets the color of the scene's ambient light.
* @param {Array<number>|number|string} r Array of three or
* four color components; or the red color component (0-1); or a string
* specifying an [HTML or CSS color]{@link glutil.GLUtil.toGLColor}.
* @param {number} g Green color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} b Blue color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} [a] Alpha color component (0-1).
* Currently not used.
* @return {glutil.Scene3D} This object.
 */
Lights.prototype.setAmbient=function(r,g,b,a){
 this.sceneAmbient=GLUtil.toGLColor(r,g,b,a);
 return this;
}

////////////////////

/**
*  Specifies a texture, which can serve as image data applied to
*  the surface of a shape, or even a 2-dimensional array of pixels
*  used for some other purpose, such as a depth map, a height map,
*  a bump map, a specular map, and so on.<p>
* By default, texture coordinates go from (0,0) at the lower left corner
* to (1,1) at the upper right corner.
* @class
* @alias glutil.Texture
* @param {string} name URL of the texture data.  It will be loaded via
*  the JavaScript DOM's Image class.  However, this constructor
*  will not load that image yet.
*/
var Texture=function(name){
 this.image=null;
 this.loadStatus=0;
 this.loadedTexture=null;
 this.name=name;
 this.width=0;
 this.clamp=false;
 this.height=0;
};

/**
* Sets the wrapping behavior of texture coordinates that
* fall out of range when using this texture.  This setting
* will only have an effect on textures whose width and height
* are both powers of two.  For other textures, this setting
* is ignored and out-of-range texture coordinates are
* always clamped.
* @param {boolean} clamp If true, the image's texture
* coordinates will be clamped to the range [0, 1].  If false,
* the image's texture coordinates' fractional parts will
* be used as the coordinates (causing wraparound).
* The default is false.
* @return {glutil.Texture} This object.
*/
Texture.prototype.setClamp=function(clamp){
 this.clamp=clamp;
 return this;
};

/**
*  Loads a texture by its URL.
* @param {string} name URL of the texture data.  Images with a TGA
* extension that use the RGBA or grayscale format are supported.
* Images supported by the browser will be loaded via
* the JavaScript DOM's Image class.
* @param {Object} [textureCache] An object whose keys
* are the names of textures already loaded.  This will help avoid loading
* the same texture more than once.  This parameter is optional
* and may be omitted.
* @return {Promise} A promise that resolves when the texture
* is fully loaded.  If it resolves, the result will be a Texture object.
*/
Texture.loadTexture=function(name, textureCache){
 // Get cached texture
 if(textureCache && textureCache[name]){
   return Promise.resolve(textureCache[name]);
 }
 var texImage=new Texture(name);
 if(textureCache){
  textureCache[name]=texImage;
 }
 // Load new texture and cache it
 return texImage.loadImage().then(
  function(result){
   return result;
  },
  function(name){
    return Promise.reject(name.name);
  });
};

/**
*  Creates a texture from a byte array specifying the texture data.
* @param {Uint8Array} array A byte array containing the texture data,
* with the pixels arranged in left-to-right rows from top to bottom.
* Each pixel takes 4 bytes, where the bytes are the red, green, blue,
* and alpha components, in that order.
* @param {Uint8Array} width Width, in pixels, of the texture.
* @param {Uint8Array} height Height, in pixels, of the texture.
* @return {glutil.Texture} The new Texture object.
*/
Texture.fromUint8Array=function(array, width, height){
 if(width<0)throw new Error("width less than 0");
 if(height<0)throw new Error("height less than 0");
 if(array.length<width*height*4)throw new Error("array too short for texture");
 var texImage=new Texture("");
 texImage.image=array;
 texImage.width=Math.ceil(width);
 texImage.height=Math.ceil(height);
 texImage.loadStatus=2;
 return texImage;
};

/** @private */
Texture.loadTga=function(name){
 var tex=this;
 return GLUtil.loadFileFromUrl(name,"arraybuffer")
 .then(function(buf){
   var view=new DataView(buf.data);
   var id=view.getUint8(0);
   var cmaptype=view.getUint8(1);
   var imgtype=view.getUint8(2);
   if(imgtype!==2 && imgtype!==3){
    return Promise.reject(new Error("unsupported image type"));
   }
   var xorg=view.getUint16(8,true);
   var yorg=view.getUint16(10,true);
   if(xorg!==0 || yorg!==0){
    return Promise.reject(new Error("unsupported origins"));
   }
   var width=view.getUint16(12,true);
   var height=view.getUint16(14,true);
   if(width===0 || height === 0){
    return Promise.reject(new Error("invalid width or height"));
   }
   var pixelsize=view.getUint8(16);
   if(!(pixelsize===32 && imgtype === 2) &&
      !(pixelsize===24 && imgtype === 2) &&
      !(pixelsize===8 && imgtype === 3)){
    return Promise.reject(new Error("unsupported pixelsize"));
   }
   var size=width*height;
   if(size>buf.data.length){
    return Promise.reject(new Error("size too big"));
   }
   var i;
   var arr=new Uint8Array(size*4);
   var offset=18;
   var io=0;
   if(pixelsize===32 && imgtype === 2){
    for(i=0,io=0;i<size;i++,io+=4){
     arr[io+2]=view.getUint8(offset);
     arr[io+1]=view.getUint8(offset+1);
     arr[io]=view.getUint8(offset+2);
     arr[io+3]=view.getUint8(offset+3);
     offset+=4;
    }
   } else if(pixelsize===24 && imgtype === 2){
    for(i=0,io=0;i<size;i++,io+=4){
     arr[io+2]=view.getUint8(offset);
     arr[io+1]=view.getUint8(offset+1);
     arr[io]=view.getUint8(offset+2);
     arr[io+3]=0xFF;
     offset+=3;
    }
   } else if(pixelsize===8 && imgtype === 3){
    for(i=0,io=0;i<size;i++,io+=4){
     var col=view.getUint8(offset);
     arr[io]=col;
     arr[io+1]=col;
     arr[io+2]=col;
     arr[io+3]=0xFF;
     offset++;
    }
   }
   buf.data=null;
   return {"width":width,"height":height,"image":arr};
  });
};

/** @private */
Texture.prototype.loadImage=function(){
 if(this.image!==null){
  // already loaded
  return Promise.resolve(this);
 }
 var thisImage=this;
 var thisName=this.name;
 thisImage.loadStatus=1;
 if((/\.tga$/i).test(thisName)){
  return Texture.loadTga(thisName).then(function(e){
   thisImage.image=e.image;
   thisImage.width=e.width;
   thisImage.height=e.height;
   thisImage.loadStatus=2;
   return thisImage;
  },function(e){
   thisImage.loadStatus=-1;
   return Promise.reject({"name":thisName,"error":e});
  });
 }
 return new Promise(function(resolve,reject){
  var image=new Image();
  image.onload=function(e) {
   var target=e.target;
   thisImage.image=target;
   thisImage.width=target.width;
   thisImage.height=target.height;
   thisImage.loadStatus=2;
   resolve(thisImage);
  };
  image.onerror=function(e){
   thisImage.loadStatus=-1;
   reject({"name":thisName,"error":e});
  };
  image.src=thisName;
 });
};
/**
 * Disposes the texture data in this object.
 */
Texture.prototype.dispose=function(){
 if(this.loadedTexture!==null){
  this.loadedTexture.dispose();
  this.loadedTexture=null;
 }
};

/**
* Gets the name of this texture.
*/
Texture.prototype.getName=function(){
 return name;
}

////////////////////////////////////////

/**
 * A holder object representing a 3D scene.  This object includes
 * information on:<ul>
 *<li> A projection matrix, for setting the camera projection.</li>
 *<li> A view matrix, for setting the camera's view and position.</li>
 *<li> Lighting parameters.</li>
 *<li> Shapes to be drawn to the screen.</li>
 *<li> A texture cache.</li>
 *<li> A screen-clearing background color.</li>
 *</ul>
 * When a Scene3D object is created, it sets the projection and view matrices to identity.
 * The default lighting for the scene will have a default
* ambient color and one directional light source.
*  @class
* @alias glutil.Scene3D
 * @param {WebGLRenderingContext|object} canvasOrContext
 * A WebGL 3D context to associate with this scene, or an HTML
 * canvas element to create a WebGL context from, or an object, such as Scene3D, that
* implements a no-argument <code>getContext</code> method
* that returns a WebGL context.
 */
function Scene3D(canvasOrContext){
 var context=canvasOrContext;
 if(typeof canvasOrContext.getContext==="function"){
  // This might be a canvas, so create a WebGL context.
  if(HTMLCanvasElement && context.constructor===HTMLCanvasElement){
   context=GLUtil.get3DContext(canvasOrContext);
  } else {
   context=GLUtil._toContext(context);
  }
 }
 this.context=context;
 this.textureCache={};
 this._renderedOutsideScene=false;
 /** An array of shapes that are part of the scene. */
 this.shapes=[];
 this._frontFace=Scene3D.CCW;
 this._cullFace=Scene3D.NONE;
 this.clearColor=[0,0,0,1];
 this.fboFilter=null;
 this._subScene=new Subscene3D(this);
 this._programs=new Scene3D.ProgramCache(context);
 this.useDevicePixelRatio=false;
 this._pixelRatio=1;
 this.autoResize=true;
 this.width=Math.ceil(this.context.canvas.clientWidth*1.0);
 this.height=Math.ceil(this.context.canvas.clientHeight*1.0);
 this.context.canvas.width=this.width;
 this.context.canvas.height=this.height;
 this._is3d=GLUtil.is3DContext(this.context);
 this._init3DContext();
}
/** @private */
Scene3D.prototype._init3DContext=function(){
 if(!this._is3d)return;
 var params={};
 var flags=Scene3D.LIGHTING_ENABLED |
  Scene3D.SPECULAR_ENABLED |
  Scene3D.SPECULAR_MAP_ENABLED;
 this._programs.getProgram(flags);
 this.context.viewport(0,0,this.width,this.height);
 this.context.enable(this.context.BLEND);
 this.context.blendFunc(this.context.SRC_ALPHA,this.context.ONE_MINUS_SRC_ALPHA);
 this.context.enable(this.context.DEPTH_TEST);
 this.context.depthFunc(this.context.LEQUAL);
 this.context.disable(this.context.CULL_FACE);
 this.context.clearDepth(1.0);
 this._setClearColor();
 this.context.clear(
    this.context.COLOR_BUFFER_BIT |
    this.context.DEPTH_BUFFER_BIT);
 this._setIdentityMatrices();
};

Scene3D.LIGHTING_ENABLED = 1;
Scene3D.SPECULAR_MAP_ENABLED = 2;
Scene3D.NORMAL_ENABLED = 4;
Scene3D.SPECULAR_ENABLED = 8;

/** @private */
Scene3D._materialToFlags=function(material){
 var flags=0;
     flags|=(!material.basic) ? Scene3D.LIGHTING_ENABLED : 0;
     flags|=(material.specular[0]!=0 ||
        material.specular[1]!=0 ||
        material.specular[2]!=0) ? Scene3D.SPECULAR_ENABLED : 0;
     flags|=(!!material.specularMap) ? Scene3D.SPECULAR_MAP_ENABLED : 0;
     flags|=(!!material.normalMap) ? Scene3D.NORMAL_ENABLED : 0;
     return flags;
}

/** @private */
Scene3D.ProgramCache=function(context){
 this.context=context;
 this._programs=[];
}
/** @private */
Scene3D.ProgramCache.prototype.getProgram=function(flags){
 if(this._programs[flags]){
  return this._programs[flags];
 }
 var defines=""
 if((flags&Scene3D.LIGHTING_ENABLED)!=0)
   defines+="#define SHADING\n";
 if((flags&Scene3D.SPECULAR_ENABLED)!=0)
   defines+="#define SPECULAR\n";
 if((flags&Scene3D.NORMAL_ENABLED)!=0)
   defines+="#define NORMAL_MAP\n";
 if((flags&Scene3D.SPECULAR_MAP_ENABLED)!=0)
   defines+="#define SPECULAR_MAP\n#define SPECULAR\n";
 var prog=new ShaderProgram(this.context,
   defines+ShaderProgram.getDefaultVertex(),
   defines+ShaderProgram.getDefaultFragment());
 this._programs[flags]=prog;
 return prog;
}
/** Returns the WebGL context associated with this scene. */
Scene3D.prototype.getContext=function(){
 return this.context;
};
/** No face culling.
@const  */
Scene3D.NONE = 0;
/** Back side of a triangle.  By default, triangles with clockwise winding are back-facing.
@const */
Scene3D.BACK = 1;
/**
Front side of a triangle.  By default, triangles with counterclockwise winding are front-facing.
@const
*/
Scene3D.FRONT = 2;
/**
Back and front sides of a triangle.
@const
*/
Scene3D.FRONT_AND_BACK = 3;
/**
* Counterclockwise winding. A triangle has counterclockwise winding if
* its vertices are ordered such that the path from the first to second to third
* to first vertex, in window coordinates (X and Y only), runs counterclockwise.
* @const
*/
Scene3D.CCW = 0;
/**
* Clockwise winding, the opposite of counterclockwise winding.
* @const
*/
Scene3D.CW = 1;
/**
* Specifies which kinds of triangle faces are culled (not drawn)
* when rendering this scene.
* @param {number} value If this is {@link Scene3D.BACK},
* {@link Scene3D.FRONT}, or {@link Scene3D.FRONT_AND_BACK},
* enables face culling of the specified faces.  For any other value,
* disables face culling.  By default, face culling is disabled.
* @return {glutil.Scene3D} This object.
*/
Scene3D.prototype.cullFace=function(value){
 if(value===Scene3D.BACK ||
   value===Scene3D.FRONT ||
   value===Scene3D.FRONT_AND_BACK){
  this._cullFace=value;
 } else {
  this._cullFace=0;
 }
 return this;
};
/** @private */
Scene3D.prototype._setFace=function(){
 if(!this._is3d)return;
 if(this._cullFace===Scene3D.BACK){
  this.context.enable(this.context.CULL_FACE);
  this.context.cullFace(this.context.BACK);
 } else if(this._cullFace===Scene3D.FRONT){
  this.context.enable(this.context.CULL_FACE);
  this.context.cullFace(this.context.FRONT);
 } else if(this._cullFace===Scene3D.FRONT_AND_BACK){
  this.context.enable(this.context.CULL_FACE);
  this.context.cullFace(this.context.FRONT_AND_BACK);
 } else {
  this.context.disable(this.context.CULL_FACE);
 }
 if(this._frontFace===Scene3D.CW){
  this.context.frontFace(this.context.CW);
 } else {
  this.context.frontFace(this.context.CCW);
 }
 return this;
};
/**
* Specifies the winding of front faces.
* @param {number} value If this is {@link Scene3D.CW},
* clockwise triangles are front-facing.  For any other value,
* counterclockwise triangles are front-facing, which is the
* default behavior.  If using a left-handed coordinate system,
* set this value to {@link Scene3D.CW}.
* @return {glutil.Scene3D} This object.
*/
Scene3D.prototype.frontFace=function(value){
 if(value===Scene3D.CW){
  this._frontFace=value;
 } else {
  this._frontFace=0;
 }
 return this;
};
/**
* Sets whether to check whether to resize the canvas
* when the render() method is called.
* @param {boolean} value If true, will check whether to resize the canvas
* when the render() method is called. Default is true.
* @return {glutil.Scene3D} This object.
*/
Scene3D.prototype.setAutoResize=function(value){
 this.autoResize=!!value;
 return this;
};
/**
* Sets whether to use the device's pixel ratio (if supported by
* the browser) in addition to the canvas's size when setting
* the viewport's dimensions.<p>
* When this value changes, the Scene3D will automatically
* adjust the viewport.
* @param {boolean} value If true, use the device's pixel ratio
* when setting the viewport's dimensions.  Default is true.
* @return {glutil.Scene3D} This object.
  */
Scene3D.prototype.setUseDevicePixelRatio=function(value){
 var oldvalue=!!this.useDevicePixelRatio;
 this.useDevicePixelRatio=!!value;
 this._pixelRatio=(this.useDevicePixelRatio && window.devicePixelRatio) ?
   window.devicePixelRatio : 1;
 if(oldvalue!==this.useDevicePixelRatio){
  this.setDimensions(this.width,this.height);
 }
 return this;
};
 /**
  Gets the color used when clearing the screen each frame.
   @return {Array<number>} An array of four numbers, from 0 through
   1, specifying the red, green, blue, and alpha components of the color.
   */
Scene3D.prototype.getClearColor=function(){
 return this.clearColor.slice(0,4);
};
/**
* Has no effect. (In previous versions, this method changed
* the active shader program for this scene
* and prepared this object for the new program.)
* @deprecated Instead of this method, use the "setShader" program of individual shapes
* to set the shader programs they use.
* @param {glutil.ShaderProgram} program The shader program to use.
* @return {glutil.Scene3D} This object.
*/
Scene3D.prototype.useProgram=function(program){
 console.warn("The 'useProgram' method is obsolete.  Instead of this method, "+
   "use the 'setShader' program of individual shapes to set the shader programs they use.");
}
/**
* Sets the viewport width and height for this scene.
* @param {number} width Width of the scene, in pixels.
*  Will be rounded up.
* @param {number} height Height of the scene, in pixels.
*  Will be rounded up.
* @return {number} Return value.*/
Scene3D.prototype.setDimensions=function(width, height){
 if(width<0 || height<0)throw new Error("width or height negative");
 this.width=Math.ceil(width);
 this.height=Math.ceil(height);
 this.context.canvas.width=this.width*this._pixelRatio;
 this.context.canvas.height=this.height*this._pixelRatio;
 if(this._is3d){
  this.context.viewport(0,0,this.width*this._pixelRatio,
   this.height*this._pixelRatio);
 }
 if(typeof this.fbo!=="undefined" && this.fbo){
   this.fbo.dispose();
   this.fbo=this.createBuffer();
   if(this.fboQuad)this.fboQuad.setMaterial(this.fbo);
  }
};
/**
* Gets the viewport width for this scene.
* Note that if auto-resizing is enabled, this value may change
* after each call to the render() method.
* @return {number} Return value.*/
Scene3D.prototype.getWidth=function(){
 return this.width;
};
/**
* Gets the viewport height for this scene.
* Note that if auto-resizing is enabled, this value may change
* after each call to the render() method.
* @return {number} Return value.*/
Scene3D.prototype.getHeight=function(){
 return this.height;
};
/**
* Gets the ratio of width to height for this scene (getWidth()
* divided by getHeight()).
* Note that if auto-resizing is enabled, this value may change
* after each call to the render() method.
* @return {number} Return value.*/
Scene3D.prototype.getAspect=function(){
 return this.getWidth()/this.getHeight();
};
/**
* Gets the ratio of width to height for this scene,
* as actually displayed on the screen.
* @return {number} Return value.*/
Scene3D.prototype.getClientAspect=function(){
 var ch=this.context.canvas.clientHeight;
 if(ch<=0)return 1;
 return this.context.canvas.clientWidth/ch;
};
/**
 * Creates a frame buffer object associated with this scene.
 * @return {FrameBuffer} A buffer with the same size as this scene.
 */
Scene3D.prototype.createBuffer=function(){
 return new FrameBuffer(this.context,
   this.getWidth(),this.getHeight());
};
/**
 * Gets the current projection matrix for this scene.
* @deprecated TODO: Document the replacement for this method.  For compatibility, existing code that doesn't use Subscene3D can still call this method until it renders a custom Subscene3D.  This compatibility behavior may be dropped in the future.
 * @return {Array<number>}
 */
Scene3D.prototype.getProjectionMatrix=function(){
if(this._renderedOutsideScene){
 throw new Error("A non-default scene has been rendered, so this method is disabled.");
}
return this.Subscene3D._projectionMatrix.slice(0,16);
};
/**
 * Gets the current view matrix for this scene.
* @deprecated TODO: Document the replacement for this method.  For compatibility, existing code that doesn't use Subscene3D can still call this method until it renders a custom Subscene3D.  This compatibility behavior may be dropped in the future.
 * @return {Array<number>}
 */
Scene3D.prototype.getViewMatrix=function(){
if(this._renderedOutsideScene){
 throw new Error("A non-default scene has been rendered, so this method is disabled.");
}
 return this._viewMatrix.slice(0,16);
};
/**
*  Sets this scene's projection matrix to a perspective projection.
 * <p>
 * For considerations when choosing the "near" and "far" parameters,
 * see {@link glmath.GLMath.mat4perspective}.
* @deprecated TODO: Document the replacement for this method.  For compatibility, existing code that doesn't use Subscene3D can still call this method until it renders a custom Subscene3D.  This compatibility behavior may be dropped in the future.
 * @param {number}  fov Y-axis field of view, in degrees. Should be less
* than 180 degrees. (The smaller
* this number, the bigger close objects appear to be. As a result, zooming out
* can be implemented by raising this value, and zooming in by lowering it.)
* @param {number}  aspect The ratio of width to height of the viewport, usually
*  the scene's aspect ratio (getAspect() or getClientAspect()).
* @param {number} near The distance from the camera to
* the near clipping plane. Objects closer than this distance won't be
* seen.
* @param {number}  far The distance from the camera to
* the far clipping plane. Objects beyond this distance will be too far
* to be seen.
* @return {glutil.Scene3D} This object.
* @example
* // Set the perspective projection.  Camera has a 45-degree field of view
* // and will see objects from 0.1 to 100 units away.
* scene.setPerspective(45,scene.getClientAspect(),0.1,100);
*/
Scene3D.prototype.setPerspective=function(fov, aspect, near, far){
 return this.setProjectionMatrix(GLMath.mat4perspective(fov,
   aspect,near,far));
};

/**
 * Sets this scene's projection matrix to an orthographic projection.
 * In this projection, the left clipping plane is parallel to the right clipping
 * plane and the top to the bottom.<p>
 * If the view rectangle's aspect ratio doesn't match the desired aspect
 * ratio, the view rectangle will be centered on the 3D scene's viewport
 * or otherwise moved and scaled so as to keep the entire view rectangle visible without stretching
 * or squishing it.
* @deprecated TODO: Document the replacement for this method.  For compatibility, existing code that doesn't use Subscene3D can still call this method until it renders a custom Subscene3D.  This compatibility behavior may be dropped in the future.
 * @param {number} left Leftmost coordinate of the view rectangle.
 * @param {number} right Rightmost coordinate of the view rectangle.
 * (Note that right can be greater than left or vice versa.)
 * @param {number} bottom Bottommost coordinate of the view rectangle.
 * @param {number} top Topmost coordinate of the view rectangle.
 * (Note that top can be greater than bottom or vice versa.)
 * @param {number} near Distance from the camera to the near clipping
 * plane.  A positive value means the plane is in front of the viewer.
 * @param {number} far Distance from the camera to the far clipping
 * plane.  A positive value means the plane is in front of the viewer.
 * (Note that near can be greater than far or vice versa.)  The absolute difference
 * between near and far should be as small as the application can accept.
 * @param {number} [aspect] Desired aspect ratio of the viewport (ratio
 * of width to height).  If null or omitted, uses this scene's aspect ratio instead.
 * @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.setOrthoAspect=function(left, right, bottom, top, near, far, aspect){
 if((aspect===null || typeof aspect==="undefined"))aspect=this.getClientAspect();
 if(aspect===0)aspect=1;
 return this.setProjectionMatrix(GLMath.mat4orthoAspect(
   left,right,bottom,top,near,far,aspect));
};
/**
 * Sets this scene's projection matrix to a 2D orthographic projection.
 * The near and far clipping planes will be set to -1 and 1, respectively.<p>
 * If the view rectangle's aspect ratio doesn't match the desired aspect
 * ratio, the view rectangle will be centered on the 3D scene's viewport
 * or otherwise moved and scaled so as to keep the entire view rectangle visible without stretching
 * or squishing it.
* @deprecated TODO: Document the replacement for this method.  For compatibility, existing code that doesn't use Subscene3D can still call this method until it renders a custom Subscene3D.  This compatibility behavior may be dropped in the future.
 * @param {number} left Leftmost coordinate of the view rectangle.
 * @param {number} right Rightmost coordinate of the view rectangle.
 * (Note that right can be greater than left or vice versa.)
 * @param {number} bottom Bottommost coordinate of the view rectangle.
 * @param {number} top Topmost coordinate of the view rectangle.
 * (Note that top can be greater than bottom or vice versa.)
 * @param {number} [aspect] Desired aspect ratio of the viewport (ratio
 * of width to height).  If null or omitted, uses this scene's aspect ratio instead.
 * @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.setOrtho2DAspect=function(left, right, bottom, top, aspect){
 return this.setOrthoAspect(left, right, bottom, top, -1, 1, aspect);
};

/**
 * Sets this scene's projection matrix to a perspective projection that defines
 * the view frustum, or the limits in the camera's view.
 * <p>
 * For considerations when choosing the "near" and "far" parameters,
 * see {@link glmath.GLMath.mat4perspective}.
* @deprecated TODO: Document the replacement for this method.  For compatibility, existing code that doesn't use Subscene3D can still call this method until it renders a custom Subscene3D.  This compatibility behavior may be dropped in the future.
 * @param {number} left X-coordinate of the point where the left
 * clipping plane meets the near clipping plane.
 * @param {number} right X-coordinate of the point where the right
 * clipping plane meets the near clipping plane.
 * @param {number} bottom Y-coordinate of the point where the bottom
 * clipping plane meets the near clipping plane.
 * @param {number} top Y-coordinate of the point where the top
 * clipping plane meets the near clipping plane.
* @param {number} near The distance from the camera to
* the near clipping plane. Objects closer than this distance won't be
* seen.
* @param {number}  far The distance from the camera to
* the far clipping plane. Objects beyond this distance will be too far
* to be seen.
* @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.setFrustum=function(left,right,bottom,top,near,far){
 return this.setProjectionMatrix(GLMath.mat4frustum(
   left, right, top, bottom, near, far));
};
/**
 * Sets this scene's projection matrix to an orthographic projection.
 * In this projection, the left clipping plane is parallel to the right clipping
 * plane and the top to the bottom.
* @deprecated TODO: Document the replacement for this method.  For compatibility, existing code that doesn't use Subscene3D can still call this method until it renders a custom Subscene3D.  This compatibility behavior may be dropped in the future.
 * @param {number} left Leftmost coordinate of the 3D view.
 * @param {number} right Rightmost coordinate of the 3D view.
 * (Note that right can be greater than left or vice versa.)
 * @param {number} bottom Bottommost coordinate of the 3D view.
 * @param {number} top Topmost coordinate of the 3D view.
 * (Note that top can be greater than bottom or vice versa.)
 * @param {number} near Distance from the camera to the near clipping
 * plane.  A positive value means the plane is in front of the viewer.
 * @param {number} far Distance from the camera to the far clipping
 * plane.  A positive value means the plane is in front of the viewer.
 * (Note that near can be greater than far or vice versa.)  The absolute difference
 * between near and far should be as small as the application can accept.
 * @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.setOrtho=function(left,right,bottom,top,near,far){
 return this.setProjectionMatrix(GLMath.mat4ortho(
   left, right, bottom, top, near, far));
};
/**
 * Sets this scene's projection matrix to a 2D orthographic projection.
 * The near and far clipping planes will be set to -1 and 1, respectively.
* @deprecated TODO: Document the replacement for this method.  For compatibility, existing code that doesn't use Subscene3D can still call this method until it renders a custom Subscene3D.  This compatibility behavior may be dropped in the future.
 * @param {number} left Leftmost coordinate of the 2D view.
 * @param {number} right Rightmost coordinate of the 2D view.
 * (Note that right can be greater than left or vice versa.)
 * @param {number} bottom Bottommost coordinate of the 2D view.
 * @param {number} top Topmost coordinate of the 2D view.
 * (Note that top can be greater than bottom or vice versa.)
 * @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.setOrtho2D=function(left,right,bottom,top){
 return this.setProjectionMatrix(GLMath.mat4ortho(
   left, right, bottom, top, -1, 1));
};
/** @private */
Scene3D.prototype._setClearColor=function(){
  if(this._is3d){
   this.context.clearColor(this.clearColor[0],this.clearColor[1],
     this.clearColor[2],this.clearColor[3]);
  }
  return this;
};

/**
* Sets the color used when clearing the screen each frame.
* This color is black by default.
* @param {Array<number>|number|string} r Array of three or
* four color components; or the red color component (0-1); or a string
* specifying an [HTML or CSS color]{@link glutil.GLUtil.toGLColor}.
* @param {number} g Green color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} b Blue color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} [a] Alpha color component (0-1).
* If the "r" parameter is given and this parameter is null or omitted,
* this value is treated as 1.0.
* @return {glutil.Scene3D} This object.
*/
Scene3D.prototype.setClearColor=function(r,g,b,a){
 this.clearColor=GLUtil.toGLColor(r,g,b,a);
 return this._setClearColor();
};
/**
* Loads a texture from an image URL.
* @param {string} name URL of the image to load.
* @return {Promise} A promise that is resolved when
* the image is loaded successfully (the result will be a Texture
* object), and is rejected when an error occurs.
*/
Scene3D.prototype.loadTexture=function(name){
 return Texture.loadTexture(name, this.textureCache);
};
/**
* Loads a texture from an image URL and uploads it
* to a texture buffer object.
* @param {string|glutil.Texture} texture String giving the
* URL of the image to load, or
* a Texture object whose data may or may not be loaded.
* @return {Promise} A promise that is resolved when
* the image is loaded successfully and uploaded
* to a texture buffer (the result will be a Texture
* object), and is rejected when an error occurs.
*/
Scene3D.prototype.loadAndMapTexture=function(texture){
 var context=this.context;
 var tex=null;
 if(texture.constructor===Texture){
   tex=texture.loadImage();
 } else {
   tex=Texture.loadTexture(texture, this.textureCache);
 }
 return tex.then(function(textureInner){
    textureInner.loadedTexture=new LoadedTexture(textureInner,context);
    return textureInner;
  });
};
/**
* Loads one or more textures from an image URL and uploads each of them
* to a texture buffer object.
* @param {Array<string>} textureFiles A list of URLs of the image to load.
* @param {Function} [resolve] Called for each URL that is loaded successfully
* and uploaded to a texture buffer (the argument will be a Texture object.)
* @param {Function} [reject] Called for each URL for which an error
* occurs (the argument will be the data passed upon
* rejection).
* @return {Promise} A promise that is resolved when
* all the URLs in the textureFiles array are either resolved or rejected.
* The result will be an object with three properties:
* "successes", "failures", and "results".
* See {@link glutil.GLUtil.getPromiseResults}.
*/
Scene3D.prototype.loadAndMapTextures=function(textureFiles, resolve, reject){
 var promises=[];
 var context=this.context;
 for(var i=0;i<textureFiles.length;i++){
  var objf=textureFiles[i];
  promises.push(this.loadAndMapTexture(objf));
 }
 return GLUtil.getPromiseResults(promises, resolve, reject);
};
/** @private */
Scene3D.prototype._setIdentityMatrices=function(){
 this._projectionMatrix=GLMath.mat4identity();
 this._viewMatrix=GLMath.mat4identity();
 this._updateFrustum();
};
/** @private */
Scene3D.prototype._updateFrustum=function(){
 var projView=GLMath.mat4multiply(this._projectionMatrix,this._viewMatrix);
 this._frustum=GLMath.mat4toFrustumPlanes(projView);
};
/**
 * Gets the number of vertices composed by
 * all shapes in this scene.
 * @return {number} Return value. */
Scene3D.prototype.vertexCount=function(){
 var c=0;
 for(var i=0;i<this.shapes.length;i++){
  c+=this.shapes[i].vertexCount();
 }
 return c;
};
/**
* Gets the number of primitives (triangles, lines,
* and points) composed by all shapes in this scene.
 * @return {number} Return value. */
Scene3D.prototype.primitiveCount=function(){
 var c=0;
 for(var i=0;i<this.shapes.length;i++){
  c+=this.shapes[i].primitiveCount();
 }
 return c;
};
/**
 * Sets the projection matrix for this object.  The projection
 * matrix can also be set using the {@link glutil.Scene3D#setFrustum}, {@link glutil.Scene3D#setOrtho},
 * {@link glutil.Scene3D#setOrtho2D}, and {@link glutil.Scene3D#setPerspective} methods.
* @deprecated TODO: Document the replacement for this method.  For compatibility, existing code that doesn't use Subscene3D can still call this method until it renders a custom Subscene3D.  This compatibility behavior may be dropped in the future.
 * @param {Array<number>} matrix A 16-element matrix (4x4).
 * @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.setProjectionMatrix=function(matrix){
if(this._renderedOutsideScene){
 throw new Error("A non-default scene has been rendered, so this method is disabled.");
}
this._subScene.setProjectionMatrix(matrix);
 return this;
};
/**
*  Sets this scene's view matrix. The view matrix can also
* be set using the {@link glutil.Scene3D#setLookAt} method.
* @deprecated TODO: Document the replacement for this method.  For compatibility, existing code that doesn't use Subscene3D can still call this method until it renders a custom Subscene3D.  This compatibility behavior may be dropped in the future.
 * @param {Array<number>} matrix A 16-element matrix (4x4).
 * @return {glutil.Scene3D} This object.
*/
Scene3D.prototype.setViewMatrix=function(matrix){
if(this._renderedOutsideScene){
 throw new Error("A non-default scene has been rendered, so this method is disabled.");
}
this._subScene.setViewMatrix(matrix);
 return this;
};
/**
*  Sets this scene's view matrix to represent a camera view.
* This method takes a camera's position (<code>eye</code>), and the point the camera is viewing
* (<code>center</code>).
* @deprecated TODO: Document the replacement for this method.  For compatibility, existing code that doesn't use Subscene3D can still call this method until it renders a custom Subscene3D.  This compatibility behavior may be dropped in the future.
* @param {Array<number>} eye A 3-element vector specifying
* the camera position in world space.
* @param {Array<number>} [center] A 3-element vector specifying
* the point in world space that the camera is looking at. May be null or omitted,
* in which case the default is the coordinates (0,0,0).
* @param {Array<number>} [up] A 3-element vector specifying
* the direction from the center of the camera to its top. This parameter may
* be null or omitted, in which case the default is the vector (0, 1, 0),
* the vector that results when the camera is held upright.  This
* vector must not point in the same or opposite direction as
* the camera's view direction. (For best results, rotate the vector (0, 1, 0)
* so it points perpendicular to the camera's view direction.)
* @return {glutil.Scene3D} This object.
*/
Scene3D.prototype.setLookAt=function(eye, center, up){
 return this.setViewMatrix(GLMath.mat4lookat(eye, center, up));
};
/**
* Adds a 3D shape to this scene.  Its reference, not a copy,
* will be stored in the 3D scene's list of shapes.
* Its parent will be set to no parent.
* @param {glutil.Shape|glutil.ShapeGroup} shape A 3D shape.
* @return {glutil.Scene3D} This object.
*/
Scene3D.prototype.addShape=function(shape){
  this._subScene.addShape(shape);
 return this;
};
/**
 * Creates a buffer from a geometric mesh and
 * returns a shape object.
 * @param {glutil.Mesh} mesh A geometric mesh object.  The shape
 * created will use the mesh in its current state and won't
 * track future changes.
 * @return {glutil.Shape} The generated shape object.
 */
Scene3D.prototype.makeShape=function(mesh){
 var buffer=new BufferedMesh(mesh,this.context);
 return new Shape(buffer);
};

/**
* Removes all instances of a 3D shape from this scene.
* @param {glutil.Shape|glutil.ShapeGroup} shape The 3D shape to remove.
* @return {glutil.Scene3D} This object.
*/
Scene3D.prototype.removeShape=function(shape){
  this._subScene.removeShape(shape);
 return this;
};
/** @private */
Scene3D.prototype.getLightSource=function(){
if(this._renderedOutsideScene){
 throw new Error("A non-default scene has been rendered, so this method is disabled.");
}
 return this._subScene.getLightSource();
};
/**
 * Sets a light source in this scene to a directional light.
* @deprecated Use the LightSource method setDirectionalLight instead and the Subscene3D method getLightSource.  For compatibility, existing code that doesn't use Subscene3D can still call this method until it renders a custom Subscene3D.  This compatibility behavior may be dropped in the future.
 * @param {number} index Zero-based index of the light to set.  The first
 * light has index 0, the second has index 1, and so on.  Will be created
 * if the light doesn't exist.
 * @param {Array<number>} position A 3-element vector giving the direction of the light, along the X, Y, and Z
 * axes, respectively.  May be null, in which case the default
 * is (0, 0, 1).
 * @param {Array<number>} [diffuse] A [color vector or string]{@link glutil.GLUtil.toGLColor} giving the diffuse color of the light.
 * If null or omitted, the default is (1, 1, 1, 1) for light index 0 and (0, 0, 0, 0) otherwise.
 * @param {Array<number>} [specular] A [color vector or string]{@link glutil.GLUtil.toGLColor}  giving the color of specular highlights caused by
 * the light.
 * If null or omitted, the default is (1, 1, 1) for light index 0 and (0, 0, 0) otherwise.
* @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.setDirectionalLight=function(index,position,diffuse,specular){
if(this._renderedOutsideScene){
 throw new Error("A non-default scene has been rendered, so this method is disabled.");
}
 this.getLightSource().setDirectionalLight(index,position,diffuse,specular);
 return this;
};
/**
 * Sets parameters for a light in this scene.
* @deprecated Use the LightSource method setLightParams instead and the Subscene3D method getLightSource.  For compatibility, existing code that doesn't use Subscene3D can still call this method until it renders a custom Subscene3D.  This compatibility behavior may be dropped in the future.
 * @param {number} index Zero-based index of the light to set.  The first
 * light has index 0, the second has index 1, and so on.  Will be created
 * if the light doesn't exist.
 * @param {object} params An object as described in {@link glutil.LightSource.setParams}.
* @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.setLightParams=function(index,params){
if(this._renderedOutsideScene){
 throw new Error("A non-default scene has been rendered, so this method is disabled.");
}
 this.getLightSource().setParams(index,params);
 return this;
};

/**
 * Sets the color of the scene's ambient light.
* @deprecated Use the LightSource method setAmbient instead and the Subscene3D method getLightSource.  For compatibility, existing code that doesn't use Subscene3D can still call this method until it renders a custom Subscene3D.  This compatibility behavior may be dropped in the future.
* @param {Array<number>|number|string} r Array of three or
* four color components; or the red color component (0-1); or a string
* specifying an [HTML or CSS color]{@link glutil.GLUtil.toGLColor}.
* @param {number} g Green color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} b Blue color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} [a] Alpha color component (0-1).
* Currently not used.
* @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.setAmbient=function(r,g,b,a){
if(this._renderedOutsideScene){
 throw new Error("A non-default scene has been rendered, so this method is disabled.");
}
 this.getLightSource().setAmbient(r,g,b,a);
 return this;
};

/**
 * Sets a light source in this scene to a point light.
 * @deprecated Use the LightSource method setPointLight instead and the Subscene3D method getLightSource.  For compatibility, existing code that doesn't use Subscene3D can still call this method until it renders a custom Subscene3D.  This compatibility behavior may be dropped in the future.
 * @param {number} index Zero-based index of the light to set.  The first
 * light has index 0, the second has index 1, and so on.
 * @param {Array<number>} position
 * @param {Array<number>} [diffuse] A [color vector or string]{@link glutil.GLUtil.toGLColor}  giving the diffuse color of the light.
 * If null or omitted, the default is (1, 1, 1, 1) for light index 0 and (0, 0, 0, 0) otherwise.
 * @param {Array<number>} [specular] A [color vector or string]{@link glutil.GLUtil.toGLColor}  giving the color of specular highlights caused by
 * the light.
 * If null or omitted, the default is (1, 1, 1) for light index 0 and (0, 0, 0) otherwise.
* @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.setPointLight=function(index,position,diffuse,specular){
if(this._renderedOutsideScene){
 throw new Error("A non-default scene has been rendered, so this method is disabled.");
}
 this.getLightSource().setPointLight(index,position,diffuse,specular);
 return this;
};

Scene3D.prototype.clear=function(){
 if(this._is3d){
    this.context.clear(
     this.context.COLOR_BUFFER_BIT |
     this.context.DEPTH_BUFFER_BIT |
     this.context.STENCIL_BUFFER_BIT);
  }
}

Scene3D.prototype.clearDepth=function(){
 if(this._is3d){
    this.context.clear(this.context.DEPTH_BUFFER_BIT);
  }
}

/**
 *  Renders all shapes added to this scene.
 *  This is usually called in a render loop, such
 *  as {@link glutil.GLUtil.renderLoop}.
 * @param {glutil.Subscene3D} A scene to draw.  Can be null.
 * @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.render=function(subScene){
  if(this.autoResize){
   var c=this.context.canvas;
   if(c.height!==Math.ceil(c.clientHeight)*this._pixelRatio ||
       c.width!==Math.ceil(c.clientWidth)*this._pixelRatio){
    // Resize the canvas if needed
    this.setDimensions(c.clientWidth,c.clientHeight);
   }
  }
  this._setFace();
  if(!subScene){
   subScene=this._subScene;
   if(this._is3d){
    this.clear();
   }
  }
  if(subScene!=this._subScene){
   this._renderedOutsideScene=true;
  }
  subScene.render();
  if(this._is3d)this.context.flush();
  return this;
};

/**
 * Uses a shader program to apply a texture filter after the
 * scene is rendered.  If a filter program is used, the scene will
 * create a frame buffer object, render its shapes to that frame
 * buffer, and then apply the filter program as it renders the
 * frame buffer to the canvas.
 * @param {ShaderProgram|string|null} filterProgram A shader
 * program that implements a texture filter.  The program
 * could be created using the {@link glutil.ShaderProgram.makeEffect} method.
 * This parameter can also be a string that could be a parameter
 * to the ShaderProgram.makeEffect() method.
 * If this value is null, texture filtering is disabled and shapes
 * are rendered to the canvas normally.
 * @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.useFilter=function(filterProgram){
 if((filterProgram===null || typeof filterProgram==="undefined")){
  this.fboFilter=null;
 } else {
  if(typeof filterProgram==="string"){
   // Assume the string is GLSL source code
   this.fboFilter=ShaderProgram.makeEffect(this.context,
    filterProgram);
  } else {
   this.fboFilter=filterProgram;
  }
  if(typeof this.fbo==="undefined" || !this.fbo){
   this.fbo=this.createBuffer();
  }
  if(typeof this.fboQuad==="undefined" || !this.fboQuad){
   // Create a mesh of a rectangle that will
   // fit the screen in the presence of identity projection
   // and view matrices
   var mesh=new Mesh(
     [-1,1,0,0,1,
      -1,-1,0,0,0,
      1,1,0,1,1,
      1,-1,0,1,0],
     [0,1,2,2,1,3],
     Mesh.TEXCOORDS_BIT);
   this.fboQuad=this.makeShape(mesh).setParams({
     "texture":this.fbo,
     "shader":this.fboFilter
   });
  }
 }
 return this;
};
/**
* Represents a grouping of shapes.
* @class
* @alias glutil.ShapeGroup
*/
function ShapeGroup(){
 /** List of shapes contained in this group.
 * This property should only be used to access properties
 * and call methods on each shape, and not to add, remove
 * or replace shapes directly.
 * @readonly
 */
 this.shapes=[];
 this.parent=null;
 this.visible=true;
 this.transform=new Transform();
}
/**
* Adds a 3D shape to this shape group.  Its reference, not a copy,
* will be stored in the list of shapes.
* @param {glutil.Shape|glutil.ShapeGroup} shape A 3D shape.
* @return {glutil.ShapeGroup} This object.
*/
ShapeGroup.prototype.addShape=function(shape){
 shape.parent=this;
 this.shapes.push(shape);
 return this;
};
/**
 * Not documented yet.
 * @param {*} value
 */
ShapeGroup.prototype.setVisible=function(value){
 this.visible=!!value;
 return this;
};
/**
 * Not documented yet.
 */
ShapeGroup.prototype.getVisible=function(){
 return this.visible;
};
/**
 * Gets a reference to the transform used by this shape group object.
 * @return {glutil.Transform} Return value. */
ShapeGroup.prototype.getTransform=function(){
 return this.transform;
};
/**
 * Gets a copy of the transformation needed to transform
 * this shape group's coordinates to world coordinates.
 * @return {glutil.Transform} A 4x4 matrix.
 */
ShapeGroup.prototype.getMatrix=function(){
  var xform=this.getTransform();
  var thisIdentity=xform.isIdentity();
  var mat;
  if(this.parent!==null){
   var pmat=this.parent.getMatrix();
   if(thisIdentity){
    mat=GLMath.mat4multiply(pmat,xform.getMatrix());
   } else if(GLMath.mat4isIdentity(pmat)){
    mat=xform.getMatrix();
   } else {
    mat=pmat;
   }
  } else {
   mat=xform.getMatrix();
  }
  return mat;
};
/**
 * Sets the transform used by this shape group.  Child
 * shapes can set their own transforms, in which case, the
 * rendering process will multiply this shape group's transform
 * with the child shape's transform as it renders the child shape.
 * @param {glutil.Transform} transform
 */
ShapeGroup.prototype.setTransform=function(transform){
 this.transform=transform.copy();
 return this;
};
/**
 * Sets the material used by all shapes in this shape group.
 * @param {glutil.Material} material
 */
ShapeGroup.prototype.setMaterial=function(material){
 for(var i=0;i<this.shapes.length;i++){
  this.shapes[i].setMaterial(material);
 }
 return this;
};
/**
 * Sets the shader program used by all shapes in this shape group.
 * @param {glutil.Material} material
 */
ShapeGroup.prototype.setShader=function(material){
 for(var i=0;i<this.shapes.length;i++){
  this.shapes[i].setShader(material);
 }
 return this;
};
/**
* Removes all instances of a 3D shape from this shape group
* @param {glutil.Shape|glutil.ShapeGroup} shape The 3D shape to remove.
* @return {glutil.ShapeGroup} This object.
*/
ShapeGroup.prototype.removeShape=function(shape){
 for(var i=0;i<this.shapes.length;i++){
   if(this.shapes[i]===shape){
     this.shapes.splice(i,1);
     i--;
   }
 }
 return this;
};
/**
 * Not documented yet.
 */
ShapeGroup.prototype.getBounds=function(){
 var ret=[0,0,0,0,0,0];
 var first=true;
 for(var i=0;i<this.shapes.length;i++){
  var b=this.shapes[i].getBounds();
  if(!GLMath.boxIsEmpty(b)){
   if(first){
    ret[0]=b[0];
    ret[1]=b[1];
    ret[2]=b[2];
    ret[3]=b[3];
    ret[4]=b[4];
    ret[5]=b[5];
    first=false;
   } else {
    ret[0]=Math.min(b[0],ret[0]);
    ret[1]=Math.min(b[1],ret[1]);
    ret[2]=Math.min(b[2],ret[2]);
    ret[3]=Math.max(b[3],ret[3]);
    ret[4]=Math.max(b[4],ret[4]);
    ret[5]=Math.max(b[5],ret[5]);
   }
  }
 }
 if(first){
  return [0,0,0,-1,-1,-1];
 } else {
  return ret;
 }
};

/**
 * Gets the number of vertices composed by all shapes in this shape group.
 * @return {number} Return value. */
ShapeGroup.prototype.vertexCount=function(){
 var c=0;
 for(var i=0;i<this.shapes.length;i++){
  c+=this.shapes[i].vertexCount();
 }
 return c;
};
/**
 * Gets the number of primitives (triangles, lines,
* and points) composed by all shapes in this shape group.
 * @return {number} Return value. */
ShapeGroup.prototype.primitiveCount=function(){
 var c=0;
 for(var i=0;i<this.shapes.length;i++){
  c+=this.shapes[i].primitiveCount();
 }
 return c;
};
/**
 * Sets the relative position of the shapes in this group
 * from their original position.
 * See {@link glutil.Transform#setPosition}
 * This method will modify this shape group's transform
 * rather than the transform for each shape in the group.
 * @param {number|Array<number>} x X coordinate
 * or a 3-element position array, as specified in {@link glutil.Transform#setScale}.
 * @param {number} y Y-coordinate.
 * @param {number} z Z-coordinate.
* @return {glutil.Scene3D} This object.
 */
ShapeGroup.prototype.setPosition=function(x,y,z){
 this.transform.setPosition(x,y,z);
 return this;
};
/**
 * Sets this shape group's orientation in the form of a [quaternion]{@tutorial glmath}.
 * See {@link glutil.Transform#setQuaternion}.
 * This method will modify this shape group's transform
 * rather than the transform for each shape in the group.
 * @param {Array<number>} quat A four-element array describing the rotation.
 * @return {glutil.Shape} This object.
 */
ShapeGroup.prototype.setQuaternion=function(quat){
 this.transform.setQuaternion(quat);
 return this;
};
/**
 * Sets the scale of this shape group relative to its original
 * size. See {@link glutil.Transform#setScale}.
 * This method will modify this shape group's transform
 * rather than the transform for each shape in the group.
 * @param {number|Array<number>} x Scaling factor for this object's width,
 * or a 3-element scaling array, as specified in {@link glutil.Transform#setScale}.
 * @param {number} y Scaling factor for this object's height.
 * @param {number} z Scaling factor for this object's depth.
* @return {glutil.Scene3D} This object.
 */
ShapeGroup.prototype.setScale=function(x,y,z){
 this.transform.setScale(x,y,z);
 return this;
};
/**
* An object that associates a geometric mesh (the shape of the object) with
*  material data (which defines what is seen on the object's surface)
 * and a transformation matrix (which defines the object's position and size).
* See the "{@tutorial shapes}" tutorial.
 *  @class
* @alias glutil.Shape
* @param {BufferedMesh} mesh A mesh in the form of a buffer object.
* For {@link glutil.Mesh} objects, use the {@link glutil.Scene3D#makeShape}
* method instead.
  */
function Shape(mesh){
  if((mesh===null || typeof mesh==="undefined"))throw new Error("mesh is null");
  this.bufferedMesh=mesh;
  this.transform=new Transform();
  this.material=new Material();
  this.parent=null;
  this.visible=true;
}
/**
 * Gets the number of vertices composed by
 * all shapes in this scene.
 * @return {number} Return value. */
Shape.prototype.vertexCount=function(){
 return (this.bufferedMesh) ? this.bufferedMesh.vertexCount() : 0;
};
/**
* Gets the number of primitives (triangles, lines,
* and points) composed by all shapes in this scene.
 * @return {number} Return value. */
Shape.prototype.primitiveCount=function(){
 return (this.bufferedMesh) ? this.bufferedMesh.primitiveCount() : 0;
};
/**
 * Not documented yet.
 * @param {*} value
 */
Shape.prototype.setVisible=function(value){
 this.visible=!!value;
 return this;
};
/**
 * Not documented yet.
 */
Shape.prototype.getVisible=function(){
 return this.visible;
};
/**
* Sets material parameters that give the shape a certain color.
* (If a material is already defined, sets its ambient and diffusion
* colors.)
* However, if the mesh defines its own colors, those colors will take
* precedence over the color given in this method.
* @param {Array<number>|number|string} r A [color vector or string]{@link glutil.GLUtil.toGLColor},
* or the red color component (0-1).
* @param {number} g Green color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} b Blue color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} [a] Alpha color component (0-1).
* If the "r" parameter is given and this parameter is null or omitted,
* this value is treated as 1.0.
 * @return {glutil.Shape} This object.
*/
Shape.prototype.setColor=function(r,g,b,a){
 if(this.material){
   var c=GLUtil.toGLColor(r,g,b,a);
   this.material.setParams({"ambient":c,"diffuse":c})
  } else {
   this.material=Material.fromColor(r,g,b,a);
  }
  return this;
};
/**
 * Sets material parameters that give the shape a texture with the given URL.
 * @param {string} name {@link glutil.Texture} object, or a string with the
* URL of the texture data.  In the case of a string the texture will be loaded via
*  the JavaScript DOM's Image class.  However, this method
*  will not load that image if it hasn't been loaded yet.
 * @return {glutil.Shape} This object.
 */
Shape.prototype.setTexture=function(name){
 if(this.material){
   this.material.setParams({"texture":name})
 } else {
   this.material=Material.fromTexture(name);
 }
 return this;
};
/**
 * Sets this shape's material to a shader with the given URL.
 * @param {glutil.ShaderProgram} shader
 * @return {glutil.Shape} This object.
 */
Shape.prototype.setShader=function(shader){
 if(this.material){
   this.material.setParams({"shader":shader})
 } else {
   this.material=Material.forShader(shader);
 }
 return this;
};
/**
* Sets this shape's material to the given texture and color.
 * @param {string} name {@link glutil.Texture} object, or a string with the
* URL of the texture data.  In the case of a string the texture will be loaded via
*  the JavaScript DOM's Image class.  However, this method
*  will not load that image if it hasn't been loaded yet.
* @param {Array<number>|number|string} r Array of three or
* four color components; or the red color component (0-1); or a string
* specifying an [HTML or CSS color]{@link glutil.GLUtil.toGLColor}.
* @param {number} g Green color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} b Blue color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} [a] Alpha color component (0-1).
* If the "r" parameter is given and this parameter is null or omitted,
* this value is treated as 1.0.
 * @return {glutil.Shape} This object.
*/
Shape.prototype.setTextureAndColor=function(name,r,g,b,a){
 this.material=Material.fromColor(r,g,b,a).setParams({"texture":name});
 return this;
};
/**
* Sets this shape's material parameters.
* @param {Material} material
 * @return {glutil.Shape} This object.
*/
Shape.prototype.setMaterial=function(material){
 this.material=material;
 return this;
};
/**
* Makes a copy of this object.  The copied object
* will have its own version of the transform and
* material data, but any texture
* image data and buffered meshes will not be duplicated,
* but rather just references to them will be used.
* @return {glutil.Shape} A copy of this object.
*/
Shape.prototype.copy=function(){
 var ret=new Shape(this.bufferedMesh);
 ret.material=this.material.copy();
 ret.transform=this.getTransform().copy();
 return ret;
};
/**
 * Not documented yet.
 */
Shape.prototype.getTransform=function(){
 return this.transform;
};
/**
 * Not documented yet.
 */
Shape.prototype.getBounds=function(){
 if(!this.bufferedMesh){
  return [0,0,0,-1,-1,-1];
 }
 var bounds=this.bufferedMesh._getBounds();
 var matrix=this.getMatrix();
 if(!GLMath.mat4isIdentity(matrix)){
  var mn=GLMath.mat4transformVec3(matrix,bounds[0],bounds[1],bounds[2]);
  var mx=GLMath.mat4transformVec3(matrix,bounds[3],bounds[4],bounds[5]);
  return [
   Math.min(mn[0],mx[0]),
   Math.min(mn[1],mx[1]),
   Math.min(mn[2],mx[2]),
   Math.max(mn[0],mx[0]),
   Math.max(mn[1],mx[1]),
   Math.max(mn[2],mx[2])
  ];
 } else {
  return bounds.slice(0,6);
 }
}
/** @private */
Shape.prototype.isCulled=function(frustum){
 if(!this.bufferedMesh||!this.visible)return true;
 return !GLMath.frustumHasBox(frustum,this.getBounds());
};
/**
 * Not documented yet.
 * @param {*} transform
 */
Shape.prototype.setTransform=function(transform){
 this.transform=transform.copy();
 return this;
};
/**
 * Sets the scale of this shape relative to its original
 * size. See {@link glutil.Transform#setScale}
 * @param {number|Array<number>} x Scaling factor for this object's width,
 * or a 3-element scaling array, as specified in {@link glutil.Transform#setScale}.
 * @param {number} y Scaling factor for this object's height.
 * @param {number} z Scaling factor for this object's depth.
* @return {glutil.Scene3D} This object.
 */
Shape.prototype.setScale=function(x,y,z){
  this.getTransform().setScale(x,y,z);
  return this;
};
/**
 * Sets the relative position of this shape from its original
 * position.  See {@link glutil.Transform#setPosition}
 * @param {number|Array<number>} x X coordinate
 * or a 3-element position array, as specified in {@link glutil.Transform#setScale}.
 * @param {number} y Y-coordinate.
 * @param {number} z Z-coordinate.
* @return {glutil.Scene3D} This object.
 */
Shape.prototype.setPosition=function(x,y,z){
  this.getTransform().setPosition(x,y,z);
  return this;
};
/**
 * Sets this object's orientation in the form of a [quaternion]{@tutorial glmath}.
 * See {@link glutil.Transform#setQuaternion}.
 * @param {Array<number>} quat A four-element array describing the rotation.
 * @return {glutil.Shape} This object.
 */
Shape.prototype.setQuaternion=function(quat){
  this.getTransform().setQuaternion(quat);
  return this;
};
/**
 * Gets the transformation matrix used by this shape.
   * See {@link glutil.Transform#getMatrix}.
 * @return {Array<number>} The current transformation matrix.
 */
Shape.prototype.getMatrix=function(){
  var xform=this.getTransform();
  var thisIdentity=xform.isIdentity();
  var mat;
  if(this.parent!==null){
   var pmat=this.parent.getMatrix();
   if(thisIdentity){
    mat=pmat;
   } else if(GLMath.mat4isIdentity(pmat)){
    mat=xform.getMatrix();
   } else {
    mat=GLMath.mat4multiply(pmat,xform.getMatrix());
   }
  } else {
   mat=xform.getMatrix();
  }
  return mat;
};
/////////////
exports.ShapeGroup=ShapeGroup;
exports.Lights=Lights;
exports.LightSource=LightSource;
exports.Texture=Texture;
exports.Material=Material;
exports.Shape=Shape;
exports.Scene3D=Scene3D;
exports.GLUtil=GLUtil;
}));
