/*
Written by Peter O. in 2015.

Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/
If you like this, you should donate to Peter O.
at: http://upokecenter.dreamhosters.com/articles/donate-now-2/
*/
(function(global){
/** @private */
function BernsteinEvalSpline(cp){
 var knots=[];
 for(var i=0;i<cp.length;i++)knots.push(0);
 for(var i=0;i<cp.length;i++)knots.push(1);
 this.c=new BSplineCurve(cp,knots,0);
}
/** @private */
BernsteinEvalSpline.prototype.evaluate=function(u){
 return this.c.evaluate(u);
};
/** @private */
function BernsteinEvalSurface(cp){
 var knotsV=[], knotsU=[];
 for(var i=0;i<cp.length;i++)knotsV.push(0);
 for(var i=0;i<cp.length;i++)knotsV.push(1);
 for(var i=0;i<cp[0].length;i++)knotsU.push(0);
 for(var i=0;i<cp[0].length;i++)knotsU.push(1);
 this.c=new BSplineSurface(cp,knotsU, knotsV,0);
}
/** @private */
BernsteinEvalSurface.prototype.evaluate=function(u,v){
 return this.c.evaluate(u,v);
};
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
 if(typeof u1=="undefined" && typeof u2=="undefined"){
  this.uoffset=0;
  this.umul=1;
 } else if(u1==u2){
  throw new Error("u1 and u2 can't be equal")
 } else {
  this.uoffset=u1;
  this.umul=1.0/(u2-u1);
 }
 this.evaluator=new BernsteinEvalSpline(cp);
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
}
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
 if(typeof u1=="undefined" && typeof u2=="undefined" &&
    typeof v1=="undefined" && typeof v2=="undefined"){
  this.uoffset=0;
  this.umul=1;
  this.voffset=0;
  this.vmul=1;
 } else if(u1==u2){
  throw new Error("u1 and u2 can't be equal")
 } else if(v1==v2){
  throw new Error("v1 and v2 can't be equal")
 } else {
  this.uoffset=u1;
  this.umul=1.0/(u2-u1);
  this.voffset=v1;
  this.vmul=1.0/(v2-v1);
 }
 this.evaluator=new BernsteinEvalSurface(cp);
}
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
}

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
* results in a straight line segment.<p>
* The knot vector must be a nondecreasing sequence and
* the first knot must not equal the last.<p>
* If the difference between one knot and the next isn't the same,
* the curve is considered a <i>non-uniform</i>
* B-spline curve.<p>
* If there are N times 2 knots with the first N equal to 0 and the rest
* equal to 1, where N is the number of control points,
* the control points describe a <i>B&eacute;zier</i> curve, in which the
* first and last control points match the curve's end points.<p>
* @param {boolean} [bits] Bits for defining input
* and controlling output.  Zero or more of BSplineCurve.WEIGHTED_BIT,
* BSplineCurve.HOMOGENEOUS_BIT.
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
 if((this.bits&(BSplineCurve.WEIGHTED_BIT|BSplineCurve.DIVIDE_BIT))!=0){
  cplenNeeded=2;
 }
 if((this.bits&(BSplineCurve.WEIGHTED_BIT))!=0){
  this.cplen--;
 }
 if(this.cplen<cplenNeeded)throw new Error();
 this.knots=knots;
 this.buffer=[];
 this.controlPoints=controlPoints;
}

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
* is premultiplied by the last coordinate of the point, that is,
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
 if(knots[0]==knots[knots.length-1])throw new Error();
}
BSplineCurve._getFactors=function(kn,t,order,numPoints,buffer){
 var c=1;
 for(var i=0;i<numPoints;i++){
   buffer[i]=0;
 }
 if(t==kn[0]){
  buffer[0]=1;
 } else if(t==kn[kn.length-1]){
  buffer[numPoints-1]=1;
 } else {
  var k=-1;
  for(var i=0;i<=kn.length;i++){
    if(kn[i]<=t && t<kn[i+1]){
      k=i;
      break;
    }
  }
  if(k<0)return;
  var tmp=[];
  var c=k-1;
  tmp[k]=1;
  for(var kk=2;kk<=order;kk++,c--){
   for(var i=c;i<=k;i++){
    var ret=0,divisor=0;
    var prv=(i<=c) ? 0 : tmp[i];
    var nxt=(i>=k) ? 0 : tmp[i+1];
    if(prv!=0){
     divisor=kn[i+kk-1]-kn[i]
     ret+=divisor==0 ? 0 : prv*(t-kn[i])/divisor;
    }
    if(nxt!=0){
     var ikk=kn[i+kk];
     divisor=ikk-kn[i+1]
     ret+=divisor==0 ? 0 : nxt*(ikk-t)/divisor;
    }
    buffer[i]=ret;
   }
   if(kk<order){
    for(var i=c;i<=k;i++){
     tmp[i]=buffer[i];
    }
   }
  }
 }
}

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
  var oldu=u
  u=this.knots[order-1]+u*(this.knots[numPoints]-
    this.knots[order-1]);
  BSplineCurve._getFactors(this.knots, u, order, numPoints,
     this.buffer);
  if((this.bits&BSplineCurve.WEIGHTED_BIT)!=0){
  // this is a weighted NURBS
  var ret=[];
  var weight=0;
  for(var j=0;j<numPoints;j++){
   weight+=this.buffer[j]*this.controlPoints[j][this.cplen];
  }
  for(var i=0;i<this.cplen+1;i++){
   var point=0;
   for(var j=0;j<numPoints;j++){
    var homogen=(this.bits&BSplineCurve.HOMOGENEOUS_BIT)!=0;
    var w=this.buffer[j];
    if(!homogen)w*=this.controlPoints[j][this.cplen];
    point+=this.controlPoints[j][i]*w;
   }
   ret[i]=point/weight;
  }
  if((this.bits&BSplineCurve.DIVIDE_BIT)!=0){
   for(var i=0;i<this.cplen;i++){
    ret[i]/=ret[this.cplen];
   }
   ret=ret.slice(0,this.cplen);
  }
  return ret;
 } else {
  var ret=[];
  for(var i=0;i<this.cplen;i++){
   var point=0;
   for(var j=0;j<numPoints;j++){
    point+=this.controlPoints[j][i]*this.buffer[j];
   }
   ret[i]=point;
  }
  if((this.bits&BSplineCurve.DIVIDE_BIT)!=0){
   for(var i=0;i<this.cplen-1;i++){
    ret[i]/=ret[this.cplen-1];
   }
   ret=ret.slice(0,this.cplen-1);
  }
  return ret;
 }
}

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
* BSplineCurve.HOMOGENEOUS_BIT.
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
 if((this.bits&(BSplineCurve.WEIGHTED_BIT|BSplineCurve.DIVIDE_BIT))!=0){
  cplenNeeded=2;
 }
 if((this.bits&(BSplineCurve.WEIGHTED_BIT|BSplineCurve.HOMOGENEOUS_BIT))!=0){
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
}

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
  if(this.orderU==this.orderV){
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
  if((this.bits&BSplineCurve.WEIGHTED_BIT)!=0){
  // this is a weighted NURBS
  var weight=0;
  var homogen=(this.bits&BSplineCurve.HOMOGENEOUS_BIT)!=0;
  for(var tt=0;tt<this.ucplen;tt++){
    for(var uu=0;uu<this.vcplen;uu++){
     var w=bu[tt]*bv[uu]*this.controlPoints[uu][tt][this.cplen];
     weight+=w;
    }
  }
  for(var i=0;i<this.cplen+1;i++){
   var value=0;
   var weight=0;
   for(var tt=0;tt<this.ucplen;tt++){
    for(var uu=0;uu<this.vcplen;uu++){
     var w=bu[tt]*bv[uu];
     if(!homogen)w*=this.controlPoints[uu][tt][this.cplen];
     value+=this.controlPoints[uu][tt][i]*w;
    }
   }
   output[i]=(weight==0) ? value : value/weight;
  }
  if((this.bits&BSplineCurve.DIVIDE_BIT)!=0){
   for(var i=0;i<this.cplen;i++){
    output[i]/=output[this.cplen];
   }
   output=output.slice(0,this.cplen)
  }
  return output;
 } else {
  for(var i=0;i<this.cplen;i++){
   var value=0;
   for(var tt=0;tt<this.ucplen;tt++){
    for(var uu=0;uu<this.vcplen;uu++){
     value+=this.controlPoints[uu][tt][i]*bu[tt]*bv[uu];
    }
   }
   output[i]=value;
  }
  if((this.bits&BSplineCurve.DIVIDE_BIT)!=0){
   for(var i=0;i<this.cplen-1;i++){
    output[i]/=output[this.cplen-1];
   }
   output=output.slice(0,this.cplen-1)
  }
  return output;
 }
}

