/* global H3DU */
var Polyhedra = {};
/**
 * TODO: Not documented yet.
 * @param {*} vertices
 * @param {*} radius
 */
Polyhedra.normDistances = function(vertices, radius) {
  // Normalize distances from the origin
  "use strict";
  for(var i = 0;i < vertices.length;i += 3) {
    var vx = vertices[i];
    var vy = vertices[i + 1];
    var vz = vertices[i + 2];
    var norm = radius / Math.sqrt(vx * vx + vy * vy + vz * vz);
    vertices[i] *= norm;
    vertices[i + 1] *= norm;
    vertices[i + 2] *= norm;
  }
};
/**
 * TODO: Not documented yet.
 * @param {*} vertices
 * @param {*} radius
 */
Polyhedra.scaleVertices = function(vertices, radius) {
  "use strict";
  for(var i = 0;i < vertices.length;i += 3) {

    vertices[i] *= radius;
    vertices[i + 1] *= radius;
    vertices[i + 2] *= radius;
  }
};
/**
 * TODO: Not documented yet.
 * @param {*} vi
 * @param {*} radius
 * @param {*} level
 */
Polyhedra.makeSphere = function(vi, radius, level) {
  "use strict";
  var vertices = vi[0];
  var indices = vi[1];
  if(level === null || typeof level === "undefined" || level <= 0) {
    Polyhedra.scaleVertices(vertices, radius);
    return;
  }
  Polyhedra.normDistances(vertices, radius);
 // Subdivide the triangles into many smaller triangles
  for(var i = 0;i < level;i++) {
    var tris = indices.length;
    for(var j = 0;j < tris;j += 3) {
      var i1 = indices[j];
      var i2 = indices[j + 1];
      var i3 = indices[j + 2];
     // Subdivide the triangle into four triangles
      var i1t3 = i1 * 3;
      var i2t3 = i2 * 3;
      var i3t3 = i3 * 3;
      var t1 = [vertices[i1t3], vertices[i1t3 + 1], vertices[i1t3 + 2]];
      var t2 = [vertices[i2t3], vertices[i2t3 + 1], vertices[i2t3 + 2]];
      var t3 = [vertices[i3t3], vertices[i3t3 + 1], vertices[i3t3 + 2]];
      var t12 = H3DU.Math.vec3lerp(t1, t2, 0.5);
      var t23 = H3DU.Math.vec3lerp(t2, t3, 0.5);
      var t31 = H3DU.Math.vec3lerp(t3, t1, 0.5);
      var c = vertices.length / 3 | 0;
      var it12 = c;
      var it23 = c + 1;
      var it31 = c + 2;
      indices[j] = i1;
      indices[j + 1] = it12;
      indices[j + 2] = it31;
      indices.push(i2, it23, it12, i3, it31, it23, it12, it23, it31);
      vertices.push(t12[0], t12[1], t12[2], t23[0], t23[1], t23[2],
        t31[0], t31[1], t31[2]);
    }
    Polyhedra.normDistances(vertices, radius);
  }
  return vi;
};
/**
 * TODO: Not documented yet.
 * @param {*} vi
 */
Polyhedra.makeMesh = function(vi) {
 // Create the mesh and generate normals
 // for a flat-shaded appearance
  "use strict";
  return new H3DU.Mesh(vi[0], vi[1]).recalcNormals(true);
};
/**
 * TODO: Not documented yet.
 * @param {*} radius
 * @param {*} level
 */
Polyhedra.octahedron = function(radius, level) {
  "use strict";
  var vi = Polyhedra.octahedronFaces();
  Polyhedra.makeSphere(vi, radius, level);
  return Polyhedra.makeMesh(vi);
};
/**
 * TODO: Not documented yet.
 * @param {*} radius
 * @param {*} level
 */
Polyhedra.hexahedron = function(radius, level) {
  "use strict";
  var vi = Polyhedra.hexahedronFaces();
  Polyhedra.makeSphere(vi, radius, level);
  return Polyhedra.makeMesh(vi);
};
/**
 * TODO: Not documented yet.
 * @param {*} radius
 * @param {*} level
 */
Polyhedra.icosahedron = function(radius, level) {
  "use strict";
  var vi = Polyhedra.icosahedronFaces();
  Polyhedra.makeSphere(vi, radius, level);
  return Polyhedra.makeMesh(vi);
};
/**
 * TODO: Not documented yet.
 * @param {*} radius
 * @param {*} level
 */
Polyhedra.dodecahedron = function(radius, level) {
  "use strict";
  var vi = Polyhedra.dodecahedronFaces();
  Polyhedra.makeSphere(vi, radius, level);
  return Polyhedra.makeMesh(vi);
};
/**
 * TODO: Not documented yet.
 * @param {*} radius
 * @param {*} level
 */
