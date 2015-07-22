/*
Written by Peter O. in 2015.

Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/
If you like this, you should donate to Peter O.
at: http://upokecenter.dreamhosters.com/articles/donate-now-2/
*/

/**
* Specifies the triangles, lines, and points that make up a geometric shape.
* Each vertex, that is, each point, each end of a line, and each corner
* of a triangle, can also specify the following attributes:
* <ul>
* <li>A color, which is a set of 3 values each ranging from 0 to 1 (the red, green,
* and blue components, respectively.)
* <li>A normal vector, which is a set of 3 values.
* Normal values are required for lighting to work properly.
* <li>A tangent vector, which is a set of 3 values.
* <li>A bitangent vector, which is a set of 3 values.
* <li>Texture coordinates, which are a set of 2 values each ranging from 0 to
* 1, where (0, 0) is the lower right corner of the texture (by default), and (1, 1) is the upper
* right corner (by default).
* </ul>
* For bump mapping to work properly, a mesh needs to define
* normals, tangents, bitangents, and texture coordinates.<p>
* See the "{@tutorial shapes}" and "{@tutorial meshexamples}" tutorials.
* @class
* @alias glutil.Mesh
* @param {Array<number>} [vertices] An array that contains data on each
* vertex of the mesh.
* Each vertex is made up of the same number of elements, as defined in
* format. If null or omitted, creates an initially empty mesh.
* May be null or omitted, in which case an empty vertex array is used.
* @param {Array<number>} [indices] An array of vertex indices.  Each trio of
* indices specifies a separate triangle, or each pair of indices specifies
* a line segment.
* If null or omitted, creates an initially empty mesh.
* @param {number} [format] A set of bit flags depending on the kind of data
* each vertex contains.  Each vertex contains 3 elements plus:<ul>
*  <li> 3 more elements if Mesh.NORMALS_BIT is set, plus
*  <li> 3 more elements if Mesh.COLORS_BIT is set, plus
*  <li> 2 more elements if Mesh.TEXCOORDS_BIT is set.</ul>
* If Mesh.LINES_BIT is set, each vertex index specifies a point of a line
* segment. If Mesh.POINTS_BIT is set, each vertex index specifies an
* individual point. Both bits can't be set.
* May be null or omitted, in which case "format" is set to 0.
*/
function Mesh(vertices,indices,format){
 if(vertices!=null){
  this.subMeshes=[
   new SubMesh(vertices,indices,format)
  ];
 } else {
  this.subMeshes=[];
 }
 this._elementsDefined=0;
 this.currentMode=-1;
 this.normal=[0,0,0];
 this.color=[0,0,0];
 this.tangent=[0,0,0];
 this.bitangent=[0,0,0];
 this.texCoord=[0,0];
}
/** @private */
Mesh._primitiveType=function(mode){
 if(mode==Mesh.LINES || mode==Mesh.LINE_STRIP)
  return Mesh.LINES;
 else if(mode==Mesh.POINTS)
  return Mesh.POINTS;
 else
  return Mesh.TRIANGLES;
}
/** @private */
Mesh._isCompatibleMode=function(oldMode,newMode){
 if(oldMode==newMode)return true;
 if(Mesh._primitiveType(oldMode)==Mesh._primitiveType(newMode))
   return true;
 return false;
}
/** @private */
Mesh._recalcNormalsStart=function(vertices,uniqueVertices,faces,stride,offset,flat){
  for(var i=0;i<vertices.length;i+=stride){
    vertices[i+offset]=0.0
    vertices[i+offset+1]=0.0
    vertices[i+offset+2]=0.0
    if(!flat){
     // If smooth shading is requested, find all vertices with
     // duplicate vertex positions
     var uv=[vertices[i],vertices[i+1],vertices[i+2]]
     if(uniqueVertices[uv])uniqueVertices[uv].push(i+offset);
     else uniqueVertices[uv]=[i+offset];
    }
  }
}
/** @private */
Mesh._recalcNormalsFinish=function(vertices,uniqueVertices,faces,stride,offset,flat){
 var len;
 var dupverts=[]
 var dupvertcount=0
   if(!flat){
   // If smooth shading is requested, make sure
   // that every vertex with the same position has the
   // same normal
   for(var key in uniqueVertices){
    var v=uniqueVertices[key]
    if(v && v.constructor==Array && v.length>=2){
     var v0=v[0];
     var avgx=vertices[v0]
     var avgy=vertices[v0+1]
     var avgz=vertices[v0+2]
     dupverts[0]=avgx
     dupverts[1]=avgy
     dupverts[2]=avgz
     dupvertcount=3
     for(var i=1;i<v.length;i++){
      var dupfound=false
      var nx=vertices[v[i]]
      var ny=vertices[v[i]+1]
      var nz=vertices[v[i]+2]
      for(var j=0;j<dupvertcount;j+=3){
       if(nx==dupverts[j] && ny==dupverts[j+1] && nz==dupverts[j+2]){
        dupfound=true
        break
       }
      }
      if(!dupfound){
       dupverts[dupvertcount++]=nx
       dupverts[dupvertcount++]=ny
       dupverts[dupvertcount++]=nz
       avgx+=nx
       avgy+=ny
       avgy+=nz
      }
     }
     for(var i=0;i<v.length;i++){
      vertices[v[i]]=avgx
      vertices[v[i]+1]=avgy
      vertices[v[i]+2]=avgz
     }
    }
   }
  }
  // Normalize each normal of the vertex
  for(var i=0;i<vertices.length;i+=stride){
    var x=vertices[i+offset];
    var y=vertices[i+offset+1];
    var z=vertices[i+offset+2];
    len=Math.sqrt(x*x+y*y+z*z);
    if(len){
      len=1.0/len;
      vertices[i+offset]=x*len;
      vertices[i+offset+1]=y*len;
      vertices[i+offset+2]=z*len;
    }
  }
}

/** @private */
Mesh._recalcNormals=function(vertices,faces,stride,offset,flat,inward){
  var normDir=(inward) ? -1 : 1;
  var uniqueVertices={};
  var len;
  Mesh._recalcNormalsStart(vertices,uniqueVertices,faces,stride,offset,flat);
  for(var i=0;i<faces.length;i+=3){
    var v1=faces[i]*stride
    var v2=faces[i+1]*stride
    var v3=faces[i+2]*stride
    var n1=[vertices[v1]-vertices[v3],vertices[v1+1]-vertices[v3+1],vertices[v1+2]-vertices[v3+2]]
    var n2=[vertices[v2]-vertices[v3],vertices[v2+1]-vertices[v3+1],vertices[v2+2]-vertices[v3+2]]
    // cross multiply n1 and n2
    var x=(n1[1]*n2[2]-n1[2]*n2[1])
    var y=(n1[2]*n2[0]-n1[0]*n2[2])
    var z=(n1[0]*n2[1]-n1[1]*n2[0])
    // normalize xyz vector
    len=Math.sqrt(x*x+y*y+z*z);
    if(len!=0){
      len=1.0/len;
      len*=normDir
      x*=len;
      y*=len;
      z*=len;
      // add normalized normal to each vertex of the face
      vertices[v1+offset]+=x
      vertices[v1+offset+1]+=y
      vertices[v1+offset+2]+=z
      vertices[v2+offset]+=x
      vertices[v2+offset+1]+=y
      vertices[v2+offset+2]+=z
      vertices[v3+offset]+=x
      vertices[v3+offset+1]+=y
      vertices[v3+offset+2]+=z
    }
  }
  Mesh._recalcNormalsFinish(vertices,uniqueVertices,faces,stride,offset,flat);
}

