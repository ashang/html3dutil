/*
Written by Peter O. in 2015.

Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/
If you like this, you should donate to Peter O.
at: http://upokecenter.dreamhosters.com/articles/donate-now-2/
*/
/* global Lights, console */

/**
* Represents a WebGL shader program.  A shader program in
* WebGL consists of a vertex shader (which processes vertices),
* and a fragment shader (which processes pixels).  Shader programs
* are specially designed for running on a graphics processing unit,
* or GPU.<p>
* When the ShaderProgram constructor is called, it will compile
* and link a shader program from the source text passed to it, but
* it won't use that program until the use() method is called.  If the
* program is compiled and linked successfully, the constructor
* will also gather a list of the program's attributes (vertex-specific variables
* in vertex buffer objects) and uniforms (variables not specific to a vertex).<p>
* If compiling or linking the shader program fails, a diagnostic
* log is output to the JavaScript console.
* @class
* @alias glutil.ShaderProgram
* @param {WebGLRenderingContext|object} context A WebGL context associated with the
* compiled shader program, or an object, such as Scene3D, that
* implements a no-argument <code>getContext</code> method
* that returns a WebGL context.
* @param {String} [vertexShader] Source text of a vertex shader, in OpenGL
* ES Shading Language (GLSL).  If null, a default
* vertex shader is used instead.
* @param {String} [fragmentShader] Source text of a fragment shader in GLSL.
* If null, a default fragment shader is used instead.
*/
function ShaderProgram(context, vertexShader, fragmentShader){
 "use strict";
context= (context.getContext) ? context.getContext() : context;
 if((vertexShader===null || typeof vertexShader==="undefined")){
  vertexShader=ShaderProgram.getDefaultVertex();
 }
 if((fragmentShader===null || typeof fragmentShader==="undefined")){
  fragmentShader=ShaderProgram.getDefaultFragment();
 }
 var prog=ShaderProgram._compileShaders(context,vertexShader,fragmentShader);
 this.program=prog;
 this.attributes={};
 this.context=context;
 this.actives={};
 this.uniformValues={};
 this.uniformTypes={};
 this.savedUniforms={};
 this.CURRENT_PROGRAM=context.CURRENT_PROGRAM;
 this.FLOAT=context.FLOAT;
 if((prog!==null && typeof prog!=="undefined")){
  this.attributes=[];
  var name=null;
  var ret={};
  var count= context.getProgramParameter(prog, context.ACTIVE_ATTRIBUTES);
  for (var i = 0; i < count; ++i) {
   var attributeInfo=context.getActiveAttrib(prog, i);
   if((attributeInfo!==null && typeof attributeInfo!=="undefined")){
    name=attributeInfo.name;
    var attr=context.getAttribLocation(prog, name);
    if(attr>=0){
     this.attributes.push(attr);
     ret[name]=attr;
    }
   }
  }
  count = context.getProgramParameter(prog, context.ACTIVE_UNIFORMS);
  for (i = 0; i < count; ++i) {
   var uniformInfo=this.context.getActiveUniform(prog, i);
   if((uniformInfo!==null && typeof uniformInfo!=="undefined")){
    name = uniformInfo.name;
    ret[name] = this.context.getUniformLocation(prog, name);
    this.uniformTypes[name] = uniformInfo.type;
   }
  }
  this.actives=ret;
 }
}

/** @private */
ShaderProgram.supportsDerivatives=function(context){
 context= (context.getContext) ? context.getContext() : context;
 if(context.getExtension("OES_standard_derivatives")){
   return true;
 } else {
   return false;
 }
}

