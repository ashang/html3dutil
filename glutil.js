/**
* Contains classes and methods for easing development
* of WebGL applications.
* @module glutil
*/
(function (root, factory) {
	if (typeof define === "function" && define["amd"]) {
		define([ "exports" ], factory);
	} else if (typeof exports === "object") {
		factory(exports);
	} else {
		factory(root);
	}
}(this, function (exports) {
	if (exports.GLUtil) { return; }

/**
* Contains miscellaneous utility methods.
* @class
* @alias glutil.GLUtil
*/
var GLUtil={
/**
* This method will call the function once before returning,
* and queue requests to call that function once per frame.
* (If the browser doesn't
* support requestAnimationFrame or an equivalent, uses
* setTimeout to implement this method.)
* @param {Function} func The function to call.
*/
"renderLoop":function(func){
  func();
  var selfRefFunc=function(){
   window.requestAnimationFrame(selfRefFunc);
   func();
  };
  window.requestAnimationFrame(selfRefFunc);
},
/**
* Creates an HTML canvas element, optionally appending
* it to an existing HTML element.
* @param {number|null} width Width of the new canvas
* element, or if null, the value <code>window.innerWidth</code>.
* The resulting width will be rounded up.
* This parameter can't be a negative number.
* @param {number|null} height Height of the new canvas
* element, or if null, the value <code>window.innerHeight</code>.
* The resulting height will be rounded up.
* This parameter can't be a negative number.
* @param {HTMLElement|null} parent If non-null, the parent
* element of the new HTML canvas element. The element will be
* appended as a child of this parent.
* @return {HTMLCanvasElement} The resulting canvas element.
*/
"createCanvas":function(width, height, parent){
 var canvas=document.createElement("canvas");
 if(width==null){
  canvas.width=Math.ceil(window.innerWidth)+"";
 } else if(width<0){
  throw new Error("width negative");
 } else {
  canvas.width=Math.ceil(width)+"";
 }
 if(height==null){
  canvas.height=Math.ceil(window.innerHeight)+"";
 } else if(height<0){
  throw new Error("height negative");
 } else {
  canvas.height=Math.ceil(height)+"";
 }
 if(parent){
  parent.appendChild(canvas);
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
  var options={"antialias":true};
  try { context=canvasElement.getContext("webgl", options);
  } catch(e) { context=null; }
  if(!context){
    try { context=canvasElement.getContext("experimental-webgl", options);
    } catch(e) { context=null; }
  }
  if(!context){
    try { context=canvasElement.getContext("moz-webgl", options);
    } catch(e) { context=null; }
  }
  if(!context){
    try { context=canvasElement.getContext("webkit-3d", options);
    } catch(e) { context=null; }
  }
  if(!context){
    try { context=canvasElement.getContext("2d", options);
    } catch(e) { context=null; }
  }
  if(GLUtil.is3DContext(context)){
   context.getExtension("OES_element_index_uint");
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
* @return {boolean}
*/
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
 * promise, in the order in which the promises were listed.</ul>
 * True means success, and false means failure.
 */
"getPromiseResults":function(promises,
   progressResolve, progressReject){
 if(!promises || promises.length==0){
  return Promise.resolve({
    successes:[], failures:[], results:[]});
 }
 var ret={successes:[], failures:[], results:[]};
 var newPromises=[]
 for(var i=0;i<promises.length;i++){
  var index=i;
  newPromises.push(promises[i].then(function(x){
   if(progressResolve)progressResolve(x)
   ret.successes[index]=x
   return true;
  },function(x){
   if(progressReject)progressReject(x)
   ret.failures[index]=x
   return false;
  }));
 }
 return Promise.all(newPromises).then(function(results){
  // compact the successes and failures arrays
  for(var i=0;i<ret.successes.length;i++){
   if(typeof ret.successes[i]=="undefined"){
    ret.successes.splice(i,1);
    i-=1;
   }
  }
  for(var i=0;i<ret.failures.length;i++){
   if(typeof ret.failures[i]=="undefined"){
    ret.failures.splice(i,1);
    i-=1;
   }
  }
  ret.results=results;
  return Promise.resolve(ret)
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
* file's text or data), and is rejected when an error occurs (the
* result may be an object with
* one property: "url", the URL of the file).
*/
"loadFileFromUrl":function(url,responseType){
 var urlstr=url;
 var respType=responseType||"text";
 return new Promise(function(resolve, reject){
   var xhr=new XMLHttpRequest();
   xhr.onreadystatechange=function(e){
    var t=e.target;
    if(t.readyState==4){
     if(t.status>=200 && t.status<300){
      var resp=t.response
      if(!resp){
       if(respType=="xml")resp=t.responseXML
       else if(respType=="json")
        resp=(t.responseJSON||JSON.parse(t.responseText))+""
       else if(respType=="arraybuffer")
        resp=t.response
       else resp=t.responseText+""
      }
      resolve({"url": urlstr, "data": resp});
     } else {
      reject({"url": urlstr});
     }
    }
   };
   xhr.onerror=function(e){
    reject({"url": urlstr, "error": e});
   }
   xhr.open("get", url, true);
   xhr.responseType=respType
   xhr.send();
 });
}
};

if(!window.requestAnimationFrame){
 window.requestAnimationFrame=window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
 if(!window.requestAnimationFrame){
  window.requestAnimationFrame=function(func){
   window.setTimeout(func,17);
  }
 }
}

(function(exports){

var hlsToRgb=function(hls) {
 "use strict";
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
}
// Converts a representation of a color to its RGB form
// Returns a 4-item array containing the intensity of red,
// green, blue, and alpha (each from 0-255)
// Returns null if the color can't be converted
var colorToRgba=function(x){
 "use strict";
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
* @param {Array<number>|number|string} r Array of three or
* four color components; or the red color component (0-1); or a string
* specifying an [HTML or CSS color]{@link glutil.GLUtil.toGLColor}.  Returns (0,0,0,0) if this value is null.
* @param {number} g Green color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} b Blue color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} a Alpha color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @return the color as a 4-element array; if the color is
* invalid, returns [0,0,0,0] (transparent black).
*/
exports["toGLColor"]=function(r,g,b,a){
 if(r==null)return [0,0,0,0];
 if(typeof r=="string"){
   var rgba=colorToRgba(r) || [0,0,0,0];
   var mul=1.0/255;
   rgba[0]*=mul;
   rgba[1]*=mul;
   rgba[2]*=mul;
   rgba[3]*=mul;
   return rgba;
 }
 if(typeof r=="number" &&
     typeof g=="number" && typeof b=="number"){
   return [r,g,b,(typeof a!="number") ? 1.0 : a];
 } else if(r.constructor==Array){
   return [r[0]||0,r[1]||0,r[2]||0,
     (typeof r[3]!="number") ? 1.0 : r[3]];
 } else {
   return r || [0,0,0,0];
 }
}

var namedColors=null;
var setUpNamedColors=function(){
  "use strict";
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
}
/** @private */
GLUtil._isPowerOfTwo=function(a){
   if(Math.floor(a)!=a || a<=0)return false;
   while(a>1 && (a&1)==0){
    a>>=1;
   }
   return (a==1);
}
///////////////////////

/**
* Specifies parameters for light sources.
* @class
* @alias glutil.LightSource
*/
function LightSource(position, ambient, diffuse, specular) {
 this.ambient=ambient || [0,0,0,1.0]
 /**
 * Light position.  An array of four numbers.
* If the fourth element is 0, this is a directional light, shining an infinitely
* long light at the direction given by the first three elements (the X, Y, and Z
* coordinates respectively).  If the fourth element is 1, this is a point
* light located at the position, in world space, given by the first three elements (the X, Y, and Z
* coordinates respectively).
*/
 this.position=position ? [position[0],position[1],position[2],1.0] :
   [0, 0, 1, 0];
 /**
 * A 3-element vector giving the diffuse color of the light, in the red, green,
 * and blue components respectively.  Each component ranges from 0 to 1.
 */
 this.diffuse=diffuse||[1,1,1];
 /**
 * A 3-element vector giving the color of specular highlights caused by
 * the light, in the red, green,
 * and blue components respectively.  Each component ranges from 0 to 1.
 */
 this.specular=specular||[1,1,1];
};
/**
* Sets parameters for this material object.
* @param {object} params An object whose keys have
* the possibilities given below, and whose values are those
* allowed for each key.<ul>
* <li><code>position</code> - Light position.  An array of four numbers,
* where the first three numbers are the X, Y, and Z components and the fourth
* number is the W component.<ul>
* <li>If W is 0, then X, Y, and Z specify a 3-element vector giving the direction
* of the light; the light will shine everywhere in the given direction.
* <li>If W is 1, then X, Y, and Z specify the position of the light in world
* space; the light will shine brightest, and in every direction, at the given position.</ul>
* <li><code>ambient</code> - Not used in the default shader program.
* <li><code>diffuse</code> - Diffuse color.
* <li><code>specular</code> - Specular highlight color.
* </ul>
* If a value is null or undefined, it is ignored.
* @return {glutil.Material} This object.
*/
LightSource.prototype.setParams=function(params){
 if(params["ambient"]!=null){
  this.ambient=GLUtil["toGLColor"](params.ambient);
 }
 if(params["position"]!=null){
  var position=params["position"]
  this.position=[position[0],position[1],position[2],
    (position[3]==null) ? 0.0 : position[3]];
 }
 if(params["specular"]!=null){
  this.specular=GLUtil["toGLColor"](params.specular);
 }
 if(params["diffuse"]!=null){
  this.diffuse=GLUtil["toGLColor"](params.diffuse);
 }
 return this;
}

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
 * directly hitting it, such that the sunlight reflects off the walls
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
 if(index!=0){
  ret.diffuse=[0,0,0,0];
  ret.specular=[0,0,0];
 }
 return ret;
}
/**
 * Not documented yet.
 * @param {number} index Zero-based index of the light to set.  The first
 * light has index 0, the second has index 1, and so on.
 * If the light doesn't exist at that index, it will be created.
 * @return {LightSource} The corresponding light source object.
 */
Lights.prototype.getLight=function(index){
 if(!this.lights[index])this.lights[index]=Lights._createNewLight(index);
 return this.lights[index];
}
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
}

/**
 * Sets a directional light.
 * @param {number} index Zero-based index of the light to set.  The first
 * light has index 0, the second has index 1, and so on.
 * If the light doesn't exist at that index, it will be created.
 * @param {Array<number>} position A 3-element vector giving the direction of the light, along the X, Y, and Z
 * axes, respectively.
 * @return {Lights} This object.
 */
Lights.prototype.setDirectionalLight=function(index,direction){
 return this.setParams(index,{"position":[direction[0],direction[1],direction[2],0]});
}
/**
 * Sets a point light.
 * @param {number} index Zero-based index of the light to set.  The first
 * light has index 0, the second has index 1, and so on.
 * If the light doesn't exist at that index, it will be created.
 * @param {Array<number>} position A 3-element vector giving the X, Y, and Z
 * coordinates, respectively, of the light, in world coordinates.
 * @return {Lights} This object.
 */
Lights.prototype.setPointLight=function(index,position){
 return this.setParams(index,{"position":[position[0],position[1],position[2],1]});
}

/**
* Specifies parameters for geometry materials, which describe the appearance of a
* 3D object. This includes how an object reflects or absorbs light, as well
* as well as a texture image to apply on that object's surface.<p>
* The full structure is only used if the shader program supports lighting, as the
* default shader program does.  If [Scene3D.disableLighting()]{@link glutil.Scene3D#disableLighting} is called,
* disabling lighting calculations in the default shader, the "ambient", "specular", "shininess",
* and "emission" properties of this object are not used.
* @class
* @alias glutil.Material
* @param {Array<number>} ambient Ambient reflection.
* Can be an array of three numbers,
* ranging from 0 to 1 and giving the red, green, and blue components, respectively,
* or can be a string representing an [HTML or CSS color]{@link glutil.GLUtil.toGLColor}.
* May be null or omitted; default is (0.2, 0.2, 0.2).
* @param {Array<number>} diffuse Diffuse reflection.  A color with the same format
* as for "ambient". May be null or omitted; default is (0.8, 0.8, 0.8).
* @param {Array<number>} specular Specular highlight reflection.
* A color with the same format as for "ambient".
* May be null or omitted; default is (0,0,0), meaning no specular highlights.
* @param {Array<number>} shininess Specular highlight exponent of this material.
* Ranges from 0 through 128. May be null or omitted; default is 0.
* @param {Array<number>} emission Additive color emitted by an object.
* A color with the same format as for "ambient", except the array's numbers
* range from -1 to 1.
* May be null or omitted; default is (0,0,0).
*/
function Material(ambient, diffuse, specular,shininess,emission) {
 //console.log([ambient,diffuse,specular,shininess,emission]+"")
 if(ambient!=null)ambient=GLUtil["toGLColor"](ambient)
 if(diffuse!=null)diffuse=GLUtil["toGLColor"](diffuse)
 if(specular!=null)specular=GLUtil["toGLColor"](specular)
 if(emission!=null)emission=GLUtil["toGLColor"](emission)
 /** Specular highlight exponent of this material.
* The greater the number, the more concentrated the specular
* highlights are.  The lower the number, the more extended the highlights are.
* Ranges from 0 through 128.
*/
 this.shininess=(shininess==null) ? 0 : Math.min(Math.max(0,shininess),128);
 /** Ambient reflection of this material.<p>
 * Ambient reflection indicates how much an object reflects
 * ambient colors, those that color pixels the same way regardless
 * of direction or distance.
 * Because every part of an object will be shaded the same way by ambient
 * light, an object with just ambient reflection will not look much like a 3D object.<p>
 * This value is a 3-element array giving the red, green, and blue
 * components of the ambient reflection; the final ambient color depends
 * on the ambient color of the scene.
 * (0,0,0) means no ambient reflection,
 * and (1,1,1) means total ambient reflection.<p>
 * Setting ambient and diffuse reflection to the same value usually defines an object's
 * color.<p>
 * In the default shader program, if a mesh defines its own colors, those
 * colors are used for ambient reflection rather than this property.
 */
 this.ambient=ambient ? ambient.slice(0,3) : [0.2,0.2,0.2];
 /**
 * Diffuse reflection of this material. Diffuse reflection is the color that a material
 * reflects equally in all directions. Because different parts of an object are shaded
 * differently depending
 * on how directly they face diffuse lights, diffuse reflection can contribute
 * much of the 3D effect of that object.<p>
 * This value is a 4-element array giving the red, green, blue, and
 * alpha components of the diffuse reflection; the final diffuse color depends
 * on the reflected colors of lights that shine on the material.
 * (0,0,0,1) means no diffuse reflection,
 * and (1,1,1,1) means total diffuse reflection.<p>
 * Setting ambient and diffuse reflection to the same value usually defines an object's
 * color.<p>
 * In the default shader program, if a mesh defines its own colors, those
 * colors are used for diffuse reflection rather than this property.<p>
 * This value can have an optional fourth element giving the alpha component
 * (0-1).  If this element is omitted, the default is 1.<p>
 */
 this.diffuse=diffuse ? diffuse.slice(0,diffuse.length) : [0.8,0.8,0.8,1.0];
 /** Specular highlight reflection of this material.
 * Specular reflection is a reflection in the same angle as
 * the light reaches the material, similar to a mirror.  As a result, depending
 * on the viewing angle, specular reflection can give off
 * shiny highlights on the material.<p>
 * This value is a 3-element array giving the red, green, and blue
 * components of the specular reflection; the final specular color depends
 * on the specular color of lights that shine on the material.
 * (0,0,0) means no specular reflection,
 * and (1,1,1) means total specular reflection.<p>
*/
 this.specular=specular ? specular.slice(0,3) : [0,0,0];
 /**
* Additive color emitted by objects with this material.
* Used for objects that glow on their own, among other things.
* Each part of the object will be affected by the additive color the
* same way regardless of lighting (this property won't be used in the
* default shader if [Scene3D.disableLighting()]{@link glutil.Scene3D#disableLighting}
* is called, disabling lighting calculations).<p>
* This value is a 3-element array giving the red, green, and blue
* components.
* For each of the three color components, positive values add to that component,
* while negative values subtract from it. (0,0,0) means no additive color.
 */
 this.emission=emission ? emission.slice(0,3) : [0,0,0];
 this.texture=null;
}
/**
* Clones this object's parameters to a new Material
* object and returns that object. The material's texture
* map, if any, won't be cloned, but rather, a reference
* to the same object will be used.
* @return {glutil.Material} A copy of this object.
*/
Material.prototype.copy=function(){
 return new Material(
  this.ambient.slice(0,this.ambient.length),
  this.diffuse.slice(0,this.diffuse.length),
  this.specular.slice(0,this.specular.length),
  this.shininess,
  this.emission.slice(0,this.emission.length)
 ).setParams({"texture":this.texture});
}
/**
* Sets parameters for this material object.
* @param {object} params An object whose keys have
* the possibilities given below, and whose values are those
* allowed for each key.<ul>
* <li><code>ambient</code> - Ambient reflection (see {@link glutil.Material} constructor).
* <li><code>diffuse</code> - Diffuse reflection (see {@link glutil.Material} constructor).
* <li><code>specular</code> - Specular reflection (see {@link glutil.Material} constructor).
* <li><code>shininess</code> - Specular reflection exponent (see {@link glutil.Material} constructor).
* <li><code>emission</code> - Additive color (see {@link glutil.Material} constructor).
* <li><code>texture</code> - {@link glutil.Texture} object, or a string with the URL of the texture
* to use.
* </ul>
* If a value is null or undefined, it is ignored.
* @return {glutil.Material} This object.
*/
Material.prototype.setParams=function(params){
 if(params["ambient"]!=null){
  this.ambient=GLUtil["toGLColor"](params.ambient);
 }
 if(params["diffuse"]!=null){
  this.diffuse=GLUtil["toGLColor"](params.diffuse);
 }
 if(params["specular"]!=null){
  this.specular=GLUtil["toGLColor"](params.specular);
 }
 if(params["emission"]!=null){
  this.emission=GLUtil["toGLColor"](params.emission);
 }
 if(params["shininess"]!=null){
  this.shininess=params.shininess;
 }
 if(params["texture"]!=null){
   var param=params["texture"]
   if(typeof param=="string"){
    this.texture=new Texture(param)
   } else {
    this.texture=param
   }
 }
 return this;
}
/** Convenience method that returns a Material
 * object from an RGBA color.
* @param {Array<number>|number|string} r Array of three or
* four color components; or the red color component (0-1); or a string
* specifying an [HTML or CSS color]{@link glutil.GLUtil.toGLColor}.
* @param {number} g Green color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} b Blue color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} a Alpha color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @return {glutil.Material} The resulting material object.
 */
Material.fromColor=function(r,g,b,a){
 var color=GLUtil["toGLColor"](r,g,b,a);
 return new Material(color,color);
}

/** Convenience method that returns a Material
 * object from a texture to apply to a 3D object's surface.
* @param {glutil.Texture|string} texture {@link glutil.Texture} object, or a string with the
* URL of the texture data.  In the case of a string the texture will be loaded via
*  the JavaScript DOM's Image class.  However, this constructor
*  will not load that image yet.
* @return {glutil.Material} The resulting material object.
 */
Material.fromTexture=function(texture){
 return new Material().setParams({"texture":texture});
}

////////////////////

/**
*  Specifies a texture, which can serve as image data applied to
*  the surface of a shape, or even a 2-dimensional array of pixels
*  used for some other purpose, such as a depth map, a height map,
*  a bump map, a reflection map, and so on.<p>
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
}

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
}

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
}


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
 if(width<0)throw new Error("width less than 0")
 if(height<0)throw new Error("height less than 0")
 if(array.length<width*height*4)throw new Error("array too short for texture")
 var texImage=new Texture("")
 texImage.image=array;
 texImage.width=Math.ceil(width);
 texImage.height=Math.ceil(height);
 texImage.loadStatus=2;
 return texImage;
}

/** @private */
Texture.loadTga=function(name){
 var tex=this;
 return GLUtil.loadFileFromUrl(name,"arraybuffer")
 .then(function(buf){
   var view=new DataView(buf.data);
   var id=view.getUint8(0);
   var cmaptype=view.getUint8(1);
   var imgtype=view.getUint8(2);
   if(imgtype!=2 && imgtype!=3){
    return Promise.reject(new Error("unsupported image type"));
   }
   var xorg=view.getUint16(8,true);
   var yorg=view.getUint16(10,true);
   if(xorg!=0 || yorg!=0){
    return Promise.reject(new Error("unsupported origins"));
   }
   var width=view.getUint16(12,true);
   var height=view.getUint16(14,true);
   if(width==0 || height==0){
    return Promise.reject(new Error("invalid width or height"));
   }
   var pixelsize=view.getUint8(16);
   var flags=view.getUint8(16);
   if((pixelsize!=32 || imgtype!=2) &&
        (pixelsize!=8 || imgtype!=3)){
    return Promise.reject(new Error("unsupported pixelsize"));
   }
   var size=width*height;
   var arr=new Uint8Array(size*4);
   var offset=18;
   var io=0;
   if(pixelsize==32 && imgtype==2){
    for(var i=0,io=0;i<size;i++,io+=4){
     arr[io+2]=view.getUint8(offset)
     arr[io+1]=view.getUint8(offset+1)
     arr[io]=view.getUint8(offset+2)
     arr[io+3]=view.getUint8(offset+3)
     offset+=4;
    }
   } else if(pixelsize==8 && imgtype==3){
    for(var i=0,io=0;i<size;i++,io+=4){
     var col=view.getUint8(offset);
     arr[io]=col
     arr[io+1]=col
     arr[io+2]=col
     arr[io+3]=0xFF
     offset++;
    }
   }
   return {"width":width,"height":height,"image":arr}
  })
}

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
  }
  image.onerror=function(e){
   thisImage.loadStatus=-1;
   reject({"name":thisName,"error":e});
  }
  image.src=thisName;
 });
}
/**
 * Disposes the texture data in this object.
 */
Texture.prototype.dispose=function(){
 if(this.loadedTexture==null){
  this.loadedTexture.dispose();
  this.loadedTexture=null;
 }
}

////////////////////

/**
* A geometric mesh in the form of vertex buffer objects.
* @class
* @alias glutil.BufferedMesh
* @param {glutil.Mesh} mesh A geometric mesh object.
* @param {WebGLRenderingContext|object} context A WebGL context to
*  create vertex buffers from, or an object, such as Scene3D, that
* implements a no-argument <code>getContext</code> method
* that returns a WebGL context. (Note that this constructor uses
*  a WebGL context rather than a shader program because
*  vertex buffer objects are not specific to shader programs.)
*/
function BufferedMesh(mesh, context){
 this.subMeshes=[];
 this.context=GLUtil._toContext(context);
 for(var i=0;i<mesh.subMeshes.length;i++){
  var sm=mesh.subMeshes[i];
  // skip empty submeshes
  if(sm.indices.length==0)continue;
  this.subMeshes.push(new BufferedSubMesh(
    sm,this.context));
 }
}
/**
 * Returns the WebGL context associated with this object.
 * @return {WebGLRenderingContext}
 */
BufferedMesh.prototype.getContext=function(){
 return this.context;
}
/** @private */
BufferedMesh.prototype.getFormat=function(){
 var format=0;
 for(var i=0;i<this.subMeshes.length;i++){
  var sm=this.subMeshes[i];
  format|=sm.format;
 }
 return format;
}

/**
* Binds the buffers in this object to attributes according
* to their data format, and draws the elements in this mesh
* according to the data in its vertex buffers.
* @param {glutil.ShaderProgram} program A shader program object to get
* the IDs from for attributes named "position", "normal",
* "colorAttr", and "uv", and the "useColorAttr" uniform.
*/
BufferedMesh.prototype.draw=function(program){
 for(var i=0;i<this.subMeshes.length;i++){
  this.subMeshes[i].draw(program);
 }
}
/**
* Deletes the vertex and index buffers associated with this object.
*/
BufferedMesh.prototype.dispose=function(){
 for(var i=0;i<this.subMeshes.length;i++){
  this.subMeshes[i].dispose();
 }
}
/** @private */
function BufferedSubMesh(mesh, context){
 var vertbuffer=context.createBuffer();
 var facebuffer=context.createBuffer();
 context.bindBuffer(context.ARRAY_BUFFER, vertbuffer);
 context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, facebuffer);
 context.bufferData(context.ARRAY_BUFFER,
   new Float32Array(mesh.vertices), context.STATIC_DRAW);
 var type=context.UNSIGNED_SHORT;
 if(mesh.vertices.length>=65536 || mesh.indices.length>=65536){
  type=context.UNSIGNED_INT;
  context.bufferData(context.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(mesh.indices), context.STATIC_DRAW);
 } else if(mesh.vertices.length<=256 && mesh.indices.length<=256){
  type=context.UNSIGNED_BYTE;
  context.bufferData(context.ELEMENT_ARRAY_BUFFER,
    new Uint8Array(mesh.indices), context.STATIC_DRAW);
 } else {
  context.bufferData(context.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(mesh.indices), context.STATIC_DRAW);
 }
  this.verts=vertbuffer;
  this.faces=facebuffer;
  this.numVertices=mesh.vertices.length/mesh.getStride();
  this.facesLength=mesh.indices.length;
  this.type=type;
  this.format=mesh.attributeBits;
  this.context=context;
}
/**
 * @private
 */
BufferedSubMesh.prototype.dispose=function(){
 if(this.verts!=null)
  this.context.deleteBuffer(this.verts);
 if(this.faces!=null)
  this.context.deleteBuffer(this.faces);
 this.verts=null;
 this.faces=null;
}

/**
 * @private
 */
BufferedSubMesh.prototype.draw=function(program){
  // Binding phase
  function _vertexAttrib(context, attrib, size, type, stride, offset){
    if(attrib!==null){
      context.enableVertexAttribArray(attrib);
      context.vertexAttribPointer(attrib,size,type,false,stride,offset);
    }
  }
  var context=program.getContext();
  if(this.verts==null || this.faces==null){
   throw new Error("mesh buffer disposed");
  }
  if(context!=this.context){
   throw new Error("can't bind mesh: context mismatch");
  }
  context.bindBuffer(context.ARRAY_BUFFER, this.verts);
  context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, this.faces);
  var format=this.format;
  var stride=Mesh.getStride(format);
  var boundAttributes=[];
  var attr=program.get("position");
  boundAttributes.push(attr)
  _vertexAttrib(context,
    attr, 3, context.FLOAT, stride*4, 0);
  var offset=Mesh.normalOffset(format);
  if(offset>=0){
   attr=program.get("normal");
   boundAttributes.push(attr)
   _vertexAttrib(context,
    attr, 3,
    context.FLOAT, stride*4, offset*4);
  } else {
   attr=program.get("normal");
   if(attr!==null)context.disableVertexAttribArray(attr);
  }
  offset=Mesh.colorOffset(format);
  if(offset>=0){
   program.setUniforms({"useColorAttr":1.0});
   attr=program.get("colorAttr");
   boundAttributes.push(attr)
   _vertexAttrib(context,
    attr, 3,
    context.FLOAT, stride*4, offset*4);
  } else {
   program.setUniforms({"useColorAttr":0.0});
   attr=program.get("uv");
   if(attr!==null)context.disableVertexAttribArray(attr);
  }
  offset=Mesh.texCoordOffset(format);
  if(offset>=0){
   attr=program.get("uv");
   boundAttributes.push(attr)
   _vertexAttrib(context,
     attr, 2,
    context.FLOAT, stride*4, offset*4);
  } else {
   attr=program.get("uv");
   if(attr!==null)context.disableVertexAttribArray(attr);
  }
  // Drawing phase
  var context=program.getContext();
  if(this.verts==null || this.faces==null){
   throw new Error("mesh buffer disposed");
  }
  if(context!=this.context){
   throw new Error("can't bind mesh: context mismatch");
  }
  var primitive=context.TRIANGLES;
  if((this.format&Mesh.LINES_BIT)!=0)primitive=context.LINES;
  if((this.format&Mesh.POINTS_BIT)!=0)primitive=context.POINTS;
  context.drawElements(primitive,
    this.facesLength,
    this.type, 0);
}
/**
 * @private
 */
BufferedSubMesh.prototype.primitiveCount=function(){
  if((this.format&Mesh.LINES_BIT)!=0)
   return Math.floor(this.facesLength/2);
  if((this.format&Mesh.POINTS_BIT)!=0)
   return this.facesLength;
  return Math.floor(this.facesLength/3);
}
/**
 * Not documented yet.
 */
BufferedMesh.prototype.vertexCount=function(){
 var ret=0;
 for(var i=0;i<this.subMeshes.length;i++){
  ret+=this.subMeshes[i].numVertices;
 }
 return ret;
}
/**
 * Not documented yet.
 */
BufferedMesh.prototype.primitiveCount=function(){
 var ret=0;
 for(var i=0;i<this.subMeshes.length;i++){
  ret+=this.subMeshes[i].primitiveCount();
 }
 return ret;
}

/////////////////////////////////

/**
* Represents an off-screen frame buffer.<p>
* When FrameBuffer's
* constructor is called, it will create a texture buffer with the given
* width and height and a depth buffer with the same dimensions,
* and will bind both to the frame buffer.  The frame buffer currently
* bound to the WebGL context will remain unchanged.
* @class
* @alias glutil.FrameBuffer
* @param {WebGLRenderingContext|object} context
* WebGL context to associate with this buffer, or an object, such as Scene3D, that
* implements a no-argument <code>getContext</code> method
* that returns a WebGL context.
* @param {number} width Width, in pixels, of the frame buffer.
* Fractional values are rounded up.
* @param {number} height Height, in pixels, of the frame buffer.
* Fractional values are rounded up.
*/
function FrameBuffer(context, width, height){
 if(width<0 || height<0)throw new Error("width or height negative");
 this.context=context;
 // give the framebuffer its own texture unit, since the
 // shader program may bind samplers to other texture
 // units, such as texture unit 0
 this.textureUnit=1;
 this.buffer=context.createFramebuffer();
 // create color texture
 this.colorTexture = context.createTexture();
 this.width=Math.ceil(width);
 this.height=Math.ceil(height);
 this.context.activeTexture(this.context.TEXTURE0+this.textureUnit);
 this.context.bindTexture(this.context.TEXTURE_2D, this.colorTexture);
 // In WebGL, texture coordinates start at the upper left corner rather than
 // the lower left as in OpenGL and OpenGL ES, so we use this method call
 // to reestablish the lower left corner.
 this.context.pixelStorei(this.context.UNPACK_FLIP_Y_WEBGL, 1);
 this.context.texImage2D(this.context.TEXTURE_2D, 0,
   this.context.RGBA, this.width, this.height, 0,
   this.context.RGBA, this.context.UNSIGNED_BYTE, null);
 // set essential parameters now to eliminate warnings (will
 // be set again as the texture is bound)
  this.context.texParameteri(this.context.TEXTURE_2D,
   this.context.TEXTURE_MAG_FILTER, this.context.NEAREST);
 this.context.texParameteri(this.context.TEXTURE_2D,
  this.context.TEXTURE_MIN_FILTER, this.context.NEAREST);
 this.context.texParameteri(this.context.TEXTURE_2D,
  this.context.TEXTURE_WRAP_S, this.context.CLAMP_TO_EDGE);
 this.context.texParameteri(this.context.TEXTURE_2D,
  this.context.TEXTURE_WRAP_T, this.context.CLAMP_TO_EDGE);
 // create depth renderbuffer
 this.depthbuffer=this.context.createRenderbuffer();
 var oldBuffer=this.context.getParameter(
   context.FRAMEBUFFER_BINDING);
 this.context.bindFramebuffer(
   context.FRAMEBUFFER,this.buffer);
 this.context.bindRenderbuffer(
   context.RENDERBUFFER,this.depthbuffer);
 this.context.renderbufferStorage(
   context.RENDERBUFFER,context.DEPTH_COMPONENT16,
   this.width,this.height);
 this.context.bindFramebuffer(
   context.FRAMEBUFFER,oldBuffer);
}
/**
 * Gets the WebGL context associated with this frame buffer.
 * @return {WebGLRenderingContext}
 */
FrameBuffer.prototype.getContext=function(){
 return this.context;
}
/**
 * Not documented yet.
 * @param {glutil.ShaderProgram} program
 */
FrameBuffer.prototype.bind=function(program){
  if(program.getContext()!=this.context){
   throw new Error("can't bind buffer: context mismatch");
  }
 this.context.activeTexture(this.context.TEXTURE0+this.textureUnit);
 this.context.bindFramebuffer(
    this.context.FRAMEBUFFER,this.buffer);
 this.context.framebufferTexture2D(
   this.context.FRAMEBUFFER,this.context.COLOR_ATTACHMENT0,
   this.context.TEXTURE_2D,this.colorTexture,0);
 this.context.framebufferRenderbuffer(
   this.context.FRAMEBUFFER,this.context.DEPTH_ATTACHMENT,
   this.context.RENDERBUFFER,this.depthbuffer);
}
/**
 * Unbinds this frame buffer from its associated WebGL this.context.
 */
FrameBuffer.prototype.unbind=function(){
 this.context.framebufferTexture2D(
   this.context.FRAMEBUFFER,this.context.COLOR_ATTACHMENT0,
   this.context.TEXTURE_2D,null,0);
 this.context.framebufferRenderbuffer(
   this.context.FRAMEBUFFER,this.context.DEPTH_ATTACHMENT,
   this.context.RENDERBUFFER,null);
 this.context.bindFramebuffer(
    this.context.FRAMEBUFFER,null);
}
/**
 * Disposes all resources from this frame buffer object.
 */
FrameBuffer.prototype.dispose=function(){
 if(this.buffer!=null)
  this.context.deleteFramebuffer(this.buffer);
 if(this.depthbuffer!=null)
  this.context.deleteRenderbuffer(this.depthbuffer);
 if(this.colorTexture!=null)
  this.context.deleteTexture(this.colorTexture);
 this.buffer=null;
 this.depthbuffer=null;
 this.colorTexture=null;
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
 * When a Scene3D object is created, it compiles and loads
 * a default shader program that enables lighting parameters,
 * and sets the projection and view matrices to identity.
 * The default lighting for the scene will have a default
* ambient color and one directional light source.
*  @class
* @alias glutil.Scene3D
 * @param {WebGLRenderingContext|object} context
 * A WebGL 3D context to associate with this scene, or an HTML
 * canvas element to create a WebGL context from, or an object, such as Scene3D, that
* implements a no-argument <code>getContext</code> method
* that returns a WebGL context.
 */
function Scene3D(canvasOrContext){
 var context=canvasOrContext;
 if(typeof canvasOrContext.getContext=="function"){
  // This might be a canvas, so create a WebGL context.
  if(HTMLCanvasElement && context.constructor==HTMLCanvasElement){
   context=GLUtil.get3DContext(canvasOrContext);
  } else {
   context=GLUtil._toContext(context);
  }
 }
 this.context=context;
 this.lightingEnabled=true;
 this.specularEnabled=true;
 this.program=new ShaderProgram(context,
   this._getDefines()+ShaderProgram.getDefaultVertex(),
   this._getDefines()+ShaderProgram.getDefaultFragment());
 /** An array of shapes that are part of the scene. */
 this.shapes=[];
 this.clearColor=[0,0,0,1];
 this.fboFilter=null;
 this.textureCache={};
 this._projectionMatrix=GLMath.mat4identity();
 this._viewMatrix=GLMath.mat4identity();
 this._invView=null;
 this.lightSource=new Lights();
 this.width=Math.ceil(this.context.canvas.width*1.0);
 this.height=Math.ceil(this.context.canvas.height*1.0);
 this.context.viewport(0,0,this.width,this.height);
 this.context.enable(context.BLEND);
 this.context.blendFunc(context.SRC_ALPHA,context.ONE_MINUS_SRC_ALPHA);
 this.context.enable(this.context.DEPTH_TEST);
 this.context.depthFunc(this.context.LEQUAL);
 this.context.clearDepth(1.0);
 this._setClearColor();
 this.context.clear(
    this.context.COLOR_BUFFER_BIT |
    this.context.DEPTH_BUFFER_BIT);
 this.useProgram(this.program);
}
/** Returns the WebGL context associated with this scene. */
Scene3D.prototype.getContext=function(){
 return this.context;
}
 /**
  Gets the color used when clearing the screen each frame.
   @return {Array<number>} An array of four numbers, from 0 through
   1, specifying the red, green, blue, and alpha components of the color.
   */
Scene3D.prototype.getClearColor=function(){
 return this.clearColor.slice(0,4);
}
/** @private */
Scene3D.prototype._getDefines=function(){
 var ret="";
 if(this.lightingEnabled)
  ret+="#define SHADING\n"
 if(this.specularEnabled)
  ret+="#define SPECULAR\n"
 return ret;
}
/** @private */
Scene3D.prototype._initProgramData=function(){
 new LightsBinder(this.lightSource).bind(this.program);
 this._updateMatrix();
}
/**
* Changes the active shader program for this scene
* and prepares this object for the new program.
* @param {glutil.ShaderProgram} program The shader program to use.
* @return {glutil.Scene3D} This object.
*/
Scene3D.prototype.useProgram=function(program){
 if(!program)throw new Error("invalid program");
 program.use();
 this.program=program;
 this._initProgramData();
 return this;
}
/** Changes the active shader program for this scene
* to a program that doesn't support lighting.
* @return {glutil.Scene3D} This object.
*/
Scene3D.prototype.disableLighting=function(){
 this.lightingEnabled=false;
 var program=new ShaderProgram(this.context,
   this._getDefines()+ShaderProgram.getDefaultVertex(),
   this._getDefines()+ShaderProgram.getDefaultFragment());
 return this.useProgram(program);
}
/**
* Sets the viewport width and height for this scene.
* @param {number} width Width of the scene, in pixels.
*  Will be rounded up.
* @param {number} height Height of the scene, in pixels.
*  Will be rounded up.
* @return {number}
*/
Scene3D.prototype.setDimensions=function(width, height){
 if(width<0 || height<0)throw new Error("width or height negative");
 this.width=Math.ceil(width);
 this.height=Math.ceil(height);
 this.context.canvas.width=this.width+"";
 this.context.canvas.height=this.height+"";
 this.context.viewport(0,0,this.width,this.height);
  if(this.fbo!="undefined" && this.fbo){
   this.fbo.dispose();
   this.fbo=this.createBuffer();
  }
}
/** Gets the viewport width for this scene.
* @return {number}
*/
Scene3D.prototype.getWidth=function(){
 return this.width;
}
/** Gets the viewport height for this scene.
* @return {number}
*/
Scene3D.prototype.getHeight=function(){
 return this.height;
}
/** Gets the ratio of width to height for this scene.
* @return {number}
*/
Scene3D.prototype.getAspect=function(){
 return this.getWidth()/this.getHeight();
}
/**
 * Creates a frame buffer object associated with this scene.
 * @return {FrameBuffer} A buffer with the same size as this scene.
 */
Scene3D.prototype.createBuffer=function(){
 return new FrameBuffer(this.context,
   this.getWidth(),this.getHeight());
}
/**
 * Not documented yet.
 */
Scene3D.prototype.getProjectionMatrix=function(){
 return this._projectionMatrix.slice(0,16);
}
/**
 * Not documented yet.
 */
Scene3D.prototype.getViewMatrix=function(){
 return this._viewMatrix.slice(0,16);
}
/**
*  Sets this scene's projection matrix to a perspective projection.
 * <p>
 * For considerations when choosing the "near" and "far" parameters,
 * see {@link glmath.GLMath.mat4perspective}.
 * @param {number}  fov Y-axis field of view, in degrees. Should be less
* than 180 degrees. (The smaller
* this number, the bigger close objects appear to be.)
* @param {number}  aspect The ratio of width to height of the viewport, usually
*  the scene's aspect ratio (getAspect()).
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
* scene.setPerspective(45,scene.getAspect(),0.1,100);
*/
Scene3D.prototype.setPerspective=function(fov, aspect, near, far){
 return this.setProjectionMatrix(GLMath.mat4perspective(fov,
   aspect,near,far));
}

/**
 * Sets this scene's projection matrix to an orthographic projection.
 * In this projection, the left clipping plane is parallel to the right clipping
 * plane and the top to the bottom.<p>
 * If the view rectangle's aspect ratio doesn't match the desired aspect
 * ratio, the view rectangle will be centered on the 3D scene's viewport
 * or otherwise moved and scaled so as to keep the entire view rectangle visible without stretching
 * or squishing it.
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
 if(aspect==null)aspect=this.getAspect();
 if(aspect==0)aspect=1;
 return this.setProjectionMatrix(GLMath.mat4orthoAspect(
   left,right,bottom,top,near,far,aspect));
}
/**
 * Sets this scene's projection matrix to a 2D orthographic projection.
 * The near and far clipping planes will be set to -1 and 1, respectively.<p>
 * If the view rectangle's aspect ratio doesn't match the desired aspect
 * ratio, the view rectangle will be centered on the 3D scene's viewport
 * or otherwise moved and scaled so as to keep the entire view rectangle visible without stretching
 * or squishing it.
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
}

/**
 * Sets this scene's projection matrix to a perspective projection that defines
 * the view frustum, or the limits in the camera's view.
 * <p>
 * For considerations when choosing the "near" and "far" parameters,
 * see {@link glmath.GLMath.mat4perspective}.
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
}
/**
 * Sets this scene's projection matrix to an orthographic projection.
 * In this projection, the left clipping plane is parallel to the right clipping
 * plane and the top to the bottom.
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
}
/**
 * Sets this scene's projection matrix to a 2D orthographic projection.
 * The near and far clipping planes will be set to -1 and 1, respectively.
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
}
/** @private */
Scene3D.prototype._setClearColor=function(){
  this.context.clearColor(this.clearColor[0],this.clearColor[1],
    this.clearColor[2],this.clearColor[3]);
  return this;
}

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
* @param {number} a Alpha color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @return {glutil.Scene3D} This object.
*/
Scene3D.prototype.setClearColor=function(r,g,b,a){
 this.clearColor=GLUtil["toGLColor"](r,g,b,a);
 return this._setClearColor();
}
/**
* Loads a texture from an image URL.
* @param {string} URL of the image to load.
* @return {Promise} A promise that is resolved when
* the image is loaded successfully (the result will be a Texture
* object), and is rejected when an error occurs.
*/
Scene3D.prototype.loadTexture=function(name){
 return Texture.loadTexture(name, this.textureCache);
}
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
 if(texture.constructor==Texture){
   tex=texture.loadImage();
 } else {
   tex=Texture.loadTexture(texture, this.context, this.textureCache)
 }
 return tex.then(function(textureInner){
    textureInner.loadedTexture=new LoadedTexture(textureInner,context);
    return textureInner;
  });
}
/**
* Loads one or more textures from an image URL and uploads each of them
* to a texture buffer object.
* @param {Array<string>} textureFiles A list of URLs of the image to load.
* @param {Function} [resolved] Called for each URL that is loaded successfully
* and uploaded to a texture buffer (the argument will be a Texture object.)
* @param {Function} [rejected] Called for each URL for which an error
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
}
/** @private */
Scene3D.prototype._setIdentityMatrices=function(){
 this._projectionMatrix=GLMath.mat4identity();
 this._viewMatrix=GLMath.mat4identity();
 this._updateMatrix();
}
/** @private */
Scene3D.prototype._updateMatrix=function(){
 this.program.setUniforms({
   "view":this._viewMatrix,
   "projection":this._projectionMatrix,
   "viewMatrix":this._viewMatrix,
   "projectionMatrix":this._projectionMatrix
 });
}
/**
 * Sets the projection matrix for this object.  The projection
 * matrix can also be set using the {@link glutil.Scene3D#setFrustum}, {@link glutil.Scene3D#setOrtho},
 * {@link glutil.Scene3D#setOrtho2D}, and {@link glutil.Scene3D#setPerspective} methods.
 * @param {Array<number>} matrix A 16-element matrix (4x4).
 * @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.setProjectionMatrix=function(matrix){
 this._projectionMatrix=GLMath.mat4copy(matrix);
 this._updateMatrix();
 return this;
}
/**
*  Sets this scene's view matrix. The view matrix can also
* be set using the {@link glutil.Scene3D#setLookAt} method.
 * @param {Array<number>} matrix A 16-element matrix (4x4).
 * @return {glutil.Scene3D} This object.
*/
Scene3D.prototype.setViewMatrix=function(matrix){
 this._viewMatrix=GLMath.mat4copy(matrix);
 this._updateMatrix();
 return this;
}
/**
*  Sets this scene's view matrix to represent a camera view.
* This method takes a camera's position (<code>eye</code>), and the point the camera is viewing
* (<code>center</code>).
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
 up = up || [0,1,0];
 center = center || [0,0,0];
 this._viewMatrix=GLMath.mat4lookat(eye, center, up);
 this._updateMatrix();
 return this;
}
/**
* Adds a 3D shape to this scene.  Its reference, not a copy,
* will be stored in the 3D scene's list of shapes.
* @param {Shape|ShapeGroup} shape A 3D shape.
* @return {glutil.Scene3D} This object.
*/
Scene3D.prototype.addShape=function(shape){
 this.shapes.push(shape);
 return this;
}
/**
 * Creates a vertex buffer from a geometric mesh and
 * returns a shape object.
 * @param {glutil.Mesh} mesh A geometric mesh object.  The shape
 * created will use the mesh in its current state and won't
 * track future changes.
 * @return {glutil.Shape} The generated shape object.
 */
Scene3D.prototype.makeShape=function(mesh){
 var buffer=new BufferedMesh(mesh,this.context);
 return new Shape(buffer);
}

/**
* Removes all instances of a 3D shape from this scene.
* @param {Shape|ShapeGroup} shape The 3D shape to remove.
* @return {glutil.Scene3D} This object.
*/
Scene3D.prototype.removeShape=function(shape){
 for(var i=0;i<this.shapes.length;i++){
   if(this.shapes[i]==shape){
     this.shapes.splice(i,1);
     i--;
   }
 }
 return this;
}
/**
 *
 * @param {number} index Zero-based index of the light to set.  The first
 * light has index 0, the second has index 1, and so on.
 * @param {Array<number>} position A 3-element vector giving the direction of the light, along the X, Y, and Z
 * axes, respectively.  May be null, in which case the default
 * is (0, 0, 1).
 * @param {Array<number>} diffuse A 3-element vector giving the diffuse color of the light, in the red, green,
 * and blue components respectively.  Each component ranges from 0 to 1.
 * May be null, in which case the default is (1, 1, 1).
 * @param {Array<number>} specular A 3-element vector giving the color of specular highlights caused by
 * the light, in the red, green,
 * and blue components respectively.  Each component ranges from 0 to 1.
 * May be null, in which case the default is (1, 1, 1).
* @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.setDirectionalLight=function(index,position,diffuse,specular){
 this.lightSource.setDirectionalLight(index,position)
  .setParams(index,{"diffuse":diffuse,"specular":specular});
 new LightsBinder(this.lightSource).bind(this.program);
 return this;
}
/**
 * Not documented yet.
 * @param {*} index
 * @param {*} params
 */
Scene3D.prototype.setLightParams=function(index,params){
 this.lightSource.setParams(index,params);
 new LightsBinder(this.lightSource).bind(this.program);
 return this;
}
/**
 * Sets the color of the scene's ambient light.
* @param {Array<number>|number|string} r Array of three or
* four color components; or the red color component (0-1); or a string
* specifying an [HTML or CSS color]{@link glutil.GLUtil.toGLColor}.
* @param {number} g Green color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} b Blue color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} a Alpha color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.setAmbient=function(r,g,b,a){
 this.lightSource.sceneAmbient=GLUtil["toGLColor"](r,g,b,a);
 this.lightSource.sceneAmbient=this.lightSource.sceneAmbient.slice(0,4)
 new LightsBinder(this.lightSource).bind(this.program);
 return this;
}

/**
 *
 * @param {number} index Zero-based index of the light to set.  The first
 * light has index 0, the second has index 1, and so on.
 * @param {Array<number>} position
 * @param {Array<number>} diffuse A 3-element vector giving the diffuse color of the light, in the red, green,
 * and blue components respectively.  Each component ranges from 0 to 1.
 * May be null, in which case the default is (1, 1, 1).
 * @param {Array<number>} specular A 3-element vector giving the color of specular highlights caused by
 * the light, in the red, green,
 * and blue components respectively.  Each component ranges from 0 to 1.
 * May be null, in which case the default is (1, 1, 1).
* @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.setPointLight=function(index,position,diffuse,specular){
 this.lightSource.setPointLight(index,position)
   .setParams(index,{"diffuse":diffuse,"specular":specular});
 new LightsBinder(this.lightSource).bind(this.program);
 return this;
}
/** @private */
Scene3D._isIdentityExceptTranslate=function(mat){
return (
    mat[0]==1 && mat[1]==0 && mat[2]==0 && mat[3]==0 &&
    mat[4]==0 && mat[5]==1 && mat[6]==0 && mat[7]==0 &&
    mat[8]==0 && mat[9]==0 && mat[10]==1 && mat[11]==0 &&
    mat[15]==1
 );
};
/** @private */
Scene3D.prototype._setupMatrices=function(shape,program){
  var uniforms={};
  var currentMatrix=shape.getMatrix();
  var viewWorld;
  if(Scene3D._isIdentityExceptTranslate(this._viewMatrix)){
   // view matrix is just a translation matrix, so that getting the model-view
   // matrix amounts to simply adding the view's position
   viewWorld=currentMatrix.slice(0,16);
   viewWorld[13]+=this._viewMatrix[13];
   viewWorld[14]+=this._viewMatrix[14];
   viewWorld[15]+=this._viewMatrix[15];
  } else {
   viewWorld=GLMath.mat4multiply(this._viewMatrix,
    currentMatrix);
  }
  var invTrans=GLMath.mat4inverseTranspose3(viewWorld);
  uniforms["world"]=currentMatrix;
  uniforms["modelMatrix"]=currentMatrix;
  uniforms["modelViewMatrix"]=viewWorld;
  uniforms["worldViewInvTrans3"]=invTrans;
  uniforms["normalMatrix"]=invTrans;
  program.setUniforms(uniforms);
}

/**
 *  Renders all shapes added to this scene.
 *  This is usually called in a render loop, such
 *  as {@link glutil.GLUtil.renderLoop}.<p>
 * This method may set the following uniforms if they exist in the
 * shader program:<ul>
 * <li><code>projection</code>, <code>projectionMatrix</code>: this scene's
 * projection matrix
 * <li><code>view</code>, <code>viewMatrix</code>: this scene's view
 * matrix
 * </ul>
 * @return {glutil.Scene3D} This object.
 */
Scene3D.prototype.render=function(){
  if(typeof this.fboFilter!="undefined" && this.fboFilter){
   // Render to the framebuffer, then to the main buffer via
   // a filter
   var oldProgram=this.program;
   var oldProj=this.getProjectionMatrix();
   var oldView=this.getViewMatrix();
   this.fbo.bind(this.program);
   this._renderInner();
   this.fbo.unbind();
   this.useProgram(this.fboFilter);
   this.context.clear(
    this.context.COLOR_BUFFER_BIT|this.context.DEPTH_BUFFER_BIT);
   this._setIdentityMatrices();
   // Do the rendering to main buffer
   this._renderShape(this.fboQuad,this.fboFilter);
   // Restore old matrices and program
   this.setProjectionMatrix(oldProj);
   this.setViewMatrix(oldView);
   this.useProgram(oldProgram);
   this.context.flush();
   return this;
  } else {
   // Render as usual
   this._renderInner();
   this.context.flush();
   return this;
 }
}

/** @private */
Scene3D.prototype._renderShape=function(shape,program){
 if(shape.constructor==ShapeGroup){
  for(var i=0;i<shape.shapes.length;i++){
   this._renderShape(shape.shapes[i],program);
  }
 } else {
   this._setupMatrices(shape,program);
   Binders.getMaterialBinder(shape.material).bind(program);
   shape.bufferedMesh.draw(program);
 }
}
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
 if(filterProgram==null){
  this.fboFilter=null;
 } else {
  if(typeof filterProgram=="string"){
   // Assume the string is GLSL source code
   this.fboFilter=ShaderProgram.makeEffect(this.context,
    filterProgram);
  } else {
   this.fboFilter=filterProgram;
  }
  if(typeof this.fbo=="undefined" || !this.fbo){
   this.fbo=this.createBuffer();
  }
  if(typeof this.fboQuad=="undefined" || !this.fboQuad){
   var width=this.getWidth();
   var height=this.getHeight();
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
   this.fboQuad=this.makeShape(mesh).setMaterial(this.fbo);
  }
 }
 return this;
}
/** @private */
Scene3D.prototype._renderInner=function(){
  this._updateMatrix();
  this.context.clear(
    this.context.COLOR_BUFFER_BIT |
    this.context.DEPTH_BUFFER_BIT);
  for(var i=0;i<this.shapes.length;i++){
   this._renderShape(this.shapes[i],this.program);
  }
  return this;
}

