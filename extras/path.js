/*
Written by Peter O. in 2015.

Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/
If you like this, you should donate to Peter O.
at: http://upokecenter.dreamhosters.com/articles/donate-now-2/
*/
/**
* Represents a two-dimensional path.
* <p>This class is considered a supplementary class to the
* Public Domain HTML 3D Library and is not considered part of that
* library. <p>
* To use this class, you must include the script "extras/path.js"; the
 * class is not included in the "glutil_min.js" file which makes up
 * the HTML 3D Library.  Example:<pre>
 * &lt;script type="text/javascript" src="extras/path.js">&lt;/script></pre>
* @class
*/
function GraphicsPath(){
 this.segments=[]
 this.incomplete=false
 this.startPos=[0,0]
 this.endPos=[0,0]
}
GraphicsPath.CLOSE=0
GraphicsPath.LINE=1
GraphicsPath.QUAD=2
GraphicsPath.CUBIC=3
GraphicsPath.ARC=4
/**
* Returns whether the curve path is incomplete
* because of an error in parsing the curve string.
* This flag will be reset if a moveTo command,
* closePath command, or another path segment
* is added to the path.
* @return {boolean} Return value.*/
GraphicsPath.prototype.isIncomplete=function(){
 return this.incomplete
}
GraphicsPath._startPoint=function(a){
 if(a[0]==GraphicsPath.CLOSE){
  return [0,0]
 } else {
  return [a[1],a[2]]
 }
}
GraphicsPath._endPoint=function(a){
 if(a[0]==GraphicsPath.CLOSE){
  return [0,0]
 } else if(a[0]==GraphicsPath.ARC){
  return [a[8],a[9]]
 } else {
  return [a[a.length-2],a[a.length-1]]
 }
}
GraphicsPath._point=function(seg,t){
 if(seg[0]==GraphicsPath.CLOSE){
  return [0,0]
 } else if(seg[0]==GraphicsPath.LINE){
  return [
   seg[1]+(seg[3]-seg[1])*t,
   seg[2]+(seg[4]-seg[2])*t
  ]
 } else if(seg[0]==GraphicsPath.QUAD){
  var mt=1-t;
  var mtsq=mt*mt;
  var mt2=(mt+mt);
  var a,b;
  a=seg[1]*mtsq;
  b=seg[3]*mt2;
  var x=a+t*(b+t*seg[5]);
  a=seg[2]*mtsq;
  b=seg[4]*mt2
  var y=a+t*(b+t*seg[6]);
  return [x,y];
 } else if(seg[0]==GraphicsPath.CUBIC){
  var a=(seg[3]-seg[1])*3;
  var b=(seg[5]-seg[3])*3-a;
  var c=seg[7]-a-b-seg[1];
  var x=seg[1]+t*(a+t*(b+t*c));
  a=(seg[4]-seg[2])*3;
  b=(seg[6]-seg[4])*3-a;
  c=seg[8]-a-b-seg[2];
  var y=seg[2]+t*(a+t*(b+t*c));
  return [x,y];
 } else if(seg[0]==GraphicsPath.ARC){
  if(t==0)return [seg[1],seg[2]]
  if(t==1)return [seg[8],seg[9]]
  var rx=seg[3]
  var ry=seg[4]
  var cx=seg[10]
  var cy=seg[11]
  var theta=seg[12]
  var delta=(seg[13]-seg[12])
  var rot=seg[5]
  var angle=theta+delta*t
  var cr = Math.cos(rot);
  var sr = (rot>=0 && rot<6.283185307179586) ? (rot<=3.141592653589793 ? Math.sqrt(1.0-cr*cr) : -Math.sqrt(1.0-cr*cr)) : Math.sin(rot);
  var ca = Math.cos(angle);
  var sa = (angle>=0 && angle<6.283185307179586) ? (angle<=3.141592653589793 ? Math.sqrt(1.0-ca*ca) : -Math.sqrt(1.0-ca*ca)) : Math.sin(angle);
  return [
   cr*ca*rx-sr*sa*ry+cx,
   sr*ca*rx+cr*sa*ry+cy]
 } else {
  return [0,0]
 }
}

GraphicsPath._flattenCubic=function(a1,a2,a3,a4,a5,a6,a7,a8,t1,t2,list,flatness,mode,depth){
 if(depth==null)depth=0
 if(depth>=20 || Math.abs(a1-a3-a3+a5)+Math.abs(a3-a5-a5+a7)+
    Math.abs(a2-a4-a4+a6)+Math.abs(a4-a6-a6+a8)<=flatness){
  if(mode==0){
   list.push([a1,a2,a7,a8])
  } else {
   var dx=a7-a1
   var dy=a8-a2
   var length=Math.sqrt(dx*dx+dy*dy)
   list.push(t1,t2,length)
  }
 } else {
  var x1=(a1+a3)*0.5
  var x2=(a3+a5)*0.5
  var xc1=(x1+x2)*0.5
  var x3=(a5+a7)*0.5
  var xc2=(x2+x3)*0.5
  var xd=(xc1+xc2)*0.5
  var y1=(a2+a4)*0.5
  var y2=(a4+a6)*0.5
  var yc1=(y1+y2)*0.5
  var y3=(a6+a8)*0.5
  var yc2=(y2+y3)*0.5
  var yd=(yc1+yc2)*0.5
  var tmid=(t1+t2)*0.5
  GraphicsPath._flattenCubic(a1,a2,x1,y1,xc1,yc1,xd,yd,t1,tmid,list,flatness,mode,depth+1)
  GraphicsPath._flattenCubic(xd,yd,xc2,yc2,x3,y3,a7,a8,tmid,t2,list,flatness,mode,depth+1)
 }
}

GraphicsPath._flattenQuad=function(a1,a2,a3,a4,a5,a6,t1,t2,list,flatness,mode,depth){
 if(depth==null)depth=0
 if(depth>=20 || Math.abs(a1-a3-a3+a5)+Math.abs(a2-a4-a4+a6)<=flatness){
  if(mode==0){
   list.push([a1,a2,a5,a6])
  } else {
   var dx=a5-a1
   var dy=a6-a2
   var length=Math.sqrt(dx*dx+dy*dy)
   list.push(t1,t2,length)
  }
 } else {
  var x1=(a1+a3)*0.5
  var x2=(a3+a5)*0.5
  var xc=(x1+x2)*0.5
  var y1=(a2+a4)*0.5
  var y2=(a4+a6)*0.5
  var yc=(y1+y2)*0.5
  var tmid=(t1+t2)*0.5
  GraphicsPath._flattenQuad(a1,a2,x1,y1,xc,yc,t1,tmid,list,flatness,mode,depth+1)
  GraphicsPath._flattenQuad(xc,yc,x2,y2,a5,a6,tmid,t2,list,flatness,mode,depth+1)
 }
}

