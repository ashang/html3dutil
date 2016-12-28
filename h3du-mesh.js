/*
Written by Peter O. in 2015.

Any copyright is dedicated to the Public Domain.
http://creativecommons.org/publicdomain/zero/1.0/
If you like this, you should donate to Peter O.
at: http://peteroupc.github.io/
*/
/* global H3DU */
/**
* Specifies the triangles, lines, or points that make up a geometric shape.
* Each vertex, that is, each point, each end of a line, and each corner
* of a triangle, can also specify the following attributes:
* <ul>
* <li>A color, which is a set of 3 values each ranging from 0 to 1 (the red, green,
* and blue components, respectively.)
* <li>A normal vector, which is a set of 3 values.
* Normal values are required for lighting to work properly.
* <li>A tangent vector, which is a set of 3 values.
* <li>A bitangent vector, which is a set of 3 values.
* <li>Texture coordinates, which are a set of 2 values each ranging from 0 to
* 1, where (0, 0) is the lower right corner of the texture (by default), and (1, 1) is the upper
* right corner (by default).
* </ul>
* For bump mapping to work properly, a mesh needs to define
* normals, tangents, bitangents, and texture coordinates.<p>
* See the "{@tutorial shapes}" and "{@tutorial meshexamples}" tutorials.
* <p>NOTE: Previous versions of this class allowed meshes to contain more than one
* primitive type (triangles, lines, and points are the primitive types).  This is
* no longer the case, to simplify the implementation.
* @class
* @alias H3DU.Mesh
* @param {Array<Number>} [vertices] An array that contains data on each
* vertex of the mesh.
* Each vertex is made up of the same number of elements, as defined in
* format. May be null or omitted, in which case an empty vertex array is used.
* @param {Array<Number>} [indices] An array of vertex indices.  Each trio of
* indices specifies a separate triangle, or each pair of indices specifies
* a line segment.
* If null or omitted, creates an initially empty mesh.
* @param {Number} [format] A set of bit flags depending on the kind of data
* each vertex contains.  Each vertex contains 3 elements plus:<ul>
*  <li> 3 more elements if H3DU.Mesh.NORMALS_BIT is set, plus
*  <li> 3 more elements if H3DU.Mesh.COLORS_BIT is set, plus
*  <li> 2 more elements if H3DU.Mesh.TEXCOORDS_BIT is set.</ul>
* If H3DU.Mesh.LINES_BIT is set, each vertex index specifies a point of a line
* segment. If H3DU.Mesh.POINTS_BIT is set, each vertex index specifies an
* individual point. Both bits can't be set.
* May be null or omitted, in which case "format" is set to 0.
*/
H3DU.Mesh = function(vertices, indices, format) {
  "use strict";
  this._initialize(vertices, indices, format);
  this._elementsDefined = 0;
  this.currentMode = -1;
  this.normal = [0, 0, 0];
  this.color = [0, 0, 0];
  this.tangent = [0, 0, 0];
  this.bitangent = [0, 0, 0];
  this.texCoord = [0, 0];
};
/** @private */
H3DU.Mesh._primitiveType = function(mode) {
  "use strict";
  if(mode === H3DU.Mesh.LINES || mode === H3DU.Mesh.LINE_STRIP)
    return H3DU.Mesh.LINES;
  else if(mode === H3DU.Mesh.POINTS)
    return H3DU.Mesh.POINTS;
  else
  return H3DU.Mesh.TRIANGLES;
};
/** @private */
H3DU.Mesh._isCompatibleMode = function(oldMode, newMode) {
  "use strict";
  if(oldMode === newMode)return true;
  if(H3DU.Mesh._primitiveType(oldMode) === H3DU.Mesh._primitiveType(newMode))
    return true;
  return false;
};
/** @private */
H3DU.Mesh._recalcNormalsStart = function(vertices, uniqueVertices, faces, stride, offset, flat) {
  "use strict";
  for(var i = 0;i < vertices.length;i += stride) {
    vertices[i + offset] = 0.0;
    vertices[i + offset + 1] = 0.0;
    vertices[i + offset + 2] = 0.0;
    if(!flat) {
     // If non-flat shading is requested, find all vertices with
     // duplicate vertex positions
      var uv = [vertices[i], vertices[i + 1], vertices[i + 2]];
      if(uniqueVertices[uv])uniqueVertices[uv].push(i + offset);
      else uniqueVertices[uv] = [i + offset];
    }
  }
};
/** @private */
H3DU.Mesh._recalcNormalsFinish = function(vertices, uniqueVertices, faces, stride, offset, flat) {
  "use strict";
  var len;
  var dupverts = [];
  var dupvertcount = 0;
  var i;
  if(!flat) {
   // If non-flat shading is requested, make sure
   // that every vertex with the same position has the
   // same normal
    for(var key in uniqueVertices) {
      if(Object.prototype.hasOwnProperty.call(uniqueVertices, key)) {
        var v = uniqueVertices[key];
        if(v && v.constructor === Array && v.length >= 2) {
          var v0 = v[0];
          var avgx = vertices[v0];
          var avgy = vertices[v0 + 1];
          var avgz = vertices[v0 + 2];
          dupverts[0] = avgx;
          dupverts[1] = avgy;
          dupverts[2] = avgz;
          dupvertcount = 3;
          for(i = 1;i < v.length;i++) {
            var dupfound = false;
            var nx = vertices[v[i]];
            var ny = vertices[v[i] + 1];
            var nz = vertices[v[i] + 2];
            for(var j = 0;j < dupvertcount;j += 3) {
              if(nx === dupverts[j] && ny === dupverts[j + 1] && nz === dupverts[j + 2]) {
                dupfound = true;
                break;
              }
            }
            if(!dupfound) {
              dupverts[dupvertcount++] = nx;
              dupverts[dupvertcount++] = ny;
              dupverts[dupvertcount++] = nz;
              avgx += nx;
              avgy += ny;
              avgz += nz;
            }
          }
          for(i = 0;i < v.length;i++) {
            vertices[v[i]] = avgx;
            vertices[v[i] + 1] = avgy;
            vertices[v[i] + 2] = avgz;
          }
        }
      }
    }
  }
  // Normalize each normal of the vertex
  for(i = 0;i < vertices.length;i += stride) {
    var x = vertices[i + offset];
    var y = vertices[i + offset + 1];
    var z = vertices[i + offset + 2];
    len = Math.sqrt(x * x + y * y + z * z);
    if(len) {
      len = 1.0 / len;
      vertices[i + offset] = x * len;
      vertices[i + offset + 1] = y * len;
      vertices[i + offset + 2] = z * len;
    }
  }
};

/** @private */
H3DU.Mesh._recalcNormals = function(vertices, faces, stride, offset, flat, inward) {
  "use strict";
  var normDir = inward ? -1 : 1;
  var uniqueVertices = {};
  var len;
  H3DU.Mesh._recalcNormalsStart(vertices, uniqueVertices, faces, stride, offset, flat);
  for(var i = 0;i < faces.length;i += 3) {
    var v1 = faces[i] * stride;
    var v2 = faces[i + 1] * stride;
    var v3 = faces[i + 2] * stride;
    var n1 = [vertices[v1] - vertices[v3], vertices[v1 + 1] - vertices[v3 + 1], vertices[v1 + 2] - vertices[v3 + 2]];
    var n2 = [vertices[v2] - vertices[v3], vertices[v2 + 1] - vertices[v3 + 1], vertices[v2 + 2] - vertices[v3 + 2]];
    // cross multiply n1 and n2
    var x = n1[1] * n2[2] - n1[2] * n2[1];
    var y = n1[2] * n2[0] - n1[0] * n2[2];
    var z = n1[0] * n2[1] - n1[1] * n2[0];
    // normalize xyz vector
    len = Math.sqrt(x * x + y * y + z * z);
    if(len !== 0) {
      len = 1.0 / len;
      len *= normDir;
      x *= len;
      y *= len;
      z *= len;
      // add normalized normal to each vertex of the face
      vertices[v1 + offset] += x;
      vertices[v1 + offset + 1] += y;
      vertices[v1 + offset + 2] += z;
      vertices[v2 + offset] += x;
      vertices[v2 + offset + 1] += y;
      vertices[v2 + offset + 2] += z;
      vertices[v3 + offset] += x;
      vertices[v3 + offset + 1] += y;
      vertices[v3 + offset + 2] += z;
    }
  }
  H3DU.Mesh._recalcNormalsFinish(vertices, uniqueVertices, faces, stride, offset, flat);
};