/**
* Represents a grouping of shapes.
* @class
* @alias glutil.ShapeGroup
*/
function ShapeGroup(){
 this.shapes=[];
 this.parent=null;
 this.transform=new Transform();
}
/**
* Adds a 3D shape to this shape group.  Its reference, not a copy,
* will be stored in the list of shapes.
* @param {Shape|ShapeGroup} shape A 3D shape.
* @return {glutil.ShapeGroup} This object.
*/
ShapeGroup.prototype.addShape=function(shape){
 shape.parent=this;
 this.shapes.push(shape);
}
/**
 * Not documented yet.
 */
ShapeGroup.prototype.getTransform=function(){
 return this.transform;
}
/**
 * Not documented yet.
 */
ShapeGroup.prototype.getMatrix=function(){
  var xform=this.getTransform();
  var thisIdentity=xform.isIdentity();
  if(this.parent!=null){
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
}
/**
 * Not documented yet.
 * @param {glutil.Transform} transform
 */
ShapeGroup.prototype.setTransform=function(transform){
 this.transform=transform.copy();
 return this;
}
/**
 * Not documented yet.
 */
ShapeGroup.prototype.vertexCount=function(){
 var c=0;
 for(var i=0;i<this.shapes.length;i++){
  c+=this.shapes[i].vertexCount();
 }
 return c;
}
/**
 * Not documented yet.
 */
ShapeGroup.prototype.primitiveCount=function(){
 var c=0;
 for(var i=0;i<this.shapes.length;i++){
  c+=this.shapes[i].primitiveCount();
 }
 return c;
}
/**
 * Not documented yet.
 */
Scene3D.prototype.vertexCount=function(){
 var c=0;
 for(var i=0;i<this.shapes.length;i++){
  c+=this.shapes[i].vertexCount();
 }
 return c;
}
/**
 * Not documented yet.
 */
Scene3D.prototype.primitiveCount=function(){
 var c=0;
 for(var i=0;i<this.shapes.length;i++){
  c+=this.shapes[i].primitiveCount();
 }
 return c;
}
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
 this.transform.setPosition(x,y,z)
 return this;
}
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
}
/**
 * Not documented yet.
 * @param {*} x
 * @param {*} y
 * @param {*} z
 */