GraphicsPath._flattenArc=function(a,t1,t2,list,flatness,mode,depth){
 var rot=a[5]
 var crot = Math.cos(rot);
 var srot = (rot>=0 && rot<6.283185307179586) ? (rot<=3.141592653589793 ? Math.sqrt(1.0-crot*crot) : -Math.sqrt(1.0-crot*crot)) : Math.sin(rot);
 var ellipseInfo=[a[3],a[4],a[10],a[11],crot,srot]
 GraphicsPath._flattenArcInternal(ellipseInfo,a[1],a[2],a[8],a[9],a[12],a[13],t1,t2,list,flatness,mode,depth);
}
GraphicsPath._flattenArcInternal=function(ellipseInfo,x1,y1,x2,y2,theta1,theta2,t1,t2,list,flatness,mode,depth){
 if(depth==null)depth=0
 var thetaMid=(theta1+theta2)*0.5
 var tmid=(t1+t2)*0.5
 var ca = Math.cos(thetaMid);
 var sa = (thetaMid>=0 && thetaMid<6.283185307179586) ? (thetaMid<=3.141592653589793 ? Math.sqrt(1.0-ca*ca) : -Math.sqrt(1.0-ca*ca)) : Math.sin(thetaMid);
 var xmid = ellipseInfo[4]*ca*ellipseInfo[0]-ellipseInfo[5]*sa*ellipseInfo[1]+ellipseInfo[2]
 var ymid = ellipseInfo[5]*ca*ellipseInfo[0]+ellipseInfo[4]*sa*ellipseInfo[1]+ellipseInfo[3]
 if(depth>=20 || Math.abs(x1-xmid-xmid+x2)+Math.abs(y1-ymid-ymid+y2)<=flatness){
  if(mode==0){
   list.push([x1,y1,xmid,ymid])
   list.push([xmid,ymid,x2,y2])
  } else {
   var dx=xmid-x1
   var dy=ymid-y1
   var length=Math.sqrt(dx*dx+dy*dy)
   list.push(t1,tmid,length)
   dx=x2-xmid
   dy=y2-ymid
   length=Math.sqrt(dx*dx+dy*dy)
   list.push(tmid,t2,length)
  }
 } else {
  GraphicsPath._flattenArcInternal(ellipseInfo,x1,y1,xmid,ymid,theta1,thetaMid,t1,tmid,list,flatness,mode,depth+1)
  GraphicsPath._flattenArcInternal(ellipseInfo,xmid,ymid,x2,y2,thetaMid,theta2,tmid,t2,list,flatness,mode,depth+1)
 }
}
/** @private */
GraphicsPath.prototype._start=function(){
 for(var i=0;i<this.segments.length;i++){
  var s=this.segments[i]
  if(s[0]!=GraphicsPath.CLOSE)return GraphicsPath._startPoint(s)
 }
 return [0,0]
}
/** @private */
GraphicsPath.prototype._end=function(){
 for(var i=this.segments.length-1;i>=0;i--){
  var s=this.segments[i]
  if(s[0]!=GraphicsPath.CLOSE)return GraphicsPath._endPoint(s)
 }
 return [0,0]
}
/**
 * Returns this path in the form of a string in SVG path format.
 * @return {string} Return value. */
GraphicsPath.prototype.toString=function(){
 var oldpos=null
 var ret=""
 for(var i=0;i<this.segments.length;i++){
  var a=this.segments[i]
  if(a[0]==GraphicsPath.CLOSE){
   ret+="Z"
  } else {
   var start=GraphicsPath._startPoint(a)
   if(!oldpos || oldpos[0]!=start[0] || oldpos[1]!=start[1]){
    ret+="M"+start[0]+","+start[1]
   }
   if(a[0]==GraphicsPath.LINE){
    ret+="L"+a[3]+","+a[4]
   }
   if(a[0]==GraphicsPath.QUAD){
    ret+="Q"+a[3]+","+a[4]+","+a[5]+","+a[6]
   }
   if(a[0]==GraphicsPath.CUBIC){
    ret+="C"+a[3]+","+a[4]+","+a[5]+","+a[6]+","+a[7]+","+a[8]
   }
   if(a[0]==GraphicsPath.ARC){
    ret+="A"+a[3]+","+a[4]+","+(a[5]*180/Math.PI)+","+
      (a[6] ? "1" : "0")+(a[7] ? "1" : "0")+a[8]+","+a[9]
   }
  }
 }
 return ret
}
GraphicsPath._length=function(a,flatness){
 if(a[0]==GraphicsPath.LINE){
  var dx=a[3]-a[1]
  var dy=a[4]-a[2]
  return Math.sqrt(dx*dx+dy*dy)
 } else if(a[0]==GraphicsPath.QUAD){
   var flat=[]
   var len=0
   GraphicsPath._flattenQuad(a[1],a[2],a[3],a[4],
     a[5],a[6],0.0,1.0,flat,flatness*2,1)
   for(var j=0;j<flat.length;j+=3){
    len+=flat[j+2]
   }
   return len
  } else if(a[0]==GraphicsPath.CUBIC){
   var flat=[]
   var len=0
   GraphicsPath._flattenCubic(a[1],a[2],a[3],a[4],
     a[5],a[6],a[7],a[8],0.0,1.0,flat,flatness*2,1)
   for(var j=0;j<flat.length;j+=3){
    len+=flat[j+2]
   }
   return len
 } else if(a[0]==GraphicsPath.ARC){
  var rx=a[3]
  var ry=a[4]
  var theta=a[12]
  var theta2=a[13]
  return GraphicsPath._ellipticArcLength(rx,ry,theta,theta2)
 } else {
  return 0
 }
}

/**
 * Finds the approximate length of this path.
* @param {number} [flatness] When quadratic and cubic
* curves are decomposed to
* line segments for the purpose of calculating their length, the
* segments will generally be close to the true path of the curve by
* up to this value, given in units.  If null or omitted, default is 1.
 * @return {number} Approximate length of this path
 * in units.
 */
GraphicsPath.prototype.pathLength=function(flatness){
 if(this.segments.length==0)return 0;
 var totalLength=0
 if(flatness==null)flatness=1.0
 for(var i=0;i<this.segments.length;i++){
  var s=this.segments[i]
  var len=GraphicsPath._length(s,flatness)
  totalLength+=len
 }
 return totalLength;
}
/**
* Gets an array of line segments approximating
* the path.
* @param {number} [flatness] When curves and arc
* segments are decomposed to line segments, the
* segments will be close to the true path of the curve by this
* value, given in units.  If null or omitted, default is 1.
* @return {Array<Array<number>>} Array of line segments.
* Each line segment is an array of four numbers: the X and
* Y coordinates of the start point, respectively, then the X and
* Y coordinates of the end point, respectively.
*/
GraphicsPath.prototype.getLines=function(flatness){
 var ret=[]
 if(flatness==null)flatness=1.0
 for(var i=0;i<this.segments.length;i++){
  var s=this.segments[i]
  var len=0
  if(s[0]==GraphicsPath.QUAD){
   GraphicsPath._flattenQuad(s[1],s[2],s[3],s[4],
     s[5],s[6],0.0,1.0,ret,flatness*2,0)
  } else if(s[0]==GraphicsPath.CUBIC){
   GraphicsPath._flattenCubic(s[1],s[2],s[3],s[4],
     s[5],s[6],s[7],s[8],0.0,1.0,ret,flatness*2,0)
  } else if(s[0]==GraphicsPath.ARC){
   GraphicsPath._flattenArc(s,0.0,1.0,ret,flatness*2,0)
  } else if(s[0]!=GraphicsPath.CLOSE){
   ret.push([s[1],s[2],s[3],s[4]])
  }
 }
 return ret
}
/** @private */
GraphicsPath.prototype._getSubpaths=function(flatness){
 var tmp=[]
 var subpaths=[]
 if(flatness==null)flatness=1.0
 var lastptx=0
 var lastpty=0
 var first=true
 var curPath=null
 for(var i=0;i<this.segments.length;i++){
  var s=this.segments[i]
  var len=0
  var startpt=GraphicsPath._startPoint(s)
  var endpt=GraphicsPath._endPoint(s)
  tmp.length=0
  if(s[0]!=GraphicsPath.CLOSE){
   if(first || lastptx!=startpt[0] || lastpty!=startpt[1]){
    curPath=startpt
    subpaths.push(curPath)
    first=false
   }
   lastptx=endpt[0]
   lastpty=endpt[1]
  }
  if(s[0]==GraphicsPath.QUAD){
   GraphicsPath._flattenQuad(s[1],s[2],s[3],s[4],
     s[5],s[6],0.0,1.0,tmp,flatness*2,0)
   for(var j=0;j<tmp.length;j++){
    curPath.push(tmp[j][2])
    curPath.push(tmp[j][3])
   }
  } else if(s[0]==GraphicsPath.CUBIC){
   GraphicsPath._flattenCubic(s[1],s[2],s[3],s[4],
     s[5],s[6],s[7],s[8],0.0,1.0,tmp,flatness*2,0)
   for(var j=0;j<tmp.length;j++){
    curPath.push(tmp[j][2])
    curPath.push(tmp[j][3])
   }
  } else if(s[0]==GraphicsPath.ARC){
   GraphicsPath._flattenArc(s,0.0,1.0,tmp,flatness*2,0)
   for(var j=0;j<tmp.length;j++){
    curPath.push(tmp[j][2])
    curPath.push(tmp[j][3])
   }
  } else if(s[0]!=GraphicsPath.CLOSE){
   curPath.push(s[3])
   curPath.push(s[4])
  }
 }
 return subpaths
}