/**
* An evaluator of parametric curve functions for generating
* vertex positions, normals, colors, and texture coordinates
* of a curve.<p>
* A parametric curve is a curve whose points are based on a
* parametric curve function.  A curve function takes a number
* (U) and returns a point (in 1, 2, 3 or more dimensions, but
* usually 2 or 3).  For example, in 3 dimensions, a curve
* function has the following form:<p>
* <b>F</b>(u) = [ x(u), y(u), z(u) ]
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
}

/**
* Specifies a parametric curve function for generating vertex positions.
* @param {object} evaluator An object that must contain a function
* named "evaluate".  It takes the following parameter:<ul>
* <li><code>u</code> - A curve coordinate, generally from 0 to 1.
* </ul>
* The evaluator function returns an array of the result of the evaluation.
* @return {CurveEval} This object.
*/
CurveEval.prototype.vertex=function(evaluator){
 this.vertexCurve=evaluator;
 return this;
}
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
}
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
}
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
}
/**
 * Specifies a B&eacute;zier curve used for generating vertex positions.
 * @param {Array<Array<number>>} controlPoints Control points as specified in {@link BezierCurve},
 * where each point is a 3-element array giving the x, y, and z coordinates of a vertex
 * position.
 * @param {number} [u1] Starting point; see {@link BezierCurve}.
 * @param {number} [u2] Ending point; see {@link BezierCurve}.
 * @return {CurveEval} This object.
 */
