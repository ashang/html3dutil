/*
Written by Peter O. in 2015.

Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/
If you like this, you should donate to Peter O.
at: http://upokecenter.dreamhosters.com/articles/donate-now-2/
*/

/**
* Contains methods that create 3D meshes
* of common geometric shapes.
* @alias glutil.Meshes
*/
if(typeof Meshes=="undefined"){
 Meshes={};
}

/**
* Creates a mesh of a box (rectangular prism), which
* will be centered at the origin.
* See the "{@tutorial shapes}" tutorial.
* @param {number} xSize Width of the box.
* @param {number} ySize Height of the box.
* @param {number} xSize Depth of the box.
* @param {boolean} inward If true, the normals generated by this
* method will point inward; otherwise, outward.  Should normally be false
* unless the box will be viewed from the inside.
* @return {Mesh} The generated mesh.
*/
Meshes.createBox=function(xSize,ySize,zSize,inward){
 // Position X, Y, Z, normal NX, NY, NZ, texture U, V
 xSize*=0.5;
 ySize*=0.5;
 zSize*=0.5;
 var vertices=[
-xSize,-ySize,zSize,-1.0,0.0,0.0,1.0,0.0,
-xSize,ySize,zSize,-1.0,0.0,0.0,1.0,1.0,
-xSize,ySize,-zSize,-1.0,0.0,0.0,0.0,1.0,
-xSize,-ySize,-zSize,-1.0,0.0,0.0,0.0,0.0,
xSize,-ySize,-zSize,1.0,0.0,0.0,1.0,0.0,
xSize,ySize,-zSize,1.0,0.0,0.0,1.0,1.0,
xSize,ySize,zSize,1.0,0.0,0.0,0.0,1.0,
xSize,-ySize,zSize,1.0,0.0,0.0,0.0,0.0,
xSize,-ySize,-zSize,0.0,-1.0,0.0,1.0,0.0,
xSize,-ySize,zSize,0.0,-1.0,0.0,1.0,1.0,
-xSize,-ySize,zSize,0.0,-1.0,0.0,0.0,1.0,
-xSize,-ySize,-zSize,0.0,-1.0,0.0,0.0,0.0,
xSize,ySize,zSize,0.0,1.0,0.0,1.0,0.0,
xSize,ySize,-zSize,0.0,1.0,0.0,1.0,1.0,
-xSize,ySize,-zSize,0.0,1.0,0.0,0.0,1.0,
-xSize,ySize,zSize,0.0,1.0,0.0,0.0,0.0,
-xSize,-ySize,-zSize,0.0,0.0,-1.0,1.0,0.0,
-xSize,ySize,-zSize,0.0,0.0,-1.0,1.0,1.0,
xSize,ySize,-zSize,0.0,0.0,-1.0,0.0,1.0,
xSize,-ySize,-zSize,0.0,0.0,-1.0,0.0,0.0,
xSize,-ySize,zSize,0.0,0.0,1.0,1.0,0.0,
xSize,ySize,zSize,0.0,0.0,1.0,1.0,1.0,
-xSize,ySize,zSize,0.0,0.0,1.0,0.0,1.0,
-xSize,-ySize,zSize,0.0,0.0,1.0,0.0,0.0]
 if(inward){
  for(var i=0;i<vertices.length;i+=8){
   vertices[i+3]=-vertices[i+3]
   vertices[i+4]=-vertices[i+4]
   vertices[i+5]=-vertices[i+5]
  }
 }
 var faces=[0,1,2,0,2,3,4,5,6,4,6,7,8,9,10,8,10,11,12,
 13,14,12,14,15,16,17,18,16,18,19,20,21,22,20,22,23]
 return new Mesh(vertices,faces,Mesh.NORMALS_BIT | Mesh.TEXCOORDS_BIT);
}

