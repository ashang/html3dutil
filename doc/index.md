# Documentation Index

* <a href="Camera.md">Camera</a>
* <a href="CurveTube.md">CurveTube</a>
* <a href="Epitrochoid.md">Epitrochoid</a>
* <a href="FrameCounter.md">FrameCounter</a>
* <a href="FrameCounterDiv.md">FrameCounterDiv</a>
* <a href="GraphicsPath.md">GraphicsPath</a>
* <a href="H3DU.md">H3DU</a>
* <a href="H3DU_BSplineCurve.md">H3DU.BSplineCurve</a>
* <a href="H3DU_BSplineSurface.md">H3DU.BSplineSurface</a>
* <a href="H3DU_Batch3D.md">H3DU.Batch3D</a>
* <a href="H3DU_BezierCurve.md">H3DU.BezierCurve</a>
* <a href="H3DU_BezierSurface.md">H3DU.BezierSurface</a>
* <a href="H3DU_BufferedMesh.md">H3DU.BufferedMesh</a>
* <a href="H3DU_CurveEval.md">H3DU.CurveEval</a>
* <a href="H3DU_FrameBuffer.md">H3DU.FrameBuffer</a>
* <a href="H3DU_FrameBufferInfo.md">H3DU.FrameBufferInfo</a>
* <a href="H3DU_LightSource.md">H3DU.LightSource</a>
* <a href="H3DU_Lights.md">H3DU.Lights</a>
* <a href="H3DU_Material.md">H3DU.Material</a>
* <a href="H3DU_Math.md">H3DU.Math</a>
* <a href="H3DU_MatrixStack.md">H3DU.MatrixStack</a>
* <a href="H3DU_Mesh.md">H3DU.Mesh</a>
* <a href="H3DU_MeshBuffer.md">H3DU.MeshBuffer</a>
* <a href="H3DU_Meshes.md">H3DU.Meshes</a>
* <a href="H3DU_RenderPass3D.md">H3DU.RenderPass3D</a>
* <a href="H3DU_Scene3D.md">H3DU.Scene3D</a>
* <a href="H3DU_ShaderInfo.md">H3DU.ShaderInfo</a>
* <a href="H3DU_ShaderProgram.md">H3DU.ShaderProgram</a>
* <a href="H3DU_Shape.md">H3DU.Shape</a>
* <a href="H3DU_ShapeGroup.md">H3DU.ShapeGroup</a>
* <a href="H3DU_SurfaceEval.md">H3DU.SurfaceEval</a>
* <a href="H3DU_TextFont.md">H3DU.TextFont</a>
* <a href="H3DU_Texture.md">H3DU.Texture</a>
* <a href="H3DU_TextureAtlas.md">H3DU.TextureAtlas</a>
* <a href="H3DU_TextureLoader.md">H3DU.TextureLoader</a>
* <a href="H3DU_Transform.md">H3DU.Transform</a>
* <a href="Hypotrochoid.md">Hypotrochoid</a>
* <a href="InputTracker.md">InputTracker</a>
* <a href="MeshJSON.md">MeshJSON</a>
* <a href="ObjData.md">ObjData</a>
* <a href="PrimitiveCounter.md">PrimitiveCounter</a>
* <a href="Promise.md">Promise</a>
* <a href="SurfaceOfRevolution.md">SurfaceOfRevolution</a>
* <a href="Trochoid.md">Trochoid</a>

## Tutorials

* <a href="tutorial-camera.md">The "Camera" and the Projection and View Transforms</a>
* <a href="tutorial-colors.md">Color Strings</a>
* <a href="tutorial-filters.md">Graphics Filters</a>
* <a href="tutorial-glmath.md">H3DU's Math Functions</a>
* <a href="tutorial-history.md">Older Version History</a>
* <a href="tutorial-matrixdetails.md">Matrix Details</a>
* <a href="tutorial-meshexamples.md">Examples of Creating Meshes on the Fly</a>
* <a href="tutorial-overview.md">Library Overview</a>
* <a href="tutorial-paths.md">2-Dimensional Graphics Paths</a>
* <a href="tutorial-shapes.md">Creating Shapes</a>
* <a href="tutorial-surfaces.md">Parametric Curves and Parametric Surfaces</a>
* <a href="tutorial-textures.md">Texture Examples</a>

## Read Me