/** @private */
Mesh._recalcNormalsLines=function(vertices,faces,stride,offset,flat,inward){
  var normDir=(inward) ? 1 : -1;
  var uniqueVertices={};
  var len;
  Mesh._recalcNormalsStart(vertices,uniqueVertices,faces,stride,offset,flat);
  for(var i=0;i<faces.length;i+=2){
    var v1=faces[i]*stride
    var v2=faces[i+1]*stride
    var n1=[vertices[v2],vertices[v2+1],vertices[v2+2]]
    var n2=[vertices[v1],vertices[v1+1],vertices[v1+2]]
    // cross multiply n1 and n2
    var x=(n1[1]*n2[2]-n1[2]*n2[1])
    var y=(n1[2]*n2[0]-n1[0]*n2[2])
    var z=(n1[0]*n2[1]-n1[1]*n2[0])
    // normalize xyz vector
    len=Math.sqrt(x*x+y*y+z*z);
    if(len!=0){
      len=1.0/len;
      len*=normDir
      x*=len;
      y*=len;
      z*=len;
      // add normalized normal to each vertex of the face
      vertices[v1+offset]+=x
      vertices[v1+offset+1]+=y
      vertices[v1+offset+2]+=z
      vertices[v2+offset]+=x
      vertices[v2+offset+1]+=y
      vertices[v2+offset+2]+=z
    }
  }
  Mesh._recalcNormalsFinish(vertices,uniqueVertices,faces,stride,offset,flat);
}

/**
 * Changes the primitive mode for this mesh.
 * Future vertices will be drawn as primitives of the new type.
 * The primitive type can be set to the same mode, in which
 * case future vertices given will not build upon previous
 * vertices.<p>
 * Note that a Mesh object can contain primitives of different
 * types, such as triangles and lines.  For example, it's allowed
 * to have a mesh with triangles, then call this method, say,
 * with <code>Mesh.LINE_STRIP</code> to add line segments
 * to that mesh.
 * @param {number} m A primitive type.  One of the following:
 * Mesh.TRIANGLES, Mesh.LINES, Mesh.LINE_STRIP, Mesh.TRIANGLE_STRIP,
 * Mesh.TRIANGLE_FAN, Mesh.QUADS, Mesh.QUAD_STRIP.
 * @return {glutil.Mesh} This object.
 */
Mesh.prototype.mode=function(m){
 if(m<0)throw new Error("invalid mode");
 if(this.currentMode==-1 ||
   !Mesh._isCompatibleMode(this.currentMode,m)){
   var format=0;
   var primtype=Mesh._primitiveType(m);
   if(primtype==Mesh.LINES)
    format|=Mesh.LINES_BIT;
   else if(primtype==Mesh.POINTS)
    format|=Mesh.POINTS_BIT;
   this.subMeshes.push(new SubMesh([],[],format));
   this.currentMode=m;
 } else {
   this.subMeshes[this.subMeshes.length-1].newPrimitive();
   this.currentMode=m;
 }
 return this;
}
/**
 * Merges the vertices from another mesh into this one.
 * The vertices from the other mesh will be copied into this one,
 * and the other mesh's indices copied or adapted.
 * Also, resets the primitive
 * mode (see {@link glutil.Mesh#mode}) so that future vertices given
 * will not build upon previous vertices.
 * @param {glutil.Mesh} other A mesh to merge into this one. The mesh
 * given in this parameter will remain unchanged.
 * @return {glutil.Mesh} This object.
 * @example
 * // Use the following idiom to make a copy of a geometric mesh:
 * var copiedMesh = new Mesh().merge(meshToCopy);
 */
Mesh.prototype.merge=function(other){
 var lastMesh=this.subMeshes[this.subMeshes.length-1]
 var prim=lastMesh ? (lastMesh.attributeBits&Mesh.PRIMITIVES_BITS) : 0;
 for(var i=0;i<other.subMeshes.length;i++){
  var sm=other.subMeshes[i];
  if(sm.indices.length==0)continue;
  if(!lastMesh ||
     (sm.attributeBits&Mesh.PRIMITIVES_BITS)!=prim ||
     (lastMesh.vertices.length+sm.vertices.length)>65535*3 ||
     lastMesh.attributeBits!=sm.attributeBits){
   // Add new submesh because its primitive type
   // differs from the last submesh or the combined
   // submesh would be too long, or the attribute bits
   // don't match between this submesh and the last
   lastMesh=new SubMesh(
    sm.vertices.slice(0,sm.vertices.length),
    sm.indices.slice(0,sm.indices.length),
    sm.attributeBits);
   this.subMeshes.push(lastMesh);
   prim=(lastMesh.attributeBits&Mesh.PRIMITIVES_BITS);
  } else {
   // Add to existing submesh
   var oldVertexLength=lastMesh.vertexCount();
   var oldIndexLength=lastMesh.indices.length;
   lastMesh.vertices.push.apply(lastMesh.vertices,sm.vertices);
   lastMesh.indices.push.apply(lastMesh.indices,sm.indices);
   for(var i=oldIndexLength;i<lastMesh.indices.length;i++){
    lastMesh.indices[i]+=oldVertexLength;
   }
  }
 }
 // Reset the primitive
 lastMesh.newPrimitive();
 return this;
}

 /**
  * Sets the current normal for this mesh.  Future vertex positions
  * defined (with vertex3()) will have this normal.  The new current
  * normal will apply to future vertices even if the current mode
  * is TRIANGLE_FAN and some vertices were already given for
  * that mode.  The normal passed to this method will
  * not automatically be normalized to unit length.
  * @param {number} x X-coordinate of the normal.
   *   If "y" and "z" are null or omitted, this is instead
 *  a 3-element array giving the X, Y, and Z coordinates, or a single number
 * giving the coordinate for all three dimensions.
  * @param {number} y Y-coordinate of the normal.
 * If "x" is an array, this parameter may be omitted.
  * @param {number} z Z-coordinate of the normal.
 * If "x" is an array, this parameter may be omitted.
  * @return {glutil.Mesh} This object.
  */
Mesh.prototype.normal3=function(x,y,z){
  if(typeof x=="number" && typeof y=="number" && typeof z=="number"){
   this.normal[0]=x;
   this.normal[1]=y;
   this.normal[2]=z;
  } else {
  this.normal[0]=x[0];
  this.normal[1]=x[1];
  this.normal[2]=x[2];
  }
  this._elementsDefined|=Mesh.NORMALS_BIT;
  return this;
}

/**
  * Sets the current tangent vector for this mesh.  Future vertex positions
  * defined (with vertex3()) will have this normal.  The new current
  * tangent will apply to future vertices even if the current mode
  * is TRIANGLE_FAN and some vertices were already given for
  * that mode.  The tangent passed to this method will
  * not automatically be normalized to unit length.
  * @param {number} x X-coordinate of the tangent vector.
   *   If "y" and "z" are null or omitted, this is instead
 *  a 3-element array giving the X, Y, and Z coordinates, or a single number
 * giving the coordinate for all three dimensions.
  * @param {number} y Y-coordinate of the tangent vector.
 * If "x" is an array, this parameter may be omitted.
  * @param {number} z Z-coordinate of the tangent vector.
 * If "x" is an array, this parameter may be omitted.
  * @return {glutil.Mesh} This object.
  */
Mesh.prototype.tangent3=function(x,y,z){
  if(typeof x=="number" && typeof y=="number" && typeof z=="number"){
   this.tangent[0]=x;
   this.tangent[1]=y;
   this.tangent[2]=z;
  } else {
  this.tangent[0]=x[0];
  this.tangent[1]=x[1];
  this.tangent[2]=x[2];
  }
  this._elementsDefined|=Mesh.TANGENTS_BIT;
  return this;
}