/**
 * Changes the primitive mode for this mesh.
 * Future vertices will be drawn as primitives of the new type.
 * The primitive type can be set to the same mode, in which
 * case future vertices given will not build upon previous
 * vertices.<p>
 * An H3DU.Mesh object can contain primitives of different
 * types, such as triangles and lines.  For example, it's allowed
 * to have a mesh with triangles, then call this method, say,
 * with <code>H3DU.Mesh.LINE_STRIP</code> to add line segments
 * to that mesh.  However, this functionality may be deprecated
 * in future versions.
 * @param {Number} m A primitive type.  One of the following:
 * H3DU.Mesh.TRIANGLES, H3DU.Mesh.LINES, H3DU.Mesh.LINE_STRIP, H3DU.Mesh.TRIANGLE_STRIP,
 * H3DU.Mesh.TRIANGLE_FAN, H3DU.Mesh.QUADS, H3DU.Mesh.QUAD_STRIP.
 * Throws an error if the primitive type is incompatible with the
 * current primitive type (for example, a triangle type with LINE_STRIP).
 * @returns {H3DU.Mesh} This object.
 * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.mode = function(m) {
  "use strict";
 // TODO: Include in release notes that Meshes must use the same primitive type
  if(m < 0)throw new Error("invalid mode");
  if(this.currentMode === -1) {
    var format = 0;
    var primtype = H3DU.Mesh._primitiveType(m);
    if(primtype === H3DU.Mesh.LINES)
      format |= H3DU.Mesh.LINES_BIT;
    else if(primtype === H3DU.Mesh.POINTS)
      format |= H3DU.Mesh.POINTS_BIT;
    this._initialize([], [], format);
    this.currentMode = m;
  } else if(   !H3DU.Mesh._isCompatibleMode(this.currentMode, m)) {
    throw new Error("Storing a different primitive mode in this mesh is no longer supported");
  } else {
    this.newPrimitive();
    this.currentMode = m;
  }
  return this;
};
/**
 * Merges the vertices from another mesh into this one.
 * The vertices from the other mesh will be copied into this one,
 * and the other mesh's indices copied or adapted.
 * Also, resets the primitive
 * mode (see {@link H3DU.Mesh#mode}) so that future vertices given
 * will not build upon previous vertices.
 * @param {H3DU.Mesh} other A mesh to merge into this one. The mesh
 * given in this parameter will remain unchanged.
 * Throws an error if this mesh's primitive type is incompatible with the
 * the other mesh's primitive type (for example, a triangle type with LINE_STRIP).
 * @returns {H3DU.Mesh} This object.
 * @example
 * // Use the following idiom to make a copy of a geometric mesh:
 * var copiedMesh = new H3DU.Mesh().merge(meshToCopy);
 * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.merge = function(other) {
  "use strict";
  if(!H3DU.Mesh._isCompatibleMode(this.currentMode, other.currentMode)) {
    throw new Error("Meshes have incompatible types");
  }
  var thisAttributes = this.attributeBits & H3DU.Mesh.ATTRIBUTES_BITS;
  var otherAttributes = other.attributeBits & H3DU.Mesh.ATTRIBUTES_BITS;
  if(thisAttributes !== otherAttributes) {
    var newAttributes = thisAttributes | otherAttributes;
    // Meshes have different attribute sets, so this will
    // be slower
    if(newAttributes === otherAttributes) {
      // If the other's attributes are a subset, just
      // rebuild the vertices of this mesh
      this._rebuildVertices(newAttributes);
    } else {
      // Copy this mesh to get the correct set of attributes
      // (this will be quite slow, relatively speaking, if the mesh
      // is large)
      var m = new H3DU.Mesh();
      m.currentMode = other.currentMode;
      m._rebuildVertices(otherAttributes);
      m.merge(other);
      other = m;
    }
  }
  var i;
  var oldVertexLength = this.vertexCount();
  var oldIndexLength = this.indices.length;
  this.vertices.push.apply(this.vertices, other.vertices);
  this.indices.push.apply(this.indices, other.indices);
  for(i = oldIndexLength;i < this.indices.length;i++) {
    this.indices[i] += oldVertexLength;
  }
  // Reset the primitive
  this.newPrimitive();
  return this;
};

 /**
  * Sets the current normal for this mesh.  Future vertex positions
  * defined (with vertex3()) will have this normal.  The new current
  * normal will apply to future vertices even if the current mode
  * is TRIANGLE_FAN and some vertices were already given for
  * that mode.  The normal passed to this method will
  * not automatically be normalized to unit length.
  * @param {Number} x X-coordinate of the normal.
   *   If "y" and "z" are null or omitted, this is instead
 *  a 3-element array giving the X, Y, and Z coordinates, or a single number
 * giving the coordinate for all three dimensions.
  * @param {Number} y Y-coordinate of the normal.
 * If "x" is an array, this parameter may be omitted.
  * @param {Number} z Z-coordinate of the normal.
 * If "x" is an array, this parameter may be omitted.
  * @returns {H3DU.Mesh} This object.
  * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.normal3 = function(x, y, z) {
  "use strict";
  if(typeof x === "number" && typeof y === "number" && typeof z === "number") {
    this.normal[0] = x;
    this.normal[1] = y;
    this.normal[2] = z;
  } else {
    this.normal[0] = x[0];
    this.normal[1] = x[1];
    this.normal[2] = x[2];
  }
  this._elementsDefined |= H3DU.Mesh.NORMALS_BIT;
  return this;
};

/**
  * Sets the current tangent vector for this mesh.  Future vertex positions
  * defined (with vertex3()) will have this normal.  The new current
  * tangent will apply to future vertices even if the current mode
  * is TRIANGLE_FAN and some vertices were already given for
  * that mode.  The tangent passed to this method will
  * not automatically be normalized to unit length.
  * @param {Number} x X-coordinate of the tangent vector.
   *   If "y" and "z" are null or omitted, this is instead
 *  a 3-element array giving the X, Y, and Z coordinates, or a single number
 * giving the coordinate for all three dimensions.
  * @param {Number} y Y-coordinate of the tangent vector.
 * If "x" is an array, this parameter may be omitted.
  * @param {Number} z Z-coordinate of the tangent vector.
 * If "x" is an array, this parameter may be omitted.
  * @returns {H3DU.Mesh} This object.
  * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.tangent3 = function(x, y, z) {
  "use strict";
  if(typeof x === "number" && typeof y === "number" && typeof z === "number") {
    this.tangent[0] = x;
    this.tangent[1] = y;
    this.tangent[2] = z;
  } else {
    this.tangent[0] = x[0];
    this.tangent[1] = x[1];
    this.tangent[2] = x[2];
  }
  this._elementsDefined |= H3DU.Mesh.TANGENTS_BIT;
  return this;
};

/**
  * Sets the current bitangent vector for this mesh.  Future vertex positions
  * defined (with vertex3()) will have this bitangent.  The new current
  * bitangent will apply to future vertices even if the current mode
  * is TRIANGLE_FAN and some vertices were already given for
  * that mode.  The bitangent passed to this method will
  * not automatically be normalized to unit length.
  * @param {Number} x X-coordinate of the bitangent vector.
   *   If "y" and "z" are null or omitted, this is instead
 *  a 3-element array giving the X, Y, and Z coordinates, or a single number
 * giving the coordinate for all three dimensions.
  * @param {Number} y Y-coordinate of the bitangent vector.
 * If "x" is an array, this parameter may be omitted.
  * @param {Number} z Z-coordinate of the bitangent vector.
 * If "x" is an array, this parameter may be omitted.
  * @returns {H3DU.Mesh} This object.
  * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.bitangent3 = function(x, y, z) {
  "use strict";
  if(typeof x === "number" && typeof y === "number" && typeof z === "number") {
    this.bitangent[0] = x;
    this.bitangent[1] = y;
    this.bitangent[2] = z;
  } else {
    this.bitangent[0] = x[0];
    this.bitangent[1] = x[1];
    this.bitangent[2] = x[2];
  }
  this._elementsDefined |= H3DU.Mesh.BITANGENTS_BIT;
  return this;
};

 /**
  * Sets the current color for this mesh.  Future vertex positions
  * defined (with vertex3()) will have this color. The new current
  * color will apply to future vertices even if the current mode
  * is TRIANGLE_FAN and some vertices were already given for
  * that mode.  Only the red, green, and blue components will be used.
  * @param {Array<Number>|number|string} r A [color vector or string]{@link H3DU.toGLColor},
  * or the red color component (0-1).
  * @param {Number} g Green color component (0-1).
  * May be null or omitted if a string or array is given as the "r" parameter.
  * @param {Number} b Blue color component (0-1).
  * May be null or omitted if a string or array is given as the "r" parameter.
  * @returns {H3DU.Mesh} This object.
  * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.color3 = function(r, g, b) {
  "use strict";
  if(typeof r === "string") {
    var c = H3DU.toGLColor(r);
    this.color[0] = c[0];
    this.color[1] = c[1];
    this.color[2] = c[2];
  } else if(typeof r === "number" && typeof g === "number" &&
   typeof b === "number") {
    this.color[0] = r;
    this.color[1] = g;
    this.color[2] = b;
  } else {
    this.color[0] = r[0];
    this.color[1] = r[1];
    this.color[2] = r[2];
  }
  this._elementsDefined |= H3DU.Mesh.COLORS_BIT;
  return this;
};
 /**
  * Sets the current texture coordinates for this mesh.  Future vertex positions
  * defined (with vertex3()) will have these texture coordinates.
  * The new current texture coordinates will apply to future vertices
  * even if the current mode
  * is TRIANGLE_FAN and some vertices were already given for
  * that mode.<p>
  H3DU.Texture coordinates are a set of 2 values each ranging from 0 to
* 1, where (0, 0) is the lower right corner of the texture (by default), and (1, 1) is the upper
* right corner (by default).
  * @param {Number} u X-coordinate of the texture, from 0-1.
   *   If "v" are null or omitted, this is instead
 *  a 3-element array giving the X and Y coordinates, or a single number
 * giving the coordinate for all three dimensions.
  * @param {Number} v Y-coordinate of the texture, from 0-1.
  * If "u" is an array, this parameter can be omitted.
  * @returns {H3DU.Mesh} This object.
  * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.texCoord2 = function(u, v) {
  "use strict";
  if(typeof u === "number" && typeof v === "number") {
    this.texCoord[0] = u;
    this.texCoord[1] = v;
  } else {
    this.texCoord[0] = u[0];
    this.texCoord[1] = u[1];
  }
  this._elementsDefined |= H3DU.Mesh.TEXCOORDS_BIT;
  return this;
};
 /**
  * Adds a new vertex to this mesh.  If appropriate, adds an
  * additional face index according to this mesh's current mode.
  * The vertex will adopt this mesh's current normal, color,
  * and texture coordinates if they have been defined.
 * @param {Array<Number>|number} x The X-coordinate.
 *   If "y" and "z" are null or omitted, this is instead
 *  a 3-element array giving the X, Y, and Z coordinates, or a single number
 * giving the coordinate for all three dimensions.
 * @param {Number} y The Y-coordinate.
 * If "x" is an array, this parameter may be omitted.
 * @param {Number} z The Z-coordinate.
 * If "x" is an array, this parameter may be omitted.
  * @returns {H3DU.Mesh} This object.
  * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.vertex3 = function(x, y, z) {
  "use strict";
  if(x !== null && typeof x !== "undefined" && (y === null || typeof y === "undefined") && (z === null || typeof z === "undefined")) {
    if(typeof x !== "number")
      this._vertex3(x[0], x[1], x[2], this);
    else
    this._vertex3(x, x, x, this);
  } else {
    this._vertex3(x, y, z, this);
  }
  return this;
};
 /**
  * Adds a new vertex to this mesh.  The Z-coordinate will
  * be treated as 0.
 * @param {Array<Number>|number} x The X-coordinate.
 * If "y" is null or omitted, this is instead
 * a 3-element array giving the X, Y, and Z coordinates, or a single number
 * giving the coordinate for all three dimensions.
 * @param {Number} y The Y-coordinate.
 * If "x" is an array, this parameter may be omitted.
  * @returns {H3DU.Mesh} This object.
  * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.vertex2 = function(x, y) {
  "use strict";
  if(x !== null && typeof x !== "undefined" && (y === null || typeof y === "undefined")) {
    if(typeof x !== "number")
      return this.vertex3(x[0], x[1], 0.0);
    else
    return this.vertex3(x, x, 0.0);
  } else {
    return this.vertex3(x, y, 0.0);
  }
};
 /**
  * Sets all the vertices in this mesh to the given color.
  * This method doesn't change this mesh's current color.
  * Only the color's red, green, and blue components will be used.
  * @param {Array<Number>|number|string} r A [color vector or string]{@link H3DU.toGLColor},
  * or the red color component (0-1).
  * @param {Number} g Green component of the color (0-1).
  * May be null or omitted if a string is given as the "r" parameter.
  * @param {Number} b Blue component of the color (0-1).
  * May be null or omitted if a string is given as the "r" parameter.
  * @returns {H3DU.Mesh} This object.
  * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.setColor3 = function(r, g, b) {
  "use strict";
  var rr = r;
  var gg = g;
  var bb = b;
  if(typeof r === "string") {
    var c = H3DU.toGLColor(r);
    rr = c[0];
    gg = c[1];
    bb = c[2];
  }
  // console.log([r,g,b,rr,gg,bb])
  this._rebuildVertices(H3DU.Mesh.COLORS_BIT);
  var stride = this.getStride();
  var colorOffset = H3DU.Mesh._colorOffset(this.attributeBits);
  for(var i = colorOffset;i < this.vertices.length;i += stride) {
    this.vertices[i] = rr;
    this.vertices[i + 1] = gg;
    this.vertices[i + 2] = bb;
  }
  return this;
};

/**
 * Modifies this mesh by normalizing the normals it defines
 * to unit length.
 * @returns {H3DU.Mesh} This object.
 * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.normalizeNormals = function() {
  "use strict";
  var i;
  var stride = this.getStride();
  var vertices = this.vertices;
  var normalOffset = H3DU.Mesh._normalOffset(
     this.attributeBits);
  if(normalOffset < 0)return this;
  for(i = 0;i < vertices.length;i += stride) {
    var x = vertices[i + normalOffset];
    var y = vertices[i + normalOffset + 1];
    var z = vertices[i + normalOffset + 2];
    var len = Math.sqrt(x * x + y * y + z * z);
    if(len !== 0) {
      len = 1.0 / len;
      vertices[i + normalOffset] *= len;
      vertices[i + normalOffset + 1] *= len;
      vertices[i + normalOffset + 2] *= len;
    }
  }
  return this;
};

/**
 * Sets the X, Y, and Z coordinates of the vertex with the
 * given index.  Has no effect if the index is less than 0 or
 * equals the number of vertices in this mesh or greater.
 * @param {Number} index Zero-based index of
 * the vertex to set.
  * The index ranges from 0 to less than
 * the number of vertices in the mesh, not the
 * number of vertex indices.
* @param {number|Array<Number>} x X coordinate of the vertex position.
 * Can also be a 3-element array giving
 * the X, Y, and Z coordinates, respectively, of the vertex
 * position.
 * @param {Number} y Y coordinate of the vertex position.
 * May be null or omitted if "x" is an array.
 * @param {Number} z Z coordinate of the vertex position.
 * May be null or omitted if "x" is an array.
 * @returns {H3DU.Mesh} This object.
 * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.setVertex = function(index, x, y, z) {
  "use strict";
  if(index < 0)return this;
  if(typeof y === "undefined" && typeof z === "undefined") {
    y = x[1];
    z = x[2];
    x = x[0];
  }
  var c = this.vertexCount();
  if(index < c) {

    index *= this.getStride();
    this.vertices[index] = x;
    this.vertices[index + 1] = y;
    this.vertices[index + 2] = z;
  }
  return this;
};
/**
 * Sets the normal associated with the vertex with the
 * given index.  Has no effect if the index is less than 0 or
 * equals the number of vertices in this mesh or greater.
 * @param {Number} index Zero-based index of
 * the vertex to set.
 * The index ranges from 0 to less than
 * the number of vertices in the mesh, not the
 * number of vertex indices.
 * @param {number|Array<Number>} x X coordinate of the vertex normal.
 * Can also be a 3-element array giving
 * the X, Y, and Z coordinates, respectively, of the vertex
 * normal.
 * @param {Number} y Y coordinate of the vertex normal.
 * May be null or omitted if "x" is an array.
 * @param {Number} z Z coordinate of the vertex normal.
 * May be null or omitted if "x" is an array.
 * @returns {H3DU.Mesh} This object.
 * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.setVertexNormal = function(index, x, y, z) {
  "use strict";
  if(index < 0)return this;

  if(typeof y === "undefined" && typeof z === "undefined") {
    y = x[1];
    z = x[2];
    x = x[0];
  }
  var c = this.vertexCount();
  if(index < c) {

    this._rebuildVertices(H3DU.Mesh.NORMALS_BIT);
    index *= this.getStride();
    index += H3DU.Mesh._normalOffset(this.attributeBits);
    this.vertices[index] = x;
    this.vertices[index + 1] = y;
    this.vertices[index + 2] = z;
  }
  return this;
};

/**
 * Gets the position of the vertex with the given
 * index in this mesh.
 * @param {Number} index Zero-based index of
 * the vertex to get.
 * The index ranges from 0 to less than
 * the number of vertices in the mesh, not the
 * number of vertex indices.
 * @returns {Array<Number>} A 3-element array giving
 * the X, Y, and Z coordinates, respectively, of the vertex
 * position, or null if the index is less than 0 or
 * equals the number of vertices in this mesh or greater.
 * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.getVertex = function(index) {
  "use strict";
  if(index < 0)return null;
  var c = this.vertexCount();
  if(index < c) {
    this._rebuildVertices(H3DU.Mesh.NORMALS_BIT);
    index *= this.getStride();
    return this.vertices.slice(index, index + 3);
  }
  return null;
};
/**
 * Gets the normal of the vertex with the given
 * index in this mesh.
 * @param {Number} index Zero-based index of
 * the vertex normal to get.
 * The index ranges from 0 to less than
 * the number of vertices in the mesh, not the
 * number of vertex indices.
 * @returns {Array<Number>} A 3-element array giving
 * the X, Y, and Z coordinates, respectively, of the vertex
 * normal, or null if the index is less than 0 or
 * equals the number of vertices in this mesh or greater.
 * Returns (0,0,0) if the given vertex exists but doesn't define
 * a normal.
 * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.getVertexNormal = function(index) {
  "use strict";
  var c = this.vertexCount();
  if(index < c) {
    this._rebuildVertices(H3DU.Mesh.NORMALS_BIT);
    index *= this.getStride();
    index += H3DU.Mesh._normalOffset(this.attributeBits);
    return this.vertices.slice(index, index + 3);
  }
  return null;
};

/** @private */
H3DU.Mesh.prototype._initialize = function(vertices, faces, format) {
  "use strict";
  this.vertices = vertices || [];
  this.indices = faces || [];
  this.startIndex = 0;
  var prim = format & H3DU.Mesh.PRIMITIVES_BITS;
  if(prim !== 0 && prim !== H3DU.Mesh.LINES_BIT && prim !== H3DU.Mesh.POINTS_BIT) {
    throw new Error("invalid format");
  }
  this.attributeBits = format === null || typeof format === "undefined" ? 0 : format;
 /**
 * Gets the number of vertices included in this mesh.
 * @returns {Number} Return value.
  * @alias vertexCount
  * @memberof! H3DU.Mesh#
 */
  this.vertexCount = function() {
    return this.vertices.length / this.getStride();
  };
/** @private */
  this.getStride = function() {
    return H3DU.Mesh._getStride(this.attributeBits);
  };
 /** @private */
  this.newPrimitive = function() {
    this.startIndex = this.vertices.length;
    return this;
  };
  this.primitiveType = function() {
    var primitive = H3DU.Mesh.TRIANGLES;
    if((this.attributeBits & H3DU.Mesh.LINES_BIT) !== 0)primitive = H3DU.Mesh.LINES;
    if((this.attributeBits & H3DU.Mesh.POINTS_BIT) !== 0)primitive = H3DU.Mesh.POINTS;
    return primitive;
  };
 /** @private */
  this._rebuildVertices = function(newAttributes) {
    var oldBits = this.attributeBits;
    var newBits = oldBits | newAttributes & H3DU.Mesh.ATTRIBUTES_BITS;
    if(newBits === oldBits)return;
    var currentStride = this.getStride();
    var x, y, z;
  // Rebuild the list of vertices if a new kind of
  // attribute is added to the mesh
    var newVertices = [];
    for(var i = 0;i < this.vertices.length;i += currentStride) {
      var vx = this.vertices[i];
      var vy = this.vertices[i + 1];
      var vz = this.vertices[i + 2];
      var s = i + 3;
      newVertices.push(vx, vy, vz);
      if((newBits & H3DU.Mesh.NORMALS_BIT) !== 0) {
        if((oldBits & H3DU.Mesh.NORMALS_BIT) !== 0) {
          x = this.vertices[s];
          y = this.vertices[s + 1];
          z = this.vertices[s + 2];
          s += 3;
          newVertices.push(x, y, z);
        } else {
          newVertices.push(0, 0, 0);
        }
      }
      if((newBits & H3DU.Mesh.COLORS_BIT) !== 0) {
        if((oldBits & H3DU.Mesh.COLORS_BIT) === 0) {
          newVertices.push(0, 0, 0);
        } else {
          var r = this.vertices[s];
          var g = this.vertices[s + 1];
          var b = this.vertices[s + 2];
          s += 3;
          newVertices.push(r, g, b);
        }
      }
      if((newBits & H3DU.Mesh.TEXCOORDS_BIT) !== 0) {
        if((oldBits & H3DU.Mesh.TEXCOORDS_BIT) === 0) {
          newVertices.push(0, 0);
        } else {
          var u = this.vertices[s];
          var v = this.vertices[s + 1];
          s += 2;
          newVertices.push(u, v);
        }
      }
      if((newBits & H3DU.Mesh.TANGENTS_BIT) !== 0) {
        if((oldBits & H3DU.Mesh.TANGENTS_BIT) === 0) {
          newVertices.push(0, 0, 0);
        } else {
          x = this.vertices[s];
          y = this.vertices[s + 1];
          z = this.vertices[s + 2];
          s += 3;
          newVertices.push(x, y, z);
        }
      }
      if((newBits & H3DU.Mesh.BITANGENTS_BIT) !== 0) {
        if((oldBits & H3DU.Mesh.BITANGENTS_BIT) === 0) {
          newVertices.push(0, 0, 0);
        } else {
          x = this.vertices[s];
          y = this.vertices[s + 1];
          z = this.vertices[s + 2];
          s += 3;
          newVertices.push(x, y, z);
        }
      }
    }
    this.vertices = newVertices;
    this.attributeBits = newBits;
  };
  this._setTriangle = function(vertexStartIndex, stride, i1, i2, i3) {
    var v1 = i1 * stride;
    var v2 = i2 * stride;
    var v3 = i3 * stride;
    var triCount = 0;
    var tribits = 0;
    var v = this.vertices;
    for(var i = vertexStartIndex - stride;
     i >= 0 && triCount < 16 && tribits !== 7;
     i -= stride, triCount++) {
      var found = 7;
      for(var j = 0;j < stride && found !== 0;j++) {
        if((found & 1) !== 0 && v[v1 + j] !== v[i + j]) {
          found &= ~1;
        }
        if((found & 2) !== 0 && v[v2 + j] !== v[i + j]) {
          found &= ~2;
        }
        if((found & 4) !== 0 && v[v3 + j] !== v[i + j]) {
          found &= ~4;
        }
      }
      if((found & 1) !== 0) {
        i1 = i / stride; v1 = i1 * stride; tribits |= 1; break;
      }
      if((found & 2) !== 0) {
        i2 = i / stride; v2 = i2 * stride; tribits |= 2; break;
      }
      if((found & 4) !== 0) {
        i3 = i / stride; v3 = i3 * stride; tribits |= 4; break;
      }
    }
    if(
    !(v[v1] === v[v2] && v[v1 + 1] === v[v2 + 1] && v[v1 + 2] === v[v2 + 2]) &&
    !(v[v1] === v[v3] && v[v1 + 1] === v[v3 + 1] && v[v1 + 2] === v[v3 + 2]) &&
    !(v[v2] === v[v3] && v[v2 + 1] === v[v3 + 1] && v[v2 + 2] === v[v3 + 2])) {
    // avoid identical vertex positions
      this.indices.push(i1, i2, i3);
    }
  };
  this._vertex3 = function(x, y, z) {
    var currentMode = this.currentMode;
    if(currentMode === -1)throw new Error("mode() not called");
    this._rebuildVertices(this._elementsDefined);
    var vertexStartIndex = this.vertices.length;
    this.vertices.push(x, y, z);
    if((this.attributeBits & H3DU.Mesh.NORMALS_BIT) !== 0) {
      this.vertices.push(this.normal[0], this.normal[1], this.normal[2]);
    }
    if((this.attributeBits & H3DU.Mesh.COLORS_BIT) !== 0) {
      this.vertices.push(this.color[0], this.color[1], this.color[2]);
    }
    if((this.attributeBits & H3DU.Mesh.TEXCOORDS_BIT) !== 0) {
      this.vertices.push(this.texCoord[0], this.texCoord[1]);
    }
    if((this.attributeBits & H3DU.Mesh.TANGENTS_BIT) !== 0) {
      this.vertices.push(this.tangent[0], this.tangent[1], this.tangent[2]);
    }
    if((this.attributeBits & H3DU.Mesh.BITANGENTS_BIT) !== 0) {
      this.vertices.push(this.bitangent[0], this.bitangent[1], this.bitangent[2]);
    }
    var stride = this.getStride();
    var index, firstIndex;
    if(currentMode === H3DU.Mesh.QUAD_STRIP &&
     this.vertices.length - this.startIndex >= stride * 4 &&
     (this.vertices.length - this.startIndex) % (stride * 2) === 0) {
      index = this.vertices.length / stride - 4;
      this._setTriangle(vertexStartIndex, stride, index, index + 1, index + 2);
      this._setTriangle(vertexStartIndex, stride, index + 2, index + 1, index + 3);
    } else if(currentMode === H3DU.Mesh.QUADS &&
     (this.vertices.length - this.startIndex) % (stride * 4) === 0) {
      index = this.vertices.length / stride - 4;
      this._setTriangle(vertexStartIndex, stride, index, index + 1, index + 2);
      this._setTriangle(vertexStartIndex, stride, index, index + 2, index + 3);
    } else if(currentMode === H3DU.Mesh.TRIANGLES &&
     (this.vertices.length - this.startIndex) % (stride * 3) === 0) {
      index = this.vertices.length / stride - 3;
      this._setTriangle(vertexStartIndex, stride, index, index + 1, index + 2);
    } else if(currentMode === H3DU.Mesh.LINES &&
     (this.vertices.length - this.startIndex) % (stride * 2) === 0) {
      index = this.vertices.length / stride - 2;
      this.indices.push(index, index + 1);
    } else if(currentMode === H3DU.Mesh.TRIANGLE_FAN &&
     this.vertices.length - this.startIndex >= stride * 3) {
      index = this.vertices.length / stride - 2;
      firstIndex = this.startIndex / stride;
      this._setTriangle(vertexStartIndex, stride, firstIndex, index, index + 1);
    } else if(currentMode === H3DU.Mesh.LINE_STRIP &&
     this.vertices.length - this.startIndex >= stride * 2) {
      index = this.vertices.length / stride - 2;
      this.indices.push(index, index + 1);
    } else if(currentMode === H3DU.Mesh.POINTS) {
      index = this.vertices.length / stride - 1;
      this.indices.push(index);
    } else if(currentMode === H3DU.Mesh.TRIANGLE_STRIP &&
     this.vertices.length - this.startIndex >= stride * 3) {
      index = this.vertices.length / stride - 3;
      firstIndex = this.startIndex / stride;
      if((index - firstIndex & 1) === 0) {
        this._setTriangle(vertexStartIndex, stride, index, index + 1, index + 2);
      } else {
        this._setTriangle(vertexStartIndex, stride, index + 1, index, index + 2);
      }
    }
    return this;
  };
};