/**
* Converts the subpaths in this path to triangles.
* Treats each subpath as a polygon even if it isn't closed.
* Each subpath should currently be a simple polygon (one without
* self-intersections, duplicate vertices, or holes), except if the
* subpath contains duplicate vertices that appear at the start and end.
* @param {number} [flatness] When curves and arcs
* are decomposed to line segments, the
* segments will be close to the true path of the curve by this
* value, given in units.  If null or omitted, default is 1.
* @return {Array<Array<number>>} Array of six-element
* arrays describing a single triangle.  For each six-element
* array, the first two, next two, and last two numbers each
* describe a vertex position of that triangle (X and Y coordinates
* in that order.
*/
GraphicsPath.prototype.getTriangles=function(flatness){
 var subpaths=this._getSubpaths(flatness)
 var tris=[]
 for(var i=0;i<subpaths.length;i++){
  Triangulate._triangulate(subpaths[i],tris)
 }
 return tris
}
GraphicsPath._CurveList=function(curves){
 this.curves=curves
 this.cumulativeLengths=[]
 var totalLength=0
 for(var i=0;i<this.curves.length;i++){
  this.cumulativeLengths.push(totalLength)
  totalLength+=this.curves[i].totalLength
 }
 this.totalLength=totalLength;
}
GraphicsPath._CurveList.prototype.getCurves=function(){
 return this.curves;
}
GraphicsPath._CurveList.prototype.getLength=function(){
 return this.totalLength;
}
GraphicsPath._CurveList.prototype.evaluate=function(u){
 if(u<0)u=0;
 if(u>1)u=1;
 if(this.curves.length==0)return [0,0,0]
 if(this.curves.length==1)return this.curves[0].evaluate(u)
 var partialLen=u*this.totalLength;
 var left=0
 var right=this.segments.length;
 while(left<=right){
  var mid=((left+right)/2)|0
  var seg=this.curves[mid]
  var segstart=this.cumulativeLengths[mid]
  var segend=segstart+seg.totalLength
  if((partialLen>=segstart && partialLen<segend) ||
     (partialLen==segend && mid+1==this.curves.length)){
   var t=(partialLen-segstart)/seg.totalLength
   return seg.evaluate(t);
  } else if(partialLen<segstart){
   // curve is behind
   right=mid-1
  } else {
   // curve is ahead
   left=mid+1
  }
 }
 return null;
}

GraphicsPath._Curve=function(segments){
 this.segments=segments
 var totalLength=0
 for(var i=0;i<this.segments.length;i++){
  totalLength+=this.segments[i][1]
 }
 this.totalLength=totalLength;
}
GraphicsPath._Curve.prototype.getLength=function(){
 return this.totalLength;
}
GraphicsPath._Curve.prototype.evaluate=function(u){
 if(u<0)u=0;
 if(u>1)u=1;
 if(this.segments.length==0)return [0,0,0]
 var partialLen=u*this.totalLength;
 var left=0
 var right=this.segments.length;
 while(left<=right){
  var mid=((left+right)/2)|0
  var seg=this.segments[mid]
  var segstart=seg[2]
  var segend=segstart+seg[1]
  if((partialLen>=segstart && partialLen<segend) ||
     (partialLen==segend && mid+1==this.segments.length)){
   var seginfo=seg[3]
   var t=(u==1) ? segend : (partialLen-segstart)/seg[1]
   if(seg[0]==GraphicsPath.LINE){
    var x=seginfo[1]+seginfo[3]*t
    var y=seginfo[2]+seginfo[4]*t
    return [x,y,0]
   } else {
    var cumulativeLengths=seg[5]
    var segParts=seg[4]
    var segPartialLen=partialLen-segstart
    var segLeft=0
    var segRight=cumulativeLengths.length
    while(segLeft<=segRight){
     var segMid=((segLeft+segRight)/2)|0
     var partStart=cumulativeLengths[segMid]
     var partIndex=segMid*3
     var partLength=segParts[partIndex+2]
     var partEnd=partStart+partLength
     if(segPartialLen>=partStart && segPartialLen<=partEnd){
      var tStart=segParts[partIndex]
      var tEnd=segParts[partIndex+1]
      var partT=(u==1) ? 1.0 : tStart+((segPartialLen-partStart)/partLength)*(tEnd-tStart)
      var point=GraphicsPath._point(seginfo,partT)
      point[2]=0
      return point
     } else if(segPartialLen<partStart){
      segRight=segMid-1
     } else {
      segLeft=segMid+1
     }
    }
    throw new Error("not implemented yet")
   }
  } else if(partialLen<segstart){
   // segment is behind
   right=mid-1
  } else {
   // segment is ahead
   left=mid+1
  }
 }
 return null;
}
/** @private */
GraphicsPath.prototype._makeCurves=function(flatness){
}

/**
* Gets an object for the curve described by this path.
* The resulting curve can be used to retrieve the points
* that lie on the path or as a parameter for one of
* the {@link glutil.CurveEval} methods, in the
* {@link CurveTube} class, or any other class that
* accepts parametric curves.
* @param {number} [flatness] When curves and arcs
* are decomposed to line segments for the purpose of
* calculating their length, the
* segments will be close to the true path of the curve by this
* value, given in units.  If null or omitted, default is 1.  This
is only used to make the arc-length parameterization more
accurate if the path contains curves or arcs.
* @return {object} An object that implements
* the following methods:<li>
<li><code>getCurves()</code> - Returns a list of curves described
* by this path.  The list will contain one object for each disconnected
portion of the path. For example, if the path contains one polygon, the list will contain
one curve object.   And if the path is empty, the list will be empty too.
<p>Each object will have the following methods:<ul>
<li><code>getLength()</code> - Returns the total length of the curve,
in units.
<li><code>evaluate(u)</code> - Takes one parameter, "u", which
ranges from 0 to 1, depending on how far the point is from the start or
the end of the path (similar to arc-length parameterization).
The function returns a 3-element array containing
the X, Y, and Z coordinates of the point lying on the curve at the given
"u" position (however, the z will always be 0 since paths can currently
only be 2-dimensional).
</ul>
<li><code>getLength()</code> - Returns the total length of the path,
in units.
<li><code>evaluate(u)</code> - Has the same effect as the "evaluate"
method for each curve, but applies to the path as a whole.
Note that calling this "evaluate" method is only
recommended when drawing the path as a set of points, not lines, since
the path may contain several disconnected parts.
</ul>
*/
GraphicsPath.prototype.getCurves=function(flatness){
 var subpaths=[]
 var curves=[]
 if(flatness==null)flatness=1.0
 var lastptx=0
 var lastpty=0
 var first=true
 var curPath=null
 var curLength=0
 for(var i=0;i<this.segments.length;i++){
  var s=this.segments[i]
  var len=0
  var startpt=GraphicsPath._startPoint(s)
  var endpt=GraphicsPath._endPoint(s)
  if(s[0]!=GraphicsPath.CLOSE){
   if(first || lastptx!=startpt[0] || lastpty!=startpt[1]){
    curPath=[]
    curLength=0
    subpaths.push(curPath)
    first=false
   }
   lastptx=endpt[0]
   lastpty=endpt[1]
  }
  if(s[0]==GraphicsPath.QUAD ||
      s[0]==GraphicsPath.CUBIC ||
      s[0]==GraphicsPath.ARC){
   var pieces=[]
   var cumulativeLengths=[]
   var len=0
   if(s[0]==GraphicsPath.QUAD){
    GraphicsPath._flattenQuad(s[1],s[2],s[3],s[4],
      s[5],s[6],0.0,1.0,pieces,flatness*2,1)
   } else if(s[0]==GraphicsPath.CUBIC){
    GraphicsPath._flattenCubic(s[1],s[2],s[3],s[4],
      s[5],s[6],s[7],s[8],0.0,1.0,pieces,flatness*2,1)
   } else if(s[0]==GraphicsPath.ARC){
    GraphicsPath._flattenArc(s,0.0,1.0,pieces,flatness*2,1)
   }
   for(var j=0;j<pieces.length;j+=3){
    cumulativeLengths.push(len)
    len+=pieces[j+2]
   }
   curPath.push([s[0],len,curLength,s.slice(0),pieces,cumulativeLengths])
   curLength+=len
  } else if(s[0]==GraphicsPath.LINE){
   var dx=s[3]-s[1]
   var dy=s[4]-s[2]
   var len=Math.sqrt(dx*dx+dy*dy)
   curPath.push([s[0],len,curLength,s.slice(0)])
   curLength+=len
  }
 }
 for(var i=0;i<subpaths.length;i++){
  curves.push(new GraphicsPath._Curve(subpaths[i]))
 }
 return new GraphicsPath._CurveList(curves)
}