CurveEval.prototype.vertexBezier=function(controlPoints,u1,u2){
 this.vertexCurve=new BezierCurve(controlPoints,u1,u2);
 if(this.vertexCurve.k!=3)
   throw new Error("unsupported vertex length")
 return this;
}
/**
 * Specifies a B&eacute;zier curve used for generating normals.
 * @param {Array<Array<number>>} controlPoints Control points as specified in {@link BezierCurve},
 * where each point is a 3-element array giving the x, y, and z coordinates of a normal.
 * @param {number} [u1] Starting point; see {@link BezierCurve}.
 * @param {number} [u2] Ending point; see {@link BezierCurve}.
 * @return {CurveEval} This object.
*/
CurveEval.prototype.normalBezier=function(controlPoints,u1,u2){
 this.normalCurve=new BezierCurve(controlPoints,u1,u2);
 if(this.normalCurve.k!=3)
   throw new Error("invalid normal length")
 return this;
}
/**
 * Specifies a B&eacute;zier curve used for generating texture coordinates.
 * @param {Array<Array<number>>} controlPoints Control points as specified in {@link BezierCurve},
 * where each point is a 1- or 2-element array giving the u and v texture coordinates.
 * @param {number} [u1] Starting point; see {@link BezierCurve}.
 * @param {number} [u2] Ending point; see {@link BezierCurve}.
 * @return {CurveEval} This object.
 */