/**
* Creates a mesh of a cylinder.  The cylinder's base will
* be centered at the origin and its height will run along the
* positive z-axis.  The base and top themselves will not be
* included in the mesh.
* See the "{@tutorial shapes}" tutorial.
* @param {number} baseRad Radius of the base of the cylinder. If 0,
* this function will create an approximation to a downward pointing cone.
* @param {number} topRad Radius of the top of the cylinder. If 0,
* this function will create an approximation to an upward pointing cone.
* @param {number} height Height of the cylinder.
* @param {number} slices Number of lengthwise "slices" the cylinder consists
* of.  This function will create a triangular prism if "slices" is 3
* and both radiuses are the same; a triangular pyramid if "slices" is
* 3 and either radius is zero; a rectangular prism if "slices" is 4
* and both radiuses are the same; and a rectangular pyramid if "slices"
* is 4 and either radius is zero. Must be 3 or greater.
* May be null or omitted, in which case the default is 32.
* @param {number} stacks Number of vertical stacks the cylinder consists of.
* May be null or omitted, in which case the default is 1.
* @param {boolean} flat If true, will generate normals such that the
* cylinder will be flat shaded; otherwise, will generate normals such that the
* cylinder will be smooth shaded.
* @param {boolean} inside If true, the normals generated by this
* method will point inward; otherwise, outward.  Should normally be false
* unless the cylinder will be viewed from the inside.
* @return {Mesh} The generated mesh.
*/
Meshes.createCylinder=function(baseRad, topRad, height, slices, stacks, flat, inside){
 var mesh=new Mesh();
 if(slices==null)slices=32;
 if(stacks==null)stacks=1;
 if(slices<=2)throw new Error("too few slices");
 if(stacks<1)throw new Error("too few stacks");
 if(height<0)throw new Error("negative height")
 if((baseRad<=0 && topRad<=0) || height==0){
  // both baseRad and topRad are zero or negative,
  // or height is zero
  return mesh;
 }
 var normDir=(inside) ? -1 : 1;
 var sc=[0,1]; // sin(0), cos(0)
 var tc=[0];
 var twopi=Math.PI*2;
 for(var i=1;i<slices;i++){
  var t=i*1.0/slices;
  var angle=twopi*t;
  sc.push(Math.sin(angle),Math.cos(angle));
  tc.push(t);
 }
 sc.push(0,1);
 tc.push(1);
 var slicesTimes2=slices*2;
 if(height>0){
  var lastZ=0;
  var lastRad=baseRad;
  var slopeAngle=0,sinSlopeNorm,cosSlopeNorm;
  if(baseRad==topRad){
   sinSlopeNorm=0;
   cosSlopeNorm=normDir;
  } else {
   slopeAngle=Math.atan2(baseRad-topRad,height);
   sinSlopeNorm=Math.sin(slopeAngle)*normDir;
   cosSlopeNorm=Math.cos(slopeAngle)*normDir;
  }
  for(var i=0;i<stacks;i++){
   var zStart=lastZ;
   var zEnd=(i+1)/stacks;
   var zStartHeight=height*zStart;
   var zEndHeight=height*zEnd;
   var radiusStart=lastRad;
   var radiusEnd=baseRad+(topRad-baseRad)*zEnd;
   lastZ=zEnd;
   lastRad=radiusEnd;
   var triangleFanBase=(i==0 && baseRad==0);
   var triangleFanTop=(i==stacks-1 && topRad==0);
   mesh.mode((triangleFanBase || triangleFanTop) ?
     Mesh.TRIANGLE_FAN : Mesh.QUAD_STRIP);
   if(triangleFanTop){
    // Output first vertices in reverse order to
    // allow triangle fan effect to work
    mesh.texCoord2(1,zEnd);
    mesh.normal3(0,cosSlopeNorm,sinSlopeNorm);
    mesh.vertex3(0,radiusEnd,zEndHeight);
    mesh.texCoord2(1,zStart);
    mesh.normal3(0,cosSlopeNorm,sinSlopeNorm);
    mesh.vertex3(0,radiusStart,zStartHeight);
   } else {
    mesh.texCoord2(1,zStart);
    mesh.normal3(0,cosSlopeNorm,sinSlopeNorm);
    mesh.vertex3(0,radiusStart,zStartHeight);
    mesh.texCoord2(1,zEnd);
    mesh.normal3(0,cosSlopeNorm,sinSlopeNorm);
    mesh.vertex3(0,radiusEnd,zEndHeight);
   }
   for(var k=2,j=1;k<=slicesTimes2;k+=2,j++){
    var tx=tc[j];
    var x,y;
    if(!triangleFanBase){
     x=sc[k];
     y=sc[k+1];
     mesh.texCoord2(1-tx,zStart);
     mesh.normal3(x*cosSlopeNorm,y*cosSlopeNorm,sinSlopeNorm);
     mesh.vertex3(x*radiusStart,y*radiusStart,zStartHeight);
    }
    if(!triangleFanTop){
     x=sc[k];
     y=sc[k+1];
     mesh.texCoord2(1-tx,zEnd);
     mesh.normal3(x*cosSlopeNorm,y*cosSlopeNorm,sinSlopeNorm);
     mesh.vertex3(x*radiusEnd,y*radiusEnd,zEndHeight);
    }
   }
  }
 }
 return flat ? mesh.recalcNormals(flat,inside) : mesh;
}

