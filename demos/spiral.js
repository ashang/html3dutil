/* global H3DU */
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
function spiralCurve(radius, phase) {
  "use strict";
  return new H3DU.Curve({
/** @ignore */
    "evaluate":function(u) {
      var uphase = u + phase;
      var cosu = Math.cos(uphase);
      var sinu = uphase >= 0 && uphase < 6.283185307179586 ? uphase <= 3.141592653589793 ? Math.sqrt(1.0 - cosu * cosu) : -Math.sqrt(1.0 - cosu * cosu) : Math.sin(uphase);
      var r = radius + u;
      return [cosu * r, sinu * r];
    },
/** @ignore */
    "endPoints":function() {
      return [0, 6 * Math.PI];
    }
  });
}

function spiralBackgroundShape(color) {
  "use strict";
  var ce = new H3DU.CurveBuilder();
  for(var i = 0; i < 360; i += 10) {
    var curve = spiralCurve(0.1, i * Math.PI * 2 / 360);
    var length = curve.getLength();
    var lines = Math.max(Math.ceil(length / 0.2), 60);
    ce.position(curve).evalCurve(H3DU.Mesh.LINES, lines);
  }
  return new H3DU.Shape(ce.toMeshBuffer()).setMaterial(H3DU.Material.fromBasic(color));
}

/* exported spiralBatch */
function spiralBatch() {
  "use strict";
  var batch = new H3DU.Batch3D();
  batch.orthoAspect(-3, 3, -3, 3, -5, 5);
  batch.addShape(spiralBackgroundShape("blue"));
  return batch;
}