ShapeGroup.prototype.setScale=function(x,y,z){
 this.transform.setScale(x,y,z);
 return this;
}
/**
* An object that associates a geometric mesh (the shape of the object) with
*  material data (which defines what is seen on the object's surface)
 * and a transformation matrix (which defines the object's position and size).
* See the "{@tutorial shapes}" tutorial.
 *  @class
* @alias glutil.Shape
* @param {BufferedMesh} mesh A mesh in the form of a vertex buffer object.
* For {@link glutil.Mesh} objects, use the {@link glutil.Scene3D#makeShape}
* method instead.
  */
function Shape(mesh){
  if(mesh==null)throw new Error("mesh is null");
  this.bufferedMesh=mesh;
  this.transform=new Transform();
  this.material=new Material();
  this.parent=null;
}
/**
 * Not documented yet.
 */
Shape.prototype.vertexCount=function(){
 return (this.bufferedMesh) ? this.bufferedMesh.vertexCount() : 0;
}
/**
 * Not documented yet.
 */
Shape.prototype.primitiveCount=function(){
 return (this.bufferedMesh) ? this.bufferedMesh.primitiveCount() : 0;
}

/**
* Sets material parameters that give the shape a certain color.
* However, if the mesh defines its own colors, those colors will take
* precedence over the color given in this method.
* @param {Array<number>|number|string} r Array of three or
* four color components; or the red color component (0-1); or a string
* specifying an [HTML or CSS color]{@link glutil.GLUtil.toGLColor}.
* @param {number} g Green color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} b Blue color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
* @param {number} a Alpha color component (0-1).
* May be null or omitted if a string or array is given as the "r" parameter.
 * @return {glutil.Shape} This object.
*/
Shape.prototype.setColor=function(r,g,b,a){
 this.material=Material.fromColor(r,g,b,a);
 return this;
}
/**
 * Sets this shape's material to a texture with the given URL.
 * @param {string} name URL of the texture to use.
 * @return {glutil.Shape} This object.
 */