/**
  * Sets the current bitangent vector for this mesh.  Future vertex positions
  * defined (with vertex3()) will have this bitangent.  The new current
  * bitangent will apply to future vertices even if the current mode
  * is TRIANGLE_FAN and some vertices were already given for
  * that mode.  The bitangent passed to this method will
  * not automatically be normalized to unit length.
  * @param {number} x X-coordinate of the bitangent vector.
   *   If "y" and "z" are null or omitted, this is instead
 *  a 3-element array giving the X, Y, and Z coordinates, or a single number
 * giving the coordinate for all three dimensions.
  * @param {number} y Y-coordinate of the bitangent vector.
 * If "x" is an array, this parameter may be omitted.
  * @param {number} z Z-coordinate of the bitangent vector.
 * If "x" is an array, this parameter may be omitted.
  * @return {glutil.Mesh} This object.
  */
Mesh.prototype.bitangent3=function(x,y,z){
  if(typeof x=="number" && typeof y=="number" && typeof z=="number"){
   this.bitangent[0]=x;
   this.bitangent[1]=y;
   this.bitangent[2]=z;
  } else {
  this.bitangent[0]=x[0];
  this.bitangent[1]=x[1];
  this.bitangent[2]=x[2];
  }
  this._elementsDefined|=Mesh.BITANGENTS_BIT;
  return this;
}
 /**
  * Transforms the positions and normals of all the vertices currently
  * in this mesh, using a 4x4 matrix.  The matrix won't affect
  * vertices added afterwards.  Future vertices should not be
  * added after calling this method without calling mode() first.
  * @param {Array<number>} matrix A 4x4 matrix describing
  * the transformation.
  * @return {glutil.Mesh} This object.
  */
 Mesh.prototype.transform=function(matrix){
  for(var i=0;i<this.subMeshes.length;i++){
   this.subMeshes[i].transform(matrix);
  }
  return this;
 }
 /**
  * Sets the current color for this mesh.  Future vertex positions
  * defined (with vertex3()) will have this color. The new current
  * color will apply to future vertices even if the current mode
  * is TRIANGLE_FAN and some vertices were already given for
  * that mode.  Only the red, green, and blue components will be used.
  * @param {Array<number>|number|string} r Array of three or
  * four color components; or the red color component (0-1); or a string
  * specifying an [HTML or CSS color]{@link glutil.GLUtil.toGLColor}.
  * @param {number} g Green color component (0-1).
  * May be null or omitted if a string or array is given as the "r" parameter.
  * @param {number} b Blue color component (0-1).
  * May be null or omitted if a string or array is given as the "r" parameter.
  * @return {glutil.Mesh} This object.
  */
 Mesh.prototype.color3=function(r,g,b){
  if(typeof r=="string"){
   var c=GLUtil["toGLColor"](r);
   this.color[0]=c[0];
   this.color[1]=c[1];
   this.color[2]=c[2];
  } else if(typeof r=="number" && typeof g=="number" &&
   typeof b=="number"){
   this.color[0]=r;
   this.color[1]=g;
   this.color[2]=b;
  } else {
   this.color[0]=r[0];
   this.color[1]=r[1];
   this.color[2]=r[2];
  }
  this._elementsDefined|=Mesh.COLORS_BIT;
  return this;
 }
 /**
  * Sets the current texture coordinates for this mesh.  Future vertex positions
  * defined (with vertex3()) will have these texture coordinates.
  * The new current texture coordinates will apply to future vertices
  * even if the current mode
  * is TRIANGLE_FAN and some vertices were already given for
  * that mode.<p>
  Texture coordinates are a set of 2 values each ranging from 0 to
* 1, where (0, 0) is the lower right corner of the texture (by default), and (1, 1) is the upper
* right corner (by default).
  * @param {number} u X-coordinate of the texture, from 0-1.
   *   If "v" are null or omitted, this is instead
 *  a 3-element array giving the X and Y coordinates, or a single number
 * giving the coordinate for all three dimensions.
  * @param {number} v Y-coordinate of the texture, from 0-1.
  * If "u" is an array, this parameter can be omitted.
  * @return {glutil.Mesh} This object.
  */
 Mesh.prototype.texCoord2=function(u,v){
 if(typeof u=="number" && typeof v=="number"){
  this.texCoord[0]=u;
  this.texCoord[1]=v;
 } else {
  this.texCoord[0]=u[0];
  this.texCoord[1]=u[1];
 }
  this._elementsDefined|=Mesh.TEXCOORDS_BIT;
  return this;
 }
 /**
  * Adds a new vertex to this mesh.  If appropriate, adds an
  * additional face index according to this mesh's current mode.
  * The vertex will adopt this mesh's current normal, color,
  * and texture coordinates if they have been defined.
 * @param {Array<number>|number} x The X-coordinate.
 *   If "y" and "z" are null or omitted, this is instead
 *  a 3-element array giving the X, Y, and Z coordinates, or a single number
 * giving the coordinate for all three dimensions.
 * @param {number} y The Y-coordinate.
 * If "x" is an array, this parameter may be omitted.
 * @param {number} z The Z-coordinate.
 * If "x" is an array, this parameter may be omitted.
  * @return {glutil.Mesh} This object.
  */
 Mesh.prototype.vertex3=function(x,y,z){
  if(this.subMeshes.length==0){
   this.subMeshes.push(new SubMesh());
  }
  var lastSubmesh=this.subMeshes[this.subMeshes.length-1];
  if(x!=null && y==null && z==null){
   if(typeof x!="number")
    lastSubmesh.vertex3(x[0],x[1],x[2],this);
   else
    lastSubmesh.vertex3(x,x,x,this);
  } else {
   lastSubmesh.vertex3(x,y,z,this);
  }
  return this;
 }
 /**
  * Adds a new vertex to this mesh.  The Z-coordinate will
  * be treated as 0.
 * @param {Array<number>|number} x The X-coordinate.
 * If "y" is null or omitted, this is instead
 * a 3-element array giving the X, Y, and Z coordinates, or a single number
 * giving the coordinate for all three dimensions.
 * @param {number} y The Y-coordinate.
 * If "x" is an array, this parameter may be omitted.
  * @return {glutil.Mesh} This object.
  */
 Mesh.prototype.vertex2=function(x,y){
  if(x!=null && y==null && z==null){
   if(typeof x!="number")
    return this.vertex3(x[0],x[1],0.0);
   else
    return this.vertex3(x,x,0.0);
  } else {
   return this.vertex3(x,y,0.0);
  }
 }
 /**
  * Sets all the vertices in this mesh to the given color.
  * This method doesn't change this mesh's current color.
  * @param {number} r Red component of the color (0-1).
  * Can also be a string
  * specifying an [HTML or CSS color]{@link glutil.GLUtil.toGLColor}.
  * @param {number} g Green component of the color (0-1).
  * May be null or omitted if a string is given as the "r" parameter.
  * @param {number} b Blue component of the color (0-1).
  * May be null or omitted if a string is given as the "r" parameter.
  * @return {glutil.Mesh} This object.
  */
Mesh.prototype.setColor3=function(r,g,b){
  var rr=r;
  var gg=g;
  var bb=b;
  if(typeof r=="string"){
   var c=GLUtil["toGLColor"](r);
   rr=c[0];
   gg=c[1];
   bb=c[2];
  }
  for(var i=0;i<this.subMeshes.length;i++){
    this.subMeshes[i].setColor3(rr,gg,bb);
  }
  return this;
}
 /**
  * Recalculates the tangent vectors for triangles
  * in this mesh.  Tangent vectors are required for
  * normal mapping (bump mapping) to work.
  * This method only affects those parts of the mesh
  * that define normals and texture coordinates.
  * @return {glutil.Mesh} This object.
  */
 Mesh.prototype.recalcTangents=function(){
  for(var i=0;i<this.subMeshes.length;i++){
   if(this.subMeshes[i].primitiveType()==Mesh.TRIANGLES){
    this.subMeshes[i].recalcTangents();
   }
  }
  return this;
 }