CurveEval.prototype.texCoordBezier=function(controlPoints,u1,u2){
 this.texCoordCurve=new BezierCurve(controlPoints,u1,u2);
 if(this.texCoordCurve.k!=1 && this.texCoordCurve.k!=2)
   throw new Error("unsupported texcoord length")
 return this;
}
/**
 * Specifies a B&eacute;zier curve used for generating color values.
 * @param {Array<Array<number>>} controlPoints Control points as specified in {@link BezierCurve},
 * where each point is a 3-element array giving the red, green, and blue
 * values of a color.
 * @param {number} [u1] Starting point; see {@link BezierCurve}.
 * @param {number} [u2] Ending point; see {@link BezierCurve}.
 * @return {CurveEval} This object.
 */
CurveEval.prototype.colorBezier=function(controlPoints,u1,u2){
 this.colorCurve=new BezierCurve(controlPoints,u1,u2);
 if(this.colorCurve.k!=3)
   throw new Error("unsupported color length")
 return this;
}
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
  if(texcoord.length==1)texcoord.push(0);
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
  if(vertex.length==2)
   mesh.vertex3(vertex[0],vertex[1],0.0);
  else
   mesh.vertex3(vertex[0],vertex[1],vertex[2]);
  if(oldColor)mesh.color3(oldColor[0],oldColor[1],oldColor[2]);
  if(oldNormal)mesh.normal3(oldNormal[0],oldNormal[1],oldNormal[2]);
  if(oldTexCoord)mesh.texCoord2(oldTexCoord[0],oldTexCoord[1]);
 }
 return this;
}
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
 if(typeof n=="undefined")n=24;
 if(n<=0)throw new Error("invalid n")
 if(typeof u1=="undefined" && typeof u2=="undefined"){
  u1=0.0;
  u2=1.0;
 }
 if(mode==null)mode=Mesh.LINES;
 var uv=(u2-u1)/n;
 if(mode==Mesh.POINTS)
  mesh.mode(Mesh.POINTS)
 else if(mode==Mesh.LINES)
  mesh.mode(Mesh.LINE_STRIP)
 else return this;
 for(var i=0; i<=n; i++){
  this.evalOne(mesh, u1+i*uv);
 }
 return this;
}
/**
* An evaluator of parametric functions for generating
* vertex positions, normals, colors, and texture coordinates
* of a surface.<p>
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
}
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
}
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
}
/**
* Specifies a parametric surface function for generating normals.
* @param {object} evaluator An object that must contain a function
* named "evaluate", giving 3 values as a result.  See {@link SurfaceEval#vertex}.
* </ul>
* @return {SurfaceEval} This object.
*/
SurfaceEval.prototype.normal=function(evaluator){
 this.normalSurface=evaluator;
 return this;
}
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
}
/**
* Specifies a parametric surface function for generating texture coordinates.
* @param {object} evaluator An object that must contain a function
* named "evaluate", giving 2 values as a result.  See {@link SurfaceEvals#vertex}.
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
}
/**
 * Specifies a B&eacute;zier surface used for generating vertex positions.
 * @param {Array<Array<number>>} controlPoints Control points as specified in {@link BezierSurface},
 * where each point is a 3-element array giving the x, y, and z coordinates of a vertex
 * position.
 * @param {number} [u1] Starting point along the U axis; see {@link BezierSurface}.
 * @param {number} [u2] Ending point along the U axis; see {@link BezierSurface}.
 * @param {number} [v1] Starting point along the V axis; see {@link BezierSurface}.
 * @param {number} [v2] Ending point along the V axis; see {@link BezierSurface}.
 * @return {SurfaceEval} This object.
 */