Polyhedra.tetrahedron = function(radius, level) {
  "use strict";
  var vi = Polyhedra.tetrahedronFaces();
  Polyhedra.makeSphere(vi, radius, level);
  return Polyhedra.makeMesh(vi);
};
/**
 * TODO: Not documented yet.
 */
Polyhedra.octahedronFaces = function() {
  "use strict";
  var r = 0.7071067811865476;
  var vertices = [
    -r, 0, r, r, 0, r,
    0, 1, 0, r, 0, -r,
    -r, 0, -r, 0, -1, 0
  ];
  var faces = [
    0, 1, 2,
    1, 3, 2,
    3, 4, 2,
    4, 0, 2,
    0, 4, 5,
    4, 3, 5,
    3, 1, 5,
    1, 0, 5
  ];
  return [vertices, faces];
};
/**
 * TODO: Not documented yet.
 */
Polyhedra.tetrahedronFaces = function() {
  "use strict";
  var vertices = [-0.7745966693186049, -0.4472135954331687, 0.4472135954331687, 0.7745966693186049, -0.4472135954331687, 0.4472135954331687, 0.0, 1.0, 0.0, 0.0, -0.4472135954999579, -0.8944271909999159];
  var faces = [0, 1, 2, 1, 3, 2, 3, 0, 2, 0, 3, 1];
  return [vertices, faces];
};
/**
 * TODO: Not documented yet.
 */
Polyhedra.icosahedronFaces = function() {
  "use strict";
  var vertices = [0.0, 0.8506508083520401, 0.5257311121191336, 0.5257311121191336, 0.0, 0.8506508083520401, -0.5257311121191336, 0.0, 0.8506508083520401, 0.0, -0.8506508083520401, 0.5257311121191336, -0.8506508083520401, 0.5257311121191336, 0.0, -0.8506508083520401, -0.5257311121191336, 0.0, -0.5257311121191336, 0.0, -0.8506508083520401, 0.0, -0.8506508083520401, -0.5257311121191336, 0.0, 0.8506508083520401, -0.5257311121191336, 0.5257311121191336, 0.0, -0.8506508083520401, 0.8506508083520401, 0.5257311121191336, 0.0, 0.8506508083520401, -0.5257311121191336, 0.0];
  var faces = [
    8, 4, 0, 6, 4, 8, 8, 9, 6,
    9, 8, 10, 0, 10, 8, 10, 0, 1,
    2, 1, 0, 0, 4, 2, 5, 2, 4,
    4, 6, 5, 1, 3, 11,
    11, 10, 1, 10, 11, 9,
    2, 5, 3, 3, 1, 2, 3, 7, 11,
    7, 9, 11, 9, 7, 6,
    5, 6, 7, 7, 3, 5
  ];
  return [vertices, faces];
};
/**
 * TODO: Not documented yet.
 */
Polyhedra.hexahedronFaces = function() {
  "use strict";
  var faces = [8, 0, 1, 8, 1, 2, 8, 2, 3, 8, 3, 0, 9, 3, 2, 9, 2, 6, 9, 6, 7, 9, 7, 3, 10, 7, 6, 10, 6, 5, 10, 5, 4, 10, 4, 7, 11, 4, 5, 11, 5, 1, 11, 1, 0, 11, 0, 4, 12, 5, 6, 12, 6, 2, 12, 2, 1, 12, 1, 5, 13, 7, 4, 13, 4, 0, 13, 0, 3, 13, 3, 7];
  var vertices = [-0.5773502691896258, 0.5773502691896258, -0.5773502691896258, 0.5773502691896258, 0.5773502691896258, -0.5773502691896258, 0.5773502691896258, -0.5773502691896258, -0.5773502691896258, -0.5773502691896258, -0.5773502691896258, -0.5773502691896258, -0.5773502691896258, 0.5773502691896258, 0.5773502691896258, 0.5773502691896258, 0.5773502691896258, 0.5773502691896258, 0.5773502691896258, -0.5773502691896258, 0.5773502691896258, -0.5773502691896258, -0.5773502691896258, 0.5773502691896258, 0.0, 0.0, -0.5773502691896258, 0.0, -0.5773502691896258, 0.0, 0.0, 0.0, 0.5773502691896258, 0.0, 0.5773502691896258, 0.0, 0.5773502691896258, 0.0, 0.0, -0.5773502691896258, 0.0, 0.0];
  return [vertices, faces];
};
/**
 * TODO: Not documented yet.
 */
Polyhedra.hexahedronFaces2 = function() {
// Alternate indexing of a hexahedron's faces
  "use strict";
  var v = Polyhedra.hexahedronFaces();
  v[0] = v[0].slice(0, 24);
  v[1] = [0, 1, 2, 0, 2, 3, 3, 2, 6, 3, 6, 7, 7, 6, 5, 7, 5, 4, 4, 5, 1, 4, 1, 0, 5, 6, 2, 5, 2, 1, 7, 4, 0, 7, 0, 3];
  return v;
};
/**
 * TODO: Not documented yet.
 */