Shape.prototype.setTexture=function(name){
 this.material=Material.fromTexture(name);
 return this;
}
/**
* Sets this shape's material parameters.
* @param {Material} material
 * @return {glutil.Shape} This object.
*/
Shape.prototype.setMaterial=function(material){
 this.material=material;
 return this;
}
/**
* Makes a copy of this object.  The copied object
* will have its own version of the transform and
* material data, but any texture
* image data and vertex buffers will not be duplicated,
* but rather just references to them will be used.
* @return {glutil.Shape} A copy of this object.
*/
Shape.prototype.copy=function(){
 var ret=new Shape(this.bufferedMesh);
 ret.material=this.material.copy();
 ret.transform=this.getTransform().copy();
 return ret;
}
/**
 * Not documented yet.
 */
Shape.prototype.getTransform=function(){
 return this.transform;
}
/**
 * Not documented yet.
 * @param {*} transform
 */
Shape.prototype.setTransform=function(transform){
 this.transform=transform.copy();
 return this;
}
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
}
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
}
/**
 * Sets this object's orientation in the form of a [quaternion]{@tutorial glmath}.
 * See {@link glutil.Transform#setQuaternion}.
 * @param {Array<number>} quat A four-element array describing the rotation.
 * @return {glutil.Shape} This object.
 */