/**
* Creates a mesh of a closed cylinder.  The cylinder's base will
* be centered at the origin and its height will run along the
* positive z-axis.  The base and top will be included in the mesh if
* their radius is greater than 0.
* See the "{@tutorial shapes}" tutorial.
* @param {number} baseRad Radius of the base of the cylinder.
* See {@link glutil.Meshes.createCylinder}.
* @param {number} topRad Radius of the top of the cylinder.
* See {@link glutil.Meshes.createCylinder}.
* @param {number} height Height of the cylinder.
* @param {number} slices Number of "slices" (similar to pizza slices) the cylinder consists
* of. See {@link glutil.Meshes.createCylinder}.
* @param {number} stacks Number of vertical stacks the cylinder consists of.
* May be null or omitted, in which case the default is 1.
* @param {boolean} flat If true, will generate normals such that the
* cylinder will be flat shaded; otherwise, will generate normals such that the
* cylinder will be smooth shaded.
* @param {boolean} inside If true, the normals generated by this
* method will point inward; otherwise, outward.  Should normally be false
* unless the cylinder will be viewed from the inside.
* @return {Mesh} The generated mesh.
*/
Meshes.createClosedCylinder=function(base,top,height,slices,stacks,flat, inside){
 var cylinder=Meshes.createCylinder(base,top,height,slices,stacks,flat, inside);
 var base=Meshes.createDisk(0,base,slices,2,!inside);
 var top=Meshes.createDisk(0,top,slices,2,inside);
 // move the top disk to the top of the cylinder
 top.transform(GLMath.mat4translated(0,0,height));
 // merge the base and the top
 return cylinder.merge(base).merge(top);
}

/**
* Creates a mesh of a 2D disk.
* Assuming the Y axis points up, the X axis right,
* and the Z axis toward the viewer, the first vertex in the outer edge
* of the 2D disk will be at the 12 o'clock position.
* See the "{@tutorial shapes}" tutorial.
* @param {number} inner Radius of the hole in the middle of the
* disk.  If 0, no hole is created and the method will generate a regular
* polygon with n sides, where n is the value of "slices".  For example,
* if "inner" is 0 and "slices" is 3, the result will be an equilateral triangle;
* a square for 4 "slices", a regular pentagon for 5 "slices", and so on.
* @param {number} outer Outer radius of the disk.
* @param {number} slices Number of slices going around the disk.
* May be null or omitted; default is 32.
* @param {number} loops Number of concentric rings the disk makes up.
* May be null or omitted; default is 1.
* @param {boolean} inward If true, the normals generated by this
* method will point away from the positive z-axis; otherwise, toward
* the positive z-axis.  Default is false.
* @return The generated mesh.
*/
Meshes.createDisk=function(inner, outer, slices, loops, inward){
 return Meshes.createPartialDisk(inner,outer,slices,loops,0,360,inward);
}