/**
  * Recalculates the normal vectors for triangles
  * in this mesh.  For this to properly affect shading, each triangle in
  * the mesh must have its vertices defined in
  * counterclockwise order.  Each normal calculated will
  * be normalized to unit length (unless the normal is (0,0,0)).
  * @param {boolean} flat If true, each triangle in the mesh
  * will have the same normal, which usually leads to a flat
  * appearance.  If false, each unique vertex in the mesh
  * will have its own normal, which usually leads to a smooth
  * appearance.
  * @param {boolean} inward If true, the generated normals
  * will point inward; otherwise, outward.
  * @return {glutil.Mesh} This object.
  */
 Mesh.prototype.recalcNormals=function(flat,inward){
  for(var i=0;i<this.subMeshes.length;i++){
   // TODO: Eliminate normal generation for lines
   // in the next version
   if(this.subMeshes[i].primitiveType()!=Mesh.POINTS){
    this.subMeshes[i].recalcNormals(flat,inward);
   }
  }
  return this;
 }
/**
 * Modifies this mesh by normalizing the normals it defines
 * to unit length.
 * @return {glutil.Mesh} This object.
 */
Mesh.prototype.normalizeNormals=function(){
  for(var i=0;i<this.subMeshes.length;i++){
   var stride=this.subMeshes[i].getStride();
   var vertices=this.subMeshes[i].vertices;
   var normalOffset=Mesh._normalOffset(
     this.subMeshes[i].attributeBits);
   if(normalOffset<0)continue;
   for(var i=0;i<vertices.length;i+=stride){
    var x=vertices[i+normalOffset];
    var y=vertices[i+normalOffset+1];
    var z=vertices[i+normalOffset+2];
    var len=Math.sqrt(x*x+y*y+z*z);
    if(len!=0){
      len=1.0/len;
      vertices[i+normalOffset]*=len;
      vertices[i+normalOffset+1]*=len;
      vertices[i+normalOffset+2]*=len;
    }
   }
  }
  return this;
 }
/**
 * Converts this mesh to a new mesh with triangles converted
 * to line segments.  The new mesh will reuse the vertices
 * contained in this one without copying the vertices.  Parts
 * of the mesh consisting of points or line segments will remain
 * unchanged.
 * @return {glutil.Mesh} A new mesh with triangles converted
 * to lines.
 */
Mesh.prototype.toWireFrame=function(){
  var mesh=new Mesh();
  for(var i=0;i<this.subMeshes.length;i++){
   mesh.subMeshes.push(this.subMeshes[i].toWireFrame());
  }
  return mesh;
}
/**
 * Sets the X, Y, and Z coordinates of the vertex with the
 * given index.  Has no effect if the index is less than 0 or
 * equals the number of vertices in this mesh or greater.
 * @param {number} index Zero-based index of
 * the vertex to set.
  * The index ranges from 0 to less than
 * the number of vertices in the mesh, not the
 * number of vertex indices.
* @param {number|Array<number>} x X coordinate of the vertex position.
 * Can also be a 3-element array giving
 * the X, Y, and Z coordinates, respectively, of the vertex
 * position.
 * @param {number} y Y coordinate of the vertex position.
 * May be null or omitted if "x" is an array.
 * @param {number} z Z coordinate of the vertex position.
 * May be null or omitted if "x" is an array.
 * @return {glutil.Mesh} This object.
 */
Mesh.prototype.setVertex=function(index,x,y,z){
  if(index<0)return this;
  if(typeof y=="undefined" && typeof z=="undefined"){
   y=x[1];
   z=x[2];
   x=x[0];
  }
  var count=0;
  for(var i=0;i<this.subMeshes.length;i++){
   var subMesh=this.subMeshes[i];
   var c=subMesh.vertexCount();
   var newcount=count+c;
   if(index<newcount){
    var idx=index-count;
    idx*=subMesh.getStride();
    subMesh.vertices[idx]=x;
    subMesh.vertices[idx+1]=y;
    subMesh.vertices[idx+2]=z;
    break;
   }
   count=newcount;
  }
  return this;
}
/**
 * Sets the normal associated with the vertex with the
 * given index.  Has no effect if the index is less than 0 or
 * equals the number of vertices in this mesh or greater.
 * @param {number} index Zero-based index of
 * the vertex to set.
 * The index ranges from 0 to less than
 * the number of vertices in the mesh, not the
 * number of vertex indices.
 * @param {number|Array<number>} x X coordinate of the vertex normal.
 * Can also be a 3-element array giving
 * the X, Y, and Z coordinates, respectively, of the vertex
 * normal.
 * @param {number} y Y coordinate of the vertex normal.
 * May be null or omitted if "x" is an array.
 * @param {number} z Z coordinate of the vertex normal.
 * May be null or omitted if "x" is an array.
 * @return {glutil.Mesh} This object.
 */
Mesh.prototype.setVertexNormal=function(index,x,y,z){
  if(index<0)return this;
  var count=0;
  if(typeof y=="undefined" && typeof z=="undefined"){
   y=x[1];
   z=x[2];
   x=x[0];
  }
  for(var i=0;i<this.subMeshes.length;i++){
   var subMesh=this.subMeshes[i];
   var c=subMesh.vertexCount();
   var newcount=count+c;
   if(index<newcount){
    var idx=index-count;
    subMesh._rebuildVertices(Mesh.NORMALS_BIT);
    idx*=subMesh.getStride();
    idx+=Mesh._normalOffset(subMesh.attributeBits);
    subMesh.vertices[idx]=x;
    subMesh.vertices[idx+1]=y;
    subMesh.vertices[idx+2]=z;
    break;
   }
   count=newcount;
  }
  return this;
}
/**
 * Gets the position of the vertex with the given
 * index in this mesh.
 * @param {number} index Zero-based index of
 * the vertex to get.
 * The index ranges from 0 to less than
 * the number of vertices in the mesh, not the
 * number of vertex indices.
 * @return {Array<number>} A 3-element array giving
 * the X, Y, and Z coordinates, respectively, of the vertex
 * position, or null if the index is less than 0 or
 * equals the number of vertices in this mesh or greater.
 */
Mesh.prototype.getVertex=function(index){
  if(index<0)return null;
  var count=0;
  for(var i=0;i<this.subMeshes.length;i++){
   var subMesh=this.subMeshes[i];
   var c=subMesh.vertexCount();
   var newcount=count+c;
   if(index<newcount){
    var idx=index-count;
    idx*=subMesh.getStride();
    return subMesh.vertices.slice(idx,idx+3);
   }
   count=newcount;
  }
  return null;
}
/**
 * Gets the normal of the vertex with the given
 * index in this mesh.
 * @param {number} index Zero-based index of
 * the vertex normal to get.
 * The index ranges from 0 to less than
 * the number of vertices in the mesh, not the
 * number of vertex indices.
 * @return {Array<number>} A 3-element array giving
 * the X, Y, and Z coordinates, respectively, of the vertex
 * normal, or null if the index is less than 0 or
 * equals the number of vertices in this mesh or greater.
 * Returns (0,0,0) if the given vertex exists but doesn't define
 * a normal.
 */
Mesh.prototype.getVertexNormal=function(index){
  var count=0;
  for(var i=0;i<this.subMeshes.length;i++){
   var subMesh=this.subMeshes[i];
   var c=subMesh.vertexCount();
   var newcount=count+c;
   if(index<newcount){
    if((subMesh.attributeBits&Mesh.NORMALS_BIT)!=0){
     var idx=index-count;
     idx*=subMesh.getStride();
     idx+=Mesh._normalOffset(subMesh.attributeBits);
     return subMesh.vertices.slice(idx,idx+3);
    } else {
     return [0,0,0];
    }
   }
   count=newcount;
  }
  return null;
}
/**
 * Gets the number of vertices included in this mesh.
 * @return {number} Return value. */
Mesh.prototype.vertexCount=function(){
  var count=0;
  for(var i=0;i<this.subMeshes.length;i++){
   count+=this.subMeshes[i].vertexCount();
  }
  return count;
}
/**
 * Gets the number of primitives (triangles, lines,
* and points) composed by all shapes in this mesh.
 * @return {number} Return value. */