/** @private */
H3DU.Mesh.prototype._makeRedundant = function() {
  "use strict";
  var existingIndices = [];
  var stride = this.getStride();
  var originalIndicesLength = this.indices.length;
  for(var i = 0;i < originalIndicesLength;i++) {
    var index = this.indices[i];
    if(existingIndices[index]) {
     // Index already exists, so duplicate
      var offset = index * stride;
      var newIndex = this.vertices.length / stride;
      for(var j = 0;j < stride;j++) {
        this.vertices.push(this.vertices[offset + j]);
      }
      this.indices[i] = newIndex;
    }
    existingIndices[index] = true;
  }
  return this;
};
/**
 * Gets the number of primitives (triangles, lines,
* or points) composed by all shapes in this mesh.
 * @returns {Number} Return value.
* @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.primitiveCount = function() {
  "use strict";
  if((this.attributeBits & H3DU.Mesh.LINES_BIT) !== 0)
    return Math.floor(this.indices.length / 2);
  if((this.attributeBits & H3DU.Mesh.POINTS_BIT) !== 0)
    return this.indices.length;
  return Math.floor(this.indices.length / 3);
};
  // Adds a line only if it doesn't exist
H3DU.Mesh._addLine = function(lineIndices, existingLines, f1, f2) {
  "use strict";
   // Ensure ordering of the indices

  if(f1 < f2) {
    var tmp = f1;f1 = f2;f2 = tmp;
  }
  var e = existingLines[f1];
  if(e) {
    if(e.indexOf(f2) < 0) {
      e.push(f2);
      lineIndices.push(f1, f2);
    }
  } else {
    existingLines[f1] = [f2];
    lineIndices.push(f1, f2);
  }
};
/**
 * Converts this mesh to a new mesh with triangles converted
 * to line segments.  The new mesh will reuse the vertices
 * contained in this one without copying the vertices.  If the mesh consists
 * of points or line segments, it will remain
 * unchanged.
 * @returns {H3DU.Mesh} A new mesh with triangles converted
 * to lines.
 * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.toWireFrame = function() {
  "use strict";
  if((this.attributeBits & H3DU.Mesh.PRIMITIVES_BITS) !== 0) {
   // Not a triangle mesh
    return this;
  }
  var lineIndices = [];
  var existingLines = {};
  for(var i = 0;i < this.indices.length;i += 3) {
    var f1 = this.indices[i];
    var f2 = this.indices[i + 1];
    var f3 = this.indices[i + 2];
    H3DU.Mesh._addLine(lineIndices, existingLines, f1, f2);
    H3DU.Mesh._addLine(lineIndices, existingLines, f2, f3);
    H3DU.Mesh._addLine(lineIndices, existingLines, f3, f1);
  }
  return new H3DU.Mesh(this.vertices, lineIndices,
    this.attributeBits | H3DU.Mesh.LINES_BIT);
};

/** @private */
H3DU.Mesh._isIdentityInUpperLeft = function(m) {
  "use strict";
  return m[0] === 1 && m[1] === 0 && m[2] === 0 &&
    m[4] === 0 && m[5] === 1 && m[6] === 0 &&
    m[8] === 0 && m[9] === 0 && m[10] === 1;
};
 /**
  * Transforms the positions and normals of all the vertices currently
  * in this mesh.  The matrix won't affect vertices added afterwards.
  * Also, resets the primitive
  * mode (see {@link H3DU.Mesh#mode}) so that future vertices given
  * will not build upon previous vertices. Future vertices should not be
  * added after calling this method without calling mode() first.
  * @param {Array<Number>} matrix A 4x4 matrix describing
  * the transformation.  The normals will be transformed using the
  * 3x3 inverse transpose of this matrix (see {@link H3DU.Math.mat4inverseTranspose3}).
  * @returns {H3DU.Mesh} This object.
  * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.transform = function(matrix) {
  "use strict";
  var stride = this.getStride();
  var v = this.vertices;
  var isNonTranslation = !H3DU.Mesh._isIdentityInUpperLeft(matrix);
  var normalOffset = H3DU.Mesh._normalOffset(this.attributeBits);
  var matrixForNormals = null;
  if(normalOffset >= 0 && isNonTranslation) {
    matrixForNormals = H3DU.Math.mat4inverseTranspose3(matrix);
  }
  for(var i = 0;i < v.length;i += stride) {
    var xform = H3DU.Math.mat4transform(matrix,
      v[i], v[i + 1], v[i + 2], 1.0);
    v[i] = xform[0];
    v[i + 1] = xform[1];
    v[i + 2] = xform[2];
    if(normalOffset >= 0 && isNonTranslation) {
     // Transform and normalize the normals
     // (using a modified matrix) to ensure
     // they point in the correct direction
      xform = H3DU.Math.mat3transform(matrixForNormals,
      v[i + normalOffset], v[i + normalOffset + 1], v[i + normalOffset + 2]);
      H3DU.Math.vec3normInPlace(xform);
      v[i + normalOffset] = xform[0];
      v[i + normalOffset + 1] = xform[1];
      v[i + normalOffset + 2] = xform[2];
    }
  }
  this.newPrimitive();
  return this;
};

/**
 * Enumerates the primitives (lines, triangles, and points) included
 * in this mesh.
 * @param {Function} func A function that will be called
 * for each primitive in the mesh.  The function takes a single
 * parameter, consisting of an array of one, two, or three vertex
 * objects.  A point will have one vertex, a line two vertices and
 * a triangle three.  Each vertex object may have these properties:<ul>
 * <li>"position": A 3-element array of the vertex's position.
 * Always present.
 * <li>"normal": A 3-element array of the vertex's normal.
 * May be absent.
 * <li>"color": An at least 3-element array of the vertex's color.
 * Each component generally ranges from 0 to 1. May be absent.
 * <li>"uv": A 2-element array of the vertex's texture coordinates
 * (the first element is U, the second is V).
 * Each component generally ranges from 0 to 1. May be absent.
 * </ul>
 * @returns {H3DU.Mesh} This object.
 * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.enumPrimitives = function(func) {
  "use strict";
  var prim = this.primitiveType();
  var normals = H3DU.Mesh._normalOffset(this.attributeBits);
  var colors = H3DU.Mesh._colorOffset(this.attributeBits);
  var texcoords = H3DU.Mesh._texCoordOffset(this.attributeBits);
  var stride = this.getStride();
  var v = this.vertices;
  var primSize = 3;
  if(prim === H3DU.Mesh.LINES)primSize = 2;
  if(prim === H3DU.Mesh.POINTS)primSize = 1;
  for(var j = 0;j < this.indices.length;j += primSize) {
    var p = [];
    for(var k = 0;k < primSize;k++) {
      var vi = this.indices[j + k] * stride;
      var info = {};
      info.position = [v[vi], v[vi + 1], v[vi + 2]];
      if(normals >= 0)
        info.normal = [v[vi + normals], v[vi + normals + 1], v[vi + normals + 2]];
      if(colors >= 0)
        info.color = [v[vi + colors], v[vi + colors + 1], v[vi + colors + 2]];
      if(texcoords >= 0)
        info.uv = [v[vi + texcoords], v[vi + texcoords + 1]];
      p.push(info);
    }
    func(p);
  }
  return this;
};

/**
* Finds the tightest axis-aligned
* bounding box that holds all vertices in the mesh.
* @returns {Array<Number>} An array of six numbers describing the tightest
* axis-aligned bounding box
* that fits all vertices in the mesh. The first three numbers
* are the smallest-valued X, Y, and Z coordinates, and the
* last three are the largest-valued X, Y, and Z coordinates.
* If the mesh is empty, returns the array [Inf, Inf, Inf, -Inf,
* -Inf, -Inf].
* @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.getBoundingBox = function() {
  "use strict";
  var empty = true;
  var inf = Number.POSITIVE_INFINITY;
  var ret = [inf, inf, inf, -inf, -inf, -inf];
  var stride = this.getStride();
  var v = this.vertices;
  for(var j = 0;j < this.indices.length;j++) {
    var vi = this.indices[j] * stride;
    if(empty) {
      empty = false;
      ret[0] = ret[3] = v[vi];
      ret[1] = ret[4] = v[vi + 1];
      ret[2] = ret[5] = v[vi + 2];
    } else {
      ret[0] = Math.min(ret[0], v[vi]);
      ret[3] = Math.max(ret[3], v[vi]);
      ret[1] = Math.min(ret[1], v[vi + 1]);
      ret[4] = Math.max(ret[4], v[vi + 1]);
      ret[2] = Math.min(ret[2], v[vi + 2]);
      ret[5] = Math.max(ret[5], v[vi + 2]);
    }
  }
  return ret;
};
/** @private */
H3DU.Mesh._findTangentAndBitangent = function(vertices, v1, v2, v3, uvOffset) {
  "use strict";
  var t1 = vertices[v2] - vertices[v1];
  var t2 = vertices[v2 + 1] - vertices[v1 + 1];
  var t3 = vertices[v2 + 2] - vertices[v1 + 2];
  var t4 = vertices[v3] - vertices[v1];
  var t5 = vertices[v3 + 1] - vertices[v1 + 1];
  var t6 = vertices[v3 + 2] - vertices[v1 + 2];
  var t7 = vertices[v2 + uvOffset] - vertices[v1 + uvOffset];
  var t8 = vertices[v2 + uvOffset + 1] - vertices[v1 + uvOffset + 1];
  var t9 = vertices[v3 + uvOffset] - vertices[v1 + uvOffset];
  var t10 = vertices[v3 + uvOffset + 1] - vertices[v1 + uvOffset + 1];
  var t11 = t7 * t10 - t8 * t9;
  if(t11 === 0) {
    return [0, 0, 0, 0, 0, 0];
  }
  t11 = 1.0 / t11;
  var t12 = -t8;
  var t13 = -t9;
  var t14 = ((t10 * t1 + t12 * t4)) * t11;
  var t15 = ((t10 * t2 + t12 * t5)) * t11;
  var t16 = ((t10 * t3 + t12 * t6)) * t11;
  var t17 = ((t13 * t1 + t7 * t4)) * t11;
  var t18 = ((t13 * t2 + t7 * t5)) * t11;
  var t19 = ((t13 * t3 + t7 * t6)) * t11;
  return [t14, t15, t16, t17, t18, t19];
};
/** @private */
H3DU.Mesh._recalcTangentsInternal = function(vertices, indices, stride, uvOffset, normalOffset, tangentOffset) {
  "use strict";
 // NOTE: no need to specify bitangent offset, since tangent
 // and bitangent will always be contiguous (this method will
 // always be called after the recalcTangents method ensures
 // that both fields are present)

  var vi = [0, 0, 0];
  for(var i = 0;i < indices.length;i += 3) {
    vi[0] = indices[i] * stride;
    vi[1] = indices[i + 1] * stride;
    vi[2] = indices[i + 2] * stride;
    var ret = H3DU.Mesh._findTangentAndBitangent(vertices, vi[0], vi[1], vi[2], uvOffset);
  // NOTE: It would be more mathematically correct to use the inverse
  // of the matrix
  //     [ Ax Bx Nx ]
  //     [ Ay By Ny ]
  //     [ Az Bz Nz ]
  // (where A and B are the tangent and bitangent and returned
  // in _findTangentAndBitangent) as the tangent space
  // transformation, that is, include three
  // different vectors (tangent, bitangent, and modified normal).
  // Instead we use the matrix
  //    [ AAx AAy AAz ]
  //    [ BBx BBy BBz ]
  //    [ Nx  Ny  Nz ]
  // (where AA and BB are the orthonormalized versions of the tangent
  // and bitangent) as the tangent space transform, in order to avoid
  // the need to also specify a transformed normal due to matrix inversion.
    for(var j = 0;j < 3;j++) {
      var m = ret;
      var vicur = vi[j];
      var norm0 = vertices[vicur + normalOffset];
      var norm1 = vertices[vicur + normalOffset + 1];
      var norm2 = vertices[vicur + normalOffset + 2];
      var t20 = m[0] * norm0 + m[1] * norm1 + m[2] * norm2;
      var tangent = H3DU.Math.vec3normInPlace([
        m[0] - t20 * norm0,
        m[1] - t20 * norm1,
        m[2] - t20 * norm2]);
      var t22 = m[3] * norm0 + m[4] * norm1 + m[5] * norm2;
      var t23 = m[3] * tangent[0] + m[4] * tangent[1] + m[5] * tangent[2];
      var bitangent = H3DU.Math.vec3normInPlace([
        m[3] - t22 * norm0 - t23 * tangent[0],
        m[4] - t22 * norm1 - t23 * tangent[1],
        m[5] - t22 * norm2 - t23 * tangent[2]]);
      vertices[vicur + tangentOffset] = tangent[0];
      vertices[vicur + tangentOffset + 1] = tangent[1];
      vertices[vicur + tangentOffset + 2] = tangent[2];
      vertices[vicur + tangentOffset + 3] = bitangent[0];
      vertices[vicur + tangentOffset + 4] = bitangent[1];
      vertices[vicur + tangentOffset + 5] = bitangent[2];
    }
  }
};
 /**
  * Recalculates the tangent vectors for triangles
  * in this mesh.  Tangent vectors are required for
  * normal mapping (bump mapping) to work.
  * This method only affects those parts of the mesh
  * that define normals and texture coordinates.
  * @returns {H3DU.Mesh} This object.
  * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.recalcTangents = function() {
  "use strict";
  if(this.primitiveType() !== H3DU.Mesh.TRIANGLES) {
    return this;
  }
  var tangentBits = H3DU.Mesh.TANGENTS_BIT | H3DU.Mesh.BITANGENTS_BIT;
  var haveOtherAttributes = (this.attributeBits & (H3DU.Mesh.ATTRIBUTES_BITS & ~tangentBits)) !== 0;
  var uvOffset = H3DU.Mesh._texCoordOffset(this.attributeBits);
  var normalOffset = H3DU.Mesh._normalOffset(this.attributeBits);
  if(uvOffset < 0 || normalOffset < 0) {
   // can't generate tangents and bitangents
   // without normals or texture coordinates.
    return this;
  }
  this._rebuildVertices(tangentBits);
  if(haveOtherAttributes) {
    this._makeRedundant();
  }
  if(this.primitiveType() === H3DU.Mesh.TRIANGLES) {
    var tangentOffset = H3DU.Mesh._tangentOffset(this.attributeBits);
    H3DU.Mesh._recalcTangentsInternal(this.vertices, this.indices,
     this.getStride(), uvOffset, normalOffset, tangentOffset);
  }
  return this;
};
/**
* Modifies this mesh by reversing the sign of normals it defines.
* @returns {H3DU.Mesh} This object.
* @example <caption>
* The following code generates a two-sided mesh, where
* the normals on each side face in the opposite direction.
* This is only useful when drawing open geometric shapes such as
* those generated by H3DU.Meshes.createCylinder or H3DU.Meshes.createDisk.
* Due to the z-fighting effect, drawing a two-sided mesh is
* recommended only if face culling is enabled.</caption>
* var twoSidedMesh = originalMesh.merge(
*  new H3DU.Mesh().merge(originalMesh).reverseWinding().reverseNormals()
* );
* @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.reverseNormals = function() {
  "use strict";
  var i;
  var stride = this.getStride();
  var vertices = this.vertices;
  var normalOffset = H3DU.Mesh._normalOffset(
     this.attributeBits);
  if(normalOffset < 0)  return this;
  for(i = 0;i < vertices.length;i += stride) {
    var x = vertices[i + normalOffset];
    var y = vertices[i + normalOffset + 1];
    var z = vertices[i + normalOffset + 2];
    vertices[i + normalOffset] = -x;
    vertices[i + normalOffset + 1] = -y;
    vertices[i + normalOffset + 2] = -z;
  }
  return this;
};

/**
* Reverses the winding order of the triangles in this mesh
* by swapping the second and third vertex indices of each one.
* @returns {H3DU.Mesh} This object.
* @example <caption>
* The following code generates a mesh that survives face culling,
* since the same triangles occur on each side of the mesh, but
* with different winding orders.  This is useful when enabling
* back-face culling and drawing open geometric shapes such as
* those generated by H3DU.Meshes.createCylinder or H3DU.Meshes.createDisk.
* Due to the z-fighting effect, drawing this kind of mesh is
* recommended only if face culling is enabled.</caption>
* var frontBackMesh = originalMesh.merge(
*  new H3DU.Mesh().merge(originalMesh).reverseWinding()
* );
* @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.reverseWinding = function() {
  "use strict";
  if((this.attributeBits & H3DU.Mesh.PRIMITIVES_BITS) !== 0) {
   // Not a triangle mesh
    return this;
  }
  for(var i = 0;i < this.indices.length;i += 3) {
    var f2 = this.indices[i + 1];
    var f3 = this.indices[i + 2];
    this.indices[i + 2] = f2;
    this.indices[i + 1] = f3;
  }
  return this;
};

/**
  * Recalculates the normal vectors for triangles
  * in this mesh.  For this to properly affect shading, each triangle in
  * the mesh must have its vertices defined in
  * counterclockwise order.  Each normal calculated will
  * be normalized to have a length of 1 (unless the normal is (0,0,0)).
  * @param {Boolean} flat If true, each triangle in the mesh
  * will have the same normal, which usually leads to a flat
  * appearance.  If false, each unique vertex in the mesh
  * will have its own normal, which usually leads to a smooth
  * appearance.
  * @param {Boolean} inward If true, the generated normals
  * will point inward; otherwise, outward.
  * @returns {H3DU.Mesh} This object.
  * @memberof! H3DU.Mesh#
*/
H3DU.Mesh.prototype.recalcNormals = function(flat, inward) {
  "use strict";
  var primtype = this.primitiveType();
  if(primtype !== H3DU.Mesh.LINES && primtype !== H3DU.Mesh.POINTS) {
    var haveOtherAttributes = (this.attributeBits & (H3DU.Mesh.ATTRIBUTES_BITS & ~H3DU.Mesh.NORMALS_BIT)) !== 0;
    this._rebuildVertices(H3DU.Mesh.NORMALS_BIT);
  // No need to duplicate vertices if there are no other attributes
  // besides normals and non-flat shading is requested; the
  // recalculation will reinitialize normals to 0 and
  // add the calculated normals to vertices as they are implicated
    if(haveOtherAttributes || flat) {
      this._makeRedundant();
    }
    H3DU.Mesh._recalcNormals(this.vertices, this.indices,
     this.getStride(), 3, flat, inward);
  }
  return this;
};
/** @private */
H3DU.Mesh._getStride = function(format) {
  "use strict";
  var s = [3, 6, 6, 9, 5, 8, 8, 11][format & (H3DU.Mesh.NORMALS_BIT | H3DU.Mesh.COLORS_BIT | H3DU.Mesh.TEXCOORDS_BIT)];
  if((format & H3DU.Mesh.TANGENTS_BIT) !== 0)s += 3;
  if((format & H3DU.Mesh.BITANGENTS_BIT) !== 0)s += 3;
  return s;
};
/** @private */
H3DU.Mesh._normalOffset = function(format) {
  "use strict";
  return [-1, 3, -1, 3, -1, 3, -1, 3][format & (H3DU.Mesh.NORMALS_BIT | H3DU.Mesh.COLORS_BIT | H3DU.Mesh.TEXCOORDS_BIT)];
};
/** @private */
H3DU.Mesh._tangentOffset = function(format) {
  "use strict";
  var x = 3;
  if((format & H3DU.Mesh.TANGENTS_BIT) === 0)return -1;
  if((format & H3DU.Mesh.NORMALS_BIT) !== 0)x += 3;
  if((format & H3DU.Mesh.COLORS_BIT) !== 0)x += 3;
  if((format & H3DU.Mesh.TEXCOORDS_BIT) !== 0)x += 2;
  return x;
};
/** @private */
H3DU.Mesh._bitangentOffset = function(format) {
  "use strict";
  var x = 3;
  if((format & H3DU.Mesh.BITANGENTS_BIT) === 0)return -1;
  if((format & H3DU.Mesh.NORMALS_BIT) !== 0)x += 3;
  if((format & H3DU.Mesh.COLORS_BIT) !== 0)x += 3;
  if((format & H3DU.Mesh.TEXCOORDS_BIT) !== 0)x += 2;
  if((format & H3DU.Mesh.TANGENTS_BIT) !== 0)x += 3;
  return x;
};
/** @private */
H3DU.Mesh._colorOffset = function(format) {
  "use strict";
  return [-1, -1, 3, 6, -1, -1, 3, 6][format & (H3DU.Mesh.NORMALS_BIT | H3DU.Mesh.COLORS_BIT | H3DU.Mesh.TEXCOORDS_BIT)];
};
/** @private */
H3DU.Mesh._texCoordOffset = function(format) {
  "use strict";
  return [-1, -1, -1, -1, 3, 6, 6, 9][format & (H3DU.Mesh.NORMALS_BIT | H3DU.Mesh.COLORS_BIT | H3DU.Mesh.TEXCOORDS_BIT)];
};
/** @private */
H3DU.Mesh.ATTRIBUTES_BITS = 255;
/** @private */
H3DU.Mesh.PRIMITIVES_BITS = 768;
/** The mesh contains normals for each vertex.
 @const
 @default
* @memberof! H3DU.Mesh
*/
H3DU.Mesh.NORMALS_BIT = 1;
/** The mesh contains colors for each vertex.
 @const
 @default
* @memberof! H3DU.Mesh
*/
H3DU.Mesh.COLORS_BIT = 2;
/** The mesh contains texture coordinates for each vertex.
 @const
 @default
* @memberof! H3DU.Mesh
*/
H3DU.Mesh.TEXCOORDS_BIT = 4;
/**
 The mesh contains tangent vectors for each vertex.
 @const
 @default
* @memberof! H3DU.Mesh
*/
H3DU.Mesh.TANGENTS_BIT = 8;
/**
 The mesh contains bitangent vectors for each vertex.
 @const
 @default
* @memberof! H3DU.Mesh
*/
H3DU.Mesh.BITANGENTS_BIT = 16;
/** The mesh consists of lines (2 vertices per line) instead
of triangles (3 vertices per line).
 @const
 @default
* @memberof! H3DU.Mesh
*/
H3DU.Mesh.LINES_BIT = 256;
/** The mesh consists of points (1 vertex per line).
 @const
 @default
* @memberof! H3DU.Mesh
*/
H3DU.Mesh.POINTS_BIT = 512;
/**
Primitive mode for rendering triangles, made up
of 3 vertices each.
 @const
 @default
* @memberof! H3DU.Mesh
*/
H3DU.Mesh.TRIANGLES = 4;
/**
Primitive mode for rendering a strip of quadrilaterals (quads).
The first 4 vertices make up the first quad, and each additional
quad is made up of the last 2 vertices of the previous quad and
2 new vertices. Each quad is broken into two triangles: the first
triangle consists of the first, second, and third vertices, in that order,
and the second triangle consists of the third, second, and fourth
vertices, in that order.
 @const
 @default
* @memberof! H3DU.Mesh
*/
H3DU.Mesh.QUAD_STRIP = 8;
/**
Primitive mode for rendering quadrilaterals, made up
of 4 vertices each.  Each quadrilateral is broken into two triangles: the first
triangle consists of the first, second, and third vertices, in that order,
and the second triangle consists of the first, third, and fourth
vertices, in that order.
 @const
 @default
* @memberof! H3DU.Mesh
 */