/**
* Gets an array of points evenly spaced across the length
* of the path.
* @param {number} numPoints Number of points to return.
* @param {number} [flatness] When curves and arcs
* are decomposed to line segments for the purpose of
* calculating their length, the
* segments will be close to the true path of the curve by this
* value, given in units.  If null or omitted, default is 1.
* @return {Array<Array<number>>} Array of points lying on
* the path and evenly spaced across the length of the path,
* starting and ending with the path's endpoints.  Returns
* an empty array if <i>numPoints</i> is less than 1.  Returns
* an array consisting of the start point if <i>numPoints</i>
* is 1.
*/
GraphicsPath.prototype.getPoints=function(numPoints,flatness){
 if(numPoints<1)return []
 if(numPoints==1){
  return [this._start()]
 }
 if(numPoints==2){
  return [this._start(),this._end()]
 }
 var curves=this.getCurves(flatness)
 var points=[]
 for(var i=0;i<numPoints;i++){
  var t=i/(numPoints-1)
  var ev=curves.evaluate(t)
  points.push([ev[0],ev[1]])
 }
 return points
}
/**
 * Makes this path closed.  Adds a line segment to the
 * path's start position, if necessary.
 * @return {GraphicsPath} This object.
 */
GraphicsPath.prototype.closePath=function(){
 if(this.startPos[0]!=this.endPos[0] ||
   this.startPos[1]!=this.endPos[1]){
  this.lineTo(this.startPos[0],this.startPos[1])
 }
 if(this.segments.length>0){
  this.segments.push([GraphicsPath.CLOSE])
 }
 this.incomplete=false
 return this;
}
/**
 * Moves the current start position and end position.
 * @param {number} x
 * @param {number} y
 * @return {GraphicsPath} This object.
 */
GraphicsPath.prototype.moveTo=function(x,y){
 this.startPos[0]=x
 this.startPos[1]=y
 this.endPos[0]=x
 this.endPos[1]=y
 this.incomplete=false
 return this
}
/**
 * Adds a line segment to the path, starting
 * at the path's end position, then
 * sets the end position to the end of the segment.
 * @param {number} x X-coordinate of the end of the line segment.
 * @param {number} y Y-coordinate of the end of the line segment.
 * @return {GraphicsPath} This object.
 */
GraphicsPath.prototype.lineTo=function(x,y){
 this.segments.push([GraphicsPath.LINE,
  this.endPos[0],this.endPos[1],x,y])
 this.endPos[0]=x
 this.endPos[1]=y
 this.incomplete=false
 return this
}

GraphicsPath._areCollinear=function(x0,y0,x1,y1,x2,y2){
  var t1 = x1 - x0;
  var t2 = y1 - y0;
  var t3 = [x2 - x0, y2 - y0];
  var denom=((t1 * t1) + t2 * t2);
  if(denom==0){
   return true; // first two points are the same
  }
  var t4 = (((t1 * t3[0]) + t2 * t3[1]) / denom);
  var t5 = [(x0 + t4 * t1), (y0 + t4 * t2)];
  var t6 = [x2 - t5[0], y2 - t5[1]];
  return ((t6[0] * t6[0]) + t6[1] * t6[1])==0;
}
/**
 * Adds path segments in the form of a circular arc to this path,
 * using the parameterization specified in the "arcTo" method of the
 * HTML Canvas 2D Context.
 * @param {number} x1 X-coordinate of a point that, along with the
 * current end point, forms a tangent line.  The point where the
 * circle touches this tangent line is the start point of the arc, and if the
 * point isn't the same as the current end point, this method adds
 * a line segment connecting the two points.
 * @param {number} y1 Y-coordinate of the point described under "x1".
 * @param {number} x2 X-coordinate of a point that, along with the
 * point (x1, y1), forms a tangent line.  The point where the
 * circle touches this tangent line is the end point of the arc.
 * @param {number} y2 Y-coordinate of the point described under "x2".
 * @param {number} radius Radius of the circle the arc forms a part of.
 * @return {GraphicsPath} This object.
 */
GraphicsPath.prototype.arcTo=function(x1,y1,x2,y2,radius){
 if(radius<0){
  throw new Error("IndexSizeError")
 }
 var x0=this.endPos[0]
 var y0=this.endPos[1]
 if(radius==0 || (x0==x1 && y0==y1) || (x1==x2 && y1==y2) ||
   GraphicsPath._areCollinear(x0,y0,x1,y1,x2,y2)){
  return this.lineTo(x1,y1)
 }
  var t1 = [x0 - x1, y0 - y1];
  var t2 = 1.0/Math.sqrt(((t1[0] * t1[0]) + t1[1] * t1[1]));
  var t3 = [t1[0] * t2, t1[1] * t2]; // tangent vector from p1 to p0
  var t4 = [x2 - x1, y2 - y1];
  var t5 = 1.0/Math.sqrt(((t4[0] * t4[0]) + t4[1] * t4[1]));
  var t6 = [t4[0] * t5, t4[1] * t5]; // tangent vector from p2 to p1
  var cross = t3[0] * t6[1] - t3[1] * t6[0];
  var t7 = (((1.0 + ((t3[0] * t6[0]) + t3[1] * t6[1]))) * radius / Math.abs(cross));
  var t8 = [t3[0] * t7, t3[1] * t7];
  var t10 = [t6[0] * t7, t6[1] * t7];
  var startTangent = [x1 + t8[0], y1 + t8[1]];
  var endTangent = [x1 + t10[0], y1 + t10[1]];
  this.lineTo(startTangent[0],startTangent[1]);
  var sweep=(cross<0);
  return this.arcSvgTo(radius,radius,0,false,sweep,endTangent[0],endTangent[1]);
}
/**
 * Adds path segments in the form of a circular arc to this path,
 * using the parameterization specified in the "arc" method of the
 * HTML Canvas 2D Context.
 * @param {number} x X-coordinate of the center of the circle that the arc forms a part of.
 * @param {number} y Y-coordinate of the circle's center.
 * @param {number} radius Radius of the circle's center.
 * @param {number} startAngle Starting angle of the arc, in radians.
 * 0 means the positive X-axis, &pi;/2 means the positive Y-axis,
 * &pi; means the negative X-axis, and &pi;*1.5 means the negative Y-axis.
 * @param {number} endAngle Ending angle of the arc, in radians.
 * @param {boolean} ccw Whether the arc runs counterclockwise
 * (assuming the X axis points right and the Y axis points
 * down under the coordinate system).
 * @return {GraphicsPath} This object.
 */
GraphicsPath.prototype.arc=function(x,y,radius,startAngle,endAngle,ccw){
 if(radius<0){
  throw new Error("IndexSizeError")
 }
 var x0=this.endPos[0]
 var y0=this.endPos[1]
 var twopi=GLMath.PiTimes2;
 var startX=x+radius*Math.cos(startAngle);
 var startY=y+radius*Math.sin(startAngle);
 var endX=x+radius*Math.cos(endAngle);
 var endY=y+radius*Math.sin(endAngle);
 if((startX==endX && startY==endY) || radius==0){
    return this.lineTo(startX,startY).lineTo(endX,endY);
 }
 if((!ccw && (endAngle-startAngle)>=twopi) ||
   (ccw && (startAngle-endAngle)>=twopi)){
    return this.lineTo(startX,startY)
       .arc(x,y,radius,startAngle,startAngle+Math.PI,ccw)
       .arc(x,y,radius,startAngle+Math.PI,startAngle+GLMath.PiTimes2,ccw)
       .lineTo(startX,startY)
} else {
 var delta=endAngle-startAngle;
 if(delta>=twopi || delta<0){
 var d=delta%twopi
 if(d==0 && delta!=0){
  return this.lineTo(startX,startY)
       .arc(x,y,radius,startAngle,startAngle+Math.PI,ccw)
       .arc(x,y,radius,startAngle+Math.PI,startAngle+GLMath.PiTimes2,ccw)
       .lineTo(startX,startY)
 }
 delta=d
}
var largeArc=(Math.abs(delta)>Math.PI)^(ccw)^(startAngle>endAngle)
var sweep=(delta>0)^(ccw)^(startAngle>endAngle)
return this.lineTo(startX,startY)
      .arcSvgTo(radius,radius,0,largeArc,sweep,endX,endY);
 }
}