/**
* Creates a mesh of a 2D disk or an arc of a 2D disk.
* See the "{@tutorial shapes}" tutorial.
* @param {number} inner Radius of the hole where the middle of the
* complete disk would be.  If 0, no hole is created.
* @param {number} outer Outer radius of the disk.
* @param {number} slices Number of slices going around the partial disk.
* May be null or omitted; default is 32.
* @param {number} loops Number of concentric rings the partial disk makes up.
* May be null or omitted; default is 1.
* @param {number} start Starting angle of the partial disk, in degrees.
* May be null or omitted; default is 0.
* Assuming the Y axis points up, the X axis right,
* and the Z axis toward the viewer, 0 degrees is at the 12 o'clock position,
* and 90 degrees at the 3 o'clock position.
* @param {number} sweep Arc length of the partial disk, in degrees.
* May be null or omitted; default is 360. May be negative.
* @param {boolean} inward If true, the normals generated by this
* method will point away from the positive z-axis; otherwise, toward
* the positive z-axis.  Default is false.
* @return The generated mesh.
*/
Meshes.createPartialDisk=function(inner, outer, slices, loops, start, sweep, inward){
 var mesh=new Mesh();
 if(slices==null)slices=32;
 if(loops==null)loops=1;
 if(start==null)start=0;
 if(sweep==null)sweep=360;
 if(slices<=2)throw new Error("too few slices");
 if(loops<1)throw new Error("too few loops");
 if(inner>outer)throw new Error("inner greater than outer");
 if(inner<0)inner=0;
 if(outer<0)outer=0;
 if(outer==0 || sweep==0)return mesh;
 var fullCircle=(sweep==360 && start==0);
 var sweepDir=sweep<0 ? -1 : 1;
 if(sweep<0)sweep=-sweep;
 sweep%=360;
 if(sweep==0)sweep=360;
 var sc=[];
 var tc=[];
 var twopi=Math.PI*2;
 var arcLength=(sweep==360) ? twopi : sweep*GLMath.PiDividedBy180;
 start=start*GLMath.PiDividedBy180;
 if(sweepDir<0){
  arcLength=-arcLength;
 }
 for(var i=0;i<=slices;i++){
  var t=i*1.0/slices;
  var angle=start+arcLength*t;
  angle=(angle<0) ? twopi-(-angle)%twopi : angle%twopi;
  sc.push(Math.sin(angle),Math.cos(angle));
  tc.push(t);
 }
 if(fullCircle){
  sc[0]=0;
  sc[1]=1;
  sc[sc.length-1]=1;
  sc[sc.length-2]=0;
  tc[0]=0;
  tc[tc.length-1]=1;
 }
 var slicesTimes2=slices*2;
 var height=outer-inner;
  var lastZ=0;
  var lastRad=inner;
  if(inward){
   mesh.normal3(0,0,-1);
  } else {
   mesh.normal3(0,0,1);
  }
  for(var i=0;i<loops;i++){
   var zStart=lastZ;
   var zEnd=(i+1)/loops;
   var radiusStart=lastRad;
   var radiusEnd=inner+height*zEnd;
   var rso=radiusStart/outer;
   var reo=radiusEnd/outer;
   lastZ=zEnd;
   lastRad=radiusEnd;
   var triangleFanBase=(i==0 && inner==0);
   mesh.mode((triangleFanBase) ?
     Mesh.TRIANGLE_FAN : Mesh.QUAD_STRIP);
   for(var k=0,j=0;k<=slicesTimes2;k+=2,j++){
    var tx=tc[j];
    var x,y;
    if((!triangleFanBase) || k==0){
     x=sc[k];
     y=sc[k+1];
     mesh.texCoord2((1+(x*rso))*0.5,(1+(y*rso))*0.5);
     mesh.vertex3(x*radiusStart,y*radiusStart,0);
    }
    x=sc[k];
    y=sc[k+1];
    mesh.texCoord2((1+(x*reo))*0.5,(1+(y*reo))*0.5);
    mesh.vertex3(x*radiusEnd,y*radiusEnd,0);
   }
  }
  return mesh;
}

