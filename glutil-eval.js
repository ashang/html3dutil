/*
Written by Peter O. in 2015.

Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/
If you like this, you should donate to Peter O.
at: http://upokecenter.dreamhosters.com/articles/donate-now-2/
*/
/* global GLMath, Mesh */
(function(global){
"use strict";
/**
 * A parametric evaluator for B&eacute;zier curves.<p>
 * A B&eacute;zier curve is defined by a series of control points, where
 * the first and last control points define the endpoints of the curve, and
 * the remaining control points define the curve's shape, though they don't
 * necessarily cross the curve.
 * @class
 * @alias BezierCurve
 * @param {Array<Array<number>>} controlPoints An array of control points.  Each
 * control point is an array with the same length as the other control points.
 * It is assumed that:<ul>
 * <li>The length of this parameter minus 1 represents the degree of the B&eacute;zier
 * curve.  For example, a degree-3 (cubic) curve
 * contains 4 control points.  A degree of 1 results in a straight line segment.
 * <li>The first control point's length represents the size of all the control
 * points.
 * </ul>
 * @param {number} [u1] Starting point for the purpose of interpolation; it will correspond to 0.
 * May be omitted; default is 0.
 * @param {number} [u2] Ending point for the purpose of interpolation; it will correspond to 1.
 * May be omitted; default is 1.
 */
var BezierCurve=function(cp, u1, u2){
 if(typeof u1==="undefined" && typeof u2==="undefined"){
  this.uoffset=0;
  this.umul=1;
 } else if(u1===u2){
  throw new Error("u1 and u2 can't be equal");
 } else {
  this.uoffset=u1;
  this.umul=1.0/(u2-u1);
 }
 this.evaluator=BSplineCurve.clamped(cp,cp.length-1);
};
/**
 * Evaluates the curve function based on a point
 * in a B&eacute;zier curve.
 * @param {number} u Point on the curve to evaluate (generally within the range
 * given in the constructor).
 * @return {Array<number>} An array of the result of
 * the evaluation.  Its length will be equal to the
 * length of a control point, as specified in the constructor.
* @example
* // Generate 11 points forming the B&eacute;zier curve.
* // Assumes the curve was created with u1=0 and u2=1 (the default).
* var points=[];
* for(var i=0;i<=10;i++){
*  points.push(curve.evaluate(i/10.0));
* }
 */
BezierCurve.prototype.evaluate=function(u){
 return this.evaluator.evaluate((u-this.uoffset)*this.umul);
};
/**
 * A parametric evaluator for B&eacute;zier surfaces.<p>
 * A B&eacute;zier surface is defined by a series of control points, where
 * the control points on each corner define the endpoints of the surface, and
 * the remaining control points define the surface's shape, though they don't
 * necessarily cross the surface.
 * @class
 * @alias BezierSurface
 * @param {Array<Array<number>>} controlPoints An array of control point
 * arrays, which in turn contain a number of control points.  Each
 * control point is an array with the same length as the other control points.
 * It is assumed that:<ul>
 * <li>The length of this parameter minus 1 represents the degree of the B&eacute;zier
 * surface along the V axis.  For example, a degree-3 (cubic) surface along the V axis
 * contains 4 control points, one in each control point array.  A degree of 1 on
 * both the U and V axes results in a flat surface.
 * <li>The length of the first control point array minus 1 represents the degree of the B&eacute;zier
 * surface along the U axis.
 * <li>The first control point's length represents the size of all the control
 * points.
 * </ul>
 * @param {number} [u1] Starting point for the purpose of interpolation along the
 * U-axis; it will correspond to 0.
 * May be omitted; default is 0.
 * @param {number} [u2] Ending point for the purpose of interpolation along the
 * U-axis; it will correspond to 1.
 * May be omitted; default is 1.
 * @param {number} [v1] Starting point for the purpose of interpolation along the
 * V-axis; it will correspond to 0.
 * May be omitted; default is 0.
 * @param {number} [v2] Ending point for the purpose of interpolation along the
 * V-axis; it will correspond to 1.
 * May be omitted; default is 1.
 */
var BezierSurface=function(cp, u1, u2, v1, v2){
 if(typeof u1==="undefined" && typeof u2==="undefined" &&
    typeof v1==="undefined" && typeof v2==="undefined"){
  this.uoffset=0;
  this.umul=1;
  this.voffset=0;
  this.vmul=1;
 } else if(u1===u2){
  throw new Error("u1 and u2 can't be equal");
 } else if(v1===v2){
  throw new Error("v1 and v2 can't be equal");
 } else {
  this.uoffset=u1;
  this.umul=1.0/(u2-u1);
  this.voffset=v1;
  this.vmul=1.0/(v2-v1);
 }
 this.evaluator=BSplineSurface.clamped(cp,cp[0].length-1,cp.length-1);
};
/**
 * Evaluates the surface function based on a point
 * in a B&eacute;zier surface.
 * @param {number} u U-coordinate of the surface to evaluate (generally within the range
 * given in the constructor).
 * @param {number} v V-coordinate of the surface to evaluate.
 * @return {Array<number>} An array of the result of
 * the evaluation.  Its length will be equal to the
 * length of a control point, as specified in the constructor.
 */
 BezierSurface.prototype.evaluate=function(u,v, output){
 return this.evaluator.evaluate((u-this.uoffset)*this.umul,
   (v-this.voffset)*this.vmul);
};

/**
* A parametric evaluator for B-spline (basis spline) curves.
* @class
* @alias BSplineCurve
 * @param {Array<Array<number>>} controlPoints An array of control points.  Each
 * control point is an array with the same length as the other control points.
 * It is assumed that the first control point's length represents the size of all the control
 * points.
* @param {Array<number>} knots Knot vector of the curve.
* Its size must be at least 2 plus the number of control
* points and not more than twice the number of control points.<p>
* The length of this parameter minus 1, minus the number
* of control points, represents the degree of the B-spline
* curve.  For example, a degree-3 (cubic) B-spline curve contains 4 more
* knots than the number of control points.  A degree of 1
* results in straight line segments.<p>
* The knot vector must be a monotonically nondecreasing sequence and
* the first knot must not equal the last.<p>
* If the difference between one knot and the next isn't the same,
* the curve is considered a <i>non-uniform</i>
* B-spline curve.<p>
* If there are N times 2 knots with the first N knots equal to 0 and the rest
* equal to 1, where N is the number of control points,
* the control points describe a <i>B&eacute;zier</i> curve, in which the
* first and last control points match the curve's end points.<p>
* @param {boolean} [bits] Bits for defining input
* and controlling output.  Zero or more of BSplineCurve.WEIGHTED_BIT,
* BSplineCurve.HOMOGENEOUS_BIT,
* and BSplineCurve.DIVIDE_BIT. If null or omitted, no bits are set.
*/
var BSplineCurve=function(controlPoints, knots, bits){
 if(controlPoints.length<=0)throw new Error();
 if(!knots)throw new Error();
 this.bits=bits||0;
 var order=knots.length-controlPoints.length;
 if(order<2 || order>controlPoints.length)
  throw new Error();
 BSplineCurve._checkKnots(knots);
 this.cplen=controlPoints[0].length;
 var cplenNeeded=1;
 if((this.bits&(BSplineCurve.WEIGHTED_BIT|BSplineCurve.DIVIDE_BIT))!==0){
  cplenNeeded=2;
 }
 if((this.bits&(BSplineCurve.WEIGHTED_BIT))!==0){
  this.cplen--;
 }
 if(this.cplen<cplenNeeded)throw new Error();
 this.knots=knots;
 this.buffer=[];
 this.controlPoints=controlPoints;
};

/**
* Indicates whether the last coordinate of each control point is a
* weight.  If some of the weights differ, the curve is
* considered a <i>rational</i> B-spline curve.
* If this bit is set, the length of each control point must be at least 2,
* and points returned by the curve's <code>evaluate</code>
* method will be in homogeneous coordinates.
* @const
* @default
*/
BSplineCurve.WEIGHTED_BIT = 1;
/**
* Indicates to divide each other coordinate of the returned point
* by the last coordinate of the point and omit the last
* coordinate.  This is used with WEIGHTED_BIT to convert
* homogeneous coordinates to conventional coordinates.
* If this bit is set, the length of each control point must be at least 2.
* @const
* @default
*/
BSplineCurve.DIVIDE_BIT = 2;
/**
* Indicates that each other coordinate of each control point
* was premultiplied by the last coordinate of the point, that is,
* each control point is in homogeneous coordinates.
* Only used with WEIGHTED_BIT.
* @const
* @default
*/
BSplineCurve.HOMOGENEOUS_BIT = 4;
/**
* Combination of WEIGHTED_BIT and DIVIDE_BIT.
* @const
*/
BSplineCurve.WEIGHTED_DIVIDE_BITS = 3;

BSplineCurve._checkKnots=function(knots){
 for(var i=1;i<knots.length;i++){
  if(knots[i]<knots[i-1])
   throw new Error();
 }
 if(knots[0]===knots[knots.length-1])throw new Error();
};
BSplineCurve._getFactors=function(kn,t,order,numPoints,buffer){
 var c=1;
 for(var i=0;i<numPoints;i++){
   buffer[i]=0;
 }
 if(t===kn[0]){
  buffer[0]=1;
 } else if(t===kn[kn.length-1]){
  buffer[numPoints-1]=1;
 } else {
  var k=-1;
  for(i=0;i<=kn.length;i++){
    if(kn[i]<=t && t<kn[i+1]){
      k=i;
      break;
    }
  }
  if(k<0)return;
  var tmp=[];
  c=k-1;
  tmp[k]=1;
  for(var kk=2;kk<=order;kk++,c--){
   for(i=c;i<=k;i++){
    var ret=0,divisor=0;
    var prv=(i<=c) ? 0 : tmp[i];
    var nxt=(i>=k) ? 0 : tmp[i+1];
    if(prv!==0){
     divisor=kn[i+kk-1]-kn[i];
     ret+=divisor===0 ? 0 : prv*(t-kn[i])/divisor;
    }
    if(nxt!==0){
     var ikk=kn[i+kk];
     divisor=ikk-kn[i+1];
     ret+=divisor===0 ? 0 : nxt*(ikk-t)/divisor;
    }
    buffer[i]=ret;
   }
   if(kk<order){
    for(i=c;i<=k;i++){
     tmp[i]=buffer[i];
    }
   }
  }
 }
};

/**
 * Evaluates the curve function based on a point
 * in a B-spline curve.
 * @param {number} u Point on the curve to evaluate (from 0 through 1).
 * @return {Array<number>} An array of the result of
 * the evaluation.  Its length will be equal to the
 * length of a control point (minus 1 if DIVIDE_BIT is set), as specified in the constructor.
* @example
* // Generate 11 points forming the B-spline curve.
* var points=[];
* for(var i=0;i<=10;i++){
*  points.push(curve.evaluate(i/10.0));
* }
 */
BSplineCurve.prototype.evaluate=function(u){
  var numPoints=this.controlPoints.length;
  var order=this.knots.length-numPoints;
  var oldu=u;
  u=this.knots[order-1]+u*(this.knots[numPoints]-
    this.knots[order-1]);
  BSplineCurve._getFactors(this.knots, u, order, numPoints,
     this.buffer);
  var ret=[];
  var i,j,point;
  if((this.bits&BSplineCurve.WEIGHTED_BIT)!==0){
  // this is a weighted NURBS
  var weight=0;
  for(j=0;j<numPoints;j++){
   weight+=this.buffer[j]*this.controlPoints[j][this.cplen];
  }
  var homogen=(this.bits&BSplineCurve.HOMOGENEOUS_BIT)!==0;
  for(i=0;i<this.cplen+1;i++){
   point=0;
   for(j=0;j<numPoints;j++){
    var w=this.buffer[j];
    if(!homogen)w*=this.controlPoints[j][this.cplen];
    point+=this.controlPoints[j][i]*w;
   }
   ret[i]=point/weight;
  }
  if((this.bits&BSplineCurve.DIVIDE_BIT)!==0){
   for(i=0;i<this.cplen;i++){
    ret[i]/=ret[this.cplen];
   }
   ret=ret.slice(0,this.cplen);
  }
  return ret;
 } else {
  ret=[];
  for(i=0;i<this.cplen;i++){
   point=0;
   for(j=0;j<numPoints;j++){
    point+=this.controlPoints[j][i]*this.buffer[j];
   }
   ret[i]=point;
  }
  if((this.bits&BSplineCurve.DIVIDE_BIT)!==0){
   for(i=0;i<this.cplen-1;i++){
    ret[i]/=ret[this.cplen-1];
   }
   ret=ret.slice(0,this.cplen-1);
  }
  return ret;
 }
};

/**
* A parametric evaluator for B-spline (basis spline) surfaces.
* @class
* @alias BSplineSurface
 * @param {Array<Array<number>>} controlPoints An array of control point
 * arrays, which in turn contain a number of control points.  Each
 * control point is an array with the same length as the other control points.
 * It is assumed that:<ul>
 * <li>The length of this parameter is the number of control points in each row of
 * the V axis.
 * <li>The length of the first control point array is the number of control points in
* each column of the U axis.
 * <li>The first control point's length represents the size of all the control
 * points.
 * </ul>
* @param {Array<number>} knotsU Knot vector of the curve, along the U-axis.
* For more information, see {@link glutil.BSplineCurve}.
* @param {Array<number>} knotsV Knot vector of the curve, along the V-axis.
* @param {boolean} [bits] Bits for defining input
* and controlling output.  Zero or more of BSplineCurve.WEIGHTED_BIT,
* BSplineCurve.HOMOGENEOUS_BIT,
* and BSplineCurve.DIVIDE_BIT.  If null or omitted, no bits are set.
*/
var BSplineSurface=function(controlPoints, knotsU, knotsV, bits){
 var vcplen=controlPoints.length;
 if(vcplen<=0)throw new Error();
 var ucplen=controlPoints[0].length;
 if(ucplen<=0)throw new Error();
 var cplen=controlPoints[0][0].length;
 var cplenNeeded=1;
 this.bits=bits||0;
 if((this.bits&(BSplineCurve.WEIGHTED_BIT|BSplineCurve.DIVIDE_BIT))!==0){
  cplenNeeded=2;
 }
 if((this.bits&(BSplineCurve.WEIGHTED_BIT|BSplineCurve.HOMOGENEOUS_BIT))!==0){
  cplen--;
 }
 if(cplen<cplenNeeded)throw new Error();
 if(!knotsU || !knotsV)throw new Error();
 this.orderU=knotsU.length-ucplen;
 this.orderV=knotsV.length-vcplen;
 this.vcplen=vcplen;
 this.ucplen=ucplen;
 this.cplen=cplen;
 if(this.orderU<2 || this.orderU>ucplen)throw new Error();
 if(this.orderV<2 || this.orderV>vcplen)throw new Error();
 BSplineCurve._checkKnots(knotsU);
 BSplineCurve._checkKnots(knotsV);
 this.knotsU=knotsU;
 this.knotsV=knotsV;
 this.bufferU=[];
 this.bufferV=[];
 this.controlPoints=controlPoints;
};
/**
* Creates a B-spline curve with uniform knots, except that
* the curve will start and end at the first and last control points.
* @param {Array<Array<number>>} controlPoints Array of
* control points as specified in the {@link glutil.BSplineCurve} constructor.
* @param {number} [degree] Degree of the B-Spline
* curve.  For example, 3 means a degree-3 (cubic) curve.
* If null or omitted, the default is 3.
* @param {number} [bits] Bits as specified in the {@link glutil.BSplineCurve} constructor.
* @return {BSplineCurve} Return value.*/
BSplineCurve.clamped=function(controlPoints,degree,bits){
 return new BSplineCurve(controlPoints,
   BSplineCurve.clampedKnots(controlPoints.length,degree),bits);
};
/**
* Creates a B-spline curve with uniform knots.
* @param {Array<Array<number>>} controlPoints Array of
* control points as specified in the {@link glutil.BSplineCurve} constructor.
* @param {number} [degree] Degree of the B-Spline
* curve.  For example, 3 means a degree-3 (cubic) curve.
* If null or omitted, the default is 3.
* @param {number} [bits] Bits as specified in the {@link glutil.BSplineCurve} constructor.
* @return {BSplineCurve} Return value.*/
BSplineCurve.uniform=function(controlPoints,degree,bits){
 return new BSplineCurve(controlPoints,
   BSplineCurve.uniformKnots(controlPoints.length,degree),bits);
};
/**
* Creates a B-spline surface with uniform knots, except that
* the surface's edges lie on the edges of the control point array.
* @param {Array<Array<Array<number>>>} controlPoints Array of
* control point arrays as specified in the {@link glutil.BSplineSurface} constructor.
* @param {number} [degreeU] Degree of the B-Spline
* surface along the U-axis.  For example, 3 means a degree-3 (cubic) curve.
* If null or omitted, the default is 3.
* @param {number} [degreeV] Degree of the B-Spline
* surface along the V-axis
* If null or omitted, the default is 3.
* @param {number} [bits] Bits as specified in the {@link glutil.BSplineSurface} constructor.
* @return {BSplineSurface} Return value.*/
BSplineSurface.clamped=function(controlPoints,degreeU,degreeV,bits){
 return new BSplineSurface(controlPoints,
   BSplineCurve.clampedKnots(controlPoints[0].length,degreeU),
   BSplineCurve.clampedKnots(controlPoints.length,degreeV),bits);
};
/**
* Creates a B-spline surface with uniform knots.
* @param {Array<Array<Array<number>>>} controlPoints Array of
* control point arrays as specified in the {@link glutil.BSplineSurface} constructor.
* @param {number} [degreeU] Degree of the B-Spline
* surface along the U-axis.  For example, 3 means a degree-3 (cubic) curve.
* If null or omitted, the default is 3.
* @param {number} [degreeV] Degree of the B-Spline
* surface along the V-axis
* If null or omitted, the default is 3.
* @param {number} [bits] Bits as specified in the {@link glutil.BSplineSurface} constructor.
* @return {BSplineSurface} Return value.*/
BSplineSurface.uniform=function(controlPoints,degreeU,degreeV,bits){
 return new BSplineSurface(controlPoints,
   BSplineCurve.uniformKnots(controlPoints[0].length,degreeU),
   BSplineCurve.uniformKnots(controlPoints.length,degreeV),bits);
};
/**
* Not documented yet.
*/
BSplineCurve.uniformKnots=function(controlPoints,degree){
  if(typeof controlPoints==="object")
   controlPoints=controlPoints.length;
  if((degree===null || typeof degree==="undefined"))degree=3;
  if(controlPoints<degree+1)
   throw new Error("too few control points for degree "+degree+" curve");
  var order=degree+1;
  var ret=[];
  for(var i=0;i<controlPoints+order;i++){
   ret.push(i);
  }
  return ret;
};
/**
* Not documented yet.
*/
BSplineCurve.clampedKnots=function(controlPoints,degree){
  if(typeof controlPoints==="object")
   controlPoints=controlPoints.length;
  if((degree===null || typeof degree==="undefined"))degree=3;
  if(controlPoints<degree+1)
   throw new Error("too few control points for degree "+degree+" curve");
  var order=degree+1;
  var extras=controlPoints-order;
  var ret=[];
  for(var i=0;i<order;i++){
   ret.push(0);
  }
  for(i=0;i<extras;i++){
   ret.push(i+1);
  }
  for(i=0;i<order;i++){
   ret.push(extras+1);
  }
  return ret;
};

/**
 * Evaluates the surface function based on a point
 * in a B-spline surface.
 * @param {number} u U-coordinate of the surface to evaluate (from 0 through 1).
 * @param {number} v V-coordinate of the surface to evaluate.
 * @return {Array<number>} An array of the result of
 * the evaluation.  Its length will be equal to the
 * length of a control point (minus 1 if if DIVIDE_BIT is set), as specified in the constructor.
 */
BSplineSurface.prototype.evaluate=function(u,v){
  u=this.knotsU[this.orderU-1]+u*(this.knotsU[this.ucplen]-
    this.knotsU[this.orderU-1]);
  v=this.knotsV[this.orderV-1]+v*(this.knotsV[this.vcplen]-
    this.knotsV[this.orderV-1]);
  var bu=this.bufferU;
  var bv=this.bufferV;
  var tt,uu,w,i,value;
  if(this.orderU===this.orderV){
   BSplineCurve._getFactors(this.knotsU, u, this.orderU, this.ucplen,
     this.bufferU);
   BSplineCurve._getFactors(this.knotsV, v, this.orderV, this.vcplen,
     this.bufferV);
  } else {
   BSplineCurve._getFactors(this.knotsU, u, this.orderU, this.ucplen,
     this.bufferU);
   BSplineCurve._getFactors(this.knotsV, v, this.orderV, this.vcplen,
     this.bufferV);
  }
 var output=[];
  if((this.bits&BSplineCurve.WEIGHTED_BIT)!==0){
  // this is a weighted NURBS
  var weight=0;
  var homogen=(this.bits&BSplineCurve.HOMOGENEOUS_BIT)!==0;
  for(tt=0;tt<this.ucplen;tt++){
    for(uu=0;uu<this.vcplen;uu++){
     w=bu[tt]*bv[uu]*this.controlPoints[uu][tt][this.cplen];
     weight+=w;
    }
  }
  for(i=0;i<this.cplen+1;i++){
   value=0;
   weight=0;
   for(tt=0;tt<this.ucplen;tt++){
    for(uu=0;uu<this.vcplen;uu++){
     w=bu[tt]*bv[uu];
     if(!homogen)w*=this.controlPoints[uu][tt][this.cplen];
     value+=this.controlPoints[uu][tt][i]*w;
    }
   }
   output[i]=(weight===0) ? value : value/weight;
  }
  if((this.bits&BSplineCurve.DIVIDE_BIT)!==0){
   for(i=0;i<this.cplen;i++){
    output[i]/=output[this.cplen];
   }
   output=output.slice(0,this.cplen);
  }
  return output;
 } else {
  for(i=0;i<this.cplen;i++){
   value=0;
   for(tt=0;tt<this.ucplen;tt++){
    for(uu=0;uu<this.vcplen;uu++){
     value+=this.controlPoints[uu][tt][i]*bu[tt]*bv[uu];
    }
   }
   output[i]=value;
  }
  if((this.bits&BSplineCurve.DIVIDE_BIT)!==0){
   for(i=0;i<this.cplen-1;i++){
    output[i]/=output[this.cplen-1];
   }
   output=output.slice(0,this.cplen-1);
  }
  return output;
 }
};

/**
* An evaluator of parametric curve functions for generating
* vertex positions, normals, colors, and texture coordinates
* of a curve.<p>
* A parametric curve is a curve whose points are based on a
* parametric curve function.  A curve function takes a number
* (U) and returns a point (in 1, 2, 3 or more dimensions, but
* usually 2 or 3) that lies on the curve.  For example, in 3
* dimensions, a curve function has the following form:<p>
* <b>F</b>(u) = [ x(u), y(u), z(u) ]<p>
* where x(u) returns an X coordinate, y(u) a Y coordinate,
* and z(u) returns a Z coordinate.<p>
* For more information, see the {@tutorial surfaces} tutorial.
* @class
* @alias CurveEval
*/
var CurveEval=function(){
 this.colorCurve=null;
 this.normalCurve=null;
 this.texCoordCurve=null;
 this.vertexCurve=null;
};

/**
* Specifies a parametric curve function for generating vertex positions.
* @param {object} evaluator An object that must contain a function
* named "evaluate".  It takes the following parameter:<ul>
* <li><code>u</code> - A curve coordinate, generally from 0 to 1.
* </ul>
* The evaluator function returns an array of the result of the evaluation.
* @return {CurveEval} This object.
* @example <caption>The following function sets a circle as the curve
* to use for generating vertex positions.</caption>
* // "u" can range from 0 to 2*Math.PI
* curveEval.vertex({"evaluate":function(u){
*  return [Math.cos(u),Math.sin(u),0]
* }});
*/
CurveEval.prototype.vertex=function(evaluator){
 this.vertexCurve=evaluator;
 return this;
};
/**
* Specifies a parametric curve function for generating normals.
* @param {object} evaluator An object that must contain a function
* named "evaluate", giving 3 values as a result.  See {@link CurveEval#vertex}.
* </ul>
* @return {CurveEval} This object.
*/
CurveEval.prototype.normal=function(evaluator){
 this.normalCurve=evaluator;
 return this;
};
/**
* Specifies a parametric curve function for generating color values.
* @param {object} evaluator An object that must contain a function
* named "evaluate", giving 3 values as a result.  See {@link CurveEval#vertex}.
* </ul>
* @return {CurveEval} This object.
*/
CurveEval.prototype.color=function(evaluator){
 this.colorCurve=evaluator;
 return this;
};
/**
* Specifies a parametric curve function for generating texture coordinates.
* @param {object} evaluator An object that must contain a function
* named "evaluate", giving 2 values as a result.  See {@link CurveEval#vertex}.
* </ul>
* @return {CurveEval} This object.
*/
CurveEval.prototype.texCoord=function(evaluator){
 this.texCoordCurve=evaluator;
 return this;
};
/**
 * Generates vertex positions and attributes based on a point
 * in a parametric curve.
 * @param {glutil.Mesh} mesh Mesh where vertex positions and attributes
 * will be generated.  When this method returns, the current color, normal,
 * and texture coordinates will be the same as they were before the method
 * started.
 * @param {number} u Point of the curve to evaluate (for
 * B&eacute;zier curves, generally within the range
 * given in the <code>vectorBezier</code>, <code>normalBezier</code>,
 * <code>colorBezier</code>, and <code>texCoordBezier</code> methods).
 * @return {CurveEval} This object.
 */
CurveEval.prototype.evalOne=function(mesh,u){
 var color=null;
 var normal=null;
 var texcoord=null;
 if(this.colorCurve){
  color=this.colorCurve.evaluate(u);
 }
 if(this.texCoordCurve){
  texcoord=this.texCoordCurve.evaluate(u);
  if(texcoord.length === 1)texcoord.push(0);
 }
 if(this.normalCurve){
  normal=this.normalCurve.evaluate(u);
 }
 if(this.vertexCurve){
  var oldColor=(color) ? mesh.color.slice(0,3) : null;
  var oldNormal=(normal) ? mesh.normal.slice(0,3) : null;
  var oldTexCoord=(texcoord) ? mesh.texCoord.slice(0,2) : null;
  if(color)mesh.color3(color[0],color[1],color[2]);
  if(normal)mesh.normal3(normal[0],normal[1],normal[2]);
  if(texcoord)mesh.texCoord2(texcoord[0],texcoord[1]);
  var vertex=this.vertexCurve.evaluate(u);
  if(vertex.length === 2)
   mesh.vertex3(vertex[0],vertex[1],0.0);
  else
   mesh.vertex3(vertex[0],vertex[1],vertex[2]);
  if(oldColor)mesh.color3(oldColor[0],oldColor[1],oldColor[2]);
  if(oldNormal)mesh.normal3(oldNormal[0],oldNormal[1],oldNormal[2]);
  if(oldTexCoord)mesh.texCoord2(oldTexCoord[0],oldTexCoord[1]);
 }
 return this;
};
/**
 * Generates vertices and attribute values that follow a parametric curve
 * function.
 * @param {glutil.Mesh} mesh A geometric mesh where the vertices will be
 * generated.
 * @param {number} [mode] If this value is Mesh.LINES, or is null
* or omitted, generates
 * a series of lines defining the curve. If this value is Mesh.POINTS,
 * generates a series of points along the curve.  For any other value,
 * this method has no effect.
 * @param {number} [n] Number of subdivisions of the curve to be drawn.
 * May be omitted; default is 24.
 * @param {number} [u1] Starting point of the curve (within the range
 * given in the <code>vector</code>, <code>normal</code>,
 * <code>color</code>, and <code>texCoord</code> methods).
 *May be omitted; default is 0.
 * @param {number} [u2] Ending point of the curve (within the range
 * given in the <code>vector</code>, normal</code>,
 * <code>color</code>, and <code>texCoord</code> methods).
 *May be omitted; default is 1.
 * @return {CurveEval} This object.
 */
CurveEval.prototype.evalCurve=function(mesh,mode,n,u1,u2){
 if(typeof n==="undefined")n=24;
 if(n<=0)throw new Error("invalid n");
 if(typeof u1==="undefined" && typeof u2==="undefined"){
  u1=0.0;
  u2=1.0;
 }
 if((mode===null || typeof mode==="undefined"))mode=Mesh.LINES;
 if(mode===Mesh.POINTS)
  mesh.mode(Mesh.POINTS);
 else if(mode===Mesh.LINES)
  mesh.mode(Mesh.LINE_STRIP);
 else return this;
 var uv=(u2-u1)/n;
 for(var i=0; i<=n; i++){
  this.evalOne(mesh, u1+i*uv);
 }
 return this;
};
/**
* An evaluator of parametric functions for generating
* vertex positions, normals, colors, and texture coordinates
* of a surface.<p>
* A parametric surface is a surface whose points are based on a
* parametric surface function.  A surface function takes two numbers
* (U and V) and returns a point (in 1, 2, 3 or more dimensions, but
* usually 2 or 3) that lies on the surface.  For example, in 3
* dimensions, a surface function has the following form:<p>
* <b>F</b>(u, v) = [ x(u, v), y(u, v), z(u, v) ]<p>
* where x(u, v) returns an X coordinate, y(u, v) a Y coordinate,
* and z(u, v) returns a Z coordinate.<p>
* For more information, see the {@tutorial surfaces} tutorial.
* @class
* See the {@tutorial surfaces} tutorial for more information.
* @class
* @alias glutil.SurfaceEval
*/
var SurfaceEval=function(){
 this.colorSurface=null;
 this.normalSurface=null;
 this.texCoordSurface=null;
 this.vertexSurface=null;
 this.autoNormal=false;
};
/**
 * Sets whether this object will automatically generate
 * normals rather than use the parametric evaluator
 * specified for normal generation, if any.
 * By default, normals won't be generated automatically.
 * @param {boolean} value Either true or false.  True means normals
 * will automatically be generated; false means they won't.
 * @return {SurfaceEval} This object.
 */
SurfaceEval.prototype.setAutoNormal=function(value){
 this.autoNormal=!!value;
 return this;
};
/**
* Specifies a parametric surface function for generating vertex positions.
* @param {object} evaluator An object that must contain a function
* named "evaluate".  It takes the following parameters in this order:<ul>
* <li><code>u</code> - Horizontal-axis coordinate, generally from 0 to 1.
* <li><code>v</code> - Vertical-axis coordinate, generally from 0 to 1.
* </ul>
* The evaluator function returns an array of the result of the evaluation.
* @return {SurfaceEval} This object.
*/
SurfaceEval.prototype.vertex=function(evaluator){
 this.vertexSurface=evaluator;
 return this;
};
/**
* Specifies a parametric surface function for generating normals.
* <p>
* To generate normals for a function for a regular surface (usually
* a continuous, unbroken surface such as a sphere, disk, or open
* cylinder), find the <a href="http://en.wikipedia.org/wiki/Partial_derivative">partial derivative</a> of
* the function used for vertex calculation (we'll call it <b>F</b>) with
* respect to u, then find the partial derivative of <b>F</b> with respect to
* v, then take their <a href="http://en.wikipedia.org/wiki/Cross_product">cross
* product</a>, then normalize the result to unit length.
* In mathematical notation, this looks like:
* <b>c</b> = &#x2202;<b>F</b>/&#x2202<i>u</i> &times;
* &#x2202;<b>F</b>/&#x2202<i>v</i>; <b>n</b> = <b>c</b> / |<b>c</b>|.<p>
* If autonormal is enabled (see setAutoNormal()), SurfaceEval uses an approximation to this approach,
* as the SurfaceEval class doesn't know the implementation of the method used
* for vertex calculation.<p>
* (Note: &#x2202;<b>F</b>/&#x2202<i>u</i> is also called the <i>bitangent</i>
* or <i>binormal vector</i>, and &#x2202;<b>F</b>/&#x2202<i>v</i> is also
* called the <i>tangent vector</i>.)
* @param {object} evaluator An object that must contain a function
* named "evaluate", giving 3 values as a result.  See {@link SurfaceEval#vertex}.
* </ul>
* @return {SurfaceEval} This object.
* @example <caption>The following example sets the normal generation
* function for a parametric surface.  To illustrate how the method is derived
* from the vector calculation method, that method is also given below.  To
* derive the normal calculation, first look at the vector function:<p>
* <b>F</b>(u, v) = (cos(u), sin(u), sin(u)*cos(v))<p>
* Then, find the partial derivatives with respect to u and v:<p>
* &#x2202;<b>F</b>/&#x2202;<i>u</i> = (-sin(u), cos(u), cos(u)*cos(v))<br>
* &#x2202;<b>F</b>/&#x2202;<i>v</i> = (0, 0, -sin(v)*sin(u))<p>
* Next, take their cross product:<p>
* <b>c</b>(u, v) = (-sin(v)*cos(u)*sin(u), -sin(v)*sin(u)*sin(u), 0)<br><p>
* And finally, normalize the result:<p>
* <b>n</b>(u, v) = <b>c</b>(u, v)/|<b>c</b>(u, v)|<p>
*</caption>
* surfaceEval.vertex({"evaluate":function(u,v){
*  return [Math.cos(u),Math.sin(u),Math.sin(u)*Math.cos(v)];
* }})
* .normal({"evaluate":function(u,v){
*  return GLMath.vec3normInPlace([
*   Math.cos(u)*-Math.sin(v)*Math.sin(u),
*   Math.sin(u)*-Math.sin(v)*Math.sin(u),
*   0]);
* }})
*/
SurfaceEval.prototype.normal=function(evaluator){
 this.normalSurface=evaluator;
 return this;
};
/**
* Specifies a parametric surface function for generating color values.
* @param {object} evaluator An object that must contain a function
* named "evaluate", giving 3 values as a result.  See {@link SurfaceEval#vertex}.
* </ul>
* @return {SurfaceEval} This object.
*/
SurfaceEval.prototype.color=function(evaluator){
 this.colorSurface=evaluator;
 return this;
};
/**
* Specifies a parametric surface function for generating texture coordinates.
* @param {object} evaluator An object that must contain a function
* named "evaluate", giving 2 values as a result.  See {@link SurfaceEval#vertex}.
* </ul>
* @return {SurfaceEval} This object.
* @example <caption>The following example sets the surface
* function to a linear evaluator. Thus, coordinates passed to the
* evalOne and evalSurface methods will be interpolated as direct
* texture coordinates.</caption>
* surface.texCoord({"evaluate":function(u,v){ return [u,v] }});
*/
SurfaceEval.prototype.texCoord=function(evaluator){
 this.texCoordSurface=evaluator;
 return this;
};
/**
 * Generates vertex positions and attributes based on a point
 * in a parametric surface.
 * @param {glutil.Mesh} mesh Mesh where vertex positions and attributes
 * will be generated.  When this method returns, the current color, normal,
 * and texture coordinates will be the same as they were before the method
 * started.
 * @param {number} u U-coordinate of the curve to evaluate (for
 * B&eacute;zier surfaces, generally within the range
 * given in the <code>vectorBezier</code>, <code>normalBezier</code>,
 * <code>colorBezier</code>, and <code>texCoordBezier</code> methods).
 * @param {number} v V-coordinate of the curve to evaluate.
 * @return {SurfaceEval} This object.
 */
SurfaceEval.prototype.evalOne=function(mesh,u,v){
 var values=[];
 this._saveValues(mesh,values,0);
 this._record(u,v,values,_OLD_VALUES_SIZE);
 this._playBack(mesh,values,_OLD_VALUES_SIZE);
 this._restoreValues(mesh,values,0);
 return this;
};
/** @private
 @const
*/
var _OLD_VALUES_SIZE = 8;
/** @private
 @const
*/
var _RECORDED_VALUES_SIZE = 11;
/** @private */
SurfaceEval.prototype._recordAndPlayBack=function(mesh,u,v,buffer,index){
 this._record(u,v,buffer,index);
 this._playBack(mesh,buffer,index);
};
/** @private */
SurfaceEval.prototype._saveValues=function(mesh,buffer,index){
 if(this.colorSurface){
  buffer[index+3]=mesh.color[0];
  buffer[index+4]=mesh.color[1];
  buffer[index+5]=mesh.color[2];
 }
 if(this.normalSurface || this.autoNormal){
  buffer[index+0]=mesh.normal[0];
  buffer[index+1]=mesh.normal[1];
  buffer[index+2]=mesh.normal[2];
 }
 if(this.texCoordSurface){
  buffer[index+6]=mesh.texCoord[0];
  buffer[index+7]=mesh.texCoord[1];
 }
};
/** @private */
SurfaceEval.prototype._restoreValues=function(mesh,buffer,index){
 if(this.colorSurface){
  mesh.color3(buffer[index+3],buffer[index+4],buffer[index+5]);
 }
 if(this.normalSurface || this.autoNormal){
  mesh.normal3(buffer[index+0],buffer[index+1],buffer[index+2]);
 }
 if(this.texCoordSurface){
  mesh.texCoord2(buffer[index+6],buffer[index+7]);
 }
};
/** @private */
SurfaceEval.prototype._record=function(u,v,buffer,index){
 var normal=null;
 if(this.colorSurface){
  var color=this.colorSurface.evaluate(u,v);
  buffer[index+6]=color[0];
  buffer[index+7]=color[1];
  buffer[index+8]=color[2];
 }
 if(this.texCoordSurface){
  var texcoord=this.texCoordSurface.evaluate(u,v);
  buffer[index+9]=texcoord[0];
  buffer[index+10]=(texcoord.length<=1) ? 0 : texcoord[1];
 }
 if(this.normalSurface && !this.autoNormal){
  normal=this.normalSurface.evaluate(u,v);
  buffer[index+3]=normal[0];
  buffer[index+4]=normal[1];
  buffer[index+5]=normal[2];
 }
 if(this.vertexSurface){
  var vertex=this.vertexSurface.evaluate(u,v);
  buffer[index]=vertex[0];
  buffer[index+1]=vertex[1];
  buffer[index+2]=vertex[2];
  if(this.autoNormal){
   var du=0.00001;
   var dv=0.00001;
   // Find the partial derivatives of u and v
   var vu=this.vertexSurface.evaluate(u+du,v);
   if(vu[0] === 0 && vu[1] === 0 && vu[2] === 0){
    // too abrupt, try the other direction
    du=-du;
    vu=this.vertexSurface.evaluate(u+du,v);
   }
   var vuz=vu[2];
   var vv=this.vertexSurface.evaluate(u,v+dv);
   if(vv[0] === 0 && vv[1] === 0 && vv[2] === 0){
    // too abrupt, try the other direction
    dv=-dv;
    vv=this.vertexSurface.evaluate(u,v+dv);
   }
   GLMath.vec3subInPlace(vv,vertex);
   GLMath.vec3subInPlace(vu,vertex);
   // Divide by the deltas of u and v
   GLMath.vec3scaleInPlace(vu,1.0/du);
   GLMath.vec3scaleInPlace(vv,1.0/dv);
   GLMath.vec3normInPlace(vu);
   GLMath.vec3normInPlace(vv);
   if(GLMath.vec3length(vu) === 0){
    // partial derivative of u is degenerate
    //console.log([vu,vv,u,v]+" u degen")
    vu=vv;
   } else if(GLMath.vec3length(vv)!==0){
    vu=GLMath.vec3cross(vu,vv);
    GLMath.vec3normInPlace(vu);
   } else {
    // partial derivative of v is degenerate
    //console.log([vu,vv,u,v]+" v degen")
    if(vu[2]===vertex[2]){
      // the close evaluation returns the same
      // z as this evaluation
      vu=[0,0,1];
    }
   }
   buffer[index+3]=vu[0];
   buffer[index+4]=vu[1];
   buffer[index+5]=vu[2];
  }
 }
};
/** @private */
SurfaceEval.prototype._playBack=function(mesh,buffer,index){
 if(this.vertexSurface){
  if(this.colorSurface){
   mesh.color3(buffer[index+6],buffer[index+7],buffer[index+8]);
  }
  if(this.normalSurface || this.autoNormal){
   mesh.normal3(buffer[index+3],buffer[index+4],buffer[index+5]);
  }
  if(this.texCoordSurface){
   mesh.texCoord2(buffer[index+9],buffer[index+10]);
  }
  mesh.vertex3(buffer[index+0],buffer[index+1],buffer[index+2]);
 }
};

/**
 * Generates the vertex positions and attributes of a parametric
 * surface.
 * @param {glutil.Mesh} mesh Mesh where vertex positions and attributes
 * will be generated.  When this method returns, the current color, normal,
 * and texture coordinates will be the same as they were before the method
 * started.
 * @param {number} [mode] If this value is Mesh.TRIANGLES, or is null
 * or omitted, generates a series of triangles defining the surface.  If
 * this value is Mesh.LINES, generates
 * a series of lines defining the curve. If this value is Mesh.POINTS,
 * generates a series of points along the curve.  For any other value,
 * this method has no effect.
 * @param {number} [un] Number of subdivisions along the U-axis.
 * Default is 24.
 * @param {number} [vn] Number of subdivisions along the V-axis.
 * Default is 24.
 * @param {number} [u1] Starting U-coordinate of the surface to evaluate.
 * Default is 0.
 * @param {number} [u2] Ending U-coordinate of the surface to evaluate.
 * Default is 1.
 * @param {number} [v1] Starting U-coordinate of the surface to evaluate.
 * Default is 0.
 * @param {number} [v2] Ending U-coordinate of the surface to evaluate.
 * Default is 1.
 * @return {SurfaceEval} This object.
 */
SurfaceEval.prototype.evalSurface=function(mesh,mode,un,vn,u1,u2,v1,v2){
 if(typeof un==="undefined")un=24;
 if(typeof vn==="undefined")vn=24;
 if(un<=0)throw new Error("invalid un");
 if(vn<=0)throw new Error("invalid vn");
 if((mode===null || typeof mode==="undefined"))mode=Mesh.TRIANGLES;
 if(typeof v1==="undefined" && typeof v2==="undefined"){
  v1=0.0;
  v2=1.0;
 }
 if(typeof u1==="undefined" && typeof u2==="undefined"){
  u1=0.0;
  u2=1.0;
 }
 var du=(u2-u1)/un;
 var dv=(v2-v1)/vn;
 var i,j,jx,prevIndex;
 if(mode===Mesh.TRIANGLES){
  var oldValues=[];
  var previousValues=[];
  this._saveValues(mesh,oldValues,0);
  for(i=0;i<vn;i++){
   mesh.mode(Mesh.TRIANGLE_STRIP);
   for(j=0,prevIndex=0;j<=un;
      j++,prevIndex+=_RECORDED_VALUES_SIZE){
    jx=j*du+u1;
    if(i === 0){
     this._recordAndPlayBack(mesh,jx,i*dv+v1,oldValues,_OLD_VALUES_SIZE);
    } else {
     this._playBack(mesh,previousValues,prevIndex);
    }
    if(i===vn-1){
     this._recordAndPlayBack(mesh,jx,(i+1)*dv+v1,oldValues,_OLD_VALUES_SIZE);
    } else {
     this._recordAndPlayBack(mesh,jx,(i+1)*dv+v1,previousValues,prevIndex);
    }
   }
  }
  this._restoreValues(mesh,oldValues,0);
 } else if(mode===Mesh.POINTS){
  mesh.mode(Mesh.POINTS);
  for(i=0;i<=vn;i++){
   for(j=0;j<=un;j++){
    jx=j*du+u1;
    this.evalOne(mesh,jx,i*dv+v1);
   }
  }
 } else if(mode===Mesh.LINES){
  for(i=0;i<=vn;i++){
   mesh.mode(Mesh.LINE_STRIP);
   for(j=0;j<=un;j++){
    jx=j*du+u1;
    this.evalOne(mesh,jx,i*dv+v1);
   }
  }
  for(i=0;i<=un;i++){
   mesh.mode(Mesh.LINE_STRIP);
   for(j=0;j<=vn;j++){
    this.evalOne(mesh,i*du+u1,j*dv+v1);
   }
  }
 }
 return this;
};
global.SurfaceEval=SurfaceEval;
global.CurveEval=CurveEval;
global.BezierCurve=BezierCurve;
global.BezierSurface=BezierSurface;
global.BSplineCurve=BSplineCurve;
global.BSplineSurface=BSplineSurface;
})(this);