/**
 * Adds a quadratic B&eacute;zier curve to this path starting
 * at this path's current position.
 * @param {number} x X-coordinate of the curve's control point.
 * @param {number} y Y-coordinate of the curve's control point.
 * @param {number} x2 X-coordinate of the curve's end point.
 * @param {number} y2 Y-coordinate of the curve's end point.
 * @return {GraphicsPath} This object.
 */
GraphicsPath.prototype.quadraticCurveTo=function(x,y,x2,y2){
 this.segments.push([GraphicsPath.QUAD,
  this.endPos[0],this.endPos[1],x,y,x2,y2])
 this.endPos[0]=x2
 this.endPos[1]=y2
 this.incomplete=false
 return this
}
/**
 * Adds a cubic B&eacute;zier curve to this path starting
 * at this path's current position.
 * @param {number} x
 * @param {number} y
 * @param {number} x2
 * @param {number} y2
 * @param {number} x3 X-coordinate of the curve's end point.
 * @param {number} y3 Y-coordinate of the curve's end point.
 * @return {GraphicsPath} This object.
 */
GraphicsPath.prototype.bezierCurveTo=function(x,y,x2,y2,x3,y3){
 this.segments.push([GraphicsPath.CUBIC,
  this.endPos[0],this.endPos[1],x,y,x2,y2,x3,y3])
 this.endPos[0]=x3
 this.endPos[1]=y3
 this.incomplete=false
 return this
}
/**
* Estimates the integral of a function.  The integral
* is the area between the function's graph and the X-axis,
* where areas above the X axis add to the integral, and areas
* below the X axis subtract from it.
* @private
* @param {Function} func A function that takes one number
* and returns a number.  For best results,
* the function should be continuous (informally, this means
* its graph between <code>xmin</code> and
* <code>xmax</code> can be drawn without lifting the pen).
* @param {Number} xmin Smallest input to the function,
* or the lower limit to integration.
* @param {Number} xmax Largest input to the function,
* or the upper limit to integration.  If xmax is less than xmin,
* this results in a negative integral.
* @param {Number} [maxIter] Maximum iterations.
* If null or undefined, does 8 iterations.
* @returns The approximate integral of _func_ between
* _xmin_ and _xmax_.
*/
GraphicsPath._numIntegrate=function(func, xmin, xmax, maxIter){
 if(xmax==xmin)return 0;
 if(xmax<xmin){
  return GraphicsPath._numIntegrate(func,xmax,xmin,maxIter)
 }
 if(maxIter==null)maxIter=8
 if(maxIter<=0)return 0;
 // Romberg integration
 var matrix=[0]
 var hk=(xmax-xmin)
 var lasthk=hk
 var klimit=0
 for(var k=1;k<=maxIter;k++){
  if(k==1){
   matrix[k]=hk*0.5*(func(xmin)+func(xmax))
   klimit=1
  } else {
   var tmp=0
   for(var j=1;j<=klimit;j++){
    tmp+=func(xmin+(j-0.5)*lasthk)
   }
   tmp*=lasthk
   matrix[k]=(matrix[k-1]+tmp)*0.5
   klimit<<=1
  }
  lasthk=hk
  hk*=0.5
 }
 var mxi=maxIter+1
 var pj1=4
 for(var j=2;j<=maxIter;j++){
  var prev=matrix[j-1]
  var recipPj1m1=1.0/(pj1-1);
  for(var i=j;i<=maxIter;i++){
   var cur=matrix[i]
   matrix[i]=(cur*pj1-prev)*recipPj1m1
   prev=cur
  }
  pj1*=4
 }
 return matrix[matrix.length-1]
}
GraphicsPath._ellipticArcLength=function(xRadius,yRadius,startAngle,endAngle){
 if(startAngle==endAngle || xRadius<=0 || yRadius<=0)return 0
 if(xRadius==yRadius){
  // for circular arc length this is extremely simple
  return Math.abs((endAngle-startAngle)*xRadius);
 }
 var mn=Math.min(xRadius,yRadius)
 var mx=Math.max(xRadius,yRadius)
 var eccSq=1-(mn*mn)/(mx*mx)
 var ellipticIntegrand=function(x){
  var s=Math.sin(x);
  return Math.sqrt(1-s*s*eccSq);
 }
 return Math.abs(mx*GraphicsPath._numIntegrate(
   ellipticIntegrand,startAngle,endAngle,10))
}
GraphicsPath._vecangle=function(a,b,c,d){
 var dot=a*c+b*d
 var denom=Math.sqrt(a*a+b*b)*Math.sqrt(c*c+d*d)
 dot/=denom
 var sgn=a*d-b*c
 // avoid NaN when dot is just slightly out of range
 // for acos
 if(dot<-1)dot=-1
 else if(dot>1)dot=1
 var ret=Math.acos(dot)
 if(sgn<0)ret=-ret
 return ret
}
GraphicsPath._arcSvgToCenterParam=function(a){
 var x1=a[1]
 var y1=a[2]
 var x2=a[8]
 var y2=a[9]
 var rx=a[3]
 var ry=a[4]
 var rot=a[5]
 var xmid=(x1-x2)*0.5
 var ymid=(y1-y2)*0.5
 var xpmid=(x1+x2)*0.5
 var ypmid=(y1+y2)*0.5
 var crot = Math.cos(rot);
 var srot = (rot>=0 && rot<6.283185307179586) ? (rot<=3.141592653589793 ? Math.sqrt(1.0-crot*crot) : -Math.sqrt(1.0-crot*crot)) : Math.sin(rot);
 var x1p=crot*xmid+srot*ymid
 var y1p=crot*ymid-srot*xmid
 var rxsq=rx*rx
 var rysq=ry*ry
 var x1psq=x1p*x1p
 var y1psq=y1p*y1p
 var rx_xy=rxsq*y1psq+rysq*x1psq
 var cxsqrt=Math.sqrt(Math.max(0,(rxsq*rysq-rx_xy)/rx_xy))
 var cxp=(rx*y1p)*cxsqrt/ry
 var cyp=(ry*x1p)*cxsqrt/rx
 if(a[6]==a[7]){
  cxp=-cxp
 } else {
  cyp=-cyp
 }
 var cx=crot*cxp-srot*cyp+xpmid
 var cy=srot*cxp+crot*cyp+ypmid
 var vecx=(x1p-cxp)/rx
 var vecy=(y1p-cyp)/ry
 var nvecx=(-x1p-cxp)/rx
 var nvecy=(-y1p-cyp)/ry
 var cosTheta1=vecx/Math.sqrt(vecx*vecx+vecy*vecy)
 // avoid NaN when cosTheta1 is just slightly out of range
 // for acos
 if(cosTheta1<-1)cosTheta1=-1
 else if(cosTheta1>1)cosTheta1=1
 var theta1=Math.acos(cosTheta1)
 if(vecy<0)theta1=-theta1
 var delta=GraphicsPath._vecangle(vecx,vecy,nvecx,nvecy)
 delta=(delta<0) ? GLMath.PiTimes2+delta : delta;
 if(!a[7] && delta>0){
  delta-=GLMath.PiTimes2
 } else if(a[7] && delta<0){
  delta+=GLMath.PiTimes2
 }
 delta+=theta1
 return [cx,cy,theta1,delta]
}

/**
 * Adds path segments in the form of an elliptical arc to this path,
 * using the parameterization used by the SVG specification.
 * @param {number} rx X-axis radius of the ellipse that the arc will
 * be formed from.
 * @param {number} ry Y-axis radius of the ellipse that the arc will
 * be formed from.
 * @param {number} rot Rotation of the ellipse in degrees (clockwise
 * assuming the X axis points right and the Y axis points
 * down under the coordinate system).
 * @param {boolean} largeArc In general, there are four possible solutions
 * for arcs given the start and end points, rotation, and x- and y-radii.  If true,
 * chooses an arc solution with the larger arc length; if false, smaller.
 * @param {boolean} sweep If true, the arc solution chosen will run
 * clockwise (assuming the X axis points right and the Y axis points
 * down under the coordinate system); if false, counterclockwise.
 * @param {number} x2 X-coordinate of the arc's end point.
 * @param {number} y2 Y-coordinate of the arc's end point.
 * @return {GraphicsPath} This object.
 */