/**
* Creates a mesh of a torus (donut), centered at the origin.
* See the "{@tutorial shapes}" tutorial.
* @param {number} inner Inner radius (thickness) of the torus.
* @param {number} outer Outer radius of the torus (distance from the
* center to the innermost part of the torus).
* @param {number} lengthwise Number of lengthwise subdivisions.
* May be null or omitted; default is 32.
* @param {number} crosswise Number of crosswise subdivisions.
* May be null or omitted; default is 32.
* @param {boolean} flat If true, will generate normals such that the
* torus will be flat shaded; otherwise, will generate normals such that it
* will be smooth shaded.
* @param {boolean} inward If true, the normals generated by this
* method will point inward; otherwise, outward.  Default is false.
* @return {Mesh} The generated mesh.
*/
Meshes.createTorus=function(inner, outer, lengthwise, crosswise,flat,inward){
 var mesh=new Mesh();
 if(crosswise==null)crosswise=32;
 if(lengthwise==null)lengthwise=32;
 if(crosswise<3)throw new Error("crosswise is less than 3")
 if(lengthwise<3)throw new Error("lengthwise is less than 3")
 if(inner<0||outer<0)throw new Error("inner or outer is less than 0")
 if(outer==0)return mesh;
 if(inner==0)return mesh;
 var tubeRadius=inner;
 var circleRad=outer;
 var twopi=Math.PI*2.0;
 var sci=[];
 var scj=[];
 for(var i = 0; i <= crosswise; i++){
  var u = i*twopi/crosswise;
  sci.push(Math.sin(u),Math.cos(u));
 }
 for(var i = 0; i <= lengthwise; i++){
  var u = i*twopi/lengthwise;
  scj.push(Math.sin(u),Math.cos(u));
 }
 for(var j = 0; j < lengthwise; j++){
  var v0 = (j)/lengthwise;
  var v1 = (j+1.0)/lengthwise;
  var sinr0=scj[j*2];
  var cosr0=scj[j*2+1];
  var sinr1=scj[j*2+2];
  var cosr1=scj[j*2+3];
  mesh.mode(Mesh.TRIANGLE_STRIP);
  for(var i = 0; i <= crosswise; i++){
   var u = i/crosswise;
   var sint=sci[i*2];
   var cost=sci[i*2+1];
   var x = (cost * (circleRad + cosr1 * tubeRadius));
   var y = (sint * (circleRad + cosr1 * tubeRadius));
   var z = (sinr1 * tubeRadius);
   var nx = (cosr1 * cost);
   var ny = (cosr1 * sint);
   var nz = (sinr1);
   mesh.normal3(nx, ny, nz);
   mesh.texCoord2(u, v1);
   mesh.vertex3(x, y, z);
   x = (cost * (circleRad + cosr0 * tubeRadius));
   y = (sint * (circleRad + cosr0 * tubeRadius));
   z = (sinr0 * tubeRadius);
   nx = (cosr0 * cost);
   ny = (cosr0 * sint);
   nz = (sinr0);
   mesh.normal3(nx, ny, nz);
   mesh.texCoord2(u, v0);
   mesh.vertex3(x, y, z);
  }
 }
 return flat ? mesh.recalcNormals(flat, inward) : mesh;
}

