# H3DU.Surface

[Back to documentation index.](index.md)

<a name='H3DU.Surface'></a>
### H3DU.Surface(surface)

A surface evaluator object for a parametric surface.

A parametric surface is a surface whose points are based on a
parametric surface function. A surface function takes two numbers
(U and V) and returns a point (in 1, 2, 3 or more dimensions, but
usually 2 or 3) that lies on the surface. For example, in 3
dimensions, a surface function has the following form:

<b>F</b>(u, v) = [ x(u, v), y(u, v), z(u, v) ]

where x(u, v) returns an X coordinate, y(u, v) a Y coordinate,
and z(u, v) returns a Z coordinate.

Specialized surfaces should <a href="tutorial-subclass.md">subclass</a> this class and implement
the <code>evaluate</code> method and, optionally, the other methods mentioned in the "surface" parameter below.

#### Parameters

* `surface` (Type: Object)<br>A <b>surface evaluator object</b>, which is an object that must contain an <code>evaluate</code> method and may contain the <code>endPoints</code>, <code>tangent</code>, <code>bitangent</code>, and/or <code>gradient</code> methods, as described in the corresponding methods of this class.

### Methods

* [bitangent](#H3DU.Surface_bitangent)<br>Finds an approximate bitangent vector of this surface at the given U and V coordinates.
* [endPoints](#H3DU.Surface_endPoints)<br>Returns the starting and ending U and V coordinates of this surface.
* [evaluate](#H3DU.Surface_evaluate)<br>Finds the position of this surface at the given U and V coordinates.
* [gradient](#H3DU.Surface_gradient)<br>Finds an approximate gradient vector of this surface at the given U and V coordinates.
* [normal](#H3DU.Surface_normal)<br>Convenience method for finding an approximate normal vector of this surface at the given U and V coordinates.
* [tangent](#H3DU.Surface_tangent)<br>Finds an approximate tangent vector of this surface at the given U and V coordinates.

<a name='H3DU.Surface_bitangent'></a>
### H3DU.Surface#bitangent(u, v)

Finds an approximate bitangent vector of this surface at the given U and V coordinates.

The implementation in <a href="H3DU.Surface.md">H3DU.Surface</a> calls the evaluator's <code>bitangent</code>
method if it implements it; otherwise, does a numerical differentiation
with respect to the V axis using the <code>evaluate</code> method.

The <b>bitangent vector</b> is the vector pointing in the direction of the V axis, or alternatively,
the partial derivative of the <code>evaluate</code> method with respect to <code>v</code>. The bitangent vector returned by this method <i>should not</i> be "normalized" to a <a href="tutorial-glmath.md">unit vector</a>.

#### Parameters

* `u` (Type: number)<br>U coordinate of a point on the surface.
* `v` (Type: number)<br>V coordinate of a point on the surface.

#### Return Value

An array describing a bitangent vector. It should have at least as many
elements as the number of dimensions of the underlying surface. (Type: Array.&lt;number>)

<a name='H3DU.Surface_endPoints'></a>
### H3DU.Surface#endPoints()

Returns the starting and ending U and V coordinates of this surface.
This method calls the evaluator's <code>endPoints</code>
method if it implements it; otherwise, returns <code>[0, 1, 0, 1]</code>

#### Return Value

A four-element array. The first and second
elements are the starting and ending U coordinates, respectively, of the surface, and the third
and fourth elements are its starting and ending V coordinates.
Returns <code>[0, 1, 0, 1]</code> if the evaluator doesn't implement an <code>endPoints</code>
method.

<a name='H3DU.Surface_evaluate'></a>
### H3DU.Surface#evaluate(u, v)

Finds the position of this surface at the given U and V coordinates.

#### Parameters

* `u` (Type: number)<br>U coordinate of a point on the surface.
* `v` (Type: number)<br>V coordinate of a point on the surface.

#### Return Value

An array describing a position. It should have at least as many
elements as the number of dimensions of the underlying surface. (Type: Array.&lt;number>)

<a name='H3DU.Surface_gradient'></a>
### H3DU.Surface#gradient(u, v)

Finds an approximate gradient vector of this surface at the given U and V coordinates.

The implementation in <a href="H3DU.Surface.md">H3DU.Surface</a> calls the evaluator's <code>gradient</code>
method if it implements it; otherwise uses the surface's tangent and bitangent vectors to implement the gradient
(however, this approach is generally only meaningful for a three-dimensional surface).

The <b>gradient</b> is a vector pointing up and away from the surface.
If the evaluator describes a regular three-dimensional surface (usually
a continuous, unbroken surface such as a sphere, an open
cylinder, or a disk rotated in three dimensions), this can be the cross product
of the <a href="H3DU.Surface.md#H3DU.Surface_tangent">tangent vector</a>
and <a href="H3DU.Surface.md#H3DU.Surface_bitangent">bitangent vector</a>,
in that order. The gradient returned by this method <i>should not</i> be "normalized" to a <a href="tutorial-glmath.md">unit vector</a>.

#### Parameters

* `u` (Type: number)<br>U coordinate of a point on the surface.
* `v` (Type: number)<br>V coordinate of a point on the surface.

#### Return Value

An array describing a gradient vector. It should have at least as many
elements as the number of dimensions of the underlying surface. (Type: Array.&lt;number>)

<a name='H3DU.Surface_normal'></a>
### H3DU.Surface#normal(u, v)

Convenience method for finding an approximate normal vector of this surface at the given U and V coordinates.
The <b>normal vector</b> is the same as the gradient vector, but "normalized" to a unit vector.

#### Parameters

* `u` (Type: number)<br>U coordinate of a point on the surface.
* `v` (Type: number)<br>V coordinate of a point on the surface.

#### Return Value

An array describing a normal vector. It should have at least as many
elements as the number of dimensions of the underlying surface. (Type: Array.&lt;number>)

<a name='H3DU.Surface_tangent'></a>
### H3DU.Surface#tangent(u, v)

Finds an approximate tangent vector of this surface at the given U and V coordinates.
The implementation in <a href="H3DU.Surface.md">H3DU.Surface</a> calls the evaluator's <code>tangent</code>
method if it implements it; otherwise, does a numerical differentiation
with respect to the U axis using the <code>evaluate</code> method.

The <b>tangent vector</b> is the vector pointing in the direction of the U axis,
or alternatively, the partial derivative of the <code>evaluate</code> method with respect to <code>u</code>.
The tangent vector returned by this method <i>should not</i> be "normalized" to a <a href="tutorial-glmath.md">unit vector</a>.

#### Parameters

* `u` (Type: number)<br>U coordinate of a point on the surface.
* `v` (Type: number)<br>V coordinate of a point on the surface.

#### Return Value

An array describing a tangent vector. It should have at least as many
elements as the number of dimensions of the underlying surface. (Type: Array.&lt;number>)

[Back to documentation index.](index.md)