GraphicsPath.prototype.arcSvgTo=function(rx,ry,rot,largeArc,sweep,x2,y2){
 if(rx==0 || ry==0){
  return this.lineTo(x2,y2);
 }
 var x1=this.endPos[0]
 var y1=this.endPos[1]
 if(x1==x2 && y1==y2){
  return this;
 }
 rot*=Math.PI/180;
 rx=Math.abs(rx);
 ry=Math.abs(ry);
 var xmid=(x1-x2)*0.5
 var ymid=(y1-y2)*0.5
 var crot = Math.cos(rot);
 var srot = (rot>=0 && rot<6.283185307179586) ? (rot<=3.141592653589793 ? Math.sqrt(1.0-crot*crot) : -Math.sqrt(1.0-crot*crot)) : Math.sin(rot);
 var x1p=crot*xmid+srot*ymid
 var y1p=crot*ymid-srot*xmid
 var lam=(x1p*x1p)/(rx*rx)+(y1p*y1p)/(ry*ry);
 if(lam>1){
  lam=Math.sqrt(lam)
  rx*=lam
  ry*=lam
 }
 var arc=[GraphicsPath.ARC,
  x1,y1,rx,ry,rot,!!largeArc,!!sweep,x2,y2]
 var cp=GraphicsPath._arcSvgToCenterParam(arc)
 arc[10]=cp[0]
 arc[11]=cp[1]
 arc[12]=cp[2]
 arc[13]=cp[3]
 this.segments.push(arc)
 this.endPos[0]=x2
 this.endPos[1]=y2
 this.incomplete=false
 return this
}
GraphicsPath._nextAfterWs=function(str,index){
 while(index[0]<str.length){
  var c=str.charCodeAt(index[0])
  index[0]++
  if(c==0x20 || c==0x0d || c==0x09 || c==0x0a || c==0x0c)
   continue;
  return c
 }
 return -1
}
GraphicsPath._nextAfterSepReq=function(str,index){
 var comma=false
 var havesep=false
 while(index[0]<str.length){
  var c=str.charCodeAt(index[0])
  index[0]++
  if(c==0x20 || c==0x0d || c==0x09 || c==0x0a || c==0x0c){
   havesep=true
   continue;
  }
  if(!comma && c==0x2c){
   havesep=true
   comma=true
   continue;
  }
  return (!havesep) ? -1 : c
 }
 return -1
}
GraphicsPath._nextAfterSep=function(str,index){
 var comma=false
 while(index[0]<str.length){
  var c=str.charCodeAt(index[0])
  index[0]++
  if(c==0x20 || c==0x0d || c==0x09 || c==0x0a || c==0x0c)
   continue;
  if(!comma && c==0x2c){
   comma=true
   continue;
  }
  return c
 }
 return -1
}
GraphicsPath._peekNextNumber=function(str,index){
 var oldindex=index[0]
 var ret=GraphicsPath._nextNumber(str,index,true)!=null
 index[0]=oldindex
 return ret
}
GraphicsPath._notFinite=function(n){
 return isNaN(n) || n==Number.POSITIVE_INFINITY ||
   n==Number.NEGATIVE_INFINITY
}
GraphicsPath._nextNumber=function(str,index,afterSep){
 var oldindex=index[0]
 var c=(afterSep) ?
   GraphicsPath._nextAfterSep(str,index) :
   GraphicsPath._nextAfterWs(str,index)
 var startIndex=index[0]-1
 var dot=false
 var digit=false
 var exponent=false
 var ret;
 if(c==0x2e)dot=true
 else if(c>=0x30 && c<=0x39)digit=true
 else if(c!=0x2d && c!=0x2b){
    index[0]=oldindex
    return null
   }
 while(index[0]<str.length){
  var c=str.charCodeAt(index[0])
  index[0]++
  if(c==0x2e){
   if(dot){
    index[0]=oldindex
    return null
   }
   dot=true
  } else if(c>=0x30 && c<=0x39){
   digit=true
  } else if(c==0x45 || c==0x65){
   if(!digit){
    index[0]=oldindex
    return null
   }
   exponent=true
   break
  } else {
   if(!digit){
    index[0]=oldindex
    return null
   }
   index[0]--
   ret=parseFloat(str.substr(startIndex,index[0]-startIndex))
   if(GraphicsPath._notFinite(ret)){
    index[0]=oldindex
    return null
   }
   return ret
  }
 }
 if(exponent){
  var c=str.charCodeAt(index[0])
  if(c<0){
    index[0]=oldindex
    return null
   }
  index[0]++
  digit=false
  if(c>=0x30 && c<=0x39)digit=true
  else if(c!=0x2d && c!=0x2b){
    index[0]=oldindex
    return null
   }
  while(index[0]<str.length){
   var c=str.charCodeAt(index[0])
   index[0]++
   if(c>=0x30 && c<=0x39){
    digit=true
   } else {
    if(!digit){
    index[0]=oldindex
    return null
    }
    index[0]--
    ret=parseFloat(str.substr(startIndex,index[0]-startIndex))
    if(GraphicsPath._notFinite(ret)){
     index[0]=oldindex
     return null
    }
    return ret
   }
  }
  if(!digit){
    index[0]=oldindex
    return null
  }
 } else {
  if(!digit){
    index[0]=oldindex
    return null
  }
 }
 ret=parseFloat(str.substr(startIndex,str.length-startIndex))
 if(GraphicsPath._notFinite(ret)){
  index[0]=oldindex
  return null
 }
 return ret
}
/**
 * Not documented yet.
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @return {GraphicsPath} This object.
 */
GraphicsPath.prototype.rect=function(x,y,w,h){
 return this.moveTo(x,y).lineTo(x+width,y).lineTo(x+width,y+height)
   .lineTo(x,y+height).closePath().moveTo(x,y)
}