/** Disposes resources from this shader program.
*/
ShaderProgram.prototype.dispose=function(){
 "use strict";
if(this.program){
  this.context.deleteProgram(this.program);
 }
 this.context=null;
 this.program=null;
 this.actives={};
 this.attributes={};
 this.uniformTypes={};
};
/** Gets the WebGL context associated with this shader program.
* @return {WebGLRenderingContext} Return value.*/
ShaderProgram.prototype.getContext=function(){
 "use strict";
return this.context;
};
/**
* Gets the location of the given uniform or attribute's name in this program.
* (Although the location may change each time the shader program
* is linked, that normally only happens upon construction
* in the case of ShaderProgram.)
* @param {string} name The name of an attribute or uniform defined in either the
* vertex or fragment shader of this shader program.  If the uniform or attribute
* is an array, each element in the array is named as in these examples:
* "unif[0]", "unif[1]".   If it's a struct, each member in the struct is named as in these examples:
* "unif.member1", "unif.member2".  If it's an array of struct, each
* member is named as in these examples: "unif[0].member1",
* "unif[0].member2".
* @return {number|WebGLUniformLocation|null} The location of the uniform or attribute
* name, or null if it doesn't exist.
*/
ShaderProgram.prototype.get=function(name){
 "use strict";
var ret=this.actives[name];
 return ((ret===null || typeof ret==="undefined")) ? null : ret;
};
/**
* Gets the value of the given uniform in this program. This method
* may be called at any time, even if this program is not currently the
* active program in the WebGL context.
* @param {string} name The name of a uniform defined in either the
* vertex or fragment shader of this shader program.  See get().
* @return {*} The uniform's value, or null if it doesn't exist or if
* an attribute is named, not a uniform.
*/
ShaderProgram.prototype.getUniform=function(name){
 "use strict";
var loc=(typeof name==="string") ? this.get(name) : name;
 // If "loc" is a number that means it's an attribute, not a uniform;
 // we expect WebGLUniformLocation
 if(loc===null || typeof loc==="number")return null;
 // using a cache since context.getUniform can be slow with
 // repeated calls
 var uv=this.uniformValues[name];
 if((uv===null || typeof uv==="undefined")){
  return this.context.getUniform(this.program,loc);
 } else {
  return (uv instanceof Array) ? uv.slice(0,uv.length) : uv;
 }
};
/**
* Makes this program the active program for the WebGL context.
* This method also sets uniforms that couldn't be applied by the
* setUniforms() method because the context used a different
* program.<p>
* Changing the context's active program doesn't reset the uniform
* variables associated with the previous program.
* @return {glutil.ShaderProgram} This object.
*/
ShaderProgram.prototype.use=function(){
 "use strict";
this.context.useProgram(this.program);
 this.setUniforms(this.savedUniforms);
 this.savedUniforms={};
 return this;
};
/** @private */
ShaderProgram.prototype._log=function(i,v){
 //console.log("setting "+i+": "+v);
};
/** @private */
ShaderProgram.prototype._saveIfNotCurrent=function(v,i,isCurrentProgram){
     "use strict";
this._log(i,v);
     if((isCurrentProgram===null || typeof isCurrentProgram==="undefined")){
       isCurrentProgram=this.context.getParameter(
         this.CURRENT_PROGRAM)===this.program;
      }
      if(!isCurrentProgram){
       // Save this uniform to write later
       this.savedUniforms[i]=(typeof v==="number") ? v : v.slice(0,v.length);
       this.uniformValues[i]=null;
      }
      return isCurrentProgram;
};
/** @private */
ShaderProgram.prototype._setUniform=function(uniforms,i,isCurrentProgram){
  "use strict";
isCurrentProgram=null;
      var v=uniforms[i];
      var uniform=this.get(i);
      if((uniform===null || typeof uniform==="undefined"))return isCurrentProgram;
      var uv=this.uniformValues[i];
      if(typeof v==="number"){
       var newUv=false;
       if((uv===null || typeof uv==="undefined")){
        this.uniformValues[i]=uv=v;
        newUv=true;
       } else if(uv!==v){
        uv=v;
        this.uniformValues[i]=v;
        newUv=true;
       }
       if(newUv){
         if(this.uniformTypes[i]===this.FLOAT){
          if(!(isCurrentProgram=this._saveIfNotCurrent(uv,i,isCurrentProgram)))
           return isCurrentProgram;
         this.context.uniform1f(uniform, uv);
        } else {
         if(!(isCurrentProgram=this._saveIfNotCurrent(uv,i,isCurrentProgram)))
          return isCurrentProgram;
         this.context.uniform1i(uniform, uv);
        }
       }
      }
      else if(v.length===3){
       if(!uv){
        this.uniformValues[i]=uv=v.slice(0,v.length);
         if(!(isCurrentProgram=this._saveIfNotCurrent(uv,i,isCurrentProgram)))
          return isCurrentProgram;
        this.context.uniform3fv(uniform, uv);
       } else if(uv[0]!==v[0] || uv[1]!==v[1] || uv[2]!==v[2]){
        uv[0]=v[0]; uv[1]=v[1]; uv[2]=v[2];
         if(!(isCurrentProgram=this._saveIfNotCurrent(uv,i,isCurrentProgram)))
          return isCurrentProgram;
        this.context.uniform3fv(uniform, uv);
       }
      } else if(v.length===2){
       if(!uv){
        this.uniformValues[i]=uv=v.slice(0,v.length);
         if(!(isCurrentProgram=this._saveIfNotCurrent(uv,i,isCurrentProgram)))
          return isCurrentProgram;
        this.context.uniform2fv(uniform, uv);
       } else if(uv[0]!==v[0] || uv[1]!==v[1]){
        uv[0]=v[0]; uv[1]=v[1];
         if(!(isCurrentProgram=this._saveIfNotCurrent(uv,i,isCurrentProgram)))
          return isCurrentProgram;
        this.context.uniform2fv(uniform, uv);
       }
      } else if(v.length===4){
       if(!uv){
        this.uniformValues[i]=uv=v.slice(0,v.length);
         if(!(isCurrentProgram=this._saveIfNotCurrent(uv,i,isCurrentProgram)))
          return isCurrentProgram;
        this.context.uniform4fv(uniform, uv);
       } else if(uv[0]!==v[0] || uv[1]!==v[1] || uv[2]!==v[2] || uv[3]!==v[3]){
        uv[0]=v[0]; uv[1]=v[1]; uv[2]=v[2]; uv[3]=v[3];
         if(!(isCurrentProgram=this._saveIfNotCurrent(uv,i,isCurrentProgram)))
          return isCurrentProgram;
        this.context.uniform4fv(uniform, uv);
       }
      } else if(v.length===16){
       if(!uv){
        this.uniformValues[i]=uv=v.slice(0,v.length);
        if(!(isCurrentProgram=this._saveIfNotCurrent(uv,i,isCurrentProgram)))
          return isCurrentProgram;
        this.context.uniformMatrix4fv(uniform,false,uv);
       } else if(ShaderProgram._copyIfDifferent(v,uv,16)){
          if(!(isCurrentProgram=this._saveIfNotCurrent(uv,i,isCurrentProgram)))
          return isCurrentProgram;
        this.context.uniformMatrix4fv(uniform,false,uv);
       }
      } else if(v.length===9){
       if(!uv){
        this.uniformValues[i]=uv=v.slice(0,v.length);
         if(!(isCurrentProgram=this._saveIfNotCurrent(uv,i,isCurrentProgram)))
          return isCurrentProgram;
        this.context.uniformMatrix3fv(uniform,false,uv);
       } else if(ShaderProgram._copyIfDifferent(v,uv,9)){
         if(!(isCurrentProgram=this._saveIfNotCurrent(uv,i,isCurrentProgram)))
          return isCurrentProgram;
        this.context.uniformMatrix3fv(uniform,false,uv);
       }
      }
      return isCurrentProgram;
};
/**
* Sets uniform variables for this program.  Uniform variables
* are called uniform because they uniformly apply to all vertices
* in a primitive, and are not different per vertex.<p>
* This method may be called at any time, even if this program is not currently the
* active program in the WebGL context.  In that case, this method will instead
* save the uniforms to write them later the next time this program
* becomes the currently active program (via the use() method).<p>
* Once the uniform is written to the program, it will be retained even
* after a different program becomes the active program. (It will only
* be reset if this program is re-linked, which won't normally happen
* in the case of the ShaderProgram class.)
* @param {Object} uniforms A hash of key/value pairs.  Each key is
* the name of a uniform (see {@link glutil.ShaderProgram#get}
* for more information), and each
* value is the value to set
* to that uniform.  Uniform values that are 3- or 4-element
* vectors must be 3 or 4 elements long, respectively.  Uniforms
* that are 4x4 matrices must be 16 elements long.   Uniforms
* that are 3x3 matrices must be 9 elements long. Keys to
* uniforms that don't exist in this program are ignored.  See also
* the "name" parameter of the {@link glutil.ShaderProgram#get}
* method for more information on
* uniform names.
* @return {glutil.ShaderProgram} This object.
*/
ShaderProgram.prototype.setUniforms=function(uniforms){
  "use strict";
  var i;
var isCurrentProgram=null;
  if(typeof Object.keys!=="undefined"){
    var keys=Object.keys(uniforms);
    for(var ki=0;ki<keys.length;ki++){
     i=keys[ki];
     isCurrentProgram=this._setUniform(uniforms,i,isCurrentProgram);
    }
  } else {
    for(i in uniforms){
     isCurrentProgram=this._setUniform(uniforms,i,isCurrentProgram);
    }
  }
  return this;
};
ShaderProgram._copyIfDifferent=function(src,dst,len){
 "use strict";
for(var i=0;i<len;i++){
  if(src[i]!==dst[i]){
   // Arrays are different
   dst[i]=src[i];
   for(var j=i+1;j<len;j++){
    dst[j]=src[j];
   }
   return true;
  }
 }
 return false;
};
/** @private */
ShaderProgram._compileShaders=function(context, vertexShader, fragmentShader){
  "use strict";
function compileShader(context, kind, text){
    var shader=context.createShader(kind);
    context.shaderSource(shader, text);
    context.compileShader(shader);
    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
      var lines=text.split("\n");
      // add line numbers
      for(var i=0;i<lines.length;i++){
       lines[i]="/* "+(i+1)+" */   "+lines[i];
      }
      console.log(lines.join("\n"));
      console.log((kind===context.VERTEX_SHADER ? "vertex: " : "fragment: ")+
        context.getShaderInfoLog(shader));
      return null;
    }
   return shader;
  }
  var vs=(!vertexShader || vertexShader.length===0) ? null :
    compileShader(context,context.VERTEX_SHADER,vertexShader);
  var fs=(!fragmentShader || fragmentShader.length===0) ? null :
    compileShader(context,context.FRAGMENT_SHADER,fragmentShader);
  var program = null;
  if((vs!==null && typeof vs!=="undefined") && (fs!==null && typeof fs!=="undefined")){
   program = context.createProgram();
   context.attachShader(program, vs);
   context.attachShader(program, fs);
    context.linkProgram(program);
   if (!context.getProgramParameter(program, context.LINK_STATUS)) {
    console.log("link: "+context.getProgramInfoLog(program));
    context.deleteProgram(program);
    program=null;
   }
   context.detachShader(program, vs);
   context.detachShader(program, fs);
  }
  if((vs!==null && typeof vs!=="undefined"))context.deleteShader(vs);
  if((fs!==null && typeof fs!=="undefined"))context.deleteShader(fs);
  return program;
};
/** @private */
ShaderProgram.fragmentShaderHeader=function(){
"use strict";
return "" +
"#ifdef GL_ES\n" +
"#ifndef GL_FRAGMENT_PRECISION_HIGH\n" +
"precision mediump float;\n" +
"#else\n" +
"precision highp float;\n" +
"#endif\n" +
"#endif\n";
};
/**
* Generates source code for a fragment shader for applying
* a raster effect to a texture.
* @param {string} functionCode See ShaderProgram.makeEffect().
* @return {string} The source text of the resulting fragment shader.
*/
ShaderProgram.makeEffectFragment=function(functionCode){
"use strict";
var shader=ShaderProgram.fragmentShaderHeader();
shader+=""+
"uniform sampler2D sampler;\n" + // texture sampler
"uniform vec2 textureSize;\n" + // texture size
"varying vec2 uvVar;\n"+
"varying vec3 colorAttrVar;\n";
shader+=functionCode;
shader+="\n\nvoid main(){\n" +
" // normalize coordinates to 0..1\n" +
" vec2 uv=gl_FragCoord.xy/textureSize.xy;\n" +
" gl_FragColor=textureEffect(sampler,uv,textureSize);\n" +
"}";
return shader;
};