Mesh.prototype.primitiveCount=function(){
  var count=0;
  for(var i=0;i<this.subMeshes.length;i++){
   count+=this.subMeshes[i].primitiveCount();
  }
  return count;
}

/** @private */
function SubMesh(vertices,faces,format){
 this.vertices=vertices||[];
 this.indices=faces||[];
 this.startIndex=0;
 var prim=(format&Mesh.PRIMITIVES_BITS);
 if(prim!=0 && prim!=Mesh.LINES_BIT && prim!=Mesh.POINTS_BIT){
  throw new Error("invalid format");
 }
 this.attributeBits=(format==null) ? 0 : format;
 this.vertexCount=function(){
  return this.vertices.length/this.getStride();
 }
 this.getStride=function(){
  return Mesh._getStride(this.attributeBits);
 }
 this.newPrimitive=function(m){
  this.startIndex=this.vertices.length;
  return this;
 }
 this.primitiveType=function(){
  var primitive=Mesh.TRIANGLES;
  if((this.attributeBits&Mesh.LINES_BIT)!=0)primitive=Mesh.LINES;
  if((this.attributeBits&Mesh.POINTS_BIT)!=0)primitive=Mesh.POINTS;
  return primitive;
 }
 /** @private */
 this._rebuildVertices=function(newAttributes){
  var oldBits=this.attributeBits;
  var newBits=oldBits|(newAttributes&Mesh.ATTRIBUTES_BITS);
  if(newBits==oldBits)return;
  var currentStride=this.getStride();
  // Rebuild the list of vertices if a new kind of
  // attribute is added to the mesh
  var newVertices=[];
  var newStride=3;
  if((newBits&Mesh.COLORS_BIT)!=0)
   newStride+=3;
  if((newBits&Mesh.NORMALS_BIT)!=0)
   newStride+=3;
  if((newBits&Mesh.TEXCOORDS_BIT)!=0)
   newStride+=2;
  if((newBits&Mesh.TANGENTS_BIT)!=0)
   newStride+=3;
  if((newBits&Mesh.BITANGENTS_BIT)!=0)
   newStride+=3;
  for(var i=0;i<this.vertices.length;i+=currentStride){
   var vx=this.vertices[i];
   var vy=this.vertices[i+1];
   var vz=this.vertices[i+2];
   var s=i+3;
   newVertices.push(vx,vy,vz);
   if((newBits&Mesh.NORMALS_BIT)!=0){
    if((oldBits&Mesh.NORMALS_BIT)!=0){
     var x=this.vertices[s];
     var y=this.vertices[s+1];
     var z=this.vertices[s+2];
     s+=3;
     newVertices.push(x,y,z);
    } else {
     newVertices.push(0,0,0);
    }
   }
   if((newBits&Mesh.COLORS_BIT)!=0){
    if((oldBits&Mesh.COLORS_BIT)!=0){
     var r=this.vertices[s];
     var g=this.vertices[s+1];
     var b=this.vertices[s+2];
     s+=3;
     newVertices.push(r,g,b);
    } else {
     newVertices.push(0,0,0);
    }
   }
   if((newBits&Mesh.TEXCOORDS_BIT)!=0){
    if((oldBits&Mesh.TEXCOORDS_BIT)!=0){
     var u=this.vertices[s];
     var v=this.vertices[s+1];
     s+=2;
     newVertices.push(u,v);
    } else {
     newVertices.push(0,0);
    }
   }
   if((newBits&Mesh.TANGENTS_BIT)!=0){
    if((oldBits&Mesh.TANGENTS_BIT)!=0){
     var x=this.vertices[s];
     var y=this.vertices[s+1];
     var z=this.vertices[s+2];
     s+=3;
     newVertices.push(x,y,z);
    } else {
     newVertices.push(0,0,0);
    }
   }
   if((newBits&Mesh.BITANGENTS_BIT)!=0){
    if((oldBits&Mesh.BITANGENTS_BIT)!=0){
     var x=this.vertices[s];
     var y=this.vertices[s+1];
     var z=this.vertices[s+2];
     s+=3;
     newVertices.push(x,y,z);
    } else {
     newVertices.push(0,0,0);
    }
   }
  }
  this.vertices=newVertices;
  this.attributeBits=newBits;
 }
 this._setTriangle=function(vertexStartIndex,stride,i1,i2,i3){
   var v1=i1*stride;
   var v2=i2*stride;
   var v3=i3*stride;
   var triCount=0;
   var tribits=0;
   var v=this.vertices;
   for(var i=vertexStartIndex-stride;
     i>=0 && triCount<16 && tribits!=7;
     i-=stride,triCount++){
     var found=7;
     for(var j=0;j<stride && found!=0;j++){
        if((found&1)!=0 && v[v1+j]!=v[i+j]){
         found&=~1;
        }
        if((found&2)!=0 && v[v2+j]!=v[i+j]){
         found&=~2;
        }
        if((found&4)!=0 && v[v3+j]!=v[i+j]){
         found&=~4;
        }
     }
     if((found&1)!=0){ i1=i/stride; v1=i1*stride; tribits|=1; break; }
     if((found&2)!=0){ i2=i/stride; v2=i2*stride; tribits|=2; break; }
     if((found&4)!=0){ i3=i/stride; v3=i3*stride; tribits|=4; break; }
   }
   if(
    !(v[v1]==v[v2] && v[v1+1]==v[v2+1] && v[v1+2]==v[v2+2]) &&
    !(v[v1]==v[v3] && v[v1+1]==v[v3+1] && v[v1+2]==v[v3+2]) &&
    !(v[v2]==v[v3] && v[v2+1]==v[v3+1] && v[v2+2]==v[v3+2])){
    // avoid identical vertex positions
    this.indices.push(i1,i2,i3);
   }
 }
 this.vertex3=function(x,y,z,state){
  var currentMode=state.currentMode;
  if(currentMode==-1)throw new Error("mode() not called");
  this._rebuildVertices(state._elementsDefined);
   var vertexStartIndex=this.vertices.length;
  this.vertices.push(x,y,z);
  if((this.attributeBits&Mesh.NORMALS_BIT)!=0){
   this.vertices.push(state.normal[0],state.normal[1],state.normal[2]);
  }
  if((this.attributeBits&Mesh.COLORS_BIT)!=0){
   this.vertices.push(state.color[0],state.color[1],state.color[2]);
  }
  if((this.attributeBits&Mesh.TEXCOORDS_BIT)!=0){
   this.vertices.push(state.texCoord[0],state.texCoord[1]);
  }
  if((this.attributeBits&Mesh.TANGENTS_BIT)!=0){
   this.vertices.push(state.tangent[0],state.tangent[1],state.tangent[2]);
  }
  if((this.attributeBits&Mesh.BITANGENTS_BIT)!=0){
   this.vertices.push(state.bitangent[0],state.bitangent[1],state.bitangent[2]);
  }
  var stride=this.getStride();
  if(currentMode==Mesh.QUAD_STRIP &&
     (this.vertices.length-this.startIndex)>=stride*4 &&
     (this.vertices.length-this.startIndex)%(stride*2)==0){
   var index=(this.vertices.length/stride)-4;
   this._setTriangle(vertexStartIndex,stride,index,index+1,index+2);
   this._setTriangle(vertexStartIndex,stride,index+2,index+1,index+3);
  } else if(currentMode==Mesh.QUADS &&
     (this.vertices.length-this.startIndex)%(stride*4)==0){
   var index=(this.vertices.length/stride)-4;
   this._setTriangle(vertexStartIndex,stride,index,index+1,index+2);
   this._setTriangle(vertexStartIndex,stride,index,index+2,index+3);
  } else if(currentMode==Mesh.TRIANGLES &&
     (this.vertices.length-this.startIndex)%(stride*3)==0){
   var index=(this.vertices.length/stride)-3;
   this._setTriangle(vertexStartIndex,stride,index,index+1,index+2);
  } else if(currentMode==Mesh.LINES &&
     (this.vertices.length-this.startIndex)%(stride*2)==0){
   var index=(this.vertices.length/stride)-2;
   this.indices.push(index,index+1);
  } else if(currentMode==Mesh.TRIANGLE_FAN &&
     (this.vertices.length-this.startIndex)>=(stride*3)){
   var index=(this.vertices.length/stride)-2;
   var firstIndex=(this.startIndex/stride);
   this._setTriangle(vertexStartIndex,stride,firstIndex,index,index+1);
  } else if(currentMode==Mesh.LINE_STRIP &&
     (this.vertices.length-this.startIndex)>=(stride*2)){
   var index=(this.vertices.length/stride)-2;
   this.indices.push(index,index+1);
  } else if(currentMode==Mesh.POINTS){
   var index=(this.vertices.length/stride)-1;
   this.indices.push(index);
  } else if(currentMode==Mesh.TRIANGLE_STRIP &&
     (this.vertices.length-this.startIndex)>=(stride*3)){
   var index=(this.vertices.length/stride)-3;
   var firstIndex=(this.startIndex/stride);
   if(((index-firstIndex)&1)==0){
     this._setTriangle(vertexStartIndex,stride,index,index+1,index+2);
   } else {
     this._setTriangle(vertexStartIndex,stride,index+1,index,index+2);
   }
  }
  return this;
 }
}