/**
* Creates a graphics path from a string whose format follows
* the SVG specification.
* @param {string} str A string, in the SVG path format, representing
* a two-dimensional path.  An SVG path consists of a number of
* path segments, starting with a single letter, as follows:
* <ul>
* <li>M/m (x y) - Moves the current position to (x, y). Further
* XY pairs specify line segments.
* <li>L/l (x y) - Specifies line segments to the given XY points.
* <li>H/h (x) - Specifies horizontal line segments to the given X points.
* <li>V/v (y) - Specifies vertical line segments to the given Y points.
* <li>Q/q (cx cx x y) - Specifies quadratic B&eacute;zier curves
* (see quadCurveTo).
* <li>T/t (x y) - Specifies quadratic curves tangent to the previous
* quadratic curve.
* <li>C/c (c1x c1y c2x c2y x y) - Specifies cubic B&eacute;zier curves
* (see bezierCurveTo).
* <li>S/s (c2x c2y x y) - Specifies cubic curves tangent to the previous
* cubic curve.
* <li>A/a (rx ry rot largeArc sweep x y) - Specifies arcs (see arcSvgTo).
* "largeArc" and "sweep" are flags, "0" for false and "1" for true.
* "rot" is in degrees.
* <li>Z/z - Closes the current path; similar to adding a line segment
* to the first XY point given in the last M/m command.
* </ul>
* Lower-case letters mean any X and Y coordinates are relative
* to the current position of the path.  Each group of parameters
* can be repeated in the same path segment. Each parameter after
* the starting letter is separated by whitespace and/or a single comma,
* and the starting letter can be separated by whitespace.
* This separation can be left out as long as doing so doesn't
* introduce ambiguity.  All commands set the current point
* to the end of the path segment (including Z/z, which adds a line
* segment if needed).
* @return {GraphicsPath} The resulting path.  If an error
* occurs while parsing the path, the path's "isIncomplete() method
* will return <code>true</code>.
* @example <caption>The following example creates a graphics path
* from an SVG string describing a polyline.</caption>
* var path=GraphicsPath.fromString("M10,20L40,30,24,32,55,22")
*/
GraphicsPath.fromString=function(str){
 var index=[0]
 var started=false
 var ret=new GraphicsPath()
 var failed=false;
 while(!failed && index[0]<str.length){
  var c=GraphicsPath._nextAfterWs(str,index)
  if(!started && c!=0x4d && c!=0x6d){
   // not a move-to command when path
   // started
    failed=true;break;
  }
  // NOTE: Doesn't implement SVG2 meaning of Z
  // command yet because it's not yet fully specified
  switch(c){
   case 0x5a:case 0x7a:{ // 'Z', 'z'
    ret.closePath()
    break;
   }
   case 0x4d:case 0x6d:{ // 'M', 'm'
    var sep=false
    while(true){
     var curx=(c==0x6d) ? ret.endPos[0] : 0
     var cury=(c==0x6d) ? ret.endPos[1] : 0
     var x=GraphicsPath._nextNumber(str,index,sep)
     if(x==null){ if(!sep)failed=true;break; }
     var y=GraphicsPath._nextNumber(str,index,true)
     if(y==null){ failed=true;break; }
     if(sep)ret.lineTo(curx+x,cury+y)
     else ret.moveTo(curx+x,cury+y);
     sep=true;
    }
    started=true
    break;
   }
   case 0x4c:case 0x6c:{ // 'L', 'l'
    var sep=false
    while(true){
     var curx=(c==0x6c) ? ret.endPos[0] : 0
     var cury=(c==0x6c) ? ret.endPos[1] : 0
     var x=GraphicsPath._nextNumber(str,index,sep)
     if(x==null){ if(!sep)failed=true;break; }
     var y=GraphicsPath._nextNumber(str,index,true)
     if(y==null){ failed=true;break; }
     ret.lineTo(curx+x,cury+y);
     sep=true;
    }
    break;
   }
   case 0x48:case 0x68:{ // 'H', 'h'
    var sep=false
    while(true){
     var curpt=(c==0x68) ? ret.endPos[0] : 0
     var x=GraphicsPath._nextNumber(str,index,sep)
     if(x==null){ if(!sep)failed=true;break; }
     ret.lineTo(curpt+x,ret.endPos[1]);
     sep=true;
    }
    break;
   }
   case 0x56:case 0x76:{ // 'V', 'v'
    var sep=false
    while(true){
     var curpt=(c==0x76) ? ret.endPos[1] : 0
     var x=GraphicsPath._nextNumber(str,index,sep)
     if(x==null){ if(!sep)failed=true;break; }
     ret.lineTo(ret.endPos[0],curpt+x);
     sep=true;
    }
    break;
   }
   case 0x43:case 0x63:{ // 'C', 'c'
    var sep=false
    while(true){
     var curx=(c==0x63) ? ret.endPos[0] : 0
     var cury=(c==0x63) ? ret.endPos[1] : 0
     var x=GraphicsPath._nextNumber(str,index,sep)
     if(x==null){ if(!sep)failed=true;break; }
     var y=GraphicsPath._nextNumber(str,index,true)
     if(y==null){ failed=true;break; }
     var x2=GraphicsPath._nextNumber(str,index,true)
     if(x2==null){ failed=true;break; }
     var y2=GraphicsPath._nextNumber(str,index,true)
     if(y2==null){ failed=true;break; }
     var x3=GraphicsPath._nextNumber(str,index,true)
     if(x3==null){ failed=true;break; }
     var y3=GraphicsPath._nextNumber(str,index,true)
     if(y3==null){ failed=true;break; }
     ret.bezierCurveTo(curx+x,cury+y,curx+x2,cury+y2,
       curx+x3,cury+y3);
     sep=true;
    }
    break;
   }
   case 0x51:case 0x71:{ // 'Q', 'q'
    var sep=false
    while(true){
     var curx=(c==0x71) ? ret.endPos[0] : 0
     var cury=(c==0x71) ? ret.endPos[1] : 0
     var x=GraphicsPath._nextNumber(str,index,sep)
     if(x==null){ if(!sep)failed=true;break; }
     var y=GraphicsPath._nextNumber(str,index,true)
     if(y==null){ failed=true;break; }
     var x2=GraphicsPath._nextNumber(str,index,true)
     if(x2==null){ failed=true;break; }
     var y2=GraphicsPath._nextNumber(str,index,true)
     if(y2==null){ failed=true;break; }
     ret.quadraticCurveTo(curx+x,cury+y,curx+x2,cury+y2);
     sep=true;
    }
    break;
   }
   case 0x41:case 0x61:{ // 'A', 'a'
    var sep=false
    while(true){
     var curx=(c==0x61) ? ret.endPos[0] : 0
     var cury=(c==0x61) ? ret.endPos[1] : 0
     var x=GraphicsPath._nextNumber(str,index,sep)
     if(x==null){ if(!sep)failed=true;break; }
     var y=GraphicsPath._nextNumber(str,index,true)
     if(y==null){ failed=true;break; }
     var rot=GraphicsPath._nextNumber(str,index,true)
     if(rot==null){ failed=true;break; }
     var largeArc=GraphicsPath._nextAfterSepReq(str,index)
     var sweep=GraphicsPath._nextAfterSep(str,index)
     if(largeArc==-1 || sweep==-1){ failed=true;break; }
     var x2=GraphicsPath._nextNumber(str,index,true)
     if(x2==null){ failed=true;break; }
     var y2=GraphicsPath._nextNumber(str,index,true)
     if(y2==null){ failed=true;break; }
     ret.arcSvgTo(x+curx,y+cury,rot,largeArc!=0x30,
       sweep!=0x30,x2+curx,y2+cury);
     sep=true;
    }
    break;
   }
   case 0x53:case 0x73:{ // 'S', 's'
    var sep=false
    while(true){
     var curx=(c==0x73) ? ret.endPos[0] : 0
     var cury=(c==0x73) ? ret.endPos[1] : 0
     var x=GraphicsPath._nextNumber(str,index,sep)
     if(x==null){ if(!sep)failed=true;break; }
     var y=GraphicsPath._nextNumber(str,index,true)
     if(y==null){ failed=true;break; }
     var x2=GraphicsPath._nextNumber(str,index,true)
     if(x2==null){ failed=true;break; }
     var y2=GraphicsPath._nextNumber(str,index,true)
     if(y2==null){ failed=true;break; }
     var xcp=curx
     var ycp=cury
     if(ret.segments.length>0 &&
        ret.segments[ret.segments.length-1][0]==GraphicsPath.CUBIC){
        xcp=ret.segments[ret.segments.length-1][5]
        ycp=ret.segments[ret.segments.length-1][6]
     }
     ret.bezierCurveTo(2*curx-xcp,2*cury-ycp,x+curx,y+cury,x2+curx,y2+cury);
     sep=true;
    }
    break;
   }
   case 0x54:case 0x74:{ // 'T', 't'
    var sep=false
    while(true){
     var curx=(c==0x74) ? ret.endPos[0] : 0
     var cury=(c==0x74) ? ret.endPos[1] : 0
     var x=GraphicsPath._nextNumber(str,index,sep)
     if(x==null){ if(!sep)failed=true;break; }
     var y=GraphicsPath._nextNumber(str,index,true)
     if(y==null){ failed=true;break; }
     var xcp=curx
     var ycp=cury
     if(ret.segments.length>0 &&
        ret.segments[ret.segments.length-1][0]==GraphicsPath.QUAD){
        xcp=ret.segments[ret.segments.length-1][3]
        ycp=ret.segments[ret.segments.length-1][4]
     }
     x+=curx
     y+=cury
     ret.quadraticCurveTo(2*curx-xcp,2*cury-ycp,x+curx,y+cury);
     sep=true;
    }
    break;
   }
   default:
    ret.incomplete=true;
    return ret
  }
 }
 if(failed)ret.incomplete=true
 return ret
}

