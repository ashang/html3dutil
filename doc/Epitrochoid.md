# Epitrochoid

[Back to documentation index.](index.md)

<a name='Epitrochoid'></a>
### Epitrochoid(outerRadius, rollerRadius, distFromRollerCenter, [rotationDegrees])

**Augments:** Curve

A curve evaluator object for a curve drawn by a circle that rolls along the outside
of another circle, whose position is fixed, with a center of (0,0).
The rolling circle will start at the positive X axis of the fixed circle.

The following curves can be generated with this class (in the following
descriptions, O = <code>outerRadius</code>, R means <code>rollerRadius</code>,
and D = <code>distFromRollerCenter</code>).<ul>
<li>Epicycloid: D = R (epitrochoid touching the fixed circle).</li>
<li>Curtate epicycloid: D < R (epitrochoid not touching the fixed circle).</li>
<li>Prolate epicycloid: D > R (epitrochoid crossing the fixed circle).</li>
<li>Cardioid: R = O; D = O.</li>
<li>Nephroid: R = O/2; D = O/2.</li>
<li>Ranunculoid: R = O/5; D = O/5.</li>
<li>N-cusped epicycloid: R = O/N; D = O/N.</li>
<li>Circle: O = 0; the radius will be R - D.</li></ul>

This class is considered a supplementary class to the
Public Domain HTML 3D Library and is not considered part of that
library.

To use this class, you must include the script "extras/evaluators.js"; the
class is not included in the "h3du_min.js" file which makes up
the HTML 3D Library. Example:

    <script type="text/javascript" src="extras/evaluators.js"></script>

#### Parameters

* `outerRadius` (Type: number)<br>Radius of the circle whose position is fixed.
* `rollerRadius` (Type: number)<br>Radius of the rolling circle. An epicycloid results when distFromRollerCenter=rollerRadius.
* `distFromRollerCenter` (Type: number)<br>Distance from the center of the rolling circle to the drawing pen.
* `rotationDegrees` (Type: number) (optional)<br>Starting angle of the curve from the positive X axis toward the positive Y axis, in degrees. Default is 0.

### Methods

* [endPoints](#Epitrochoid_endPoints)<br>Gets the endpoints of this curve.
* [evaluate](#Epitrochoid_evaluate)<br>Generates a point on the curve from the given U coordinate.
* [scaleTo](#Epitrochoid_scaleTo)<br>Creates a modified version of this curve so that it
fits the given radius.

<a name='Epitrochoid_endPoints'></a>
### Epitrochoid#endPoints()

Gets the endpoints of this curve.
For this curve evaluator object, the curve
starts at 0 and ends at &pi;\*2.

#### Return Value

An array containing the two
endpoints of the curve. The first number is the start of the curve,
and the second number is the end of the curve. \* (Type: Array.&lt;number>)

<a name='Epitrochoid_evaluate'></a>
### Epitrochoid#evaluate(u)

Generates a point on the curve from the given U coordinate.

#### Parameters

* `u` (Type: number)<br>U coordinate.

#### Return Value

A 3-element array specifying a 3D point.
Only the X and Y coordinates will be other than 0. (Type: Array.&lt;number>)

<a name='Epitrochoid_scaleTo'></a>
### Epitrochoid#scaleTo(radius)

Creates a modified version of this curve so that it
fits the given radius.

#### Parameters

* `radius` (Type: number)<br>Desired radius of the curve.

#### Return Value

Return value. (Type: <a href="Epitrochoid.md">Epitrochoid</a>)

[Back to documentation index.](index.md)