SurfaceEval.prototype.vertexBezier=function(controlPoints,u1,u2,v1,v2){
 this.vertexSurface=new BezierSurface(controlPoints,u1,u2,v1,v2);
 if(this.vertexSurface.k!=3)
   throw new Error("unsupported vertex length")
 return this;
}
/**
 * Specifies a B&eacute;zier surface used for generating normals.
 * @param {Array<Array<number>>} controlPoints Control points as specified in {@link BezierSurface},
 * where each point is a 3-element array giving the x, y, and z coordinates of a normal.
 * @param {number} [u1] Starting point along the U axis; see {@link BezierSurface}.
 * @param {number} [u2] Ending point along the U axis; see {@link BezierSurface}.
 * @param {number} [v1] Starting point along the V axis; see {@link BezierSurface}.
 * @param {number} [v2] Ending point along the V axis; see {@link BezierSurface}.
 * @return {SurfaceEval} This object.
*/
SurfaceEval.prototype.normalBezier=function(controlPoints,u1,u2,v1,v2){
 this.normalSurface=new BezierSurface(controlPoints,u1,u2,v1,v2);
 if(this.normalSurface.k!=3)
   throw new Error("invalid normal length")
 return this;
}
/**
 * Specifies a B&eacute;zier surface used for generating texture coordinates.
 * @param {Array<Array<number>>} controlPoints Control points as specified in {@link BezierSurface},
 * where each point is a 1- or 2-element array giving the u and v texture coordinates.
 * @param {number} [u1] Starting point along the U axis; see {@link BezierSurface}.
 * @param {number} [u2] Ending point along the U axis; see {@link BezierSurface}.
 * @param {number} [v1] Starting point along the V axis; see {@link BezierSurface}.
 * @param {number} [v2] Ending point along the V axis; see {@link BezierSurface}.
 * @return {SurfaceEval} This object.
 */
SurfaceEval.prototype.texCoordBezier=function(controlPoints,u1,u2,v1,v2){
 this.texCoordSurface=new BezierSurface(controlPoints,u1,u2,v1,v2);
 if(this.texCoordSurface.k!=1 && this.texCoordSurface.k!=2)
   throw new Error("unsupported texcoord length")
 return this;
}
/**
 * Specifies a B&eacute;zier surface used for generating color values.
 * @param {Array<Array<number>>} controlPoints Control points as specified in {@link BezierSurface},
 * where each point is a 3-element array giving the red, green, and blue
 * values of a color.
 * @param {number} [u1] Starting point along the U axis; see {@link BezierSurface}.
 * @param {number} [u2] Ending point along the U axis; see {@link BezierSurface}.
 * @param {number} [v1] Starting point along the V axis; see {@link BezierSurface}.
 * @param {number} [v2] Ending point along the V axis; see {@link BezierSurface}.
 * @return {SurfaceEval} This object.
 */