/**
* Creates a mesh of a 2D rectangle, centered at the origin.
* See the "{@tutorial shapes}" tutorial.
* @param {number} width Width of the rectangle.
* May be null or omitted; default is 1.
* @param {number} height Height of the rectangle.
* May be null or omitted; default is 1.
* @param {number} widthDiv Number of horizontal subdivisions.
* May be null or omitted; default is 1.
* @param {number} heightDiv Number of vertical subdivisions.
* May be null or omitted; default is 1.
* @param {boolean} inward If true, the normals generated by this
* method will point away from the positive z-axis; otherwise, toward
* the positive z-axis; otherwise, outward.  Default is false.
* @return {Mesh} The generated mesh.
*/
Meshes.createPlane=function(width, height, widthDiv, heightDiv,inward){
 var mesh=new Mesh();
 if(width==null)width=1;
 if(height==null)height=1;
 if(widthDiv==null)widthDiv=1;
 if(heightDiv==null)heightDiv=1;
 if(width<0||height<0)throw new Error("width or height is less than 0")
 if(heightDiv<=0 || widthDiv<=0)
  throw new Error("widthDiv or heightDiv is 0 or less")
 if(width==0 || height==0)return mesh;
 var xStart=-width*0.5;
 var yStart=-height*0.5;
  if(inward){
   mesh.normal3(0,0,-1);
  } else {
   mesh.normal3(0,0,1);
  }
 for(var i=0;i<heightDiv;i++){
  mesh.mode(Mesh.QUAD_STRIP);
  var iStart=i/heightDiv;
  var iNext=(i+1)/heightDiv;
  var y=yStart+height*iStart;
  var yNext=yStart+height*iNext;
  mesh.texCoord2(0,iNext);
  mesh.vertex3(xStart,yNext,0);
  mesh.texCoord2(0,iStart);
  mesh.vertex3(xStart,y,0);
  for(var j=0;j<widthDiv;j++){
   var jx=(j+1)/widthDiv;
   var x=xStart+width*jx;
   mesh.texCoord2(jx,iNext);
   mesh.vertex3(x,yNext,0);
   mesh.texCoord2(jx,iStart);
   mesh.vertex3(x,y,0);
  }
 }
 return mesh;
}