<h1>HTML 3D Utility Library</h1><p><strong>Download source code: <a href="https://github.com/peteroupc/html3dutil/archive/master.zip">ZIP file</a></strong></p>
<p>If you like this software, consider donating to me at this link: <a href="http://peteroupc.github.io/">http://peteroupc.github.io/</a></p>
<hr>
<p>A public domain JavaScript library for easing the development of HTML 3D applications.</p>
<ul>
<li>Source code is available in the <a href="https://github.com/peteroupc/html3dutil">project page</a>.</li>
<li>API documentation is found at: <a href="https://peteroupc.github.io/html3dutil">https://peteroupc.github.io/html3dutil</a>
or <a href="https://github.com/peteroupc/html3dutil/blob/master/doc/index.md">https://github.com/peteroupc/html3dutil/blob/master/doc/index.md</a>.</li>
</ul>
<p>The file &quot;h3du_min.js&quot; is a minified single-file version of the library.  Include it in your HTML
as follows:</p>
<pre class="prettyprint source lang-html"><code>  &lt;script type=&quot;text/javascript&quot; src=&quot;h3du_min.js&quot;>&lt;/script></code></pre><h2>Overview</h2><p>For detailed instructions on using this library and a summary of the library's features, visit:</p>
<p><a href="https://peteroupc.github.io/html3dutil/tutorial-overview.html">https://peteroupc.github.io/html3dutil/tutorial-overview.html</a></p>
<h2>Demos</h2><h3>Simple Demos</h3><ul>
<li><a href="https://peteroupc.github.io/html3dutil/demos/simple.html">demos/simple.html</a> - A simple demo using this library.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/triangle.html">demos/triangle.html</a> - Demonstrates drawing a triangle.</li>
</ul>
<h3>Materials</h3><ul>
<li><a href="https://peteroupc.github.io/html3dutil/demos/selfpulse.html">demos/selfpulse.html</a> - Demonstrates
a rotating, pulsating box.</li>
</ul>
<h3>Shapes and meshes</h3><ul>
<li><a href="https://peteroupc.github.io/html3dutil/demos/compositeMesh.html">demos/compositeMesh.html</a> - Demonstrates
combining multiple meshes into one.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/shapes.html">demos/shapes.html</a> - Demonstrates
the built-in shapes.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/newshapes.html">demos/newshapes.html</a> - Fancier
demo of some of the built-in shapes.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/builtinshapes.html">demos/builtinshapes.html</a> - Interactive demo of
the built-in shapes.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/platonic.html">demos/platonic.html</a> - A demo featuring the five
platonic solids.  Demonstrates how vertex and index arrays are built up to create geometric meshes.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/clock.html">demos/clock.html</a> - A demo
featuring a wall clock.</li>
</ul>
<h3>Paths</h3><ul>
<li><a href="https://peteroupc.github.io/html3dutil/demos/marchingdots.html">demos/marchingdots.html</a> - Demo
of a series of dots following a path like marching ants. Shows some of the functionality of graphics paths.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/polyclip.html">demos/polyclip.html</a> -
Similar to &quot;marchingdots.html&quot;, but now uses the union of two circles as a path to demonstrate polygon
clipping.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/pathtube.html">demos/pathtube.html</a> - Demo
of a tube formed by a path curve.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/pathshapes.html">demos/pathshapes.html</a> - Demo
of 3D and 2D shapes generated by a 2D path.</li>
</ul>
<h3>Curves and Surfaces</h3><ul>
<li><a href="https://peteroupc.github.io/html3dutil/demos/surfaces.html">demos/surfaces.html</a> - Demonstrates
using evaluators to generate parametric surfaces.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/curves.html">demos/curves.html</a> - Demonstrates
using evaluators to generate parametric curves.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/surfacesexpr.html">demos/surfacesexpr.html</a> - Demonstrates
parametric surfaces, with a custom formula editor.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/curvesexpr.html">demos/curvesexpr.html</a> - Demonstrates
parametric curves, with a custom formula editor.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/implicit.html">demos/implicit.html</a> - Demonstrates
implicit surfaces.</li>
</ul>
<h3>Textures</h3><ul>
<li><a href="https://peteroupc.github.io/html3dutil/demos/textured.html">demos/textured.html</a> - Demonstrates loading textures
and applying them to 3D shapes.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/specular.html">demos/specular.html</a> - Demonstrates using
textures as specular reflection maps.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/gradient.html">demos/gradient.html</a> - Demonstrates generating a custom
texture -- a linear gradient from one color to another.</li>
</ul>
<h3>Shaders</h3><ul>
<li><a href="https://peteroupc.github.io/html3dutil/demos/squares.html">demos/squares.html</a> - Demonstrates shader-based filters.</li>
</ul>
<h3>Particle Systems</h3><ul>
<li><a href="https://peteroupc.github.io/html3dutil/demos/tris.html">demos/tris.html</a> - Demonstrates a particle system.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/fallingballs.html">demos/fallingballs.html</a> - Demonstrates falling balls
of different sizes.</li>
</ul>
<h3>Loading 3D Models</h3><ul>
<li><a href="https://peteroupc.github.io/html3dutil/demos/obj.html">demos/obj.html</a> - An object file loader.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/stl.html">demos/stl.html</a> - Demonstrates loading 3D models.</li>
</ul>
<h3>Text</h3><ul>
<li><a href="https://peteroupc.github.io/html3dutil/demos/textwith3d.html">demos/textwith3D.html</a> - Demonstrates loading bitmap fonts and displaying text with them. Demonstrates showing bitmap font text on top of a 3D animation.</li>
</ul>
<h3>Miscellaneous</h3><ul>
<li><a href="https://peteroupc.github.io/html3dutil/demos/background.html">demos/background.html</a> - A demo
featuring a background with continuously drawn 3D shapes.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/animation.html">demos/animation.html</a> - A demo
illustrating a simple animation of 3D shapes.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/starfield.html">demos/starfield.html</a> - Demo of a star field.</li>
<li><a href="https://peteroupc.github.io/html3dutil/demos/perspective.html">demos/perspective.html</a> - Demonstrates a perspective projection.</li>
</ul>
<h2>Other Sites</h2><ul>
<li>CodePlex: <a href="https://html3dutil.codeplex.com/">https://html3dutil.codeplex.com/</a></li>
<li>Code Project: <a href="http://www.codeproject.com/Tips/896839/Public-Domain-HTML-ThreeD-Library">http://www.codeproject.com/Tips/896839/Public-Domain-HTML-ThreeD-Library</a></li>
<li>SourceForge: <a href="https://sourceforge.net/p/html3dutil">https://sourceforge.net/p/html3dutil</a></li>
</ul>
<h2>Examples</h2><pre class="prettyprint source lang-javascript"><code>  // Create the 3D scene; find the HTML canvas and pass it
  // to Scene3D.
  var scene=new H3DU.Scene3D(document.getElementById(&quot;canvas&quot;));
  var sub=new H3DU.Batch3D()
   // Set the perspective view.  Camera has a 45-degree field of view
   // and will see objects from 0.1 to 100 units away.
   .perspectiveAspect(45,0.1,100)
   // Move the camera back 40 units.
   .setLookAt([0,0,40]);
  sub.getLights().setDefaults();
  // Create a box mesh 10 units in size
  var mesh=H3DU.Meshes.createBox(10,20,20);
  // Create a shape based on the mesh and give it a red color
  var shape=new H3DU.Shape(mesh).setColor(&quot;red&quot;);
  // Add the shape to the scene
  sub.addShape(shape);
  // Create a timer
  var timer={};
  // Set up the render loop
  H3DU.renderLoop(function(time){
   // Update the shape's rotation
   var q=H3DU.Math.quatFromTaitBryan(
     360*H3DU.getTimePosition(timer,time,6000),
     360*H3DU.getTimePosition(timer,time,12000),
     0
   );
   shape.setQuaternion(q);
   // Render the scene
   scene.render(sub);
  });</code></pre><h2>History</h2><p>Version 1.5.1:</p>