/** @private */
SubMesh.prototype.makeRedundant=function(){
  var existingIndices=[];
  var stride=this.getStride();
  var originalIndicesLength=this.indices.length;
  for(var i=0;i<originalIndicesLength;i++){
    var index=this.indices[i];
    if(existingIndices[index]){
     // Index already exists, so duplicate
     var offset=index*stride;
     var newIndex=this.vertices.length/stride;
     for(var j=0;j<stride;j++){
      this.vertices.push(this.vertices[offset+j]);
     }
     this.indices[i]=newIndex;
    }
    existingIndices[index]=true;
  }
  return this;
}
/**
 * @private */
SubMesh.prototype.primitiveCount=function(){
  if((this.attributeBits&Mesh.LINES_BIT)!=0)
   return Math.floor(this.indices.length/2);
  if((this.attributeBits&Mesh.POINTS_BIT)!=0)
   return this.indices.length;
  return Math.floor(this.indices.length/3);
}
/** @private */
SubMesh.prototype.toWireFrame=function(){
  if((this.attributeBits&Mesh.PRIMITIVES_BITS)!=0){
   // Not a triangle mesh
   return this;
  }
  // Adds a line only if it doesn't exist
  function addLine(lineIndices,existingLines,f1,f2){
   // Ensure ordering of the indices
   if(f1<f2){
    var tmp=f1;f1=f2;f2=tmp;
   }
   var e=existingLines[f1];
   if(e){
    if(e.indexOf(f2)<0){
     e.push(f2);
     lineIndices.push(f1,f2);
    }
   } else {
    existingLines[f1]=[f2];
    lineIndices.push(f1,f2);
   }
  }
  var lineIndices=[];
  var existingLines={};
  for(var i=0;i<this.indices.length;i+=3){
    var f1=this.indices[i];
    var f2=this.indices[i+1];
    var f3=this.indices[i+2];
    addLine(lineIndices,existingLines,f1,f2);
    addLine(lineIndices,existingLines,f2,f3);
    addLine(lineIndices,existingLines,f3,f1);
  }
  return new SubMesh(this.vertices, lineIndices,
    this.attributeBits|Mesh.LINES_BIT);
}

/** @private */
SubMesh._isIdentityInUpperLeft=function(m){
 return (m[0]==1 && m[1]==0 && m[2]==0 &&
    m[4]==0 && m[5]==1 && m[6]==0 &&
    m[8]==0 && m[9]==0 && m[10]==1) ? true : false;
}
/** @private */
SubMesh.prototype.transform=function(matrix){
  var stride=this.getStride();
  var v=this.vertices;
  var isNonTranslation=!SubMesh._isIdentityInUpperLeft(matrix);
  var normalOffset=Mesh._normalOffset(this.attributeBits);
  var matrixForNormals=null;
  if(normalOffset>=0 && isNonTranslation){
   matrixForNormals=GLMath.mat4inverseTranspose3(matrix);
  }
  for(var i=0;i<v.length;i+=stride){
    var xform=GLMath.mat4transform(matrix,
      v[i],v[i+1],v[i+2],1.0);
    v[i]=xform[0];
    v[i+1]=xform[1];
    v[i+2]=xform[2];
    if(normalOffset>=0 && isNonTranslation){
     // Transform and normalize the normals
     // (using a modified matrix) to ensure
     // they point in the correct direction
     xform=GLMath.mat3transform(matrixForNormals,
      v[i+normalOffset],v[i+normalOffset+1],v[i+normalOffset+2]);
     GLMath.vec3normInPlace(xform);
     v[i+normalOffset]=xform[0];
     v[i+normalOffset+1]=xform[1];
     v[i+normalOffset+2]=xform[2];
    }
  }
  // TODO: Planned for 2.0.  Once implemented,
  // Mesh#transform will say:  "Also, resets the primitive
  // mode (see {@link glutil.Mesh#mode}) so that future vertices given
  // will not build upon previous vertices."
  //this.newPrimitive();
  return this;
}

/**
* Reverses the winding order of the triangles in this mesh
* by swapping the second and third vertex indices of each one.
* @return {glutil.Mesh} This object.
* @example <caption>
* The following code generates a mesh that survives face culling,
* since the same triangles occur on each side of the mesh, but
* with different winding orders.  This is useful when enabling
* back-face culling and drawing open geometric shapes such as
* those generated by Meshes.createCylinder or Meshes.createDisk.
* Due to the z-fighting effect, drawing this kind of mesh is
* recommended only if face culling is enabled.</caption>
* var frontBackMesh = originalMesh.merge(
*  new Mesh().merge(originalMesh).reverseWinding()
* );
*/
Mesh.prototype.reverseWinding=function(){
  for(var i=0;i<this.subMeshes.length;i++){
   this.subMeshes[i].reverseWinding();
  }
  return this;
}
/**
 * Enumerates the primitives (lines, triangles, and points) included
 * in this mesh.
 * @param {Function} func A function that will be called
 * for each primitive in the mesh.  The function takes a single
 * parameter, consisting of an array of one, two, or three vertex
 * objects.  A point will have one vertex, a line two vertices and
 * a triangle three.  Each vertex object may have these properties:<ul>
 * <li>"position": A 3-element array of the vertex's position.
 * Always present.
 * <li>"normal": A 3-element array of the vertex's normal.
 * May be absent.
 * <li>"color": An at least 3-element array of the vertex's color.
 * Each component generally ranges from 0 to 1. May be absent.
 * <li>"uv": A 2-element array of the vertex's texture coordinates
 * (the first element is U, the second is V).
 * Each component generally ranges from 0 to 1. May be absent.
 * </ul>
 * @return {glutil.Mesh} This object.
 */
