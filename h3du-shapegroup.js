/* global H3DU */

/**
* Represents a grouping of shapes.
* @class
* @alias H3DU.ShapeGroup
*/
H3DU.ShapeGroup = function(){
 /** List of shapes contained in this group.
 * This property should only be used to access properties
 * and call methods on each shape, and not to add, remove
 * or replace shapes directly.
 * @readonly
 */
 "use strict";
this.shapes=[];
 this.parent=null;
 this.visible=true;
 this.transform=new H3DU.Transform();
};
/**
* Adds a 3D shape to this shape group.  Its reference, not a copy,
* will be stored in the list of shapes.
* @param {H3DU.Shape|H3DU.ShapeGroup} shape A 3D shape.
* @returns {H3DU.ShapeGroup} This object.
* @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.addShape=function(shape){
 "use strict";
shape.parent=this;
 this.shapes.push(shape);
 return this;
};
/**
 * Not documented yet.
 * @param {*} value
 * @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.setVisible=function(value){
 "use strict";
this.visible=!!value;
 return this;
};
/**
 * Not documented yet.
 * @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.getVisible=function(){
 "use strict";
return this.visible;
};
/**
 * Gets a reference to the transform used by this shape group object.
 * @returns {H3DU.Transform} Return value.
* @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.getTransform=function(){
 "use strict";
return this.transform;
};
/**
 * Gets a copy of the transformation needed to transform
 * this shape group's coordinates to world coordinates.
 * @returns {H3DU.Transform} A 4x4 matrix.
 * @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.getMatrix=function(){
  "use strict";
var xform=this.getTransform();
  var thisIdentity=xform.isIdentity();
  var mat;
  if(this.parent !== null){
   var pmat=this.parent.getMatrix();
   if(thisIdentity){
    mat=H3DU.Math.mat4multiply(pmat,xform.getMatrix());
   } else if(H3DU.Math.mat4isIdentity(pmat)){
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
 * shapes can set their own transforms, in which case the
 * rendering process will multiply this shape group's transform
 * with the child shape's transform as it renders the child shape.
 * @param {H3DU.Transform} transform
 * @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.setTransform=function(transform){
 "use strict";
this.transform=transform.copy();
 return this;
};
/**
 * Sets the material used by all shapes in this shape group.
 * @param {H3DU.Material} material
 * @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.setMaterial=function(material){
 "use strict";
for(var i=0;i<this.shapes.length;i++){
  this.shapes[i].setMaterial(material);
 }
 return this;
};

/**
 * Sets the texture used by all shapes in this shape group.
 * @param {H3DU.Material} material
 * @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.setTexture=function(material){
 "use strict";
for(var i=0;i<this.shapes.length;i++){
  this.shapes[i].setTexture(material);
 }
 return this;
};
/**
 * Sets the shader program used by all shapes in this shape group.
 * @param {H3DU.Material} material
 * @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.setShader=function(material){
 "use strict";
for(var i=0;i<this.shapes.length;i++){
  this.shapes[i].setShader(material);
 }
 return this;
};
/**
 * Sets material parameters for all shapes in this shape group.
 * @ {Object} params An object described in {@link H3DU.Material#setParams}.
 * @ {H3DU.Shape} This object.
 * @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.setMaterialParams=function(params){
 "use strict";
for(var i=0;i<this.shapes.length;i++){
  this.shapes[i].setMaterialParams(params);
 }
 return this;
};
/**
* Removes all instances of a 3D shape from this shape group
* @param {H3DU.Shape|H3DU.ShapeGroup} shape The 3D shape to remove.
* @returns {H3DU.ShapeGroup} This object.
* @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.removeShape=function(shape){
 "use strict";
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
 * @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.getBounds=function(){
 "use strict";
var ret=[0,0,0,0,0,0];
 var first=true;
 for(var i=0;i<this.shapes.length;i++){
  var b=this.shapes[i].getBounds();
  if(!H3DU.Math.boxIsEmpty(b)){
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
 * @returns {Number} Return value.
* @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.vertexCount=function(){
 "use strict";
var c=0;
 for(var i=0;i<this.shapes.length;i++){
  c+=this.shapes[i].vertexCount();
 }
 return c;
};
/**
 * Gets the number of primitives (triangles, lines,
* and points) composed by all shapes in this shape group.
 * @returns {Number} Return value.
* @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.primitiveCount=function(){
 "use strict";
var c=0;
 for(var i=0;i<this.shapes.length;i++){
  c+=this.shapes[i].primitiveCount();
 }
 return c;
};
/**
 * Sets the relative position of the shapes in this group
 * from their original position.
 * See {@link H3DU.Transform#setPosition}
 * This method will modify this shape group's transform
 * rather than the transform for each shape in the group.
 * @param {number|Array<Number>} x X coordinate
 * or a 3-element position array, as specified in {@link H3DU.Transform#setScale}.
 * @param {Number} y Y-coordinate.
 * @param {Number} z Z-coordinate.
* @returns {H3DU.Scene3D} This object.
 * @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.setPosition=function(x,y,z){
 "use strict";
this.transform.setPosition(x,y,z);
 return this;
};
/**
 * Sets this shape group's orientation in the form of a [quaternion]{@tutorial glmath}.
 * See {@link H3DU.Transform#setQuaternion}.
 * This method will modify this shape group's transform
 * rather than the transform for each shape in the group.
 * @param {Array<Number>} quat A four-element array describing the rotation.
 * @returns {H3DU.Shape} This object.
 * @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.setQuaternion=function(quat){
 "use strict";
this.transform.setQuaternion(quat);
 return this;
};
/**
 * Sets the scale of this shape group relative to its original
 * size. See {@link H3DU.Transform#setScale}.
 * This method will modify this shape group's transform
 * rather than the transform for each shape in the group.
 * @param {number|Array<Number>} x Scaling factor for this object's width,
 * or a 3-element scaling array, as specified in {@link H3DU.Transform#setScale}.
 * @param {Number} y Scaling factor for this object's height.
 * @param {Number} z Scaling factor for this object's depth.
* @returns {H3DU.Scene3D} This object.
 * @memberof! H3DU.ShapeGroup#
*/
H3DU.ShapeGroup.prototype.setScale=function(x,y,z){
 "use strict";
this.transform.setScale(x,y,z);
 return this;
};