ShaderProgram.makeCopyEffect=function(context){
"use strict";
var shader=ShaderProgram.fragmentShaderHeader();
shader+=""+
"uniform sampler2D sampler;\n" + // texture sampler
"varying vec2 uvVar;\n"+
"varying vec3 colorAttrVar;\n";
shader+="\n\nvoid main(){\n" +
" gl_FragColor=texture2D(sampler,uvVar);\n" +
"}";
return new ShaderProgram(context,
   ShaderProgram.getBasicVertex(),shader);
};

/**
* Generates a shader program for applying
* a raster effect to a texture.
* @param {WebGLRenderingContext|object} context A WebGL context associated with the
* compiled shader program, or an object, such as Scene3D, that
* implements a no-argument <code>getContext</code> method
* that returns a WebGL context.
* @param {string} functionCode A string giving shader code
* in OpenGL ES Shading Language (GLSL) that must contain
* a function with the following signature:
* <pre>
* vec4 textureEffect(sampler2D sampler, vec2 uvCoord, vec2 textureSize)
* </pre>
* where <code>sampler</code> is the texture sampler, <code>uvCoord</code>
* is the texture coordinates ranging from 0 to 1 in each component,
* <code>textureSize</code> is the dimensions of the texture in pixels,
* and the return value is the new color at the given texture coordinates.  Besides
* this requirement, the shader code is also free to define additional uniforms,
* constants, functions, and so on (but not another "main" function).
* @return {glutil.ShaderProgram} The resulting shader program.
*/
ShaderProgram.makeEffect=function(context,functionCode){
 "use strict";
return new ShaderProgram(context,
   ShaderProgram.getBasicVertex(),
   ShaderProgram.makeEffectFragment(functionCode));
};
/**
* Generates a shader program that inverts the colors of a texture.
* @param {WebGLRenderingContext|object} context A WebGL context associated with the
* compiled shader program, or an object, such as Scene3D, that
* implements a no-argument <code>getContext</code> method
* that returns a WebGL context.
* @return {glutil.ShaderProgram} The resulting shader program.
*/
ShaderProgram.getInvertEffect=function(context){
"use strict";
return ShaderProgram.makeEffect(context,
[
"vec4 textureEffect(sampler2D sampler, vec2 uvCoord, vec2 textureSize){",
" vec4 color=texture2D(sampler,uvCoord);",
" vec4 ret; ret.xyz=vec3(1.0,1.0,1.0)-color.xyz; ret.w=color.w; return ret;",
"}"].join("\n"));
};
/**
* Generates a shader program that generates a two-color texture showing
* the source texture's edges.
* @param {WebGLRenderingContext|object} context A WebGL context associated with the
* compiled shader program, or an object, such as Scene3D, that
* implements a no-argument <code>getContext</code> method
* that returns a WebGL context.
* @return {glutil.ShaderProgram} The resulting shader program.
*/
ShaderProgram.getEdgeDetectEffect=function(context){
// Adapted by Peter O. from David C. Bishop's EdgeDetect.frag,
// in the public domain
"use strict";
return ShaderProgram.makeEffect(context,
["float luma(vec3 color) {",
" return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;",
"}",
"const vec4 edge_color=vec4(0.,0,0,1);",
"const vec4 back_color=vec4(1.,1,1,1);",
"vec4 textureEffect(sampler2D sampler, vec2 uvCoord, vec2 textureSize){",
"float dx = 1.0 / float(textureSize.x);",
"float dy = 1.0 / float(textureSize.y);",
"float s00 = luma(texture2D(sampler, uvCoord + vec2(-dx,dy)).rgb);",
"float s10 = luma(texture2D(sampler, uvCoord + vec2(-dx,0.0)).rgb);",
"float s20 = luma(texture2D(sampler, uvCoord + vec2(-dx,-dy)).rgb);",
"float s01 = luma(texture2D(sampler, uvCoord + vec2(0.0,dy)).rgb);",
"float s21 = luma(texture2D(sampler, uvCoord + vec2(0.0,-dy)).rgb);",
"float s02 = luma(texture2D(sampler, uvCoord + vec2(dx, dy)).rgb);",
"float s12 = luma(texture2D(sampler, uvCoord + vec2(dx, 0.0)).rgb);",
"float s22 = luma(texture2D(sampler, uvCoord + vec2(dx, -dy)).rgb);",
"float sx = s00 + 2.0 * s10 + s20 - (s02 + 2.0 * s12 + s22);",
"float sy = s00 + 2.0 * s01 + s02 - (s20 + 2.0 * s21 + s22);",
"float dist = sx * sx + sy * sy;",
"if(dist > 0.4) {",
"return edge_color;",
"} else {",
"return back_color;",
"}}"
].join("\n"));
};