Polyhedra.dodecahedronFaces = function() {
  "use strict";
  var faces = [20, 16, 12, 20, 12, 8, 20, 8, 4, 20, 4, 0, 20, 0, 16, 21, 2, 1, 21, 1, 0, 21, 0, 4, 21, 4, 5, 21, 5, 2, 22, 6, 5, 22, 5, 4, 22, 4, 8, 22, 8, 9, 22, 9, 6, 23, 9, 10, 23, 10, 11, 23, 11, 7, 23, 7, 6, 23, 6, 9, 24, 13, 14, 24, 14, 15, 24, 15, 11, 24, 11, 10, 24, 10, 13, 25, 17, 18, 25, 18, 19, 25, 19, 15, 25, 15, 14, 25, 14, 17, 26, 3, 7, 26, 7, 11, 26, 11, 15, 26, 15, 19, 26, 19, 3, 27, 10, 9, 27, 9, 8, 27, 8, 12, 27, 12, 13, 27, 13, 10, 28, 14, 13, 28, 13, 12, 28, 12, 16, 28, 16, 17, 28, 17, 14, 29, 18, 17, 29, 17, 16, 29, 16, 0, 29, 0, 1, 29, 1, 18, 30, 1, 2, 30, 2, 3, 30, 3, 19, 30, 19, 18, 30, 18, 1, 31, 5, 6, 31, 6, 7, 31, 7, 3, 31, 3, 2, 31, 2, 5];
  var vertices = [0.5773502691896258, 0.5773502691896258, 0.5773502691896258, 0.0, 0.35682208977309005, 0.9341723589627156, -0.5773502691896258, 0.5773502691896258, 0.5773502691896258, -0.9341723589627156, 0.0, 0.35682208977309005, 0.35682208977309005, 0.9341723589627156, 0.0, -0.35682208977309005, 0.9341723589627156, 0.0, -0.5773502691896258, 0.5773502691896258, -0.5773502691896258, -0.9341723589627156, 0.0, -0.35682208977309005, 0.5773502691896258, 0.5773502691896258, -0.5773502691896258, 0.0, 0.35682208977309005, -0.9341723589627156, 0.0, -0.35682208977309005, -0.9341723589627156, -0.5773502691896258, -0.5773502691896258, -0.5773502691896258, 0.9341723589627156, 0.0, -0.35682208977309005, 0.5773502691896258, -0.5773502691896258, -0.5773502691896258, 0.35682208977309005, -0.9341723589627156, 0.0, -0.35682208977309005, -0.9341723589627156, 0.0, 0.9341723589627156, 0.0, 0.35682208977309005, 0.5773502691896258, -0.5773502691896258, 0.5773502691896258, 0.0, -0.35682208977309005, 0.9341723589627156, -0.5773502691896258, -0.5773502691896258, 0.5773502691896258, 0.6759734692155546, 0.41777457946839347, 0.0, 0.0, 0.6759734692155546, 0.41777457946839347, 0.0, 0.6759734692155546, -0.41777457946839347, -0.41777457946839347, 0.0, -0.6759734692155546, 0.0, -0.6759734692155546, -0.41777457946839347, 0.0, -0.6759734692155546, 0.41777457946839347, -0.6759734692155546, -0.41777457946839347, 0.0, 0.41777457946839347, 0.0, -0.6759734692155546, 0.6759734692155546, -0.41777457946839347, 0.0, 0.41777457946839347, 0.0, 0.6759734692155546, -0.41777457946839347, 0.0, 0.6759734692155546, -0.6759734692155546, 0.41777457946839347, 0.0];
  return [vertices, faces];
};
/**
 * TODO: Not documented yet.
 */
Polyhedra.dodecahedronFaces2 = function() {
// Alternate indexing of a dodecahedron's faces
  "use strict";
  var df = Polyhedra.dodecahedronFaces();
  df[0] = df[0].slice(0, 60);
  df[1] = [16, 12, 8, 16, 8, 4, 16, 4, 0, 2, 1, 0, 2, 0, 4, 2, 4, 5, 6, 5, 4, 6, 4, 8, 6, 8, 9, 9, 10, 11, 9, 11, 7, 9, 7, 6, 13, 14, 15, 13, 15, 11, 13, 11, 10, 17, 18, 19, 17, 19, 15, 17, 15, 14, 3, 7, 11, 3, 11, 15, 3, 15, 19, 10, 9, 8, 10, 8, 12, 10, 12, 13, 14, 13, 12, 14, 12, 16, 14, 16, 17, 18, 17, 16, 18, 16, 0, 18, 0, 1, 1, 2, 3, 1, 3, 19, 1, 19, 18, 5, 6, 7, 5, 7, 3, 5, 3, 2];
  return df;
};