H3DU.Mesh.QUADS = 7;
/**
Primitive mode for rendering line segments, made up
of 2 vertices each.
 @const
* @memberof! H3DU.Mesh
*/
H3DU.Mesh.LINES = 1;
/**
Primitive mode for rendering a triangle fan.  The first 3
vertices make up the first triangle, and each additional
triangle is made up of the first vertex of the first triangle,
the previous vertex, and 1 new vertex.
 @const
 @default
* @memberof! H3DU.Mesh
*/
H3DU.Mesh.TRIANGLE_FAN = 6;
/**
Primitive mode for rendering a triangle strip.  The first 3
vertices make up the first triangle, and each additional
triangle is made up of the last 2 vertices and 1
new vertex.  For the second triangle in the strip, and
every other triangle after that, the first and second
vertices are swapped when generating that triangle.
 @const
 @default
* @memberof! H3DU.Mesh
*/
H3DU.Mesh.TRIANGLE_STRIP = 5;
/**
Primitive mode for rendering connected line segments.
The first 2 vertices make up the first line, and each additional
line is made up of the last vertex and 1 new vertex.
 @const
 @default
* @memberof! H3DU.Mesh
*/
H3DU.Mesh.LINE_STRIP = 3;
/**
Primitive mode for rendering points, made up
of 1 vertex each.
 @const
 @default
* @memberof! H3DU.Mesh
*/
H3DU.Mesh.POINTS = 0;

this.H3DU.Mesh = H3DU.Mesh;
