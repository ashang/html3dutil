# H3DU.PiecewiseCurve

[Back to documentation index.](index.md)

<a name='H3DU.PiecewiseCurve'></a>
### H3DU.PiecewiseCurve(curves)

**Augments:** <a href="H3DU.Curve.md">H3DU.Curve</a>

A <a href="H3DU.Curve.md">curve evaluator object</a> for a curve
made up of one or more individual curves.

The combined curve's U coordinates range from 0 to N,
where N is the number of curves. In this way, the integer
part of a U coordinate indicates the curve the coordinate
refers to. For example, if there are four curves, coordinates
from 0, but less than 1, belong to the first curve, and coordinates
from 1, but less than 2, belong to the second curve. The U
coordinate equal to N refers to the end of the last curve in
the piecewise curve.

#### Parameters

* `curves` (Type: Array.&lt;Object>)<br>An array of curve evaluator objects, such as an instance of <a href="H3DU.Curve.md">H3DU.Curve</a> or one of its subclasses. The combined curve should be continuous in that the curves that make it up should connect at their end points (except the curve need not be closed).

### Methods

* [accel](#H3DU.PiecewiseCurve_accel)<br>Finds an approximate acceleration vector at the given U coordinate of this curve.
* [arcLength](#H3DU.PiecewiseCurve_arcLength)<br>Finds an approximate arc length (distance) between the start of this
curve and the point at the given U coordinate of this curve.
* [changeEnds](#H3DU.PiecewiseCurve_changeEnds)<br>Creates a curve evaluator object for a curve that is generated using
the same formula as this one (and uses the same U coordinates),
but has a different set of end points.
* [endPoints](#H3DU.PiecewiseCurve_endPoints)<br>Returns the starting and ending U coordinates of this curve.
* [evaluate](#H3DU.PiecewiseCurve_evaluate)<br>Finds the position of this curve at the given U coordinate.
* [fitRange](#H3DU.PiecewiseCurve_fitRange)<br>Creates a curve evaluator object for a curve that follows the same
path as this one but has its U coordinates remapped to fit the given range.
* [fromCatmullRomSpline](#H3DU.PiecewiseCurve.fromCatmullRomSpline)<br>Creates a piecewise curve made up of B-spline curves from the control points of a
cubic Catmull-Rom spline.
* [fromHermiteSpline](#H3DU.PiecewiseCurve.fromHermiteSpline)<br>Creates a piecewise curve made up of B-spline curves from the control points of a
Hermite spline.
* [fromTCBSpline](#H3DU.PiecewiseCurve.fromTCBSpline)<br>Creates a piecewise curve made up of B-spline curves from the control points of a
cubic TCB spline (tension/continuity/bias spline, also known as Kochanek-Bartels spline).
* [getCurves](#H3DU.PiecewiseCurve_getCurves)<br>Gets a reference to the curves that make up this piecewise curve.
* [getLength](#H3DU.PiecewiseCurve_getLength)<br>Convenience method for getting the total length of this curve.
* [getPoints](#H3DU.PiecewiseCurve_getPoints)<br>Gets an array of positions on the curve at fixed intervals
of U coordinates.
* [jerk](#H3DU.PiecewiseCurve_jerk)<br>Finds an approximate jerk vector at the given U coordinate of this curve.
* [normal](#H3DU.PiecewiseCurve_normal)<br>Finds an approximate principal normal vector at the given U coordinate of this curve.
* [tangent](#H3DU.PiecewiseCurve_tangent)<br>Convenience method for finding an approximate tangent vector of this curve at the given U coordinate.
* [toArcLengthParam](#H3DU.PiecewiseCurve_toArcLengthParam)<br>Creates a curve evaluator object for a curve that follows the same
path as this one but has its U coordinates remapped to
an <i>arc length parameterization</i>.
* [velocity](#H3DU.PiecewiseCurve_velocity)<br>Finds an approximate velocity vector at the given U coordinate of this curve.

<a name='H3DU.PiecewiseCurve_accel'></a>
### H3DU.PiecewiseCurve#accel(u)

Finds an approximate acceleration vector at the given U coordinate of this curve.
The implementation in <a href="H3DU.Curve.md">H3DU.Curve</a> calls the evaluator's <code>accel</code>
method if it implements it; otherwise, does a numerical differentiation using
the velocity vector.

The <b>acceleration</b> of a curve is a vector which is the second-order derivative of the curve's position at the given coordinate. The vector returned by this method <i>should not</i> be "normalized" to a <a href="tutorial-glmath.md">unit vector</a>.

#### Parameters

* `u` (Type: number)<br>U coordinate of a point on the curve.

#### Return Value

An array describing an acceleration vector. It should have at least as many
elements as the number of dimensions of the underlying curve. (Type: Array.&lt;number>)

<a name='H3DU.PiecewiseCurve_arcLength'></a>
### H3DU.PiecewiseCurve#arcLength(u)

Finds an approximate arc length (distance) between the start of this
curve and the point at the given U coordinate of this curve.

#### Parameters

* `u` (Type: number)<br>U coordinate of a point on the curve.

#### Return Value

The approximate arc length of this curve at the given U coordinate. (Type: number)

<a name='H3DU.PiecewiseCurve_changeEnds'></a>
### H3DU.PiecewiseCurve#changeEnds(ep1, ep2)

Creates a curve evaluator object for a curve that is generated using
the same formula as this one (and uses the same U coordinates),
but has a different set of end points.
For example, this method can be used to shrink the path of a curve
from [0, &pi;] to [0, &pi;/8].

Note, however, that in general, shrinking
the range of a curve will not shrink the length of a curve
in the same proportion, unless the curve's path runs at
constant speed with respect to time. For example, shrinking the range of a curve
from [0, 1] to [0, 0.5] will not generally result in a curve that's exactly half as
long as the original curve.

#### Parameters

* `ep1` (Type: number)<br>New start point of the curve.
* `ep2` (Type: number)<br>New end point of the curve.

#### Return Value

Return value. (Type: <a href="H3DU.Curve.md">H3DU.Curve</a>)

<a name='H3DU.PiecewiseCurve_endPoints'></a>
### H3DU.PiecewiseCurve#endPoints()

Returns the starting and ending U coordinates of this curve.

#### Return Value

A two-element array. The first element is the starting coordinate of
the curve, and the second is its ending coordinate.
Returns <code>[0, n]</code>, where <code>n</code> is the number
of curves that make up this piecewise curve.

<a name='H3DU.PiecewiseCurve_evaluate'></a>
### H3DU.PiecewiseCurve#evaluate(u)

Finds the position of this curve at the given U coordinate.

#### Parameters

* `u` (Type: number)<br>U coordinate of a point on the curve.

#### Return Value

An array describing a position. It should have at least as many
elements as the number of dimensions of the underlying curve. (Type: Array.&lt;number>)

<a name='H3DU.PiecewiseCurve_fitRange'></a>
### H3DU.PiecewiseCurve#fitRange(ep1, ep2)

Creates a curve evaluator object for a curve that follows the same
path as this one but has its U coordinates remapped to fit the given range.
For example, this method can be used to shrink the range of U coordinates
from [-&pi;, &pi;] to [0, 1] without shortening the path of the curve.
Here, -&pi; now maps to 0, and &pi; now maps to 1.

#### Parameters

* `ep1` (Type: number)<br>New value to use as the start point of the curve.
* `ep2` (Type: number)<br>New value to use as the end point of the curve.

#### Return Value

Return value. (Type: <a href="H3DU.Curve.md">H3DU.Curve</a>)

<a name='H3DU.PiecewiseCurve.fromCatmullRomSpline'></a>
### (static) H3DU.PiecewiseCurve.fromCatmullRomSpline(spline, [param], [closed])

Creates a piecewise curve made up of B-spline curves from the control points of a
cubic Catmull-Rom spline. A Catmull-Rom spline is defined by
a collection of control points that the spline
will go through, and the shape of each curve segment is also determined by the positions
of neighboring points on the spline.

To use this method, you must include the script "extras/spline.js". Example:

    <script type="text/javascript" src="extras/spline.js"></script>

#### Parameters

* `spline` (Type: Array.&lt;Array.&lt;number>>)<br>An array of control points, each with the same number of values, that the curve will pass through. Throws an error if there are fewer than two control points.
* `param` (Type: number) (optional)<br>A value that describes the curve's parameterization. Ranges from 0 to 1. A value of 0 indicates a uniform parameterization, 0.5 indicates a centripetal parameterization, and 1 indicates a chordal parameterization. Default is 0.5.
* `closed` (Type: number) (optional)<br>If true, connects the last control point of the curve with the first. Default is false.

#### Return Value

A piecewise curve made up of cubic B-spline curves describing the same path as the Catmull-Rom spline. (Type: <a href="H3DU.PiecewiseCurve.md">H3DU.PiecewiseCurve</a>)

<a name='H3DU.PiecewiseCurve.fromHermiteSpline'></a>
### (static) H3DU.PiecewiseCurve.fromHermiteSpline(curve)

Creates a piecewise curve made up of B-spline curves from the control points of a
Hermite spline. A Hermite spline is a collection of points that the curve will go through,
together with the velocity vectors (derivatives or instantaneous rates of change) at
those points.

Hermite splines are useful for representing an approximate polynomial form
of a function or curve whose derivative is known; however, Hermite splines are not
guaranteed to preserve the increasing or decreasing nature of the function or curve.

To use this method, you must include the script "extras/spline.js". Example:

    <script type="text/javascript" src="extras/spline.js"></script>

#### Parameters

* `curve` (Type: Array.&lt;Array.&lt;number>>)<br>An array of control points, each with the same number of values, that describe a Hermite spline. Each pair of control points takes up two elements of the array and consists of the coordinates of that point followed by the velocity vector (derivative) at that point. The array must have an even number of control points and at least four control points.

#### Return Value

A piecewise curve made up of cubic B-spline curves describing the
same path as the Hermite spline. (Type: <a href="H3DU.PiecewiseCurve.md">H3DU.PiecewiseCurve</a>)

<a name='H3DU.PiecewiseCurve.fromTCBSpline'></a>
### (static) H3DU.PiecewiseCurve.fromTCBSpline(spline, [tension], [continuity], [bias], [closed], [rigidEnds])

Creates a piecewise curve made up of B-spline curves from the control points of a
cubic TCB spline (tension/continuity/bias spline, also known as Kochanek-Bartels spline).
(If tension, continuity, and bias are all 0, the result is a cubic Catmull-Rom spline
in uniform parameterization.)

To use this method, you must include the script "extras/spline.js". Example:

    <script type="text/javascript" src="extras/spline.js"></script>

#### Parameters

* `spline` (Type: Array.&lt;Array.&lt;number>>)<br>An array of control points, each with the same number of values, that the curve will pass through. Throws an error if there are fewer than two control points.
* `tension` (Type: number) (optional)<br>A parameter that adjusts the length of the starting and ending tangents of each curve segment. Ranges from -1 for double-length tangents to 1 for zero-length tangents. A value of 1 results in straight line segments. Default is 0.
* `continuity` (Type: number) (optional)<br>A parameter that adjusts the direction of the starting and ending tangents of each curve segment. Ranges from -1 to 1, where values closer to -1 or closer to 1 result in tangents that are closer to perpendicular. A value of -1 results in straight line segments. Default is 0.
* `bias` (Type: number) (optional)<br>A parameter that adjusts the influence of the starting and ending tangents of each curve segment. The greater this number, the greater the ending tangents influence the direction of the next curve segment in comparison to the starting tangents. Ranges from -1 to 1. Default is 0.
* `closed` (Type: number) (optional)<br>If true, connects the last control point of the curve with the first. Default is false.
* `rigidEnds` (Type: number) (optional)<br>If true, the start and end of the piecewise curve will, by default, more rigidly follow the direction to the next or previous control point, respectively. This makes the curve compatible with GDI+ cardinal splines with 0 continuity, 0 bias, and tension equal to <code>-((T\*2)-1)</code>, where T is the GDI+ cardinal spline tension parameter. Default is false.

#### Return Value

A piecewise curve made up of cubic B-spline curves describing the
same path as the TCB spline. (Type: <a href="H3DU.PiecewiseCurve.md">H3DU.PiecewiseCurve</a>)

<a name='H3DU.PiecewiseCurve_getCurves'></a>
### H3DU.PiecewiseCurve#getCurves()

Gets a reference to the curves that make up this piecewise curve.

#### Return Value

The curves that make up this piecewise curve. (Type: Array.&lt;<a href="H3DU.Curve.md">H3DU.Curve</a>>)

<a name='H3DU.PiecewiseCurve_getLength'></a>
### H3DU.PiecewiseCurve#getLength()

Convenience method for getting the total length of this curve.

#### Return Value

The distance from the start of the curve to its end. (Type: number)

<a name='H3DU.PiecewiseCurve_getPoints'></a>
### H3DU.PiecewiseCurve#getPoints(count)

Gets an array of positions on the curve at fixed intervals
of U coordinates. Note that these positions will not generally be
evenly spaced along the curve unless the curve uses
an arc-length parameterization.

#### Parameters

* `count` (Type: number)<br>Number of positions to generate. Throws an error if this number is 0. If this value is 1, returns an array containing the starting point of this curve.

#### Return Value

An array of curve positions. The first
element will be the start of the curve. If "count" is 2 or greater, the last element
will be the end of the curve. (Type: Array.&lt;Array.&lt;number>>)

<a name='H3DU.PiecewiseCurve_jerk'></a>
### H3DU.PiecewiseCurve#jerk(u)

Finds an approximate jerk vector at the given U coordinate of this curve.
The implementation in <a href="H3DU.Curve.md">H3DU.Curve</a> calls the evaluator's <code>jerk</code>
method if it implements it; otherwise, does a numerical differentiation using
the acceleration vector.

The <b>jerk</b> of a curve is a vector which is the third-order derivative of the curve's position at the given coordinate. The vector returned by this method <i>should not</i> be "normalized" to a <a href="tutorial-glmath.md">unit vector</a>.

#### Parameters

* `u` (Type: number)<br>U coordinate of a point on the curve.

#### Return Value

An array describing a jerk vector. It should have at least as many
elements as the number of dimensions of the underlying curve. (Type: Array.&lt;number>)

<a name='H3DU.PiecewiseCurve_normal'></a>
### H3DU.PiecewiseCurve#normal(u)

Finds an approximate principal normal vector at the given U coordinate of this curve.
The implementation in <a href="H3DU.Curve.md">H3DU.Curve</a> calls the evaluator's <code>normal</code>
method if it implements it; otherwise, does a numerical differentiation using the velocity vector.

The <b>principal normal</b> of a curve is the derivative of the "normalized" velocity
vector divided by that derivative's length. The normal returned by this method
<i>should</i> be "normalized" to a <a href="tutorial-glmath.md">unit vector</a>. (Compare with <a href="H3DU.Surface.md#H3DU.Surface_gradient">H3DU.Surface#gradient</a>.)

#### Parameters

* `u` (Type: number)<br>U coordinate of a point on the curve.

#### Return Value

An array describing a normal vector. It should have at least as many
elements as the number of dimensions of the underlying curve. (Type: Array.&lt;number>)

<a name='H3DU.PiecewiseCurve_tangent'></a>
### H3DU.PiecewiseCurve#tangent(u)

Convenience method for finding an approximate tangent vector of this curve at the given U coordinate.
The <b>tangent vector</b> is the same as the velocity vector, but "normalized" to a unit vector.

#### Parameters

* `u` (Type: number)<br>U coordinate of a point on the curve.

#### Return Value

An array describing a normal vector. It should have at least as many
elements as the number of dimensions of the underlying curve. (Type: Array.&lt;number>)

<a name='H3DU.PiecewiseCurve_toArcLengthParam'></a>
### H3DU.PiecewiseCurve#toArcLengthParam()

Creates a curve evaluator object for a curve that follows the same
path as this one but has its U coordinates remapped to
an <i>arc length parameterization</i>. Arc length
parameterization allows for moving along a curve's path at a uniform
speed and for generating points which are spaced evenly along that
path -- both features are more difficult with most other kinds
of curve parameterization.

The <i>end points</i> of the curve (obtained by calling the <code>endPoints</code>
method) will be (0, N), where N is the distance to the end of the curve from its
start.

When converting to an arc length parameterization, the curve
should be continuous and have a speed greater than 0 at every
point on the curve. The arc length parameterization used in
this method is approximate.

#### Return Value

Return value. (Type: <a href="H3DU.Curve.md">H3DU.Curve</a>)

<a name='H3DU.PiecewiseCurve_velocity'></a>
### H3DU.PiecewiseCurve#velocity(u)

Finds an approximate velocity vector at the given U coordinate of this curve.

#### Parameters

* `u` (Type: number)<br>U coordinate of a point on the curve.

#### Return Value

An array describing a velocity vector. It should have at least as many
elements as the number of dimensions of the underlying curve. (Type: Array.&lt;number>)

[Back to documentation index.](index.md)