Shape.prototype.setQuaternion=function(quat){
  this.getTransform().setQuaternion(quat);
  return this;
}
/**
 * Gets the transformation matrix used by this shape.
   * See {@link glutil.Transform#getMatrix}.
 * @return {Array<number>} The current transformation matrix.
 */
Shape.prototype.getMatrix=function(){
  var xform=this.getTransform();
  var thisIdentity=xform.isIdentity();
  if(this.parent!=null){
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
}
/////////////
// Deprecated methods
/** @deprecated Use Shape.getTransform().multQuaternion(...) instead. */
Shape.prototype.multQuaternion=function(x){
 this.getTransform().multQuaternion(x);
 return this;
}
/** @deprecated Use Shape.getTransform().multOrientation(...) instead. */
Shape.prototype.multRotation=function(a,b,c,d){
 this.getTransform().multRotation(a,b,c,d);
 return this;
}
/** @deprecated Use Shape.getTransform().setOrientation(...) instead. */
Shape.prototype.setRotation=function(a,b,c,d){
 this.getTransform().setOrientation(a,b,c,d);
 return this;
}

/////////////
exports["BufferedMesh"]=BufferedMesh;
exports["ShapeGroup"]=ShapeGroup;
exports["Lights"]=Lights;
exports["FrameBuffer"]=FrameBuffer;
exports["LightSource"]=LightSource;
exports["Texture"]=Texture;
exports["Material"]=Material;
exports["Shape"]=Shape;
exports["Scene3D"]=Scene3D;
exports["GLUtil"]=GLUtil;
}));