/** @private */
ShaderProgram.getBasicVertex=function(){
"use strict";
var shader=""+
"attribute vec3 position;\n" +
"attribute vec3 uv;\n" +
"attribute vec3 colorAttr;\n" +
"varying vec2 uvVar;\n"+
"varying vec3 colorAttrVar;\n" +
"void main(){\n"+
"vec4 positionVec4;\n"+
"positionVec4.w=1.0;\n"+
"positionVec4.xyz=position;\n" +
"gl_PointSize=1.0;\n" +
"uvVar=uv;\n" +
"colorAttrVar=colorAttr;\n" +
"gl_Position=positionVec4;\n" +
"}\n";
};
/**
* Gets the text of the default vertex shader.  Putting "#define SHADING\n"
* at the start of the return value enables the lighting model.
* @return {string} The resulting shader text.
*/
ShaderProgram.getDefaultVertex=function(){
"use strict";
var shader=[
"attribute vec3 position;",
"attribute vec3 normal;",
"attribute vec2 uv;",
"attribute vec3 colorAttr;",
"attribute vec3 tangent;",
"attribute vec3 bitangent;",
"uniform mat4 projView;",
"uniform mat4 world;",
"varying vec2 uvVar;",
"varying vec3 colorAttrVar;",
"#ifdef SHADING",
"uniform mat3 worldViewInvTrans3; /* internal */",
"varying vec4 worldPositionVar;",
"#ifdef NORMAL_MAP",
"varying mat3 tbnMatrixVar;",
"#endif",
"varying vec3 transformedNormalVar;",
"#endif",
"void main(){",
"vec4 positionVec4;",
"positionVec4.w=1.0;",
"positionVec4.xyz=position;",
"gl_PointSize=1.0;",
"gl_Position=(projView*world)*positionVec4;",
"colorAttrVar=colorAttr;",
"uvVar=uv;",
"#ifdef SHADING",
"transformedNormalVar=normalize(worldViewInvTrans3*normal);",
"#ifdef NORMAL_MAP",
"tbnMatrixVar=mat3(normalize(vec3(world*vec4(tangent,0.0))),",
"   normalize(bitangent),transformedNormalVar);",
"#endif",
"worldPositionVar=world*positionVec4;",
"#endif",
"}"].join("\n");
return shader;
};