Mesh.prototype.enumPrimitives=function(func){
 for(var i=0;i<this.subMeshes.length;i++){
  var sm=this.subMeshes[i];
  var prim=sm.primitiveType();
  var normals=Mesh._normalOffset(sm.attributeBits);
  var colors=Mesh._colorOffset(sm.attributeBits);
  var texcoords=Mesh._texCoordOffset(sm.attributeBits);
  var stride=sm.getStride();
  var v=sm.vertices;
  var primSize=3;
  if(prim==Mesh.LINES)primSize=2;
  if(prim==Mesh.POINTS)primSize=1;
  for(var j=0;j<sm.indices.length;j+=primSize){
   var p=[];
   for(var k=0;k<primSize;k++){
    var vi=sm.indices[j+k]*stride;
    var info={};
    info.position=[v[vi],v[vi+1],v[vi+2]];
    if(normals>=0)
     info.normal=[v[vi+normals],v[vi+normals+1],v[vi+normals+2]]
    if(colors>=0)
     info.color=[v[vi+colors],v[vi+colors+1],v[vi+colors+2]]
    if(texcoords>=0)
     info.uv=[v[vi+texcoords],v[vi+texcoords+1]]
    p.push(info)
   }
   func(p)
  }
 }
 return this;
}

/**
* Finds the tightest
* bounding box that holds all vertices in the mesh.
* @returns An array of six numbers describing the tightest
* axis-aligned bounding box
* that fits all vertices in the mesh. The first three numbers
* are the smallest-valued X, Y, and Z coordinates, and the
* last three are the largest-valued X, Y, and Z coordinates.
* If the mesh is empty, returns the array [Inf, Inf, Inf, -Inf,
* -Inf, -Inf].
*/
Mesh.prototype.getBoundingBox=function(){
 var empty=true;
 var inf=Number.POSITIVE_INFINITY;
 var ret=[inf,inf,inf,-inf,-inf,-inf];
 for(var i=0;i<this.subMeshes.length;i++){
  var sm=this.subMeshes[i];
  var stride=sm.getStride();
  var v=sm.vertices;
  for(var j=0;j<sm.indices.length;j++){
    var vi=sm.indices[j]*stride;
    if(empty){
     empty=false;
     ret[0]=ret[3]=v[vi];
     ret[1]=ret[4]=v[vi+1];
     ret[2]=ret[5]=v[vi+2];
    } else {
     ret[0]=Math.min(ret[0],v[vi]);
     ret[3]=Math.max(ret[3],v[vi]);
     ret[1]=Math.min(ret[1],v[vi+1]);
     ret[4]=Math.max(ret[4],v[vi+1]);
     ret[2]=Math.min(ret[2],v[vi+2]);
     ret[5]=Math.max(ret[5],v[vi+2]);
    }
  }
 }
 return ret;
}

Mesh._findTangentAndBitangent=function(vertices,v1,v2,v3,uvOffset){
  var t1 = vertices[v2] - vertices[v1];
  var t2 = vertices[v2+1] - vertices[v1+1];
  var t3 = vertices[v2+2] - vertices[v1+2];
  var t4 = vertices[v3] - vertices[v1];
  var t5 = vertices[v3+1] - vertices[v1+1];
  var t6 = vertices[v3+2] - vertices[v1+2];
  var t7 = vertices[v2+uvOffset] - vertices[v1+uvOffset];
  var t8 = vertices[v2+uvOffset+1] - vertices[v1+uvOffset+1];
  var t9 = vertices[v3+uvOffset] - vertices[v1+uvOffset];
  var t10 = vertices[v3+uvOffset+1] - vertices[v1+uvOffset+1];
  var t11 = ((((t7 * t10) - t8 * t9)));
  if(t11==0){
   return [0,0,0,0,0,0];
  }
  t11=1.0/t11;
  var t12 = -t8;
  var t13 = -t9;
  var t14 = (((t10 * t1) + t12 * t4)) * t11;
  var t15 = (((t10 * t2) + t12 * t5)) * t11;
  var t16 = (((t10 * t3) + t12 * t6)) * t11;
  var t17 = (((t13 * t1) + t7 * t4)) * t11;
  var t18 = (((t13 * t2) + t7 * t5)) * t11;
  var t19 = (((t13 * t3) + t7 * t6)) * t11;
  return [t14,t15,t16,t17,t18,t19];
}

Mesh._recalcTangentsInternal=function(vertices,indices,stride,
  uvOffset,normalOffset,tangentOffset){
 // NOTE: no need to specify bitangent offset, since tangent
 // and bitangent will always be contiguous (this method will
 // always be called after the recalcTangents method ensures
 // that both fields are present)
 var vi=[0,0,0];
 for(var i=0;i<indices.length;i+=3){
  vi[0]=indices[i]*stride;
  vi[1]=indices[i+1]*stride;
  vi[2]=indices[i+2]*stride;
  var ret=Mesh._findTangentAndBitangent(vertices,vi[0],vi[1],vi[2],uvOffset);
  // NOTE: It would be more mathematically correct to use the inverse
  // of the matrix
  //     [ Ax Bx Nx ]
  //     [ Ay By Ny ]
  //     [ Az Bz Nz ]
  // (where A and B are the tangent and bitangent and returned
  // in _findTangentAndBitangent) as the tangent space
  // transformation, that is, include three
  // different vectors (tangent, bitangent, and modified normal).
  // Instead we use the matrix
  //    [ AAx AAy AAz ]
  //    [ BBx BBy BBz ]
  //    [ Nx  Ny  Nz ]
  // (where AA and BB are the orthonormalized versions of the tangent
  // and bitangent) as the tangent space transform, in order to avoid
  // the need to also specify a transformed normal due to matrix inversion.
  for(var j=0;j<3;j++){
   var m=ret;
   var vicur=vi[j];
   var norm0=vertices[vicur+normalOffset];
   var norm1=vertices[vicur+normalOffset+1];
   var norm2=vertices[vicur+normalOffset+2];
   var t20 = (((m[0] * norm0) + m[1] * norm1) + m[2] * norm2);
   var tangent = GLMath.vec3normInPlace([
    (m[0] - t20 * norm0),
    (m[1] - t20 * norm1),
    (m[2] - t20 * norm2)]);
   var t22 = (((m[3] * norm0) + m[4] * norm1) + m[5] * norm2);
   var t23 = (((m[3] * tangent[0]) + m[4] * tangent[1]) + m[5] * tangent[2]);
   var bitangent = GLMath.vec3normInPlace([
    ((m[3] - t22 * norm0) - t23 * tangent[0]),
    ((m[4] - t22 * norm1) - t23 * tangent[1]),
    ((m[5] - t22 * norm2) - t23 * tangent[2])]);
   vertices[vicur+tangentOffset]=tangent[0];
   vertices[vicur+tangentOffset+1]=tangent[1];
   vertices[vicur+tangentOffset+2]=tangent[2];
   vertices[vicur+tangentOffset+3]=bitangent[0];
   vertices[vicur+tangentOffset+4]=bitangent[1];
   vertices[vicur+tangentOffset+5]=bitangent[2];
  }
 }
}
/** @private */
SubMesh.prototype.recalcTangents=function(){
  var tangentBits=Mesh.TANGENTS_BIT|Mesh.BITANGENTS_BIT;
  var haveOtherAttributes=((this.attributeBits&(Mesh.ATTRIBUTES_BITS&~tangentBits))!=0);
  var uvOffset=Mesh._texCoordOffset(this.attributeBits);
  var normalOffset=Mesh._normalOffset(this.attributeBits);
  if(uvOffset<0 || normalOffset<0){
   // can't generate tangents and bitangents
   // without normals or texture coordinates.
   return this;
  }
  this._rebuildVertices(tangentBits);
  if(haveOtherAttributes){
    this.makeRedundant();
  }
  if(this.primitiveType()==Mesh.TRIANGLES){
   var tangentOffset=Mesh._tangentOffset(this.attributeBits);
   Mesh._recalcTangentsInternal(this.vertices,this.indices,
     this.getStride(),uvOffset,normalOffset,tangentOffset);
   }
  return this;
};
/**
* Modifies this mesh by reversing the sign of normals it defines.
* @return {glutil.Mesh} This object.
* @example <caption>
* The following code generates a two-sided mesh, where
* the normals on each side face in the opposite direction.
* This is only useful when drawing open geometric shapes such as
* those generated by Meshes.createCylinder or Meshes.createDisk.
* Due to the z-fighting effect, drawing a two-sided mesh is
* recommended only if face culling is enabled.</caption>
* var twoSidedMesh = originalMesh.merge(
*  new Mesh().merge(originalMesh).reverseWinding().reverseNormals()
* );
*/
Mesh.prototype.reverseNormals=function(){
  for(var i=0;i<this.subMeshes.length;i++){
   var stride=this.subMeshes[i].getStride();
   var vertices=this.subMeshes[i].vertices;
   var normalOffset=Mesh._normalOffset(
     this.subMeshes[i].attributeBits);
   if(normalOffset<0)continue;
   for(var i=0;i<vertices.length;i+=stride){
    var x=vertices[i+normalOffset];
    var y=vertices[i+normalOffset+1];
    var z=vertices[i+normalOffset+2];
    vertices[i+normalOffset]=-x;
    vertices[i+normalOffset+1]=-y;
    vertices[i+normalOffset+2]=-z;
   }
  }
  return this;
}

