/*
Written by Peter O. in 2015.

Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/
If you like this, you should donate to Peter O.
at: http://upokecenter.dreamhosters.com/articles/donate-now-2/
*/

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
* @param {String|undefined} vertexShader Source text of a vertex shader, in OpenGL
* ES Shading Language (GLSL).  If null, a default
* vertex shader is used instead.
* @param {String|undefined} fragmentShader Source text of a fragment shader in GLSL.
* If null, a default fragment shader is used instead.
*/
var ShaderProgram=function(context, vertexShader, fragmentShader){
 context= (context.getContext) ? context.getContext() : context;
 if(vertexShader==null){
  vertexShader=ShaderProgram.getDefaultVertex();
 }
 if(fragmentShader==null){
  fragmentShader=ShaderProgram.getDefaultFragment();
 }
 this.program=ShaderProgram._compileShaders(context,vertexShader,fragmentShader);
 this.attributes={};
 this.context=context;
 this.actives={};
 this.uniformValues={};
 this.uniformTypes={};
 this.savedUniforms={};
 if(this.program!=null){
  this.attributes=[];
  var name=null;
  var ret={}
  var count= context.getProgramParameter(this.program, context.ACTIVE_ATTRIBUTES);
  for (var i = 0; i < count; ++i) {
   var attributeInfo=context.getActiveAttrib(this.program, i);
   if(attributeInfo!==null){
    name=attributeInfo.name;
    var attr=context.getAttribLocation(this.program, name);
    if(attr>=0){
     this.attributes.push(attr);
     ret[name]=attr;
    }
   }
  }
  count = context.getProgramParameter(this.program, context.ACTIVE_UNIFORMS);
  for (var i = 0; i < count; ++i) {
   var uniformInfo=context.getActiveUniform(this.program, i);
   if(uniformInfo!==null){
    name = uniformInfo.name;
    ret[name] = context.getUniformLocation(this.program, name);
    this.uniformTypes[name] = uniformInfo.type;
   }
  }
  this.actives=ret;
 }
}
/** Disposes resources from this shader program.
*/
ShaderProgram.prototype.dispose=function(){
 if(this.program){
  this.context.deleteProgram(this.program);
 }
 this.context=null;
 this.program=null;
 this.actives={};
 this.attributes={};
 this.uniformTypes={};
}
/** Gets the WebGL context associated with this shader program.
* @return {WebGLRenderingContext}
*/
ShaderProgram.prototype.getContext=function(){
 return this.context;
}
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
 var ret=this.actives[name];
 return (ret==null) ? null : ret;
}
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
 var loc=(typeof name=="string") ? this.get(name) : name;
 // If "loc" is a number that means it's an attribute, not a uniform;
 // we expect WebGLUniformLocation
 if(loc==null || typeof loc=="number")return null;
 // using a cache since context.getUniform can be slow with
 // repeated calls
 var uv=this.uniformValues[name];
 if(uv==null){
  return this.context.getUniform(this.program,loc);
 } else {
  return (uv instanceof Array) ? uv.slice(0,uv.length) : uv;
 }
}
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
 this.context.useProgram(this.program);
 this.setUniforms(this.savedUniforms);
 this.savedUniforms={};
 return this;
}
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
* that are 4x4 matrices must be 16 elements long.  Keys to
* uniforms that don't exist in this program are ignored.  See also
* the "name" parameter of the {@link glutil.ShaderProgram#get}
* method for more information on
* uniform names.
* @return {glutil.ShaderProgram} This object.
*/
ShaderProgram.prototype.setUniforms=function(uniforms){
  var isCurrentProgram=null;
  for(var i in uniforms){
      v=uniforms[i];
      var uniform=this.get(i);
      if(uniform===null)continue;
//      console.log("setting "+i+": "+v);
      if(isCurrentProgram==null){
       isCurrentProgram=this.context.getParameter(
         this.context.CURRENT_PROGRAM)==this.program;
      }
      var val=(v instanceof Array) ? v.slice(0,v.length) : v;
      this.uniformValues[i]=val;
      if(!isCurrentProgram){
       // Save this uniform to write later
       this.savedUniforms[i]=val;
      } else if(v.length==3){
       this.context.uniform3f(uniform, v[0],v[1],v[2]);
      } else if(v.length==2){
       this.context.uniform2f(uniform, v[0],v[1]);
      } else if(v.length==4){
       this.context.uniform4f(uniform, v[0],v[1],v[2],v[3]);
      } else if(v.length==16){
       this.context.uniformMatrix4fv(uniform,false,v);
      } else if(v.length==9){
       this.context.uniformMatrix3fv(uniform,false,v);
      } else {
       if(this.uniformTypes[i]==this.context.FLOAT){
        this.context.uniform1f(uniform, v);
       } else {
        this.context.uniform1i(uniform, v);
       }
      }
  }
  return this;
}
/** @private */
ShaderProgram._compileShaders=function(context, vertexShader, fragmentShader){
  function compileShader(context, kind, text){
    var shader=context.createShader(kind);
    context.shaderSource(shader, text);
    context.compileShader(shader);
    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
      var lines=text.split("\n")
      // add line numbers
      for(var i=0;i<lines.length;i++){
       lines[i]=(i+1)+"   "+lines[i]
      }
      console.log(lines.join("\n"));
	  	console.log((kind==context.VERTEX_SHADER ? "vertex: " : "fragment: ")+
        context.getShaderInfoLog(shader));
	  	return null;
	  }
   return shader;
  }
  var vs=(!vertexShader || vertexShader.length==0) ? null :
    compileShader(context,context.VERTEX_SHADER,vertexShader);
  var fs=(!fragmentShader || fragmentShader.length==0) ? null :
    compileShader(context,context.FRAGMENT_SHADER,fragmentShader);
  var program = null;
  if(vs!==null && fs!==null){
   program = context.createProgram();
   context.attachShader(program, vs);
   context.attachShader(program, fs);
 	 context.linkProgram(program);
   if (!context.getProgramParameter(program, context.LINK_STATUS)) {
		console.log("link: "+context.getProgramInfoLog(program));
		context.deleteProgram(program);
    program=null;
	 }
  }
  if(vs!==null)context.deleteShader(vs);
  if(fs!==null)context.deleteShader(fs);
  return program;
};
/** @private */
ShaderProgram.fragmentShaderHeader=function(){
return "" +
"#ifdef GL_ES\n" +
"#ifndef GL_FRAGMENT_PRECISION_HIGH\n" +
"precision mediump float;\n" +
"#else\n" +
"precision highp float;\n" +
"#endif\n" +
"#endif\n";
}
/**
* Generates source code for a fragment shader for applying
* a raster effect to a texture.
* @param {string} functionCode See ShaderProgram.makeEffect().
* @return {string} The source text of the resulting fragment shader.
*/
ShaderProgram.makeEffectFragment=function(functionCode){
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
}
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
 return new ShaderProgram(context, null,
   ShaderProgram.makeEffectFragment(functionCode));
}
/**
* Generates a shader program that inverts the colors of a texture.
* @param {WebGLRenderingContext|object} context A WebGL context associated with the
* compiled shader program, or an object, such as Scene3D, that
* implements a no-argument <code>getContext</code> method
* that returns a WebGL context.
* @return {glutil.ShaderProgram} The resulting shader program.
*/
ShaderProgram.getInvertEffect=function(context){
return ShaderProgram.makeEffect(context,
[
"vec4 textureEffect(sampler2D sampler, vec2 uvCoord, vec2 textureSize){",
" vec4 color=texture2D(sampler,uvCoord);",
" vec4 ret; ret.xyz=vec3(1.0,1.0,1.0)-color.xyz; ret.w=color.w; return ret;",
"}"].join("\n"));
}
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
}
/**
* Gets the text of the default vertex shader.  Putting "#define SHADING\n"
* at the start of the return value enables the lighting model.
* @return {string} The resulting shader text.
*/
ShaderProgram.getDefaultVertex=function(){
var shader="" +
"attribute vec3 position;\n" +
"attribute vec3 normal;\n" +
"attribute vec2 uv;\n" +
"attribute vec3 colorAttr;\n" +
"uniform mat4 world;\n" +
"uniform mat4 view;\n" +
"uniform mat4 projection;\n"+
"varying vec2 uvVar;\n"+
"varying vec3 colorAttrVar;\n" +
"#ifdef SHADING\n"+
"uniform mat3 worldViewInvTrans3; /* internal */\n" +
"varying vec4 viewWorldPositionVar;\n" +
"varying vec3 transformedNormalVar;\n"+
"#endif\n"+
"void main(){\n" +
"vec4 positionVec4;\n"+
"positionVec4.w=1.0;\n"+
"positionVec4.xyz=position;\n" +
"gl_PointSize=1.0;\n" +
"gl_Position=((projection*view)*world)*positionVec4;\n" +
"colorAttrVar=colorAttr;\n" +
"uvVar=uv;\n" +
"#ifdef SHADING\n"+
"transformedNormalVar=normalize(worldViewInvTrans3*normal);\n" +
"viewWorldPositionVar=view*world*positionVec4;\n" +
"#endif\n"+
"}";
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
var shader=ShaderProgram.fragmentShaderHeader() +
 // if shading is disabled, this is solid color instead of material diffuse
 "uniform vec3 md;\n" + // material diffuse color (0-1 each component). Is multiplied by texture/solid color.
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
"uniform vec3 ma;\n" + // material ambient color (-1 to 1 each component).
"uniform vec3 me;\n" + // material emission color
"#ifdef SPECULAR\n" +
"uniform vec3 ms;\n" + // material specular color (0-1 each comp.).  Affects how intense highlights are.
"uniform float mshin;\n" + // material shininess
"#endif\n" +
"#endif\n" +
"uniform sampler2D sampler;\n" + // texture sampler
"uniform vec2 textureSize;\n" + // texture size (all zeros if textures not used)
"uniform float useColorAttr;\n" + // use color attribute if 1
"varying vec2 uvVar;\n"+
"varying vec3 colorAttrVar;\n" +
"#ifdef SHADING\n" +
"varying vec4 viewWorldPositionVar;\n" +
"varying vec3 transformedNormalVar;\n"+
"vec4 calcLightPower(light lt, vec4 viewWorldPosition){\n" +
" vec3 sdir;\n" +
" float attenuation;\n" +
" if(lt.position.w == 0.0){\n" +
"  sdir=normalize((lt.position).xyz);\n" +
"  attenuation=1.0;\n" +
" } else {\n" +
"  vec3 vertexToLight=(lt.position-viewWorldPosition).xyz;\n" +
"  float dist=length(vertexToLight);\n" +
"  if(dist==0.0){\n" +
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
" float useTexture=sign(textureSize.x+textureSize.y);\n"+
" tmp.w=1.0;\n"+
" tmp.xyz=colorAttrVar;\n"+
" vec4 baseColor=mix(mix(\n"+
"#ifdef SHADING\n" +
"   vec4(1.0,1.0,1.0,1.0), /*when textures are not used*/\n" +
"#else\n" +
"   vec4(md,1.0), /*when textures are not used*/\n" +
"#endif\n" +
"   texture2D(sampler,uvVar), /*when textures are used*/\n"+
"   useTexture), tmp, useColorAttr);\n"+
"#ifdef SHADING\n" +
"#define SET_LIGHTPOWER(i) "+
" lightPower[i]=calcLightPower(lights[i],viewWorldPositionVar)\n" +
"#define ADD_DIFFUSE(i) "+
" phong+=vec3(lights[i].diffuse)*max(dot(transformedNormalVar," +
"   lightPower[i].xyz),0.0)*lightPower[i].w*materialDiffuse;\n" +
"vec4 lightPower["+Lights.MAX_LIGHTS+"];\n";
for(var i=0;i<Lights.MAX_LIGHTS;i++){
 shader+="SET_LIGHTPOWER("+i+");\n";
}
shader+=""+
"vec3 materialAmbient=mix(ma,baseColor.rgb,sign(useColorAttr+useTexture)); /* ambient*/\n" +
"vec3 phong=sceneAmbient*materialAmbient; /* ambient*/\n" +
" // diffuse\n"+
" vec3 materialDiffuse=md*baseColor.rgb;\n";
for(var i=0;i<Lights.MAX_LIGHTS;i++){
 shader+="ADD_DIFFUSE("+i+");\n";
}
shader+="#ifdef SPECULAR\n" +
"// specular reflection\n" +
"vec3 viewDirection=vec3(0,0,1.);\n" +
"bool spectmp;\n" +
"float specular;\n" +
"bool nonZeroMaterialSpecular=((ms.x*ms.y*ms.z)!=0.0);\n";
for(var i=0;i<Lights.MAX_LIGHTS;i++){
shader+="  spectmp = dot(transformedNormalVar, lightPower["+i+"].xyz) >= 0.0;\n" +
"  if (spectmp && nonZeroMaterialSpecular) {\n" +
"  vec3 lightSpecular=vec3(lights["+i+"].specular);\n"+
"    specular=dot (-lightPower["+i+"].xyz - (2.0 * dot (transformedNormalVar, -lightPower["+i+"].xyz)*\n"+
" transformedNormalVar), viewDirection);\n" +
"    specular=max(specular,0.0);\n" +
"    specular=pow(specular,mshin);\n"+
"    specular=specular*lightPower["+i+"].w;\n";
shader+="    vec3 specularCompo = ms*specular*lightSpecular;\n";
shader+="    phong+=specularCompo;\n" +
"  }\n";
}
shader+="#endif\n";
shader+=" // emission\n"+
" phong+=me;\n" +
" baseColor=vec4(phong,baseColor.a);\n" +
"#endif\n" +
" gl_FragColor=baseColor;\n" +
"}";
return shader;
};
