/*
Written by Peter O. in 2015.

Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/
If you like this, you should donate to Peter O.
at: http://upokecenter.dreamhosters.com/articles/donate-now-2/
*/
/** @class OBJ file. */
function ObjData(){
  /** URL of the OBJ file */
  this.url=null;
  /** An array of meshes.  Two or more meshes may have
the same name (the "name" property in each mesh).  The "data"
property holds data for each mesh. */
  this.mtllib=null;
  this.mtl=null;
  this.meshes=[];
}
function MtlData(){
  this.url=null;
  this.list=[];
}
/**
 * Not documented yet.
 */
ObjData.prototype.toShape=function(){
 var multi=[];
 for(var i=0;i<this.meshes.length;i++){
  var shape=new Shape(this.meshes[i].data);
  var mat=this._getMaterial(this.meshes[i]);
  shape.setMaterial(mat);
  multi.push(shape);
 }
 return multi;
}
/**
 * Not documented yet.
 * @param {*} name
 */
ObjData.prototype.toShapeFromName=function(name){
 var multi=[];
 for(var i=0;i<this.meshes.length;i++){
  if(this.meshes[i].name!=name)continue;
  var shape=new Shape(this.meshes[i].data);
  var mat=this._getMaterial(this.meshes[i]);
  shape.setMaterial(mat);
  multi.push(shape);
 }
 return multi;
}
ObjData._resolvePath=function(path, name){
 // Relatively dumb for a relative path
 // resolver, but sufficient here, as it will
 // only be used with relative "mtllib"/"map_Kd"
 // strings
 var ret=path;
 var lastSlash=ret.lastIndexOf("/")
 if(lastSlash>=0){
  ret=ret.substr(0,lastSlash+1)+name.replace(/\\/g,"/");
 } else {
  ret=name.replace(/\\/g,"/");
 }
 return ret;
}

/** @private */
ObjData.prototype._getMaterial=function(mesh){
 if(!this.mtl || !mesh){
  return new Material();
 } else {
  if(mesh.usemtl){
   var mtl=this.mtl.getMaterial(mesh.usemtl);
   if(!mtl)return new Material();
   return mtl;
  } else {
   return new Material();
  }
 }
}

/** @private */
MtlData.prototype._resolveTextures=function(){
  for(var i=0;i<this.list.length;i++){
    var mtl=this.list[i].data;
    if(mtl.textureName){
     var resolvedName=ObjData._resolvePath(
       this.url,mtl.textureName);
     //console.log(resolvedName)
     this.list[i].data=new Texture(resolvedName)
       .setParams(mtl);
    }
  }
}
/**
 * Not documented yet.
 * @param {*} name
 */
