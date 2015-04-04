/*
Written by Peter O. in 2015.

Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/
If you like this, you should donate to Peter O.
at: http://upokecenter.dreamhosters.com/articles/donate-now-2/
*/

/**
* Specifies the triangles and lines that make up a geometric shape.
* See the "{@tutorial shapes}" tutorial.
* @class
* @alias glutil.Mesh
* @param {Array<number>|undefined} vertices An array that contains data on each
* vertex of the mesh.
* Each vertex is made up of the same number of elements, as defined in
* format. If null or omitted, creates an initially empty mesh.
* May be null or omitted, in which case an empty vertex array is used.
* @param {Array<number>|undefined} indices An array of vertex indices.  Each trio of
* indices specifies a separate triangle, or each pair of indices specifies
* a line segment.
* If null or omitted, creates an initially empty mesh.
* @param {number|undefined} format A set of bit flags depending on the kind of data
* each vertex contains.  Each vertex contains 3 elements plus:<ul>
*  <li> 3 more elements if Mesh.NORMALS_BIT is set, plus
*  <li> 3 more elements if Mesh.COLORS_BIT is set, plus
*  <li> 2 more elements if Mesh.TEXCOORDS_BIT is set.</ul>
* If Mesh.LINES_BIT is set, each vertex index specifies a point of a line
* segment.
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
 this.texCoord=[0,0];
}
/** @private */
Mesh._primitiveType=function(mode){
 if(mode==Mesh.LINES)
  return Mesh.LINES;
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
Mesh._recalcNormals=function(vertices,faces,stride,offset,flat,inward){
  var normDir=(inward) ? 1 : -1;
  var uniqueVertices={};
  var len;
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
  for(var i=0;i<faces.length;i+=3){
    var v1=faces[i]*stride
    var v2=faces[i+1]*stride
    var v3=faces[i+2]*stride
    var n1=[vertices[v2]-vertices[v3],vertices[v2+1]-vertices[v3+1],vertices[v2+2]-vertices[v3+2]]
    var n2=[vertices[v1]-vertices[v3],vertices[v1+1]-vertices[v3+1],vertices[v1+2]-vertices[v3+2]]
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
  if(!flat){
   // If smooth shading is requested, make sure
   // that every vertex with the same position has the
   // same normal
   for(var key in uniqueVertices){
    var v=uniqueVertices[key]
    if(v && v.constructor==Array && v.length>=2){
     var v0=v[0];
     // Add the normals of duplicate vertices
     // to the first vertex
     for(var i=1;i<v.length;i++){
      vertices[v0]+=vertices[v[i]]
      vertices[v0+1]+=vertices[v[i]+1]
      vertices[v0+2]+=vertices[v[i]+2]
     }
     // Propagate the first vertex's normal to the
     // other vertices
     for(var i=1;i<v.length;i++){
      vertices[v[i]]=vertices[v0]
      vertices[v[i]+1]=vertices[v0+1]
      vertices[v[i]+2]=vertices[v0+2]
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
/**
 * Changes the primitive mode for this mesh.
 * Future vertices will be drawn as primitives of the new type.
 * The primitive type can be set to the same mode, in which
 * case future vertices given will not build upon previous
 * vertices.
 * @param {number} m A primitive type.  One of the following:
 * Mesh.TRIANGLES, Mesh.LINES, Mesh.TRIANGLE_STRIP,
 * Mesh.TRIANGLE_FAN, Mesh.QUADS, Mesh.QUAD_STRIP.
 * @return {Mesh} This object.
 */
Mesh.prototype.mode=function(m){
 if(m<0)throw new Error("invalid mode");
 if(this.currentMode==-1 ||
   !Mesh._isCompatibleMode(this.currentMode,m)){
   var format=0;
   if(Mesh._primitiveType(m)==Mesh.LINES)
    format|=Mesh.LINES_BIT;
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
 * @param {Mesh} other A mesh to merge into this one. The mesh
 * given in this parameter will remain unchanged.
 * @return {Mesh} This object.
 */
Mesh.prototype.merge=function(other){
 var lastMesh=this.subMeshes[this.subMeshes.length-1]
 var prim=lastMesh ? (lastMesh.attributeBits&Mesh.LINES_BIT) : 0;
 for(var i=0;i<other.subMeshes.length;i++){
  var sm=other.subMeshes[i];
  if(sm.indices.length==0)continue;
  if(!lastMesh ||
     (sm.attributeBits&Mesh.LINES_BIT)!=prim ||
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
   prim=(lastMesh.attributeBits&Mesh.LINES_BIT);
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
  * that mode.
  * @param {number} x X-coordinate of the normal.
  * @param {number} y Y-coordinate of the normal.
  * @param {number} z Z-coordinate of the normal.
  * @return {Mesh} This object.
  */
Mesh.prototype.normal3=function(x,y,z){
  this.normal[0]=x;
  this.normal[1]=y;
  this.normal[2]=z;
  this._elementsDefined|=Mesh.NORMALS_BIT;
  return this;
}
 /**
  * Transforms the positions and normals of all the vertices currently
  * in this mesh, using a 4x4 matrix.  The matrix won't affect
  * vertices added afterwards.
  * @param {Array<number>} matrix A 4x4 matrix describing
  * the transformation.
  * @return {Mesh} This object.
  */
 Mesh.prototype.transform=function(matrix){
  for(var i=0;i<this.subMeshes.length;i++){
   this.subMeshes[i].transform(matrix);
  }
  return this;
 }
 /**
  * Sets the current color for this mesh.  Future vertex positions
  * defined (with vertex3()) will have this color.The new current
  * color will apply to future vertices even if the current mode
  * is TRIANGLE_FAN and some vertices were already given for
  * that mode.
  * @param {number} r Red component of the color (0-1).
  * Can also be a string
  * specifying an [HTML or CSS color]{@link glutil.GLUtil.toGLColor}.
  * @param {number} g Green component of the color (0-1).
  * May be null or omitted if a string is given as the "r" parameter.
  * @param {number} b Blue component of the color (0-1).
  * May be null or omitted if a string is given as the "r" parameter.
  * @return {Mesh} This object.
  */
 Mesh.prototype.color3=function(x,y,z){
  if(typeof x=="string"){
   var c=GLUtil["toGLColor"](x);
   this.color[0]=c[0];
   this.color[1]=c[1];
   this.color[2]=c[2];
  } else {
   this.color[0]=x;
   this.color[1]=y;
   this.color[2]=z;
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
  * that mode.
  * @param {number} u X-coordinate of the texture, from 0-1.
  * @param {number} v Y-coordinate of the texture, from 0-1.
  * @return {Mesh} This object.
  */
 Mesh.prototype.texCoord2=function(u,v){
  this.texCoord[0]=u;
  this.texCoord[1]=v;
  this._elementsDefined|=Mesh.TEXCOORDS_BIT;
  return this;
 }
 /**
  * Adds a new vertex to this mesh.  If appropriate, adds an
  * additional face index according to this mesh's current mode.
  * The vertex will adopt this mesh's current normal, color,
  * and texture coordinates if they have been defined.
  * @param {number} x X-coordinate of the vertex.
  * @param {number} y Y-coordinate of the vertex.
  * @param {number} z Z-coordinate of the vertex.
  * @return {Mesh} This object.
  */
 Mesh.prototype.vertex3=function(x,y,z){
  this.subMeshes[this.subMeshes.length-1].vertex3(x,y,z,this);
  return this;
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
  * @return {Mesh} This object.
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
   if((this.subMeshes[i].attributeBits&Mesh.LINES_BIT)==0){
    this.subMeshes[i].setColor3(rr,gg,bb);
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
  * @return {Mesh} This object.
  */
 Mesh.prototype.recalcNormals=function(flat,inward){
  for(var i=0;i<this.subMeshes.length;i++){
   if((this.subMeshes[i].attributeBits&Mesh.LINES_BIT)==0){
    this.subMeshes[i].recalcNormals(flat,inward);
   }
  }
  return this;
 }
/**
 * Modifies this mesh by normalizing the normals it defines
 * to unit length.
 * @return {Mesh} This object.
 */
Mesh.prototype.normalizeNormals=function(){
  for(var i=0;i<this.subMeshes.length;i++){
   var stride=this.subMeshes[i].getStride();
   var vertices=this.subMeshes[i].vertices;
   var normalOffset=Mesh.normalOffset(
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
 * of the mesh already consisting of line segments will remain
 * unchanged.
 * @return {Mesh} A new mesh with triangles converted
 * to lines.
 */
Mesh.prototype.toWireFrame=function(){
  var mesh=new Mesh();
  for(var i=0;i<this.subMeshes.length;i++){
   mesh.subMeshes.push(this.subMeshes[i].toWireFrame());
  }
  return mesh;
}

/** @private */
function SubMesh(vertices,faces,format){
 this.vertices=vertices||[];
 this.indices=faces||[];
 this.startIndex=0;
 this.attributeBits=(format==null) ? 0 : format;
 this.vertexCount=function(){
  return this.vertices.length/this.getStride();
 }
 this.getStride=function(){
  return Mesh.getStride(this.attributeBits);
 }
 this.newPrimitive=function(m){
  this.startIndex=this.vertices.length;
  return this;
 }
 /** @private */
 this._rebuildVertices=function(newAttributes){
  var oldBits=this.attributeBits;
  var newBits=oldBits|(newAttributes&~Mesh.LINES_BIT);
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
  }
  this.vertices=newVertices;
  this.attributeBits=newBits;
 }
 this.vertex3=function(x,y,z,state){
  var currentMode=state.currentMode;
  if(currentMode==-1)throw new Error("mode() not called");
  this._rebuildVertices(state._elementsDefined);
  this.vertices.push(x,y,z);
  if((this.attributeBits&Mesh.COLORS_BIT)!=0){
   this.vertices.push(state.color[0],state.color[1],state.color[2]);
  }
  if((this.attributeBits&Mesh.NORMALS_BIT)!=0){
   this.vertices.push(state.normal[0],state.normal[1],state.normal[2]);
  }
  if((this.attributeBits&Mesh.TEXCOORDS_BIT)!=0){
   this.vertices.push(state.texCoord[0],state.texCoord[1]);
  }
  var stride=this.getStride();
  if(currentMode==Mesh.QUAD_STRIP &&
     (this.vertices.length-this.startIndex)>=stride*4 &&
     (this.vertices.length-this.startIndex)%(stride*2)==0){
   var index=(this.vertices.length/stride)-4;
   this.indices.push(index,index+1,index+2,index+2,index+1,index+3);
  } else if(currentMode==Mesh.QUADS &&
     (this.vertices.length-this.startIndex)%(stride*4)==0){
   var index=(this.vertices.length/stride)-4;
   this.indices.push(index,index+1,index+2,index+2,index+3,index);
  } else if(currentMode==Mesh.TRIANGLES &&
     (this.vertices.length-this.startIndex)%(stride*3)==0){
   var index=(this.vertices.length/stride)-3;
   this.indices.push(index,index+1,index+2);
  } else if(currentMode==Mesh.LINES &&
     (this.vertices.length-this.startIndex)%(stride*2)==0){
   var index=(this.vertices.length/stride)-2;
   this.indices.push(index,index+1);
  } else if(currentMode==Mesh.TRIANGLE_FAN &&
     (this.vertices.length-this.startIndex)>=(stride*3)){
   var index=(this.vertices.length/stride)-2;
   var firstIndex=(this.startIndex/stride);
   this.indices.push(firstIndex,index,index+1);
  } else if(currentMode==Mesh.TRIANGLE_STRIP &&
     (this.vertices.length-this.startIndex)>=(stride*3)){
   var index=(this.vertices.length/stride)-3;
   if((index&1)==0){
     this.indices.push(index,index+1,index+2);
   } else {
     this.indices.push(index,index+2,index+1);
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
/** @private */
SubMesh.prototype.toWireFrame=function(){
  if(this.builderMode==Mesh.LINES){
   return this;
  }
  var faces=[];
  for(var i=0;i<this.indices.length;i+=3){
    var f1=this.indices[i];
    var f2=this.indices[i+1];
    var f3=this.indices[i+2];
    faces.push(f1,f2,f2,f3,f3,f1);
  }
  return new SubMesh(this.vertices, faces,
    this.attributeBits|Mesh.LINES_BIT);
}

/** @private */
SubMesh._isIdentityInUpperLeft=function(matrix){
 return
    m[0]==1 && m[1]==0 && m[2]==0 &&
    m[4]==0 && m[5]==1 && m[6]==0 &&
    m[8]==0 && m[9]==0 && m[10]==1;
}
/** @private */
SubMesh.prototype.transform=function(matrix){
  var stride=this.getStride();
  var v=this.vertices;
  var isNonTranslation=!SubMesh._isIdentityInUpperLeft(matrix);
  var normalOffset=Mesh.normalOffset(this.attributeBits);
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
  return this;
}

/**
 *
 */
SubMesh.prototype._getBounds=function(){
  var stride=this.getStride();
  var minx=0;
  var maxx=0;
  var miny=0;
  var maxy=0;
  var minz=0;
  var maxz=0;
  for(var i=0;i<vertices.length;i+=stride){
    var x=vertices[i];
    var y=vertices[i+1];
    var z=vertices[i+2];
    if(i==0){
      minx=maxx=x;
      miny=maxy=y;
      minz=maxz=z;
    } else {
      minx=Math.min(minx,x);
      miny=Math.min(miny,y);
      minz=Math.min(minz,z);
      maxx=Math.max(maxx,x);
      maxy=Math.max(maxy,y);
      maxz=Math.max(maxz,z);
    }
  }
  return [[minx,miny,minz],[maxx,maxy,maxz]];
};
/** @private */
SubMesh.prototype.recalcNormals=function(flat,inward){
  var haveOtherAttributes=((this.attributeBits&(Mesh.COLORS_BIT|Mesh.TEXCOORDS_BIT))!=0);
  this._rebuildVertices(Mesh.NORMALS_BIT);
  // No need to duplicate vertices if there are no other attributes
  // besides normals and smooth shading is requested; the
  // recalculation will reinitialize normals to 0 and
  // add the calculated normals to vertices as they are implicated
  if(haveOtherAttributes || flat){
    this.makeRedundant();
  }
  Mesh._recalcNormals(this.vertices,this.indices,
    this.getStride(),3,flat,inward);
  return this;
};
/** @private */
SubMesh.prototype.setColor3=function(r,g,b){
  this._rebuildVertices(Mesh.COLORS_BIT);
  var stride=this.getStride();
  var colorOffset=Mesh.colorOffset(this.attributeBits);
  for(var i=colorOffset;i<this.vertices.length;i+=stride){
    this.vertices[i]=r;
    this.vertices[i+1]=g;
    this.vertices[i+2]=b;
  }
  return this;
};
/** @private */
Mesh.getStride=function(format){
  format&=Mesh.ATTRIBUTES_BITS;
  return [3,6,6,9,5,8,8,11][format];
 }
/** @private */
Mesh.normalOffset=function(format){
  format&=Mesh.ATTRIBUTES_BITS;
  return [-1,3,-1,3,-1,3,-1,3][format];
 }
/** @private */
Mesh.colorOffset=function(format){
  format&=Mesh.ATTRIBUTES_BITS;
  return [-1,-1,3,6,-1,-1,3,6][format];
 }
/** @private */
Mesh.texCoordOffset=function(format){
  format&=Mesh.ATTRIBUTES_BITS;
  return [-1,-1,-1,-1,3,6,6,9][format];
}
/**
 @private
 @const
*/
Mesh.ATTRIBUTES_BITS = 7;
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
/** The mesh consists of lines (2 vertices per line) instead
of triangles (3 vertices per line).
 @const
 @default
*/
Mesh.LINES_BIT = 8;
/**
Primitive mode for rendering triangles, made up
of 3 vertices each.
 @const
*/
Mesh.TRIANGLES = 0;
/**
Primitive mode for rendering a strip of quadrilaterals (quads).
The first 4 vertices make up the first quad, and each additional
quad is made up of the last 2 vertices of the previous quad and
2 new vertices.
 @const
*/
Mesh.QUAD_STRIP = 1;
/**
Primitive mode for rendering quadrilaterals, made up
of 4 vertices each.
 @const
*/
Mesh.QUADS = 2;
/**
Primitive mode for rendering line segments, made up
of 2 vertices each.
 @const
*/
Mesh.LINES = 3;
/**
Primitive mode for rendering a triangle fan.  The first 3
vertices make up the first triangle, and each additional
triangle is made up of the last vertex, the first vertex of
the first trangle, and 1 new vertex.
 @const
*/
Mesh.TRIANGLE_FAN = 4;
/**
Primitive mode for rendering a triangle strip.  The first 3
vertices make up the first triangle, and each additional
triangle is made up of the last 2 vertices and 1
new vertex.
 @const
*/
Mesh.TRIANGLE_STRIP = 5;

this["Mesh"]=Mesh;