/**
* Creates a mesh of a sphere, centered at the origin.
* See the "{@tutorial shapes}" tutorial.
* @param {number} radius Radius of the sphere.
* May be null or omitted, in which case the default is 1.
* @param {number} slices Number of vertical sections the sphere consists
* of.  This function will create an octahedron if "slices" is 4 and "stacks" is 2.
* Must be 3 or greater. May be null or omitted, in which case the default is 32.
* @param {number} stacks Number of horizontal sections the sphere consists of.
* May be null or omitted, in which case the default is 32.
* @param {boolean} flat If true, will generate normals such that the
* sphere will be flat shaded; otherwise, will generate normals such that the
* sphere will be smooth shaded.
* @param {boolean} inside If true, the normals generated by this
* method will point inward; otherwise, outward.  Should normally be false
* unless the sphere will be viewed from the inside.
* @return {Mesh} The generated mesh.
*/
Meshes.createSphere=function(radius, slices, stacks, flat, inside){
 var mesh=new Mesh();
 if(slices==null)slices=32;
 if(stacks==null)stacks=32;
 if(radius==null)radius=1;
 if(slices<=2)throw new Error("too few slices");
 if(stacks<2)throw new Error("too few stacks");
 if(radius<0)throw new Error("negative radius")
 if(radius==0){
  // radius is zero
  return mesh;
 }
 var normDir=(inside) ? -1 : 1;
 var sc=[0,1]; // sin(0), cos(0)
 var scStack=[];
 var texc=[];
 var tc=[0];
 var twopi=Math.PI*2;
 var pidiv2=Math.PI*0.5;
 for(var i=1;i<slices;i++){
  var t=i*1.0/slices;
  var angle=twopi*t;
  sc.push(Math.sin(angle),Math.cos(angle));
  tc.push(t);
 }
 sc.push(0,1);
 tc.push(1);
 var zEnd=[]
 for(var i=1;i<stacks;i++){
   var origt=i*1.0/stacks;
   var angle=Math.PI*origt;
   var s=Math.sin(angle);
   scStack.push(s);
   zEnd.push(-Math.cos(angle));
   var tex=origt;
   texc.push(tex);
 }
 scStack.push(0); // south pole
 texc.push(1); // south pole
 zEnd.push(1); // south pole
 var slicesTimes2=slices*2;
  var lastZeCen=-1;
  var lastRad=0;
  var lastRadNorm=0;
  var lastTex=0;
  function normAndVertex(m,normDir,x,y,z){
   m.normal3(x*normDir,y*normDir,z*normDir)
   m.vertex3(x,y,z);
  }
  for(var i=0;i<stacks;i++){
   var zsCen=lastZeCen;
   var zeCen=zEnd[i];
   var texStart=lastTex;
   var texEnd=texc[i];
   var zStartHeight=radius*zsCen;
   var zEndHeight=radius*zeCen;
   var zStartNorm=normDir*zsCen;
   var zEndNorm=normDir*zeCen;
   var radiusStart=lastRad;
   var radiusStartNorm=lastRadNorm;
   var radiusEnd=radius*scStack[i];
   var radiusEndNorm=normDir*scStack[i];
   lastZeCen=zeCen;
   lastTex=texEnd;
   lastRadNorm=radiusEndNorm;
   lastRad=radiusEnd;
   if((i==stacks-1 || i==0)){
    mesh.mode(Mesh.TRIANGLES);
   } else {
    mesh.mode(Mesh.QUAD_STRIP);
    mesh.texCoord2(1,texStart);
    normAndVertex(mesh,normDir,0,radiusStart,zStartHeight);
    mesh.texCoord2(1,texEnd);
    normAndVertex(mesh,normDir,0,radiusEnd,zEndHeight);
   }
   var lastTx=0;
   var lastX=0;
   var lastY=1;
   for(var k=2,j=1;k<=slicesTimes2;k+=2,j++){
    var tx=tc[j];
    var x,y;
    if(i==stacks-1){
     var txMiddle=lastTx+(tx-lastTx)*0.5;
     mesh.texCoord2(1-lastTx,texStart);
     normAndVertex(mesh,normDir,lastX*radiusStart,lastY*radiusStart,zStartHeight);
     // point at south pole
     mesh.texCoord2(1-txMiddle,texEnd);
     normAndVertex(mesh,normDir,0,radiusEnd,zEndHeight);
     x=sc[k];
     y=sc[k+1];
     mesh.texCoord2(1-tx,texStart);
     normAndVertex(mesh,normDir,x*radiusStart,y*radiusStart,zStartHeight);
     lastX=x;
     lastY=y;
     lastTx=tx;
    } else if(i==0){
     var txMiddle=lastTx+(tx-lastTx)*0.5;
     // point at north pole
     mesh.texCoord2(1-txMiddle,texStart);
     normAndVertex(mesh,normDir,0,radiusStart,zStartHeight);
     mesh.texCoord2(1-lastTx,texEnd);
     normAndVertex(mesh,normDir,lastX*radiusEnd,lastY*radiusEnd,zEndHeight);
     x=sc[k];
     y=sc[k+1];
     mesh.texCoord2(1-tx,texEnd);
     normAndVertex(mesh,normDir,x*radiusEnd,y*radiusEnd,zEndHeight);
     lastX=x;
     lastY=y;
     lastTx=tx;
    } else {
     x=sc[k];
     y=sc[k+1];
     mesh.texCoord2(1-tx,texStart);
     normAndVertex(mesh,normDir,x*radiusStart,y*radiusStart,zStartHeight);
     mesh.texCoord2(1-tx,texEnd);
     normAndVertex(mesh,normDir,x*radiusEnd,y*radiusEnd,zEndHeight);
    }
   }
  }
 return flat ? mesh.recalcNormals(flat,inside) : mesh.normalizeNormals();
}
this["Meshes"]=Meshes;