<ul>
<li>Fixed bug in normal calculation</li>
<li>Make certain changes to the demos to ensure compatibility with the
next major version</li>
<li>Fix curve returned by GraphicsPath#getCurves() so that closed paths
remain smooth at their endpoints when a curve tube is generated from
them</li>
</ul>
<p>Version 1.5:</p>
<ul>
<li>Add support for specular maps and normal maps, including
in the JSON mesh format and MTL material format.</li>
<li>To support normal maps, extra methods for bitangents and
tangents were added to the Mesh class.</li>
<li>Added six new demos and modified several others</li>
<li>Support 24-bit color versions of TGA files</li>
<li>Scene3D now does frustum culling of its shapes</li>
<li>Fixed vertex normal calculation in the recalcNormals()
method of the Mesh class.</li>
<li>Allow two-element arrays to be passed to the Mesh class's
texCoord3() method.</li>
<li>Add getBoundingBox method to the Mesh class.</li>
<li>Add the setVisible method to the Shape and ShapeGroup
classes.</li>
<li>Allow reading OBJ files with negative reference numbers</li>
<li>Add path.js (2D graphics paths) to extras</li>
<li>Added an &quot;axis&quot; parameter to the SurfaceOfRevolution
constructor and fromFunction method</li>
<li>Add vec3negate, vec3negateInPlace, vec3mul, and plane
and frustum methods to the GLMath class</li>
<li>Deprecate the practice of setting shape materials directly
to textures (calling the Shape#setMaterial method with a
Texture object rather than a Material object).</li>
<li>Deprecate certain properties of Transform that shouldn't
be exposed as a public API and add corresponding methods
for those properties</li>
<li>Fix getPromiseResults</li>
<li>Documentation added in many places</li>
<li>&quot;meshexamples.md&quot; demo added and other demos edited
or rearranged</li>
<li>Other changes and fixes</li>
</ul>
<p>See <a href="https://peteroupc.github.io/html3dutil/tutorial-history.html">older version history</a>.</p>
<h2>About</h2><p>Written in 2015-2016 by Peter O.</p>
<p>Any copyright is dedicated to the Public Domain.
<a href="http://creativecommons.org/publicdomain/zero/1.0/">http://creativecommons.org/publicdomain/zero/1.0/</a></p>
<p>If you like this, you should donate to Peter O.
at: <a href="http://peteroupc.github.io/">http://peteroupc.github.io/</a></p>
