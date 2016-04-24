/*
Written by Peter O. in 2015.

Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/
If you like this, you should donate to Peter O.
at: http://upokecenter.dreamhosters.com/articles/donate-now-2/
*/
/* global GLUtil, Mesh, Promise */
(function(GLUtil){
"use strict";
if(!GLUtil){ GLUtil={}; }

/**
* Renderer for bitmap fonts.  This class supports traditional bitmap
* fonts and signed distance field fonts.<p>
* Bitmap fonts consist of a font definition file (".fnt" or ".xml") and one
* or more bitmaps containing the shape of each font glyphs.  The glyphs
* are packed so they take as little space as possible and the glyphs don't
* overlap each other.<p>
* In a signed distance field font, each pixel's alpha value depends on the
* distance from that location to the edge of the glyph.  A pixel alpha less
* than 0.5 (127 in most image formats) means the pixel is outside the
* glyph, greater than 0.5 means the pixel is inside the glyph, and 0 (for
* outside the glyph) and 1 (for outside the glyph) means the pixel is
* outside a buffer zone formed by the glyph's outline.<p>
* The font definition file formats supported are text (".fnt") and XML (".xml").
* The text file format is specified at
* <a href="http://www.angelcode.com/products/bmfont/doc/file_format.html">this
* page</a> (note that this method doesn't currently support the binary
* version described in that page).  The XML format is very similar to the text file format.
* <p>This class is considered a supplementary class to the
* Public Domain HTML 3D Library and is not considered part of that
* library. <p>
* To use this class, you must include the script "extras/text.js"; the
 * class is not included in the "glutil_min.js" file which makes up
 * the HTML 3D Library.  Example:<pre>
 * &lt;script type="text/javascript" src="extras/text.js">&lt;/script></pre>
* @class
* @alias TextRenderer
* @param {glutil.Scene3D} scene 3D scene to load font textures with.
*/
function TextRenderer(scene){
 this.scene=scene;
 this.shader=new ShaderProgram(scene,null,TextRenderer._textShader(scene));
 this.fontTextures=[]
}
/** @private */
TextRenderer.prototype._getFontTextures=function(tf){
 for(var i=0;i<this.fontTextures.length;i++){
  if(this.fontTextures[i][0]==tf){
   return this.fontTextures[i][1]
  }
 }
 return []
}
/** @private */
TextRenderer.prototype._setFontTextures=function(tf,ft){
 for(var i=0;i<this.fontTextures.length;i++){
  if(this.fontTextures[i][0]==tf){
   this.fontTextures[i][1]=ft;
   return;
  }
 }
 this.fontTextures.push([tf,ft]);
}
/**
* Creates a 3D shape containing the primitives needed to
* draw text in the given position, size, and color.
* @param {TextFont} font The bitmap font to use when drawing the text.
* @param {String} string The text to draw.  Line breaks ("\n") are recognized
* by this method.
* @param {Number} xPos X-coordinate of the top left corner of the text.
* @param {Number} yPos Y-coordinate of the top left corner of the text.
* @param {Number} height Size of the text in units.
* @param {string|Array<number>} [color] The color to draw the text with.
* An array of three or
* four color components; or a string
* specifying an [HTML or CSS color]{@link glutil.GLUtil.toGLColor}.
* If null or omitted, the bitmap font is assumed to be a signed distance field
* font.
*/
TextRenderer.prototype.textShape=function(font, str, xPos, yPos, height, color){
 var group=new ShapeGroup();
 var fontTextures=this._getFontTextures(font);
 var meshesForPage=font.makeShapeMeshes(str,xPos,yPos,height);
 for(var i=0;i<meshesForPage.length;i++){
  var mfp=meshesForPage[i];
  if(!mfp || !fontTextures[i])continue;
  var sh=this.scene.makeShape(mfp);
  var material=new Material(
     color||[0,0,0,0],
     color||[0,0,0,0]).setParams({
   "texture":fontTextures[i],
   "basic":true,
   "shader":color ? this.shader : null
  });
  sh.setMaterial(material);
  group.addShape(sh);
 }
 return group;
}
/** @private */
TextRenderer.prototype._loadPages=function(font){
 var textures=[]
 for(var i=0;i<font.pages.length;i++){
  if(!font.pages[i])continue
  textures.push(font.pages[i])
 }
 var thisObject=this;
 return this.scene.loadAndMapTextures(textures).then(function(r){
  if(r.failures.length>0) {
   return Promise.reject({"url":font.fileUrl});
  }
  thisObject._setFontTextures(font,r.successes);
  return Promise.resolve(font);
 })
}
/**
* Loads a bitmap font definition from a text file or an XML file,
* as well as the bitmaps used by that font, and maps them
* to WebGL textures.  See {@link TextRenderer} for
* more information.
* @param {string} fontFileName The URL of the font data text file
* to load.  If the string ends in ".xml", the font data is assumed to
* be in XML; otherwise, in text.
* @return {Promise<TextFont>} A promise that is resolved
* when the font data is loaded successfully (the result will be
* a TextFont object), and is rejected when an error occurs.
*/
TextRenderer.prototype.loadFont=function(fontFileName){
 var thisObject=this;
 return TextFont.load(fontFileName).then(function(f){
   return thisObject._loadPages(f)
 });
}
/**
* Represents a bitmap font.
* @class
* @alias TextFont
*/
function TextFont(fontinfo,chars,pages,kernings,common,fileUrl){
 this.info=fontinfo
 this.common=common
 if(this.info){
  this.info.padding=TextFont._toArray(this.info.padding,4)
  this.info.spacing=TextFont._toArray(this.info.spacing,2)
 }
 this.fileUrl=fileUrl;
 this.chars=chars
 this.pages=pages
 this.kern=[];
 for(var i=0;i<kernings.length;i++){
  var k=kernings[i]
  if(!this.kern[k.first])this.kern[k.first]=[]
  this.kern[k.first][k.second]=k
 }
}
TextFont._toArray=function(str,minLength){
 var spl
 if(typeof str==="string"){
  spl=str.split(",")
  for(var i=0;i<spl.length;i++){
   spl[i]=parseInt(spl[i])
  }
 } else {
  spl=[]
 }
 for(var i=spl.length;i<minLength;i++){
  spl.push(0)
 }
 return spl
}
/**
 * Not documented yet.
 * @param {*} str
 * @param {*} xPos
 * @param {*} yPos
 * @param {*} height
 */
TextFont.prototype.makeShapeMeshes=function(str,xPos,yPos,height){
 var meshesForPage=[];
 var scale=height/this.common.lineHeight;
 var recipPageWidth=1.0/this.common.scaleW;
 var recipPageHeight=1.0/this.common.scaleH;
 var startXPos=xPos;
 var lastChar=-1;
 for(var i=0;i<str.length;i++){
  var c=str.charCodeAt(i);
  if(c>=0xd800 && c<0xdc00 && i+1<str.length){
   c = 0x10000 + ((c - 0xd800) << 10) + (str.charCodeAt(i+1) -
          0xdc00);
   i++;
  } else if(c>=0xd800 && c<0xe000){
   c=0xfffd
  }
  if(c === 0x0a){
   yPos+=this.common.lineHeight*scale;
   xPos=startXPos;
   lastChar=c;
   continue;
  }
  var ch=this.chars[c]||this.chars[0]||null
  if(ch){
   var sx=ch.x*recipPageWidth;
   var sy=ch.y*recipPageHeight;
   var sx2=(ch.x+ch.width)*recipPageWidth;
   var sy2=(ch.y+ch.height)*recipPageHeight;
   var xo=ch.xoffset*scale;
   var yo=ch.yoffset*scale;
   var vx=xPos+xo;
   var vy=yPos+yo;
   var vx2=vx+ch.width*scale;
   var vy2=vy+ch.height*scale;
   var chMesh=meshesForPage[ch.page];
   if(!chMesh){
    chMesh=new Mesh();
    meshesForPage[ch.page]=chMesh;
   }
   chMesh.mode(Mesh.TRIANGLE_STRIP)
     .texCoord2(sx,1-sy)
     .vertex2(vx,vy)
     .texCoord2(sx,1-sy2)
     .vertex2(vx,vy2)
     .texCoord2(sx2,1-sy)
     .vertex2(vx2,vy)
     .texCoord2(sx2,1-sy2)
     .vertex2(vx2,vy2);
   if(lastChar!=-1){
    if(this.kern[lastChar] && this.kern[lastChar][c]){
     xPos+=this.kern[lastChar][c].amount*scale;
    }
   }
   xPos+=ch.xadvance*scale;
  }
  lastChar=c;
 }
 return meshesForPage;
}
TextFont._resolvePath=function(path, name){
 // Relatively dumb for a relative path
 // resolver, but sufficient for TextFont's purposes
 "use strict";
var ret=path;
 var lastSlash=ret.lastIndexOf("/");
 if(lastSlash>=0){
  ret=ret.substr(0,lastSlash+1)+name.replace(/\\/g,"/");
 } else {
  ret=name.replace(/\\/g,"/");
 }
 return ret;
};

TextFont._elementToObject=function(element){
 var attrs=element.getAttributeNames();
 var x={};
 for(var i=0;i<attrs.length;i++){
  var n=attrs[i];
  if(n=="face" || n=="charset" || n=="file" || n=="padding" ||
     n=="spacing"){
    x[n]=element.getAttribute(n)
   } else {
    x[n]=parseInt(element.getAttribute(n))
    if(isNaN(x[n]))x[n]=0;
   }
 }
 return x;
}

TextFont._loadXmlFontInner=function(data){
 var doc=data.data
 var commons=doc.getElementsByTagName("common")
 if(commons.length === 0)return null;
 var infos=doc.getElementsByTagName("info")
 if(infos.length === 0)return null;
 var pages=doc.getElementsByTagName("page")
 if(pages.length === 0)return null;
 var chars=doc.getElementsByTagName("char")
 var kernings=doc.getElementsByTagName("kerning")
 var xchars=[]
 var xpages=[]
 var xkernings=[]
 var xcommons=TextFont._elementToObject(commons[0])
 var xinfos=TextFont._elementToObject(infos[0])
 for(var i=0;i<pages.length;i++){
  var p=TextFont._elementToObject(pages[i])
  xpages[p.id]=TextFont._resolvePath(data.url,p.file);
 }
 for(var i=0;i<chars.length;i++){
  var p=TextFont._elementToObject(chars[i])
  xchars[p.id]=p
 }
 for(var i=0;i<kernings.length;i++){
  var p=TextFont._elementToObject(kernings[i])
  xkernings.push(p)
 }
 return new TextFont(xinfos,xchars,xpages,xkernings,xcommons,data.url)
}

TextFont._loadTextFontInner=function(data){
  var text=data.data
  var lines=text.split(/\r?\n/)
  var pages=[]
  var chars=[]
  var kernings=[]
  var common=null;
  var fontinfo=null;
  var firstline=true;
  for(var i=0;i<lines.length;i++){
   var e=(/^(\w+)\s+(.*)/).exec(lines[i]);
   if(!e)continue;
   var word=e[1];
   var rest=e[2];
   var hash={};
   while(true){
     e=(/^((\w+)\=(\"[^\"]+\"|\S+(?:\s+(?![^\s\=]+\=)[^\s\=]+)*)\s*)/).exec(rest)
     if(!e)break;
     var key=e[2];
     var value=e[3];
     if(value.charAt(0)=='"'){
      value=value.substring(1,value.length-1);
     } else if(value.match(/^-?\d+$/)){
      value=parseInt(value)|0;
     }
     hash[key]=value;
     rest=rest.substr(e[1].length);
   }
   if(word=="page"){
    pages[hash.id|0]=TextFont._resolvePath(data.url,hash.file);
   }
   if(word=="char" && hash.id!=null){
    chars[hash.id|0]=hash;
   }
   if(word=="common"){
    if(common)return null;
    common=hash
   }
   if(word=="kerning" && hash.first!=null){
    kernings.push(hash)
   }
   if(word=="info" && hash.face!=null){
    if(fontinfo)return null;
    fontinfo=hash
   }
  }
  if(!fontinfo || !common || pages.length === 0){
   return null;
  }
  return new TextFont(fontinfo,chars,pages,kernings,common,data.url)
}
/**
* Loads a bitmap font definition from a text file or an XML file.
* Note that this method only loads the font data and not the bitmaps
* used to represent the font.
* @param {string} fontFileName The URL of the font data text file
* to load.  If the string ends in ".xml", the font data is assumed to
* be in XML; otherwise, in text.
* @return {Promise<TextFont>} A promise that is resolved
* when the font data is loaded successfully (the result will be
* a TextFont object), and is rejected when an error occurs.
*/
TextFont.load=function(fontFileName){
 if((/\.xml$/i.exec(fontFileName))){
  return GLUtil.loadFileFromUrl(fontFileName,"xml").then(
   function(data){
    var ret=TextFont._loadXmlFontInner(data)
    return ret ? Promise.resolve(ret) : Promise.reject({"url":data.url})
   })
 } else {
  return GLUtil.loadFileFromUrl(fontFileName).then(
   function(data){
    var ret=TextFont._loadTextFontInner(data)
    return ret ? Promise.resolve(ret) : Promise.reject({"url":data.url})
   })
 }
}

TextRenderer._textShader=function(scene){
"use strict";
var i;

var shader=""
var derivs=ShaderProgram.supportsDerivatives(scene);
if(derivs){
 shader+="#extension GL_OES_standard_derivatives : enable\n"
}
shader+=ShaderProgram.fragmentShaderHeader() +
"uniform vec4 md;\n" +
"uniform sampler2D sampler;\n" +
"varying vec2 uvVar;\n"+
"varying vec3 colorAttrVar;\n" +
"void main(){\n" +
" float d=texture2D(sampler, uvVar).a;\n"
if(derivs){
shader+=" float dsmooth=fwidth(d);\n";
} else {
shader+=" float dsmooth=0.06;\n";
}
shader+=" gl_FragColor=vec4(md.rgb,md.a*smoothstep(0.5-dsmooth,0.5+dsmooth,d));\n" +
"}";
return shader;
};

GLUtil.TextFont=TextFont;
GLUtil.TextRenderer=TextRenderer;

})(GLUtil);