/**
* Gets the text of the default fragment shader.  Putting "#define SHADING\n"
* at the start of the return value enables the lighting model.
* Putting "#define SPECULAR\n"
* at the start of the return value enables specular highlights (as long
* as SHADING is also enabled).
* @return {string} The resulting shader text.
*/
ShaderProgram.getDefaultFragment=function(){
"use strict";
var i;
var shader=ShaderProgram.fragmentShaderHeader() +
 // if shading is disabled, this is solid color instead of material diffuse
 "uniform vec4 md;\n" +
"#ifdef SHADING\n" +
"struct light {\n" +
// NOTE: These struct members must be aligned to
// vec4 size; otherwise, Chrome may have issues retaining
// the value of lights[i].specular, causing flickering
" vec4 position; /* source light direction */\n" +
" vec4 diffuse; /* source light diffuse color */\n" +
"#ifdef SPECULAR\n" +
" vec4 specular; /* source light specular color */\n" +
"#endif\n" +
"};\n" +
"const int MAX_LIGHTS = "+Lights.MAX_LIGHTS+"; /* internal */\n" +
"uniform vec3 sceneAmbient;\n" +
"uniform light lights[MAX_LIGHTS];\n" +
"uniform vec3 ma;\n" +
"uniform vec3 me;\n" +
"#ifdef SPECULAR\n" +
"uniform vec3 ms;\n" +
"uniform float mshin;\n" +
"uniform vec4 viewInvW;\n" +
"#ifdef SPECULAR_MAP\n" +
"uniform sampler2D specularMap;\n" +
"#endif\n" +
"#ifdef NORMAL_MAP\n" +
"uniform sampler2D normalMap;\n" +
"#endif\n" +
"#endif\n" +
"#endif\n" +
"uniform sampler2D sampler;\n" +
"uniform vec2 textureSize;\n" + // texture size (all zeros if textures not used)
"uniform float useColorAttr;\n" + // use color attribute if 1
"varying vec2 uvVar;\n"+
"varying vec3 colorAttrVar;\n" +
"#ifdef SHADING\n" +
"varying vec4 worldPositionVar;\n" +
"varying vec3 transformedNormalVar;\n"+
"#ifdef NORMAL_MAP\n"+
"varying mat3 tbnMatrixVar;\n" +
"#endif\n"+
"vec4 calcLightPower(light lt, vec4 vertexPosition){\n" +
" vec3 sdir;\n" +
" float attenuation;\n" +
" if(lt.position.w ="+"= 0.0){ /* directional light */\n" +
"  sdir=normalize((lt.position).xyz);\n" +
"  attenuation=1.0;\n" +
" } else { /* point light */\n" +
"  vec3 vertexToLight=(lt.position-vertexPosition).xyz;\n" +
"  float dist=length(vertexToLight);\n" +
"  if(dist ="+"= 0.0){\n" +
"   sdir=vertexToLight;\n" +
"   attenuation=1.0;\n" +
"  } else {\n" +
"   sdir=vertexToLight/dist; /* normalizes vertexToLight */\n" +
"   attenuation=(1.0/dist);\n" +
"  }\n" +
" }\n" +
" return vec4(sdir,attenuation);\n" +
"}\n" +
"#endif\n" +
"void main(){\n" +
" vec4 tmp;\n"+
" vec3 normal;\n"+
" float useTexture=sign(textureSize.x+textureSize.y);\n"+
" tmp.w=1.0;\n"+
" tmp.xyz=colorAttrVar;\n"+
" vec4 baseColor=mix(mix(\n"+
"   md, /*when textures are not used*/\n" +
"   texture2D(sampler,uvVar), /*when textures are used*/\n"+
"   useTexture), tmp, useColorAttr);\n"+
"#ifdef SHADING\n" +
"#ifdef NORMAL_MAP\n" +
"normal = normalize(tbnMatrixVar*(2.0*texture2D(normalMap,uvVar).rgb - vec3(1.0)));\n" +
"#else\n" +
"normal = transformedNormalVar;\n" +
"#endif\n" +
"#define ADD_DIFFUSE(i) "+
" lightedColor+=vec3(lights[i].diffuse)*max(lightCosines[i],0.0)*lightPower[i].w*materialDiffuse;\n" +
"vec4 lightPower["+Lights.MAX_LIGHTS+"];\n" +
"float lightCosines["+Lights.MAX_LIGHTS+"];\n";
shader+=""+
"if(baseColor.a ="+"= 0.0)discard;\n" +
"vec3 materialAmbient=ma; /* ambient*/\n" +
"vec3 lightedColor=sceneAmbient*materialAmbient; /* ambient*/\n" +
" // diffuse\n"+
" vec3 materialDiffuse=baseColor.rgb;\n";
for(i=0;i<Lights.MAX_LIGHTS;i++){
 shader+="lightPower["+i+"]=calcLightPower(lights["+i+"],worldPositionVar);\n";
 shader+="lightCosines["+i+"]=dot(normal,lightPower["+i+"].xyz);\n";
}
for(i=0;i<Lights.MAX_LIGHTS;i++){
 shader+="ADD_DIFFUSE("+i+");\n";
}
shader+="#ifdef SPECULAR\n" +
"bool spectmp;\n" +
"vec3 materialSpecular=ms;\n" +
"#ifdef SPECULAR_MAP\n" +
"materialSpecular*=texture2D(specularMap,uvVar).rgb;\n"+
"#endif\n" +
"// specular reflection\n" +
"if(materialSpecular.x!=0. || materialSpecular.y!=0. || materialSpecular.z!=0.){\n" +
"vec3 viewDirection=normalize((viewInvW-worldPositionVar).xyz);\n" +
"float specular=0.0;\n";
for(i=0;i<Lights.MAX_LIGHTS;i++){
shader+="  spectmp = lightCosines["+i+"] >= 0.0;\n" +
"  if (spectmp) {\n" +
"  vec3 lightSpecular=vec3(lights["+i+"].specular);\n"+
"    specular=dot (-lightPower["+i+"].xyz - (2.0 * dot (normal, -lightPower["+i+"].xyz)*\n"+
" transformedNormalVar), viewDirection);\n" +
"    specular=max(specular,0.0);\n" +
"    specular=pow(specular,mshin);\n"+
"    lightedColor+=materialSpecular*specular*lightPower["+i+"].w*lightSpecular;\n" +
"  }\n";
}
shader+="}\n";
shader+="#endif\n";
shader+=" // emission\n"+
" lightedColor+=me;\n" +
" baseColor=vec4(lightedColor,baseColor.a);\n" +
"#endif\n" +
" gl_FragColor=baseColor;\n" +
"}";
return shader;
};
