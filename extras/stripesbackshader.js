/** The <code>extras/stripesbackshader.js</code> module.
 * To import all symbols in this module, either of the following can be used:
 * <pre>
 * import * from "extras/stripesbackshader.js";
 * // -- or --
 * import * as CustomModuleName from "extras/stripesbackshader.js";</pre>
 * @module extras/stripesbackshader */

/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/

/**
 * GLSL shader code for TODO: Not documented yet.
 * The shader program takes the following uniforms:<ul>
 * <li>"blackColor" - TODO: Not documented yet.
 * <li>"whiteColor" - TODO: Not documented yet.
 * <li>"time" - TODO: Not documented yet.</ul>
 */
export const stripesBackShader = {
  "uniform":{
    "blackColor":[0, 0, 0],
    "whiteColor":[1, 1, 1],
    "time":0
  },
  "vertexShader":[
    "varying vec2 posVar;",
    "void main() {",
    " posVar=position.xy;",
    " gl_Position=vec4(position,1.0);",
    "}"].join("\n"),
  "fragmentShader":[
    "uniform vec3 blackColor;",
    "uniform vec3 whiteColor;",
    "varying vec2 posVar;",
    "uniform float time;",
    "void main() {",
    " float s;",
    " s=mod((posVar.x+posVar.y+(time*0.001))*5.0,2.0);",
    " s=(s>=1.0) ? 0.0 : 1.0;",
    " vec3 color=mix(blackColor,whiteColor,s);",
    " gl_FragColor=vec4(color,1.0);",
    "}"].join("\n")
};