var Triangulate={}
Triangulate._LinkedList=function(){
 this.items=[]
 this.firstItem=-1
 this.lastItem=-1
 this.lastRemovedIndex=-1
}
Triangulate._LinkedList.prototype.list=function(list){
 var index=this.firstItem
 var listidx=0
 while(index>=0){
  list[listidx++]=this.items[index]
  index=this.items[index+2]
 }
 return listidx
}
Triangulate._LinkedList.prototype.contains=function(item){
 var index=this.firstItem
 while(index>=0){
  if(item==this.items[index])return true
  index=this.items[index+2]
 }
 return false
}
Triangulate._LinkedList.prototype.remove=function(item){
 var index=this.firstItem
 while(index>=0){
  if(this.items[index]==item){
   this.lastRemovedIndex=index
   var prevItem=this.items[index+1]
   var nextItem=this.items[index+2]
   if(prevItem>=0){
    this.items[prevItem+2]=nextItem
   } else {
    this.firstItem=nextItem
   }
   if(nextItem>=0){
    this.items[nextItem+1]=prevItem
   } else {
    this.lastItem=prevItem
   }
   return
  }
  index=this.items[index+2]
 }
}
Triangulate._LinkedList.prototype.addIfMissing=function(item){
 if(!this.contains(item)){
  this.add(item)
 }
}
Triangulate._LinkedList.prototype.add=function(item){
 var itemIndex=(this.lastRemovedIndex==-1) ?
   this.items.length : this.lastRemovedIndex
 this.lastRemovedIndex=-1
 this.items[itemIndex]=item
 if(this.lastItem>=0)
  this.items[this.lastItem+2]=itemIndex // prev's next
 this.items[itemIndex+1]=this.lastItem // current's prev
 this.items[itemIndex+2]=-1 // current's next
 this.lastItem=itemIndex
 if(this.firstItem<0)this.firstItem=itemIndex
}

Triangulate._CONVEX=1
Triangulate._EAR=2
Triangulate._REFLEX=3
Triangulate._PREV=2
Triangulate._NEXT=3
Triangulate._pointInTri=function(vertices,i1,i2,i3,pt){
  var t1 = Math.min (vertices[i3+0], vertices[i1+0]);
  var t2 = Math.min (vertices[i3+1], vertices[i1+1]);
  var t=(((vertices[i1+0] < vertices[pt+0]) == (vertices[pt+0] <= vertices[i3+0])) &&
  (((vertices[pt+1] - t2) * (Math.max (vertices[i3+0], vertices[i1+0]) - t1)) < ((Math.max (vertices[i3+1], vertices[i1+1]) - t2) * (vertices[pt+0] - t1))));
  var t4 = Math.min (vertices[i1+0], vertices[i2+0]);
  var t5 = Math.min (vertices[i1+1], vertices[i2+1]);
  t^=(((vertices[i2+0] < vertices[pt+0]) == (vertices[pt+0] <= vertices[i1+0])) &&
   (((vertices[pt+1] - t5) * (Math.max (vertices[i1+0], vertices[i2+0]) - t4)) < ((Math.max (vertices[i1+1], vertices[i2+1]) - t5) * (vertices[pt+0] - t4))));
  var t7 = Math.min (vertices[i2+0], vertices[i3+0]);
  var t8 = Math.min (vertices[i2+1], vertices[i3+1]);
  t^=(((vertices[i3+0] < vertices[pt+0]) == (vertices[pt+0] <= vertices[i2+0])) &&
   (((vertices[pt+1] - t8) * (Math.max (vertices[i2+0], vertices[i3+0]) - t7)) < ((Math.max (vertices[i2+1], vertices[i3+1]) - t8) * (vertices[pt+0] - t7))));
  return t
}

Triangulate._vertClass=function(verts,index,ori){
 var prevVert=verts[index+2]
 var nextVert=verts[index+3]
 var curori=Triangulate._triOrient(verts,prevVert,index,nextVert)
 if(curori==0 || curori==ori){
  // This is a convex vertex, find out whether this
  // is an ear
  var prevVert=verts[index+2]
  var nextVert=verts[index+3]
  for(var i=0;i<verts.length;i+=4){
   if(i!=prevVert && i!=nextVert && i!=index){
    if(Triangulate._pointInTri(verts,prevVert,index,nextVert,i)){
     return Triangulate._CONVEX
    }
   }
  }
  return Triangulate._EAR
 } else {
  return Triangulate._REFLEX;
 }
}
Triangulate._triOrient=function(vertices,i1,i2,i3){
 var acx=vertices[i1]-vertices[i3]
 var acy=vertices[i1+1]-vertices[i3+1]
 var bcx=vertices[i2]-vertices[i3]
 var bcy=vertices[i2+1]-vertices[i3+1]
 var cross=acx*bcy-acy*bcx
 return cross==0 ? 0 : (cross<0 ? -1 : 1)
}
Triangulate._triangulate=function(vertices,tris){
 if(vertices.length<6){
  // too few vertices for a triangulation
  return
 }
 var vertLength=vertices.length
 // For convenience, eliminate the last
 // vertex if it matches the first vertex
 if(vertLength>=4 &&
    vertices[0]==vertices[vertLength-2] &&
    vertices[1]==vertices[vertLength-1]){
  vertLength-=2
 }
 if(vertLength==6){
  // just one triangle
  tris.push(vertices.slice(0))
  return
 }
 // Find the prevailing orientation of the polygon
 var ori=0
 for(var i=0;i<vertices.length;i+=2){
  if(i==vertices.length-2){
   ori+=vertices[i]*vertices[1]-vertices[i+1]*vertices[0];
  } else {
   ori+=vertices[i]*vertices[i+3]-vertices[i+1]*vertices[i+2];
  }
 }
 ori=(ori==0) ? 0 : (ori<0 ? -1 : 1);
 if(ori==0){
  // Zero area or even a certain self-intersecting
  // polygon
  return
 }
 var verts=[]
 var tmp=[]
 var reflex=new Triangulate._LinkedList()
 var ears=new Triangulate._LinkedList()
 var lastX=-1
 var lastY=-1
 for(var i=0;i<vertLength;i+=2){
  var x=vertices[i]
  var y=vertices[i+1]
  if(i>0 && x==lastX && y==lastY){
   // skip consecutive duplicate points
   continue;
  }
  lastX=x
  lastY=y
  verts.push(x,y,0,0)
 }
 for(var index=0;index<verts.length;index+=4){
  var prevVert=(index==0) ? verts.length-4 : index-4
  var nextVert=(index==verts.length-4) ? 0 : index+4
  verts[index+Triangulate._PREV]=prevVert
  verts[index+Triangulate._NEXT]=nextVert
 }
 for(var index=0;index<verts.length;index+=4){
  var vertexClass=Triangulate._vertClass(verts,index,ori)
  if(vertexClass==Triangulate._EAR)
   ears.add(index)
  else if(vertexClass==Triangulate._REFLEX)
   reflex.add(index)
 }
 while(true){
  var earLength=ears.list(tmp)
  if(earLength<=0)break;
  for(var i=0;i<earLength;i++){
   var ear=tmp[i]
   //console.log("processing "+[ear/4,prevVert/4,nextVert/4])
   var prevVert=verts[ear+Triangulate._PREV]
   var nextVert=verts[ear+Triangulate._NEXT]
   if(ear==prevVert || ear==nextVert || prevVert==nextVert){
    ears.remove(ear)
    continue;
   }
   // remove the ear from the linked list
   verts[prevVert+Triangulate._NEXT]=nextVert
   verts[nextVert+Triangulate._PREV]=prevVert
   tris.push([
    verts[prevVert],verts[prevVert+1],
    verts[ear],verts[ear+1],
    verts[nextVert],verts[nextVert+1]])
   ears.remove(ear)
   // reclassify vertices
   var prevClass=Triangulate._vertClass(verts,prevVert,ori)
   var nextClass=Triangulate._vertClass(verts,nextVert,ori)
   if(prevClass!=Triangulate._REFLEX){
    reflex.remove(prevVert)
   } else {
    reflex.addIfMissing(prevVert)
   }
   if(prevClass!=Triangulate._EAR){
    ears.remove(prevVert)
   } else {
    ears.addIfMissing(prevVert)
   }
   if(nextClass!=Triangulate._REFLEX){
    reflex.remove(nextVert)
   } else {
    reflex.addIfMissing(nextVert)
   }
   if(nextClass!=Triangulate._EAR){
    ears.remove(nextVert)
   } else {
    ears.addIfMissing(nextVert)
   }
  }
 }
}