SurfaceEval.prototype.colorBezier=function(controlPoints,u1,u2,v1,v2){
 this.colorSurface=new BezierSurface(controlPoints,u1,u2,v1,v2);
 if(this.colorSurface.k!=3)
   throw new Error("unsupported color length")
 return this;
}
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
 var color=null;
 var normal=null;
 var texcoord=null;
 if(this.colorSurface){
  color=this.colorSurface.evaluate(u,v);
 }
 if(this.texCoordSurface){
  texcoord=this.texCoordSurface.evaluate(u,v);
  if(texcoord.length==1)texcoord.push(0);
 }
 if(this.normalSurface && !this.autoNormal){
  normal=this.normalSurface.evaluate(u,v);
 }
 if(this.vertexSurface){
  var vertex;
  var oldColor=(color) ? mesh.color.slice(0,3) : null;
  var oldNormal=(normal || this.autoNormal) ? mesh.normal.slice(0,3) : null;
  var oldTexCoord=(texcoord) ? mesh.texCoord.slice(0,3) : null;
  if(color)mesh.color3(color[0],color[1],color[2]);
  vertex=this.vertexSurface.evaluate(u,v);
  if(this.autoNormal){
   var du=0.001
   var dv=0.001
   // Find the partial derivatives of u and v
   var vu=this.vertexSurface.evaluate(u+du,v);
   if(vu[0]==0 && vu[1]==0 && vu[2]==0){
    // too abrupt, try the other direction
    du=-du;
    vu=this.vertexSurface.evaluate(u+du,v);
   }
   var vuz=vu[2];
   var vv=this.vertexSurface.evaluate(u,v+dv);
   if(vv[0]==0 && vv[1]==0 && vv[2]==0){
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
   if(GLMath.vec3length(vu)==0){
    // partial derivative of u is degenerate
    //console.log([vu,vv,u,v]+" u degen")
    vu=vv;
   } else if(GLMath.vec3length(vv)!=0){
    vu=GLMath.vec3cross(vu,vv);
    GLMath.vec3normInPlace(vu);
   } else {
    // partial derivative of v is degenerate
    //console.log([vu,vv,u,v]+" v degen")
    if(vu[2]==vertex[2]){
      // the close evaluation returns the same
      // z as this evaluation
      vu=[0,0,1];
    }
   }
   mesh.normal3(vu[0],vu[1],vu[2]);
  } else if(normal){
   mesh.normal3(normal[0],normal[1],normal[2]);
  }
  if(texcoord)mesh.texCoord2(texcoord[0],texcoord[1]);
  mesh.vertex3(vertex[0],vertex[1],vertex[2]);
  if(oldColor)mesh.color3(oldColor[0],oldColor[1],oldColor[2]);
  if(oldNormal)mesh.normal3(oldNormal[0],oldNormal[1],oldNormal[2]);
  if(oldTexCoord)mesh.texCoord2(oldTexCoord[0],oldTexCoord[1]);
 }
 return this;
}

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
 if(typeof un=="undefined")un=24;
 if(typeof vn=="undefined")vn=24;
 if(un<=0)throw new Error("invalid un")
 if(vn<=0)throw new Error("invalid vn")
 if(mode==null)mode=Mesh.TRIANGLES;
 if(typeof v1=="undefined" && typeof v2=="undefined"){
  v1=0.0;
  v2=1.0;
 }
 if(typeof u1=="undefined" && typeof u2=="undefined"){
  u1=0.0;
  u2=1.0;
 }
 var du=(u2-u1)/un;
 var dv=(v2-v1)/vn;
 if(mode==Mesh.TRIANGLES){
  for(var i=0;i<vn;i++){
   mesh.mode(Mesh.TRIANGLE_STRIP);
   for(var j=0;j<=un;j++){
    var jx=j*du+u1;
    this.evalOne(mesh,jx,i*dv+v1);
    this.evalOne(mesh,jx,(i+1)*dv+v1);
  }
  }
 } else if(mode==Mesh.POINTS){
  mesh.mode(Mesh.POINTS);
  for(var i=0;i<=vn;i++){
   for(var j=0;j<=un;j++){
    var jx=j*du+u1;
    this.evalOne(mesh,jx,i*dv+v1);
   }
  }
 } else if(mode==Mesh.LINES){
  for(var i=0;i<=vn;i++){
   mesh.mode(Mesh.LINE_STRIP);
   for(var j=0;j<=un;j++){
    var jx=j*du+u1;
    this.evalOne(mesh,jx,i*dv+v1);
   }
  }
  for(var i=0;i<=un;i++){
   mesh.mode(Mesh.LINE_STRIP);
   for(var j=0;j<=vn;j++){
    this.evalOne(mesh,i*du+u1,j*dv+v1);
   }
  }
 }
 return this;
}
global.SurfaceEval=SurfaceEval;
global.CurveEval=CurveEval;
global.BezierCurve=BezierCurve;
global.BezierSurface=BezierSurface;
global.BSplineCurve=BSplineCurve;
global.BSplineSurface=BSplineSurface;
})(this);