/** @private */
SubMesh.prototype.reverseWinding=function(){
  if((this.attributeBits&Mesh.PRIMITIVES_BITS)!=0){
   // Not a triangle mesh
   return this;
  }
  for(var i=0;i<this.indices.length;i+=3){
    var f2=this.indices[i+1];
    var f3=this.indices[i+2];
    this.indices[i+2]=f2;
    this.indices[i+1]=f3;
  }
  return this;
}

/** @private */
SubMesh.prototype.recalcNormals=function(flat,inward){
  var haveOtherAttributes=((this.attributeBits&(Mesh.ATTRIBUTES_BITS&~Mesh.NORMALS_BIT))!=0);
  this._rebuildVertices(Mesh.NORMALS_BIT);
  // No need to duplicate vertices if there are no other attributes
  // besides normals and smooth shading is requested; the
  // recalculation will reinitialize normals to 0 and
  // add the calculated normals to vertices as they are implicated
  if(haveOtherAttributes || flat){
    this.makeRedundant();
  }
  if(this.primitiveType()==Mesh.LINES){
   Mesh._recalcNormalsLines(this.vertices,this.indices,
     this.getStride(),3,flat,inward);
  } else {
   Mesh._recalcNormals(this.vertices,this.indices,
     this.getStride(),3,flat,inward);
  }
  return this;
};
/** @private */
SubMesh.prototype.setColor3=function(r,g,b){
  this._rebuildVertices(Mesh.COLORS_BIT);
  var stride=this.getStride();
  var colorOffset=Mesh._colorOffset(this.attributeBits);
  for(var i=colorOffset;i<this.vertices.length;i+=stride){
    this.vertices[i]=r;
    this.vertices[i+1]=g;
    this.vertices[i+2]=b;
  }
  return this;
};
/** @private */
Mesh._getStride=function(format){
  var s=[3,6,6,9,5,8,8,11][format&(Mesh.NORMALS_BIT|Mesh.COLORS_BIT|Mesh.TEXCOORDS_BIT)];
  if((format&Mesh.TANGENTS_BIT)!=0)s+=3
  if((format&Mesh.BITANGENTS_BIT)!=0)s+=3
  return s
 }
/** @private */
Mesh._normalOffset=function(format){
  return [-1,3,-1,3,-1,3,-1,3][format&(Mesh.NORMALS_BIT|Mesh.COLORS_BIT|Mesh.TEXCOORDS_BIT)];
 }
/** @private */
Mesh._tangentOffset=function(format){
  var x=3;
  if((format&Mesh.TANGENTS_BIT)==0)return -1;
  if((format&Mesh.NORMALS_BIT)!=0)x+=3
  if((format&Mesh.COLORS_BIT)!=0)x+=3
  if((format&Mesh.TEXCOORDS_BIT)!=0)x+=2
  return x;
 }
/** @private */
Mesh._bitangentOffset=function(format){
  var x=3;
  if((format&Mesh.BITANGENTS_BIT)==0)return -1;
  if((format&Mesh.NORMALS_BIT)!=0)x+=3
  if((format&Mesh.COLORS_BIT)!=0)x+=3
  if((format&Mesh.TEXCOORDS_BIT)!=0)x+=2
  if((format&Mesh.TANGENTS_BIT)!=0)x+=3
  return x;
 }
/** @private */
Mesh._colorOffset=function(format){
  return [-1,-1,3,6,-1,-1,3,6][format&(Mesh.NORMALS_BIT|Mesh.COLORS_BIT|Mesh.TEXCOORDS_BIT)];
 }
/** @private */
Mesh._texCoordOffset=function(format){
  return [-1,-1,-1,-1,3,6,6,9][format&(Mesh.NORMALS_BIT|Mesh.COLORS_BIT|Mesh.TEXCOORDS_BIT)];
}
/**
 @private */
Mesh.ATTRIBUTES_BITS = 255;
/**
 @private */
Mesh.PRIMITIVES_BITS = 768;
/** The mesh contains normals for each vertex.
 @const
 @default
*/
Mesh.NORMALS_BIT = 1;
/** The mesh contains colors for each vertex.
 @const
 @default
*/
Mesh.COLORS_BIT = 2;
/** The mesh contains texture coordinates for each vertex.
 @const
 @default
*/
Mesh.TEXCOORDS_BIT = 4;
/**
 The mesh contains tangent vectors for each vertex.
 @const
 @default
*/
Mesh.TANGENTS_BIT = 8;
/**
 The mesh contains bitangent vectors for each vertex.
 @const
 @default
*/
Mesh.BITANGENTS_BIT = 16;
/** The mesh consists of lines (2 vertices per line) instead
of triangles (3 vertices per line).
 @const
 @default
*/
Mesh.LINES_BIT = 256;
/** The mesh consists of points (1 vertex per line).
 @const
 @default
*/
Mesh.POINTS_BIT = 512;
/**
Primitive mode for rendering triangles, made up
of 3 vertices each.
 @const
 @default
*/
Mesh.TRIANGLES = 4;
/**
Primitive mode for rendering a strip of quadrilaterals (quads).
The first 4 vertices make up the first quad, and each additional
quad is made up of the last 2 vertices of the previous quad and
2 new vertices. Each quad is broken into two triangles: the first
triangle consists of the first, second, and third vertices, in that order,
and the second triangle consists of the third, second, and fourth
vertices, in that order.
 @const
 @default
*/
Mesh.QUAD_STRIP = 8;
/**
Primitive mode for rendering quadrilaterals, made up
of 4 vertices each.  Each quadrilateral is broken into two triangles: the first
triangle consists of the first, second, and third vertices, in that order,
and the second triangle consists of the first, third, and fourth
vertices, in that order.
 @const
 @default
 */
Mesh.QUADS = 7;
/**
Primitive mode for rendering line segments, made up
of 2 vertices each.
 @const
*/
Mesh.LINES = 1;
/**
Primitive mode for rendering a triangle fan.  The first 3
vertices make up the first triangle, and each additional
triangle is made up of the first vertex of the first triangle,
the previous vertex, and 1 new vertex.
 @const
 @default
*/
Mesh.TRIANGLE_FAN = 6;
/**
Primitive mode for rendering a triangle strip.  The first 3
vertices make up the first triangle, and each additional
triangle is made up of the last 2 vertices and 1
new vertex.  For the second triangle in the strip, and
every other triangle after that, the first and second
vertices are swapped when generating that triangle.
 @const
 @default
*/
Mesh.TRIANGLE_STRIP = 5;
/**
Primitive mode for rendering connected line segments.
The first 2 vertices make up the first line, and each additional
line is made up of the last vertex and 1 new vertex.
 @const
 @default
*/
Mesh.LINE_STRIP = 3;
/**
Primitive mode for rendering points, made up
of 1 vertex each.
 @const
 @default
*/
Mesh.POINTS = 0;

this["Mesh"]=Mesh;