MtlData.prototype.getMaterial=function(name){
  for(var i=0;i<this.list.length;i++){
    if(this.list[i].name==name){
      return this.list[i].data
    }
  }
  return null;
}
MtlData._getMaterial=function(mtl){
 function xyzToRgb(xyz){
  // convert CIE XYZ to RGB
  var x=xyz[0];
  var y=xyz[1];
  var z=xyz[2];
  var rgb=[2.2878384873407613*x-0.8333676778352163*y-0.4544707958714208*z,
    -0.5116513807438615*x+1.4227583763217775*y+0.08889300175529392*z,
    0.005720409831409596*x-0.01590684851040362*y+1.0101864083734013*z]
  // ensure RGB value fits in 0..1
  var w=-Math.min(0,rgb[0],rgb[1],rgb[2]);
  if(w>0){
    rgb[0]+=w; rgb[1]+=w; rgb[2]+=w;
  }
  w=Math.max(rgb[0],rgb[1],rgb[2]);
  if(w>1){
    rgb[0]/=w; rgb[1]/=w; rgb[2]/=w;
  }
  return rgb;
 }
 var shininess=1.0;
 var ambient=null;
 var diffuse=null;
 var specular=null;
 var emission=null;
 var textureName=null;
 if(mtl.hasOwnProperty("Ns")){
  shininess=mtl["Ns"];
 }
 if(mtl.hasOwnProperty("Kd")){
  diffuse=xyzToRgb(mtl["Kd"]);
 }
 if(mtl.hasOwnProperty("map_Kd")){
  textureName=mtl["map_Kd"];
 }
 if(mtl.hasOwnProperty("Ka")){
  ambient=xyzToRgb(mtl["Ka"]);
 }
 if(mtl.hasOwnProperty("Ke")){
  var ke=mtl["Ke"];
  emission=[ke,ke,ke];
 }
 if(mtl.hasOwnProperty("Ks")){
  specular=xyzToRgb(mtl["Ks"]);
 }
 var ret=new Material(ambient,diffuse,specular,shininess,
   emission);
 if(textureName){
  ret=new TexturedMaterial(textureName).setParams({
   "ambient":ambient,
   "diffuse":diffuse,
   "specular":specular,
   "shininess":shininess,
   "emission":emission
  })
 }
 return ret;
}
ObjData.loadMtlFromUrl=function(url){
 return GLUtil.loadFileFromUrl(url).then(
   function(e){
     var mtl=MtlData._loadMtl(e.data);
     if(mtl.error)return Promise.reject({url:e.url, "error": mtl.error});
     var mtldata=mtl.success;
     mtldata.url=e.url;
     mtldata._resolveTextures();
     return Promise.resolve(mtldata);
   },
   function(e){
     return Promise.reject(e)
   });
}
/**
Loads a WaveFront OBJ file (along with its associated MTL, or
material file, if available) asynchronously.
@param {string} url The URL to load.
@return {Promise} A promise that:
- Resolves when:
The OBJ file is loaded successfully, whether or not its associated
MTL is also loaded successfully.  The result is an ObjData object.
- Is rejected when:
An error occurs when loading the OBJ file.
*/
ObjData.loadObjFromUrl=function(url){
 return GLUtil.loadFileFromUrl(url).then(
   function(e){
     var obj;
     obj=ObjData._loadObj(e.data);
     if(obj.error)return Promise.reject({url:e.url, "error":obj.error});
     obj=obj.success;
     obj.url=e.url;
     if(obj.mtllib){
       // load the material file if available
       var mtlURL=ObjData._resolvePath(e.url,obj.mtllib);
       return ObjData.loadMtlFromUrl(mtlURL).then(
        function(result){
          obj.mtl=result;
          return Promise.resolve(obj);
        }, function(result){
          // MTL not loaded successfully, ignore
          obj.mtl=null;
          return Promise.resolve(obj);
        });
     } else {
       // otherwise just return the object
       return Promise.resolve(obj);
     }
     return {url: e.url, "obj": obj};
   },
   function(e){
     return Promise.reject(e)
   });
}
MtlData._loadMtl=function(str){
 var number="(-?(?:\\d+\\.?\\d*|\\d*\\.\\d+)(?:[Ee][\\+\\-]?\\d+)?)"
 var nonnegInteger="(\\d+)"
 var oneNumLine=new RegExp("^(Ns|d|Tr|Ni|Ke)\\s+"+number+"\\s*$")
 var oneIntLine=new RegExp("^(illum)\\s+"+nonnegInteger+"\\s*$")
 var threeNumLine=new RegExp("^(Tf)\\s+"+number+"\\s+"+number
   +"\\s+"+number+"\\s*$")
 var threeOrFourNumLine=new RegExp("^(Kd|Ka|Ks)\\s+"+number+"\\s+"+number
   +"\\s+"+number+"(?:\\s+"+number+")?\\s*$")
 var mapLine=new RegExp("^(map_Kd|map_bump|map_Ka|map_Ks)\\s+(.*?)\\s*$")
 var newmtlLine=new RegExp("^newmtl\\s+([^\\s]+)$")
 var faceStart=new RegExp("^f\\s+")
 var lines=str.split(/\r?\n/)
 var firstLine=true;
 var materials=[];
 var currentMat=null;
 for(var i=0;i<lines.length;i++){
  var line=lines[i];
  // skip empty lines
  if(line.length==0)continue;
  // skip comments
  if(line.charAt(0)=="#")continue;
  while(line.charAt(line.length-1)=="\\" &&
    i+1<line.length){
    // The line continues on the next line
   line=line.substr(0,line.length-1);
   line+=" "+lines[i+1];
   i++;
  }
  if(line.charAt(line.length-1)=="\\"){
   line=line.substr(0,line.length-1);
  }
  if(firstLine && !(/^newmtl\s+/)){
   return {"error": "newmtl not the first line in MTL file"};
  }
  firstLine=false;
  var e=newmtlLine.exec(line)
  if(e){
    var name=e[1];
    currentMat={};
    materials.push({name:name, data: currentMat});
    continue;
  }
  e=threeOrFourNumLine.exec(line)
  if(e){
    if(e[5]){
      currentMat[e[1]]=[parseFloat(e[2]),parseFloat(e[3]),parseFloat(e[4]),parseFloat(e[5])];
    } else {
      currentMat[e[1]]=[parseFloat(e[2]),parseFloat(e[3]),parseFloat(e[4])];
    }
    continue;
  }
  e=threeNumLine.exec(line)
  if(e){
    currentMat[e[1]]=[parseFloat(e[2]),parseFloat(e[3]),parseFloat(e[4])];
    continue;
  }
  e=oneNumLine.exec(line)
  if(e){
    currentMat[e[1]]=parseFloat(e[2]);
    continue;
  }
  e=mapLine.exec(line)
  if(e){
     // only allow relative paths
    if((/^(?![\/\\])([^\:\?\#\s]+)$/).test(e[2])){
     currentMat[e[1]]=e[2];
    }
    continue;
  }
  e=oneIntLine.exec(line)
  if(e){
    currentMat[e[1]]=[parseInt(e[2],10)];
    continue;
  }
  return {"error": new Error("unsupported line: "+line)}
 }
 var mtl=new MtlData();
 mtl.list=materials;
 for(var i=0;i<mtl.list.length;i++){
  mtl.list[i].data=MtlData._getMaterial(mtl.list[i].data)
 }
 return {success: mtl};
}
ObjData._loadObj=function(str){
 function pushVertex(verts,faces,look,
   v1,v2,v3,n1,n2,n3,u1,u2){
   var lookBack=faces.length-Math.min(20,faces.length);
   lookBack=Math.max(lookBack,look);
   // check if a recently added vertex already has the given
   // values
   for(var i=faces.length-1;i>=lookBack;i--){
    var vi=faces[i]*8;
    if(verts[vi]==v1 && verts[vi+1]==v2 && verts[vi+2]==v3 &&
        verts[vi+3]==n1 && verts[vi+4]==n2 && verts[vi+5]==n3 &&
        verts[vi+6]==u1 && verts[vi+7]==u2){
     // found it
     faces.push(faces[i]);
     return;
    }
   }
   var ret=verts.length/8;
   verts.push(v1,v2,v3,n1,n2,n3,u1,u2);
   faces.push(ret);
 }
 var number="(-?(?:\\d+\\.?\\d*|\\d*\\.\\d+)(?:[Ee][\\+\\-]?\\d+)?)"
 var nonnegInteger="(\\d+)"
 var vertexOnly=new RegExp("^"+nonnegInteger+"($|\\s+)")
 var vertexNormalOnly=new RegExp("^"+nonnegInteger+"\\/\\/"+nonnegInteger+"($|\\s+)")
 var vertexUVOnly=new RegExp("^"+nonnegInteger+"\\/"+
   nonnegInteger+"($|\\s+)")
 var vertexUVNormal=new RegExp("^"+nonnegInteger+"\\/"+nonnegInteger+
   "\\/"+nonnegInteger+"($|\\s+)")
 var vertexLine=new RegExp("^v\\s+"+number+"\\s+"+number+"\\s+"+number+"\\s*$")
 var uvLine=new RegExp("^vt\\s+"+number+"\\s+"+number+"(\\s+"+number+")?\\s*$")
 var smoothLine=new RegExp("^(s)\\s+(.*)$")
 var usemtlLine=new RegExp("^(usemtl|o|g)\\s+([^\\s]+)\\s*$")
 var mtllibLine=new RegExp("^(mtllib)\\s+(?![\\/\\\\])([^\\:\\?\\#\\s]+)\\s*$")
 var normalLine=new RegExp("^vn\\s+"+number+"\\s+"+number+"\\s+"+number+"\\s*")
 var faceStart=new RegExp("^f\\s+")
 var lines=str.split(/\r?\n/)
 var vertices=[];
 var resolvedVertices=[];
 var normals=[];
 var uvs=[];
 var faces=[];
 var meshName=name;
 var usemtl=null;
 var currentFaces=[];
 var ret=new ObjData();
 var haveNormals=false;
 var lookBack=0;
 var vertexKind=-1;
 var mesh=null;
 var objName="";
 var oldObjName="";
 var seenFacesAfterObjName=false;
 var flat=false;
 var haveCalcedNormals=false;
 for(var i=0;i<lines.length;i++){
  var line=lines[i];
  // skip empty lines
  if(line.length==0)continue;
  // skip comments
  if(line.charAt(0)=="#")continue;
  while(line.charAt(line.length-1)=="\\" &&
    i+1<line.length){
    // The line continues on the next line
   line=line.substr(0,line.length-1);
   line+=" "+lines[i+1];
   i++;
  }
  if(line.charAt(line.length-1)=="\\"){
   line=line.substr(0,line.length-1);
  }
  var e=vertexLine.exec(line)
  if(e){
    vertices.push([parseFloat(e[1]),parseFloat(e[2]),parseFloat(e[3])]);
    continue;
  }
  e=normalLine.exec(line)
  if(e){
    normals.push([parseFloat(e[1]),parseFloat(e[2]),parseFloat(e[3])]);
    continue;
  }
  e=uvLine.exec(line)
  if(e){
    uvs.push([parseFloat(e[1]),parseFloat(e[2])]);
    continue;
  }
  e=faceStart.exec(line)
  if(e){
    var oldline=line;
    seenFacesAfterObjName=true;
    line=line.substr(e[0].length);
    var faceCount=0;
    var firstFace=faces.length;
    currentFaces=[];
    while(line.length>0){
     e=vertexOnly.exec(line)
     if(e){
      if(vertexKind!=0){
       vertexKind=0;
       lookBack=faces.length;
      }
      var vtx=parseInt(e[1],10)-1;
      pushVertex(resolvedVertices, faces, lookBack,
        vertices[vtx][0],vertices[vtx][1],vertices[vtx][2],0,0,0,0,0);
      currentFaces[faceCount]=faces[faces.length-1];
      line=line.substr(e[0].length);
      faceCount++;
      continue;
     }
     e=vertexNormalOnly.exec(line)
     if(e){
      if(vertexKind!=1){
       vertexKind=1;
       lookBack=faces.length;
      }
      var vtx=parseInt(e[1],10)-1;
      var norm=parseInt(e[2],10)-1;
      haveNormals=true;
      pushVertex(resolvedVertices, faces, lookBack,
        vertices[vtx][0],vertices[vtx][1],vertices[vtx][2],
        normals[norm][0],normals[norm][1],normals[norm][2],0,0);
      currentFaces[faceCount]=faces[faces.length-1];
      line=line.substr(e[0].length);
     faceCount++;
      continue;
     }
     e=vertexUVOnly.exec(line)
     if(e){
      if(vertexKind!=2){
       vertexKind=2;
       lookBack=faces.length;
      }
      var vtx=parseInt(e[1],10)-1;
      var uv=parseInt(e[2],10)-1;
      pushVertex(resolvedVertices, faces, lookBack,
        vertices[vtx][0],vertices[vtx][1],vertices[vtx][2],
        0,0,0,uvs[uv][0],uvs[uv][1]);
      currentFaces[faceCount]=faces[faces.length-1];
      line=line.substr(e[0].length);
      faceCount++;
      continue;
     }
     e=vertexUVNormal.exec(line)
     if(e){
      if(vertexKind!=3){
       vertexKind=3;
       lookBack=faces.length;
      }
      var vtx=parseInt(e[1],10)-1;
      var uv=parseInt(e[2],10)-1;
      var norm=parseInt(e[3],10)-1;
      haveNormals=true;
      pushVertex(resolvedVertices, faces, lookBack,
        vertices[vtx][0],vertices[vtx][1],vertices[vtx][2],
        normals[norm][0],normals[norm][1],normals[norm][2],
        uvs[uv][0],uvs[uv][1]);
      currentFaces[faceCount]=faces[faces.length-1];
      line=line.substr(e[0].length);
      faceCount++;
      continue;
     }
     return {"error": new Error("unsupported face: "+oldline)}
    }
    if(faceCount>=4){
      // Add an additional triangle for each vertex after
      // the third
      var m=firstFace+3;
      for(var k=3;k<faceCount;k++,m+=3){
       faces[m]=currentFaces[0];
       faces[m+1]=currentFaces[k-1];
       faces[m+2]=currentFaces[k];
      }
    } else if(faceCount<3){
     return {"error": "face has fewer than 3 vertices"}
    }
    continue;
  }
  e=usemtlLine.exec(line)
  if(e){
    if(e[1]=="usemtl"){
      // Changes the material used
      if(resolvedVertices.length>0){
        mesh=new Mesh(resolvedVertices,faces,
          Mesh.NORMALS_BIT|Mesh.TEXCOORDS_BIT);
        if(!haveNormals){
         // No normals in this mesh, so calculate them
         mesh.recalcNormals(flat);
        }
        ret.meshes.push({
          name: seenFacesAfterObjName ? objName : oldObjName,
          usemtl: usemtl, data: mesh});
        lookBack=0;
        vertexKind=0;
        resolvedVertices=[];
        faces=[];
        haveNormals=false;
      }
      usemtl=e[2];
    } else if(e[1]=="g"){
      // Starts a new group
      if(resolvedVertices.length>0){
        mesh=new Mesh(resolvedVertices,faces,
          Mesh.NORMALS_BIT|Mesh.TEXCOORDS_BIT);
        if(!haveNormals){
         // No normals in this mesh, so calculate them
         mesh.recalcNormals(flat);
        }
        ret.meshes.push({
          name: seenFacesAfterObjName ? objName : oldObjName,
          usemtl: usemtl, data: mesh});
        lookBack=0;
        vertexKind=0;
        resolvedVertices=[];
        faces=[];
        usemtl=null;
        haveNormals=false;
      }
      meshName=e[2];
    } else if(e[1]=="o"){
      oldObjName=objName;
      objName=e[2];
      seenFacesAfterObjName=false;
    }
    continue;
  }
  e=mtllibLine.exec(line)
  if(e){
    if(e[1]=="mtllib"){
      ret.mtllib=e[2];
    }
    continue;
  }
  e=smoothLine.exec(line)
  if(e){
    flat=(e[2]=="off");
    continue;
  }
  return {"error": new Error("unsupported line: "+line)}
 }
 mesh=new Mesh(resolvedVertices,faces,
          Mesh.NORMALS_BIT|Mesh.TEXCOORDS_BIT);
 if(!haveNormals){
   // No normals in this mesh, so calculate them
   mesh.recalcNormals(flat);
 }
 ret.meshes.push({
          name: seenFacesAfterObjName ? objName : oldObjName,
          usemtl: usemtl, data: mesh});
 return {success: ret};
}
