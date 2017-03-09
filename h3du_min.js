/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global define, exports */
/* eslint no-extend-native: "off", callback-return: "off" */
// Notes by Peter O.:
// 2016-12-14: This is a polyfill for Promises, and it's only used
// when the environment doesn't support promises
// already, so the no-extend-native rule is disabled for this file.
// The callback-return rule is also disabled here in order
// to communicate the callback's return value properly.
// 2015-03-09: This file was taken
// from https://github.com/ondras/promise/.
(function (root, factory) {
  "use strict";
  if (typeof define === "function" && define.amd) {
    define(["exports"], factory);
  } else if (typeof exports === "object") {
    factory(exports);
  } else {
    factory(root);
  }
}(this, function (exports) {
  "use strict";
  if (exports.Promise) {
    return;
  }

  /**
   * A promise holds a value to be resolved in the future.<p>
   * This class is a "polyfill" for the standard <code>Promise</code>
   * class; it is only used when the running JavaScript environment
   * doesn't support or include a <code>Promise</code> class
   * on its own.
   * @class
   * @alias Promise
   * @param {Function} [resolver] Function that takes
   * two arguments: the first is a function to call when
   * resolving the promise, and the second is a function
   * to call when rejecting the promise.
   */
  var Promise = function(resolver) {
    this._state = 0; /* 0 = pending, 1 = fulfilled, 2 = rejected */
    this._value = null; /* fulfillment / rejection value */
    this._timeout = null;

    this._cb = {
      "fulfilled": [],
      "rejected": []
    };

    this._thenPromises = []; /* promises returned by then() */

    if (resolver) {
      this._invokeResolver(resolver);
    }
  };

  /**
   * Returns a promise that resolves.
   * @param {Object} value The value associated with the promise.
   * @returns {Promise} A promise that resolves and takes the given value
   * as its argument.
   * @method
   */
  Promise.resolve = function(value) {
    return new this(function(resolve) {
      resolve(value);
    });
  };

  /**
   * Returns a promise that is rejected.
   * @param {Object} value The value associated with the promise.
   * @returns {Promise} A promise that is rejected and takes the given value
   * as its argument.
   * @method
   */
  Promise.reject = function(reason) {
    return new this(function(resolve, reject) {
      reject(reason);
    });
  };

  /**
   * Wait for all these promises to complete. One failed => this fails too.
   * @param {Array<Promise>} all An array of promises.
   * @returns {Promise} A promise that is resolved when all promises have resolved.
   * @method
   */
  Promise.all = Promise.when = function(all) {
    return new this(function(resolve, reject) {
      var counter = 0;
      var results = [];

      all.forEach(function(promise, index) {
        counter++;
        promise.then(function(result) {
          results[index] = result;
          counter--;
          if (!counter) {
            resolve(results);
          }
        }, function(reason) {
          counter = 1 / 0;
          reject(reason);
        });
      });
    });
  };
/**
 * Creates a promise that resolves or is rejected when one of those promises
 * resolves or is rejected.
 * @param {Array<Promise>} all An array of promises.
 * @returns {Promise} A promise that is resolved when all promises have resolved.
 * @returns {Promise} A promise that resolves or is rejected according to
 * the first promise that resolves or is rejected. It will receive the
 * value associated with that promise.
 * @method
 */
  Promise.race = function(all) {
    return new this(function(resolve, reject) {
      all.forEach(function(promise) {
        promise.then(resolve, reject);
      });
    });
  };

  /**
   * Creates a promise that calls a function depending on whether
   * this promise resolves or is rejected.
   * @param {function} onFulfilled To be called once this promise gets fulfilled
   * @param {function} [onRejected] To be called once this promise gets rejected
   * @returns {Promise} A promise.
   * @instance
   * @memberof Promise#
   */
  Promise.prototype.then = function(onFulfilled, onRejected) {
    this._cb.fulfilled.push(onFulfilled);
    this._cb.rejected.push(onRejected);

    var thenPromise = new Promise();

    this._thenPromises.push(thenPromise);

    if (this._state > 0) {
      this._schedule();
    }

    /* 2.2.7. then must return a promise. */
    return thenPromise;
  };
  /** @ignore */
  Promise.prototype.fulfill = function(value) {
    if (this._state !== 0) {
      return this;
    }

    this._state = 1;
    this._value = value;

    if (this._thenPromises.length) {
      this._schedule();
    }

    return this;
  };
  /** @ignore */
  Promise.prototype.reject = function(value) {
    if (this._state !== 0) {
      return this;
    }

    this._state = 2;
    this._value = value;

    if (this._thenPromises.length) {
      this._schedule();
    }

    return this;
  };
  /** @ignore */
  Promise.prototype.resolve = function(x) {
    /* 2.3.1. If promise and x refer to the same object, reject promise with a TypeError as the reason. */
    if (x === this) {
      this.reject(new TypeError("Promise resolved by its own instance"));
      return;
    }

    /* 2.3.2. If x is a promise, adopt its state */
    if (x instanceof this.constructor) {
      x.chain(this);
      return;
    }
    var then;
    /* 2.3.3. Otherwise, if x is an object or function, */
    if (typeof x !== "undefined" && x !== null && (typeof x === "object" || typeof x === "function")) {
      try {
        then = x.then;
      } catch (e) {
        /* 2.3.3.2. If retrieving the property x.then results in a thrown exception e, reject promise with e as the reason. */
        this.reject(e);
        return;
      }

      if (typeof then === "function") {
        /* 2.3.3.3. If then is a function, call it */
        var called = false;
        var resolvePromise = function(y) {
          /* 2.3.3.3.1. If/when resolvePromise is called with a value y, run [[Resolve]](promise, y). */
          if (called) {
            return;
          }
          called = true;
          this.resolve(y);
        };
        var rejectPromise = function(r) {
          /* 2.3.3.3.2. If/when rejectPromise is called with a reason r, reject promise with r. */
          if (called) {
            return;
          }
          called = true;
          this.reject(r);
        };

        try {
          then.call(x, resolvePromise.bind(this), rejectPromise.bind(this));
        } catch (e) { /* 2.3.3.3.4. If calling then throws an exception e, */
          /* 2.3.3.3.4.1. If resolvePromise or rejectPromise have been called, ignore it. */
          if (called) {
            return;
          }
          /* 2.3.3.3.4.2. Otherwise, reject promise with e as the reason. */
          this.reject(e);
        }
      } else {
        /* 2.3.3.4 If then is not a function, fulfill promise with x. */
        this.fulfill(x);
      }
      return;
    }

    /* 2.3.4. If x is not an object or function, fulfill promise with x. */
    this.fulfill(x);
  };
  /** @ignore */
  Promise.prototype.chain = function(promise) {
    var resolve = function(value) {
      promise.resolve(value);
    };
    var reject = function(value) {
      promise.reject(value);
    };
    return this.then(resolve, reject);
  };

  /**
   * Creates a promise that calls a function if
   * this promise is rejected.
   * @param {function} onRejected To be called once this promise gets rejected
   * @returns {Promise} A promise.
   * @instance
   * @memberof Promise#
   */
  Promise.prototype.catch = function(onRejected) {
    return this.then(null, onRejected);
  };
/** @ignore */
  Promise.prototype._schedule = function() {
    if (this._timeout) {
      return;
    } /* resolution already scheduled */
    this._timeout = setTimeout(this._processQueue.bind(this), 0);
  };
/** @ignore */
  Promise.prototype._processQueue = function() {
    this._timeout = null;

    while (this._thenPromises.length) {
      var onFulfilled = this._cb.fulfilled.shift();
      var onRejected = this._cb.rejected.shift();
      this._executeCallback(this._state === 1 ? onFulfilled : onRejected);
    }
  };
/** @ignore */
  Promise.prototype._executeCallback = function(cb) {
    var thenPromise = this._thenPromises.shift();

    if (typeof cb !== "function") {
      if (this._state === 1) {
        /* 2.2.7.3. If onFulfilled is not a function and promise1 is fulfilled, promise2 must be fulfilled with the same value. */
        thenPromise.fulfill(this._value);
      } else {
        /* 2.2.7.4. If onRejected is not a function and promise1 is rejected, promise2 must be rejected with the same reason. */
        thenPromise.reject(this._value);
      }
      return;
    }

    try {
      var x = cb(this._value);
      /* 2.2.7.1. If either onFulfilled or onRejected returns a value x, run the Promise Resolution Procedure [[Resolve]](promise2, x). */
      thenPromise.resolve(x);
      return x;
    } catch (e) {
      /* 2.2.7.2. If either onFulfilled or onRejected throws an exception, promise2 must be rejected with the thrown exception as the reason. */
      thenPromise.reject(e);
    }
  };
/** @ignore */
  Promise.prototype._invokeResolver = function(resolver) {
    try {
      resolver(this.resolve.bind(this), this.reject.bind(this));
    } catch (e) {
      this.reject(e);
    }
  };

  exports.Promise = Promise;
}));
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global JSON, Promise, WebGL2RenderingContext */
/**
 * @license CC0-1.0
 */
/*
  Polyfills
*/
if(typeof window.requestAnimationFrame === "undefined" || window.requestAnimationFrame === null) {
  window.requestAnimationFrame = (typeof window.mozRequestAnimationFrame === "undefined" ? null : window.mozRequestAnimationFrame) ||
    (typeof window.webkitRequestAnimationFrame === "undefined" ? null : window.webkitRequestAnimationFrame) ||
  (typeof window.msRequestAnimationFrame === "undefined" ? null : window.msRequestAnimationFrame);
  if(typeof window.requestAnimationFrame === "undefined" || window.requestAnimationFrame === null) {
    window.requestAnimationFrame = function(func) {
      "use strict";
      window.setTimeout(function() {
        func(window.performance.now());
      }, 17);
    };
  }
}
if(typeof window.performance === "undefined" || window.performance === null) {
  window.performance = {};
}
if(typeof window.performance.now === "undefined" || window.performance.now === null) {
  window.performance.now = function() {
    "use strict";
    return new Date().getTime() * 1000 - window.performance._startTime;
  };
  window.performance._startTime = new Date().getTime() * 1000;
}
if(typeof Object.keys === "undefined" || Object.keys === null) {
  Object.keys = function(o) {
    "use strict";
    var ret = [];
    for(var i in o) {
      if(Object.prototype.hasOwnProperty.call(o, i)) {
        ret[ret.length] = i;
      }
    }
    return ret;
  };
}

/**
 * The Public Domain HTML 3D Library contains classes and utility
 * methods to ease the development of HTML 3D applications, such
 * as Web sites, in browsers that support 3D drawing using the HTML5 Canvas.
 * See the {@tutorial overview} tutorial.<p>
 * This page describes miscellaneous utility methods included in the
 * library.
 * @namespace
 */
var H3DU = {
/**
 * This method will call a function once before returning,
 * and queue requests to call that function once per frame,
 * using <code>window.requestAnimationFrame</code>
 * or a "polyfill" method.
 * @param {Function} func The function to call. The function
 * takes one parameter, "time", which is the number of
 * milliseconds since the page was loaded.
 * @returns {Object} Return value.
 */
  "renderLoop":function(func) {
    "use strict";
    func(window.performance.now());
    var selfRefFunc = function(time) {
      window.requestAnimationFrame(selfRefFunc);
      func(time);
    };
    window.requestAnimationFrame(selfRefFunc);
  },
/**
 * Creates an HTML canvas element, optionally appending
 * it to an existing HTML element.
 * @param {HTMLElement|null} parent If non-null, the parent
 * element of the new HTML canvas element. The element will be
 * appended as a child of this parent.
 * @param {number|null} width Width of the new canvas
 * element, or if null, the width a <code>canvas</code>
 * element would ordinarily have
 * under the CSS rules currently in effect where the canvas is. The resulting width will be rounded up.
 * This parameter can't be a negative number.
 * @param {number|null} height Height of the new canvas
 * element, or if null, the height a <code>canvas</code>
 * element would ordinarily have
 * under the CSS rules currently in effect where the canvas is. The resulting height will be rounded up.
 * This parameter can't be a negative number.
 * @returns {HTMLCanvasElement} The resulting canvas element.
 */
  "createCanvasElement":function(parent, width, height) {
    "use strict";
    var canvas = document.createElement("canvas");
    if(parent) {
      parent.appendChild(canvas);
    }
    if(typeof width === "undefined" || width === null) {
      canvas.width = Math.ceil(canvas.clientWidth) + "";
    } else if(width < 0) {
      throw new Error("width negative");
    } else {
      canvas.width = Math.ceil(width) + "";
    }
    if(typeof height === "undefined" || height === null) {
      canvas.height = Math.ceil(canvas.clientHeight) + "";
    } else if(height < 0) {
      throw new Error("height negative");
    } else {
      canvas.height = Math.ceil(height) + "";
    }
    return canvas;
  },
/**
 * Creates a 3D rendering context from an HTML canvas element,
 * falling back to a 2D context if that fails.
 * @param {HTMLCanvasElement} canvasElement An HTML
 * canvas element.
 * @returns {WebGLRenderingContext} A 3D or 2D rendering context, or null
 * if an error occurred in creating the context. Returns null if "canvasElement"
 * is null or not an HTML canvas element.
 */
  "get3DOr2DContext":function(canvasElement) {
    "use strict";
    if(!canvasElement)return null;
    if(!canvasElement.getContext)return null;
    var context = null;
    var options = {
      "preserveDrawingBuffer":true,
      "alpha":false
    };
    if(window.devicePixelRatio && window.devicePixelRatio > 1) {
      options.antialias = false;
    } else {
      options.antialias = true;
    }
    try {
      context = canvasElement.getContext("webgl2", options);
    } catch(ex) {
      context = null;
    }
    if(!context) {
      try {
        context = canvasElement.getContext("webgl", options);
      } catch(ex) {
        context = null;
      }
    }
    if(!context) {
      try {
        context = canvasElement.getContext("experimental-webgl", options);
      } catch(ex) {
        context = null;
      }
    }
    if(!context) {
      try {
        context = canvasElement.getContext("moz-webgl", options);
      } catch(ex) {
        context = null;
      }
    }
    if(!context) {
      try {
        context = canvasElement.getContext("webkit-3d", options);
      } catch(ex) {
        context = null;
      }
    }
    if(!context) {
      try {
        context = canvasElement.getContext("2d", options);
      } catch(ex) {
        context = null;
      }
    }

    if(H3DU.is3DContext(context)) {
      context.getExtension("OES_element_index_uint");
      context.getExtension("OES_standard_derivatives");
    }
    return context;
  },
/**
 * Creates a 3D rendering context from an HTML canvas element.
 * @param {HTMLCanvasElement} canvasElement An HTML
 * canvas element.
 * @param {function} err A function to call if an error occurs in creating
 * the context. The function takes one parameter consisting of a human-
 * readable error message.  If "err" is null, window.alert() will be used instead.
 * @returns {WebGLRenderingContext} A 3D rendering context, or null
 * if an error occurred in creating the context.  Returns null if "canvasElement"
 * is null or not an HTML canvas element.
 */
  "get3DContext":function(canvasElement, err) {
    "use strict";
    var c = H3DU.get3DOr2DContext(canvasElement);
    var errmsg = null;
    if(!c && (typeof window.WebGLShader !== "undefined" && window.WebGLShader !== null)) {
      errmsg = "Failed to initialize graphics support required by this page.";
    } else if(typeof window.WebGLShader !== "undefined" && window.WebGLShader !== null && !H3DU.is3DContext(c)) {
      errmsg = "This page requires WebGL, but it failed to start. Your computer might not support WebGL.";
    } else if(!c || !H3DU.is3DContext(c)) {
      errmsg = "This page requires a WebGL-supporting browser.";
    }
    if(errmsg) {
      (err || window.alert)(errmsg);
      return null;
    }
    return c;
  },
/**
 * Returns whether the given object is a 3D rendering context.
 * @param {Object} context The object to check.
 * @returns {Boolean} Return value.
 */
  "is3DContext":function(context) {
    "use strict";
    if(context && (typeof WebGLRenderingContext !== "undefined" && WebGLRenderingContext !== null) && context instanceof WebGLRenderingContext) {
      return true;
    }
    if(context && (typeof WebGL2RenderingContext !== "undefined" && WebGL2RenderingContext !== null) && context instanceof WebGL2RenderingContext) {
      return true;
    }
    return context && "compileShader" in context;
  },

/**
 * Utility function that returns a promise that
 * resolves or is rejected after the given list of promises finishes
 * its work.
 * @param {Array<Promise>} promises - an array containing promise objects
 * @param {Function} [progressResolve] - a function called as each
 * individual promise is resolved; optional
 * @param {Function} [progressReject] - a function called as each
 * individual promise is rejected; optional
 * @returns {Promise} A promise that is resolved when
 * all of the promises are each resolved; the result will
 * be an array of results from those promises,
 * in the order in which those promises were listed.
 * Will be rejected if any of the promises is rejected; the result
 * will be an object as specified in {@link H3DU.getPromiseResults}.</ul>
 */
  "getPromiseResultsAll":function(promises,
   progressResolve, progressReject) {
    "use strict";
    return H3DU.getPromiseResults(promises, progressResolve, progressReject)
     .then(function(results) {
       if(results.failures.length > 0) {
         return Promise.reject(results);
       } else {
         return Promise.resolve(results.successes);
       }
     });
  },
/**
 * Utility function that returns a promise that
 * resolves after the given list of promises finishes
 * its work.
 * @param {Array<Promise>} promises - an array containing promise objects
 * @param {Function} [progressResolve] A function called as each
 * individual promise is resolved.
 * @param {Function} [progressReject] A function called as each
 * individual promise is rejected.
 * @returns {Promise} A promise that is never rejected and resolves when
 * all of the promises are each resolved or rejected. The result
 * of the promise will be an object with
 * three keys:<ul>
 *  <li>"successes" - contains a list of results from the
 * promises that succeeded, in the order in which those promises were listed.
 *  <li>"failures" - contains a list of results from the
 * promises that failed, in the order in which those promises were listed.
 *  <li>"results" - contains a list of boolean values for each
 * promise, in the order in which the promises were listed.
 * True means success, and false means failure.</ul>
 */
  "getPromiseResults":function(promises,
   progressResolve, progressReject) {
    "use strict";
    if(!promises || promises.length === 0) {
      return Promise.resolve({
        "successes":[],
        "failures":[],
        "results":[]
      });
    }
    function promiseResolveFunc(pr, ret, index) {
      return function(x) {
        if(pr)pr(x);
        ret.successes[index] = x;
        return true;
      };
    }
    function promiseRejectFunc(pr, ret, index) {
      return function(x) {
        if(pr)pr(x);
        ret.failures[index] = x;
        return true;
      };
    }
    var ret = {
      "successes":[],
      "failures":[],
      "results":[]
    };
    var newPromises = [];
    for(var i = 0; i < promises.length; i++) {
      var index = i;
      newPromises.push(promises[i].then(
    promiseResolveFunc(progressResolve, ret, index),
    promiseRejectFunc(progressReject, ret, index)
  ));
    }
    return Promise.all(newPromises).then(function(results) {
  // compact the successes and failures arrays
      for(var i = 0; i < ret.successes.length; i++) {
        if(typeof ret.successes[i] === "undefined") {
          ret.successes.splice(i, 1);
          i -= 1;
        }
      }
      for(i = 0; i < ret.failures.length; i++) {
        if(typeof ret.failures[i] === "undefined") {
          ret.failures.splice(i, 1);
          i -= 1;
        }
      }
      ret.results = results;
      return Promise.resolve(ret);
    });
  },
/**
 * Loads a file from a URL asynchronously, using XMLHttpRequest.
 * @param {String} url URL of the file to load.
 * @param {string|null} responseType Expected data type of
 * the file.  Can be "json", "xml", "text", or "arraybuffer".
 * If null or omitted, the default is "text".
 * @returns {Promise} A promise that resolves when the data
 * file is loaded successfully (the result will be an object with
 * two properties: "url", the URL of the file, and "data", the
 * file's text or data), as given below, and is rejected when an error occurs (the
 * result may be an object with
 * one property: "url", the URL of the file). If the promise resolves,
 * the parameter's "data" property will be:<ul>
 * <li>For response type "xml", an XML document object.
 * <li>For response type "arraybuffer", an ArrayBuffer object.
 * <li>For response type "json", the JavaScript object decoded
 * from JSON.
 * <li>For any other type, a string of the file's text.</ul>
 */
  "loadFileFromUrl":function(url, responseType) {
    "use strict";
    var urlstr = url;
    var respType = responseType || "text";
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function(e) {
        var t = e.target;
    // console.log([t.readyState,t.status,urlstr])
        if(t.readyState === 4) {
          if(t.status >= 200 && t.status < 300) {
            var resp = "";
            if(respType === "xml")resp = t.responseXML;
            else if(respType === "json")
              resp = "response" in t ? t.response : JSON.parse(t.responseText);
            else if(respType === "arraybuffer")
              resp = t.response;
            else resp = t.responseText + "";
            resolve({
              "url": urlstr,
              "data": resp
            });
          } else {
            reject({"url": urlstr});
          }
        }
      };
      xhr.onerror = function(e) {
    // console.log([urlstr,e])
        reject({
          "url": urlstr,
          "error": e
        });
      };
      xhr.open("get", url, true);
      xhr.responseType = respType;
      xhr.send();
    });
  }
};

/**
 * Gets the position of a time value within an interval.
 * This is useful for doing animation cycles lasting a certain number
 * of seconds, such as rotating a shape in a 5-second cycle.
 * This method may be called any number of times each frame.
 * @param {Object} timer An object that will hold two
 * properties:<ul>
 * <li>"time" - initial time value, in milliseconds.
 * <li>"lastTime" - last known time value, in milliseconds.
 * Will be set to the value given in "timeInMs" before returning.
 * </ul>
 * The object should be initialized using the idiom <code>{}</code>
 * or <code>new Object()</code>.
 * @param {Number} timeInMs A time value, in milliseconds.
 * This could be the parameter received in a
 * <code>requestAnimationFrame()</code> callback method.
 * @param {Number} intervalInMs The length of the interval
 * (animation cycle), in milliseconds.
 * @returns {Number} A value in the range [0, 1), where closer
 * to 0 means "timeInMs" lies
 * closer to the start, and closer to 1 means closer
 * to the end of the interval. If an initial time wasn't set, returns 0.
 * @example <caption>The following code sets an angle of
 * rotation, in degrees, such that an object rotated with the
 * angle does a 360-degree turn in 5 seconds (5000 milliseconds).
 * The variable <code>time</code> is assumed to be a time
 * value in milliseconds, such as the parameter of a
 * <code>requestAnimationFrame()</code> callback method.
 * </caption>
 * var angle = 360 * H3DU.getTimePosition(timer, time, 5000);
 */
H3DU.getTimePosition = function(timer, timeInMs, intervalInMs) {
  "use strict";
  if(typeof timer.time === "undefined" || timer.time === null) {
    timer.time = timeInMs;
    timer.lastTime = timeInMs;
    return 0;
  } else {
    if(typeof timer.lastTime === "undefined" || timer.lastTime === null)timer.lastTime = timeInMs;
    return (timeInMs - timer.time) * 1.0 % intervalInMs / intervalInMs;
  }
};
/**
 * Returns the number of frame-length intervals that occurred since
 * the last known time, where a frame's length is 1/60 of a second.
 * This method should be called only once each frame.
 * @param {Object} timer An object described
 * in {@link H3DU.getTimePosition}.
 * @param {Number} timeInMs A time value, in milliseconds.
 * This could be the parameter received in a
 * <code>requestAnimationFrame()</code> callback method.
 * </code>.
 * @returns {Number} The number of frame-length intervals relative to
 * the last known time held in the parameter "timer".
 * The number can include fractional frames. If an
 * initial time or last known time wasn't set, returns 0.
 */
H3DU.newFrames = function(timer, timeInMs) {
  "use strict";
  if(typeof timer.time === "undefined" || timer.time === null) {
    timer.time = timeInMs;
    timer.lastTime = timeInMs;
    return 0;
  } else if(typeof timer.lastTime === "undefined" || timer.lastTime === null) {
    timer.lastTime = timeInMs;
    return 0;
  } else {
    var diff = timeInMs - timer.lastTime;
    timer.lastTime = timeInMs;
    return diff * 60.0 / 1000.0;
  }
};

(function(exports) {
  "use strict";

  var ColorValidator = function() {
    throw new Error();
  };
  (function(constructor) {
    constructor.skipWhite = function(str, index, endIndex) {
      while (index < endIndex) {
        var c = str.charCodeAt(index);
        if (c === 32 || c === 13 || c === 12 || c === 9 || c === 10) {
          ++index;
        } else {
          break;
        }
      }
      return index;
    };

    constructor.parseComma = function(str, index, endIndex) {
      var indexStart = index;
      index = ColorValidator.skipWhite(str, index, endIndex);
      if (index < endIndex && str.charCodeAt(index) === 44) {
        return ColorValidator.skipWhite(str, index + 1, endIndex);
      } else {
        return indexStart;
      }
    };

    constructor.parseEndparen = function(str, index, endIndex) {
      var indexStart = index;
      index = ColorValidator.skipWhite(str, index, endIndex);
      if (index < endIndex && str.charCodeAt(index) === 41) {
        return index + 1;
      } else {
        return indexStart;
      }
    };

    constructor.hsl = function(str, index, endIndex, ret) {
      var indexStart, indexTemp, tx2;
      indexStart = index;
      indexTemp = index;
      if ((tx2 = ColorValidator.parseHue(str, index, endIndex, ret, 0)) === index) {
        return indexStart;
      }
      index = tx2;
      if ((tx2 = ColorValidator.sepPct(str, index, endIndex, ret, 1)) === index) {
        return indexStart;
      }
      index = tx2;
      if ((tx2 = ColorValidator.sepPct(str, index, endIndex, ret, 2)) === index) {
        return indexStart;
      }
      index = tx2;
      tx2 = ColorValidator.parseEndparen(str, index, endIndex);
      if (tx2 === index) {
        return indexStart;
      } else {
        index = tx2;
      }
      var rgb = ColorValidator.hlsToRgb(ret[0], ret[2], ret[1]);
      ret[0] = rgb[0];
      ret[1] = rgb[1];
      ret[2] = rgb[2];
      ret[3] = 255.0;
      indexTemp = index;
      return indexTemp;
    };
    constructor.pct = function(str, index, endIndex, ret, retIndex) {
      var tx2 = ColorValidator.parseNumber(str, index, endIndex);
      if (tx2 !== index) {
        if (tx2 >= endIndex || str.charAt(tx2) !== 37)
          return index;
        ret[retIndex] = ColorValidator.stringToPercent(str, index, tx2) * 255.0 / 100.0;
        return tx2 + 1;
      }
      return tx2;
    };
    constructor.parseByte = function(str, index, endIndex, ret, retIndex) {
      var tx2 = ColorValidator.parseInteger(str, index, endIndex, true);
      if (tx2 !== index) {
        ret[retIndex] = ColorValidator.stringToByte(str, index, tx2);
      }
      return tx2;
    };
    constructor.parseHue = function(str, index, endIndex, ret, retIndex) {
      var start = index;
      index = ColorValidator.skipWhite(str, index, endIndex);
      var tx2 = ColorValidator.parseNumber(str, index, endIndex);
      if (tx2 !== index) {
        ret[retIndex] = ColorValidator.stringToHue(str, index, tx2);
        return tx2;
      } else {
        return start;
      }
    };
    constructor.sepByte = function(str, index, endIndex, ret, retIndex) {
      var tx2 = ColorValidator.parseComma(str, index, endIndex);
      return tx2 !== index ? ColorValidator.parseByte(str, tx2, endIndex, ret, retIndex) : tx2;
    };
    constructor.sepPct = function(str, index, endIndex, ret, retIndex) {
      var tx2 = ColorValidator.parseComma(str, index, endIndex);
      return tx2 !== index ? ColorValidator.pct(str, tx2, endIndex, ret, retIndex) : tx2;
    };
    constructor.sepAlpha = function(str, index, endIndex, ret, retIndex) {
      var tx2 = ColorValidator.parseComma(str, index, endIndex);
      if (tx2 !== index) {
        index = tx2;
        tx2 = ColorValidator.parseNumber(str, index, endIndex);
        if (tx2 !== index) {
          ret[retIndex] = ColorValidator.stringToAlpha(str, index, tx2);
        }
      }
      return tx2;
    };

    constructor.hsla = function(str, index, endIndex, ret) {
      var indexStart, indexTemp, tx2;
      indexStart = index;
      indexTemp = index;
      if ((tx2 = ColorValidator.parseHue(str, index, endIndex, ret, 0)) === index) {
        return indexStart;
      }
      index = tx2;
      if ((tx2 = ColorValidator.sepPct(str, index, endIndex, ret, 1)) === index) {
        return indexStart;
      }
      index = tx2;
      if ((tx2 = ColorValidator.sepPct(str, index, endIndex, ret, 2)) === index) {
        return indexStart;
      }
      index = tx2;
      if ((tx2 = ColorValidator.sepAlpha(str, index, endIndex, ret, 3)) === index) {
        return indexStart;
      }
      index = tx2;
      var rgb = ColorValidator.hlsToRgb(ret[0], ret[2], ret[1]);
      ret[0] = rgb[0];
      ret[1] = rgb[1];
      ret[2] = rgb[2];
      tx2 = ColorValidator.parseEndparen(str, index, endIndex);
      if (tx2 === index) {
        return indexStart;
      } else {
        index = tx2;
      }
      indexTemp = index;
      return indexTemp;
    };

    constructor.rgba = function(str, index, endIndex, result) {
      var indexStart, tx2;
      indexStart = index;
      index = ColorValidator.skipWhite(str, index, endIndex);
      var st = index;
      var continuing = true;
      if ((tx2 = ColorValidator.pct(str, index, endIndex, result, 0)) === index) {
        continuing = false;
      } else {
        index = tx2;
      }
      if (continuing && (tx2 = ColorValidator.sepPct(str, index, endIndex, result, 1)) === index) {
        continuing = false;
      } else {
        index = tx2;
      }
      if (continuing && (tx2 = ColorValidator.sepPct(str, index, endIndex, result, 2)) === index) {
        continuing = false;
      } else {
        index = tx2;
      }
      if (continuing && (tx2 = ColorValidator.sepAlpha(str, index, endIndex, result, 3)) === index) {
        continuing = false;
      } else {
        index = tx2;
      }
      if (!continuing) {
        index = st;
        continuing = true;
        if ((tx2 = ColorValidator.parseByte(str, index, endIndex, result, 0)) === index) {
          continuing = false;
        } else {
          index = tx2;
        }
        if (continuing && (tx2 = ColorValidator.sepByte(str, index, endIndex, result, 1)) === index) {
          continuing = false;
        } else {
          index = tx2;
        }
        if (continuing && (tx2 = ColorValidator.sepByte(str, index, endIndex, result, 2)) === index) {
          continuing = false;
        } else {
          index = tx2;
        }
        if (continuing && (tx2 = ColorValidator.sepAlpha(str, index, endIndex, result, 3)) === index) {
          continuing = false;
        } else {
          index = tx2;
        }
      }
      if (!continuing) {
        return indexStart;
      }
      tx2 = ColorValidator.parseEndparen(str, index, endIndex);
      index = tx2 === index ? indexStart : tx2;
      return index;
    };
    constructor.rgb = function(str, index, endIndex, result) {
      var indexStart, tx2;
      indexStart = index;
      index = ColorValidator.skipWhite(str, index, endIndex);
      var st = index;
      var continuing = true;
      if ((tx2 = ColorValidator.pct(str, index, endIndex, result, 0)) === index) {
        continuing = false;
      } else {
        index = tx2;
      }
      if (continuing && (tx2 = ColorValidator.sepPct(str, index, endIndex, result, 1)) === index) {
        continuing = false;
      } else {
        index = tx2;
      }
      if (continuing && (tx2 = ColorValidator.sepPct(str, index, endIndex, result, 2)) === index) {
        continuing = false;
      } else {
        index = tx2;
      }
      if (!continuing) {
        index = st;
        continuing = true;
        if ((tx2 = ColorValidator.parseByte(str, index, endIndex, result, 0)) === index) {
          continuing = false;
        } else {
          index = tx2;
        }
        if (continuing && (tx2 = ColorValidator.sepByte(str, index, endIndex, result, 1)) === index) {
          continuing = false;
        } else {
          index = tx2;
        }
        if (continuing && (tx2 = ColorValidator.sepByte(str, index, endIndex, result, 2)) === index) {
          continuing = false;
        } else {
          index = tx2;
        }
      }
      if (!continuing) {
        return indexStart;
      }
      result[3] = 255.0;
      tx2 = ColorValidator.parseEndparen(str, index, endIndex);
      if (tx2 === index) {
        return indexStart;
      } else {
        return tx2;
      }
    };
    constructor.stringToNumber = function(str, index, endIndex) {
      var str2 = str.substring(index, index + (endIndex - index));
      return parseFloat(str2);
    };
    constructor.stringToPercent = function(str, index, endIndex) {
      var num = ColorValidator.stringToNumber(str, index, endIndex);
      return Number.isNaN(num) ? -1 : num < 0 ? 0 : num > 100 ? 100 : num;
    };
    constructor.stringToAlpha = function(str, index, endIndex) {
      var num = ColorValidator.stringToNumber(str, index, endIndex);
      return num < 0 ? 0 : num > 1.0 ? 255 : num * 255.0;
    };
    constructor.stringToHue = function(str, index, endIndex) {
      var num = ColorValidator.stringToNumber(str, index, endIndex);
      return Number.isNaN(num) || num === Number.POSITIVE_INFINITY || num === Number.NEGATIVE_INFINITY ? 0 : (num % 360 + 360) % 360;
    };
    constructor.stringToByte = function(str, index, endIndex) {
      var num = ColorValidator.stringToNumber(str, index, endIndex);
      return num < 0 ? 0 : num > 255 ? 255 : num;
    };

    constructor.parseInteger = function(str, index, endIndex, posneg) {
      var digits = false;
      var indexStart = index;
      if (posneg && index < endIndex && (str.charCodeAt(index) === 43 || str.charCodeAt(index) === 45)) {
        ++index;
      }
      while (index < endIndex && (str.charCodeAt(index) >= 48 && str.charCodeAt(index) <= 57)) {
        ++index;
        digits = true;
      }
      return digits ? index : indexStart;
    };

    constructor.parseNumber = function(str, index, endIndex) {
      var indexStart = index;
      var tmp = index;
      var tmp2 = 0;
      if ((tmp = ColorValidator.parseInteger(str, index, endIndex, true)) !== indexStart) {
        index = tmp;
        if (index < endIndex && str.charCodeAt(index) === 46) {
          ++index;
          if ((tmp = ColorValidator.parseInteger(str, index, endIndex, false)) !== index) {
            if(index < endIndex && (str.charCodeAt(index) === 0x45 || str.charCodeAt(index) === 0x65) &&
            (tmp2 = ColorValidator.parseInteger(str, index + 1, endIndex, true)) !== index + 1) {
              return tmp2;
            }
            return tmp;
          } else {
            return index - 1;
          }
        }
        return index;
      } else {
        if (index < endIndex && (str.charCodeAt(index) === 43 || str.charCodeAt(index) === 45)) {
          ++index;
        }
        if (index < endIndex && str.charCodeAt(index) === 46) {
          ++index;
          if ((tmp = ColorValidator.parseInteger(str, index, endIndex, false)) !== index) {
            if(index < endIndex && (str.charCodeAt(index) === 0x45 || str.charCodeAt(index) === 0x65) &&
            (tmp2 = ColorValidator.parseInteger(str, index + 1, endIndex, true)) !== index + 1) {
              return tmp2;
            }
            return tmp;
          } else {
            return indexStart;
          }
        }
        return indexStart;
      }
    };

    constructor.hlsToRgb = constructor.HlsToRgb = function(hueval, lum, sat) {
      lum = lum < 0 ? 0 : lum > 255 ? 255 : lum;
      sat = sat < 0 ? 0 : sat > 255 ? 255 : sat;
      if (sat === 0) {
        return [lum, lum, lum];
      }
      var b = 0;
      if (lum <= 127.5) {
        b = lum * (255.0 + sat) / 255.0;
      } else {
        b = lum * sat;
        b /= 255.0;
        b = lum + sat - b;
      }
      var a = lum * 2 - b;
      var r, g, bl;
      if (hueval < 0 || hueval >= 360) {
        hueval = (hueval % 360 + 360) % 360;
      }
      var hue = hueval + 120;
      if (hue >= 360) {
        hue -= 360;
      }
      r = hue < 60 ? a + (b - a) * hue / 60 : hue < 180 ? b : hue < 240 ? a + (b - a) * (240 - hue) / 60 : a;
      hue = hueval;
      g = hue < 60 ? a + (b - a) * hue / 60 : hue < 180 ? b : hue < 240 ? a + (b - a) * (240 - hue) / 60 : a;
      hue = hueval - 120;
      if (hue < 0) {
        hue += 360;
      }
      bl = hue < 60 ? a + (b - a) * hue / 60 : hue < 180 ? b : hue < 240 ? a + (b - a) * (240 - hue) / 60 : a;
      return [r < 0 ? 0 : r > 255 ? 255 : r, g < 0 ? 0 : g > 255 ? 255 : g, bl < 0 ? 0 : bl > 255 ? 255 : bl];
    };

    constructor.dehexchar = function(c) {
      if (c >= 48 && c <= 57) {
        return c - 48;
      }
      return c >= 65 && c <= 70 ? c + 10 - 65 : c >= 97 && c <= 102 ? c + 10 - 97 : -1;
    };
    constructor.rgbHex = function(str, hexval, hash) {
      if (typeof str === "undefined" || str === null || str.length === 0) {
        return false;
      }
      var slen = str.length;
      var hexes = [0, 0, 0, 0, 0, 0, 0, 0];
      var index = 0;
      var hexIndex = 0;
      if (str.charAt(0) === "#") {
        --slen;
        ++index;
      } else if (hash) {
        return false;
      }
      if (slen !== 3 && slen !== 4 && slen !== 6 && slen !== 8) {
        return false;
      }
      for (var i = index; i < str.length; ++i) {
        var hex = ColorValidator.dehexchar(str.charCodeAt(i));
        if (hex < 0) {
          return false;
        }
        hexes[hexIndex++] = hex;
      }
      if (slen === 4) {
        hexval[3] = hexes[3] | hexes[3] << 4;
      } else if (slen === 8) {
        hexval[3] = hexes[7] | hexes[6] << 4;
      } else {
        hexval[3] = 255.0;
      }
      if (slen === 3 || slen === 4) {
        hexval[0] = hexes[0] | hexes[0] << 4;
        hexval[1] = hexes[1] | hexes[1] << 4;
        hexval[2] = hexes[2] | hexes[2] << 4;
      } else if (slen >= 6) {
        hexval[0] = hexes[1] | hexes[0] << 4;
        hexval[1] = hexes[3] | hexes[2] << 4;
        hexval[2] = hexes[5] | hexes[4] << 4;
      }
      return true;
    };

    constructor.colorToRgba = constructor.colorToRgba = function(x) {
      if (typeof x === "undefined" || x === null || x.length === 0) {
        return null;
      }
      x = x.replace(/^[\r\n\t \u000c]+|[\r\n\t \u000c]+$/g, "");
      x = x.toLowerCase();
      if (x === "transparent") {
        return [0, 0, 0, 0];
      }
      if (typeof x === "undefined" || x === null || x.length === 0) {
        return null;
      }
      var ret = [0, 0, 0, 0];
      if (x.charAt(0) === "#") {
        if (ColorValidator.rgbHex(x, ret, true)) {
          return ret;
        }
      }
      if (x.length > 4 && x.substring(0, 4) === "rgb(") {
        return ColorValidator.rgb(x, 4, x.length, ret) === x.length ? ret : null;
      }
      if (x.length > 5 && x.substring(0, 5) === "rgba(") {
        return ColorValidator.rgba(x, 5, x.length, ret) === x.length ? ret : null;
      }
      if (x.length > 4 && x.substring(0, 4) === "hsl(") {
        return ColorValidator.hsl(x, 4, x.length, ret) === x.length ? ret : null;
      }
      if (x.length > 5 && x.substring(0, 5) === "hsla(") {
        return ColorValidator.hsla(x, 5, x.length, ret) === x.length ? ret : null;
      }
      var colors = ColorValidator.colorToRgbaSetUpNamedColors();
      if (typeof colors[x] !== "undefined" && colors[x] !== null) {
        var colorValue = colors[x];
        ColorValidator.rgbHex(colorValue, ret, false);
        return ret;
      }
      return null;
    };

    constructor.namedColorMap = constructor.namedColorMap = null;

    constructor.nc = ["aliceblue", "f0f8ff", "antiquewhite", "faebd7", "aqua", "00ffff", "aquamarine", "7fffd4", "azure", "f0ffff", "beige", "f5f5dc", "bisque", "ffe4c4", "black", "000000", "blanchedalmond", "ffebcd", "blue", "0000ff", "blueviolet", "8a2be2", "brown", "a52a2a", "burlywood", "deb887", "cadetblue", "5f9ea0", "chartreuse", "7fff00", "chocolate", "d2691e", "coral", "ff7f50", "cornflowerblue", "6495ed", "cornsilk", "fff8dc", "crimson", "dc143c", "cyan", "00ffff", "darkblue", "00008b", "darkcyan", "008b8b", "darkgoldenrod", "b8860b", "darkgray", "a9a9a9", "darkgreen", "006400", "darkkhaki", "bdb76b", "darkmagenta", "8b008b", "darkolivegreen", "556b2f", "darkorange", "ff8c00", "darkorchid", "9932cc", "darkred", "8b0000", "darksalmon", "e9967a", "darkseagreen", "8fbc8f", "darkslateblue", "483d8b", "darkslategray", "2f4f4f", "darkturquoise", "00ced1", "darkviolet", "9400d3", "deeppink", "ff1493", "deepskyblue", "00bfff", "dimgray", "696969", "dodgerblue", "1e90ff", "firebrick", "b22222", "floralwhite", "fffaf0", "forestgreen", "228b22", "fuchsia", "ff00ff", "gainsboro", "dcdcdc", "ghostwhite", "f8f8ff", "gold", "ffd700", "goldenrod", "daa520", "gray", "808080", "green", "008000", "greenyellow", "adff2f", "honeydew", "f0fff0", "hotpink", "ff69b4", "indianred", "cd5c5c", "indigo", "4b0082", "ivory", "fffff0", "khaki", "f0e68c", "lavender", "e6e6fa", "lavenderblush", "fff0f5", "lawngreen", "7cfc00", "lemonchiffon", "fffacd", "lightblue", "add8e6", "lightcoral", "f08080", "lightcyan", "e0ffff", "lightgoldenrodyellow", "fafad2", "lightgray", "d3d3d3", "lightgreen", "90ee90", "lightpink", "ffb6c1", "lightsalmon", "ffa07a", "lightseagreen", "20b2aa", "lightskyblue", "87cefa", "lightslategray", "778899", "lightsteelblue", "b0c4de", "lightyellow", "ffffe0", "lime", "00ff00", "limegreen", "32cd32", "linen", "faf0e6", "magenta", "ff00ff", "maroon", "800000", "mediumaquamarine", "66cdaa", "mediumblue", "0000cd", "mediumorchid", "ba55d3", "mediumpurple", "9370d8", "mediumseagreen", "3cb371", "mediumslateblue", "7b68ee", "mediumspringgreen", "00fa9a", "mediumturquoise", "48d1cc", "mediumvioletred", "c71585", "midnightblue", "191970", "mintcream", "f5fffa", "mistyrose", "ffe4e1", "moccasin", "ffe4b5", "navajowhite", "ffdead", "navy", "000080", "oldlace", "fdf5e6", "olive", "808000", "olivedrab", "6b8e23", "orange", "ffa500", "orangered", "ff4500", "orchid", "da70d6", "palegoldenrod", "eee8aa", "palegreen", "98fb98", "paleturquoise", "afeeee", "palevioletred", "d87093", "papayawhip", "ffefd5", "peachpuff", "ffdab9", "peru", "cd853f", "pink", "ffc0cb", "plum", "dda0dd", "powderblue", "b0e0e6", "purple", "800080", "rebeccapurple", "663399", "red", "ff0000", "rosybrown", "bc8f8f", "royalblue", "4169e1", "saddlebrown", "8b4513", "salmon", "fa8072", "sandybrown", "f4a460", "seagreen", "2e8b57", "seashell", "fff5ee", "sienna", "a0522d", "silver", "c0c0c0", "skyblue", "87ceeb", "slateblue", "6a5acd", "slategray", "708090", "snow", "fffafa", "springgreen", "00ff7f", "steelblue", "4682b4", "tan", "d2b48c", "teal", "008080", "thistle", "d8bfd8", "tomato", "ff6347", "turquoise", "40e0d0", "violet", "ee82ee", "wheat", "f5deb3", "white", "ffffff", "whitesmoke", "f5f5f5", "yellow", "ffff00", "yellowgreen", "9acd32"];

    constructor.colorToRgbaSetUpNamedColors = function() {
      if (typeof ColorValidator.namedColorMap === "undefined" || ColorValidator.namedColorMap === null) {
        var ncm = {};
        for (var i = 0; i < ColorValidator.nc.length; i += 2) {
          ncm[ColorValidator.nc[i]] = ColorValidator.nc[i + 1];
        }
        ncm.grey = ncm.gray;
        ncm.darkgrey = ncm.darkgray;
        ncm.darkslategrey = ncm.darkslategray;
        ncm.dimgrey = ncm.dimgray;
        ncm.lightgrey = ncm.lightgray;
        ncm.lightslategrey = ncm.lightslategray;
        ncm.slategrey = ncm.slategray;
        ColorValidator.namedColorMap = ncm;
      }
      return ColorValidator.namedColorMap;
    };
  }(ColorValidator, ColorValidator.prototype));

  var clampRgba = function(x) {
    x[0] = x[0] < 0 ? 0 : Math.min(x[0], 1);
    x[1] = x[1] < 0 ? 0 : Math.min(x[1], 1);
    x[2] = x[2] < 0 ? 0 : Math.min(x[2], 1);
    x[3] = x[3] < 0 ? 0 : Math.min(x[3], 1);
    return x;
  };
/**
 * Creates a 4-element array representing a color. Each element
 * can range from 0 to 1 and specifies the red, green, blue or alpha
 * component, respectively.
 * This method also converts HTML and CSS colors to 4-element RGB
 * colors. The following lists the kinds of colors accepted:
 * <ul>
 * <li>HTML colors with the syntax <code>#RRGGBB</code> or <code>#RRGGBBAA</code>, where
 * RR is the hexadecimal form of the red component (00-FF), GG
 * is the hexadecimal green component, BB is the hexadecimal
 * blue component, and AA is the hexadecimal alpha component. Example: #88DFE0.
 * <li>HTML colors with the syntax <code>#RGB</code> or <code>#RGBA</code>, where
 * R is the hexadecimal form of the red component (0-F), G
 * is the hexadecimal green component, B is the hexadecimal
 * blue component, and A is the hexadecimal alpha component. Example: #8DE.
 * <li>CSS colors with the syntax <code>rgb(red, green, blue)</code> or
 * <code>rgba(red, green, blue, alpha)</code> where
 * <code>red</code>, <code>green</code>, and <code>blue</code>
 * are the red, green, and blue components, respectively, either as a
 * number (0-255) or as a percent, and <code>alpha</code> is
 * a number from 0-1 specifying the alpha component.
 * Examples: <code>rgb(255,0,0)</code>,
 * <code>rgb(100%,50%,0%)</code>, <code>rgba(20,255,255,0.5)</code>.
 * <li>CSS colors with the syntax <code>hsl(hue, sat, light)</code> or
 * <code>hsla(hue, sat, light, alpha)</code> where
 * <code>hue</code> is the hue component in degrees (0-360),
 * <code>sat</code> and <code>light</code>
 * are the saturation and lightness components, respectively, as percents,
 * and <code>alpha</code> is
 * a number from 0-1 specifying the alpha component.
 * Examples: <code>rgb(255,0,0)</code>,
 * <code>hsl(200,50%,50%)</code>, <code>hsla(20,80%,90%,0.5)</code>.
 * <li>CSS colors such as <code>red</code>, <code>green</code>,
 * <code>white</code>, <code>lemonchiffon</code>, <code>chocolate</code>,
 * and so on, including the newly added <code>rebeccapurple</code>.
 * <li>The value <code>transparent</code>, meaning transparent black.
 * </ul>
 * For more information, see the "{@tutorial colors}" tutorial.
 * @alias H3DU.toGLColor
 * @param {Array<Number>|number|string} r One of the following:<ul>
 * <li>A <b>color vector or string</b>, which can be one of these:<ul>
 * <li>An array of three color components, each of which ranges from 0 to 1.
 * The three components are red, green, and blue in that order.</li>
 * <li>An array of four color components, each of which ranges from 0 to 1.
 * The three components are red, green, blue, and alpha in that order.</li>
 * <li>A string specifying an HTML or CSS color, in one of the formats mentioned
 * above in the method description.</li></ul></li>
 * <li>A number specifying the red component. Must range from 0 to 1.</li>
 * </ul>
 * Returns (0,0,0,0) if this value is null.
 * @param {Number} g Green color component (0-1).
 * May be null or omitted if a string or array is given as the "r" parameter.
 * @param {Number} b Blue color component (0-1).
 * May be null or omitted if a string or array is given as the "r" parameter.
 * @param {Number} [a] Alpha color component (0-1).
 * If the "r" parameter is given and this parameter is null or omitted,
 * this value is treated as 1.0.
 * @returns {Array<Number>} The color as a 4-element array; if the color is
 * invalid, returns [0,0,0,0], or transparent black. Numbers less
 * than 0 are clamped to 0, and numbers greater than 1 are
 * clamped to 1.
 */
  exports.toGLColor = function(r, g, b, a) {
    if(typeof r === "undefined" || r === null)return [0, 0, 0, 0];
    if(typeof r === "string") {
      var rgba = ColorValidator.colorToRgba(r) || [0, 0, 0, 0];
      var mul = 1.0 / 255;
      rgba[0] *= mul;
      rgba[1] *= mul;
      rgba[2] *= mul;
      rgba[3] *= mul;
      return clampRgba(rgba);
    }
    if(typeof r === "number" &&
     typeof g === "number" && typeof b === "number") {
      return [r, g, b, typeof a !== "number" ? 1.0 : a];
    } else if(r.constructor === Array) {
      return clampRgba([r[0] || 0, r[1] || 0, r[2] || 0,
        typeof r[3] !== "number" ? 1.0 : r[3]]);
    } else {
      return clampRgba(r || [0, 0, 0, 0]);
    }
  };
}(H3DU));

/** @ignore */
H3DU._isIdentityExceptTranslate = function(mat) {
  "use strict";
  return (
    mat[0] === 1 && mat[1] === 0 && mat[2] === 0 && mat[3] === 0 &&
    mat[4] === 0 && mat[5] === 1 && mat[6] === 0 && mat[7] === 0 &&
    mat[8] === 0 && mat[9] === 0 && mat[10] === 1 && mat[11] === 0 &&
    mat[15] === 1
  );
};

/** @ignore */
H3DU._toContext = function(context) {
  "use strict";
  return context && context.getContext ? context.getContext() : context;
};

/** @ignore */
H3DU._isPowerOfTwo = function(a) {
  "use strict";
  if(Math.floor(a) !== a || a <= 0)return false;
  while(a > 1 && (a & 1) === 0) {
    a >>= 1;
  }
  return a === 1;
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU, console */

/**
 * Represents a WebGL shader program. A shader program in
 * WebGL consists of a vertex shader (which processes vertices),
 * and a fragment shader (which processes pixels). Shader programs
 * are specially designed for running on a graphics processing unit,
 * or GPU.<p>
 * When the H3DU.ShaderProgram constructor is called, it will compile
 * and link a shader program from the source text passed to it, but
 * it won't use that program until the use() method is called. If the
 * program is compiled and linked successfully, the constructor
 * will also gather a list of the program's attributes (vertex-specific variables
 * in vertex buffer objects) and uniforms (variables not specific to a vertex).<p>
 * If compiling or linking the shader program fails, a diagnostic
 * log is output to the JavaScript console.
 * @class
 * @memberof H3DU
 * @deprecated This class is likely to become a private class.
 * Use the {@link H3DU.ShaderInfo} class instead, which is not coupled to WebGL
 * contexts.
 * @param {WebGLRenderingContext|WebGL2RenderingContext|object} context
 * A WebGL context to associate with this scene, or an object, such as {@link H3DU.Scene3D}, that
 * implements a no-argument <code>getContext</code> method
 * that returns a WebGL context.
 * @param {String} [vertexShader] Source text of a vertex shader, in OpenGL
 * ES Shading Language (GLSL). If null, a default
 * vertex shader is used instead.
 * @param {String} [fragmentShader] Source text of a fragment shader in GLSL.
 * If null, a default fragment shader is used instead.
 */
H3DU.ShaderProgram = function(context, vertexShader, fragmentShader) {
  "use strict";
  this._init(context, new H3DU.ShaderInfo(vertexShader, fragmentShader));
};
/** @ignore */
H3DU.ShaderProgram._fromShaderInfo = function(context, shader) {
  "use strict";
  var ret = new H3DU.ShaderProgram(null);
  ret._init(context, shader);
  return ret;
};
/** @ignore */
H3DU.ShaderProgram.prototype._init = function(context, shaderInfo) {
  "use strict";
  if(!context)return;
  context = context.getContext ? context.getContext() : context;
  this.CURRENT_PROGRAM = 35725;
  this.FLOAT = 5126;
  this.shaderInfo = shaderInfo;
  this.context = context;
  this.prog = H3DU.ShaderProgram._compileShaders(context,
   shaderInfo.vertexShader,
   shaderInfo.fragmentShader);
  this.uniformValues = {};
  this.actives = {};
  this.attributes = [];
  this.uniformTypes = {};
  this.savedUniforms = {};
  this.attributeNames = [];
  this.attributeSemantics = {};
  var keys = Object.keys(shaderInfo.attributeSemantics);
  for(var i = 0; i < keys.length; i++) {
    this.attributeSemantics[keys[i]] = shaderInfo.attributeSemantics[keys[i]].slice(0, 2);
  }
  this.uniformSemantics = {};
  keys = Object.keys(shaderInfo.uniformSemantics);
  for(i = 0; i < keys.length; i++) {
    this.uniformSemantics[keys[i]] = shaderInfo.uniformSemantics[keys[i]];
  }
  H3DU.ShaderInfo._setUniformsInternal(this.shaderInfo.uniformValues,
    this.uniformValues, this.savedUniforms);
  if(typeof this.prog !== "undefined" && this.prog !== null) {
    var name = null;
    var ret = {};
    var count = context.getProgramParameter(this.prog, context.ACTIVE_ATTRIBUTES);
    for (i = 0; i < count; ++i) {
      var attributeInfo = context.getActiveAttrib(this.prog, i);
      if(typeof attributeInfo !== "undefined" && attributeInfo !== null) {
        name = attributeInfo.name;
        var attr = context.getAttribLocation(this.prog, name);
        if(attr >= 0) {
          this.attributes.push(attr);
          ret[name] = attr;
          this.attributeNames.push([name, attr]);
        }
      }
    }
    count = context.getProgramParameter(this.prog, context.ACTIVE_UNIFORMS);
    for (i = 0; i < count; ++i) {
      var uniformInfo = this.context.getActiveUniform(this.prog, i);
      if(typeof uniformInfo !== "undefined" && uniformInfo !== null) {
        name = uniformInfo.name;
        ret[name] = this.context.getUniformLocation(this.prog, name);
        this.uniformTypes[name] = uniformInfo.type;
      }
    }
    this.actives = ret;
  }
};
/** @ignore */
H3DU.ShaderProgram.prototype._addNamesWithSemantic = function(array, sem, index) {
  "use strict";
  for(var key in this.attributeSemantics) {
    if(Object.prototype.hasOwnProperty.call(this.attributeSemantics, key)) {
      var v = this.attributeSemantics[key];
      if(v[0] === sem && v[1] === index) {
        array.push(key);
      }
    }
  }
};
/** @ignore */
H3DU.ShaderProgram.prototype._disableOthers = function(names) {
  "use strict";
  var a = {};
  for(var i = 0; i < names.length; i++) {
    a[names[i]] = true;
  }
  for(i = 0; i < this.attributeNames.length; i++) {
    var name = this.attributeNames[i];
    if(!a[name[0]]) {
      this.context.disableVertexAttribArray(name[1]);
    }
  }
};
/** Disposes resources from this shader program.
 * @returns {void} This method doesn't return a value.
 * @instance
 */
H3DU.ShaderProgram.prototype.dispose = function() {
  "use strict";
  if(this.program) {
    this.context.deleteProgram(this.program);
  }
  this.context = null;
  this.program = null;
  this.actives = {};
  this.attributes = {};
  this.uniformTypes = {};
  this.attributeSemantics = {};
};
/** @ignore */
H3DU.ShaderProgram.prototype.setSemantic = function(name, sem, index) {
  "use strict";
  var an = this.attributeSemantics[name];
  var semIndex = H3DU.MeshBuffer._resolveSemantic(name, index);
  if(an) {
    an[0] = semIndex[0];
    an[1] = semIndex[1];
  } else {
    this.attributeSemantics[name] = semIndex;
  }
  return null;
};

/**
 * Gets the WebGL context associated with this shader program object.
 * @returns {WebGLRenderingContext|WebGL2RenderingContext} Return value.
 * @instance
 */
H3DU.ShaderProgram.prototype.getContext = function() {
  "use strict";
  return this.context;
};
/** @ignore */
H3DU.ShaderProgram.prototype._setUniformInternal = function(uniforms, i) {
  "use strict";
  var uniform = this.get(i);
  if(typeof uniform === "undefined" || uniform === null)return;
  var uv = uniforms[i];
  if(uv instanceof H3DU.TextureInfo) {
    // NOTE: TextureInfo not supported for ShaderPrograms
    return;
  }
  if(typeof uv === "number") {
    if(this.uniformTypes[i] === this.FLOAT) {
      this.context.uniform1f(uniform, uv);
    } else {
      this.context.uniform1i(uniform, uv);
    }
  } else if(uv.length === 3) {
    this.context.uniform3fv(uniform, uv);
  } else if(uv.length === 2) {
    this.context.uniform2fv(uniform, uv);
  } else if(uv.length === 4) {
    this.context.uniform4fv(uniform, uv);
  } else if(uv.length === 16) {
    this.context.uniformMatrix4fv(uniform, false, uv);
  } else if(uv.length === 9) {
    this.context.uniformMatrix3fv(uniform, false, uv);
  }
};

/**
 * Gets the location of the given uniform or attribute's name in this program.
 * (Although the location may change each time the shader program
 * is linked, that normally only happens upon construction
 * in the case of H3DU.ShaderInfo.)
 * @param {String} name The name of an attribute or uniform defined in either the
 * vertex or fragment shader of this shader program. If the uniform or attribute
 * is an array, each element in the array is named as in these examples:
 * "unif[0]", "unif[1]". If it's a struct, each member in the struct is named as in these examples:
 * "unif.member1", "unif.member2". If it's an array of struct, each
 * member is named as in these examples: "unif[0].member1",
 * "unif[0].member2".
 * @returns {number|WebGLUniformLocation|null} The location of the uniform or attribute
 * name, or null if it doesn't exist.
 * @instance
 */
H3DU.ShaderProgram.prototype.get = function(name) {
  "use strict";
  var ret = this.actives[name];
  return typeof ret === "undefined" || ret === null ? null : ret;
};
/**
 * Gets the value of the given uniform in this program. This method
 * may be called at any time, even if this program is not currently the
 * active program in the WebGL context.
 * @param {String} name The name of a uniform defined in either the
 * vertex or fragment shader of this shader program. See get().
 * @returns {Number|Array<Number>} The uniform's value, or null if it doesn't exist or if
 * an attribute is named, not a uniform.
 * @instance
 */
H3DU.ShaderProgram.prototype.getUniform = function(name) {
  "use strict";
  var loc = typeof name === "string" ? this.get(name) : name;
 // If "loc" is a number that means it's an attribute, not a uniform;
 // we expect WebGLUniformLocation
  if(loc === null || typeof loc === "number")return null;
 // using a cache since context.getUniform can be slow with
 // repeated calls
  var uv = this.uniformValues[name];
  if(typeof uv === "undefined" || uv === null) {
    return this.context.getUniform(this.program, loc);
  } else {
    return uv instanceof Array ? uv.slice(0, uv.length) : uv;
  }
};

/** @ignore */
H3DU.ShaderProgram.prototype._setSavedUniforms = function() {
  "use strict";
  var i;
  var uniformsLength = 0;
  var keys = Object.keys(this.savedUniforms);
  uniformsLength = keys.length;
  for(var ki = 0; ki < uniformsLength; ki++) {
    i = keys[ki];
    this._setUniformInternal(this.savedUniforms, i);
  }
  return uniformsLength;
};
/**
 * Makes this program the active program in the WebGL
 * context associated with it. If any uniforms were saved to
 * be written later (because this program wasn't active in
 * the WebGL context when the "setUniforms" method
 * was called), sets their values now.
 * @returns {H3DU.ShaderProgram} This object.
 * @instance
 */
H3DU.ShaderProgram.prototype.use = function() {
  "use strict";
  this.context.useProgram(this.prog);
  if(this._setSavedUniforms() > 0) {
    this.savedUniforms = {};
  }
  return this;
};
/** @ignore */
H3DU.ShaderProgram.prototype._update = function() {
  "use strict";
  H3DU.ShaderInfo._setUniformsInternal(this.shaderInfo.uniformValues,
   this.uniformValues, this.savedUniforms);
  return this;
};
/**
 * Sets the values of one or more uniforms in this program.
 * If this program is not the active program in the WebGL context,
 * saves their values until the next time this object's "use" method is called.
 * @param {Object} uniforms An object whose keys are the names of uniforms
 * defined in either the
 * vertex or fragment shader of this shader program. If the uniform
 * is an array, each element in the array is named as in these examples:
 * "unif[0]", "unif[1]". If it's a struct, each member in the struct is named as in these examples:
 * "unif.member1", "unif.member2". If it's an array of struct, each
 * member is named as in these examples: "unif[0].member1",
 * "unif[0].member2". The value of each key depends on the data type
 * expected for the uniform named by that key. The value can be a 3-, 4-,
 * 9-, or 16-element array if the uniform is a "vec3", "vec4", "mat3", or "mat4",
 * respectively, or a Number if the uniform is a "float" or "int".
 * @returns {H3DU.ShaderProgram} This object.
 * @instance
 */
H3DU.ShaderProgram.prototype.setUniforms = function(uniforms) {
  "use strict";

  H3DU.ShaderInfo._setUniformsInternal(uniforms, this.uniformValues,
   this.savedUniforms);
  if(this.context.getParameter(
         this.CURRENT_PROGRAM) === this.prog) {
    if(this._setSavedUniforms() > 0) {
      this.savedUniforms = {};
    }
  }
  return this;
};

/** @ignore */
H3DU.ShaderProgram._compileShaders = function(context, vertexShader, fragmentShader) {
  "use strict";
  function compileShader(context, kind, text) {
    var shader = context.createShader(kind);
    context.shaderSource(shader, text);
    context.compileShader(shader);
    if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
      if(!text)text = "";
      var lines = text.split("\n");
      // add line numbers
      for(var i = 0; i < lines.length; i++) {
        lines[i] = "/* " + (i + 1) + " */   " + lines[i];
      }
      console.log(lines.join("\n"));
      console.log((kind === context.VERTEX_SHADER ? "vertex: " : "fragment: ") +
        context.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }
  var vs = !vertexShader || vertexShader.length === 0 ? null :
    compileShader(context, context.VERTEX_SHADER, vertexShader);
  var fs = !fragmentShader || fragmentShader.length === 0 ? null :
    compileShader(context, context.FRAGMENT_SHADER, fragmentShader);
  var program = null;
  if(typeof vs !== "undefined" && vs !== null && (typeof fs !== "undefined" && fs !== null)) {
    program = context.createProgram();
    context.attachShader(program, vs);
    context.attachShader(program, fs);
    context.linkProgram(program);
    if (!context.getProgramParameter(program, context.LINK_STATUS)) {
      console.log("link: " + context.getProgramInfoLog(program));
      context.deleteProgram(program);
      program = null;
    }
    context.detachShader(program, vs);
    context.detachShader(program, fs);
  }
  if(typeof vs !== "undefined" && vs !== null)context.deleteShader(vs);
  if(typeof fs !== "undefined" && fs !== null)context.deleteShader(fs);
  return program;
};

/**
 * Generates source code for a fragment shader for applying
 * a raster effect to a texture.
 * @deprecated Use {@link H3DU.ShaderInfo.makeEffectFragment} instead.
 * @param {String} functionCode See H3DU.ShaderProgram.makeEffect().
 * @returns {String} The source text of the resulting fragment shader.
 */
H3DU.ShaderProgram.makeEffectFragment = function(functionCode) {
  "use strict";
  return H3DU.ShaderInfo.makeEffectFragment(functionCode);
};
/**
 * Generates a shader program that copies the colors of a texture.
 * @deprecated Use {@link H3DU.ShaderInfo.makeCopyEffect} instead.
 * @returns {H3DU.ShaderInfo} The resulting shader program.
 */
H3DU.ShaderProgram.makeCopyEffect = function() {
  "use strict";
  return H3DU.ShaderInfo.makeCopyEffect();
};

/**
 * Generates a shader program for applying
 * a raster effect (postprocessing effect) to a texture.
 * @deprecated Use {@link H3DU.ShaderInfo.makeEffect} instead.
 * @param {Object} context No longer used; ignored.
 * @param {String} functionCode A string giving shader code
 * in OpenGL ES Shading Language (GLSL) that must contain
 * a function with the following signature:
 * <pre>
 * vec4 textureEffect(sampler2D sampler, vec2 uvCoord, vec2 textureSize)
 * </pre>
 * where <code>sampler</code> is the texture sampler, <code>uvCoord</code>
 * is the texture coordinates ranging from 0 to 1 in each component,
 * <code>textureSize</code> is the dimensions of the texture in pixels,
 * and the return value is the new color at the given texture coordinates. Besides
 * this requirement, the shader code is also free to define additional uniforms,
 * constants, functions, and so on (but not another "main" function).
 * @returns {H3DU.ShaderInfo} The resulting shader program.
 */
H3DU.ShaderProgram.makeEffect = function(context, functionCode) {
  "use strict";
  return H3DU.ShaderInfo.makeEffect(functionCode);
};
/**
 * Generates a shader program that inverts the colors of a texture.
 * @deprecated Use {@link H3DU.ShaderInfo.makeInvertEffect} instead.
 * @param {Object} [context] No longer used; ignored.
 * @returns {H3DU.ShaderInfo} The resulting shader program.
 */
H3DU.ShaderProgram.getInvertEffect = function() {
  "use strict";
  return H3DU.ShaderInfo.makeInvertEffect();
};
/**
 * Generates a shader program that generates a two-color texture showing
 * the source texture's edges.
 * @deprecated Use {@link H3DU.ShaderInfo.makeEdgeDetectEffect} instead.
 * @param {Object} [context] No longer used; ignored.
 * @returns {H3DU.ShaderInfo} The resulting shader program.
 */
H3DU.ShaderProgram.getEdgeDetectEffect = function() {
  "use strict";
// Adapted by Peter O. from David C. Bishop's EdgeDetect.frag,
// in the public domain
  return H3DU.ShaderInfo.makeEdgeDetectEffect();
};

/**
 * Gets the text of the default vertex shader.  Putting "#define SHADING\n"
 * at the start of the return value enables the lighting model.
 * @deprecated Use {@link H3DU.ShaderInfo.getDefaultVertex} instead.
 * @returns {String} The resulting shader text.
 */
H3DU.ShaderProgram.getDefaultVertex = function() {
  "use strict";
  return H3DU.ShaderInfo.getDefaultVertex();
};

/**
 * Gets the text of the default fragment shader.  Putting "#define SHADING\n"
 * at the start of the return value enables the lighting model.
 * Putting "#define SPECULAR\n"
 * at the start of the return value enables specular highlights (as long
 * as SHADING is also enabled).
 * @deprecated Use {@link H3DU.ShaderInfo.getDefaultFragment} instead.
 * @returns {String} The resulting shader text.
 */
H3DU.ShaderProgram.getDefaultFragment = function() {
  "use strict";
  return H3DU.ShaderInfo.getDefaultFragment();
};
/* global H3DU */
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/

/**
 * Specifies information about a texture, which can serve as image data applied to
 * the surface of a shape, or even a 2-dimensional array of pixels
 * used for some other purpose, such as a depth map, a height map,
 * a bump map, a specular map, and so on.<p>
 * By default, texture coordinates go from (0,0) at the lower left corner
 * to (1,1) at the upper right corner (because the "topDown" property is false
 * by default).<p>
 * For best results, any textures to be used in WebGL should have
 * width and height each equal to a power of 2, such as 2, 4, 8, 16,
 * and 32.
 * @class
 * @memberof H3DU
 * @param {Object} [params] An object as described in {@link H3DU.TextureInfo.setParams}.
 */
H3DU.TextureInfo = function(params) {
  "use strict";
  this.uri = "";
  this.topDown = false;
  this.format = 6408;
  this.internalFormat = 6408;
  this.target = 3553;
  this.type = 5121;
  this.magFilter = 9729;
  this.minFilter = 9987; // NOTE: Different from glTF default of 9986
  this.wrapS = 10497;
  this.wrapT = 10497;
  this.setParams(params);
};

/**
 * Copies the parameters from another texture information object to this
 * object.
 * @param {H3DU.TextureInfo} [other] Texture information object to copy.
 * @returns {H3DU.TextureInfo} This object.
 * @instance
 */
H3DU.TextureInfo.prototype.copyFrom = function(other) {
  "use strict";
  if(typeof other !== "undefined" && other !== null) {
    this.uri = typeof other.uri === "undefined" || other.uri === null ? "" : other.uri;
    this.format = typeof other.format === "undefined" || other.format === null ? 6408 : other.format;
    this.internalFormat = typeof other.internalFormat === "undefined" || other.internalFormat === null ? 6408 : other.internalFormat;
    this.target = typeof other.target === "undefined" || other.target === null ? 3553 : other.target;
    this.type = typeof other.type === "undefined" || other.type === null ? 5121 : other.type;
    this.magFilter = typeof other.magFilter === "undefined" || other.magFilter === null ? 9729 : other.magFilter;
    this.minFilter = typeof other.minFilter === "undefined" || other.minFilter === null ? 9986 : other.minFilter;
    this.wrapS = typeof other.wrapS === "undefined" || other.wrapS === null ? 10497 : other.wrapS;
    this.wrapT = typeof other.wrapT === "undefined" || other.wrapT === null ? 10497 : other.wrapT;
    this.topDown = typeof other.topDown === "undefined" || other.topDown === null ? 10497 : other.topDown;
  }
  return this;
};

/**
 * Sets parameters for this texture information object.
 * @param {Object} params An object whose keys have
 * the possibilities given below, and whose values are those
 * allowed for each key.<ul>
 * <li><code>uri</code> - URI (Internet address) of the texture's data.
 * <li><code>format</code> - Specifies the kind of data stored in each pixel of the texture.
 * Can be 6406, 6407, 6408 (RGBA), 6409, 6410.
 * <li><code>internalFormat</code> - Specifies the format of the texture.  Can be one of the values for "format".
 * <li><code>target</code> - Specifies the texture target. Can be 3553 (TEXTURE_2D).
 * <li><code>type</code> - Specifies the data type used to encode each pixel component in the texture. Can be 5121, 33635, 32819, 32820.
 * <li><code>magFilter</code> - Specifies the filter to use when enlarging the texture. Can be 9728 (NEAREST) or 9729 (LINEAR).
 * <li><code>minFilter</code> -  Specifies the filter to use when shrinking the texture.  Can be one of the values for "magFilter" or 9984, 9985, 9986 (NEAREST_MIPMAP_LINEAR), 9987.
 * <li><code>wrapS</code> - Specifies the wrapping mode in the S (horizontal) axis. Can be 10497 (REPEAT), 33071, 33648.
 * <li><code>wrapT</code> -Specifies the wrapping mode in the T (horizontal) axis.  Can be one of the values for "wrapS".
 * <li><code>topDown</code> - If true, the image's data will be stored starting from the top row and proceeding downwards.
 * </ul>
 * Any or all of these keys can exist in the parameters object. If a value is null or undefined, it is ignored
 * unless otherwise noted.
 * @returns {H3DU.TextureInfo} This object.
 * @instance
 */
H3DU.TextureInfo.prototype.setParams = function(params) {
  "use strict";
  if(typeof params !== "undefined" && params !== null) {
    if(typeof params.uri !== "undefined" && params.uri !== null) {
      this.uri = params.uri;
    }
    if(typeof params.format !== "undefined" && params.format !== null) {
      this.format = params.format;
    }
    if(typeof params.internalFormat !== "undefined" && params.internalFormat !== null) {
      this.internalFormat = params.internalFormat;
    }
    if(typeof params.target !== "undefined" && params.target !== null) {
      this.target = params.target;
    }
    if(typeof params.type !== "undefined" && params.type !== null) {
      this.type = params.type;
    }
    if(typeof params.magFilter !== "undefined" && params.magFilter !== null) {
      this.magFilter = params.magFilter;
    }
    if(typeof params.minFilter !== "undefined" && params.minFilter !== null) {
      this.minFilter = params.minFilter;
    }
    if(typeof params.wrapS !== "undefined" && params.wrapS !== null) {
      this.wrapS = params.wrapS;
    }
    if(typeof params.wrapT !== "undefined" && params.wrapT !== null) {
      this.wrapT = params.wrapT;
    }
    if(typeof params.topDown !== "undefined" && params.topDown !== null) {
      this.topDown = params.topDown;
    }
  }
  return this;
};
/** @ignore */
H3DU.TextureInfo._texInfoOrString = function(tex) {
  "use strict";
  return typeof tex === "string" ? new H3DU.TextureInfo({"uri":tex}) : tex;
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU */
/**
 * A class offering a convenient way to set a transformation
 * from one coordinate system to another.
 * @class
 * @memberof H3DU
 */
H3DU.Transform = function() {
  "use strict";
  /** @ignore */
  this.scale = [1, 1, 1];
  /** @ignore */
  this.position = [0, 0, 0];
  /** @ignore */
  this.rotation = H3DU.Math.quatIdentity();
  /** @ignore */
  this.complexMatrix = false;
  /** @ignore */
  this._matrixDirty = false;
  /** @ignore */
  this._isIdentity = true;
  /** @ignore */
  this.matrix = H3DU.Math.mat4identity();
};
  /**
   * Returns a copy of a three-element array giving the scaling for an object's width,
   * height, and depth, respectively.
   * For each component, 1 means no scaling.
   * @returns {Array<Number>} Return value.
   * @instance
   */
H3DU.Transform.prototype.getScale = function() {
  "use strict";
  if(this.complexMatrix) {
    return [this.matrix[0], this.matrix[5], this.matrix[10]];
  } else {
    return this.scale.slice(0, 3);
  }
};
  /**
   * Returns a copy of a three-element array giving the X, Y, and Z coordinates of the position
   * of an object relative to its original position.
   * @returns {Array<Number>} Return value.
   * @instance
   */
H3DU.Transform.prototype.getPosition = function() {
  "use strict";
  if(this.complexMatrix) {
    return [this.matrix[12], this.matrix[13], this.matrix[14]];
  } else {
    return this.position.slice(0, 3);
  }
};
  /**
   * Returns a copy of the rotation of an object in the form of a [quaternion]{@tutorial glmath}.
   * @returns {Array<Number>} Return value.
   * @instance
   */
H3DU.Transform.prototype.getQuaternion = function() {
  "use strict";
  if(this.complexMatrix) {
    return H3DU.Math.quatNormalizeInPlace(
    H3DU.Math.quatFromMat4(this.matrix));
  } else {
    return this.rotation.slice(0, 4);
  }
};
/**
 * Resets this transform to the untransformed state.
 * @returns {H3DU.Shape} This object.
 * @instance
 */
H3DU.Transform.prototype.reset = function() {
  "use strict";
  this.matrix = H3DU.Math.mat4identity();
  this.position = [0, 0, 0];
  this.scale = [1, 1, 1];
  this.rotation = H3DU.Math.quatIdentity();
  this.complexMatrix = false;
  this._matrixDirty = false;
  this._isIdentity = true;
  return this;
};
/**
 * Sets this transform's transformation matrix. This method
 * will set the position, rotation, and scale properties
 * accordingly to the matrix given.
 * @param {Array<Number>} value A 4x4 matrix.
 * This method will copy the value of this parameter.
 * @returns {H3DU.Transform} This object.
 * @instance
 */
H3DU.Transform.prototype.setMatrix = function(value) {
  "use strict";
  this._matrixDirty = false;
  this.complexMatrix = true;
  this.matrix = value.slice(0, 16);
  this.position = [this.matrix[12], this.matrix[13], this.matrix[14]];
  this.rotation = H3DU.Math.quatFromMat4(this.matrix);
  this.rotation = H3DU.Math.quatNormalizeInPlace(this.rotation);
  this.scale = [this.matrix[0], this.matrix[5], this.matrix[10]];
  this._isIdentity =
    value[0] === 1 && value[1] === 0 && value[2] === 0 && value[3] === 0 &&
    value[4] === 0 && value[5] === 1 && value[6] === 0 && value[7] === 0 &&
    value[8] === 0 && value[9] === 0 && value[10] === 1 && value[11] === 0 &&
    value[12] === 0 && value[13] === 0 && value[14] === 0 && value[15] === 1
 ;
  return this;
};
/**
 * Returns whether this transform is the identity transform.
 * @returns {Boolean} Return value.
 * @instance
 */
H3DU.Transform.prototype.isIdentity = function() {
  "use strict";
  if(this._matrixDirty) {
    if(this.complexMatrix) {
      this.getMatrix();
    } else {
      return this.position[0] === 0 && this.position[1] === 0 &&
    this.position[2] === 0 && this.scale[0] === 1 &&
    this.scale[1] === 1 && this.scale[2] === 1 &&
    H3DU.Math.quatIsIdentity(this.rotation);
    }
  }
  return this._isIdentity;
};
/**
 * Resets this transform to the untransformed state.
 * @deprecated Use the "reset" method instead.
 * @returns {H3DU.Transform} This object.
 * @instance
 */
H3DU.Transform.prototype.resetTransform = function() {
  "use strict";
  return this.reset();
};
/**
 * Sets the scale of an object relative to its original
 * size. Has no effect if a matrix was defined with {@link H3DU.Transform#setMatrix}
 * and the transform wasn't reset yet with {@link H3DU.Transform#resetTransform}.
 * @param {number|Array<Number>} x Scaling factor for this transform's width.
 *   If "y" and "z" are null or omitted, this is instead
 * a 3-element array giving the scaling factors
 * for width, height, and depth, respectively, or a single number
 * giving the scaling factor for all three dimensions.
 * @param {Number} y Scaling factor for this transform's height.
 * @param {Number} z Scaling factor for this transform's depth.
 * @returns {H3DU.Transform} This object.
 * @instance
 */
H3DU.Transform.prototype.setScale = function(x, y, z) {
  "use strict";
  if(this.complexMatrix)return this;
  if(typeof x !== "undefined" && x !== null && (typeof y === "undefined" || y === null) && (typeof z === "undefined" || z === null)) {
    if(typeof x !== "number")
      this.scale = [x[0], x[1], x[2]];
    else
    this.scale = [x, x, x];
  } else {
    this.scale = [x, y, z];
  }
  this._isIdentity = this._isIdentity &&
   this.scale[0] === 1 &&
   this.scale[1] === 1 &&
   this.scale[2] === 1;
  this._matrixDirty = true;
  return this;
};
/**
 * Sets the relative position of an object from its original
 * position. Has no effect if a matrix was defined with {@link H3DU.Transform#setMatrix}
 * and the transform wasn't reset yet with {@link H3DU.Transform#resetTransform}.
 * @param {Array<Number>|number} x The X coordinate.
 *   If "y" and "z" are null or omitted, this is instead
 * a 3-element array giving the X, Y, and Z coordinates, or a single number
 * giving the coordinate for all three dimensions.
 * @param {Number} y The Y coordinate.
 * If "x" is an array, this parameter may be omitted.
 * @param {Number} z The Z coordinate.
 * If "x" is an array, this parameter may be omitted.
 * @returns {H3DU.Transform} This object.
 * @instance
 */
H3DU.Transform.prototype.setPosition = function(x, y, z) {
  "use strict";
  if(this.complexMatrix)return this;
  if(typeof x !== "undefined" && x !== null && (typeof y === "undefined" || y === null) && (typeof z === "undefined" || z === null)) {
    if(typeof x !== "number")
      this.position = [x[0], x[1], x[2]];
    else
    this.position = [x, x, x];
  } else {
    this.position = [x, y, z];
  }
  this._isIdentity = this._isIdentity &&
   this.position[0] === 0 &&
   this.position[1] === 0 &&
   this.position[2] === 0;
  this._matrixDirty = true;
  return this;
};

/**
 * Moves the relative position of an object from its original
 * position. Has no effect if a matrix was defined with {@link H3DU.Transform#setMatrix}
 * and the transform wasn't reset yet with {@link H3DU.Transform#resetTransform}.
 * @param {Array<Number>|number} x Number to add to the X coordinate,
 *   If "y" and "z" are null or omitted, this is instead
 * a 3-element array giving the numbers to add to the X, Y, and Z coordinates, or a single number
 * to add to all three coordinates.
 * @param {Number} y Number to add to the Y coordinate.
 * If "x" is an array, this parameter may be omitted.
 * @param {Number} z Number to add to the Z coordinate.
 * If "x" is an array, this parameter may be omitted.
 * @returns {H3DU.Transform} This object.
 * @instance
 */
H3DU.Transform.prototype.movePosition = function(x, y, z) {
  "use strict";
  if(this.complexMatrix)return this;
  if(typeof x !== "undefined" && x !== null && (typeof y === "undefined" || y === null) && (typeof z === "undefined" || z === null)) {
    if(typeof x !== "number") {
      this.position[0] += x[0];
      this.position[1] += x[1];
      this.position[2] += x[2];
    } else {
      this.position[0] += x;
      this.position[1] += x;
      this.position[2] += x;
    }
  } else {
    this.position[0] += x;
    this.position[1] += y;
    this.position[2] += z;
  }
  this._isIdentity = this._isIdentity &&
   this.position[0] === 0 &&
   this.position[1] === 0 &&
   this.position[2] === 0;
  this._matrixDirty = true;
  return this;
};
/**
 * Sets this transform's rotation in the form of a [quaternion]{@tutorial glmath} (a 4-element array
 * for describing 3D rotations). Has no effect if a matrix was defined with {@link H3DU.Transform#setMatrix}
 * and the transform wasn't reset yet with {@link H3DU.Transform#resetTransform}.
 * @param {Array<Number>} quat A four-element array describing the rotation.
 * A quaternion is returned from the methods {@link H3DU.Math.quatFromAxisAngle}
 * and {@link H3DU.Math.quatFromTaitBryan}, among others.
 * @returns {H3DU.Transform} This object.
 * @example
 * // Set an object's rotation to 30 degrees about the X axis
 * transform.setQuaternion(H3DU.Math.quatFromAxisAngle(20,1,0,0));
 * // Set an object's rotation to identity (the object isn't transformed)
 * transform.setQuaternion(H3DU.Math.quatIdentity());
 * // Set an object's rotation to 30 degree pitch multiplied
 * // by 40 degree roll
 * transform.setQuaternion(H3DU.Math.quatFromTaitBryan(30,0,40));
 * @instance
 */
H3DU.Transform.prototype.setQuaternion = function(quat) {
  "use strict";
  if(this.complexMatrix)return this;
  this.rotation = quat.slice(0, 4);
  H3DU.Math.quatNormalizeInPlace(this.rotation);
  this._matrixDirty = true;
  return this;
};
/**
 * Sets this transform's rotation in the form of an angle and an axis of
 * rotation. Has no effect if a matrix was defined with {@link H3DU.Transform#setMatrix}
 * and the transform wasn't reset yet with {@link H3DU.Transform#resetTransform}.
 * @param {Array<Number>|number} angle The desired angle
 * to rotate in degrees.  If "v", "vy", and "vz" are omitted, this can
 * instead be a 4-element array giving the axis
 * of rotation as the first three elements, followed by the angle
 * in degrees as the fourth element. If the axis of rotation
 * points toward the viewer, a positive value means the angle runs in
 * a counterclockwise direction for right-handed coordinate systems and
 * in a clockwise direction for left-handed systems.
 * @param {Array<Number>|number} v X-component of the point lying on the axis
 * of rotation.  If "vy" and "vz" are omitted, this can
 * instead be a 3-element array giving the axis
 * of rotation in x, y, and z, respectively.
 * @param {Number} vy Y-component of the point lying on the axis
 * of rotation.
 * @param {Number} vz Z-component of the point lying on the axis
 * of rotation.
 * @returns {H3DU.Transform} This object.
 * @instance
 */
H3DU.Transform.prototype.setRotation = function(angle, v, vy, vz) {
  "use strict";
  return this.setQuaternion(H3DU.Math.quatFromAxisAngle(angle, v, vy, vz));
};
/**
 * Sets this transform's rotation in the form of an angle and an axis of
 * rotation. Has no effect if a matrix was defined with {@link H3DU.Transform#setMatrix}
 * and the transform wasn't reset yet with {@link H3DU.Transform#resetTransform}.
 * @deprecated Use {@link H3DU.Transform#setRotation} instead.
 * This method's name is inaccurate because orientations are not rotations.
 * @param {Array<Number>|number} angle The desired angle
 * to rotate in degrees.  If "v", "vy", and "vz" are omitted, this can
 * instead be a 4-element array giving the axis
 * of rotation as the first three elements, followed by the angle
 * in degrees as the fourth element. If the axis of rotation
 * points toward the viewer, a positive value means the angle runs in
 * a counterclockwise direction for right-handed coordinate systems and
 * in a clockwise direction for left-handed systems.
 * @param {Array<Number>|number} v X-component of the point lying on the axis
 * of rotation.  If "vy" and "vz" are omitted, this can
 * instead be a 3-element array giving the axis
 * of rotation in x, y, and z, respectively.
 * @param {Number} vy Y-component of the point lying on the axis
 * of rotation.
 * @param {Number} vz Z-component of the point lying on the axis
 * of rotation.
 * @returns {H3DU.Transform} This object.
 * @instance
 */
H3DU.Transform.prototype.setOrientation = function(angle, v, vy, vz) {
  "use strict";
  return this.setQuaternion(H3DU.Math.quatFromAxisAngle(angle, v, vy, vz));
};
/**
 * Combines an object's current rotation with another rotation
 * described by a [quaternion]{@tutorial glmath} (a 4-element array
 * for describing 3D rotations). The combined rotation will have the
 * same effect as the new rotation followed by the existing rotation.
 * Has no effect if a matrix was defined with {@link H3DU.Transform#setMatrix}
 * and the transform wasn't reset yet with {@link H3DU.Transform#resetTransform}.
 * @param {Array<Number>} quat A four-element array describing the rotation.
 * A quaternion is returned from the methods {@link H3DU.Math.quatFromAxisAngle}
 * or {@link H3DU.Math.quatFromTaitBryan}.
 * @returns {H3DU.Transform} This object.
 * @example
 * // Combine an object's rotation with a rotation 20 degrees about the X axis
 * transform.multQuaternion(H3DU.Math.quatFromAxisAngle(20,1,0,0));
 * // Combine an object's rotation with identity
 * transform.multQuaternion(H3DU.Math.quatIdentity());
 * // Combine an object's rotation with 30 degree pitch multiplied
 * // by 40 degree roll
 * transform.multQuaternion(H3DU.Math.quatFromTaitBryan(30,0,40));
 * @instance
 */
H3DU.Transform.prototype.multQuaternion = function(quat) {
  "use strict";
  if(this.complexMatrix)return this;
  this.rotation = H3DU.Math.quatNormalizeInPlace(
   H3DU.Math.quatMultiply(this.rotation, quat));
  this._matrixDirty = true;
  return this;
};
/**
 * Combines an object's current rotation with another rotation
 * in the form of an angle and an axis of
 * rotation. The combined rotation will have the
 * same effect as the new rotation followed by the existing rotation.
 * Has no effect if a matrix was defined with {@link H3DU.Transform#setMatrix}
 * and the transform wasn't reset yet with {@link H3DU.Transform#resetTransform}.
 * @param {Array<Number>|number} angle The desired angle
 * to rotate in degrees. See {@link H3DU.Transform#setRotation}.
 * @param {Array<Number>|number} v X-component of the point lying on the axis
 * of rotation.  If "vy" and "vz" are omitted, this can
 * instead be a 3-element array giving the axis
 * of rotation in x, y, and z, respectively.
 * @param {Number} vy Y-component of the point lying on the axis
 * of rotation.
 * @param {Number} vz Z-component of the point lying on the axis
 * of rotation.
 * @returns {H3DU.Transform} This object.
 * @instance
 */
H3DU.Transform.prototype.multRotation = function(angle, v, vy, vz) {
  "use strict";
  return this.multQuaternion(H3DU.Math.quatFromAxisAngle(angle, v, vy, vz));
};
/**
 * Combines an object's current rotation with another rotation
 * in the form of an angle and an axis of
 * rotation. The combined rotation will have the
 * same effect as the new rotation followed by the existing rotation.
 * Has no effect if a matrix was defined with {@link H3DU.Transform#setMatrix}
 * and the transform wasn't reset yet with {@link H3DU.Transform#resetTransform}.
 * @deprecated Use {@link H3DU.Transform#multRotation} instead.
 * This method's name is inaccurate because orientations are not rotations.
 * @param {Array<Number>|number} angle The desired angle
 * to rotate in degrees. See {@link H3DU.Transform#setRotation}.
 * @param {Array<Number>|number} v X-component of the point lying on the axis
 * of rotation.  If "vy" and "vz" are omitted, this can
 * instead be a 3-element array giving the axis
 * of rotation in x, y, and z, respectively.
 * @param {Number} vy Y-component of the point lying on the axis
 * of rotation.
 * @param {Number} vz Z-component of the point lying on the axis
 * of rotation.
 * @returns {H3DU.Transform} This object.
 * @instance
 */
H3DU.Transform.prototype.multOrientation = function(angle, v, vy, vz) {
  "use strict";
  return this.multQuaternion(H3DU.Math.quatFromAxisAngle(angle, v, vy, vz));
};
/**
 * Gets the transformation matrix used by an object. Depending
 * on the state of this transform, will return either:<ul>
 * <li>The 4x4 matrix passed to {@link H3DU.Transform#setMatrix}, if the
 * matrix was defined with that method
 * and the transform wasn't reset yet with {@link H3DU.Transform#resetTransform}.
 * <li>The matrix resulting from the position, rotation, and scale properties,
 * multiplied in that order, otherwise.
 * </ul>
 * @returns {Array<Number>} Return value.
 * @instance
 */
H3DU.Transform.prototype.getMatrix = function() {
  "use strict";
  if(this._matrixDirty) {
    this._matrixDirty = false;
    if(H3DU.Math.quatIsIdentity(this.rotation)) {
      this.matrix = [this.scale[0], 0, 0, 0, 0,
        this.scale[1], 0, 0, 0, 0,
        this.scale[2], 0,
        this.position[0],
        this.position[1],
        this.position[2], 1];
      this._isIdentity = this.position[0] === 0 && this.position[1] === 0 &&
     this.position[2] === 0 && this.scale[0] === 1 &&
     this.scale[1] === 1 && this.scale[2] === 1;
    } else {
    // for best results, multiply in this order:
    // 1. translation
      this.matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0,
        this.position[0],
        this.position[1],
        this.position[2], 1];
    // 2. rotation
      this.matrix = H3DU.Math.mat4multiply(this.matrix,
      H3DU.Math.quatToMat4(this.rotation));
    // 3. scaling
      H3DU.Math.mat4scaleInPlace(this.matrix, this.scale);
      var m = this.matrix;
      this._isIdentity =
     m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 0 &&
     m[4] === 0 && m[5] === 1 && m[6] === 0 && m[7] === 0 &&
     m[8] === 0 && m[9] === 0 && m[10] === 1 && m[11] === 0 &&
     m[12] === 0 && m[13] === 0 && m[14] === 0 && m[15] === 1
    ;
    }
  } else if(this._isIdentity) {
    return H3DU.Math.mat4identity();
  }
  return this.matrix.slice(0, 16);
};

/**
 * Makes a copy of this transform. The copied object
 * will have its own version of the rotation, scale,
 * position, and matrix data.
 * @returns {H3DU.Transform} A copy of this transform.
 * @instance
 */
H3DU.Transform.prototype.copy = function() {
  "use strict";
  var ret = new H3DU.Transform();
  ret.scale = this.scale.slice(0, this.scale.length);
  ret.position = this.position.slice(0, this.scale.length);
  ret.complexMatrix = this.complexMatrix;
  ret._matrixDirty = this._matrixDirty;
  ret.matrix = this.matrix.slice(0, this.matrix.length);
  return ret;
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU */
/**
 * Contains methods that create meshes
 * of various geometric shapes.<p>
 * Note that wherever a method in this class describes how texture
 * coordinates are generated, it is assumed that the coordinate (0,0)
 * is at the lower-left corner of the texture and (1,1) is at the upper-right
 * corner.
 * @class
 * @memberof H3DU
 */
H3DU.Meshes = {};

/**
 * Creates a mesh of a box (rectangular prism), which
 * will be centered at the origin.
 * See the "{@tutorial shapes}" tutorial.
 * Will create texture coordinates such that the same texture
 * is used on each face of the box.
 * @param {Number} xSize Width of the box.
 * @param {Number} ySize Height of the box.
 * @param {Number} zSize Depth of the box.
 * @param {Boolean} [inward] If true, the normals generated by this
 * method will point inward; otherwise, outward. Should normally be false
 * unless the box will be viewed from the inside.
 * @returns {H3DU.Mesh} The generated mesh.
 */
H3DU.Meshes.createBox = function(xSize, ySize, zSize, inward) {
 // Position X, Y, Z, normal NX, NY, NZ, texture U, V
  "use strict";
  xSize *= 0.5;
  ySize *= 0.5;
  zSize *= 0.5;
  var vertices = [
    -xSize, -ySize, zSize, -1.0, 0.0, 0.0, 1.0, 0.0,
    -xSize, ySize, zSize, -1.0, 0.0, 0.0, 1.0, 1.0,
    -xSize, ySize, -zSize, -1.0, 0.0, 0.0, 0.0, 1.0,
    -xSize, -ySize, -zSize, -1.0, 0.0, 0.0, 0.0, 0.0,
    xSize, -ySize, -zSize, 1.0, 0.0, 0.0, 1.0, 0.0,
    xSize, ySize, -zSize, 1.0, 0.0, 0.0, 1.0, 1.0,
    xSize, ySize, zSize, 1.0, 0.0, 0.0, 0.0, 1.0,
    xSize, -ySize, zSize, 1.0, 0.0, 0.0, 0.0, 0.0,
    xSize, -ySize, -zSize, 0.0, -1.0, 0.0, 1.0, 0.0,
    xSize, -ySize, zSize, 0.0, -1.0, 0.0, 1.0, 1.0,
    -xSize, -ySize, zSize, 0.0, -1.0, 0.0, 0.0, 1.0,
    -xSize, -ySize, -zSize, 0.0, -1.0, 0.0, 0.0, 0.0,
    xSize, ySize, zSize, 0.0, 1.0, 0.0, 1.0, 0.0,
    xSize, ySize, -zSize, 0.0, 1.0, 0.0, 1.0, 1.0,
    -xSize, ySize, -zSize, 0.0, 1.0, 0.0, 0.0, 1.0,
    -xSize, ySize, zSize, 0.0, 1.0, 0.0, 0.0, 0.0,
    -xSize, -ySize, -zSize, 0.0, 0.0, -1.0, 1.0, 0.0,
    -xSize, ySize, -zSize, 0.0, 0.0, -1.0, 1.0, 1.0,
    xSize, ySize, -zSize, 0.0, 0.0, -1.0, 0.0, 1.0,
    xSize, -ySize, -zSize, 0.0, 0.0, -1.0, 0.0, 0.0,
    xSize, -ySize, zSize, 0.0, 0.0, 1.0, 1.0, 0.0,
    xSize, ySize, zSize, 0.0, 0.0, 1.0, 1.0, 1.0,
    -xSize, ySize, zSize, 0.0, 0.0, 1.0, 0.0, 1.0,
    -xSize, -ySize, zSize, 0.0, 0.0, 1.0, 0.0, 0.0];
  if(inward) {
    for(var i = 0; i < vertices.length; i += 8) {
      vertices[i + 3] = -vertices[i + 3];
      vertices[i + 4] = -vertices[i + 4];
      vertices[i + 5] = -vertices[i + 5];
    }
  }
  var faces = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12,
    13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23];
  return new H3DU.Mesh(vertices, faces, H3DU.Mesh.NORMALS_BIT | H3DU.Mesh.TEXCOORDS_BIT);
};

/**
 * Creates a mesh of a cylinder. The cylinder's base will
 * be centered at the origin and its height will run along the
 * positive Z axis. The base and top themselves will not be
 * included in the mesh.<p>
 * Texture coordinates for the cylinder (other than the base) will
 * be generated such that the V (vertical)
 * coordinates start from the bottom of the texture and increase from the origin
 * to the positive Z axis, and the U (horizontal) coordinates start from the left of the
 * texture and increase from the positive X to positive Y to negative X to negative
 * Y to positive X axis.<p>
 * The X, Y, and Z coordinates of a point on the cylinder are
 * <code>(R*cos(&lambda;+&pi;), R*sin(&lambda;+&pi;), H*&phi;)</code>,
 * where &phi; = <code>(&pi;/2 + L)/&pi;</code>, L is the latitude in radians,
 * &lambda; is the longitude in radians, H = <code>height</code>,
 * R = <code>baseRad + (topRad - baseRad) * &phi;</code>,
 * and west and south latitudes and
 * longitudes are negative. (The formula for converting latitude
 * and longitude is mentioned here because their meaning depends on
 * exactly how the texture coordinates are generated on the cylinder.
 * It assumes that in the texture, longitudes range from -180&deg; to 0&deg; to 180&deg; from
 * left to right, and latitudes range from 90&deg; to 0&deg; to -90&deg; from top to bottom.)<p>
 * See the "{@tutorial shapes}" tutorial.
 * @param {Number} baseRad Radius of the base of the cylinder. If 0,
 * this function will create an approximation to a downward pointing cone.
 * @param {Number} topRad Radius of the top of the cylinder. If 0,
 * this function will create an approximation to an upward pointing cone.
 * @param {Number} height Height of the cylinder.
 * @param {Number} [slices] Number of lengthwise "slices" the cylinder consists
 * of, each slice going through the center of the cylinder. This function will
 * create a triangular prism if "slices" is 3
 * and both radiuses are the same; a triangular pyramid if "slices" is
 * 3 and either radius is zero; a rectangular prism if "slices" is 4
 * and both radiuses are the same; and a rectangular pyramid if "slices"
 * is 4 and either radius is zero. Must be 3 or greater.
 * May be null or omitted, in which case the default is 32.
 * @param {Number} [stacks] Number of vertical stacks the cylinder consists of.
 * May be null or omitted, in which case the default is 1.
 * @param {Boolean} [flat] If true, will generate normals such that the
 * cylinder will be flat shaded; otherwise, will generate normals such that the
 * cylinder will be smooth shaded.
 * @param {Boolean} [inside] If true, the normals generated by this
 * method will point inward; otherwise, outward. Should normally be false
 * unless the cylinder will be viewed from the inside.
 * @returns {H3DU.Mesh} The generated mesh.
 */
H3DU.Meshes.createCylinder = function(baseRad, topRad, height, slices, stacks, flat, inside) {
  "use strict";
  var mesh = new H3DU.Mesh();
  if(typeof slices === "undefined" || slices === null)slices = 32;
  if(typeof stacks === "undefined" || stacks === null)stacks = 1;
  if(slices <= 2)throw new Error("too few slices");
  if(stacks < 1)throw new Error("too few stacks");
  if(height < 0)throw new Error("negative height");
  if(baseRad <= 0 && topRad <= 0 || height === 0) {
  // both baseRad and topRad are zero or negative,
  // or height is zero
    return mesh;
  }
  var normDir = inside ? -1 : 1;
  var sc = [];
  var tc = [];
  var angleStep = H3DU.Math.PiTimes2 / slices;
  var cosStep = Math.cos(angleStep);
  var sinStep = angleStep <= 3.141592653589793 ? Math.sqrt(1.0 - cosStep * cosStep) : -Math.sqrt(1.0 - cosStep * cosStep);
  var sangle = 1.0; // sin(90.0deg)
  var cangle = 0; // cos(90.0deg)
  for(var i = 0; i < slices; i++) {
    var t = i * 1.0 / slices;
    sc.push(sangle, cangle);
    tc.push(t);
    var tsin = cosStep * sangle + sinStep * cangle;
    var tcos = cosStep * cangle - sinStep * sangle;
    cangle = tcos;
    sangle = tsin;
  }
  sc.push(sc[0], sc[1]);
  tc.push(1);
  var slicesTimes2 = slices * 2;
  if(height > 0) {
    var lastZ = 0;
    var lastRad = baseRad;
    var sinSlopeNorm, cosSlopeNorm;
    if(baseRad === topRad) {
      sinSlopeNorm = 0;
      cosSlopeNorm = normDir;
    } else {
      var dy = baseRad - topRad;
      var dx = height;
      var len = Math.sqrt(dx * dx + dy * dy);
     // Convert to a unit vector
      if(len !== 0) {
        var ilen = 1.0 / len;
        dy *= ilen;
        dx *= ilen;
      }
      cosSlopeNorm = dx * normDir;
      sinSlopeNorm = dy * normDir;
    }
    var recipstacks = 1.0 / stacks;
    for(i = 0; i < stacks; i++) {
      var zStart = lastZ;
      var zEnd = i + 1 === stacks ? 1.0 : (i + 1) * recipstacks;
      var zStartHeight = height * zStart;
      var zEndHeight = height * zEnd;
      var radiusStart = lastRad;
      var radiusEnd = baseRad + (topRad - baseRad) * zEnd;
      lastZ = zEnd;
      lastRad = radiusEnd;
      mesh.mode(H3DU.Mesh.TRIANGLE_STRIP);
      mesh.texCoord2(1, zStart);
      mesh.normal3(sc[0] * cosSlopeNorm, sc[1] * cosSlopeNorm, sinSlopeNorm);
      mesh.vertex3(sc[0] * radiusStart, sc[1] * radiusStart, zStartHeight);
      mesh.texCoord2(1, zEnd);
      mesh.normal3(sc[0] * cosSlopeNorm, sc[1] * cosSlopeNorm, sinSlopeNorm);
      mesh.vertex3(sc[0] * radiusEnd, sc[1] * radiusEnd, zEndHeight);
      for(var k = 2, j = 1; k <= slicesTimes2; k += 2, j++) {
        var tx = tc[j];
        var x, y;
        x = sc[k];
        y = sc[k + 1];
        mesh.texCoord2(1 - tx, zStart);
        mesh.normal3(x * cosSlopeNorm, y * cosSlopeNorm, sinSlopeNorm);
        mesh.vertex3(x * radiusStart, y * radiusStart, zStartHeight);
        mesh.texCoord2(1 - tx, zEnd);
        mesh.normal3(x * cosSlopeNorm, y * cosSlopeNorm, sinSlopeNorm);
        mesh.vertex3(x * radiusEnd, y * radiusEnd, zEndHeight);
      }
    }
  }
  return flat ? mesh.recalcNormals(flat, inside) : mesh;
};
/**
 * Creates a mesh of a figure generated by revolving a path of 2-dimensional
 * points about the Z axis.<p>
 * Texture coordinates will
 * be generated such that the V (vertical)
 * coordinates start from the bottom of the texture and increase along the Z axis in the direction
 * of the given path, and the U (horizontal) coordinates start from the left of the
 * texture and increase from the positive X to positive Y to negative X to negative
 * Y to positive X axis.<p>
 * @param {Array<Number>} points Array of alternating X and Z coordinates describing
 * a two-dimensional path that will revolve around the Z axis to generate the figure
 * (the first number is an X coordinate, the second is a Z coordinate, and so on).
 * Each Z coordinate is a Z coordinate of the point where the path lies, and
 * each X coordinate is the radius of the figure at that point. The Z coordinates
 * should be given in increasing order and should not be the same from
 * one point to the next. This parameter's
 * length must be 4 or greater and be an even number.
 * @param {Number} [slices] Number of lengthwise "slices" the figure consists of.
 * Must be 3 or greater. May be null or omitted; default is 32.
 * @param {Boolean} [flat] If true, will generate normals such that the
 * figure will be flat shaded; otherwise, will generate normals such that the
 * figure will be smooth shaded.
 * @param {Boolean} [inside] If true, the normals generated by this
 * method will point inward; otherwise, outward. Should normally be false
 * unless the figure will be viewed from the inside.
 * @returns {H3DU.Mesh} The generated mesh.
 */
H3DU.Meshes.createLathe = function(points, slices, flat, inside) {
  "use strict";
 // NOTE: Y coordinate should not be the same from one point to the next
  var mesh = new H3DU.Mesh();
  if(points.length < 4)throw new Error("too few points");
  if(typeof slices === "undefined" || slices === null)slices = 32;
  if(slices <= 2)throw new Error("too few slices");
  if(points.length % 1 !== 0)throw new Error("points array length is not an even number");
  var i;
  for(i = 0; i < points.length; i += 2) {
    if(points[i << 1] < 0)throw new Error("point's x is less than 0");
  }
  var sc = [];
  var tc = [];
  var angleStep = H3DU.Math.PiTimes2 / slices;
  var cosStep = Math.cos(angleStep);
  var sinStep = angleStep <= 3.141592653589793 ? Math.sqrt(1.0 - cosStep * cosStep) : -Math.sqrt(1.0 - cosStep * cosStep);
  var sangle = 1.0; // sin(90.0deg)
  var cangle = 0; // cos(90.0deg)
  for(i = 0; i < slices; i++) {
    var t = i * 1.0 / slices;
    sc.push(sangle, cangle);
    tc.push(t);
    var tsin = cosStep * sangle + sinStep * cangle;
    var tcos = cosStep * cangle - sinStep * sangle;
    cangle = tcos;
    sangle = tsin;

  }
  sc.push(sc[0], sc[1]);
  tc.push(1);
  var slicesTimes2 = slices * 2;
  var lastZ = 0;
  var stacks = points.length / 2 - 1;
  var recipstacks = 1.0 / stacks;
  for(i = 0; i < stacks; i++) {
    var zStart = lastZ;
    var zEnd = i + 1 === stacks ? 1.0 : (i + 1) * recipstacks;
    var index = i << 1;
    var zsh = points[index + 1];
    var zeh = points[index + 3];
    var zStartHeight = Math.min(zsh, zeh);
    var zEndHeight = Math.max(zsh, zeh);
    var radiusStart = points[index];
    var radiusEnd = points[index + 2];
    lastZ = zEnd;
    mesh.mode(H3DU.Mesh.TRIANGLE_STRIP);
    mesh.texCoord2(1, zStart);
    mesh.vertex3(sc[0] * radiusStart, sc[1] * radiusStart, zStartHeight);
    mesh.texCoord2(1, zEnd);
    mesh.vertex3(sc[0] * radiusStart, sc[1] * radiusEnd, zEndHeight);
    for(var k = 2, j = 1; k <= slicesTimes2; k += 2, j++) {
      var tx = tc[j];
      var x, y;
      x = sc[k];
      y = sc[k + 1];
      mesh.texCoord2(1 - tx, zStart);
      mesh.vertex3(x * radiusStart, y * radiusStart, zStartHeight);
      mesh.texCoord2(1 - tx, zEnd);
      mesh.vertex3(x * radiusEnd, y * radiusEnd, zEndHeight);
    }
  }
  return mesh.recalcNormals(flat, inside);
};

/**
 * Creates a mesh of a closed cylinder. The cylinder's base will
 * be centered at the origin and its height will run along the
 * positive Z axis. The base and top will be included in the mesh if
 * their radius is greater than 0. Will generate texture coordinates for
 * the cylinder and for the base and top.
 * The base's and top's texture coordinates will be such that the
 * texture will be flat as seen from either.<p>
 * See {@link H3DU.Meshes.createCylinder} for information on how texture
 * coordinates for the cylinder (other than the base and top) are generated and how
 * to find the coordinates of a particular point on the cylinder.<p>
 * See the "{@tutorial shapes}" tutorial.
 * @param {Number} baseRad Radius of the base of the cylinder.
 * See {@link H3DU.Meshes.createCylinder}.
 * @param {Number} topRad Radius of the top of the cylinder.
 * See {@link H3DU.Meshes.createCylinder}.
 * @param {Number} height Height of the cylinder.
 * @param {Number} slices  Number of lengthwise "slices" the cylinder consists
 * of. See {@link H3DU.Meshes.createCylinder}.
 * @param {Number} stacks Number of vertical stacks the cylinder consists of.
 * May be null or omitted, in which case the default is 1.
 * @param {Boolean} [flat] If true, will generate normals such that the
 * cylinder will be flat shaded; otherwise, will generate normals such that the
 * cylinder will be smooth shaded.
 * @param {Boolean} [inside] If true, the normals generated by this
 * method will point inward; otherwise, outward. Should normally be false
 * unless the cylinder will be viewed from the inside.
 * @returns {H3DU.Mesh} The generated mesh.
 */
H3DU.Meshes.createClosedCylinder = function(baseRad, topRad, height, slices, stacks, flat, inside) {
  "use strict";
  var cylinder = H3DU.Meshes.createCylinder(baseRad, topRad, height, slices, stacks, flat, inside);
  var base = H3DU.Meshes.createDisk(0, baseRad, slices, 2, !inside).reverseWinding();
  var top = H3DU.Meshes.createDisk(0, topRad, slices, 2, inside);
 // move the top disk to the top of the cylinder
  top.transform(H3DU.Math.mat4translated(0, 0, height));
 // merge the base and the top
  return cylinder.merge(base).merge(top);
};

/**
 * Creates a mesh of a 2D disk.
 * Assuming the Y axis points up, the X axis right,
 * and the Z axis toward the viewer, the first vertex in the outer edge
 * of the 2D disk will be at the 12 o'clock position.
 * Will also generate texture coordinates.
 * See the "{@tutorial shapes}" tutorial.
 * @param {Number} inner Radius of the hole in the middle of the
 * disk. If 0, no hole is created and the method will generate a regular
 * polygon with n sides, where n is the value of "slices". For example,
 * if "inner" is 0 and "slices" is 3, the result will be an equilateral triangle;
 * a square for 4 "slices", a regular pentagon for 5 "slices", and so on.
 * @param {Number} outer Outer radius of the disk.
 * @param {Number} [slices] Number of slices going around the disk.
 * May be null or omitted; default is 16.
 * @param {Number} [loops] Number of concentric rings the disk makes up.
 * May be null or omitted; default is 1.
 * @param {Boolean} [inward] If true, the normals generated by this
 * method will point in the opposite direction of the positive Z axis; otherwise,
 * in the same direction of the positive Z axis. Default is false.
 * @returns {H3DU.Mesh} The generated mesh.
 */
H3DU.Meshes.createDisk = function(inner, outer, slices, loops, inward) {
  "use strict";
  return H3DU.Meshes.createPartialDisk(inner, outer, slices, loops, 0, 360, inward);
};

/**
 * Creates a mesh of a 2D disk or an arc of a 2D disk.
 * Will also generate texture coordinates.
 * See the "{@tutorial shapes}" tutorial.
 * @param {Number} inner Radius of the hole where the middle of the
 * complete disk would be. If 0, no hole is created.
 * @param {Number} outer Outer radius of the disk.
 * @param {Number} [slices] Number of slices going around the partial disk.
 * May be null or omitted; default is 32.
 * @param {Number} [loops] Number of concentric rings the partial disk makes up.
 * May be null or omitted; default is 1.
 * @param {Number} [start] Starting angle of the partial disk, in degrees.
 * May be null or omitted; default is 0.
 * 0 degrees is at the positive Y axis,
 * and 90 degrees at the positive X axis.
 * Assuming the Y axis points up, the X axis right,
 * and the Z axis toward the viewer, 0 degrees is at the 12 o'clock position,
 * and 90 degrees at the 3 o'clock position.
 * @param {Number} [sweep] Arc length of the partial disk, in degrees.
 * May be null or omitted; default is 360. May be negative.
 * @param {Boolean} [inward] If true, the normals generated by this
 * method will point in the opposite direction of the positive Z axis; otherwise,
 * in the same direction of the positive Z axis. Default is false.
 * @returns {H3DU.Mesh} The generated mesh.
 */
H3DU.Meshes.createPartialDisk = function(inner, outer, slices, loops, start, sweep, inward) {
  "use strict";
  var mesh = new H3DU.Mesh();
  if(typeof slices === "undefined" || slices === null)slices = 32;
  if(typeof loops === "undefined" || loops === null)loops = 1;
  if(typeof start === "undefined" || start === null)start = 0;
  if(typeof sweep === "undefined" || sweep === null)sweep = 360;
  if(slices <= 2)throw new Error("too few slices");
  if(loops < 1)throw new Error("too few loops");
  if(inner > outer)throw new Error("inner greater than outer");
  if(inner < 0)inner = 0;
  if(outer < 0)outer = 0;
  if(outer === 0 || sweep === 0)return mesh;
  var fullCircle = sweep === 360 && start === 0;
  var sweepDir = sweep < 0 ? -1 : 1;
  if(sweep < 0)sweep = -sweep;
  sweep %= 360;
  if(sweep === 0)sweep = 360;
  var sc = [];
  var tc = [];
  var i;
  var twopi = H3DU.Math.PiTimes2;
  var arcLength = sweep === 360 ? twopi : sweep * H3DU.Math.PiDividedBy180;
  start *= H3DU.Math.PiDividedBy180;
  if(sweepDir < 0) {
    arcLength = -arcLength;
  }
  var angleStep = arcLength / slices;
  var cosStep = Math.cos(angleStep);
  var sinStep = angleStep >= 0 && angleStep < 6.283185307179586 ? angleStep <= 3.141592653589793 ? Math.sqrt(1.0 - cosStep * cosStep) : -Math.sqrt(1.0 - cosStep * cosStep) : Math.sin(angleStep);
  var cangle = Math.cos(start);
  var sangle = start >= 0 && start < 6.283185307179586 ? start <= 3.141592653589793 ? Math.sqrt(1.0 - cangle * cangle) : -Math.sqrt(1.0 - cangle * cangle) : Math.sin(start);
  var cstart = cangle;
  var sstart = sangle;
  for(i = 0; i <= slices; i++) {
    if(i === slices && arcLength === twopi) {
      sc.push(sstart, cstart);
    } else {
      sc.push(sangle, cangle);
    }
    var t = i * 1.0 / slices;
    tc.push(t);
    var tsin = cosStep * sangle + sinStep * cangle;
    var tcos = cosStep * cangle - sinStep * sangle;
    cangle = tcos;
    sangle = tsin;
  }
  if(fullCircle) {
    sc[0] = 0;
    sc[1] = 1;
    sc[sc.length - 1] = 1;
    sc[sc.length - 2] = 0;
    tc[0] = 0;
    tc[tc.length - 1] = 1;
  }
  var slicesTimes2 = slices * 2;
  var height = outer - inner;

  var lastRad = inner;
  if(inward) {
    mesh.normal3(0, 0, -1);
  } else {
    mesh.normal3(0, 0, 1);
  }
  for(i = 0; i < loops; i++) {
    var zEnd = (i + 1) / loops;
    var radiusStart = lastRad;
    var radiusEnd = inner + height * zEnd;
    var rso = radiusStart / outer;
    var reo = radiusEnd / outer;
    lastRad = radiusEnd;
    var triangleFanBase = i === 0 && inner === 0;
    mesh.mode(triangleFanBase ?
     H3DU.Mesh.TRIANGLE_FAN : H3DU.Mesh.TRIANGLE_STRIP);
    var x, y, j, k;
    if(triangleFanBase) {
      var jStart = slicesTimes2 / 2;
      for(k = slicesTimes2, j = jStart; k >= 0; k -= 2, j--) {
        x = sc[k];
        y = sc[k + 1];
        if(k === slicesTimes2) {
          mesh.texCoord2((1 + x * rso) * 0.5, (1 + y * rso) * 0.5);
          mesh.vertex3(x * radiusStart, y * radiusStart, 0);
        }
        mesh.texCoord2((1 + x * reo) * 0.5, (1 + y * reo) * 0.5);
        mesh.vertex3(x * radiusEnd, y * radiusEnd, 0);
      }
    } else {
      for(k = 0, j = 0; k <= slicesTimes2; k += 2, j++) {
        x = sc[k];
        y = sc[k + 1];
        mesh.texCoord2((1 + x * reo) * 0.5, (1 + y * reo) * 0.5);
        mesh.vertex3(x * radiusEnd, y * radiusEnd, 0);
        mesh.texCoord2((1 + x * rso) * 0.5, (1 + y * rso) * 0.5);
        mesh.vertex3(x * radiusStart, y * radiusStart, 0);
      }
    }
  }
  return mesh;
};

/**
 * Creates a mesh of a torus (donut), centered at the origin.
 * Will also generate texture coordinates.
 * See the "{@tutorial shapes}" tutorial.
 * @param {Number} inner Inner radius (thickness) of the torus.
 * @param {Number} outer Outer radius of the torus (distance from the
 * center to the innermost part of the torus).
 * @param {Number} [lengthwise] Number of lengthwise subdivisions.
 * May be null or omitted; default is 16.
 * @param {Number} [crosswise] Number of crosswise subdivisions.
 * May be null or omitted; default is 16.
 * @param {Boolean} [flat] If true, will generate normals such that the
 * torus will be flat shaded; otherwise, will generate normals such that it
 * will be smooth shaded.
 * @param {Boolean} [inward] If true, the normals generated by this
 * method will point inward; otherwise, outward. Default is false.
 * @returns {H3DU.Mesh} The generated mesh.
 */
H3DU.Meshes.createTorus = function(inner, outer, lengthwise, crosswise, flat, inward) {
  "use strict";
  var mesh = new H3DU.Mesh();
  if(typeof crosswise === "undefined" || crosswise === null)crosswise = 16;
  if(typeof lengthwise === "undefined" || lengthwise === null)lengthwise = 16;
  if(crosswise < 3)throw new Error("crosswise is less than 3");
  if(lengthwise < 3)throw new Error("lengthwise is less than 3");
  if(inner < 0 || outer < 0)throw new Error("inner or outer is less than 0");
  if(outer === 0)return mesh;
  if(inner === 0)return mesh;
  var tubeRadius = inner;
  var circleRad = outer;
  var sci = [];
  var scj = [];
  var cangle, sangle, u;
  var angleStep = H3DU.Math.PiTimes2 / crosswise;
  var cosStep = Math.cos(angleStep);
  var sinStep = angleStep >= 0 && angleStep < 6.283185307179586 ? angleStep <= 3.141592653589793 ? Math.sqrt(1.0 - cosStep * cosStep) : -Math.sqrt(1.0 - cosStep * cosStep) : Math.sin(angleStep);
  sangle = 0.0; // sin(0.0deg)
  cangle = 1.0; // cos(0.0deg)
  for(var i = 0; i < crosswise; i++) {
    sci.push(sangle, cangle);
    var ts = cosStep * sangle + sinStep * cangle;
    var tc = cosStep * cangle - sinStep * sangle;
    cangle = tc;
    sangle = ts;
  }
  sci.push(sci[0]);
  sci.push(sci[1]);
  angleStep = H3DU.Math.PiTimes2 / lengthwise;
  cosStep = Math.cos(angleStep);
  sinStep = angleStep >= 0 && angleStep < 6.283185307179586 ? angleStep <= 3.141592653589793 ? Math.sqrt(1.0 - cosStep * cosStep) : -Math.sqrt(1.0 - cosStep * cosStep) : Math.sin(angleStep);
  sangle = 0.0; // sin(0.0deg)
  cangle = 1.0; // cos(0.0deg)
  for(i = 0; i < lengthwise; i++) {
    scj.push(sangle, cangle);
    ts = cosStep * sangle + sinStep * cangle;
    tc = cosStep * cangle - sinStep * sangle;
    cangle = tc;
    sangle = ts;

  }
  scj.push(scj[0]);
  scj.push(scj[1]);
  for(var j = 0; j < lengthwise; j++) {
    var v0 = j / lengthwise;
    var v1 = (j + 1.0) / lengthwise;
    var sinr0 = scj[j * 2];
    var cosr0 = scj[j * 2 + 1];
    var sinr1 = scj[j * 2 + 2];
    var cosr1 = scj[j * 2 + 3];
    mesh.mode(H3DU.Mesh.TRIANGLE_STRIP);
    for(i = 0; i <= crosswise; i++) {
      u = i / crosswise;
      var sint = sci[i * 2];
      var cost = sci[i * 2 + 1];
      var x = cost * (circleRad + cosr1 * tubeRadius);
      var y = sint * (circleRad + cosr1 * tubeRadius);
      var z = sinr1 * tubeRadius;
      var nx = cosr1 * cost;
      var ny = cosr1 * sint;
      var nz = sinr1;
      mesh.normal3(nx, ny, nz);
      mesh.texCoord2(u, v1);
      mesh.vertex3(x, y, z);
      x = cost * (circleRad + cosr0 * tubeRadius);
      y = sint * (circleRad + cosr0 * tubeRadius);
      z = sinr0 * tubeRadius;
      nx = cosr0 * cost;
      ny = cosr0 * sint;
      nz = sinr0;
      mesh.normal3(nx, ny, nz);
      mesh.texCoord2(u, v0);
      mesh.vertex3(x, y, z);
    }
  }
  return flat ? mesh.recalcNormals(flat, inward) : mesh;
};

/**
 * Creates a mesh of a 2D rectangle, centered at the origin.
 * The plane's Z coordinate will be 0.
 * Will also generate texture coordinates that increase toward
 * the positive X and Y axes. The texture coordinates will range
 * from 0 to 1 on each end of the 2D rectangle.
 * See the "{@tutorial shapes}" tutorial.
 * @param {Number} [width] Width of the rectangle.
 * May be null or omitted; default is 1.
 * @param {Number} [height] Height of the rectangle.
 * May be null or omitted; default is 1.
 * @param {Number} [widthDiv] Number of horizontal subdivisions.
 * May be null or omitted; default is 1.
 * @param {Number} [heightDiv] Number of vertical subdivisions.
 * May be null or omitted; default is 1.
 * @param {Boolean} [inward] If true, the normals generated by this
 * method will point in the opposite direction of the positive Z axis; otherwise,
 * in the same direction of the positive Z axis. Default is false.
 * @returns {H3DU.Mesh} The generated mesh.
 */
H3DU.Meshes.createPlane = function(width, height, widthDiv, heightDiv, inward) {
  "use strict";
  var mesh = new H3DU.Mesh();
  if(typeof width === "undefined" || width === null)width = 1;
  if(typeof height === "undefined" || height === null)height = 1;
  if(typeof widthDiv === "undefined" || widthDiv === null)widthDiv = 1;
  if(typeof heightDiv === "undefined" || heightDiv === null)heightDiv = 1;
  if(width < 0 || height < 0)throw new Error("width or height is less than 0");
  if(heightDiv <= 0 || widthDiv <= 0)
    throw new Error("widthDiv or heightDiv is 0 or less");
  if(width === 0 || height === 0)return mesh;
  var xStart = -width * 0.5;
  var yStart = -height * 0.5;
  if(inward) {
    mesh.normal3(0, 0, -1);
  } else {
    mesh.normal3(0, 0, 1);
  }
  for(var i = 0; i < heightDiv; i++) {
    mesh.mode(H3DU.Mesh.TRIANGLE_STRIP);
    var iStart = i / heightDiv;
    var iNext = (i + 1) / heightDiv;
    var y = yStart + height * iStart;
    var yNext = yStart + height * iNext;
    mesh.texCoord2(0, iNext);
    mesh.vertex3(xStart, yNext, 0);
    mesh.texCoord2(0, iStart);
    mesh.vertex3(xStart, y, 0);
    for(var j = 0; j < widthDiv; j++) {
      var jx = (j + 1) / widthDiv;
      var x = xStart + width * jx;
      mesh.texCoord2(jx, iNext);
      mesh.vertex3(x, yNext, 0);
      mesh.texCoord2(jx, iStart);
      mesh.vertex3(x, y, 0);
    }
  }
  return mesh;
};

/**
 * Creates a mesh of a sphere, centered at the origin.<p>
 * Will also generate texture coordinates such that the V (vertical)
 * coordinates start from the bottom of the texture and increase from the negative
 * to positive Z axis, and the U (horizontal) coordinates start from the left of the
 * texture and increase from the positive X to positive Y to negative X to negative
 * Y to positive X axis.<p>
 * The X, Y, and Z coordinates of a point on the sphere are
 * <code>(R*sin(&phi;)*cos(&lambda;+&pi;), R*sin(&phi;)*sin(&lambda;+&pi;), R*cos(&phi;))</code>,
 * where &phi; = <code>&pi;/2 - L</code>, L is the latitude in radians,
 * &lambda; is the longitude in radians, R is the sphere's radius,
 * and west and south latitudes and
 * longitudes are negative. (The formula for converting latitude
 * and longitude is mentioned here because their meaning depends on
 * exactly how the texture coordinates are generated on the sphere.
 * It assumes that in the texture, longitudes range from -180&deg; to 0&deg; to 180&deg; from
 * left to right, and latitudes range from 90&deg; to 0&deg; to -90&deg; from top to bottom.)<p>
 * See the "{@tutorial shapes}" tutorial.
 * @param {Number} [radius] Radius of the sphere.
 * May be null or omitted, in which case the default is 1.
 * @param {Number} [slices] Number of vertical sections the sphere consists
 * of.  This function will create an octahedron if "slices" is 4 and "stacks" is 2.
 * Must be 3 or greater. May be null or omitted, in which case the default is 16.
 * @param {Number} [stacks] Number of horizontal sections the sphere consists of.
 * May be null or omitted, in which case the default is 16.
 * @param {Boolean} [flat] If true, will generate normals such that the
 * sphere will be flat shaded; otherwise, will generate normals such that the
 * sphere will be smooth shaded.
 * @param {Boolean} [inside] If true, the normals generated by this
 * method will point inward; otherwise, outward. Should normally be false
 * unless the sphere will be viewed from the inside.
 * @returns {H3DU.Mesh} The generated mesh.
 */
H3DU.Meshes.createSphere = function(radius, slices, stacks, flat, inside) {
  "use strict";
  return H3DU.Meshes._createCapsule(radius, 0, slices, stacks, 1, flat, inside);
};

/**
 * Creates a mesh of a capsule, centered at the origin.
 * The length of the capsule will run along the Z axis. (If the capsule
 * has a high length and a very low radius, it will resemble a 3D line
 * with rounded corners.)<p>
 * Will also generate texture coordinates such that the V (vertical)
 * coordinates start from the bottom of the texture and increase from the negative
 * to positive Z axis, and the U (horizontal) coordinates start from the left of the
 * texture and increase from the positive X to positive Y to negative X to negative
 * Y to positive X axis.<p>
 * If the "length" parameter is 0, the X, Y, and Z coordinates of a point on the solid
 * are as described in {@link H3DU.Meshes.createSphere}.
 * See the "{@tutorial shapes}" tutorial.
 * @param {Number} [radius] Radius of each spherical
 * end of the capsule.
 * May be null or omitted, in which case the default is 1.
 * @param {Number} [length] Length of the middle section.
 * May be null or omitted, in which case the default is 1.
 * If this value is 0, an approximation to a sphere will be generated.
 * @param {Number} [slices] Number of vertical sections the capsule consists
 * of.  This function will create an octahedron if "slices" is 4 and "stacks" is 2.
 * Must be 3 or greater. May be null or omitted, in which case the default is 16.
 * @param {Number} [stacks] Number of horizontal sections
 * each spherical half consists of.
 * May be null or omitted, in which case the default is 8.
 * @param {Number} [middleStacks] Number of vertical sections
 * the middle of the capsule consists of.
 * May be null or omitted, in which case the default is 1.
 * @param {Boolean} [flat] If true, will generate normals such that the
 * capsule will be flat shaded; otherwise, will generate normals such that the
 * capsule will be smooth shaded.
 * @param {Boolean} [inside] If true, the normals generated by this
 * method will point inward; otherwise, outward. Should normally be false
 * unless the capsule will be viewed from the inside.
 * @returns {H3DU.Mesh} The generated mesh.
 */
H3DU.Meshes.createCapsule = function(radius, length, slices, stacks, middleStacks, flat, inside) {
  "use strict";
  if(typeof stacks === "undefined" || stacks === null)stacks = 8;
  if(stacks < 1)throw new Error("too few stacks");
  return H3DU.Meshes._createCapsule(radius, length, slices, stacks * 2, middleStacks, flat, inside);
};

/** @ignore */
H3DU.Meshes._createCapsule = function(radius, length, slices, stacks, middleStacks, flat, inside) {
  "use strict";
  var mesh = new H3DU.Mesh();
  if(typeof slices === "undefined" || slices === null)slices = 16;
  if(typeof stacks === "undefined" || stacks === null)stacks = 16;
  if(typeof middleStacks === "undefined" || middleStacks === null)middleStacks = 1;
  if(typeof radius === "undefined" || radius === null)radius = 1;
  if(typeof length === "undefined" || length === null)length = 1;
  if(stacks < 2)throw new Error("too few stacks");
  if(slices <= 2)throw new Error("too few slices");
  if(middleStacks < 1 && length > 0)throw new Error("too few middle stacks");
  if(length < 0)throw new Error("negative length");
  if(radius < 0)throw new Error("negative radius");
  if(radius === 0) {
  // radius is zero
    return mesh;
  }
  var cangle;
  var sangle;
  var halfLength = length * 0.5;
  var halfStacks = stacks / 2;
  var normDir = inside ? -1 : 1;
  var sc = [];
  var scStack = [];
  var verticalTexCoords = [];
  var tc = [];
  var s;
  // Generate longitude and horizontal texture coordinates
  var angleStep = H3DU.Math.PiTimes2 / slices;
  var cosStep = Math.cos(angleStep);
  var sinStep = angleStep >= 0 && angleStep < 6.283185307179586 ? angleStep <= 3.141592653589793 ? Math.sqrt(1.0 - cosStep * cosStep) : -Math.sqrt(1.0 - cosStep * cosStep) : Math.sin(angleStep);
  sangle = 1.0; // sin(90.0deg)
  cangle = 0; // cos(90.0deg)
  for(var i = 0; i < slices; i++) {
    var t = i * 1.0 / slices;
    sc.push(sangle, cangle);
    tc.push(t);
    var tsin = cosStep * sangle + sinStep * cangle;
    var tcos = cosStep * cangle - sinStep * sangle;
    sangle = tsin;
    cangle = tcos;
  }
  sc.push(sc[0], sc[1]);
  tc.push(1);
  var sphereRatio = radius * 2;
  sphereRatio /= sphereRatio + length;
  var zEnd = [];
  // Generate latitude and vertical texture coordinates
  angleStep = Math.PI / stacks;
  cosStep = Math.cos(angleStep);
  sinStep = angleStep >= 0 && angleStep < 6.283185307179586 ? angleStep <= 3.141592653589793 ? Math.sqrt(1.0 - cosStep * cosStep) : -Math.sqrt(1.0 - cosStep * cosStep) : Math.sin(angleStep);
  sangle = sinStep;
  cangle = cosStep;
  for(i = 0; i < stacks; i++) {
    var origt = (i + 1) * 1.0 / stacks;
    scStack.push(sangle);
    zEnd.push(-cangle);
    var tex = origt;
    verticalTexCoords.push(tex);
    var ts = cosStep * sangle + sinStep * cangle;
    tc = cosStep * cangle - sinStep * sangle;
    sangle = ts;
    cangle = tc;
  }
  var slicesTimes2 = slices * 2;
  var lastZeCen = -1;
  var lastRad = 0;

  var lastTex = 0;
  function normAndVertex(m, normDir, x, y, z, offset) {
    m.normal3(x * normDir, y * normDir, z * normDir);
    m.vertex3(x, y, z + offset);
  }
  var startX = sc[0];
  var startY = sc[1];
  for(i = 0; i < stacks; i++) {
    var zsCen = lastZeCen;
    var zeCen = zEnd[i];
    var texStart = lastTex;
    var texEnd = verticalTexCoords[i];
    var zStartHeight = radius * zsCen;
    var zEndHeight = radius * zeCen;
    var offset = i < halfStacks ? -halfLength : halfLength;
    var radiusStart = lastRad;
    var radiusEnd = radius * scStack[i];
    var txs = texStart;
    var txe = texEnd;
    if(length > 0) {
      txs = i < halfStacks ? texStart * sphereRatio :
     1.0 - (1.0 - texStart) * sphereRatio;
      txe = i < halfStacks ? texEnd * sphereRatio :
     1.0 - (1.0 - texEnd) * sphereRatio;
    }
    lastZeCen = zeCen;
    lastTex = texEnd;
    lastRad = radiusEnd;
    if(i === stacks - 1 || i === 0) {
      mesh.mode(H3DU.Mesh.TRIANGLES);
    } else {
      mesh.mode(H3DU.Mesh.TRIANGLE_STRIP);
      mesh.texCoord2(1, txs);
      normAndVertex(mesh, normDir, startX * radiusStart, startY * radiusStart, zStartHeight, offset);
      mesh.texCoord2(1, txe);
      normAndVertex(mesh, normDir, startX * radiusEnd, startY * radiusEnd, zEndHeight, offset);
    }
    var lastTx = 0;
    var lastX = startX;
    var lastY = startY;
    var txMiddle, tx, x, y;
    for(var k = 2, j = 1; k <= slicesTimes2; k += 2, j++) {
      tx = tc[j];
      if(i === stacks - 1) {
        txMiddle = lastTx + (tx - lastTx) * 0.5;
        mesh.texCoord2(1 - lastTx, txs);
        normAndVertex(mesh, normDir, lastX * radiusStart, lastY * radiusStart, zStartHeight, offset);
       // point at south pole
        mesh.texCoord2(1 - txMiddle, txe);
        normAndVertex(mesh, normDir, startX * radiusEnd, startY * radiusEnd, zEndHeight, offset);
        x = sc[k];
        y = sc[k + 1];
        mesh.texCoord2(1 - tx, txs);
        normAndVertex(mesh, normDir, x * radiusStart, y * radiusStart, zStartHeight, offset);
        lastX = x;
        lastY = y;
        lastTx = tx;
      } else if(i === 0) {
        txMiddle = lastTx + (tx - lastTx) * 0.5;
     // point at north pole
        mesh.texCoord2(1 - txMiddle, txs);
        normAndVertex(mesh, normDir, startX * radiusStart, startY * radiusStart, zStartHeight, offset);
        mesh.texCoord2(1 - lastTx, txe);
        normAndVertex(mesh, normDir, lastX * radiusEnd, lastY * radiusEnd, zEndHeight, offset);
        x = sc[k];
        y = sc[k + 1];
        mesh.texCoord2(1 - tx, txe);
        normAndVertex(mesh, normDir, x * radiusEnd, y * radiusEnd, zEndHeight, offset);
        lastX = x;
        lastY = y;
        lastTx = tx;
      } else {
        x = sc[k];
        y = sc[k + 1];
        mesh.texCoord2(1 - tx, txs);
        normAndVertex(mesh, normDir, x * radiusStart, y * radiusStart, zStartHeight, offset);
        mesh.texCoord2(1 - tx, txe);
        normAndVertex(mesh, normDir, x * radiusEnd, y * radiusEnd, zEndHeight, offset);
      }
    }
    if(i + 1 === halfStacks && length > 0) {
      var sr2 = sphereRatio * 0.5;
      var hl = halfLength * 2;
      var endr2 = 1.0 - sr2;
      var he = 1.0 - sphereRatio;
      for(var m = 0; m < middleStacks; m++) {
        s = -halfLength + (m === 0 ? 0 : hl * m / middleStacks);
        var e = m === middleStacks - 1 ? halfLength : -halfLength + hl * (m + 1) / middleStacks;
        txs = sr2 + (m === 0 ? 0 : he * m / middleStacks);
        txe = m === middleStacks - 1 ? endr2 : sr2 + he * (m + 1) / middleStacks;
        mesh.mode(H3DU.Mesh.TRIANGLE_STRIP);
        mesh.texCoord2(1, txs);
        normAndVertex(mesh, normDir, startX * radiusEnd, startY * radiusEnd, zEndHeight, s);
        mesh.texCoord2(1, txe);
        normAndVertex(mesh, normDir, startX * radiusEnd, startY * radiusEnd, zEndHeight, e);
        for(k = 2, j = 1; k <= slicesTimes2; k += 2, j++) {
          tx = tc[j];
          x = sc[k];
          y = sc[k + 1];
          mesh.texCoord2(1 - tx, txs);
          normAndVertex(mesh, normDir, x * radiusEnd, y * radiusEnd, zEndHeight, s);
          mesh.texCoord2(1 - tx, txe);
          normAndVertex(mesh, normDir, x * radiusEnd, y * radiusEnd, zEndHeight, e);
        }
      }
    }
  }
  return flat ? mesh.recalcNormals(flat, inside) : mesh.normalizeNormals();
};

    /**
     * Creates a mesh in the form of a two-dimensional n-pointed star.
     * Will also generate texture coordinates.
     * @param {Number} points Number of points in the star.
     * Must be 2 or greater.
     * @param {Number} firstRadius First radius of the star.
     * Must be 0 or greater; this parameter and secondRadius
     * can't both be 0.
     * @param {Number} secondRadius Second radius of the star.
     * Must be 0 or greater; this parameter and firstRadius
     * can't both be 0.
     * @param {Boolean} [inward] If true, the normals generated by this
     * method will point in the opposite direction of the positive Z axis; otherwise,
     * in the same direction of the positive Z axis. Default is false.
     * @returns {H3DU.Mesh} The generated mesh.
     */
H3DU.Meshes.createPointedStar = function(points, firstRadius, secondRadius, inward) {
  "use strict";
  var mesh = new H3DU.Mesh();
  if(points < 2 || firstRadius < 0 || secondRadius < 0)return mesh;
  if(firstRadius <= 0 && secondRadius <= 0)return mesh;
  mesh.mode(H3DU.Mesh.TRIANGLE_FAN);
  var startX = 0;
  var startY = 0;
  var recipRadius = 1.0 / Math.max(firstRadius, secondRadius);
  mesh.normal3(0, 0, inward ? -1 : 1).texCoord2(0.5, 0.5).vertex2(0, 0);
  var angleStep = H3DU.Math.PiTimes2 / (points * 2);
  var cosStep = Math.cos(angleStep);
  var sinStep = angleStep <= 3.141592653589793 ? Math.sqrt(1.0 - cosStep * cosStep) : -Math.sqrt(1.0 - cosStep * cosStep);
  var sangle = 0.0; // sin(0.0deg)
  var cangle = 1.0; // cos(0.0deg)
  for(var i = 0; i < points * 2; i++) {
    var radius = (i & 1) === 0 ? firstRadius : secondRadius;
    var x = -sangle * radius;
    var y = cangle * radius;
    var tcx = (1 + x * recipRadius) * 0.5;
    var tcy = (1 + y * recipRadius) * 0.5;
    if(i === 0) {
      startX = x;
      startY = y;
    }
    mesh.texCoord2(tcx, tcy)
        .vertex2(x, y);
    var ts = cosStep * sangle + sinStep * cangle;
    var tc = cosStep * cangle - sinStep * sangle;
    sangle = ts;
    cangle = tc;
  }
  mesh.texCoord2(0.5 * (1 + startX * recipRadius),
        0.5 * (1 + startY * recipRadius))
       .vertex2(startX, startY);
  return mesh;
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU, console */
/**
 * An object that holds a rendering context for rendering
 * 3D objects.
 * @class
 * @memberof H3DU
 * @param {WebGLRenderingContext|WebGL2RenderingContext|object} canvasOrContext
 * A WebGL context to associate with this scene, or an HTML
 * canvas element to create a WebGL context from, or an object, such as H3DU.Scene3D, that
 * implements a no-argument <code>getContext</code> method
 * that returns a WebGL context.
 */
H3DU.Scene3D = function(canvasOrContext) {
  "use strict";
  var context = canvasOrContext;
  if(typeof canvasOrContext.getContext === "function") {
  // This might be a canvas, so create a WebGL context.
    if(HTMLCanvasElement && context.constructor === HTMLCanvasElement) {
      context = H3DU.get3DContext(canvasOrContext);
    } else {
      context = H3DU._toContext(context);
    }
  }
  this.context = context;
  this.textureCache = {};
  this._textureLoader = new H3DU.TextureLoader();
  this._meshLoader = new H3DU.BufferedMesh._MeshLoader();
  this._renderedOutsideScene = false;
 /** An array of shapes that are part of the scene.
  * @deprecated Shapes should now be managed in {@link H3DU.Batch3D} objects,
  * rather than through this class.
  */
  this.shapes = [];
  this._errors = false;
  this._frontFace = H3DU.Scene3D.CCW;
  this._cullFace = H3DU.Scene3D.NONE;
  this.clearColor = [0, 0, 0, 1];
  this.fboFilter = null;
 // NOTE: Exists for compatibility only
  this._subScene = new H3DU.Batch3D();
  this._subScene.getLights().setBasic();
  this._programs = new H3DU.Scene3D.ProgramCache();
  this.useDevicePixelRatio = false;
  this._is3d = H3DU.is3DContext(this.context);
  this._pixelRatio = 1;
  this.autoResize = true;
  this.width = Math.ceil(this.context.canvas.clientWidth * 1.0);
  this.height = Math.ceil(this.context.canvas.clientHeight * 1.0);
  this.context.canvas.width = this.width;
  this.context.canvas.height = this.height;
  if(this._is3d) {
    this.context.viewport(0, 0, this.width, this.height);
    this.context.enable(this.context.BLEND);
    this.context.blendFunc(this.context.SRC_ALPHA, this.context.ONE_MINUS_SRC_ALPHA);
    this.context.enable(this.context.DEPTH_TEST);
    this.context.depthFunc(this.context.LEQUAL);
    this.context.disable(this.context.CULL_FACE);
    this.context.clearDepth(1.0);
    this._setClearColor();
    this._setFace();
  }
};
/**
 * Gets the HTML canvas associated with this scene.
 * @instance
 * @returns {Object} Return value.
 */
H3DU.Scene3D.prototype.getCanvas = function() {
  "use strict";
  return this.context ? this.context.canvas : null;
};

/** @ignore */
H3DU.Scene3D.LIGHTING_ENABLED = 1;
/** @ignore */
H3DU.Scene3D.SPECULAR_MAP_ENABLED = 2;
/** @ignore */
H3DU.Scene3D.NORMAL_MAP_ENABLED = 4;
/** @ignore */
H3DU.Scene3D.SPECULAR_ENABLED = 8;
/** @ignore */
H3DU.Scene3D.TEXTURE_ENABLED = 16;
/** @ignore */
H3DU.Scene3D.COLORATTR_ENABLED = 32;
/** @ignore */
H3DU.Scene3D.ROUGHNESS_ENABLED = 1 << 6 | 0;
/** @ignore */
H3DU.Scene3D.ROUGHNESS_MAP_ENABLED = 1 << 7 | 0;
/** @ignore */
H3DU.Scene3D.METALNESS_ENABLED = 1 << 8 | 0;
/** @ignore */
H3DU.Scene3D.METALNESS_MAP_ENABLED = 1 << 9 | 0;
/** @ignore */
H3DU.Scene3D.PHYSICAL_BASED_ENABLED = 1 << 10 | 0;
/** @ignore */
H3DU.Scene3D.INVERT_ROUGHNESS_ENABLED = 1 << 11 | 0;
/** @ignore */
H3DU.Scene3D.ENV_MAP_ENABLED = 1 << 12 | 0;
/** @ignore */
H3DU.Scene3D.ENV_EQUIRECT_ENABLED = 1 << 13 | 0;
/** @ignore */
H3DU.Scene3D.EMISSION_MAP_ENABLED = 1 << 14 | 0;

/** @ignore */
H3DU.Scene3D._flagsForShape = function(shape) {
  "use strict";
  var flags = 0;
  var material = shape.material;
  if(typeof material !== "undefined" && material !== null && material instanceof H3DU.Material) {
    flags |= H3DU.Scene3D.LIGHTING_ENABLED;
    flags |= material.specular[0] !== 0 ||
        material.specular[1] !== 0 ||
        material.specular[2] !== 0 ? H3DU.Scene3D.SPECULAR_ENABLED : 0;
    flags |= material.specularMap ? H3DU.Scene3D.SPECULAR_MAP_ENABLED : 0;
    flags |= material.normalMap ? H3DU.Scene3D.NORMAL_MAP_ENABLED : 0;
    flags |= material.texture ? H3DU.Scene3D.TEXTURE_ENABLED : 0;
    flags |= material.emissionMap ? H3DU.Scene3D.EMISSION_MAP_ENABLED : 0;
  }
  if(typeof material !== "undefined" && material !== null && material instanceof H3DU.PbrMaterial) {
    flags |= H3DU.Scene3D.LIGHTING_ENABLED | H3DU.Scene3D.PHYSICAL_BASED_ENABLED;
    if(material.workflow === H3DU.PbrMaterial.Metallic) {
      flags |= typeof material.metalness === "number" ? H3DU.Scene3D.METALNESS_ENABLED : 0;
      flags |= material.metalnessMap ? H3DU.Scene3D.METALNESS_MAP_ENABLED : 0;
    } else {
      flags |= material.specular ? H3DU.Scene3D.SPECULAR_ENABLED : 0;
      flags |= material.specularMap ? H3DU.Scene3D.SPECULAR_MAP_ENABLED : 0;
    }
    flags |= material.normalMap ? H3DU.Scene3D.NORMAL_MAP_ENABLED : 0;
    flags |= material.emissionMap ? H3DU.Scene3D.EMISSION_MAP_ENABLED : 0;
    flags |= material.albedoMap ? H3DU.Scene3D.TEXTURE_ENABLED : 0;
    flags |= material.invertRoughness === true ? H3DU.Scene3D.INVERT_ROUGHNESS_ENABLED : 0;
    flags |= typeof material.roughness === "number" ? H3DU.Scene3D.ROUGHNESS_ENABLED : 0;
    flags |= material.roughnessMap ? H3DU.Scene3D.ROUGHNESS_MAP_ENABLED : 0;
    if(typeof material.environmentMap !== "undefined" && material.environmentMap !== null) {
      if(material.environmentMap instanceof H3DU.CubeMap) {
        flags |= H3DU.Scene3D.ENV_MAP_ENABLED;
      } else {
        flags |= H3DU.Scene3D.ENV_EQUIRECT_ENABLED;
      }
    }
  }
  var buffer = shape.getMeshBuffer();
  if(buffer && !!buffer._getAttribute(H3DU.Semantic.COLOR)) {
    flags |= H3DU.Scene3D.COLORATTR_ENABLED;
  }
  return flags;
};
/** @ignore */
H3DU.Scene3D.ProgramCache = function() {
  "use strict";
  this._programs = [];
  this._customPrograms = [];
};
H3DU.Scene3D.ProgramCache.prototype.dispose = function() {
  "use strict";
  var i, p;
  for(i = 0; i < this._customPrograms.length; i++) {
    p = this._customPrograms[i];
    p[2].dispose();
  }
  for(i = 0; i < this._programs.length; i++) {
    p = this._programs[i];
    if(p)p.dispose();
  }
  this._customPrograms = [];
  this._programs = [];
};
/** @ignore */
H3DU.Scene3D.ProgramCache.prototype.getCustomProgram = function(info, context) {
  "use strict";
  if(!context)throw new Error();
  if(!H3DU.is3DContext(context))return null;
  if(info instanceof H3DU.ShaderProgram) {
  // NOTE: Using H3DU.ShaderProgram objects in materials is deprecated
    return info;
  }
  for(var i = 0; i < this._customPrograms.length; i++) {
    var p = this._customPrograms[i];
    if(p[0] === info && p[1] === context) {
      p[2]._update();
      return p[2];
    }
  }
  var prog = H3DU.ShaderProgram._fromShaderInfo(context, info);
  this._customPrograms.push([info, context, prog]);
  return prog;
};
/** @ignore */
H3DU.Scene3D.ProgramCache.prototype.getProgram = function(flags, context) {
  "use strict";
  if(!context)throw new Error();
  if(!H3DU.is3DContext(context))return null;
  var pf = this._programs[flags];
  if(pf) {
    for(var i = 0; i < pf.length; i++) {
      if(pf[i][0] === context) {
        return pf[i][1];
      }
    }
  } else {
    this._programs[flags] = [];
  }
  var defines = "";
  if((flags & H3DU.Scene3D.LIGHTING_ENABLED) !== 0)
    defines += "#define SHADING\n";
  if((flags & H3DU.Scene3D.SPECULAR_ENABLED) !== 0)
    defines += "#define SPECULAR\n";
  if((flags & H3DU.Scene3D.PHYSICAL_BASED_ENABLED) !== 0)
    defines += "#define PHYSICAL_BASED\n";
  if((flags & H3DU.Scene3D.METALNESS_ENABLED) !== 0)
    defines += "#define METALNESS\n";
  if((flags & H3DU.Scene3D.METALNESS_MAP_ENABLED) !== 0)
    defines += "#define METALNESS_MAP\n";
  if((flags & H3DU.Scene3D.ROUGHNESS_ENABLED) !== 0)
    defines += "#define ROUGHNESS\n";
  if((flags & H3DU.Scene3D.ROUGHNESS_MAP_ENABLED) !== 0)
    defines += "#define ROUGHNESS_MAP\n";
  if((flags & H3DU.Scene3D.NORMAL_MAP_ENABLED) !== 0)
    defines += "#define NORMAL_MAP\n";
  if((flags & H3DU.Scene3D.TEXTURE_ENABLED) !== 0)
    defines += "#define TEXTURE\n";
  if((flags & H3DU.Scene3D.COLORATTR_ENABLED) !== 0)
    defines += "#define COLORATTR\n";
  if((flags & H3DU.Scene3D.INVERT_ROUGHNESS_ENABLED) !== 0)
    defines += "#define INVERT_ROUGHNESS\n";
  if((flags & H3DU.Scene3D.ENV_MAP_ENABLED) !== 0)
    defines += "#define ENV_MAP\n";
  if((flags & H3DU.Scene3D.ENV_EQUIRECT_ENABLED) !== 0)
    defines += "#define ENV_EQUIRECT\n";
  if((flags & H3DU.Scene3D.EMISSION_MAP_ENABLED) !== 0)
    defines += "#define EMISSION_MAP\n";
  if((flags & H3DU.Scene3D.SPECULAR_MAP_ENABLED) !== 0)
    defines += "#define SPECULAR_MAP\n#define SPECULAR\n";
  var prog = new H3DU.ShaderProgram(context,
   defines + H3DU.ShaderProgram.getDefaultVertex(),
   defines + H3DU.ShaderProgram.getDefaultFragment());
  this._programs[flags].push([context, prog]);
  return prog;
};
/** Returns the WebGL context associated with this scene.
 * @returns {WebGLRenderingContext|WebGL2RenderingContext} Return value.
 * @instance
 */
H3DU.Scene3D.prototype.getContext = function() {
  "use strict";
  return this.context;
};
/** No face culling.
 * @const
 */
H3DU.Scene3D.NONE = 0;
/** Back side of a triangle. By default, triangles with clockwise winding are back-facing.
 * @const
 */
H3DU.Scene3D.BACK = 1;
/**
 * Front side of a triangle. By default, triangles with counterclockwise winding are front-facing.
 * @const
 */
H3DU.Scene3D.FRONT = 2;
/**
 * Back and front sides of a triangle.
 * @const
 */
H3DU.Scene3D.FRONT_AND_BACK = 3;
/**
 * Counterclockwise winding. A triangle has counterclockwise winding (or orientation) if its vertices are ordered in a counterclockwise path from the first to second to third to first vertex, in the triangle's two-dimensional projection in _window coordinates_ (which roughly correspond to its location on the screen or frame buffer).
 * @const
 */
H3DU.Scene3D.CCW = 0;
/**
 * Clockwise winding, the opposite of counterclockwise winding.
 * @const
 */
H3DU.Scene3D.CW = 1;
/**
 * Specifies which kinds of triangle faces are culled (not drawn)
 * when rendering this scene.
 * @param {Number} value If this is {@link H3DU.Scene3D.BACK},
 * {@link H3DU.Scene3D.FRONT}, or {@link H3DU.Scene3D.FRONT_AND_BACK},
 * enables face culling of the specified faces. For any other value,
 * disables face culling. By default, face culling is disabled.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.cullFace = function(value) {
  "use strict";
  if(value === H3DU.Scene3D.BACK ||
   value === H3DU.Scene3D.FRONT ||
   value === H3DU.Scene3D.FRONT_AND_BACK) {
    this._cullFace = value;
  } else {
    this._cullFace = 0;
  }
  return this;
};
/** @ignore */
H3DU.Scene3D.prototype._setFace = function() {
  "use strict";
  if(!this._is3d)return;
  if(this._cullFace === H3DU.Scene3D.BACK) {
    this.context.enable(this.context.CULL_FACE);
    this.context.cullFace(this.context.BACK);
  } else if(this._cullFace === H3DU.Scene3D.FRONT) {
    this.context.enable(this.context.CULL_FACE);
    this.context.cullFace(this.context.FRONT);
  } else if(this._cullFace === H3DU.Scene3D.FRONT_AND_BACK) {
    this.context.enable(this.context.CULL_FACE);
    this.context.cullFace(this.context.FRONT_AND_BACK);
  } else {
    this.context.disable(this.context.CULL_FACE);
  }
  if(this._frontFace === H3DU.Scene3D.CW) {
    this.context.frontFace(this.context.CW);
  } else {
    this.context.frontFace(this.context.CCW);
  }
  return this;
};
/**
 * Specifies the winding of front faces.
 * @param {Number} value If this is {@link H3DU.Scene3D.CW},
 * clockwise triangles are front-facing. For any other value,
 * counterclockwise triangles are front-facing, which is the
 * default behavior. If using a left-handed coordinate system,
 * set this value to {@link H3DU.Scene3D.CW}.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.frontFace = function(value) {
  "use strict";
  if(value === H3DU.Scene3D.CW) {
    this._frontFace = value;
  } else {
    this._frontFace = 0;
  }
  return this;
};
/**
 * Sets whether to check whether to resize the canvas
 * when the render() method is called.
 * @param {Boolean} value If true, will check whether to resize the canvas
 * when the render() method is called. Default is true.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.setAutoResize = function(value) {
  "use strict";
  this.autoResize = !!value;
  return this;
};

/**
 * Gets whether to check whether to resize the canvas
 * when the render() method is called.
 * @returns {H3DU.Scene3D} Return value.
 * @instance
 */
H3DU.Scene3D.prototype.getAutoResize = function() {
  "use strict";
  return !!this.autoResize;
};

/**
 * Sets whether to use the device's pixel ratio (if supported by
 * the browser) in addition to the canvas's size when setting
 * the viewport's dimensions.<p>
 * When this value changes, the H3DU.Scene3D will automatically
 * adjust the viewport.
 * @param {Boolean} value If true, use the device's pixel ratio
 * when setting the viewport's dimensions. Default is true.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.setUseDevicePixelRatio = function(value) {
  "use strict";
  var oldvalue = !!this.useDevicePixelRatio;
  this.useDevicePixelRatio = !!value;
  this._pixelRatio = this.useDevicePixelRatio && window.devicePixelRatio ?
   window.devicePixelRatio : 1;
  if(oldvalue !== this.useDevicePixelRatio) {
    this.setDimensions(this.width, this.height);
  }
  return this;
};
 /**
  * Gets the color used when clearing the screen each frame.
  * @returns {Array<Number>} An array of four numbers, from 0 through
  * 1, specifying the red, green, blue, and alpha components of the color.
  * @instance
  */
H3DU.Scene3D.prototype.getClearColor = function() {
  "use strict";
  return this.clearColor.slice(0, 4);
};
/**
 * Has no effect. (In previous versions, this method changed
 * the active shader program for this scene
 * and prepared this object for the new program.)
 * @deprecated Instead of this method, use the "setShader" program of individual shapes
 * to set the shader programs they use.
 * @param {H3DU.ShaderProgram|null} program No longer used.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.useProgram = function() {
  "use strict";
  console.warn("The 'useProgram' method is obsolete.  Instead of this method, " +
   "use the 'setShader' program of individual shapes to set the shader programs they use.");
};
/**
 * Sets the viewport width and height for this scene.
 * @param {Number} width Width of the scene, in pixels.
 * Will be rounded up.
 * @param {Number} height Height of the scene, in pixels.
 * Will be rounded up.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.Scene3D.prototype.setDimensions = function(width, height) {
  "use strict";
  if(width < 0 || height < 0)throw new Error("width or height negative");
  this.width = Math.ceil(width);
  this.height = Math.ceil(height);
  this.context.canvas.width = this.width * this._pixelRatio;
  this.context.canvas.height = this.height * this._pixelRatio;
  if(this._is3d) {
    this.context.viewport(0, 0, this.width * this._pixelRatio,
   this.height * this._pixelRatio);
  }
  if(typeof this.fbo !== "undefined" && this.fbo) {
    this.fbo.dispose();
    this.fbo = this.createBuffer();
  }
};
/**
 * Gets the viewport width for this scene.
 * Note that if auto-resizing is enabled, this value may change
 * after each call to the render() method.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.Scene3D.prototype.getWidth = function() {
  "use strict";
  return this.width;
};
/**
 * Gets the viewport height for this scene.
 * Note that if auto-resizing is enabled, this value may change
 * after each call to the render() method.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.Scene3D.prototype.getHeight = function() {
  "use strict";
  return this.height;
};
/**
 * Gets the ratio of viewport width to viewport height for this scene (getWidth()
 * divided by getHeight()).
 * Note that if auto-resizing is enabled, this value may change
 * after each call to the render() method.
 * @returns {Number} Aspect ratio, or 1 if height is 0.
 * @instance
 */
H3DU.Scene3D.prototype.getAspect = function() {
  "use strict";
  var ch = this.getHeight();
  if(ch <= 0)return 1;
  return this.getWidth() / ch;
};
/**
 * Gets the width for this scene as actually displayed on the screen.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.Scene3D.prototype.getClientWidth = function() {
  "use strict";
  return this.context.canvas.clientWidth;
};
/**
 * Gets the height for this scene as actually displayed on the screen.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.Scene3D.prototype.getClientHeight = function() {
  "use strict";
  return this.context.canvas.clientHeight;
};
/**
 * Gets the ratio of width to height for this scene,
 * as actually displayed on the screen.
 * @returns {Number} Aspect ratio, or 1 if height is 0.
 * @instance
 */
H3DU.Scene3D.prototype.getClientAspect = function() {
  "use strict";
  var ch = this.getClientHeight();
  if(ch <= 0)return 1;
  return this.getClientWidth() / ch;
};
/**
 * Creates a frame buffer object associated with this scene.
 * @returns {H3DU.FrameBuffer} A buffer with the same size as this scene.
 * @instance
 */
H3DU.Scene3D.prototype.createBuffer = function() {
  "use strict";
  return new H3DU.FrameBuffer(this.context,
   this.getWidth(), this.getHeight());
};
/**
 * Gets the current projection matrix for this scene.
 * @deprecated Use {@link H3DU.Batch3D} instead. To get the projection matrix of a Batch3D, call its getProjectionMatrix method. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @returns {Array<Number>} Return value.
 * @instance
 */
H3DU.Scene3D.prototype.getProjectionMatrix = function() {
  "use strict";
  if(this._errors)throw new Error();
  if(this._renderedOutsideScene) {
    throw new Error("A non-default scene has been rendered, so this method is disabled.");
  }
  return this._subScene._projectionMatrix.slice(0, 16);
};
/**
 * Gets the current view matrix for this scene.
 * @deprecated Use {@link H3DU.Batch3D} instead. To get the view matrix of a Batch3D, call its getViewMatrix method. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @returns {Array<Number>} Return value.
 * @instance
 */
H3DU.Scene3D.prototype.getViewMatrix = function() {
  "use strict";
  if(this._errors)throw new Error();
  if(this._renderedOutsideScene) {
    throw new Error("A non-default scene has been rendered, so this method is disabled.");
  }
  return this._viewMatrix.slice(0, 16);
};
/**
 * Sets this scene's projection matrix to a perspective projection.
 * <p>
 * For considerations when choosing the "near" and "far" parameters,
 * see {@link H3DU.Math.mat4perspective}.
 * @deprecated Instead of this method, use {@link H3DU.Batch3D#setProjectionMatrix} in conjunction with {@link H3DU.Math.mat4perspective}. For compatibility, existing code that doesn't use H3DU.Batch3D can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @param {Number} fov Y axis field of view, in degrees. Should be less
 * than 180 degrees. (The smaller
 * this number, the bigger close objects appear to be. As a result, zooming out
 * can be implemented by raising this value, and zooming in by lowering it.)
 * @param {Number} aspect The ratio of width to height of the viewport, usually
 * the scene's aspect ratio (getAspect() or getClientAspect()).
 * @param {Number} near The distance from the camera to
 * the near clipping plane. Objects closer than this distance won't be
 * seen.
 * @param {Number} far The distance from the camera to
 * the far clipping plane. Objects beyond this distance will be too far
 * to be seen.
 * @returns {H3DU.Scene3D} This object.
 * @example
 * // Set the perspective projection. Camera has a 45-degree field of view
 * // and will see objects from 0.1 to 100 units away.
 * scene.setPerspective(45,scene.getClientAspect(),0.1,100);
 * @instance
 */
H3DU.Scene3D.prototype.setPerspective = function(fov, aspect, near, far) {
  "use strict";
  return this.setProjectionMatrix(H3DU.Math.mat4perspective(fov,
   aspect, near, far));
};

/**
 * Sets this scene's projection matrix to an orthographic projection.
 * In this projection, the left clipping plane is parallel to the right clipping
 * plane and the top to the bottom.<p>
 * If the view rectangle's aspect ratio doesn't match the desired aspect
 * ratio, the view rectangle will be centered on the 3D scene's viewport
 * or otherwise moved and scaled so as to keep the entire view rectangle visible without stretching
 * or squishing it.
 * @deprecated Instead of this method, use {@link H3DU.Batch3D#setProjectionMatrix} in conjunction with {@link H3DU.Math.mat4orthoAspect}. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @param {Number} left Leftmost coordinate of the view rectangle.
 * @param {Number} right Rightmost coordinate of the view rectangle.
 * (Note that right can be greater than left or vice versa.)
 * @param {Number} bottom Bottommost coordinate of the view rectangle.
 * @param {Number} top Topmost coordinate of the view rectangle.
 * (Note that top can be greater than bottom or vice versa.)
 * @param {Number} near Distance from the camera to the near clipping
 * plane. A positive value means the plane is in front of the viewer.
 * @param {Number} far Distance from the camera to the far clipping
 * plane. A positive value means the plane is in front of the viewer.
 * (Note that near can be greater than far or vice versa.) The absolute difference
 * between near and far should be as small as the application can accept.
 * @param {Number} [aspect] Desired aspect ratio of the viewport (ratio
 * of width to height). If null or omitted, uses this scene's aspect ratio instead.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.setOrthoAspect = function(left, right, bottom, top, near, far, aspect) {
  "use strict";
  if(typeof aspect === "undefined" || aspect === null)aspect = this.getClientAspect();
  if(aspect === 0)aspect = 1;
  return this.setProjectionMatrix(H3DU.Math.mat4orthoAspect(
   left, right, bottom, top, near, far, aspect));
};
/**
 * Sets this scene's projection matrix to a 2D orthographic projection.
 * The near and far clipping planes will be set to -1 and 1, respectively.<p>
 * If the view rectangle's aspect ratio doesn't match the desired aspect
 * ratio, the view rectangle will be centered on the 3D scene's viewport
 * or otherwise moved and scaled so as to keep the entire view rectangle visible without stretching
 * or squishing it.
 * @deprecated Instead of this method, use {@link H3DU.Batch3D#setProjectionMatrix} in conjunction with {@link H3DU.Math.mat4ortho2dAspect}. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @param {Number} left Leftmost coordinate of the view rectangle.
 * @param {Number} right Rightmost coordinate of the view rectangle.
 * (Note that right can be greater than left or vice versa.)
 * @param {Number} bottom Bottommost coordinate of the view rectangle.
 * @param {Number} top Topmost coordinate of the view rectangle.
 * (Note that top can be greater than bottom or vice versa.)
 * @param {Number} [aspect] Desired aspect ratio of the viewport (ratio
 * of width to height). If null or omitted, uses this scene's aspect ratio instead.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.setOrtho2DAspect = function(left, right, bottom, top, aspect) {
  "use strict";
  return this.setOrthoAspect(left, right, bottom, top, -1, 1, aspect);
};

/**
 * Sets this scene's projection matrix to a perspective projection that defines
 * the view frustum, or the limits in the camera's view.
 * <p>
 * For considerations when choosing the "near" and "far" parameters,
 * see {@link H3DU.Math.mat4perspective}.
 * @deprecated Instead of this method, use {@link H3DU.Batch3D#setProjectionMatrix} in conjunction with {@link H3DU.Math.mat4frustum}. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @param {Number} left X coordinate of the point where the left
 * clipping plane meets the near clipping plane.
 * @param {Number} right X coordinate of the point where the right
 * clipping plane meets the near clipping plane.
 * @param {Number} bottom Y coordinate of the point where the bottom
 * clipping plane meets the near clipping plane.
 * @param {Number} top Y coordinate of the point where the top
 * clipping plane meets the near clipping plane.
 * @param {Number} near The distance from the camera to
 * the near clipping plane. Objects closer than this distance won't be
 * seen.
 * @param {Number} far The distance from the camera to
 * the far clipping plane. Objects beyond this distance will be too far
 * to be seen.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.setFrustum = function(left, right, bottom, top, near, far) {
  "use strict";
  return this.setProjectionMatrix(H3DU.Math.mat4frustum(
   left, right, top, bottom, near, far));
};
/**
 * Sets this scene's projection matrix to an orthographic projection.
 * In this projection, the left clipping plane is parallel to the right clipping
 * plane and the top to the bottom.
 * @deprecated Instead of this method, use {@link H3DU.Batch3D#setProjectionMatrix} in conjunction with {@link H3DU.Math.mat4ortho}. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @param {Number} left Leftmost coordinate of the 3D view.
 * @param {Number} right Rightmost coordinate of the 3D view.
 * (Note that right can be greater than left or vice versa.)
 * @param {Number} bottom Bottommost coordinate of the 3D view.
 * @param {Number} top Topmost coordinate of the 3D view.
 * (Note that top can be greater than bottom or vice versa.)
 * @param {Number} near Distance from the camera to the near clipping
 * plane. A positive value means the plane is in front of the viewer.
 * @param {Number} far Distance from the camera to the far clipping
 * plane. A positive value means the plane is in front of the viewer.
 * (Note that near can be greater than far or vice versa.) The absolute difference
 * between near and far should be as small as the application can accept.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.setOrtho = function(left, right, bottom, top, near, far) {
  "use strict";
  return this.setProjectionMatrix(H3DU.Math.mat4ortho(
   left, right, bottom, top, near, far));
};
/**
 * Sets this scene's projection matrix to a 2D orthographic projection.
 * The near and far clipping planes will be set to -1 and 1, respectively.
 * @deprecated Instead of this method, use {@link H3DU.Batch3D#setProjectionMatrix} in conjunction with {@link H3DU.Math.mat4ortho2d}. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @param {Number} left Leftmost coordinate of the 2D view.
 * @param {Number} right Rightmost coordinate of the 2D view.
 * (Note that right can be greater than left or vice versa.)
 * @param {Number} bottom Bottommost coordinate of the 2D view.
 * @param {Number} top Topmost coordinate of the 2D view.
 * (Note that top can be greater than bottom or vice versa.)
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.setOrtho2D = function(left, right, bottom, top) {
  "use strict";
  return this.setProjectionMatrix(H3DU.Math.mat4ortho(
   left, right, bottom, top, -1, 1));
};
/** @ignore */
H3DU.Scene3D.prototype._setClearColor = function() {
  "use strict";
  if(this._is3d) {
    this.context.clearColor(this.clearColor[0], this.clearColor[1],
     this.clearColor[2], this.clearColor[3]);
  }
  return this;
};
/**
 * Disposes all resources used by this object.
 * @instance
 * @returns {Object} Return value.
 */
H3DU.Scene3D.prototype.dispose = function() {
  "use strict";
  this.context = null;
  if(this._programs)
    this._programs.dispose();
  if(this._textureLoader)
    this._textureLoader.dispose();
  if(this._meshLoader)
    this._meshLoader.dispose();
  this._programs = null;
  this._textureLoader = null;
  this._meshLoader = null;
};
/**
 * Sets the color used when clearing the screen each frame.
 * This color is black by default.
 * @param {Array<Number>|number|string} r Array of three or
 * four color components; or the red color component (0-1); or a string
 * specifying an [HTML or CSS color]{@link H3DU.toGLColor}.
 * @param {Number} g Green color component (0-1).
 * May be null or omitted if a string or array is given as the "r" parameter.
 * @param {Number} b Blue color component (0-1).
 * May be null or omitted if a string or array is given as the "r" parameter.
 * @param {Number} [a] Alpha color component (0-1).
 * If the "r" parameter is given and this parameter is null or omitted,
 * this value is treated as 1.0.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.setClearColor = function(r, g, b, a) {
  "use strict";
  this.clearColor = H3DU.toGLColor(r, g, b, a);
  return this._setClearColor();
};
/**
 * Loads a texture from an image URL.
 * @deprecated Use the H3DU.TextureLoader method loadTexture or
 * loadTexturesAll instead.
 * @param {String} name URL of the image to load.
 * @returns {Promise} A promise that is resolved when
 * the image is loaded successfully (the result will be an H3DU.Texture
 * object), and is rejected when an error occurs.
 * @instance
 */
H3DU.Scene3D.prototype.loadTexture = function(name) {
  "use strict";
  return this._textureLoader.loadTexture(name);
};
/**
 * Loads a texture from an image URL and uploads it
 * to a texture buffer object.
 * @deprecated Use the H3DU.TextureLoader method loadAndMapTexturesAll
 * instead.
 * @param {string|H3DU.Texture} texture String giving the
 * URL of the image to load, or
 * an H3DU.Texture object whose data may or may not be loaded.
 * @returns {Promise} A promise that is resolved when
 * the image is loaded successfully and uploaded
 * to a texture buffer (the result will be an H3DU.Texture
 * object), and is rejected when an error occurs.
 * @instance
 */
H3DU.Scene3D.prototype.loadAndMapTexture = function(texture) {
  "use strict";
  if(texture.constructor === H3DU.Texture) {
    return this._textureLoader.loadAndMapTexture(texture.name, this.context);
  } else if(typeof texture === "string") {
    return this._textureLoader.loadAndMapTexture(texture, this.context);
  }
};
/**
 * Loads one or more textures from an image URL and uploads each of them
 * to a texture buffer object.
 * @deprecated Use the H3DU.TextureLoader method loadAndMapTexturesAll
 * instead.
 * @param {Array<String>} textureFiles A list of URLs of the image to load.
 * @param {Function} [resolve] Called for each URL that is loaded successfully
 * and uploaded to a texture buffer (the argument will be an H3DU.Texture object.)
 * @param {Function} [reject] Called for each URL for which an error
 * occurs (the argument will be the data passed upon
 * rejection).
 * @returns {Promise} A promise that is resolved when
 * all the URLs in the textureFiles array are either resolved or rejected.
 * The result will be an object with three properties:
 * "successes", "failures", and "results".
 * See {@link H3DU.getPromiseResults}.
 * @instance
 */
H3DU.Scene3D.prototype.loadAndMapTextures = function(textureFiles, resolve, reject) {
  "use strict";
  var promises = [];

  for(var i = 0; i < textureFiles.length; i++) {
    var objf = textureFiles[i];
    promises.push(this.loadAndMapTexture(objf));
  }
  return H3DU.getPromiseResults(promises, resolve, reject);
};
/**
 * Clears the color, depth, and stencil buffers used in this scene,
 * if any.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.clear = function() {
  "use strict";
  if(this._is3d) {
    this.context.clear(
     this.context.COLOR_BUFFER_BIT |
     this.context.DEPTH_BUFFER_BIT |
     this.context.STENCIL_BUFFER_BIT);
  }
  return this;
};
/**
 * Clears the depth buffer used in this scene, if any.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.clearDepth = function() {
  "use strict";
  if(this._is3d) {
    this.context.clear(this.context.DEPTH_BUFFER_BIT);
  }
  return this;
};
/**
 * Gets the number of vertices composed by
 * all shapes in this scene.
 * @deprecated Use the vertexCount method of {@link H3DU.Batch3D} objects instead. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.Scene3D.prototype.vertexCount = function() {
  "use strict";
  if(this._errors)throw new Error();
  if(this._renderedOutsideScene) {
    throw new Error("A non-default scene has been rendered, so this method is disabled.");
  }
  return this._subScene.vertexCount();
};
/**
 * Gets the number of primitives (triangles, lines,
 * and points) composed by all shapes in this scene.
 * @deprecated Use the <code>primitiveCount</code> method of {@link H3DU.Batch3D} objects instead. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.Scene3D.prototype.primitiveCount = function() {
  "use strict";
  if(this._errors)throw new Error();
  if(this._renderedOutsideScene) {
    throw new Error("A non-default scene has been rendered, so this method is disabled.");
  }
  return this._subScene.primitiveCount();
};
/**
 * Sets the projection matrix for this object. The projection
 * matrix can also be set using the {@link H3DU.Scene3D#setFrustum}, {@link H3DU.Scene3D#setOrtho},
 * {@link H3DU.Scene3D#setOrtho2D}, and {@link H3DU.Scene3D#setPerspective} methods.
 * @deprecated Instead of this method, use {@link H3DU.Batch3D#setProjectionMatrix}. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @param {Array<Number>} matrix A 16-element matrix (4x4).
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.setProjectionMatrix = function(matrix) {
  "use strict";
  if(this._errors)throw new Error();
  if(this._renderedOutsideScene) {
    throw new Error("A non-default scene has been rendered, so this method is disabled.");
  }
  this._subScene.setProjectionMatrix(matrix);
  return this;
};
/**
 * Sets this scene's view matrix. The view matrix can also
 * be set using the {@link H3DU.Scene3D#setLookAt} method.
 * @deprecated Instead of this method, use {@link H3DU.Batch3D#setViewMatrix} in conjunction with {@link H3DU.Math.mat4ortho2dAspect}. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @param {Array<Number>} matrix A 16-element matrix (4x4).
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.setViewMatrix = function(matrix) {
  "use strict";
  if(this._errors)throw new Error();
  if(this._renderedOutsideScene) {
    throw new Error("A non-default scene has been rendered, so this method is disabled.");
  }
  this._subScene.setViewMatrix(matrix);
  return this;
};
/**
 * Sets this scene's view matrix to represent a camera view.
 * This method takes a camera's position (<code>eye</code>), and the point the camera is viewing
 * (<code>center</code>).
 * @deprecated Instead of this method, use {@link H3DU.Batch3D#setLookAt}. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @param {Array<Number>} eye A 3-element vector specifying
 * the camera position in world space.
 * @param {Array<Number>} [center] A 3-element vector specifying
 * the point in world space that the camera is looking at. May be null or omitted,
 * in which case the default is the coordinates (0,0,0).
 * @param {Array<Number>} [up] A 3-element vector specifying
 * the direction from the center of the camera to its top. This parameter may
 * be null or omitted, in which case the default is the vector (0, 1, 0),
 * the vector that results when the camera is held upright. This
 * vector must not point in the same or opposite direction as
 * the camera's view direction. (For best results, rotate the vector (0, 1, 0)
 * so it points perpendicular to the camera's view direction.)
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.setLookAt = function(eye, center, up) {
  "use strict";
  return this.setViewMatrix(H3DU.Math.mat4lookat(eye, center, up));
};
/**
 * Adds a 3D shape to this scene. Its reference, not a copy,
 * will be stored in the 3D scene's list of shapes.
 * Its parent will be set to no parent.
 * @deprecated Use the addShape method of individual {@link H3DU.Batch3D} instances
 * instead. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom
 * H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @param {H3DU.Shape|H3DU.ShapeGroup} shape A 3D shape.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.addShape = function(shape) {
  "use strict";
  if(this._errors)throw new Error();
  if(this._renderedOutsideScene) {
    throw new Error("A non-default scene has been rendered, so this method is disabled.");
  }
  this._subScene.addShape(shape);
  this.shapes.push(shape);
  return this;
};
/**
 * Creates a buffer from a geometric mesh and
 * returns a shape object.
 * @deprecated Use the H3DU.Shape constructor instead.
 * @param {H3DU.Mesh} mesh A geometric mesh object. The shape
 * created will use the mesh in its current state and won't
 * track future changes.
 * @returns {H3DU.Shape} The generated shape object.
 * @instance
 */
H3DU.Scene3D.prototype.makeShape = function(mesh) {
  "use strict";
  if(this._errors)throw new Error();
  if(this._renderedOutsideScene) {
    throw new Error("A non-default scene has been rendered, so this method is disabled.");
  }
  return new H3DU.Shape(mesh);
};

/**
 * Removes all instances of a 3D shape from this scene.
 * @deprecated Use the removeShape method of individual {@link H3DU.Batch3D} instances
 * instead. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom
 * H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @param {H3DU.Shape|H3DU.ShapeGroup} shape The 3D shape to remove.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.removeShape = function(shape) {
  "use strict";
  if(this._errors)throw new Error();
  if(this._renderedOutsideScene) {
    throw new Error("A non-default scene has been rendered, so this method is disabled.");
  }
  this._subScene.removeShape(shape);
  for(var i = 0; i < this.shapes.length; i++) {
    if(this.shapes[i] === shape) {
      this.shapes.splice(i, 1);
      i--;
    }
  }
  return this;
};
/**
 * Gets the light sources used in this scene.
 * @deprecated Use the removeShape method of individual {@link H3DU.Batch3D} instances
 * instead. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom
 * H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @returns {H3DU.Lights} The light sources used in this scene.
 * @instance
 */
H3DU.Scene3D.prototype.getLights = function() {
  "use strict";
  if(this._errors)throw new Error();
  if(this._renderedOutsideScene) {
    throw new Error("A non-default scene has been rendered, so this method is disabled.");
  }
  return this._subScene.getLights();
};
/**
 * Sets a light source in this scene to a directional light.
 * @deprecated Use the Lights method setDirectionalLight instead and the {@link H3DU.Batch3D} method getLights. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @param {Number} index Zero-based index of the light to set. The first
 * light has index 0, the second has index 1, and so on. Will be created
 * if the light doesn't exist.
 * @param {Array<Number>} position A 3-element vector giving the direction of the light, along the X, Y, and Z
 * axes, respectively. May be null, in which case the default
 * is (0, 0, 1).
 * @param {Array<Number>} [diffuse] A [color vector or string]{@link H3DU.toGLColor} giving the diffuse color of the light.
 * If null or omitted, the default is (1, 1, 1, 1) for light index 0 and (0, 0, 0, 0) otherwise.
 * @param {Array<Number>} [specular] A [color vector or string]{@link H3DU.toGLColor} giving the color of specular highlights caused by
 * the light.
 * If null or omitted, the default is (1, 1, 1) for light index 0 and (0, 0, 0) otherwise.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.setDirectionalLight = function(index, position, diffuse, specular) {
  "use strict";
  if(this._errors)throw new Error();
  if(this._renderedOutsideScene) {
    throw new Error("A non-default scene has been rendered, so this method is disabled.");
  }
  this.getLights().setDirectionalLight(index, position, diffuse, specular);
  return this;
};
/**
 * Sets parameters for a light in this scene.
 * @deprecated Use the Lights method setParams instead and the {@link H3DU.Batch3D} method getLights. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @param {Number} index Zero-based index of the light to set. The first
 * light has index 0, the second has index 1, and so on. Will be created
 * if the light doesn't exist.
 * @param {Object} params An object as described in {@link H3DU.LightSource.setParams}.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.setLightParams = function(index, params) {
  "use strict";
  if(this._errors)throw new Error();
  if(this._renderedOutsideScene) {
    throw new Error("A non-default scene has been rendered, so this method is disabled.");
  }
  this.getLights().setParams(index, params);
  return this;
};

/**
 * Sets the color of the scene's ambient light.
 * @deprecated Use the Lights method setAmbient instead and the {@link H3DU.Batch3D} method getLights. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @param {Array<Number>|number|string} r Array of three or
 * four color components; or the red color component (0-1); or a string
 * specifying an [HTML or CSS color]{@link H3DU.toGLColor}.
 * @param {Number} g Green color component (0-1).
 * May be null or omitted if a string or array is given as the "r" parameter.
 * @param {Number} b Blue color component (0-1).
 * May be null or omitted if a string or array is given as the "r" parameter.
 * @param {Number} [a] Alpha color component (0-1).
 * Currently not used.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.setAmbient = function(r, g, b, a) {
  "use strict";
  if(this._errors)throw new Error();
  if(this._renderedOutsideScene) {
    throw new Error("A non-default scene has been rendered, so this method is disabled.");
  }
  this.getLights().setAmbient(r, g, b, a);
  return this;
};

/**
 * Sets a light source in this scene to a point light.
 * @deprecated Use the LightSource method setPointLight instead and the {@link H3DU.Batch3D} method getLights. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @param {Number} index Zero-based index of the light to set. The first
 * light has index 0, the second has index 1, and so on.
 * @param {Array<Number>} position Light position. (See {@link H3DU.LightSource#position}.)
 * @param {Array<Number>} [diffuse] A [color vector or string]{@link H3DU.toGLColor} giving the diffuse color of the light.
 * If null or omitted, the default is (1, 1, 1, 1) for light index 0 and (0, 0, 0, 0) otherwise.
 * @param {Array<Number>} [specular] A [color vector or string]{@link H3DU.toGLColor} giving the color of specular highlights caused by
 * the light.
 * If null or omitted, the default is (1, 1, 1) for light index 0 and (0, 0, 0) otherwise.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.setPointLight = function(index, position, diffuse, specular) {
  "use strict";
  if(this._errors)throw new Error();
  if(this._renderedOutsideScene) {
    throw new Error("A non-default scene has been rendered, so this method is disabled.");
  }
  this.getLights().setPointLight(index, position, diffuse, specular);
  return this;
};
/** @ignore */
H3DU.Scene3D.prototype._clearForPass = function(pass) {
  "use strict";
  var flags = 0;
  if(pass.clearColor)flags |= this.context.COLOR_BUFFER_BIT;
  if(pass.clearDepth)flags |= this.context.DEPTH_BUFFER_BIT;
  if(pass.clearStencil)flags |= this.context.STENCIL_BUFFER_BIT;
  if(this._is3d && flags !== 0) {
    this.context.clear(flags);
  }
};

/**
 * Renders all shapes added to this scene.
 * This is usually called in a render loop, such
 * as {@link H3DU.renderLoop}.<p>
 * NOTE: For compatibility, the "render" function with a null or omitted parameter will clear the color
 * buffer and depth buffer. This compatibility option may be dropped in the future.
 * @param {Array<H3DU.RenderPass3D>|H3DU.Batch3D} renderPasses An array of scenes
 * to draw, or a single batch to render. Can currently be null.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.render = function(renderPasses) {
  "use strict";
  if(renderPasses instanceof H3DU.Batch3D) {
    return this.render([new H3DU.RenderPass3D(renderPasses)]);
  }
  if(this.autoResize) {
    var c = this.context.canvas;
    if(c.height !== Math.ceil(c.clientHeight) * this._pixelRatio ||
       c.width !== Math.ceil(c.clientWidth) * this._pixelRatio) {
    // Resize the canvas if needed
      this.setDimensions(c.clientWidth, c.clientHeight);
    }
  }
  this._setFace();
  var width = this.getClientWidth();
  var height = this.getClientHeight();
  if(typeof renderPasses === "undefined" || renderPasses === null) {
    if(this._is3d) {
      this.context.clear(this.context.COLOR_BUFFER_BIT |
        this.context.DEPTH_BUFFER_BIT);
    }
    var oldshapes = this._subScene.shapes;
    var arr = [];
    // arr=arr.concat(this._subScene.shapes)
    arr = arr.concat(this.shapes);
    this._subScene.shapes = arr;
    this._subScene.resize(width, height);
    this._subScene.render(this);
    this._subScene.shapes = oldshapes;
  } else {
    this._renderedOutsideScene = true;
    var oldWidth = this.getWidth();
    var oldHeight = this.getHeight();
    for(var i = 0; i < renderPasses.length; i++) {
      var pass = renderPasses[i];
      var restoreDims = false;
      var passWidth = width;
      var passHeight = height;
      if(pass.frameBuffer) {
        if(pass.useFrameBufferSize) {
          restoreDims = true;
          passWidth = pass.frameBuffer.getWidth();
          passHeight = pass.frameBuffer.getHeight();
          this.setDimensions(passWidth, passHeight);
        }
        this._textureLoader.bindFrameBuffer(
             pass.frameBuffer, this.context, 0);
      }
      this._clearForPass(pass);
      renderPasses[i].batch.resize(passWidth, passHeight);
      renderPasses[i].batch.render(this, pass);
      if(pass.frameBuffer) {
        if(restoreDims) {
          this.setDimensions(oldWidth, oldHeight);
        }
        this._textureLoader.unbindFrameBuffer(
          pass.frameBuffer, this.context);
      }
    }
  }
  return this;
};

/**
 * Uses a shader program to apply a texture filter after the
 * scene is rendered.
 * @deprecated Use the {@link H3DU.Batch3D.forFilter} method to create a batch
 * for rendering filter effects from a frame buffer, or use the {@link H3DU.Batch3D.useShader}
 * method. For compatibility, existing code that doesn't use {@link H3DU.Batch3D} can still call this method
 * until it renders a custom H3DU.Batch3D. This compatibility behavior may be dropped in the future.
 * @param {H3DU.ShaderProgram|string|null} filterProgram The shader program to use.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Scene3D.prototype.useFilter = function(filterProgram) {
  "use strict";
  if(this._renderedOutsideScene) {
    throw new Error("A non-default scene has been rendered, so this method is disabled.");
  }
  console.warn("The useFilter method is deprecated. Use the {@link H3DU.Batch3D.forFilter} method to " +
    "create a batch for rendering filter effects from a frame buffer.");
  if(filterProgram instanceof H3DU.ShaderProgram) {
    this._subScene._useShader(filterProgram.shaderInfo);
  } else {
    this._subScene._useShader(filterProgram);
  }
  return this;
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU */
/**
 * A collection of light sources. It stores the scene's
 * ambient color as well as data on one or more light sources.
 * When constructed, the list of light sources will be empty.<p>
 * NOTE: The default shader program assumes that all colors specified in this object are in
 * the [sRGB color space]{@link H3DU.Math.colorTosRGB}.
 * @class
 * @memberof H3DU
 */
H3DU.Lights = function() {
  "use strict";
  this.lights = [];
 /**
  * Ambient color for the scene. This is the color of the light
  * that shines on every part of every object equally and in
  * every direction. In the absence of
  * other lighting effects, all objects will be given this color.<p>
  * <small>Ambient light is a simplified simulation of the
  * real-world effect of light bouncing back and forth between
  * many different objects in an area. One example of this
  * phenomenon is sunlight reaching an indoor room without
  * directly hitting it, such that the sunlight bounces off the walls
  * and so illuminates most of the room pretty much uniformly.
  * Ambient lights simulate this phenomenon.</small><p>
  * NOTE: In the default shader program, this property is
  * only used on objects that use {@link H3DU.Material}, not {@link H3DU.PbrMaterial}.
  * @default
  */
  this.sceneAmbient = [0.2, 0.2, 0.2];
};
/**
 * Resets this object to a basic configuration for
 * light sources: one light source with its default
 * values, and the default value for <code>sceneAmbient</code>.
 * @returns {H3DU.Lights} This object.
 * @instance
 */
H3DU.Lights.prototype.setBasic = function() {
  "use strict";
  var ls = new H3DU.LightSource().setParams({
    "ambient":[0, 0, 0, 1],
    "position":[0, 0, 1, 0],
    "diffuse":[1, 1, 1, 1],
    "specular":[1, 1, 1],
    "radius":0.0
  });
  this.lights = [ls];
  this.sceneAmbient = [0.2, 0.2, 0.2];
  return this;
};

/** Maximum number of lights supported
 * by the default shader program.
 * @const
 * @default
 */
H3DU.Lights.MAX_LIGHTS = 3;
/** @ignore */
H3DU.Lights._createNewLight = function(index) {
  "use strict";
  var ret = new H3DU.LightSource();
  if(index !== 0) {
    ret.diffuse = [0, 0, 0, 0];
    ret.specular = [0, 0, 0];
  }
  return ret;
};
/**
 * Gets the number of lights defined in this object.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.Lights.prototype.getCount = function() {
  "use strict";
  return this.lights.length;
};

/**
 * Gets information about the light source at the given index.
 * @param {Number} index Zero-based index of the light to set. The first
 * light has index 0, the second has index 1, and so on.
 * If the light doesn't exist at that index, it will be created.
 * @returns {LightSource} The corresponding light source object.
 * @instance
 */
H3DU.Lights.prototype.getLight = function(index) {
  "use strict";
  var oldLength = this.lights.length;
  if(!this.lights[index])this.lights[index] = H3DU.Lights._createNewLight(index);
  if(this.lights.length - oldLength >= 2) {
  // Ensure existence of lights that come between the new
  // light and the last light
    for(var i = oldLength; i < this.lights.length; i++) {
      if(!this.lights[i]) {
        this.lights[i] = H3DU.Lights._createNewLight(i);
      }
    }
  }
  return this.lights[index];
};
/**
 * Sets parameters for the light source at the given index.
 * @param {Number} index Zero-based index of the light to set. The first
 * light has index 0, the second has index 1, and so on.
 * If the light doesn't exist at that index, it will be created.
 * @param {Object} params An object as described in {@link H3DU.LightSource.setParams}.
 * @returns {H3DU.Lights} This object.
 * @instance
 */
H3DU.Lights.prototype.setParams = function(index, params) {
  "use strict";
  this.getLight(index).setParams(params);
  return this;
};

/**
 * Sets a directional light.
 * @param {Number} index Zero-based index of the light to set. The first
 * light has index 0, the second has index 1, and so on.
 * If the light doesn't exist at that index, it will be created.
 * @param {Array<Number>} direction A 3-element array giving the X, Y, and Z world space
 * components, respectively, of the a vector; the light will shine the brightest on surfaces that face the light in this vector's direction from the origin (0, 0, 0).
 * @param {Array<Number>} [diffuse] A [color vector or string]{@link H3DU.toGLColor} giving the diffuse color of the light.
 * If null or omitted, the diffuse color will remain unchanged. The default is (1, 1, 1, 1) for light index 0 and (0, 0, 0, 0) otherwise.
 * @param {Array<Number>} [specular] A [color vector or string]{@link H3DU.toGLColor} giving the color of specular highlights caused by
 * the light.
 * If null or omitted, the specular highlight color will
 * remain unchanged. The default is (1, 1, 1) for light index 0 and (0, 0, 0) otherwise.
 * @returns {H3DU.Lights} This object.
 * @instance
 */
H3DU.Lights.prototype.setDirectionalLight = function(index, direction, diffuse, specular) {
  "use strict";
  var ret = this.setParams(index, {"position":[direction[0], direction[1], direction[2], 0]});
  if(typeof diffuse !== "undefined" && diffuse !== null)
    ret = ret.setParams(index, {"diffuse":diffuse});
  if(typeof specular !== "undefined" && specular !== null)
    ret = ret.setParams(index, {"specular":specular});
  return ret;
};
/**
 * Sets a point light.
 * @param {Number} index Zero-based index of the light to set. The first
 * light has index 0, the second has index 1, and so on.
 * If the light doesn't exist at that index, it will be created.
 * @param {Array<Number>} position A 3-element array giving the X, Y, and Z world space
 * coordinates, respectively, of the light's position.
 * @param {Array<Number>} [diffuse] Diffuse color, as described in {@link H3DU.Lights.setDirectionalLight}.
 * @param {Array<Number>} [specular] Specular color, as described in {@link H3DU.Lights.setDirectionalLight}.
 * @returns {H3DU.Lights} This object.
 * @instance
 */
H3DU.Lights.prototype.setPointLight = function(index, position, diffuse, specular) {
  "use strict";
  var ret = this.setParams(index, {"position":[position[0], position[1], position[2], 1]});
  if(typeof diffuse !== "undefined" && diffuse !== null)
    ret = ret.setParams(index, {"diffuse":diffuse});
  if(typeof specular !== "undefined" && specular !== null)
    ret = ret.setParams(index, {"specular":specular});
  return ret;
};

/**
 * Sets the color of the scene's ambient light.
 * @param {Array<Number>|number|string} r Array of three or
 * four color components; or the red color component (0-1); or a string
 * specifying an [HTML or CSS color]{@link H3DU.toGLColor}.
 * @param {Number} g Green color component (0-1).
 * May be null or omitted if a string or array is given as the "r" parameter.
 * @param {Number} b Blue color component (0-1).
 * May be null or omitted if a string or array is given as the "r" parameter.
 * @param {Number} [a] Alpha color component (0-1).
 * Currently not used.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Lights.prototype.setAmbient = function(r, g, b, a) {
  "use strict";
  this.sceneAmbient = H3DU.toGLColor(r, g, b, a);
  return this;
};
/* global H3DU */
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/**
 * A `Batch3D` represents a so-called "scene graph". It holds
 * 3D objects which will be drawn to the screen, as well as the camera&#39;s projection, the camera&#39;s
 * position, and light sources to illuminate the 3D scene.
 * @class
 * @memberof H3DU
 */
H3DU.Batch3D = function() {
  "use strict";
  this._projectionMatrix = H3DU.Math.mat4identity();
  this._viewMatrix = H3DU.Math.mat4identity();
  this.lights = new H3DU.Lights();
  this._projectionUpdater = null;
  this._globalShader = null;
  this._frustum = null;
  /** @ignore */
  this.shapes = [];
};
/** @ignore */
H3DU.Batch3D._PerspectiveView = function(batch, fov, near, far) {
  "use strict";
  this.fov = fov;
  this.near = near;
  this.far = far;
  this.batch = batch;
  this.lastAspect = null;
/** @ignore */
  this.update = function(width, height) {
    var aspect = width * 1.0 / height;
    if(aspect !== this.lastAspect && !isNaN(aspect)) {
      this.lastAspect = aspect;
      this.batch.setProjectionMatrix(
     H3DU.Math.mat4perspective(this.fov, aspect, this.near, this.far));
    }
  };
  this.update();
};
/** @ignore */
H3DU.Batch3D._OrthoView = function(batch, a, b, c, d, e, f) {
  "use strict";
  this.a = a;
  this.b = b;
  this.c = c;
  this.d = d;
  this.e = e;
  this.f = f;
  this.batch = batch;
  this.lastAspect = null;
/** @ignore */
  this.update = function(width, height) {
    var aspect = width * 1.0 / height;
    if(aspect !== this.lastAspect && !isNaN(aspect)) {
      this.lastAspect = aspect;
      this.batch.setProjectionMatrix(
     H3DU.Math.mat4orthoAspect(this.a, this.b, this.c, this.d, this.e, this.f, aspect));
    }
  };
  this.update();
};

/** @ignore */
H3DU.Batch3D._setupMatrices = function(
  program,
  projMatrix,
  viewMatrix,
  worldMatrix) {
  "use strict";
  var uniforms = {};
  var viewWorld = null;
  for(var k in program.uniformSemantics)
    if(Object.prototype.hasOwnProperty.call(program.uniformSemantics, k)) {
      var v = program.uniformSemantics[k];
      switch(v) {
      case H3DU.Semantic.MODEL:
        uniforms[k] = worldMatrix;
        break;
      case H3DU.Semantic.VIEW:
        uniforms[k] = viewMatrix;
        break;
      case H3DU.Semantic.PROJECTION:
        uniforms[k] = projMatrix;
        break;
      case H3DU.Semantic.MODELVIEW:
      case H3DU.Semantic.MODELVIEWPROJECTION:
      case H3DU.Semantic.MODELVIEWINVERSETRANSPOSE:
        if(!viewWorld) {
          if(H3DU._isIdentityExceptTranslate(viewMatrix)) {
    // view matrix is just a translation matrix, so that getting the model-view
    // matrix amounts to simply adding the view's position
            viewWorld = worldMatrix.slice(0, 16);
            viewWorld[12] += viewMatrix[12];
            viewWorld[13] += viewMatrix[13];
            viewWorld[14] += viewMatrix[14];
          } else {
            viewWorld = H3DU.Math.mat4multiply(viewMatrix,
     worldMatrix);
          }
        }
        if(v === H3DU.Semantic.MODELVIEW) {
          uniforms[k] = viewWorld;
        } else if(v === H3DU.Semantic.MODELVIEWPROJECTION) {
          uniforms[k] = H3DU.Math.mat4multiply(projMatrix, viewWorld);
        } else if(v === H3DU.Semantic.MODELVIEWINVERSETRANSPOSE) {
          uniforms[k] = H3DU.Math.mat4inverseTranspose3(viewWorld);
        }
        break;
      case H3DU.Semantic.VIEWINVERSE:
        uniforms[k] = H3DU.Math.mat4invert(viewMatrix);
        break;
      default:
        break;
      }
    }
  program.setUniforms(uniforms);
};
/** @ignore */
H3DU.Batch3D._isSameMatrix = function(a, b) {
  "use strict";
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] &&
   a[3] === b[3] && a[4] === b[4] && a[5] === b[5] &&
   a[6] === b[6] && a[7] === b[7] && a[8] === b[8] &&
   a[9] === b[9] && a[10] === b[10] && a[11] === b[11] &&
   a[12] === b[12] && a[13] === b[13] && a[14] === b[14] &&
   a[15] === b[15];
};
/**
 * Sets the projection matrix for this batch.
 * @param {Array<Number>} mat A 16-element matrix (4x4).
 * @returns {H3DU.Batch3D} This object.
 * @instance
 */
H3DU.Batch3D.prototype.setProjectionMatrix = function(mat) {
  "use strict";
  if(!H3DU.Batch3D._isSameMatrix(this._projectionMatrix, mat)) {
    this._projectionMatrix = mat.slice(0, 16);
    this._frustum = null;
  }
  return this;
};
/**
 * Uses a perspective projection for this batch. It will be adjusted
 * to the scene's aspect ratio each time this batch is rendered.<p>
 * For considerations when choosing the "near" and "far" parameters,
 * see {@link H3DU.Math.mat4perspective}.
 * @param {Number} fov Y axis field of view, in degrees. Should be less than 180 degrees. (The smaller this number, the bigger close objects appear to be. As a result, zooming out can be implemented by raising this value, and zooming in by lowering it.)
 * @param {Number} near The distance from the camera to the near clipping plane. Objects closer than this distance won't be seen.
 * @param {Number} far The distance from the camera to the far clipping plane. Objects beyond this distance will be too far to be seen.
 * @returns {H3DU.Batch3D} This object.
 * @instance
 */
H3DU.Batch3D.prototype.perspectiveAspect = function(fov, near, far) {
  "use strict";
  this._projectionUpdater = new H3DU.Batch3D._PerspectiveView(this, fov, near, far);
  return this;
};
/**
 * Sets this batch's view matrix to represent a camera view.
 * This method takes a camera's position (<code>eye</code>), and the point the camera is viewing
 * (<code>center</code>).
 * @param {Array<Number>} eye A 3-element vector specifying
 * the camera position in world space.
 * @param {Array<Number>} [center] A 3-element vector specifying
 * the point in world space that the camera is looking at. May be null or omitted,
 * in which case the default is the coordinates (0,0,0).
 * @param {Array<Number>} [up] A 3-element vector specifying
 * the direction from the center of the camera to its top. This parameter may
 * be null or omitted, in which case the default is the vector (0, 1, 0),
 * the vector that results when the camera is held upright. This
 * vector must not point in the same or opposite direction as
 * the camera's view direction. (For best results, rotate the vector (0, 1, 0)
 * so it points perpendicular to the camera's view direction.)
 * @returns {H3DU.Batch3D} This object.
 * @instance
 */
H3DU.Batch3D.prototype.setLookAt = function(eye, center, up) {
  "use strict";
  return this.setViewMatrix(H3DU.Math.mat4lookat(eye, center, up));
};
/**
 * Uses an orthographic projection for this batch. It will be adjusted
 * to the scene's aspect ratio each time this batch is rendered.<p>
 * In this projection, the left clipping plane is parallel to the right clipping
 * plane and the top to the bottom.<p>
 * If the view rectangle's aspect ratio doesn't match the desired aspect
 * ratio, the view rectangle will be centered on the 3D scene's viewport
 * or otherwise moved and scaled so as to keep the entire view rectangle visible without stretching
 * or squishing it.
 * @param {Number} l Leftmost coordinate of the view rectangle.
 * @param {Number} r Rightmost coordinate of the view rectangle.
 * (Note that right can be greater than left or vice versa.)
 * @param {Number} b Bottommost coordinate of the view rectangle.
 * @param {Number} t Topmost coordinate of the view rectangle.
 * (Note that top can be greater than bottom or vice versa.)
 * @param {Number} e Distance from the camera to the near clipping
 * plane. A positive value means the plane is in front of the viewer.
 * @param {Number} f Distance from the camera to the far clipping
 * plane. A positive value means the plane is in front of the viewer.
 * (Note that near can be greater than far or vice versa.) The absolute difference
 * between near and far should be as small as the application can accept.
 * @returns {H3DU.Batch3D} This object.
 * @instance
 */
H3DU.Batch3D.prototype.orthoAspect = function(l, r, b, t, e, f) {
  "use strict";
  this._projectionUpdater = new H3DU.Batch3D._OrthoView(this, l, r, b, t, e, f);
  return this;
};
/**
 * Uses a 2D orthographic projection for this batch. It will be adjusted
 * to the scene's aspect ratio each time this batch is rendered.<p>
 * The near and far clipping planes will be set to -1 and 1, respectively.<p>
 * If the view rectangle's aspect ratio doesn't match the desired aspect
 * ratio, the view rectangle will be centered on the 3D scene's viewport
 * or otherwise moved and scaled so as to keep the entire view rectangle visible without stretching
 * or squishing it.
 * @param {Number} l Leftmost coordinate of the view rectangle.
 * @param {Number} r Rightmost coordinate of the view rectangle.
 * (Note that right can be greater than left or vice versa.)
 * @param {Number} b Bottommost coordinate of the view rectangle.
 * @param {Number} t Topmost coordinate of the view rectangle.
 * (Note that top can be greater than bottom or vice versa.)
 * @returns {H3DU.Batch3D} This object.
 * @instance
 */
H3DU.Batch3D.prototype.ortho2DAspect = function(l, r, b, t) {
  "use strict";
  return this.orthoAspect(l, r, b, t, -1, 1);
};

/** @ignore */
H3DU.Batch3D.prototype._useShader = function(shader) {
  "use strict";
  // NOTE: This method is here for compatibility only
  // (see Scene3D#useFilter).
  this._globalShader = shader;
  return this;
};

/**
 * Sets the current view matrix for this batch of shapes.
 * @param {Array<Number>} mat A 4x4 matrix to use as the view matrix.
 * @returns {H3DU.Batch3D} This object.
 * @instance
 */
H3DU.Batch3D.prototype.setViewMatrix = function(mat) {
  "use strict";
  if(!H3DU.Batch3D._isSameMatrix(this._viewMatrix, mat)) {
    this._viewMatrix = mat.slice(0, 16);
    this._frustum = null;
  }
  return this;
};
/**
 * Gets the current projection matrix for this batch of shapes.
 * @returns {Array<Number>} A 4x4 matrix used as the current
 * projection matrix.
 * @instance
 */
H3DU.Batch3D.prototype.getProjectionMatrix = function() {
  "use strict";
  return this._projectionMatrix.slice(0, 16);
};

/**
 * Gets the current projection matrix multiplied by the current
 * view matrix for this batch of shapes.
 * @returns {Array<Number>} A 4x4 matrix used as the current
 * projection-view matrix.
 * @instance
 */
H3DU.Batch3D.prototype.getProjectionViewMatrix = function() {
  "use strict";
  return H3DU.Math.mat4multiply(
        this.getProjectionMatrix(), this.getViewMatrix());
};

/**
 * Gets the current view matrix for this batch of shapes.
 * @returns {Array<Number>} Return value.
 * @instance
 */
H3DU.Batch3D.prototype.getViewMatrix = function() {
  "use strict";
  return this._viewMatrix.slice(0, 16);
};
/** @ignore */
H3DU.Batch3D.prototype._getFrustum = function() {
  "use strict";
  if(typeof this._frustum === "undefined" || this._frustum === null) {
    var projView = H3DU.Math.mat4multiply(this._projectionMatrix, this._viewMatrix);
    this._frustum = H3DU.Math.mat4toFrustumPlanes(projView);
  }
  return this._frustum;
};
/**
 * Gets the light sources used by this batch.
 * @returns {H3DU.Lights} Return value.
 * @instance
 */
H3DU.Batch3D.prototype.getLights = function() {
  "use strict";
  return this.lights;
};

/**
 * Adds a 3D shape to this batch of shapes, at the end of the list
 * of shapes. Its reference, not a copy,
 * will be stored in the 3D scene's list of shapes.
 * Its parent will be set to no parent.
 * @param {H3DU.Shape|H3DU.ShapeGroup} shape A 3D shape.
 * Throws an error if null.
 * @returns {H3DU.Batch3D} This object.
 * @instance
 */
H3DU.Batch3D.prototype.addShape = function(shape) {
  "use strict";
  if(!shape)throw new Error();
  shape.parent = null;
  this.shapes.push(shape);
  return this;
};
/**
 * Returns the number of shapes and/or shape groups that
 * are direct children of this batch.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.Batch3D.prototype.shapeCount = function() {
  "use strict";
  return this.shapes.length;
};
/**
 * Gets the shape or shape group located
 * in this batch at the given index.
 * @param {Number} index Integer index, starting from 0, of the shape or shape group to set.
 * @returns {H3DU.Shape|H3DU.ShapeGroup} The shape or shape group located
 * in this batch at the given index, or null if none is found there.
 * @instance
 */
H3DU.Batch3D.prototype.getShape = function(index) {
  "use strict";
  return typeof this.shapes[index] === "undefined" ? null : this.shapes[index];
};
/**
 * Sets a shape or shape group at the given index in this batch.
 * @param {Number} index Integer index, starting from 0, to set the shape or shape group at.
 * @param {H3DU.Shape|H3DU.ShapeGroup} shape Shape object to set at the given index.
 * @returns {H3DU.Batch
 * @instance
 */
H3DU.Batch3D.prototype.setShape = function(index, shape) {
  "use strict";
  this.shapes[index] = shape;
  return this;
};

/**
 * Gets the number of vertices composed by
 * all shapes in this batch of shapes.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.Batch3D.prototype.vertexCount = function() {
  "use strict";
  var c = 0;
  for(var i = 0; i < this.shapes.length; i++) {
    c += this.shapes[i].vertexCount();
  }
  return c;
};
/**
 * Gets the number of primitives (triangles, lines,
 * and points) composed by all shapes in this batch of shapes.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.Batch3D.prototype.primitiveCount = function() {
  "use strict";
  var c = 0;
  for(var i = 0; i < this.shapes.length; i++) {
    c += this.shapes[i].primitiveCount();
  }
  return c;
};

/**
 * Removes all instances of a 3D shape from this batch of shapes.
 * @param {H3DU.Shape|H3DU.ShapeGroup} shape The 3D shape to remove.
 * @returns {H3DU.Batch3D} This object.
 * @instance
 */
H3DU.Batch3D.prototype.removeShape = function(shape) {
  "use strict";
  for(var i = 0; i < this.shapes.length; i++) {
    if(this.shapes[i] === shape) {
      this.shapes.splice(i, 1);
      i--;
    }
  }
  return this;
};

/** @ignore */
H3DU.Batch3D.prototype._renderShape = function(shape, renderContext) {
  "use strict";
  if(shape.constructor === H3DU.ShapeGroup) {
    if(!shape.visible)return;
    for(var i = 0; i < shape.shapes.length; i++) {
      this._renderShape(shape.shapes[i], renderContext);
    }
  } else if(!shape.isCulled(this._getFrustum())) {
    var prog = null;
    var flags = 0;
    if(typeof renderContext.shader !== "undefined" && renderContext.shader !== null) {
      prog = renderContext.scene._programs.getCustomProgram(
         renderContext.shader, renderContext.context);
    } else if(typeof this._globalShader !== "undefined" && this._globalShader !== null) {
      prog = renderContext.scene._programs.getCustomProgram(
         this._globalShader, renderContext.context);
    } else if((shape.material instanceof H3DU.Material || shape.material instanceof H3DU.PbrMaterial) &&
     shape.material.shader !== null) {
      prog = renderContext.scene._programs.getCustomProgram(
         shape.material.shader, renderContext.context);
    }
    flags = H3DU.Scene3D._flagsForShape(shape);
    if(typeof prog === "undefined" || prog === null) {
      prog = renderContext.scene._programs.getProgram(
           flags, renderContext.context);
    }
    if(typeof prog !== "undefined" && prog !== null) {
      if(renderContext.prog !== prog) {
        prog.use();
        new H3DU._LightsBinder(this.lights).bind(prog, this._viewMatrix);
        renderContext.prog = prog;
      }
      H3DU.Batch3D._setupMatrices(prog,
      this._projectionMatrix,
      this._viewMatrix,
      shape.getMatrix());
      H3DU.Batch3D._getMaterialBinder(shape.material).bind(prog,
      renderContext.context,
      renderContext.scene._textureLoader);
      renderContext.scene._meshLoader.draw(shape.meshBuffer, prog);
    }
  }
};

/** @ignore */
H3DU.Batch3D.prototype.resize = function(width, height) {
  "use strict";
  if(this._projectionUpdater) {
    this._projectionUpdater.update(width, height);
  }
};

/** @ignore */
H3DU.Batch3D.prototype.render = function(scene, pass) {
  "use strict";
  var rc = {};
  rc.scene = scene;
  rc.context = scene.getContext();
  rc.shader = pass ? pass.shader : null;
  for(var i = 0; i < this.shapes.length; i++) {
    this._renderShape(this.shapes[i], rc);
  }
  return this;
};
/**
 * Creates a batch whose purpose is to render the contents
 * of a frame buffer using a particular shader. This is often used
 * to apply a graphics filter to that frame buffer's contents.
 * See the {@tutorial filters} tutorial.
 * @param {H3DU.Scene3D} scene Scene to associate
 * with the returned batch.
 * @param {H3DU.FrameBufferInfo} fbo Identifies a frame buffer
 * whose contents will be rendered to the batch.
 * @param {H3DU.ShaderInfo} shader Contains information about
 * the shader to use when rendering the contents of the frame buffer
 * @returns {H3DU.Batch3D} The created batch.
 */
H3DU.Batch3D.forFilter = function(scene, fbo, shader) {
  "use strict";
  if(typeof shader === "undefined" || shader === null) {
    shader = H3DU.ShaderProgram.makeCopyEffect(scene);
  }
  var ret = new H3DU.Batch3D();
  var mesh = new H3DU.Mesh(
    [-1, 1, 0, 0, 1,
      -1, -1, 0, 0, 0,
      1, 1, 0, 1, 1,
      1, -1, 0, 1, 0],
     [0, 1, 2, 2, 1, 3],
     H3DU.Mesh.TEXCOORDS_BIT);
  var shape = new H3DU.Shape(mesh);
  shape.setTexture(fbo);
  shape.setShader(shader);
  ret.addShape(shape);
  return ret;
};
/** @ignore */
H3DU.Batch3D._getMaterialBinder = function(material) {
  "use strict";
  if(material && material instanceof H3DU.Material) {
    return new H3DU._MaterialBinder(material);
  }
  if(material && material instanceof H3DU.PbrMaterial) {
    return new H3DU._MaterialBinder(material);
  }
 // Return an empty binding object
  return {};
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU */
/**
 * Specifies parameters for geometry materials, which describe the appearance of a
 * 3D object. This includes how an object scatters, reflects, or absorbs light,
 * as well as a texture image to apply on that object's surface.<p>
 * NOTE: The default shader program assumes that all colors and the diffuse texture specified in this object are in
 * the [sRGB color space]{@link H3DU.Math.colorTosRGB}.
 * @class
 * @memberof H3DU
 * @param {Array<Number>} [params] An object as described in {@link H3DU.Material#setParams}.
 * <i>Using this parameter as a [color vector or string]{@link H3DU.toGLColor} giving the ambient color is deprecated
 * since version 2.0.</i>
 * @param {Array<Number>} [diffuse] A [color vector or string]{@link H3DU.toGLColor} giving the diffusion color (also called "albedo").
 * <i>This parameter is deprecated.</i>
 * @param {Array<Number>} [specular] A [color vector or string]{@link H3DU.toGLColor} giving the specular highlight reflection.
 * <i>This parameter is deprecated.</i>
 * @param {Array<Number>} [shininess] Specular highlight exponent of this material.
 * <i>This parameter is deprecated.</i>
 * @param {Array<Number>} [emission] A [color vector or string]{@link H3DU.toGLColor} giving the additive color emitted by an object.
 * <i>This parameter is deprecated.</i>
 */
H3DU.Material = function(params, diffuse, specular, shininess, emission) {
  "use strict";
 /** Specular highlight exponent of this material.
  * The greater the number, the more concentrated the specular
  * highlights are (and the smoother the material behaves).
  * The lower the number, the more extended the highlights are (and the rougher the material behaves).
  * Ranges from 0 through 128.
  * @default
  */
  this.shininess = 32;
 /** Ambient color of this material.<p>
  * Ambient color indicates how much an object's color is affected by ambient
  * lights, those that color pixels the same way regardless
  * of direction or distance.
  * Because every part of an object will be shaded the same way by ambient
  * colors, an object with just ambient color will not look much like a 3D object.<p>
  * (Ambient color simulates the effect of light being scattered multiple times
  * from the same surface.)</p>
  * This value is a 3-element array giving the red, green, and blue
  * components of the ambient color; the final ambient color depends
  * on the ambient color of the scene.
  * (0,0,0) means no ambient color,
  * and (1,1,1) means total ambient color.<p>
  * Setting ambient color and diffusion color to the same value usually defines an object's
  * color.<p>
  * @default
  */
  this.ambient = [0.2, 0.2, 0.2];
 /**
  * Diffusion color of this material (also called "albedo").
  * This is the generally perceived color of the material when
  * specular highlights are absent on the material's surface.
  * See also {@link H3DU.PbrMaterial#albedo}; this property corresponds
  * more closely to that in the metallic workflow rather than the specular
  * workflow.
  * @type {Array<Number>}
  * @default
  */
  this.diffuse = [0.8, 0.8, 0.8, 1.0];
 /**
  * Specular highlight reflection of this material.
  * This is usually a shade of gray (all three components are the same),
  * but can be colored if the material represents an uncoated metal of some sort.
  * See also {@link H3DU.PbrMaterial#specular}.
  * NOTE: Before version 2.0, this value's default was (0,0,0).
  * @type {Array<Number>}
  * @default
  */
  this.specular = [0.2, 0.2, 0.2];
 /**
  * Additive color emitted by objects with this material.
  * See {@link H3DU.PbrMaterial#emission}.
  * @type {Array<Number>}
  * @default
  */
  this.emission = [0, 0, 0]; // LATER: Support 4-component emissions (to support basic shading with alpha properly)
/**
 * Texture for this material. Each color in the texture
 * sets the diffusion (also called "albedo")
 * of each part of the material.
 * @default
 * @type {H3DU.Texture|H3DU.TextureInfo|H3DU.FrameBufferInfo}
 */
  this.texture = null;
/**
 * Specular map texture.
 * See {@link H3DU.PbrMaterial#specularMap}.
 * NOTE: If this property specifies a texture, this property will be used
 * for the specular reflection rather than the "specular" property. This behavior
 * is a change from versions earlier than 2.0, where this property, if present,
 * multiplied the value of the "specular" property.
 * @type {H3DU.Texture|H3DU.TextureInfo|H3DU.FrameBufferInfo}
 * @default
 */
  this.specularMap = null;
 /**
  * Normal map (bump map) texture. See {@link H3DU.PbrMaterial#normalMap}.
  * @type {H3DU.Texture|H3DU.TextureInfo|H3DU.FrameBufferInfo}
  * @default
  */
  this.normalMap = null;
 /**
  * Emission map texture.
  * @type {H3DU.Texture|H3DU.TextureInfo|H3DU.FrameBufferInfo}
  * @default
  */
  this.emissionMap = null; // LATER: Support 4-component emissions (to support basic shading with alpha properly)
 /**
  * Shader program to use when rendering objects with this material.
  * @default
  */
  this.shader = null;
  if(params && (params.constructor === Array || typeof params === "string")) {
    this.setParams({
      "ambient":params,
      "diffuse":diffuse,
      "specular":specular,
      "shininess":shininess,
      "emission":emission
    });
  } else if(typeof params !== "undefined" && params !== null) {
    this.setParams(params);
  }
};
/**
 * Clones this object's parameters to a new H3DU.Material
 * object and returns that object. The material's texture
 * maps and shader info, if any, won't be cloned, but rather, a reference
 * to the same object will be used.
 * @returns {H3DU.Material} A copy of this object.
 * @instance
 */
H3DU.Material.prototype.copy = function() {
  "use strict";
  return new H3DU.Material().setParams({
    "ambient":this.ambient,
    "diffuse":this.diffuse,
    "specular":this.specular,
    "shininess":this.shininess,
    "emission":this.emission,
    "texture":this.texture,
    "specularMap":this.specularMap,
    "normalMap":this.normalMap,
    "shader":this.shader
  });
};
/**
 * Creates a material with its emission color set to the given color.
 * The effect will be that objects with that material will be drawn in that
 * color without shading.
 * @returns {H3DU.Material} A new material with the given emission color.
 */
H3DU.Material.fromBasic = function(color) {
  "use strict";
  return new H3DU.Material({
    "shininess":1.0,
    "specular":[0, 0, 0],
    "diffuse":[0, 0, 0],
    "ambient":[0, 0, 0],
    "texture":null,
    "specularMap":null,
    "normalMap":null,
    "emission":color,
    "emissionMap":null
  });
};
/**
 * Creates a material with its emission texture set to the given texture.
 * The effect will be that objects with that material will be drawn in that
 * texture without shading.
 * @returns {H3DU.Material} A new material with the given emission texture.
 */
H3DU.Material.fromBasicTexture = function(texture) {
  "use strict";
  return new H3DU.Material({
    "shininess":1.0,
    "specular":[0, 0, 0],
    "diffuse":[0, 0, 0],
    "ambient":[0, 0, 0],
    "texture":null,
    "specularMap":null,
    "normalMap":null,
    "emission":[0, 0, 0],
    "emissionMap":texture
  });
};

/**
 * Sets parameters for this material object.
 * @param {Object} params An object whose keys have
 * the possibilities given below, and whose values are those
 * allowed for each key.<ul>
 * <li><code>ambient</code> - A [color vector or string]{@link H3DU.toGLColor} giving the ambient color. (See {@link H3DU.Material#ambient}.)
 * The default is (0.2, 0.2, 0.2).
 * <li><code>diffuse</code> - A [color vector or string]{@link H3DU.toGLColor} giving
 * the diffusion color (also called "albedo"). (See {@link H3DU.Material#diffuse}.) The default is (0.8, 0.8, 0.8).
 * <li><code>specular</code> - A [color vector or string]{@link H3DU.toGLColor} giving
 * the specular reflection. (See {@link H3DU.Material#specular}.) The default is (0,0,0), meaning no specular highlights.
 * <li><code>shininess</code> - Specular reflection exponent. (See {@link H3DU.Material#shininess}).
 * Ranges from 0 through 128. The default is 0.
 * <li><code>emission</code> - A [color vector or string]{@link H3DU.toGLColor} giving
 * the additive color. (See {@link H3DU.Material#emission}.) If this is an array, its numbers can
 * range from -1 to 1. The default is (0,0,0).
 * <li><code>texture</code> - {@link H3DU.Texture} object, {@link H3DU.TextureInfo} object, {@link H3DU.FrameBufferInfo} object, ora string with the URL of the texture
 * to use. Can be null.
 * <li><code>specularMap</code> - Specular map texture, taking the same types as the "texture" parameter (see {@link H3DU.Material#specularMap}). Can be null.
 * <li><code>normalMap</code> - Normal map texture, taking the same types as the "texture" parameter (see {@link H3DU.Material#normalMap}). Can be null.
 * <li><code>emissionMap</code> - Emission map texture, taking the same types as the "texture" parameter (see {@link H3DU.Material#emissionMap}). Can be null.
 * <li><code>shader</code> - {@link H3DU.ShaderInfo} object for a WebGL shader program
 * to use when rendering objects with this material. <i>Using {@link H3DU.ShaderProgram} objects in
 * this parameter is deprecated.</i>
 * </ul>
 * Any or all of these keys can exist in the parameters object. If a value is null or undefined, it is ignored
 * unless otherwise noted.
 * @returns {H3DU.Material} This object.
 * @instance
 */
H3DU.Material.prototype.setParams = function(params) {
  "use strict";
  if(typeof params.ambient !== "undefined" && params.ambient !== null) {
    this.ambient = H3DU.toGLColor(params.ambient);
    if(this.ambient.length > 3)this.ambient = this.ambient.slice(0, 3);
  }
  if(typeof params.diffuse !== "undefined" && params.diffuse !== null) {
    this.diffuse = H3DU.toGLColor(params.diffuse);
    if(this.diffuse.length > 4)this.diffuse = this.diffuse.slice(0, 4);
  }
  if(typeof params.specular !== "undefined" && params.specular !== null) {
    this.specular = H3DU.toGLColor(params.specular);
    if(this.specular.length > 3)this.specular = this.specular.slice(0, 3);
  }
  if(typeof params.emission !== "undefined" && params.emission !== null) {
    this.emission = H3DU.toGLColor(params.emission);
    if(this.emission.length > 3)this.emission = this.emission.slice(0, 3);
  }
  if(typeof params.shininess !== "undefined" && params.shininess !== null) {
    this.shininess = Math.min(Math.max(0, params.shininess), 128);
  }
  if(typeof params.texture !== "undefined") {
    this.texture = H3DU.TextureInfo._texInfoOrString(params.texture);
  }
  if(typeof params.specularMap !== "undefined") {
    this.specularMap = H3DU.TextureInfo._texInfoOrString(params.specularMap);
  }
  if(typeof params.normalMap !== "undefined") {
    this.normalMap = H3DU.TextureInfo._texInfoOrString(params.normalMap);
  }
  if(typeof params.emissionMap !== "undefined") {
    this.emissionMap = H3DU.TextureInfo._texInfoOrString(params.emissionMap);
  }
  if(typeof params.shader !== "undefined" && params.shader !== null) {
    this.shader = params.shader;
  }
  return this;
};
/** Convenience method that returns an {@link H3DU.Material}
 * object from an RGBA color.
 * @param {Array<Number>|number|string} r A [color vector or string]{@link H3DU.toGLColor},
 * or the red color component (0-1).
 * @param {Number} g Green color component (0-1).
 * May be null or omitted if a string or array is given as the "r" parameter.
 * @param {Number} b Blue color component (0-1).
 * May be null or omitted if a string or array is given as the "r" parameter.
 * @param {Number} [a] Alpha color component (0-1).
 * If the "r" parameter is given and this parameter is null or omitted,
 * this value is treated as 1.0.
 * @returns {H3DU.Material} The resulting material object.
 */
H3DU.Material.fromColor = function(r, g, b, a) {
  "use strict";
  var color = H3DU.toGLColor(r, g, b, a);
  return new H3DU.Material(color, color);
};

/** Convenience method that returns an {@link H3DU.Material}
 * object from a texture to apply to a 3D object's surface.
 * @param {H3DU.Texture|H3DU.TextureInfo|string} texture An {@link H3DU.Texture} object,
 * an {@link H3DU.TextureInfo} object, or a string with the
 * URL of the texture data. In the case of a string the texture will be loaded via
 * the JavaScript DOM's Image class. However, this method
 * will not load that image yet.
 * @returns {H3DU.Material} The resulting material object.
 */
H3DU.Material.fromTexture = function(texture) {
  "use strict";
  return new H3DU.Material({"texture":texture});
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU */
/**
 * Describes a frame buffer. In the HTML 3D Library,
 * each frame buffer consists of a texture of a given size and a <i>renderbuffer</i> of the same
 * size to use as the depth buffer.
 * @param {Number} width Width to use for the frame buffer.
 * Throws an error if this value is less than 0. The width will be set
 * to this value rounded up.
 * @param {Number} height Height to use for the frame buffer.
 * Throws an error if this value is less than 0. The height will be set
 * to this value rounded up.
 * @class
 * @memberof H3DU
 */
H3DU.FrameBufferInfo = function(width, height) {
  "use strict";
  if(width < 0 || height < 0)throw new Error("width or height negative");
  this.width = Math.ceil(width);
  this.height = Math.ceil(height);
};
/**
 * Changes the width and height of this frame buffer information object.
 * @param {Number} width New width to use for the frame buffer.
 * Throws an error if this value is less than 0. The width will be set
 * to this value rounded up.
 * @param {Number} height New height to use for the frame buffer.
 * Throws an error if this value is less than 0. The height will be set
 * to this value rounded up.
 * @returns {H3DU.FrameBufferInfo} This object.
 * @instance
 */
H3DU.FrameBufferInfo.prototype.resize = function(width, height) {
  "use strict";
  if(width < 0 || height < 0)throw new Error("width or height negative");
  width = Math.ceil(width);
  height = Math.ceil(height);
  this.width = width;
  this.height = height;
  return this;
};
/**
 * Gets the width to use for the frame buffer.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.FrameBufferInfo.prototype.getWidth = function() {
  "use strict";
  return this.width;
};
/**
 * Gets the height to use for the frame buffer.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.FrameBufferInfo.prototype.getHeight = function() {
  "use strict";
  return this.height;
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU, WebGL2RenderingContext */
/**
 * Contains classes that implement methods
 * binding certain HTML 3D Library objects
 * to WebGL contexts and programs.
 */

// /////////////////////

/** @ignore */
H3DU._MaterialBinder = function(mshade) {
  "use strict";
  this.mshade = mshade;
};
/** @ignore */
H3DU._MaterialBinder._textureSizeZeroZero = [0, 0];
/** @ignore */
H3DU._MaterialBinder.prototype.bind = function(program, context, loader) {
  "use strict";
  if(!this.mshade)return this;
  var mat = this.mshade;
  var diffuse = typeof mat.albedo !== "undefined" && mat.albedo !== null ? mat.albedo : mat.diffuse;
  var uniforms = {
    "textureSize":H3DU._MaterialBinder._textureSizeZeroZero,
    "md":diffuse.length === 4 ? diffuse :
    [diffuse[0], diffuse[1], diffuse[2],
      diffuse.length < 4 ? 1.0 : diffuse[3]]
  };
  if(!mat.basic) {
    if(typeof mat.shininess !== "undefined" && mat.shininess !== null)
      uniforms.mshin = mat.shininess;
    if(typeof mat.metalness !== "undefined" && mat.metalness !== null)
      uniforms.metalness = mat.metalness;
    if(typeof mat.roughness !== "undefined" && mat.roughness !== null)
      uniforms.roughness = mat.roughness;
    if(typeof mat.ambient !== "undefined" && mat.ambient !== null) {
      uniforms.ma = mat.ambient.length === 3 ? mat.ambient :
     [mat.ambient[0], mat.ambient[1], mat.ambient[2]];
    }
    uniforms.ms = mat.specular.length === 3 ? mat.specular :
     [mat.specular[0], mat.specular[1], mat.specular[2]];
    uniforms.me = mat.emission.length === 3 ? mat.emission :
     [mat.emission[0], mat.emission[1], mat.emission[2]];
  }
  program.setUniforms(uniforms);
  var sampler = 0;
  var textures = [];
  textures.push([typeof mat.albedoMap === "undefined" ? null : mat.albedoMap, "texture", "textureSize"]);
  textures.push([typeof mat.texture === "undefined" ? null : mat.texture, "texture", "textureSize"]);
  textures.push([typeof mat.specularMap === "undefined" ? null : mat.specularMap, "specularMap"]);
  textures.push([typeof mat.normalMap === "undefined" ? null : mat.normalMap, "normalMap"]);
  textures.push([typeof mat.metalnessMap === "undefined" ? null : mat.metalnessMap, "metalnessMap"]);
  textures.push([typeof mat.roughnessMap === "undefined" ? null : mat.roughnessMap, "roughnessMap"]);
  textures.push([typeof mat.environmentMap === "undefined" ? null : mat.environmentMap, "envMap"]);
  textures.push([typeof mat.emissionMap === "undefined" ? null : mat.emissionMap, "emissionMap"]);
  for(var i = 0; i < textures.length; i++) {
    if(typeof textures[i][0] !== "undefined" && textures[i][0] !== null) {
      var textureSizeName = typeof textures[i][2] === "undefined" ? null : textures[i][2];
      var tex = textures[i][0];
      var texInfo = tex instanceof H3DU.Texture ? tex._toInfo() : tex;
      H3DU._MaterialBinder.bindTexture(
          tex, texInfo, context, program,
          sampler++, loader, textures[i][1], textureSizeName);
    }
  }
  if(typeof mat.shader !== "undefined" && mat.shader !== null) {
    for(var k in mat.shader.uniformValues || {})
      if(Object.prototype.hasOwnProperty.call(mat.shader.uniformValues, k)) {
        var v = mat.shader.uniformValues[k];
        if(typeof v !== "undefined" && v !== null && v instanceof H3DU.TextureInfo) {
          H3DU._MaterialBinder.bindTexture(
    v, v, context, program,
          sampler++, loader, k, null);
        }
      }
  }
  return this;
};

// ////////////////////////

/** @ignore */
H3DU._LoadedTexture = function(texture, textureInfo, context) {
  "use strict";
  this._init(texture, textureInfo, context);
};
/** @ignore */
H3DU._LoadedTexture.textureFilters = function(context, texture, textureInfo, target) {
  "use strict";
  context.texParameteri(target,
        context.TEXTURE_MAG_FILTER, textureInfo.magFilter);
  // generate mipmaps for power-of-two textures
  if(typeof WebGL2RenderingContext !== "undefined" && WebGL2RenderingContext !== null && context instanceof WebGL2RenderingContext ||
     H3DU._isPowerOfTwo(texture.getWidth()) &&
      H3DU._isPowerOfTwo(texture.getHeight())) {
    context.generateMipmap(target);
  } else {
    // WebGL 1 non-power-of-two texture
    var filter = textureInfo.minFilter;
    if(filter === context.NEAREST_MIPMAP_NEAREST ||
        filter === context.NEAREST_MIPMAP_LINEAR)
      filter = context.NEAREST;
    if(filter === context.LINEAR_MIPMAP_NEAREST ||
        filter === context.LINEAR_MIPMAP_LINEAR)
      filter = context.LINEAR;
    context.texParameteri(target,
         context.TEXTURE_MIN_FILTER, filter);
    context.texParameteri(target,
        context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
    context.texParameteri(target,
        context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
  }
};

/** @ignore */
H3DU._LoadedTexture.prototype._init = function(texture, textureInfo, context) {
  "use strict";
  if(!texture.image)throw new Error();
  context = H3DU._toContext(context);
  this.context = context;
  this.loadedTexture = context.createTexture();
  context.activeTexture(context.TEXTURE0);
  // In WebGL, texture coordinates start at the upper left corner rather than
  // the lower left as in OpenGL and OpenGL ES. If the texture info indicates
  // top-down texture coordinates, no flipping is needed.
  // NOTE: Non-DOMElement recommends top-down.
  context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL,
  textureInfo.topDown ? 0 : 1);
  var target = textureInfo.target;
  context.bindTexture(target, this.loadedTexture);
  if("src" in texture.image) {
    context.texImage2D(target, 0,
      textureInfo.internalFormat, textureInfo.format, context.UNSIGNED_BYTE,
      texture.image);
  } else {
    context.texImage2D(target, 0,
     textureInfo.internalFormat, texture.getWidth(), texture.getHeight(), 0,
     textureInfo.format, context.UNSIGNED_BYTE, texture.image);
  }
  H3DU._LoadedTexture.textureFilters(context, texture, textureInfo, target);
};

/** @ignore */
H3DU._LoadedCubeMap = function(textureImage, context) {
  "use strict";
  context = H3DU._toContext(context);
  this.context = context;
  this.loadedTexture = context.createTexture();
  context.activeTexture(context.TEXTURE0);
  // In WebGL, texture coordinates start at the upper left corner rather than
  // the lower left as in OpenGL and OpenGL ES, but for cubemap textures,
  // there is little benefit in reestablishing the lower left corner
  context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, 0);
  var target = context.TEXTURE_CUBE_MAP;
  context.bindTexture(target, this.loadedTexture);
  for(var i = 0; i < 6; i++) {
    if("src" in textureImage.textures[i].image) {
      context.texImage2D(context.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0,
      context.RGBA, context.RGBA, context.UNSIGNED_BYTE,
      textureImage.textures[i].image);
    } else {
      context.texImage2D(context.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0,
     context.RGBA, textureImage.getWidth(), textureImage.getHeight(), 0,
     context.RGBA, context.UNSIGNED_BYTE, textureImage.image);
    }
  }
  H3DU._LoadedTexture.textureFilters(context, textureImage, new H3DU.TextureInfo(), target);
};

/** @ignore */
H3DU._LoadedTexture.prototype.dispose = function() {
  "use strict";
  if(this.loadedTexture && this.context) {
    this.context.deleteTexture(this.loadedTexture);
  }
  this.context = null;
  this.loadedTexture = null;
};
/** @ignore */
H3DU._LoadedCubeMap.prototype.dispose = function() {
  "use strict";
  if(this.loadedTexture && this.context) {
    this.context.deleteTexture(this.loadedTexture);
  }
  this.context = null;
  this.loadedTexture = null;
};
// ///////////////////////////////

/** @ignore */
H3DU._MaterialBinder.bindTexture = function(
  texture, textureInfo, context, program,
  textureUnit, loader, uniformName, sizeUniform) {
  "use strict";
  if(!(typeof textureInfo !== "undefined" && textureInfo !== null))throw new Error();
  if(typeof texture === "undefined" || texture === null) {
    if(context) {
      context.activeTexture(context.TEXTURE0 + textureUnit);
      context.bindTexture(context.TEXTURE_2D, null);
      context.bindTexture(context.TEXTURE_CUBE_MAP, null);
    }
    return;
  }
  var isFrameBuffer = texture instanceof H3DU.FrameBufferInfo;
  if(!isFrameBuffer &&
     !(texture instanceof H3DU.Texture) &&
     !(texture instanceof H3DU.CubeMap) &&
     !(texture instanceof H3DU.TextureInfo)) {
    throw new Error("unsupported texture type");
  }
  var loadedTexture = null;
  if(!isFrameBuffer) {
    if(texture instanceof H3DU.TextureInfo) {
      var infoTexture = loader.getTexture(texture.uri);
      if(typeof infoTexture === "undefined" || infoTexture === null) {
        var that = this;
        var prog = program;
        loader.loadAndMapTexture(texture, context).then(function() {
        // try again loading the image
          that.bind(prog, context, loader);
        });
      } else {
        texture = infoTexture;
      }
    }
    if(texture.loadStatus === 0) {
      that = this;
      prog = program;
      texture.loadImage().then(function() {
        // try again loading the image
        that.bind(prog, context, loader);
      });
      return;
    } else if(texture.loadStatus >= 2) {
      loadedTexture = loader._mapTextureWithInfo(texture, textureInfo, context);
    }
  } else {
    texture = loader.mapFrameBuffer(texture, context);
  }
  if (typeof loadedTexture !== "undefined" && loadedTexture !== null || isFrameBuffer) {
    var uniforms = {};
    uniforms[uniformName] = textureUnit;
    if(typeof sizeUniform !== "undefined" && sizeUniform !== null) {
      uniforms[sizeUniform] = [texture.getWidth(), texture.getHeight()];
    }
    program.setUniforms(uniforms);
    context.activeTexture(context.TEXTURE0 + textureUnit);
    if(isFrameBuffer) {
      context.bindTexture(context.TEXTURE_2D,
         texture.colorTexture);
      // TODO: support Textureinfo in frame buffers
      if(texture.colorTexture) {
        context.texParameteri(context.TEXTURE_2D,
         context.TEXTURE_MAG_FILTER, context.LINEAR);
        context.texParameteri(context.TEXTURE_2D,
         context.TEXTURE_MIN_FILTER, context.LINEAR);
        context.texParameteri(context.TEXTURE_2D,
         context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
        context.texParameteri(context.TEXTURE_2D,
         context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
      }
    } else {
      var target = texture instanceof H3DU.CubeMap ?
         context.TEXTURE_CUBE_MAP : textureInfo.target;
      context.bindTexture(target,
        loadedTexture.loadedTexture);
       // Set texture parameters
      loader._setMaxAnisotropy(context, target);
       // set magnification
      context.texParameteri(target,
        context.TEXTURE_MAG_FILTER, textureInfo.magFilter);
      if(typeof WebGL2RenderingContext !== "undefined" && WebGL2RenderingContext !== null && context instanceof WebGL2RenderingContext ||
     H3DU._isPowerOfTwo(texture.getWidth()) &&
      H3DU._isPowerOfTwo(texture.getHeight())) {
        context.texParameteri(target,
           context.TEXTURE_MIN_FILTER, textureInfo.minFilter);
        context.texParameteri(target,
          context.TEXTURE_WRAP_S, textureInfo.wrapS);
        context.texParameteri(target,
         context.TEXTURE_WRAP_T, textureInfo.wrapT);
      } else {
        // WebGL 1 non-power-of-two texture
        var filter = textureInfo.minFilter;
        if(filter === context.NEAREST_MIPMAP_NEAREST ||
        filter === context.NEAREST_MIPMAP_LINEAR)
          filter = context.NEAREST;
        if(filter === context.LINEAR_MIPMAP_NEAREST ||
        filter === context.LINEAR_MIPMAP_LINEAR)
          filter = context.LINEAR;
        context.texParameteri(target,
         context.TEXTURE_MIN_FILTER, filter);
        context.texParameteri(target,
          context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
        context.texParameteri(target,
         context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
      }
    }
  }
};

// ////////////////////////

/** @ignore */
H3DU._LightsBinder = function(lights) {
  "use strict";
  this.lights = lights;
};
H3DU._LightsBinder.emptyW1 = [0, 0, 0, 1];
H3DU._LightsBinder.emptyW0 = [0, 0, 0, 0];
H3DU._LightsBinder.emptyAtten = [1, 0, 0, 0];
/** @ignore */
H3DU._LightsBinder.prototype.bind = function(program, viewMatrix) {
  "use strict";
  var ltname;
  var lightsObject = this.lights;
  if(!lightsObject)return this;
  if(!program)return this;
  var uniforms = {};
  uniforms.sceneAmbient = lightsObject.sceneAmbient.length === 3 ?
    lightsObject.sceneAmbient : lightsObject.sceneAmbient.slice(0, 3);
  for(var i = 0; i < lightsObject.lights.length; i++) {
    var lt = lightsObject.lights[i];
    ltname = "lights[" + i + "]";
    uniforms[ltname + ".diffuse"] = lt.diffuse.length === 4 ?
    lt.diffuse : [lt.diffuse[0], lt.diffuse[1], lt.diffuse[2], 1];
    uniforms[ltname + ".specular"] = lt.specular.length === 4 ?
    lt.specular : [lt.specular[0], lt.specular[1], lt.specular[2], 1];
    var pos = H3DU.Math.mat4transform(viewMatrix, lightsObject.lights[i].position);
    uniforms[ltname + ".position"] = pos;
    uniforms[ltname + ".radius"] = [Math.max(0.0, lt.radius * lt.radius * lt.radius * lt.radius),
      0, 0, 0];
  }
 // Set empty values for undefined lights up to MAX_LIGHTS
  for(i = lightsObject.lights.length; i < H3DU.Lights.MAX_LIGHTS; i++) {
    ltname = "lights[" + i + "]";
    uniforms[ltname + ".diffuse"] = H3DU._LightsBinder.emptyW1;
    uniforms[ltname + ".specular"] = H3DU._LightsBinder.emptyW1;
    uniforms[ltname + ".position"] = H3DU._LightsBinder.emptyW0;
    uniforms[ltname + ".radius"] = H3DU._LightsBinder.emptyW0;
  }
  program.setUniforms(uniforms);
  return this;
};

// /////////////////////
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU, console */
/**
 * An object that associates a geometric mesh (the shape of the object) with
 * material data (which defines what is seen on the object's surface)
 * and a transformation matrix (which defines the object's position and size).
 * See the "{@tutorial shapes}" tutorial.<p>
 * NOTE: The default shader program assumes that all colors and the diffuse texture
 * specified in this object are in
 * the [sRGB color space]{@link H3DU.Math.colorTosRGB}.
 * @class
 * @memberof H3DU
 * @param {H3DU.MeshBuffer} mesh A mesh in the form of a buffer object.
 * Cannot be null. For {@link H3DU.Mesh} objects, the {@link H3DU.PbrMaterial}
 * created will use the mesh in its current state and won't
 * track future changes. <i>Using {@link H3DU.BufferedMesh} objects as the
 * parameter
 * is deprecated.</i>
 */
H3DU.Shape = function(mesh) {
  "use strict";
  if(typeof mesh === "undefined" || mesh === null)throw new Error("mesh is null");
  if(mesh instanceof H3DU.Mesh) {
    this.meshBuffer = new H3DU.MeshBuffer(mesh);
  } else if(mesh instanceof H3DU.BufferedMesh) {
    if(!H3DU.Shape._meshBufferWarning) {
      console.warn("Using an H3DU.BufferedMesh in H3DU.Shape objects is deprecated.");
      H3DU.Shape._meshBufferWarning = true;
    }
    this.meshBuffer = mesh._toMeshBuffer();
  } else {
    this.meshBuffer = mesh;
  }
  if(!(this.meshBuffer instanceof H3DU.MeshBuffer)) {
    throw new Error("Unsupported data type for mesh parameter (must be Mesh or MeshBuffer)");
  }
  this.transform = new H3DU.Transform();
  this.material = new H3DU.PbrMaterial();
  this.parent = null;
  this.visible = true;
};
/**
 * Returns a reference to the mesh buffer used by this shape.
 * @returns {H3DU.MeshBuffer} Return value.
 * @instance
 */
H3DU.Shape.prototype.getMeshBuffer = function() {
  "use strict";
  return this.meshBuffer;
};
/** @ignore */
H3DU.Shape._meshBufferWarning = false;
/**
 * Gets the number of vertices composed by
 * all shapes in this scene.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.Shape.prototype.vertexCount = function() {
  "use strict";
  return this.meshBuffer ? this.meshBuffer.vertexCount() : 0;
};
/**
 * Gets the number of primitives (triangles, lines,
 * and points) composed by all shapes in this scene.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.Shape.prototype.primitiveCount = function() {
  "use strict";
  return this.meshBuffer ? this.meshBuffer.primitiveCount() : 0;
};
/**
 * Sets whether this shape will be drawn on rendering.
 * @param {Boolean} value True if this shape will be visible; otherwise, false.
 * @returns {H3DU.Shape} This object.
 * @instance
 */
H3DU.Shape.prototype.setVisible = function(value) {
  "use strict";
  this.visible = !!value;
  return this;
};
/**
 * Gets whether this shape will be drawn on rendering.
 * @returns {Boolean} True if this shape will be visible; otherwise, false.
 * @instance
 */
H3DU.Shape.prototype.getVisible = function() {
  "use strict";
  return this.visible;
};
/**
 * Sets material parameters that give the shape a certain color.
 * (If a material is already defined, sets its ambient and diffusion
 * colors.)
 * However, if the mesh defines its own colors, those colors will take
 * precedence over the color given in this method.
 * @param {Array<Number>|number|string} r A [color vector or string]{@link H3DU.toGLColor},
 * or the red color component (0-1).
 * @param {Number} g Green color component (0-1).
 * May be null or omitted if a string or array is given as the "r" parameter.
 * @param {Number} b Blue color component (0-1).
 * May be null or omitted if a string or array is given as the "r" parameter.
 * @param {Number} [a] Alpha color component (0-1).
 * If the "r" parameter is given and this parameter is null or omitted,
 * this value is treated as 1.0.
 * @returns {H3DU.Shape} This object.
 * @instance
 */
H3DU.Shape.prototype.setColor = function(r, g, b, a) {
  "use strict";
  var c = H3DU.toGLColor(r, g, b, a);
  this._ensureMaterial().setParams({
    "ambient":c,
    "diffuse":c
  });
  return this;
};
/**
 * Sets material parameters that give the shape a texture with the given URL.
 * @param {String|H3DU.Texture|H3DU.TextureInfo|H3DU.FrameBuffer} name {@link H3DU.Texture} object, {@link H3DU.TextureInfo} object, or a string with the
 * URL of the texture data. In the case of a string the texture will be loaded via
 * the JavaScript DOM's Image class. However, this method
 * will not load that image if it hasn't been loaded yet. This parameter can also
 * be a {@link H3DU.FrameBuffer} object that refers to a frame buffer; this can be useful
 * if that frame buffer refers to a shader-generated texture (see the <code>procedtexture</code>
 * demo in the HTML 3D Library to see how this is done).
 * @returns {H3DU.Shape} This object.
 * @instance
 */
H3DU.Shape.prototype.setTexture = function(name) {
  "use strict";
  this._ensureMaterial().setParams({"texture":name});
  return this;
};
/**
 * Sets this shape's material to a shader with the given URL.
 * @param {H3DU.ShaderInfo} shader Source code for a WebGL
 * shader program. <i>Using a {@link H3DU.ShaderProgram} here
 * is deprecated.</i>
 * @returns {H3DU.Shape} This object.
 * @instance
 */
H3DU.Shape.prototype.setShader = function(shader) {
  "use strict";
  this._ensureMaterial().setParams({"shader":shader});
  return this;
};
/** @ignore */
H3DU.Shape.prototype._ensureMaterial = function() {
  "use strict";
  if(typeof this.material === "undefined" || this.material === null) {
    this.material = new H3DU.PbrMaterial();
  }
  return this.material;
};

/**
 * Sets this shape's material to the given texture, and its ambient and
 * diffuse parameters to the given color.
 * @param {String|H3DU.Texture|H3DU.TextureInfo} name {@link H3DU.Texture} object, {@link H3DU.TextureInfo} object, or a string with the
 * URL of the texture data. In the case of a string the texture will be loaded via
 * the JavaScript DOM's Image class. However, this method
 * will not load that image if it hasn't been loaded yet.
 * @param {Array<Number>|number|string} r A [color vector or string]{@link H3DU.toGLColor},
 * or the red color component (0-1).
 * @param {Number} g Green color component (0-1).
 * May be null or omitted if a string or array is given as the "r" parameter.
 * @param {Number} b Blue color component (0-1).
 * May be null or omitted if a string or array is given as the "r" parameter.
 * @param {Number} [a] Alpha color component (0-1).
 * If the "r" parameter is given and this parameter is null or omitted,
 * this value is treated as 1.0.
 * @returns {H3DU.Shape} This object.
 * @instance
 */
H3DU.Shape.prototype.setTextureAndColor = function(name, r, g, b, a) {
  "use strict";
  var c = H3DU.toGLColor(r, g, b, a);
  this._ensureMaterial().setParams({
    "texture":name,
    "ambient":c,
    "diffuse":c
  });
  return this;
};
/**
 * Sets this shape's material parameter object.
 * @param {H3DU.Material|H3DU.PbrMaterial} material The material object to use.
 * Throws an error if this parameter is null, is omitted, or is a {@link H3DU.Texture} object
 * @returns {H3DU.Shape} This object.
 * @instance
 */
H3DU.Shape.prototype.setMaterial = function(material) {
  "use strict";
  if(typeof material === "undefined" || material === null) {
    throw new Error();
  }
  if(material instanceof H3DU.Texture)
    throw new Error("Material parameter can't directly be a Texture");
  this.material = material;
  return this;
};
/**
 * Makes a copy of this object. The copied object
 * will have its own version of the transform and
 * material data, but any texture
 * image data and mesh buffers will not be duplicated,
 * but rather just references to them will be used.
 * The copied shape won't have a parent.
 * @returns {H3DU.Shape} A copy of this object.
 * @instance
 */
H3DU.Shape.prototype.copy = function() {
  "use strict";
  var ret = new H3DU.Shape(this.meshBuffer);
  ret.visible = this.visible;
  ret.parent = null;
  ret.material = this.material.copy();
  ret.transform = this.getTransform().copy();
  return ret;
};
/**
 * Returns the transform used by this shape object.
 * The transform won't be copied.
 * @returns {H3DU.Transform} Return value.
 * @instance
 */
H3DU.Shape.prototype.getTransform = function() {
  "use strict";
  return this.transform;
};
/**
 * Returns the material used by this shape object.
 * The material won't be copied.
 * @returns {H3DU.Material|H3DU.PbrMaterial} Return value.
 * @instance
 */
H3DU.Shape.prototype.getMaterial = function() {
  "use strict";
  return this.material;
};
/**
 * Finds a bounding box that holds all vertices in this shape.
 * The bounding box is not guaranteed to be the
 * tightest, and the box will be transformed to world space
 * using this object's transform.
 * @returns {Array<Number>} An array of six numbers describing an
 * axis-aligned bounding box
 * that fits all vertices in the shape. The first three numbers
 * are the smallest-valued X, Y, and Z coordinates, and the
 * last three are the largest-valued X, Y, and Z coordinates.
 * If the shape has no vertices, returns the array [Inf, Inf, Inf, -Inf,
 * -Inf, -Inf].
 * @instance
 */
H3DU.Shape.prototype.getBounds = function() {
  "use strict";
  if(!this.meshBuffer) {
    var inf = Number.POSITIVE_INFINITY;
    return [inf, inf, inf, -inf, -inf, -inf];
  }
  var bounds = this.meshBuffer.getBounds();
  if(H3DU.Math.boxIsEmpty(bounds))return bounds;
  var matrix = this.getMatrix();
  if(H3DU.Math.mat4isIdentity(matrix)) {
    return bounds.slice(0, 6);
  } else if(matrix[1] === 0 && matrix[2] === 0 && matrix[3] === 0 &&
    matrix[4] === 0 && matrix[6] === 0 && matrix[7] === 0 && matrix[8] === 0 &&
    matrix[9] === 0 && matrix[11] === 0 && matrix[15] === 1) {
      // just a scale and/or translate
    var ret = [];
    var t2 = matrix[0];
    var t3 = matrix[12];
    ret[0] = t2 * bounds[0] + t3;
    var t4 = matrix[5];
    var t5 = matrix[13];
    ret[1] = t4 * bounds[1] + t5;
    var t6 = matrix[10];
    var t7 = matrix[14];
    ret[2] = t6 * bounds[2] + t7;
    var ret2 = [t2 * bounds[3] + t3, t4 * bounds[4] + t5, t6 * bounds[5] + t7];
    return [
      Math.min(ret[0], ret2[0]),
      Math.min(ret[1], ret2[1]),
      Math.min(ret[2], ret2[2]),
      Math.max(ret[0], ret2[0]),
      Math.max(ret[1], ret2[1]),
      Math.max(ret[2], ret2[2])
    ];
  } else {
   // rotation, shear, and/or non-affine transformation
    var boxVertices = [
      H3DU.Math.mat4projectVec3(matrix, bounds[0], bounds[1], bounds[2]),
      H3DU.Math.mat4projectVec3(matrix, bounds[0], bounds[1], bounds[5]),
      H3DU.Math.mat4projectVec3(matrix, bounds[0], bounds[4], bounds[2]),
      H3DU.Math.mat4projectVec3(matrix, bounds[0], bounds[4], bounds[5]),
      H3DU.Math.mat4projectVec3(matrix, bounds[3], bounds[1], bounds[2]),
      H3DU.Math.mat4projectVec3(matrix, bounds[3], bounds[1], bounds[5]),
      H3DU.Math.mat4projectVec3(matrix, bounds[3], bounds[4], bounds[2]),
      H3DU.Math.mat4projectVec3(matrix, bounds[3], bounds[4], bounds[5])
    ];
    var bv = boxVertices[0];
    var retval = [bv[0], bv[1], bv[2], bv[0], bv[1], bv[2]];
    for(var i = 1; i < 8; i++) {
      bv = boxVertices[i];
      retval[0] = Math.min(retval[0], bv[0]);
      retval[1] = Math.min(retval[1], bv[1]);
      retval[2] = Math.min(retval[2], bv[2]);
      retval[3] = Math.max(retval[3], bv[0]);
      retval[4] = Math.max(retval[4], bv[1]);
      retval[5] = Math.max(retval[5], bv[2]);
    }
    return retval;
  }
};
/** @ignore */
H3DU.Shape.prototype.isCulled = function(frustum) {
  "use strict";
  if(!this.meshBuffer || !this.visible)return true;
  return !H3DU.Math.frustumHasBox(frustum, this.getBounds());
};
/**
 * Sets this shape's transformation
 * to a copy of the given transformation.
 * @param {H3DU.Transform} transform The transformation to
 * set to a copy of.
 * @returns {H3DU.Shape} This object.
 * @instance
 */
H3DU.Shape.prototype.setTransform = function(transform) {
  "use strict";
  this.transform = transform.copy();
  return this;
};
/**
 * Sets the scale of this shape relative to its original
 * size. See {@link H3DU.Transform#setScale}
 * @param {number|Array<Number>} x Scaling factor for this object's width,
 * or a 3-element scaling array, as specified in {@link H3DU.Transform#setScale}.
 * @param {Number} y Scaling factor for this object's height.
 * @param {Number} z Scaling factor for this object's depth.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Shape.prototype.setScale = function(x, y, z) {
  "use strict";
  this.getTransform().setScale(x, y, z);
  return this;
};
/**
 * Sets the relative position of this shape from its original
 * position. See {@link H3DU.Transform#setPosition}
 * @param {number|Array<Number>} x X coordinate
 * or a 3-element position array, as specified in {@link H3DU.Transform#setScale}.
 * @param {Number} y Y coordinate.
 * @param {Number} z Z coordinate.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.Shape.prototype.setPosition = function(x, y, z) {
  "use strict";
  this.getTransform().setPosition(x, y, z);
  return this;
};
/**
 * Sets this object's rotation in the form of a [quaternion]{@tutorial glmath}.
 * See {@link H3DU.Transform#setQuaternion}.
 * @param {Array<Number>} quat A four-element array describing the rotation.
 * @returns {H3DU.Shape} This object.
 * @instance
 */
H3DU.Shape.prototype.setQuaternion = function(quat) {
  "use strict";
  this.getTransform().setQuaternion(quat);
  return this;
};
/**
 * Gets the transformation matrix used by this shape.
 * See {@link H3DU.Transform#getMatrix}.
 * @returns {Array<Number>} The current transformation matrix.
 * @instance
 */
H3DU.Shape.prototype.getMatrix = function() {
  "use strict";
  var xform = this.getTransform();
  var thisIdentity = xform.isIdentity();
  var mat;
  if(typeof this.parent === "undefined" || this.parent === null) {
    mat = xform.getMatrix();
  } else {
    var pmat = this.parent.getMatrix();
    if(thisIdentity) {
      mat = pmat;
    } else if(H3DU.Math.mat4isIdentity(pmat)) {
      mat = xform.getMatrix();
    } else {
      mat = H3DU.Math.mat4multiply(pmat, xform.getMatrix());
    }
  }
  return mat;
};
/* global H3DU */
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/**
 * A curve evaluator object for a parametric curve.<p>
 * A parametric curve is a curve whose points are based on a
 * parametric curve function. A curve function takes a number
 * (U) and returns a point (in 1, 2, 3 or more dimensions, but
 * usually 2 or 3) that lies on the curve. For example, in 3
 * dimensions, a curve function has the following form:<p>
 * <b>F</b>(u) = [ x(u), y(u), z(u) ]<p>
 * where x(u) returns an X coordinate, y(u) a Y coordinate,
 * and z(u) returns a Z coordinate.<p>
 * Specialized curves should subclass this class and implement
 * the methods mentioned in the "curve" parameter below.
 * @class
 * @memberof H3DU
 * @params {Object} curve A <b>curve evaluator object</b>, which is an object that must contain an <code>evaluate</code> method and may contain the <code>endPoints</code>, <code>velocity</code>, <code>accel</code>, <code>normal</code>, and/or <code>arcLength</code> methods, as described in the corresponding methods of this class.
 */
H3DU.Curve = function(curve) {
  "use strict";
  this.curve = (typeof curve==="undefined" ? null : (curve));
};
/**
 * Returns the starting and ending U coordinates of this curve.
 * @returns A two-element array. The first element is the starting coordinate of
 * the curve, and the second is its ending coordinate.
 * Returns <code>[0, 1]</code> if the evaluator doesn't implement an <code>endPoints</code>
 * method.
 * @instance
 */
H3DU.Curve.prototype.endPoints = function() {
  "use strict";
  if((typeof this.curve!=="undefined" && this.curve!==null) && typeof this.curve.endPoints !== "undefined" && this.curve.endPoints !== null) {
    return this.curve.endPoints();
  } else {
    return [0, 1];
  }
};
/** @ignore */
H3DU.Curve._EPSILON = 0.00001;
/** @ignore */
H3DU.Curve._vecSubInPlace = function(vec, subVec) {
  "use strict";
  for(var i = 0; i < vec.length; i++) {
    vec[i] -= subVec[i];
  }
  return vec;
};
/** @ignore */
H3DU.Curve._vecScale = function(vec, scalar) {
  "use strict";
  var ret = [];
  for(var i = 0; i < vec.length; i++) {
    ret[i] = vec[i] * scalar;
  }
  return ret;
};
/** @ignore */
H3DU.Curve._vecSubScaleInPlace = function(vec, subVec, scaleNum) {
  "use strict";
  for(var i = 0; i < vec.length; i++) {
    vec[i] = (vec[i] - subVec[i]) * scaleNum;
  }
  return vec;
};
/** @ignore */
H3DU.Curve._vecNormalizeInPlace = function(vec) {
  "use strict";
  var len = 0;
  for(var i = 0; i < vec.length; i++) {
    len += vec[i] * vec[i];
  }
  len = Math.sqrt(len);
  if(len !== 0) {
    for(i = 0; i < vec.length; i++) {
      len += vec[i] * vec[i];
    }
  }
  return vec;
};
/** @ignore */
H3DU.Curve._vecLength = function(vec) {
  "use strict";
  var dsq = 0;
  for(var i = 0; i < vec.length; i++) {
    dsq += vec[i] * vec[i];
  }
  return Math.sqrt(dsq);
};
/**
 * Finds the position of this curve at the given U coordinate.
 * @param {Number} u U coordinate of a point on the curve.
 * @returns {Array<Number>} An array describing a position. It should have at least as many
 * elements as the number of dimensions of the underlying curve.
 * @instance
 */
H3DU.Curve.prototype.evaluate = function(u) {
  "use strict";
  if((typeof this.curve!=="undefined" && this.curve!==null) && typeof this.curve.evaluate !== "undefined" && this.curve.evaluate !== null) {
    return this.curve.evaluate(u);
  } else {
    return [0, 0, 0];
  }
};
/**
 * Finds an approximate velocity vector at the given U coordinate of this curve.
 * The {@link H3DU.Curve} implementation of this method calls the evaluator's <code>velocity</code>
 * method if it implements it; otherwise, does a numerical differentiation using
 * the position (from the <code>evaluate</code> method).<p>
 * The <b>velocity</b> of a curve is a vector which is the derivative of the curve's position at the given coordinate.  The vector returned by this method <i>should not</i> be "normalized" to a [unit vector]{@tutorial glmath}.
 * @param {Number} u U coordinate of a point on the curve.
 * @returns {Array<Number>} An array describing a velocity vector. It should have at least as many
 * elements as the number of dimensions of the underlying curve.
 * @instance
 */
H3DU.Curve.prototype.velocity = function(u) {
  "use strict";
  if((typeof this.curve!=="undefined" && this.curve!==null) && typeof this.curve.velocity !== "undefined" && this.curve.velocity !== null) {
    return this.curve.velocity(u);
  } else {
    var du = H3DU.Curve._EPSILON;
    var vector = this.evaluate(u + du);
    if(vector[0] === 0 && vector[1] === 0 && vector[2] === 0) {
    // too abrupt, try the other direction
      du = -du;
      vector = this.evaluate(u + du);
    }
    return H3DU.Curve._vecSubScaleInPlace(vector, this.evaluate(u), 1.0 / du);
  }
};
/**
 * Finds an approximate acceleration vector at the given U coordinate of this curve.
 * The {@link H3DU.Curve} implementation of this method calls the evaluator's <code>accel</code>
 * method if it implements it; otherwise, does a numerical differentiation using
 * the velocity vector.<p>
 * The <b>acceleration</b> of a curve is a vector which is the second derivative of the curve's position at the given coordinate.  The vector returned by this method <i>should not</i> be "normalized" to a [unit vector]{@tutorial glmath}.
 * @param {Number} u U coordinate of a point on the curve.
 * @returns {Array<Number>} An array describing an acceleration vector. It should have at least as many
 * elements as the number of dimensions of the underlying curve.
 * @instance
 */
H3DU.Curve.prototype.accel = function(u) {
  "use strict";
  if((typeof this.curve!=="undefined" && this.curve!==null) && typeof this.curve.accel !== "undefined" && this.curve.accel !== null) {
    return this.curve.accel(u);
  } else {
    var du = H3DU.Curve._EPSILON;
    var vector = this.velocity(u + du);
    if(vector[0] === 0 && vector[1] === 0 && vector[2] === 0) {
    // too abrupt, try the other direction
      du = -du;
      vector = this.velocity(u + du);
    }
    return H3DU.Curve._vecSubScaleInPlace(vector, this.velocity(u), 1.0 / du);
  }
};
/**
 * Finds an approximate principal normal vector at the given U coordinate of this curve.
 * The {@link H3DU.Curve} implementation of this method calls the evaluator's <code>normal</code>
 * method if it implements it; otherwise, does a numerical differentiation using the velocity vector.<p>
 * The <b>principal normal</b> of a curve is the derivative of the "normalized" velocity
 * vector divided by that derivative's length. The normal returned by this method
 * <i>should</i> be "normalized" to a [unit vector]{@tutorial glmath}. (Compare with {@link H3DU.Surface#gradient}.)
 * @param {Number} u U coordinate of a point on the curve.
 * @returns {Array<Number>} An array describing a normal vector. It should have at least as many
 * elements as the number of dimensions of the underlying curve.
 * @instance
 */
H3DU.Curve.prototype.normal = function(u) {
  "use strict";
  if((typeof this.curve!=="undefined" && this.curve!==null) && typeof this.curve.normal !== "undefined" && this.curve.normal !== null) {
    return this.curve.normal(u);
  } else {
    var du = H3DU.Curve._EPSILON;
    var vector = H3DU.Curve._vecNormalizeInPlace(this.velocity(u + du));
    if(vector[0] === 0 && vector[1] === 0 && vector[2] === 0) {
    // too abrupt, try the other direction
      du = -du;
      vector = H3DU.Curve._vecNormalizeInPlace(this.velocity(u + du));
    }
    var tangent = H3DU.Curve._vecNormalizeInPlace(this.velocity(u));
    H3DU.Curve._vecSubInPlace(vector, tangent);
    return H3DU.Curve._vecNormalizeInPlace(vector);
  }
};

H3DU.Curve._legendreGauss24 = [
  0.12793819534675216, 0.06405689286260563,
  0.1258374563468283, 0.1911188674736163,
  0.12167047292780339, 0.3150426796961634,
  0.1155056680537256, 0.4337935076260451,
  0.10744427011596563, 0.5454214713888396,
  0.09761865210411388, 0.6480936519369755,
  0.08619016153195327, 0.7401241915785544,
  0.0733464814110803, 0.820001985973903,
  0.05929858491543678, 0.8864155270044011,
  0.04427743881741981, 0.9382745520027328,
  0.028531388628933663, 0.9747285559713095,
  0.0123412297999872, 0.9951872199970213
];
/**
 * Finds an approximate arc length (distance) between the start of this
 * curve and the point at the given U coordinate of this curve.
 * The {@link H3DU.Curve} implementation of this method calls the evaluator's <code>arcLength</code>
 * method if it implements it; otherwise, calculates a numerical integral using the velocity vector.<p>
 * The <b>arc length</b> function returns a number; if the curve is "smooth", this is the integral, from the starting point to <code>u</code>, of the length of the velocity vector.
 * @param {Number} u U coordinate of a point on the curve.
 * @returns {Array<Number>} The approximate arc length of this curve at the given U coordinate.
 * @instance
 */
H3DU.Curve.prototype.arcLength = function(u) {
  "use strict";
  if((typeof this.curve!=="undefined" && this.curve!==null) && typeof this.curve.arcLength !== "undefined" && this.curve.arcLength !== null) {
    return this.curve.arcLength(u);
  } else {
    var ep = this.endPoints();
    if(u === ep[0])return 0;
    var mn = Math.min(u, ep[0]);
    var mx = Math.max(u, ep[0]);
    var dir = u >= ep[0] ? 1 : -1;
    var bm = (mx - mn) * 0.5;
    var bp = (mx + mn) * 0.5;
    var ret = 0;
    var lg = H3DU.Curve._legendreGauss24;
    for(var i = 0; i < lg.length; i += 2) {
      var weight = lg[i];
      var abscissa = lg[i + 1];
      var x = this.velocity(bm * abscissa + bp);
      ret += weight * H3DU.Curve._vecLength(x);
      x = this.velocity(-bm * abscissa + bp);
      ret += weight * H3DU.Curve._vecLength(x);
    }
    return ret * bm * dir;
  }
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU */

/** @ignore */
H3DU.FrameBufferLoader = function() {
  "use strict";
  this._frameBuffers = [];
};
/** @ignore */
H3DU.FrameBufferLoader.prototype.mapFrameBuffer = function(info, context) {
  "use strict";
  var fb;
  for(var i = 0; i < this._frameBuffers.length; i++) {
    fb = this._frameBuffers[i];
    if(fb[0] === info && fb[1] === context) {
      if(info.width !== fb[3] || info.height !== fb[4]) {
  // Width and/or height given in frame buffer info
  // have changed, rebuild frame buffer
        fb[2].dispose();
        fb[2] = new H3DU.FrameBuffer(fb[1], info.width, info.height);
        fb[3] = info.width;
        fb[4] = info.height;
      }
      return fb[2];
    }
  }
  // console.log("mapping frame buffer")
  fb = new H3DU.FrameBuffer(context, info.width, info.height);
  this._frameBuffers.push([info, context, fb, info.width, info.height]);
  return fb;
};
/** @ignore */
H3DU.FrameBufferLoader.prototype.dispose = function() {
  "use strict";
  for(var i = 0; i < this._frameBuffers.length; i++) {
    this._frameBuffers[i][2].dispose();
  }
  this._frameBuffers = [];
};
/** @ignore */
H3DU.FrameBufferLoader.prototype.bind = function(info, context, textureUnit) {
  "use strict";
  if(typeof info !== "undefined" && info !== null) {
    var fc = this.mapFrameBuffer(info, context);
    // console.log("binding frame buffer to unit "+textureUnit)
    context.activeTexture(context.TEXTURE0 + textureUnit);
    context.bindFramebuffer(
    context.FRAMEBUFFER, fc.buffer);
    context.framebufferTexture2D(
   context.FRAMEBUFFER, context.COLOR_ATTACHMENT0,
   context.TEXTURE_2D, fc.colorTexture, 0);
    context.framebufferRenderbuffer(
   context.FRAMEBUFFER, context.DEPTH_ATTACHMENT,
   context.RENDERBUFFER, fc.depthbuffer);
    return fc;
  }
  return null;
};
/** @ignore */
H3DU.FrameBufferLoader.prototype.unbind = function(info, context) {
  "use strict";
  if(typeof info !== "undefined" && info !== null) {
    // console.log("unbinding frame buffer")
    context.framebufferTexture2D(
     context.FRAMEBUFFER, context.COLOR_ATTACHMENT0,
     context.TEXTURE_2D, null, 0);
    context.framebufferRenderbuffer(
     context.FRAMEBUFFER, context.DEPTH_ATTACHMENT,
     context.RENDERBUFFER, null);
    context.bindFramebuffer(
     context.FRAMEBUFFER, null);
  }
};
/**
 * Represents an off-screen frame buffer.<p>
 * When H3DU.FrameBuffer's
 * constructor is called, it will create a texture buffer with the given
 * width and height and a depth buffer with the same dimensions,
 * and will bind both to the frame buffer. The frame buffer currently
 * bound to the WebGL context will remain unchanged.
 * @deprecated This class is likely to become a private class.
 * Use the FrameBufferInfo class instead, which is not coupled to WebGL
 * contexts.
 * @class
 * @memberof H3DU
 * @param {WebGLRenderingContext|WebGL2RenderingContext|object} context
 * WebGL context to associate with this buffer, or an object, such as H3DU.Scene3D, that
 * implements a no-argument <code>getContext</code> method
 * that returns a WebGL context.
 * @param {Number} width Width, in pixels, of the frame buffer.
 * Fractional values are rounded up.
 * @param {Number} height Height, in pixels, of the frame buffer.
 * Fractional values are rounded up.
 */
H3DU.FrameBuffer = function(context, width, height) {
  "use strict";
  if(width < 0 || height < 0)throw new Error("width or height negative");
  context = context.getContext ? context.getContext() : context;
  this.context = context;
 // give the framebuffer its own texture unit, since the
 // shader program may bind samplers to other texture
 // units, such as texture unit 0
  this.textureUnit = 3;
  this._init(context, width, height);
};
/** @ignore */
H3DU.FrameBuffer.prototype._init = function(context, width, height) {
  "use strict";
  this.buffer = context.createFramebuffer();
 // create color texture
  this.colorTexture = context.createTexture();
 /** The frame buffer's width.
  * @readonly */
  this.width = Math.ceil(width);
 /** The frame buffer's height.
  * @readonly */
  this.height = Math.ceil(height);
  this.context.activeTexture(this.context.TEXTURE0 + this.textureUnit);
  this.context.bindTexture(this.context.TEXTURE_2D, this.colorTexture);
 // In WebGL, texture coordinates start at the upper left corner rather than
 // the lower left as in OpenGL and OpenGL ES, so we use this method call
 // to reestablish the lower left corner.
  this.context.pixelStorei(this.context.UNPACK_FLIP_Y_WEBGL, 1);
  this.context.texImage2D(this.context.TEXTURE_2D, 0,
   this.context.RGBA, this.width, this.height, 0,
   this.context.RGBA, this.context.UNSIGNED_BYTE, null);
 // set essential parameters now to eliminate warnings (will
 // be set again as the texture is bound)
  this.context.texParameteri(this.context.TEXTURE_2D,
   this.context.TEXTURE_MAG_FILTER, this.context.NEAREST);
  this.context.texParameteri(this.context.TEXTURE_2D,
   this.context.TEXTURE_MIN_FILTER, this.context.NEAREST);
  this.context.texParameteri(this.context.TEXTURE_2D,
   this.context.TEXTURE_WRAP_S, this.context.CLAMP_TO_EDGE);
  this.context.texParameteri(this.context.TEXTURE_2D,
   this.context.TEXTURE_WRAP_T, this.context.CLAMP_TO_EDGE);
 // create depth renderbuffer
  this.depthbuffer = this.context.createRenderbuffer();
  var oldBuffer = this.context.getParameter(
   context.FRAMEBUFFER_BINDING);
  this.context.bindFramebuffer(
   context.FRAMEBUFFER, this.buffer);
  this.context.bindRenderbuffer(
   context.RENDERBUFFER, this.depthbuffer);
  this.context.renderbufferStorage(
   context.RENDERBUFFER, context.DEPTH_COMPONENT16,
   this.width, this.height);
  this.context.bindFramebuffer(
   context.FRAMEBUFFER, oldBuffer);
};
/**
 * Resizes the frame buffer to a new width and height,
 * if either differs from the current width or height.
 * @param {Number} width New width, in pixels, of the frame buffer.
 * Fractional values are rounded up.
 * @param {Number} height New height, in pixels, of the frame buffer.
 * Fractional values are rounded up.
 * @returns {H3DU.FrameBuffer} This object.
 * @instance
 */
H3DU.FrameBuffer.prototype.resize = function(width, height) {
  "use strict";
  width = Math.ceil(width);
  height = Math.ceil(height);
  if(width !== this.width || height !== this.height) {
    this.dispose();
    this._init(this.context, width, height);
  }
  return this;
};

/** @ignore */
H3DU.FrameBuffer.prototype.getWidth = function() {
  "use strict";
  return this.width;
};
/** @ignore */
H3DU.FrameBuffer.prototype.getHeight = function() {
  "use strict";
  return this.height;
};

/**
 * Gets the WebGL context associated with this frame buffer.
 * @returns {WebGLRenderingContext|WebGL2RenderingContext} Return value.
 * @instance
 */
H3DU.FrameBuffer.prototype.getContext = function() {
  "use strict";
  return this.context;
};
/**
 * Has no effect. (Previously, bound this frame buffer to the WebGL context associated with
 * it.)
 * @returns {H3DU.FrameBuffer} This object.
 * @instance
 */
H3DU.FrameBuffer.prototype.bind = function() {
  "use strict";
  console.log("FrameBuffer bind method has no effect.");
  return this;
};
/**
 * Has no effect. (Previously, unbound this frame buffer from its associated WebGL context.)
 * @returns {void} This method doesn't return a value.*
 * @instance
 */
H3DU.FrameBuffer.prototype.unbind = function() {
  "use strict";
  console.log("FrameBuffer unbind method has no effect.");
};
/**
 * Disposes all resources from this frame buffer object.
 * @returns {void} This method doesn't return a value.*
 * @instance
 */
H3DU.FrameBuffer.prototype.dispose = function() {
  "use strict";
  if(typeof this.buffer !== "undefined" && this.buffer !== null) {
    var oldBuffer = this.context.getParameter(
    this.context.FRAMEBUFFER_BINDING);
    if(oldBuffer === this.buffer) {
      this.unbind();
    }
    this.context.deleteFramebuffer(this.buffer);
  }
  if(typeof this.depthbuffer !== "undefined" && this.depthbuffer !== null) {
    this.context.deleteRenderbuffer(this.depthbuffer);
  }
  if(typeof this.colorTexture !== "undefined" && this.colorTexture !== null) {
    this.context.deleteTexture(this.colorTexture);
  }
  this.buffer = null;
  this.depthbuffer = null;
  this.colorTexture = null;
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU */
(function(global) {
  "use strict";
  function zeros(count) {
    var ret = [];
    for(var i = 0; i < count; i++) {
      ret.push(0);
    }
    return ret;
  }
  function linear(points, elementsPerValue, t) {
    var ret = [];
    var p0 = points[0];
    var p1 = points[1];
    for(var i = 0; i < elementsPerValue; i++) {
      var pp0 = p0[i];
      ret[i] = pp0 + (p1[i] - pp0) * t;
    }
    return ret;
  }
  function subtract(p1, p0, elementsPerValue) {
    var ret = [];
    for(var i = 0; i < elementsPerValue; i++) {
      ret[i] = p1[i] - p0[i];
    }
    return ret;
  }
  function bezierCubic(points, elementsPerValue, t) {
    var ret = [];
    var p0 = points[0];
    var p1 = points[1];
    var p2 = points[2];
    var p3 = points[3];
    for(var i = 0; i < elementsPerValue; i++) {
      ret[i] = (((3 - t) * t - 3) * t + 1) * p0[i] + ((3 * t - 6) * t + 3) * t * p1[i] + (-3 * t + 3) * t * t * p2[i] + t * t * t * p3[i];
    }
    return ret;
  }

  function bezierCubicDerivative(points, elementsPerValue, t) {
    var ret = [];
    var p0 = points[0];
    var p1 = points[1];
    var p2 = points[2];
    var p3 = points[3];
    for(var i = 0; i < elementsPerValue; i++) {
      ret[i] = ((-3 * t + 6) * t - 3) * p0[i] + ((9 * t - 12) * t + 3) * p1[i] + (-9 * t + 6) * t * p2[i] + 3 * t * t * p3[i];
    }
    return ret;
  }
  function bezierQuadratic(points, elementsPerValue, t) {
    var ret = [];
    var p0 = points[0];
    var p1 = points[1];
    var p2 = points[2];
    for(var i = 0; i < elementsPerValue; i++) {
      ret[i] = ((t - 2) * t + 1) * p0[i] + (-2 * t + 2) * t * p1[i] + t * t * p2[i];
    }
    return ret;
  }
  function bezierQuadraticDerivative(points, elementsPerValue, t) {
    var ret = [];
    var p0 = points[0];
    var p1 = points[1];
    var p2 = points[2];
    for(var i = 0; i < elementsPerValue; i++) {
      ret[i] = (2 * t - 2) * p0[i] + (-4 * t + 2) * p1[i] + 2 * t * p2[i];
    }
    return ret;
  }
/**
 * A [curve evaluator object]{@link H3DU.Curve} for a B&eacute;zier curve.<p>
 * @class
 * @augments H3DU.Curve
 * @deprecated Instead of this class, use {@link H3DU.BSplineCurve.fromBezierCurve}
 * to create a B&eacute;zier curve.
 * @memberof H3DU
 * @param {Array<Array<Number>>} cp An array of control points as specified in {@link H3DU.BSplineCurve.fromBezierCurve}.
 * @param {Number} [u1] No longer used since version 2.0. The starting and ending
 * points will be (0, 0). (This parameter was the starting point for the
 * purpose of interpolation.)
 * @param {Number} [u2] No longer used since version 2.0. The starting and ending
 * points will be (0, 0). (This parameter was the ending point for the
 * purpose of interpolation.)
 */
  H3DU.BezierCurve = function(cp) {
    this.curve = H3DU.BSplineCurve.clamped(cp, cp.length - 1, 0);
  };

  H3DU.BezierCurve.prototype=Object.assign(Object.create(H3DU.Curve.prototype),H3DU.BezierCurve.prototype);
/**
 * Returns the starting and ending U coordinates of this curve.
 * @returns {Array<Number>} A two-element array. The first and second
 * elements are the starting and ending U coordinates, respectively, of the curve.
 * @instance
 */
  H3DU.BezierCurve.prototype.endPoints = function() {
    return this.surface.endPoints();
  };
/**
 * Evaluates the curve function based on a point
 * in a B&eacute;zier curve.
 * @param {Number} u Point on the curve to evaluate (generally within the range
 * given in the constructor).
 * @returns {Array<Number>} An array of the result of
 * the evaluation. It will have as many elements as a control point, as specified in the constructor.
 * @example
 * // Generate 11 points forming the B&eacute;zier curve.
 * // Assumes the curve was created with u1=0 and u2=1 (the default).
 * var points=[];
 * for(var i=0;i<=10;i++) {
 * points.push(curve.evaluate(i/10.0));
 * }
 * @instance
 */
  H3DU.BezierCurve.prototype.evaluate = function(u) {
    return this.curve.evaluate(u);
  };
/**
 * A [surface evaluator object]{@link H3DU.SurfaceEval#vertex} for a B&eacute;zier surface.<p>
 * @deprecated Instead of this class, use {@link H3DU.BSplineSurface.fromBezierSurface}
 * to create a B&eacute;zier surface.
 * @class
 * @memberof H3DU
 * @param {Array<Array<Number>>} cp An array of control point
 * arrays as specified in {@link H3DU.BSplineSurface.fromBezierSurface}.
 * @param {Number} [u1] No longer used since version 2.0. The starting and ending
 * points will be (0, 0). (This parameter was the starting point for the
 * purpose of interpolation along the U axis.)
 * @param {Number} [u2] No longer used since version 2.0. The starting and ending
 * points will be (0, 0). (This parameter was the ending point for the
 * purpose of interpolation along the U axis.)
 * @param {Number} [v1] No longer used since version 2.0. The starting and ending
 * points will be (0, 0). (This parameter was the starting point for the
 * purpose of interpolation along the V axis.)
 * @param {Number} [v2] No longer used since version 2.0. The starting and ending
 * points will be (0, 0). (This parameter was the ending point for the
 * purpose of interpolation along the V axis.)
 */
  H3DU.BezierSurface = function(cp) {
    this.surface = H3DU.BSplineSurface.clamped(cp, cp[0].length - 1, cp.length - 1, 0);
  };

/**
 * Evaluates the surface function based on a point
 * in a B&eacute;zier surface.
 * @param {Number} u U coordinate of the surface to evaluate (generally within the range
 * given in the constructor).
 * @param {Number} v V coordinate of the surface to evaluate.
 * @returns {Array<Number>} An array of the result of
 * the evaluation. It will have as many elements as a control point, as specified in the constructor.
 * @instance
 */
  H3DU.BezierSurface.prototype.evaluate = function(u, v) {
    return this.surface.evaluate(u, v);
  };
/**
 * Returns the starting and ending U and V coordinates of this surface.
 * @returns {Array<Number>} A four-element array. The first and second
 * elements are the starting and ending U coordinates, respectively, of the surface, and the third
 * and fourth elements are its starting and ending V coordinates.
 * @instance
 */
  H3DU.BezierSurface.prototype.endPoints = function() {
    return this.surface.endPoints();
  };
/**
 * A [curve evaluator object]{@link H3DU.Curve} for a B-spline (basis spline) curve.
 * B-spline curves can also represent all B&eacute;zier curves (see {@link H3DU.BSplineCurve.fromBezierCurve}).
 * <p><b>B&eacute;zier Curves</b><p>
 * A B&eacute;zier curve is defined by a series of control points, where
 * the first and last control points define the end points of the curve, and
 * the remaining control points define the curve's shape, though they don't
 * necessarily cross the curve.<p>
 * @class
 * @augments H3DU.Curve
 * @memberof H3DU
 * @param {Array<Array<Number>>} controlPoints An array of control points. Each
 * control point is an array with the same length as the other control points.
 * It is assumed that the first control point's length represents the size of all the control
 * points.
 * @param {Array<Number>} knots Knot vector of the curve.
 * Its size must be at least 2 plus the number of control
 * points and not more than twice the number of control points.<br>
 * The length of this parameter minus 1, minus the number
 * of control points, represents the <i>degree</i> of the B-spline
 * curve. For example, a degree-3 (cubic) B-spline curve contains eight knots, that is,
 * four more knots than the number of control points (four). A degree of 1
 * results in straight line segments.<br>
 * The knot vector must be a monotonically nondecreasing sequence,
 * the first knot must not equal the last, and the same knot may not be repeated
 * more than N+1 times at the beginning and end of the vector, or more than
 * N times elsewhere, where N is the curve's degree.
 * If the difference between one knot and the next isn't the same,
 * the curve is considered a <i>non-uniform</i>B-spline curve. Usually the first
 * knot will be 0 or less and the last knot will be 1 or greater.<br>
 * If there are N times 2 knots with the first N knots equal to 0 and the rest
 * equal to 1, where N is the number of control points,
 * the control points describe a <i>B&eacute;zier</i> curve, in which the
 * first and last control points match the curve's end points.<p>
 * @param {Boolean} [bits] Bits for defining input
 * and controlling output. Zero or more of H3DU.BSplineCurve.WEIGHTED_BIT,
 * H3DU.BSplineCurve.HOMOGENEOUS_BIT,
 * and H3DU.BSplineCurve.DIVIDE_BIT. If null or omitted, no bits are set.
 */
  H3DU.BSplineCurve = function(controlPoints, knots, bits) {
    if(controlPoints.length <= 0)throw new Error();
    if(!knots)throw new Error();
    this.bits = bits || 0;
    this.controlPoints = controlPoints;
    if((this.bits & H3DU.BSplineCurve.WEIGHTED_BIT) !== 0 &&
   (this.bits & H3DU.BSplineCurve.HOMOGENEOUS_BIT) === 0) {
      // NOTE: WEIGHTED_BIT is deprecated; convert to homogeneous
      // for compatibility
      this.controlPoints = H3DU.BSplineCurve._convertToHomogen(this.controlPoints);
    }
    var order = knots.length - this.controlPoints.length;
    if(order < 1 || order > this.controlPoints.length)
      throw new Error();
    H3DU.BSplineCurve._checkKnots(knots, order - 1);
    var cplen = this.controlPoints[0].length;
    var cplenNeeded = 1;
    if((this.bits & H3DU.BSplineCurve.DIVIDE_BIT) !== 0) {
      cplenNeeded = 2;
    }
    if(cplen < cplenNeeded)throw new Error();
    this.fastBezier = false;
    if(order === controlPoints.length && order <= 4) {
      this.fastBezier = true;
      for(var i = 0; i < order; i++) {
        if(knots[0] !== 0) {
          this.fastBezier = false;
          break;
        }
      }
      for(i = order; this.fastBezier && i < knots.length; i++) {
        if(knots[0] !== 1) {
          this.fastBezier = false;
          break;
        }
      }
    }
    this.knots = knots;
    this.buffer = [];
    this.controlPoints = controlPoints;
  };

/**
 * Indicates whether the last coordinate of each control point is a
 * weight. If some of the weights differ, the curve is
 * considered a <i>rational</i> B-spline curve.
 * If this bit is set, points returned by the curve's <code>evaluate</code>
 * method will be in homogeneous coordinates.
 * @deprecated Support for this control point format may be dropped
 * in the future. Instead of using this bit, supply control points in homogeneous
 * coordinates (where each other coordinate is premultiplied by the last)
 * and use <code>DIVIDE_BIT</code> to convert the
 * results to conventional coordinates.
 * @const
 * @default
 */
  H3DU.BSplineCurve.WEIGHTED_BIT = 1;
/**
 * Indicates to divide each other coordinate of the returned point
 * by the last coordinate of the point and omit the last
 * coordinate. This is used to convert
 * homogeneous coordinates to conventional coordinates.
 * If this bit is set, the length of each control point must be at least 2.<p>
 * A B-spline curve that has control points whose last coordinate is other than
 * 1 is a <i>rational</i> B-spline curve.
 * @const
 * @default
 */
  H3DU.BSplineCurve.DIVIDE_BIT = 2;
/**
 * Indicates that each other coordinate of each control point
 * was premultiplied by the last coordinate of the point, that is,
 * each control point is in homogeneous coordinates.
 * Only used with WEIGHTED_BIT.
 * @deprecated This bit is deprecated because the B-spline
 * equation works the same whether control points are in conventional
 * coordinates or in homogeneous coordinates.
 * @const
 * @default
 */
  H3DU.BSplineCurve.HOMOGENEOUS_BIT = 4;
/**
 * Combination of WEIGHTED_BIT and DIVIDE_BIT.
 * @const
 * @deprecated Deprecated because WEIGHTED_BIT is deprecated.
 */
  H3DU.BSplineCurve.WEIGHTED_DIVIDE_BITS = 3;
/** @ignore */
  H3DU.BSplineCurve._checkKnots = function(knots, degree) {
    for(var i = 1; i < knots.length; i++) {
      if(knots[i] < knots[i - 1])
        throw new Error();
    }
    for(i = 1; i < knots.length - 2 - degree; i++) {
      if(knots[i + degree] <= knots[i])
        throw new Error();
    }
    if(knots[0] === knots[knots.length - 1] ||
       knots[0] >= knots[degree + 1])throw new Error();
    if(knots[knots.length - 2 - degree] >= knots[knots.length - 1])throw new Error();
    if(degree + 1 >= knots.length)throw new Error();
  };
/** @ignore */
  H3DU.BSplineCurve._nfunc = function(i, d, u, kn) {
    if(d === 0) {
      return kn[i] <= u && u < kn[i + 1] ? 1 : 0;
    }
    if(kn[i] > u)return 0;
    if(kn[i] === kn[i + d] && kn[i + d + 1] === kn[i + 1])return 0;
    if(kn[i + d + 1] < u)return 0;
    var v1 = kn[i] === kn[i + d] ? 0 : H3DU.BSplineCurve._nfunc(i, d - 1, u, kn);
    var v2 = kn[i + d + 1] === kn[i + 1] ? 0 : H3DU.BSplineCurve._nfunc(i + 1, d - 1, u, kn);
    if(v1 + v2 === 0) {
      return 0;
    }
    var ret = 0;
    if(v1 !== 0) {
      var den2 = kn[i + d] - kn[i];
      ret += (u - kn[i]) * v1 * (den2 === 0 ? 1 : 1.0 / den2);
    }
    if(v2 !== 0) {
      den2 = kn[i + d + 1] - kn[i + 1];
      ret += (kn[i + d + 1] - u) * v2 * (den2 === 0 ? 1 : 1.0 / den2);
    }
    return ret;
  };
/** @ignore */
  H3DU.BSplineCurve._getFactors = function(kn, t, degree, numPoints, buffer) {
    var multStart = 1;
    var multEnd = 1;
    for(var i = 0; i < numPoints; i++) {
      buffer[i] = 0;
    }
    for(i = 1; i < kn.length; i++) {
      if(kn[i] === kn[0]) {
        multStart += 1;
      } else {
        break;
      }
    }
    for(i = kn.length - 2; i >= 0; i--) {
      if(kn[i] === kn[kn.length - 1]) {
        multEnd += 1;
      } else {
        break;
      }
    }
    if(t >= kn[kn.length - 1 - degree] &&
        kn[kn.length - 1 - degree] === kn[kn.length - 1]) {
      buffer[numPoints - 1] = 1;
      return;
    }
    if(multStart !== degree + 1 || multEnd !== degree + 1) {
      // Not a clamped curve
      for(i = 0; i < numPoints; i++) {
        buffer[i] = H3DU.BSplineCurve._nfunc(i, degree, t, kn);
      }
      return;
    }
    if(t <= kn[degree]) {
      buffer[0] = 1;

    } else if(t >= kn[kn.length - 1 - degree]) {
      buffer[numPoints - 1] = 1;

    } else {
      var k = -1;
      for(i = 0; i <= kn.length; i++) {
        if(kn[i] <= t && t < kn[i + 1]) {
          k = i;
          break;
        }
      }
      if(k < 0)return;
      var numAfter = kn[k + 1] - t;
      var knotStart = kn[k];
      var numBefore = t - knotStart;
      buffer[k] = 1;
      for(var d = 1; d <= degree; d++) {
        var den = kn[k + 1] - kn[k - d + 1];
        buffer[k - d] = buffer[k - d + 1] * numAfter / den;
        for(i = k - d + 1; i < k; i++) {
          var kni = kn[i];
          buffer[i] *= (t - kni) / (kn[i + d] - kni);
          buffer[i] += buffer[i + 1] * (kn[i + d + 1] - t) / (kn[i + d + 1] - kn[i + 1]);
        }
        buffer[k] *= numBefore / (kn[k + d] - knotStart);
      }
    }
  };

/**
 * Evaluates the curve function based on a point
 * in a B-spline curve.
 * @param {Number} u Point on the curve to evaluate.
 * NOTE: Since version 2.0, this parameter is no longer scaled according
 * to the curve's knot vector. To get the curve's extents, call this object's
 * <code>endPoints</code> method.
 * @returns {Array<Number>} An array of the result of
 * the evaluation. Its length will be equal to the
 * length of a control point (minus 1 if DIVIDE_BIT is set), as specified in the constructor.
 * @example
 * // Generate 11 points forming the curve.
 * var points=[];
 * for(var i=0;i<=10;i++) {
 * points.push(curve.evaluate(i/10.0));
 * }
 * @instance
 */
  H3DU.BSplineCurve.prototype.evaluate = function(u) {
    var ret = [];
    if(this.fastBezier) {
      var cp = this.controlPoints;
      switch(cp.length) {
      case 1:
        ret = cp[0].slice(0, cp[0].length);
        break;
      case 2:
        ret = linear(cp, cp[0].length, u);
        break;
      case 3:
        ret = bezierQuadratic(cp, cp[0].length, u);
        break;
      case 4:
        ret = bezierCubic(cp, cp[0].length, u);
        break;
      default:
        break;
      }
    } else {
      var numPoints = this.controlPoints.length;
      var degree = this.knots.length - numPoints - 1;
      var elementsPerPoint = this.controlPoints[0].length;
      ret = null;
      if(u <= this.knots[degree]) {
        if(this.knots[degree] === this.knots[0]) {
          ret = this.controlPoints[0].slice(0, elementsPerPoint);
        } else {
          u = this.knots[degree];
        }
      } else if(u >= this.knots[this.knots.length - 1 - degree]) {
        if(this.knots[this.knots.length - 1 - degree] === this.knots[this.knots.length - 1]) {
          ret = this.controlPoints[numPoints - 1].slice(0, elementsPerPoint);
        } else {
          u = this.knots[this.knots.length - 1 - degree];
        }
      }

      if(typeof ret === "undefined" || ret === null) {
        var mult = 0;
        var index = -1;
        var i;
        for(i = 0; i < this.knots.length; i++) {
          var curKnot = this.knots[i];
          var isThisKnot = u === curKnot;
          if(isThisKnot)mult++;
          if(curKnot < this.knots[i + 1]) {
            if(isThisKnot) {
              index = i;
              break;
            } else if(curKnot < u && u < this.knots[i + 1]) {
              index = i;
              break;
            }
          }
        }
        if(index < 0)throw new Error();
        if(mult > degree)throw new Error();
        if(mult === degree) {
          ret = this.controlPoints[index - degree].slice(0, elementsPerPoint);
        } else {
          var h = degree - mult;
          var buffer = [];
          for(i = index - degree; i <= index - mult; i++) {
            buffer.push(this.controlPoints[i]);
          }
          for(var r = 1; r <= h; r++) {
            var lastPt = buffer[r - 1];
            for(i = r; i < buffer.length; i++) {
              var kindex = index - degree + i;
              var ki = this.knots[kindex];
              var a = (u - ki) / (this.knots[kindex + degree - r + 1] - ki);
              var thisPt = buffer[i];
              var newPt = [];
            // console.log("p"+[kindex,r]+"="+(1-a)+"*p"+[kindex-1,r-1]+"+"+(a)+"*p"+[kindex,r-1])
              for(var j = 0; j < elementsPerPoint; j++) {
                newPt[j] = lastPt[j] * (1 - a) + thisPt[j] * a;
              }
              buffer[i] = newPt;
              lastPt = thisPt;
            }
          }
          ret = buffer[buffer.length - 1].slice(0, elementsPerPoint);
        }
      }
    }
    if((this.bits & H3DU.BSplineCurve.DIVIDE_BIT) !== 0) {
      ret = H3DU.BSplineCurve._fromHomogen(ret);
    }
    return ret;
  };
/** @ignore */
  H3DU.BSplineCurve._splitKnots = function(knots, degree, u) {
    var lastFront = -1;
    var firstBack = -1;
    var front = [];
    var back = [];
    for(var i = 0; i < knots.length; i++) {
      if(knots[i] > u) {
        firstBack = i;
        break;
      } else if(knots[i] < u) {
        lastFront = i;
      }
    }
    if(lastFront < 0 || firstBack < 0)throw new Error();
    for(i = 0; i <= lastFront; i++) {
      front.push(knots[i]);
    }
    for(i = 0; i < degree + 1; i++) {
      front.push(u);
      back.push(u);
    }
    for(i = firstBack; i < knots.length; i++) {
      back.push(knots[i]);
    }
    return [front, back];
  };
/**
 * Splits this B-spline curve into two at the given point.
 * @param {Number} u Point on the curve where this curve will be split.
 * @returns {Array<H3DU.BSplineCurve>} An array containing two B-spline curves: the
 * first is the part of the curve before the given point, and the second
 * is the part of the curve after the given point. The first element
 * will be null if <code>u</code> is at or before the start of the curve.
 * The second element
 * will be null if <code>u</code> is at or after the end of the curve.
 * @instance
 */
  H3DU.BSplineCurve.prototype.split = function(u) {
    var numPoints = this.controlPoints.length;
    var degree = this.knots.length - numPoints - 1;
    var elementsPerPoint = this.controlPoints[0].length;
    var i;
    if(u <= this.knots[degree]) {
      return [null, this];
    } else if(u >= this.knots[this.knots.length - 1 - degree]) {
      return [this, null];
    }
    var mult = 0;
    var index = -1;
    for(i = 0; i < this.knots.length; i++) {
      var curKnot = this.knots[i];
      var isThisKnot = u === curKnot;
      if(isThisKnot)mult++;
      if(curKnot < this.knots[i + 1]) {
        if(isThisKnot) {
          index = i;
          break;
        } else if(curKnot < u && u < this.knots[i + 1]) {
          index = i;
          break;
        }
      }
    }
    if(index < 0)throw new Error();
    if(mult > degree)throw new Error();
    var newKnots = H3DU.BSplineCurve._splitKnots(this.knots, degree, u);
    var front = [];
    var backPoints = [];
    if(mult === degree) {
      front = this.controlPoints.slice(0, index - degree + 1);
      backPoints = this.controlPoints.slice(index - degree, this.controlPoints.length);
    } else {
      var h = degree - mult;
      var buffer = [];
      for(i = index - degree; i <= index - mult; i++) {
        buffer.push(this.controlPoints[i]);
      }
  // Start array of front points
      front = [];
      for(i = 0; i <= index - degree; i++) {
        front.push(this.controlPoints[i]);
      }
      var back = [];
      for(var r = 1; r <= h; r++) {
        var lastPt = buffer[r - 1];
        for(i = r; i < buffer.length; i++) {
          var kindex = index - degree + i;
          var ki = this.knots[kindex];
          var a = (u - ki) / (this.knots[kindex + degree - r + 1] - ki);
          var thisPt = buffer[i];
          var newPt = [];
          for(var j = 0; j < elementsPerPoint; j++) {
            newPt[j] = lastPt[j] * (1 - a) + thisPt[j] * a;
          }
          buffer[i] = newPt;
          lastPt = thisPt;
          if(i === r) {
            front.push(newPt);
          } else if(i + 1 === buffer.length) {
            back.push(newPt);
          }
        }
      }
  // Generate array of back points
      backPoints.push(front[front.length - 1]);
      for(i = back.length - 1; i >= 0; i--) {
        backPoints.push(back[i]);
      }
      for(i = index - mult; i < numPoints; i++) {
        backPoints.push(this.controlPoints[i]);
      }
    }
    var curve1 = new H3DU.BSplineCurve(front, newKnots[0], this.bits);
    var curve2 = new H3DU.BSplineCurve(backPoints, newKnots[1], this.bits);
    return [curve1, curve2];
  };

/**
 * Returns the starting and coordinates of this curve.
 * @returns {Array<Number>} A two-element array containing
 * the starting and ending U coordinates, respectively, of the curve.
 * @instance
 */
  H3DU.BSplineCurve.prototype.endPoints = function() {
    var numPoints = this.controlPoints.length;
    var degree = this.knots.length - numPoints - 1;
    return [this.knots[degree], this.knots[this.knots.length - 1 - degree]];
  };

/**
 * Gets a reference to the array of control points used
 * in this curve object.
 * @returns {Array<Array<Number>>} An object described in the constructor to {@link H3DU.BSplineCurve}.
 * @instance
 */
  H3DU.BSplineCurve.prototype.getPoints = function() {
    return this.controlPoints;
  };

/**
 * Finds the velocity (derivative) of
 * this curve at the given point.
 * @param {Number} u Point on the curve to evaluate.
 * @returns {Array<Number>} An array giving the velocity vector.
 * It will have as many elements as a control point (or one fewer
 * if DIVIDE_BIT is set), as specified in the constructor.
 * @instance
 */
  H3DU.BSplineCurve.prototype.velocity = function(u) {
    var ret = [];
    if(this.fastBezier) {
      var cp = this.controlPoints;
      switch(cp.length) {
      case 1:
        ret = zeros(cp[0].length);
        break;
      case 2:
        ret = subtract(cp[1], cp[0], cp[0].length);
        break;
      case 3:
        ret = bezierQuadraticDerivative(cp, cp[0].length, u);
        break;
      case 4:
        ret = bezierCubicDerivative(cp, cp[0].length, u);
        break;
      default:
        break;
      }
    } else {
      var numPoints = this.controlPoints.length;
      var degree = this.knots.length - numPoints - 1;
      var elementsPerPoint = this.controlPoints[0].length;
      H3DU.BSplineCurve._getFactors(this.knots, u, degree - 1, numPoints,
     this.buffer);
      var i, j;
      var coeffs = [];
      for(i = 0; i < numPoints; i++) {
        coeffs[i] = 0;
      }
      for(j = 0; j < numPoints - 1; j++) {
        var pix = degree * this.buffer[j + 1] / (this.knots[j + degree + 1] - this.knots[j + 1]);
        coeffs[j + 1] += pix;
        coeffs[j] -= pix;
      }
      for(i = 0; i < elementsPerPoint; i++) {
        var value = 0;
        for(j = 0; j < numPoints; j++) {
          value += coeffs[j] * this.controlPoints[j][i];
        }
        ret[i] = value;
      }
    }
    if((this.bits & H3DU.BSplineCurve.DIVIDE_BIT) !== 0) {
      ret = H3DU.BSplineCurve._fromHomogen(ret);
    }
    return ret;
  };

  /** @ignore */
  H3DU.BSplineCurve._convertToHomogen = function(cp) {
    var ret = [];
    var cplen = cp[0].length;
    for(var i = 0; i < cp.length; i++) {
      var outp = [];
      var w = cp[i][cplen - 1];
      for(var j = 0; j < cplen - 1; j++) {
        outp[j] = cp[i][j] * w;
      }
      outp[cplen - 1] = w;
      ret.push(outp);
    }
    return ret;
  };

/** @ignore */
  H3DU.BSplineCurve._fromHomogen = function(cp) {
    var cplen = cp.length;
    var div = 1.0 / cp[cplen - 1];
    for(var i = 0; i < cplen - 1; i++) {
      cp[i] /= div;
    }
    cp = cp.slice(0, cplen - 1);
    return cp;
  };
/**
 * A [surface evaluator object]{@link H3DU.SurfaceEval#vertex} for a B-spline (basis spline) surface.
 * B-spline surfaces can also represent all B&eacute;zier surfaces (see {@link H3DU.BSplineSurface.fromBezierSurface}).
 * A B&eacute;zier surface is defined by a series of control points, where
 * the control points on each corner define the end points of the surface, and
 * the remaining control points define the surface's shape, though they don't
 * necessarily cross the surface.
 * @class
 * @memberof H3DU
 * @param {Array<Array<Number>>} controlPoints An array of control point
 * arrays, which in turn contain a number of control points. Each
 * control point is an array with the same length as the other control points.
 * It is assumed that:<ul>
 * <li>The length of this parameter is the number of control points in each row of
 * the V axis.
 * <li>The length of the first control point array is the number of control points in
 * each column of the U axis.
 * <li>The first control point's length represents the size of all the control
 * points.
 * </ul>
 * @param {Array<Number>} knotsU Knot vector of the curve, along the U axis.
 * For more information, see {@link H3DU.BSplineCurve}.
 * @param {Array<Number>} knotsV Knot vector of the curve, along the V axis.
 * @param {Boolean} [bits] Bits for defining input
 * and controlling output. Zero or more of H3DU.BSplineCurve.WEIGHTED_BIT,
 * H3DU.BSplineCurve.HOMOGENEOUS_BIT,
 * and H3DU.BSplineCurve.DIVIDE_BIT. If null or omitted, no bits are set.
 */
  H3DU.BSplineSurface = function(controlPoints, knotsU, knotsV, bits) {
    var cpoints = controlPoints;
    this.bits = bits || 0;
    if((this.bits & H3DU.BSplineCurve.WEIGHTED_BIT) !== 0 &&
   (this.bits & H3DU.BSplineCurve.HOMOGENEOUS_BIT) === 0) {
      // NOTE: WEIGHTED_BIT is deprecated; convert to homogeneous
      // for compatibility
      cpoints = H3DU.BSplineSurface._convertToHomogen(cpoints);
    }
    var vcplen = cpoints.length;
    if(vcplen <= 0)throw new Error();
    var ucplen = cpoints[0].length;
    if(ucplen <= 0)throw new Error();
    var cplen = cpoints[0][0].length;
    var cplenNeeded = 1;
    if((this.bits & H3DU.BSplineCurve.DIVIDE_BIT) !== 0) {
      cplenNeeded = 2;
    }
    if(cplen < cplenNeeded)throw new Error();
    if(!knotsU || !knotsV)throw new Error();
    this.degreeU = knotsU.length - ucplen - 1;
    this.degreeV = knotsV.length - vcplen - 1;
    this.vcplen = vcplen;
    this.ucplen = ucplen;
    if(this.degreeU < 1 || this.degreeU + 1 > ucplen)throw new Error();
    if(this.degreeV < 1 || this.degreeV + 1 > vcplen)throw new Error();
    H3DU.BSplineCurve._checkKnots(knotsU, this.degreeU);
    H3DU.BSplineCurve._checkKnots(knotsV, this.degreeV);
    this.knotsU = knotsU;
    this.knotsV = knotsV;
    this.bufferU = [];
    this.bufferV = [];
    this.controlPoints = cpoints;
  };
/**
 * Creates a B-spline curve with uniform knots, except that
 * the curve will start and end at the first and last control points and will
 * be tangent to the line between the first and second control points
 * and to the line between the next-to-last and last control points.
 * @param {Array<Array<Number>>} controlPoints Array of
 * control points as specified in the {@link H3DU.BSplineCurve} constructor.
 * @param {Number} [degree] Degree of the B-spline
 * curve. For example, 3 means a degree-3 (cubic) curve.
 * If null or omitted, the default is 3.
 * @param {Number} [bits] Bits as specified in the {@link H3DU.BSplineCurve} constructor.
 * @returns {H3DU.BSplineCurve} Return value. The first
 * knot of the curve will be 0 and the last knot will be 1. (This is a change from previous
 * versions.)
 */
  H3DU.BSplineCurve.clamped = function(controlPoints, degree, bits) {
    return new H3DU.BSplineCurve(controlPoints,
   H3DU.BSplineCurve.clampedKnots(controlPoints.length, degree), bits);
  };

/**
 * Creates a B-spline curve from the control points of a B&eacute;zier curve.
 * @param {Array<Array<Number>>} cp An array of control points. Each
 * control point is an array with the same length as the other control points.
 * It is assumed that:<ul>
 * <li>The length of this parameter minus 1 represents the degree of the B&eacute;zier
 * curve. For example, a degree-3 (cubic) curve
 * contains 4 control points. A degree of 1 results in a straight line segment.
 * <li>The first control point's length represents the size of all the control
 * points.
 * </ul>
 * @param {Number} [bits] Bits as specified in the {@link H3DU.BSplineCurve} constructor.
 * @returns {H3DU.BSplineCurve} Return value.
 */
  H3DU.BSplineCurve.fromBezierCurve = function(controlPoints, bits) {
    return H3DU.BSplineCurve.clamped(controlPoints, controlPoints.length - 1, bits);
  };

  /**
   * Creates a B-spline curve with uniform knots.
   * @param {Array<Array<Number>>} controlPoints Array of
   * control points as specified in the {@link H3DU.BSplineCurve} constructor.
   * @param {Number} [degree] Degree of the B-spline
   * curve. For example, 3 means a degree-3 (cubic) curve.
   * If null or omitted, the default is 3.
   * @param {Number} [bits] Bits as specified in the {@link H3DU.BSplineCurve} constructor.
   * @returns {H3DU.BSplineCurve} Return value. The first
   * knot of the curve will be 0 and the last knot will be 1. (This is a change from previous
   * versions.)
   */
  H3DU.BSplineCurve.uniform = function(controlPoints, degree, bits) {
    return new H3DU.BSplineCurve(controlPoints,
   H3DU.BSplineCurve.uniformKnots(controlPoints.length, degree), bits);
  };

/**
 * Creates a B-spline surface with uniform knots, except that
 * the surface's edges lie on the edges of the control point array.
 * @param {Array<Array<Array<Number>>>} controlPoints Array of
 * control point arrays as specified in the {@link H3DU.BSplineSurface} constructor.
 * @param {Number} [degreeU] Degree of the B-spline
 * surface along the U axis. For example, 3 means a degree-3 (cubic) curve.
 * If null or omitted, the default is 3.
 * @param {Number} [degreeV] Degree of the B-spline
 * surface along the V axis
 * If null or omitted, the default is 3.
 * @param {Number} [bits] Bits as specified in the {@link H3DU.BSplineSurface} constructor.
 * @returns {H3DU.BSplineSurface} Return value. The first
 * knot of the curve will be 0 and the last knot will be 1. (This is a change from previous
 * versions.)
 */
  H3DU.BSplineSurface.clamped = function(controlPoints, degreeU, degreeV, bits) {
    return new H3DU.BSplineSurface(controlPoints,
   H3DU.BSplineCurve.clampedKnots(controlPoints[0].length, degreeU),
   H3DU.BSplineCurve.clampedKnots(controlPoints.length, degreeV), bits);
  };
/**
 * Creates a B-spline surface with uniform knots.
 * @param {Array<Array<Array<Number>>>} controlPoints Array of
 * control point arrays as specified in the {@link H3DU.BSplineSurface} constructor.
 * @param {Number} [degreeU] Degree of the B-spline
 * surface along the U axis. For example, 3 means a degree-3 (cubic) curve.
 * If null or omitted, the default is 3.
 * @param {Number} [degreeV] Degree of the B-spline
 * surface along the V axis
 * If null or omitted, the default is 3.
 * @param {Number} [bits] Bits as specified in the {@link H3DU.BSplineSurface} constructor.
 * @returns {H3DU.BSplineSurface} Return value. The first
 * knot of the curve will be 0 and the last knot will be 1. (This is a change from previous
 * versions.)
 */
  H3DU.BSplineSurface.uniform = function(controlPoints, degreeU, degreeV, bits) {
    return new H3DU.BSplineSurface(controlPoints,
   H3DU.BSplineCurve.uniformKnots(controlPoints[0].length, degreeU),
   H3DU.BSplineCurve.uniformKnots(controlPoints.length, degreeV), bits);
  };
/**
 * Generates a knot vector with uniform knots, to be
 * passed to the {@link H3DU.BSplineCurve} or {@link H3DU.BSplineCurve} constructor.
 * @param {Number} controlPoints Number of control points the curve will have.
 * @param {Number} degree Degree of the B-spline
 * curve. For example, 3 means a degree-3 (cubic) curve.
 * If null or omitted, the default is 3.
 * @returns {Array<Number>} A uniform knot vector. The first
 * knot will be 0 and the last knot will be 1. (This is a change from previous
 * versions.)
 */
  H3DU.BSplineCurve.uniformKnots = function(controlPoints, degree) {
    if(typeof controlPoints === "object")
      controlPoints = controlPoints.length;
    if(typeof degree === "undefined" || degree === null)degree = 3;
    if(controlPoints < degree + 1)
      throw new Error("too few control points for degree " + degree + " curve");
    var order = degree + 1;
    var ret = [];
    var scale = 1.0 / (controlPoints + order - 1);
    for(var i = 0; i < controlPoints + order; i++) {
      ret.push(i * scale);
    }
    return ret;
  };
/**
 * Generates a knot vector with uniform knots, to be
 * passed to the {@link H3DU.BSplineCurve} or {@link H3DU.BSplineCurve} constructor,
 * except that with the knot vector curve will start and end at the first and last control points and will
 * be tangent to the line between the first and second control points
 * and to the line between the next-to-last and last control points.
 * @param {Number} controlPoints Number of control points the curve will have.
 * @param {Number} degree Degree of the B-spline
 * curve. For example, 3 means a degree-3 (cubic) curve.
 * If null or omitted, the default is 3.
 * @returns {Array<Number>} A clamped uniform knot vector.
 * The first knot will be 0 and the last knot will be 1.
 * (This is a change in version 2.0.)
 */
  H3DU.BSplineCurve.clampedKnots = function(controlPoints, degree) {
    if(typeof controlPoints === "object")
      controlPoints = controlPoints.length;
    if(typeof degree === "undefined" || degree === null)degree = 3;
    if(controlPoints < degree + 1)
      throw new Error("too few control points for degree " + degree + " curve");
    var order = degree + 1;
    var extras = controlPoints - order;
    var ret = [];
    for(var i = 0; i < order; i++) {
      ret.push(0);
    }
    for(i = 0; i < extras; i++) {
      ret.push((i + 1) * 1.0 / (extras + 1));
    }
    for(i = 0; i < order; i++) {
      ret.push(1);
    }
    return ret;
  };

/**
 * Evaluates the surface function based on a point
 * in a B-spline surface.
 * @param {Number} u U coordinate of the surface to evaluate.
 * NOTE: Since version 2.0, this parameter and the "v" parameter
 * are no longer scaled according to the curve's knot vector.
 * To get the surface's extents, call this object's
 * <code>endPoints</code> method.
 * @param {Number} v V coordinate of the surface to evaluate.
 * @returns {Array<Number>} An array of the result of
 * the evaluation. It will have as many elements as a control point (or one fewer
 * if DIVIDE_BIT is set), as specified in the constructor.
 * @instance
 */
  H3DU.BSplineSurface.prototype.evaluate = function(u, v) {
    var elementsPerPoint = this.controlPoints[0][0].length;
    var bu = this.bufferU;
    var bv = this.bufferV;
    var tt, uu, i, value;
    H3DU.BSplineCurve._getFactors(this.knotsU, u, this.degreeU, this.ucplen,
     this.bufferU);
    H3DU.BSplineCurve._getFactors(this.knotsV, v, this.degreeV, this.vcplen,
     this.bufferV);
    var output = [];
    for(i = 0; i < elementsPerPoint; i++) {
      value = 0;
      for(tt = 0; tt < this.ucplen; tt++) {
        for(uu = 0; uu < this.vcplen; uu++) {
          value += this.controlPoints[uu][tt][i] * bu[tt] * bv[uu];
        }
      }
      output[i] = value;
    }
    if((this.bits & H3DU.BSplineCurve.DIVIDE_BIT) !== 0) {
      output = H3DU.BSplineCurve._fromHomogen(output);
    }
    return output;
  };
/**
 * Gets a reference to the array of control point arrays used
 * in this surface object.
 * @returns {Array<Array<Number>>} An object described in the constructor to {@link H3DU.BSplineCurve}.
 * @instance
 */
  H3DU.BSplineSurface.getPoints = function() {
    return this.controlPoints;
  };

/**
 * Finds the [tangent vector]{@link H3DU.SurfaceEval#vertex} at the
 * given point on the surface.
 * @param {Number} u U coordinate of the surface to evaluate.
 * @param {Number} v V coordinate of the surface to evaluate.
 * @returns {Array<Number>} An array giving the tangent vector.
 * It will have as many elements as a control point (or one fewer
 * if DIVIDE_BIT is set), as specified in the constructor.
 * @instance
 */
  H3DU.BSplineSurface.prototype.tangent = function(u, v) {
    var elementsPerPoint = this.controlPoints[0][0].length;
    var bv = this.bufferV;
    var tt, uu, i, value;
    H3DU.BSplineCurve._getFactors(this.knotsU, u, this.degreeU - 1, this.ucplen,
     this.bufferU);
    H3DU.BSplineCurve._getFactors(this.knotsV, v, this.degreeV, this.vcplen,
     this.bufferV);
    var ret = [];
    var coeffs = [];
    for(i = 0; i < this.ucplen; i++) {
      coeffs[i] = 0;
    }
    for(var j = 0; j < this.ucplen - 1; j++) {
      var pix = this.degreeU * this.bufferU[j + 1] / (this.knotsU[j + this.degreeU + 1] - this.knotsU[j + 1]);
      coeffs[j + 1] += pix;
      coeffs[j] -= pix;
    }
    for(i = 0; i < elementsPerPoint; i++) {
      value = 0;
      for(tt = 0; tt < this.ucplen; tt++) {
        for(uu = 0; uu < this.vcplen; uu++) {
          value += this.controlPoints[uu][tt][i] * coeffs[tt] * bv[uu];
        }
      }
      ret[i] = value;
    }
    if((this.bits & H3DU.BSplineCurve.DIVIDE_BIT) !== 0) {
      ret = H3DU.BSplineCurve._fromHomogen(ret);
    }
    return ret;
  };
/**
 * Finds the [bitangent vector]{@link H3DU.SurfaceEval#vertex} at the
 * given point on the surface.
 * @param {Number} u U coordinate of the surface to evaluate.
 * @param {Number} v V coordinate of the surface to evaluate.
 * @returns {Array<Number>} An array giving the bitangent vector.
 * It will have as many elements as a control point (or one fewer
 * if DIVIDE_BIT is set), as specified in the constructor.
 * @instance
 */
  H3DU.BSplineSurface.prototype.bitangent = function(u, v) {
    var elementsPerPoint = this.controlPoints[0][0].length;
    var bu = this.bufferU;
    var tt, uu, i, value;
    H3DU.BSplineCurve._getFactors(this.knotsU, u, this.degreeU, this.ucplen,
     this.bufferU);
    H3DU.BSplineCurve._getFactors(this.knotsV, v, this.degreeV - 1, this.vcplen,
     this.bufferV);
    var ret = [];
    var coeffs = [];
    for(i = 0; i < this.vcplen; i++) {
      coeffs[i] = 0;
    }
    for(var j = 0; j < this.vcplen - 1; j++) {
      var pix = this.degreeV * this.bufferV[j + 1] / (this.knotsV[j + this.degreeV + 1] - this.knotsV[j + 1]);
      coeffs[j + 1] += pix;
      coeffs[j] -= pix;
    }
    for(i = 0; i < elementsPerPoint; i++) {
      value = 0;
      for(tt = 0; tt < this.ucplen; tt++) {
        for(uu = 0; uu < this.vcplen; uu++) {
          value += this.controlPoints[uu][tt][i] * bu[tt] * coeffs[uu];
        }
      }
      ret[i] = value;
    }
    if((this.bits & H3DU.BSplineCurve.DIVIDE_BIT) !== 0) {
      ret = H3DU.BSplineCurve._fromHomogen(ret);
    }
    return ret;
  };

  /** @ignore */
  H3DU.BSplineSurface._convertToHomogen = function(cp) {
    var ret = [];
    for(var i = 0; i < cp.length; i++) {
      ret.push(H3DU.BSplineCurve._convertToHomogen(cp[i]));
    }
    return ret;
  };

  /**
   * Creates a B-spline surface from the control points of a B&eacute;zier surface.
   * @param {Array<Array<Number>>} controlPoints An array of control point
   * arrays, which in turn contain a number of control points. Each
   * control point is an array with the same length as the other control points.
   * It is assumed that:<ul>
   * <li>The length of this parameter minus 1 represents the degree of the B&eacute;zier
   * surface along the V axis. For example, a degree-3 (cubic) surface along the V axis
   * contains 4 control points, one in each control point array. A degree of 1 on
   * both the U and V axes results in a flat surface.
   * <li>The length of the first control point array minus 1 represents the degree of the B&eacute;zier
   * surface along the U axis.
   * <li>The number of elements in the first control point represents the number of elements in all the control points.
   * </ul>
   * @param {Number} [bits] Bits as specified in the {@link H3DU.BSplineSurface} constructor.
   * @returns {H3DU.BSplineSurface} Return value.
   */
  H3DU.BSplineSurface.fromBezierSurface = function(controlPoints, bits) {
    return H3DU.BSplineSurface.clamped(controlPoints, controlPoints[0].length - 1,
       controlPoints.length - 1, bits);
  };

/**
 * An evaluator of curve evaluator objects for generating
 * vertex positions and colors of a curve.<p>
 * For more information, see the {@tutorial surfaces} tutorial.
 * @class
 * @memberof H3DU
 */
  H3DU.CurveEval = function() {
    this.colorCurve = null;
    this.normalCurve = null;
    this.texCoordCurve = null;
    this.vertexCurve = null;
    this.vertexCurveHasNormal = false; // NOTE: For compatibility only
  };

/**
 * Specifies a curve evaluator object for generating the vertex positions of a parametric curve.
 * @param {H3DU.Curve|Object} evaluator An object described in {@link H3DU.Curve}. Can be null, in which case, disables generating vertex positions.
 * @returns {H3DU.CurveEval} This object.
 * @example <caption>The following function sets a circle as the curve
 * to use for generating vertex positions. It demonstrates how all methods
 * defined for curve evaluator objects can be implemented.</caption>
 * curveEval.vertex({"evaluate":function(u) {
 * "use strict";
 * return [Math.cos(u),Math.sin(u),0]
 * },
 * "velocity":function(u) {
 * return [-Math.sin(u),Math.cos(u),0]
 * },
 * "accel":function(u) {
 * return [-Math.cos(u),-Math.sin(u),0]
 * },
 * "normal":function(u) {
 * // NOTE: The velocity vector will already be a
 * // unit vector, so we use the accel vector instead
 * return H3DU.Math.vec3normalize(this.accel(u));
 * },
 * "arcLength":function(u) {
 * return u;
 * },
 * "endPoints":function(u) {
 * return [0,H3DU.Math.PiTimes2]
 * }
 * });
 * @instance
 */
  H3DU.CurveEval.prototype.vertex = function(evaluator) {
    this.vertexCurve = typeof evaluator !== "undefined" && evaluator !== null ?
       new H3DU.Curve(evaluator) : null;
    this.vertexCurveHasNormal = typeof evaluator !== "undefined" && evaluator !== null && (typeof evaluator.normal !== "undefined" && evaluator.normal !== null);
    return this;
  };
/**
 * Specifies a parametric curve function for generating normals.
 * @deprecated Use the "vertex" method instead.
 * @param {Object} evaluator An object that must contain a function
 * named <code>evaluate</code>, giving 3 values as a result.
 * </ul>
 * @returns {H3DU.CurveEval} This object.
 * @instance
 */
  H3DU.CurveEval.prototype.normal = function(evaluator) {
    this.normalCurve = evaluator;
    return this;
  };
/**
 * Specifies a parametric curve function for generating color values.
 * @param {Object} evaluator An object that must contain a function
 * named <code>evaluate</code>, giving 3 values as a result.
 * </ul>
 * @returns {H3DU.CurveEval} This object.
 * @instance
 */
  H3DU.CurveEval.prototype.color = function(evaluator) {
    this.colorCurve = evaluator;
    return this;
  };
/**
 * Specifies a parametric curve function for generating texture coordinates.
 * @param {Object} evaluator An object that must contain a function
 * named <code>evaluate</code>, giving one or two values as a result.
 * </ul>
 * @returns {H3DU.CurveEval} This object.
 * @instance
 */
  H3DU.CurveEval.prototype.texCoord = function(evaluator) {
    this.texCoordCurve = evaluator;
    return this;
  };
/**
 * Generates vertex positions and attributes based on a point
 * in a parametric curve.
 * @param {H3DU.Mesh} mesh H3DU.Mesh where vertex positions and attributes
 * will be generated. When this method returns, the current color, normal,
 * and texture coordinates will be the same as they were before the method
 * started.
 * @param {Number} u Point of the curve to evaluate.
 * @returns {H3DU.CurveEval} This object.
 * @instance
 */
  H3DU.CurveEval.prototype.evalOne = function(mesh, u) {
    var color = null;
    var normal = null;
    var texcoord = null;
    if(!this.texCoordCurve && !this.normalCurve) {
      return this._evalOneSimplified(mesh, u);
    }
    if(this.colorCurve) {
      color = this.colorCurve.evaluate(u);
    }
    if(this.texCoordCurve) {
      texcoord = this.texCoordCurve.evaluate(u);
      if(texcoord.length === 1)texcoord.push(0);
    }
    if(this.normalCurve) {
      // NOTE: This is deprecated
      normal = this.normalCurve.evaluate(u);
    } else if(this.vertexCurve && this.vertexCurveHasNormal) {
      // NOTE: Condition that vertexCurve must include a
      // "normal" method may no longer apply in versions beyond 2.0
      normal = this.vertexCurve.normal(u);
    }
    if(this.vertexCurve) {
      var oldColor = color ? mesh.color.slice(0, 3) : null;
      var oldNormal = normal ? mesh.normal.slice(0, 3) : null;
      var oldTexCoord = texcoord ? mesh.texCoord.slice(0, 2) : null;
      if(color)mesh.color3(color[0], color[1], color[2]);
      if(normal) {
        if(normal.length === 2)
          mesh.normal3(normal[0], normal[1], 0.0);
        else
    mesh.normal3(normal[0], normal[1], normal[2]);
      }
      if(texcoord)mesh.texCoord2(texcoord[0], texcoord[1]);
      var vertex = this.vertexCurve.evaluate(u);
      if(vertex.length === 2)
        mesh.vertex3(vertex[0], vertex[1], 0.0);
      else
   mesh.vertex3(vertex[0], vertex[1], vertex[2]);
      if(oldColor)mesh.color3(oldColor[0], oldColor[1], oldColor[2]);
      if(oldNormal)mesh.normal3(oldNormal[0], oldNormal[1], oldNormal[2]);
      if(oldTexCoord)mesh.texCoord2(oldTexCoord[0], oldTexCoord[1]);
    }
    return this;
  };
/** @ignore */
  H3DU.CurveEval.prototype._evalOneSimplified = function(mesh, u) {
    var color = null;
    if(this.colorCurve) {
      color = this.colorCurve.evaluate(u);
    }
    if(this.vertexCurve) {
      var oldColor = color ? mesh.color.slice(0, 3) : null;
      if(color)mesh.color3(color[0], color[1], color[2]);
      var vertex = this.vertexCurve.evaluate(u);
      var vertex2 = vertex.length === 2 ? 0.0 : vertex[2];
      mesh.vertex3(vertex[0], vertex[1], vertex2);
      if(oldColor)mesh.color3(oldColor[0], oldColor[1], oldColor[2]);
    }
    return this;
  };

/**
 * Generates vertices and attribute values that follow a parametric curve
 * function.
 * @param {H3DU.Mesh} mesh A geometric mesh where the vertices will be
 * generated.
 * @param {Number} [mode] If this value is H3DU.Mesh.LINES, or is null
 * or omitted, generates
 * a series of lines defining the curve. If this value is H3DU.Mesh.POINTS,
 * generates a series of points along the curve. For any other value,
 * this method has no effect.
 * @param {Number} [n] Number of subdivisions of the curve to be drawn.
 * Default is 24.
 * @param {Number} [u1] Starting point of the curve.
 * Default is the starting coordinate given by the [curve evaluator object]{@link H3DU.Curve}, or 0 if not given.
 * @param {Number} [u2] Ending point of the curve.
 * Default is the ending coordinate given by the [curve evaluator object]{@link H3DU.Curve}, or 1 if not given.
 * @returns {H3DU.CurveEval} This object.
 * @instance
 */
  H3DU.CurveEval.prototype.evalCurve = function(mesh, mode, n, u1, u2) {
    if(typeof n === "undefined")n = 24;
    if(n <= 0)throw new Error("invalid n");
    if(typeof u1 === "undefined" && typeof u2 === "undefined") {
      if(typeof this.vertexCurve !== "undefined" && this.vertexCurve !== null) {
        var endPoints = this.vertexCurve.endPoints();
        u1 = endPoints[0];
        u2 = endPoints[1];
      } else {
        u1 = 0.0;
        u2 = 1.0;
      }
    }
    if(typeof mode === "undefined" || mode === null)mode = H3DU.Mesh.LINES;
    if(mode === H3DU.Mesh.POINTS)
      mesh.mode(H3DU.Mesh.POINTS);
    else if(mode === H3DU.Mesh.LINES)
      mesh.mode(H3DU.Mesh.LINE_STRIP);
    else return this;
    var uv = (u2 - u1) / n;
    for(var i = 0; i <= n; i++) {
      this.evalOne(mesh, u1 + i * uv);
    }
    return this;
  };
/**
 * An evaluator of parametric functions for generating
 * vertex attributes of a surface.<p>
 * See the {@tutorial surfaces} tutorial for more information.
 * @class
 * @memberof H3DU
 */
  H3DU.SurfaceEval = function() {
    this.colorSurface = null;
    this.normalSurface = null;
    this.generateNormals = false;
    this.texCoordSurface = null;
    this.vertexSurface = null;
    this.autoNormal = false;
  };
/**
 * Sets whether this object will automatically generate
 * normals rather than use the parametric evaluator
 * specified for normal generation, if any.
 * By default, normals won't be generated automatically.
 * @deprecated In the future, this class may always generate
 * normals, rendering this method unnecessary.  You should use the "vertex"
 * method, specifying an object that implements a method named
 * "gradient".
 * @param {Boolean} value Either true or false. True means normals
 * will automatically be generated; false means they won't.
 * @returns {H3DU.SurfaceEval} This object.
 * @instance
 */
  H3DU.SurfaceEval.prototype.setAutoNormal = function(value) {
     // TODO: Provide a different mechanism for choosing which attributes to generate
    this.autoNormal = !!value;
    return this;
  };
/**
 * Specifies a surface evaluator object for generating the vertex positions of a parametric surface.
 * @param {Object} evaluator A <b>surface evaluator object</b>, which is an object that may contain the
 * following methods (except that <code>evaluate</code> is required):<ul>
 * <li><code>evaluate(u, v)</code> - Required. Takes a horizontal-axis coordinate (<code>u</code>),
 * generally from 0 to 1, and a vertical-axis coordinate (<code>v</code>), generally from 0 to 1.
 * This method returns a vector of the result of the evaluation.
 * <li><code>endPoints()</code> - Optional. Returns a four-element array. The first and second
 * elements are the starting and ending U coordinates, respectively, of the surface, and the third
 * and fourth elements are its starting and ending V coordinates. If not given, the default end points are <code>[0, 1, 0, 1]</code>.
 * <li><a id="tangentvector"></a><code>tangent(u, v)</code> - Optional. Takes the same parameters as <code>evaluate</code>
 * and returns the tangent vector of the surface at the given coordinates. <br>
 * The <b>tangent vector</b> is the vector pointing in the direction of the U axis,
 * or alternatively, the partial derivative of the <code>evaluate</code> method with respect to <code>u</code>.
 * The tangent vector returned by this method <i>should not</i> be "normalized" to a [unit vector]{@tutorial glmath}.
 * <li><a id="bitangentvector"></a><code>bitangent(u, v)</code> -
 * Optional. Takes the same parameters as <code>evaluate</code>
 * and returns the bitangent vector of the surface at the given coordinates.<br>
 * The <b>bitangent vector</b> is the vector pointing in the direction of the V axis, or alternatively,
 * the partial derivative of the <code>evaluate</code> method with respect to <code>v</code>.  The bitangent vector returned by this method <i>should not</i> be "normalized" to a [unit vector]{@tutorial glmath}.
 * <li><code>gradient(u, v)</code> - Optional. Takes the same parameters as <code>evaluate</code>
 * and returns the gradient of the surface at the given coordinates.<br>
 * The <b>gradient</b> is a vector pointing up and away from the surface.
 * If the evaluator describes a regular surface (usually
 * a continuous, unbroken surface such as a sphere, disk, or open
 * cylinder), this can be the cross product of the tangent vector and bitangent vector,
 * in that order. The gradient returned by this method <i>should not</i> be "normalized" to a [unit vector]{@tutorial glmath}.
 * </ul>
 * @returns {H3DU.SurfaceEval} This object.
 * @example <caption>The following example sets the vertex position and
 * normal generation
 * function for a parametric surface. To illustrate how the method is derived
 * from the vector calculation method, that method is also given below. To
 * derive the normal calculation, first look at the vector function:<p>
 * <b>F</b>(u, v) = (cos(u), sin(u), sin(u)*cos(v))<p>
 * Then, find the partial derivatives with respect to u and v:<p>
 * &#x2202;<b>F</b>/&#x2202;<i>u</i> = (-sin(u), cos(u), cos(u)*cos(v))<br>
 * &#x2202;<b>F</b>/&#x2202;<i>v</i> = (0, 0, -sin(v)*sin(u))<p>
 * Next, take their cross product:<p>
 * <b>c</b>(u, v) = (-sin(v)*cos(u)*sin(u), -sin(v)*sin(u)*sin(u), 0)<br><p>
 * The result is the gradient, which will be normal to the surface.
 * </caption>
 * surfaceEval.vertex({"evaluate":function(u,v) {
 * "use strict";
 * return [Math.cos(u),Math.sin(u),Math.sin(u)*Math.cos(v)];
 * },
 * "gradient":function(u,v) {
 * "use strict";
 * return [
 * Math.cos(u)*-Math.sin(v)*Math.sin(u),
 * Math.sin(u)*-Math.sin(v)*Math.sin(u),
 * 0];
 * }})
 * @instance
 */
  H3DU.SurfaceEval.prototype.vertex = function(evaluator) {
    // TODO: Document null behavior like CurveEval
    this.vertexSurface = evaluator;
    this.generateNormals = this.normalSurface || !!this.autoNormal ||
    typeof this.vertexSurface !== "undefined" && this.vertexSurface !== null &&
    (typeof this.vertexSurface.gradient !== "undefined" && this.vertexSurface.gradient !== null);
    return this;
  };
/**
 * Specifies a parametric surface function for generating normals.
 * @deprecated Use the "vertex" method instead, specifying an object
 * that implements a method named "gradient".
 * @param {Object} evaluator An object that must contain a function
 * named <code>evaluate</code>, giving 3 values as a result. See {@link H3DU.SurfaceEval#vertex}.
 * </ul>
 * @returns {H3DU.SurfaceEval} This object.
 * @instance
 */
  H3DU.SurfaceEval.prototype.normal = function(evaluator) {
    this.normalSurface = evaluator;
    this.generateNormals = this.normalSurface || !!this.autoNormal ||
    typeof this.vertexSurface !== "undefined" && this.vertexSurface !== null &&
    (typeof this.vertexSurface.gradient !== "undefined" && this.vertexSurface.gradient !== null);
    return this;
  };
/**
 * Specifies a parametric surface function for generating color values.
 * @param {Object} evaluator An object that must contain a function
 * named <code>evaluate</code>, giving 3 values as a result. See {@link H3DU.SurfaceEval#vertex}.
 * </ul>
 * @returns {H3DU.SurfaceEval} This object.
 * @instance
 */
  H3DU.SurfaceEval.prototype.color = function(evaluator) {
    this.colorSurface = evaluator;
    return this;
  };
/**
 * Specifies a parametric surface function for generating texture coordinates.
 * @param {Object} evaluator An object that must contain a function
 * named <code>evaluate</code>, giving 2 values as a result. See {@link H3DU.SurfaceEval#vertex}.
 * </ul>
 * @returns {H3DU.SurfaceEval} This object.
 * @example <caption>The following example sets the surface
 * function to a linear evaluator. Thus, coordinates passed to the
 * evalOne and evalSurface methods will be interpolated as direct
 * texture coordinates.</caption>
 * surface.texCoord({"evaluate":function(u,v) {
 * "use strict"; return [u,v] }});
 * @instance
 */
  H3DU.SurfaceEval.prototype.texCoord = function(evaluator) {
    this.texCoordSurface = evaluator;
    return this;
  };
/** @ignore */
  H3DU.SurfaceEval._EPSILON = 0.00001;
/** @ignore */
  H3DU.SurfaceEval._tangentHelper = function(e, u, v, sampleAtPoint) {
    var du = H3DU.SurfaceEval._EPSILON;
    var vector = e.evaluate(u + du, v);
    if(vector[0] === 0 && vector[1] === 0 && vector[2] === 0) {
    // too abrupt, try the other direction
      du = -du;
      vector = e.evaluate(u + du, v);
    }
    H3DU.Math.vec3subInPlace(vector, sampleAtPoint);
    H3DU.Math.vec3scaleInPlace(vector, 1.0 / du);
    return vector;
  };
/** @ignore */
  H3DU.SurfaceEval._bitangentHelper = function(e, u, v, sampleAtPoint) {
    var du = H3DU.SurfaceEval._EPSILON;
   // Find the partial derivatives of u and v
    var vector = e.evaluate(u, v + du);
    if(vector[0] === 0 && vector[1] === 0 && vector[2] === 0) {
    // too abrupt, try the other direction
      du = -du;
      vector = e.evaluate(u, v + du);
    }
    H3DU.Math.vec3subInPlace(vector, sampleAtPoint);
    H3DU.Math.vec3scaleInPlace(vector, 1.0 / du);
    return vector;
  };

/** @ignore */
  H3DU.SurfaceEval._vecLength = function(vec) {
    var dsq = 0;
    for(var i = 0; i < vec.length; i++) {
      dsq += vec[i] * vec[i];
    }
    return Math.sqrt(dsq);
  };
/**
 * Finds an approximate [gradient vector]{@link H3DU.SurfaceEval#vertex} for
 * the given surface evaluator
 * at the given U and V coordinates.<p>This method calls the evaluator's <code>gradient</code>
 * method if it implements it; otherwise, calls the evaluator's <code>bitangent</code> and <code>tangent</code> methods if it implements them; otherwise, does a numerical differentiation using the <code>evaluate</code> method.
 * @param {Object} e An object described in {@link H3DU.SurfaceEval#vertex}.
 * @param {Number} u U coordinate of the surface to evaluate.
 * @param {Number} v V coordinate of the surface to evaluate.
 * @returns {Array<Number>} A gradient vector.
 */
  H3DU.SurfaceEval.findGradient = function(e, u, v) {
    if(typeof e.gradient !== "undefined" && e.gradient !== null) {
      return e.gradient(u, v);
    }
    var tan, bitan;
    if(typeof e.bitangent !== "undefined" && e.bitangent !== null && (typeof e.tangent !== "undefined" && e.tangent !== null)) {
      bitan = e.bitangent(u, v);
      tan = e.tangent(u, v);
    } else {
      var sample = e.evaluate(u, v);
      bitan = H3DU.SurfaceEval._bitangentHelper(e, u, v, sample);
      tan = H3DU.SurfaceEval._tangentHelper(e, u, v, sample);
    }
    if(H3DU.SurfaceEval._vecLength(bitan) === 0) {
      return tan;
    }
    if(H3DU.SurfaceEval._vecLength(tan) !== 0) {
      return H3DU.Math.vec3cross(tan, bitan);
    } else {
      return bitan;
    }
  };
/**
 * Finds an approximate [tangent vector]{@link H3DU.SurfaceEval#vertex} for the given surface evaluator object
 * at the given U and V coordinates. This method calls the evaluator's <code>tangent</code>
 * method if it implements it; otherwise, does a numerical differentiation
 * with respect to the U axis using the <code>evaluate</code> method.
 * @param {Object} e An object described in {@link H3DU.SurfaceEval#vertex}.
 * @param {Number} u U coordinate of the surface to evaluate.
 * @param {Number} v V coordinate of the surface to evaluate.
 * @returns {Array<Number>} A tangent vector .
 */
  H3DU.SurfaceEval.findTangent = function(e, u, v) {
    return typeof e.tangent !== "undefined" && e.tangent !== null ? e.tangent(u, v) :
     H3DU.SurfaceEval._tangentHelper(e, u, v, e.evaluate(u, v));
  };
/**
 * Finds an approximate [bitangent vector]{@link H3DU.SurfaceEval#vertex} for the given surface evaluator object
 * at the given U and V coordinates. This method calls the evaluator's <code>bitangent</code>
 * method if it implements it; otherwise, does a numerical differentiation
 * with respect to the V axis using the <code>evaluate</code> method.
 * @param {Object} e An object described in {@link H3DU.SurfaceEval#vertex}.
 * @param {Number} u U coordinate of the surface to evaluate.
 * @param {Number} v V coordinate of the surface to evaluate.
 * @returns {Array<Number>} A bitangent vector .
 */
  H3DU.SurfaceEval.findBitangent = function(e, u, v) {
    return typeof e.bitangent !== "undefined" && e.bitangent !== null ? e.bitangent(u, v) :
     H3DU.SurfaceEval._bitangentHelper(e, u, v, e.evaluate(u, v));
  };
/**
 * Wraps a surface evaluator object to one that implements all
 * methods defined in the documentation for {@link H3DU.SurfaceEval#vertex}.
 * @param {Object} evaluator The surface evaluator object to wrap.
 * @returns {Object} A wrapper for the given surface evaluator object.
 */
  H3DU.SurfaceEval.wrapEvaluator = function(evaluator) {
    return {
      "evaluate":function(u, v) {
        return evaluator.evaluate(u, v);
      },
      "bitangent":function(u, v) {
        return H3DU.SurfaceEval.findBitangent(evaluator, u, v);
      },
      "tangent":function(u, v) {
        return H3DU.SurfaceEval.findTangent(evaluator, u, v);
      },
      "gradient":function(u, v) {
        return H3DU.SurfaceEval.findGradient(evaluator, u, v);
      },
      "endPoints":function() {
        return H3DU.SurfaceEval.findEndPoints(evaluator);
      }
    };
  };

/**
 * Finds the end points of the surface described by the given [surface evaluator object]{@link H3DU.SurfaceEval#vertex}.
 * This method calls the evaluator's <code>endPoints</code>
 * method if it implements it; otherwise, returns <code>[0, 1]</code>
 * @param {Object} e An object described in {@link H3DU.SurfaceEval#vertex}.
 * @returns {Array<Number>} A four-element array giving the surface's end points.
 */
  H3DU.SurfaceEval.findEndPoints = function(e) {
    if(typeof e !== "undefined" && e !== null && (typeof e.endPoints !== "undefined" && e.endPoints !== null))return e.endPoints();
    return [0, 1, 0, 1];
  };
/** @ignore */
  H3DU._OLD_VALUES_SIZE = 8;
/** @ignore */
  H3DU._RECORDED_VALUES_SIZE = 11;
/**
 * Generates vertex positions and attributes based on a point
 * in a parametric surface.
 * @param {H3DU.Mesh} mesh H3DU.Mesh where vertex positions and attributes
 * will be generated. When this method returns, the current color, normal,
 * and texture coordinates will be the same as they were before the method
 * started.
 * @param {Number} u U coordinate of the surface to evaluate.
 * @param {Number} v V coordinate of the surface to evaluate.
 * @returns {H3DU.SurfaceEval} This object.
 * @instance
 */
  H3DU.SurfaceEval.prototype.evalOne = function(mesh, u, v) {
    var values = [];
    this._saveValues(mesh, values, 0);
    this._recordAndPlayBack(mesh, u, v, values, H3DU._OLD_VALUES_SIZE);
    this._restoreValues(mesh, values, 0);
    return this;
  };
/** @ignore */
  H3DU.SurfaceEval.prototype._recordAndPlayBack = function(mesh, u, v, buffer, index) {
    this._record(u, v, buffer, index);
    this._playBack(mesh, buffer, index);
  };
/** @ignore */
  H3DU.SurfaceEval.prototype._saveValues = function(mesh, buffer, index) {
    if(this.colorSurface) {
      buffer[index + 3] = mesh.color[0];
      buffer[index + 4] = mesh.color[1];
      buffer[index + 5] = mesh.color[2];
    }
    if(this.generateNormals) {
      buffer[index + 0] = mesh.normal[0];
      buffer[index + 1] = mesh.normal[1];
      buffer[index + 2] = mesh.normal[2];
    }
    if(this.texCoordSurface) {
      buffer[index + 6] = mesh.texCoord[0];
      buffer[index + 7] = mesh.texCoord[1];
    }
  };
/** @ignore */
  H3DU.SurfaceEval.prototype._restoreValues = function(mesh, buffer, index) {
    if(this.colorSurface) {
      mesh.color3(buffer[index + 3], buffer[index + 4], buffer[index + 5]);
    }
    if(this.generateNormals) {
      mesh.normal3(buffer[index + 0], buffer[index + 1], buffer[index + 2]);
    }
    if(this.texCoordSurface) {
      mesh.texCoord2(buffer[index + 6], buffer[index + 7]);
    }
  };
/** @ignore */
  H3DU.SurfaceEval.prototype._record = function(u, v, buffer, index) {
    var normal = null;
    if(this.colorSurface) {
      var color = this.colorSurface.evaluate(u, v);
      buffer[index + 6] = color[0];
      buffer[index + 7] = color[1];
      buffer[index + 8] = color[2];
    }
    if(this.texCoordSurface) {
      var texcoord = this.texCoordSurface.evaluate(u, v);
      buffer[index + 9] = texcoord[0];
      buffer[index + 10] = texcoord.length <= 1 ? 0 : texcoord[1];
    }
    if(!this.autoNormal && (typeof this.vertexSurface.gradient !== "undefined" && this.vertexSurface.gradient !== null)) {
      normal = H3DU.Math.vec3normalize(this.vertexSurface.gradient(u, v));
      buffer[index + 3] = normal[0];
      buffer[index + 4] = normal[1];
      buffer[index + 5] = normal[2];
    } else if(this.normalSurface && !this.autoNormal) {
      // NOTE: This is deprecated
      normal = this.normalSurface.evaluate(u, v);
      buffer[index + 3] = normal[0];
      buffer[index + 4] = normal[1];
      buffer[index + 5] = normal[2];
    }
    if(this.vertexSurface) {
      var vertex = this.vertexSurface.evaluate(u, v);
      buffer[index] = vertex[0];
      buffer[index + 1] = vertex[1];
      buffer[index + 2] = vertex[2];
      if(this.autoNormal) {
        normal = H3DU.Math.vec3normalize(H3DU.SurfaceEval.findGradient(
            this.vertexSurface, u, v));
        buffer[index + 3] = normal[0];
        buffer[index + 4] = normal[1];
        buffer[index + 5] = normal[2];
      }
    }
  };
/** @ignore */
  H3DU.SurfaceEval.prototype._playBack = function(mesh, buffer, index) {
    if(this.vertexSurface) {
      if(this.colorSurface) {
        mesh.color3(buffer[index + 6], buffer[index + 7], buffer[index + 8]);
      }
      if(this.generateNormals) {
        mesh.normal3(buffer[index + 3], buffer[index + 4], buffer[index + 5]);
      }
      if(this.texCoordSurface) {
        mesh.texCoord2(buffer[index + 9], buffer[index + 10]);
      }
      mesh.vertex3(buffer[index + 0], buffer[index + 1], buffer[index + 2]);
    }
  };

/**
 * Generates the vertex positions and attributes of a parametric
 * surface.
 * @param {H3DU.Mesh} mesh H3DU.Mesh where vertex positions and attributes
 * will be generated. When this method returns, the current color, normal,
 * and texture coordinates will be the same as they were before the method
 * started.
 * @param {Number} [mode] If this value is H3DU.Mesh.TRIANGLES, or is null
 * or omitted, generates a series of triangles defining the surface. If
 * this value is H3DU.Mesh.LINES, generates
 * a series of lines defining the surface. If this value is H3DU.Mesh.POINTS,
 * generates a series of points along the surface. For any other value,
 * this method has no effect.
 * @param {Number} [un] Number of subdivisions along the U axis.
 * Default is 24.
 * @param {Number} [vn] Number of subdivisions along the V axis.
 * Default is 24.
 * @param {Number} [u1] Starting U coordinate of the surface to evaluate.
 * Default is the starting U coordinate given by the [surface evaluator object]{@link H3DU.SurfaceEval#vertex}, or 0 if not given.
 * @param {Number} [u2] Ending U coordinate of the surface to evaluate.
 * Default is the ending U coordinate given by the [surface evaluator object]{@link H3DU.SurfaceEval#vertex}, or 1 if not given.
 * @param {Number} [v1] Starting V coordinate of the surface to evaluate.
 * Default is the starting V coordinate given by the [surface evaluator object]{@link H3DU.SurfaceEval#vertex}, or 0 if not given.
 * @param {Number} [v2] Ending V coordinate of the surface to evaluate.
 * Default is the ending V coordinate given by the [surface evaluator object]{@link H3DU.SurfaceEval#vertex}, or 1 if not given.
 * @returns {H3DU.SurfaceEval} This object.
 * @instance
 */
  H3DU.SurfaceEval.prototype.evalSurface = function(mesh, mode, un, vn, u1, u2, v1, v2) {
    if(typeof un === "undefined")un = 24;
    if(typeof vn === "undefined")vn = 24;
    if(un <= 0)throw new Error("invalid un");
    if(vn <= 0)throw new Error("invalid vn");
    if(typeof mode === "undefined" || mode === null)mode = H3DU.Mesh.TRIANGLES;
    var endPoints = null;
    if(typeof v1 === "undefined" && typeof v2 === "undefined") {
      if(!endPoints)endPoints = H3DU.SurfaceEval.findEndPoints(this.vertexSurface);
      v1 = endPoints[2];
      v2 = endPoints[3];
    }
    if(typeof u1 === "undefined" && typeof u2 === "undefined") {
      if(!endPoints)endPoints = H3DU.SurfaceEval.findEndPoints(this.vertexSurface);
      u1 = endPoints[0];
      u2 = endPoints[1];
    }
    var du = (u2 - u1) / un;
    var dv = (v2 - v1) / vn;
    var i, j, jx, prevIndex;
    if(mode === H3DU.Mesh.TRIANGLES) {
      var oldValues = [];
      var previousValues = [];
      this._saveValues(mesh, oldValues, 0);
      for(i = 0; i < vn; i++) {
        mesh.mode(H3DU.Mesh.TRIANGLE_STRIP);
        for(j = 0, prevIndex = 0; j <= un;
      j++, prevIndex += H3DU._RECORDED_VALUES_SIZE) {
          jx = j * du + u1;
          if(i === 0) {
            this._recordAndPlayBack(mesh, jx, i * dv + v1, oldValues, H3DU._OLD_VALUES_SIZE);
          } else {
            this._playBack(mesh, previousValues, prevIndex);
          }
          if(i === vn - 1) {
            this._recordAndPlayBack(mesh, jx, (i + 1) * dv + v1, oldValues, H3DU._OLD_VALUES_SIZE);
          } else {
            this._recordAndPlayBack(mesh, jx, (i + 1) * dv + v1, previousValues, prevIndex);
          }
        }
      }
      this._restoreValues(mesh, oldValues, 0);
    } else if(mode === H3DU.Mesh.POINTS) {
      mesh.mode(H3DU.Mesh.POINTS);
      for(i = 0; i <= vn; i++) {
        for(j = 0; j <= un; j++) {
          jx = j * du + u1;
          this.evalOne(mesh, jx, i * dv + v1);
        }
      }
    } else if(mode === H3DU.Mesh.LINES) {
      for(i = 0; i <= vn; i++) {
        mesh.mode(H3DU.Mesh.LINE_STRIP);
        for(j = 0; j <= un; j++) {
          jx = j * du + u1;
          this.evalOne(mesh, jx, i * dv + v1);
        }
      }
      for(i = 0; i <= un; i++) {
        mesh.mode(H3DU.Mesh.LINE_STRIP);
        for(j = 0; j <= vn; j++) {
          this.evalOne(mesh, i * du + u1, j * dv + v1);
        }
      }
    }
    return this;
  };
  global.H3DU.SurfaceEval = H3DU.SurfaceEval;
  global.H3DU.CurveEval = H3DU.CurveEval;
  global.H3DU.BezierCurve = H3DU.BezierCurve;
  global.H3DU.BezierSurface = H3DU.BezierSurface;
  global.H3DU.BSplineCurve = H3DU.BSplineCurve;
  global.H3DU.BSplineSurface = H3DU.BSplineSurface;
}(this));
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global DataView, H3DU, Promise, Uint8Array */

/**
 * Specifies a texture, which can serve as image data applied to
 * the surface of a shape, or even a 2-dimensional array of pixels
 * used for some other purpose, such as a depth map, a height map,
 * a bump map, a specular map, and so on.<p>
 * For best results, any textures to be used in WebGL should have
 * width and height each equal to a power of 2, such as 2, 4, 8, 16,
 * and 32.
 * @class
 * @memberof H3DU
 * @param {String} name URL of the texture data. Based on the
 * URL, the texture may be loaded via the JavaScript DOM's Image
 * class. However, this constructor will not load that image yet.
 */
H3DU.Texture = function(name) {
  "use strict";
  this.image = null;
  // 0 = not loaded; 1 = loading; 2 = loaded; -1 = error
  this.loadStatus = 0;
  this.name = name;
  this.width = 0;
  this.height = 0;
  this.clamp = false;
};
/**
 * Gets this texture's known width.
 * @returns {Number} This texture's width in pixels.
 * Will be 0 if the texture's image data wasn't loaded yet.
 * @instance
 */
H3DU.Texture.prototype.getWidth = function() {
  "use strict";
  return this.width;
};
/**
 * Gets this texture's known height.
 * @returns {Number} This texture's height in pixels.
 * Will be 0 if the texture's image data wasn't loaded yet.
 * @instance
 */
H3DU.Texture.prototype.getHeight = function() {
  "use strict";
  return this.height;
};
/** @ignore */
H3DU.Texture.prototype._toInfo = function() {
  "use strict";
  return new H3DU.TextureInfo({
    "uri":this.name,
    "wrapS":this.clamp ? 33071 : 10497,
    "wrapT":this.clamp ? 33071 : 10497
  });
};

/**
 * Sets the wrapping behavior of texture coordinates that
 * fall out of range when using this texture. This setting
 * will only have an effect on textures whose width and height
 * are both powers of two. For other textures, this setting
 * is ignored and out-of-range texture coordinates are
 * always clamped.
 * @deprecated Use the TextureInfo class's "wrapS" and
 * "wrapT" parameters instead.
 * @param {Boolean} clamp If true, the texture's texture
 * coordinates will be clamped to the range [0, 1]. If false,
 * the fractional parts of the texture coordinates'
 * be used as the coordinates (causing wraparound).
 * The default is false.
 * @returns {H3DU.Texture} This object.
 * @instance
 */
H3DU.Texture.prototype.setClamp = function(clamp) {
  "use strict";
  this.clamp = !!clamp;
  return this;
};

/**
 * Loads a texture by its URL.
 * @param {String|H3DU.TextureInfo|H3DU.Texture} name An {@link H3DU.Texture} object,
 * an {@link H3DU.TextureInfo} object, or a string with the
 * URL of the texture data. Images with a TGA
 * extension that use the RGBA or grayscale format are supported.
 * Images supported by the browser will be loaded via
 * the JavaScript DOM's Image class.
 * @param {Object} [textureCache] An object whose keys
 * are the names of textures already loaded. This will help avoid loading
 * the same texture more than once.
 * @returns {Promise} A promise that resolves when the texture
 * is fully loaded. If it resolves, the result will be an H3DU.Texture object.
 */
H3DU.Texture.loadTexture = function(info, textureCache) {
 // Get cached texture
  "use strict";
  var texImage;
  var name;
  if(!(typeof info !== "undefined" && info !== null)) {
    throw new Error();
  }
  if(info instanceof H3DU.Texture) {
    name = info.name;
    texImage = info;
  } else {
    name = info instanceof H3DU.TextureInfo ? info.uri : info;
    if(textureCache && textureCache[name] && name && name.length > 0) {
      return Promise.resolve(textureCache[name]);
    }
    texImage = new H3DU.Texture(name);
  }
  if(textureCache && name && name.length > 0) {
    textureCache[name] = texImage;
  }
 // Load new texture
  return texImage.loadImage().then(
  function(result) {
    return result;
  },
  function(name) {
    return Promise.reject(name.name);
  });
};

/**
 * Creates a texture from a byte array specifying the texture data.
 * @param {Uint8Array} array A byte array containing the texture data,
 * with the pixels arranged in left-to-right rows from top to bottom.
 * Each pixel takes 4 bytes, where the bytes are the red, green, blue,
 * and alpha components, in that order.
 * @param {Uint8Array} width Width, in pixels, of the texture.
 * @param {Uint8Array} height Height, in pixels, of the texture.
 * @returns {H3DU.Texture} The new H3DU.Texture object.
 */
H3DU.Texture.fromUint8Array = function(array, width, height) {
  "use strict";
  if(width < 0)throw new Error("width less than 0");
  if(height < 0)throw new Error("height less than 0");
  if(array.length < width * height * 4)throw new Error("array too short for texture");
  var texImage = new H3DU.Texture("");
  texImage.image = array;
  texImage.width = Math.ceil(width);
  texImage.height = Math.ceil(height);
  texImage.loadStatus = 2;
  return texImage;
};

/** @ignore */
H3DU.Texture.loadTga = function(name) {
  "use strict";
  return H3DU.loadFileFromUrl(name, "arraybuffer")
 .then(function(buf) {
   var view = new DataView(buf.data);
  // NOTE: id is byte 0; cmaptype is byte 1
   var imgtype = view.getUint8(2);
   if(imgtype !== 2 && imgtype !== 3) {
     return Promise.reject(new Error("unsupported image type"));
   }
   var xorg = view.getUint16(8, true);
   var yorg = view.getUint16(10, true);
   if(xorg !== 0 || yorg !== 0) {
     return Promise.reject(new Error("unsupported origins"));
   }
   var width = view.getUint16(12, true);
   var height = view.getUint16(14, true);
   if(width === 0 || height === 0) {
     return Promise.reject(new Error("invalid width or height"));
   }
   var pixelsize = view.getUint8(16);
   if(!(pixelsize === 32 && imgtype === 2) &&
      !(pixelsize === 24 && imgtype === 2) &&
      !(pixelsize === 8 && imgtype === 3)) {
     return Promise.reject(new Error("unsupported pixelsize"));
   }
   var size = width * height;
   if(size > buf.data.length) {
     return Promise.reject(new Error("size too big"));
   }
   var i;
   var arr = new Uint8Array(size * 4);
   var offset = 18;
   var io = 0;
   if(pixelsize === 32 && imgtype === 2) {
     for(i = 0, io = 0; i < size; i++, io += 4) {
       arr[io + 2] = view.getUint8(offset);
       arr[io + 1] = view.getUint8(offset + 1);
       arr[io] = view.getUint8(offset + 2);
       arr[io + 3] = view.getUint8(offset + 3);
       offset += 4;
     }
   } else if(pixelsize === 24 && imgtype === 2) {
     for(i = 0, io = 0; i < size; i++, io += 4) {
       arr[io + 2] = view.getUint8(offset);
       arr[io + 1] = view.getUint8(offset + 1);
       arr[io] = view.getUint8(offset + 2);
       arr[io + 3] = 0xFF;
       offset += 3;
     }
   } else if(pixelsize === 8 && imgtype === 3) {
     for(i = 0, io = 0; i < size; i++, io += 4) {
       var col = view.getUint8(offset);
       arr[io] = col;
       arr[io + 1] = col;
       arr[io + 2] = col;
       arr[io + 3] = 0xFF;
       offset++;
     }
   }
   buf.data = null;
   return {
     "width":width,
     "height":height,
     "image":arr
   };
 });
};

/** @ignore */
H3DU.Texture.prototype.loadImage = function() {
  "use strict";
  if(typeof this.image !== "undefined" && this.image !== null) {
  // already loaded
    return Promise.resolve(this);
  }
  var that = this;
  var thisName = this.name;
  that.loadStatus = 1;
 // Use the TGA image loader if it has the TGA file
 // extension
  if((/\.tga$/i).test(thisName)) {
    return H3DU.Texture.loadTga(thisName).then(function(e) {
      that.image = e.image;
      that.width = e.width;
      that.height = e.height;
      that.loadStatus = 2;
      return that;
    }, function(e) {
      that.loadStatus = -1;
      return Promise.reject({
        "name":thisName,
        "error":e
      });
    });
  }
  return new Promise(function(resolve, reject) {
    var image = new Image();
    image.onload = function(e) {
      var target = e.target;
      that.image = target;
      that.width = target.width;
      that.height = target.height;
      that.loadStatus = 2;
   // console.log("loaded: "+thisName)
      image.onload = null;
      image.onerror = null;
      resolve(that);
    };
    image.onerror = function(e) {
      that.loadStatus = -1;
   // console.log("error: "+thisName)
   // console.log(e)
      image.onload = null;
      image.onerror = null;
      reject({
        "name":thisName,
        "error":e
      });
    };
    image.src = thisName;
  });
};
/**
 * Disposes resources used by this texture.
 * @instance
 * @returns {Object} Return value.
 */
H3DU.Texture.prototype.dispose = function() {
  "use strict";
  this.width = 0;
  this.height = 0;
  this.name = "";
  if(this.image) {
    if(typeof this.image.onload !== "undefined" && this.image.onload !== null) {
      this.image.onload = null;
    }
    if(typeof this.image.onerror !== "undefined" && this.image.onerror !== null) {
      this.image.onerror = null;
    }
  }
  this.image = null;
  this.clamp = false;
  this.loadStatus = 0;
};

/**
 * Gets the name of this texture.
 * @returns {String} Return value.
 * @instance
 */
H3DU.Texture.prototype.getName = function() {
  "use strict";
  return name;
};
/** @ignore */
H3DU.Texture._texOrString = function(tex) {
  "use strict";
  return typeof tex === "string" ? new H3DU.Texture(tex) : tex;
};
/** @ignore */
H3DU.Texture._texOrInfoOrString = function(tex) {
  "use strict";
  if(typeof tex === "undefined" || tex === null)return null;
  if(typeof tex === "string")return new H3DU.Texture(tex);
  if(tex instanceof H3DU.TextureInfo)return new H3DU.TextureInfo(tex.uri);
  return tex;
};

// //////////////////////////////////////////

/**
 * A cube map, or a set of six textures forming the sides of a cube.
 * @param {Array<String|Texture|TextureInfo>} name An array of six elements,
 * each of which is a URL of the texture data or the texture object itself.
 * However, this constructor will not load those images yet.
 * The six texture are, in order, the texture seen when looking toward the positive
 * X axis, the negative X axis, positive Y, negative Y, positive Z,
 * and negative Z.
 * @class
 * @memberof H3DU
 */
H3DU.CubeMap = function(textures) {
  "use strict";
  this.textures = [];
  this.loadStatus = 0;
  for(var i = 0; i < 6; i++) {
    this.textures.push(H3DU.Texture._texOrInfoOrString(textures[i]));
  }
};
/**
 * Gets this texture's known width.
 * @returns {Number} This texture's width in pixels.
 * Will be 0 if the texture's image data wasn't loaded yet.
 * @instance
 */
H3DU.CubeMap.prototype.getWidth = function() {
  "use strict";
  return this.textures[0].getWidth();
};
/**
 * Gets this texture's known height.
 * @returns {Number} This texture's height in pixels.
 * Will be 0 if the texture's image data wasn't loaded yet.
 * @instance
 */
H3DU.CubeMap.prototype.getHeight = function() {
  "use strict";
  return this.textures[0].getHeight();
};
/**
 * Sets a texture used by this cube map.
 * @param {Number} index Texture index to set, from 0 through 5.
 * @param {H3DU.Texture|H3DU.TextureInfo|String} texture An {@link H3DU.Texture} object,
 * a texture information object,
 * or a string with the URL of the texture data.
 * @returns {H3DU.CubeMap} This object.
 * @instance
 */
H3DU.CubeMap.prototype.setTexture = function(index, texture) {
  "use strict";
  if(index < 0 || index >= 6)return this;
  this.textures[index] = H3DU.Texture._texOrInfoOrString(texture);
  return this;
};
/**
 * Gets a texture used by this cube map.
 * @param {Number} index Texture index to get.
 * @returns {H3DU.Texture} The texture with the given index.
 * @instance
 */
H3DU.CubeMap.prototype.getTexture = function(index) {
  "use strict";
  if(index < 0 || index >= 6)return this;
  return this.textures[index];
};
/** @ignore */
H3DU.CubeMap.prototype.loadImage = function() {
  "use strict";
  var i;
  if(this.loadStatus === 2) {
    for(i = 0; i < 6; i++) {
      if(this.textures[i].loadStatus !== 2) {
        this.loadStatus = 0;
      }
    }
    if(this.loadStatus === 2) {
      return Promise.resolve(this);
    }
  }
  var promises = [];
  for(i = 0; i < 6; i++) {
    promises.push(this.textures[i].loadImage());
  }
  var that = this;
  that.loadStatus = 1;
  return H3DU.getPromiseResultsAll(promises).then(function() {
    that.loadStatus = 2;
    return Promise.resolve(that);
  });
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/**
 * A surface evaluator object for a parametric surface.<p>
 * A parametric surface is a surface whose points are based on a
 * parametric surface function. A surface function takes two numbers
 * (U and V) and returns a point (in 1, 2, 3 or more dimensions, but
 * usually 2 or 3) that lies on the surface. For example, in 3
 * dimensions, a surface function has the following form:<p>
 * <b>F</b>(u, v) = [ x(u, v), y(u, v), z(u, v) ]<p>
 * where x(u, v) returns an X coordinate, y(u, v) a Y coordinate,
 * and z(u, v) returns a Z coordinate.<p>
 * Specialized curves should subclass this class and implement
 * the methods mentioned in the "curve" parameter below.
 * @class
 * @memberof H3DU
 * @params {Object} curve A <b>surface evaluator object</b>, which is an object that
 * must contain an <code>evaluate</code> method and may contain the <code>endPoints</code>,
 * <code>tangent</code>, <code>bitangent</code>, and/or <code>gradient</code>
 * methods, as described in the corresponding methods of this class.
 */
H3DU.Surface = function(surface) {
  "use strict";
  this.surface = (typeof surface==="undefined" ? null : (surface));
};
/**
 * TODO: Not documented yet.
 * @param {*} u
 * @param {*} v
 * @returns {*}
 * @instance
 */
H3DU.Surface.prototype.tangent=function(u,v){
	if((typeof this.surface!=="undefined" && this.surface!==null) && (typeof this.surface.tangent!=="undefined" && this.surface.tangent!==null)){
		return this.surface.tangent(u,v)
	} else {
	}
}
/**
 * TODO: Not documented yet.
 * @param {*} u
 * @param {*} v
 * @returns {*}
 * @instance
 */
H3DU.Surface.prototype.bitangent=function(u,v){
	if((typeof this.surface!=="undefined" && this.surface!==null) && (typeof this.surface.bitangent!=="undefined" && this.surface.bitangent!==null)){
		return this.surface.bitangent(u,v)
	} else {
	}
}
/**
 * TODO: Not documented yet.
 * @param {*} u
 * @param {*} v
 * @returns {*}
 * @instance
 */
H3DU.Surface.prototype.gradient=function(u,v){
	if((typeof this.surface!=="undefined" && this.surface!==null) && (typeof this.surface.gradient!=="undefined" && this.surface.gradient!==null)){
		return this.surface.gradient(u,v)
	} else {
	}
}
/**
 * TODO: Not documented yet.
 * @param {*} u
 * @param {*} v
 * @returns {*}
 * @instance
 */
H3DU.Surface.prototype.evaluate=function(u,v){
	if((typeof this.evaluate!=="undefined" && this.evaluate!==null) && (typeof this.surface.evaluate!=="undefined" && this.surface.evaluate!==null)){
		return this.surface.evaluate(u,v)
	} else {
		return [0,0,0]
	}
}
/**
 * TODO: Not documented yet.
 * @returns {*}
 * @instance
 */
H3DU.Surface.prototype.endPoints=function(){
	if((typeof this.evaluate!=="undefined" && this.evaluate!==null) && (typeof this.surface.endPoints!=="undefined" && this.surface.endPoints!==null)){
		return this.surface.endPoints()
	} else {
		return [0,1]
	}
}
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU, WebGL2RenderingContext */
/**
 * A geometric mesh in the form of buffer objects.
 * @deprecated This class is likely to become a private class.
 * Use the {@link H3DU.MeshBuffer} class instead, which is not coupled to WebGL
 * contexts.
 * @class
 * @memberof H3DU
 * @param {H3DU.Mesh|H3DU.MeshBuffer} mesh
 * A geometric mesh object. Cannot be null.
 * @param {WebGLRenderingContext|WebGL2RenderingContext|object} context A WebGL context to
 * create a buffer from, or an object, such as H3DU.Scene3D, that
 * implements a no-argument <code>getContext</code> method
 * that returns a WebGL context. (Note that this constructor uses
 * a WebGL context rather than a shader program because
 * buffer objects are not specific to shader programs.)
 */
H3DU.BufferedMesh = function(mesh, context) {
  "use strict";
  context = context.getContext ? context.getContext() : context;
  if(mesh instanceof H3DU.MeshBuffer) {
    this._bounds = mesh._bounds;
  } else {
    this._bounds = mesh.getBoundingBox();
  }
  this._initialize(mesh, context);
};
/** @ignore */
H3DU.BufferedMesh.prototype._getArrayObjectExt = function(context) {
  "use strict";
  if(typeof this.arrayObjectExt === "undefined" || this.arrayObjectExt === null) {
    this.arrayObjectExt = context.getExtension("OES_vertex_array_object");
    this.arrayObjectExtContext = context;
    return this.arrayObjectExt;
  } else if(this.arrayObjectExtContext === context) {
    return this.arrayObjectExt;
  } else {
    return context.getExtension("OES_vertex_array_object");
  }
};
/** @ignore */
H3DU.BufferedMesh.prototype._createVertexArray = function(context) {
  "use strict";
  if(typeof WebGL2RenderingContext !== "undefined" && WebGL2RenderingContext !== null &&
  context instanceof WebGL2RenderingContext) {
    return context.createVertexArray();
  } else if(context instanceof WebGLRenderingContext) {
    var ao = this._getArrayObjectExt(context);
    return typeof ao === "undefined" || ao === null ? null : ao.createVertexArrayOES();
  }
  return null;
};
/** @ignore */
H3DU.BufferedMesh.prototype._deleteVertexArray = function(context, va) {
  "use strict";
  if(typeof WebGL2RenderingContext !== "undefined" && WebGL2RenderingContext !== null &&
  context instanceof WebGL2RenderingContext) {
    context.deleteVertexArray(va);
  } else if(context instanceof WebGLRenderingContext) {
    var ao = this._getArrayObjectExt(context);
    if(typeof ao !== "undefined" && ao !== null) {
      ao.deleteVertexArrayOES(va);
    }
  }
};
/** @ignore */
H3DU.BufferedMesh.prototype._bindVertexArray = function(context, va) {
  "use strict";
  if(typeof WebGL2RenderingContext !== "undefined" && WebGL2RenderingContext !== null &&
  context instanceof WebGL2RenderingContext) {
    context.bindVertexArray(va);
  } else if(context instanceof WebGLRenderingContext) {
    var ao = this._getArrayObjectExt(context);
    if(typeof ao !== "undefined" && ao !== null) {
      ao.bindVertexArrayOES(va);
    }
  }
};
/** @ignore */
H3DU.BufferedMesh.prototype._initialize = function(mesh, context) {
  "use strict";
  if(typeof mesh === "undefined" || mesh === null)throw new Error("mesh is null");
  var smb = mesh instanceof H3DU.MeshBuffer ? mesh :
   new H3DU.MeshBuffer(mesh);
  this.smb = smb;
  this.vertsMap = new H3DU.BufferedMesh._Map();
  this.indices = context.createBuffer();
  if(typeof this.indices === "undefined" || this.indices === null)throw new Error("can't create face buffer");
  this.vao = this._createVertexArray(this.context);
  var attribs = smb._getAttributes();
  for(var i = 0; i < attribs.length; i++) {
    var vb = attribs[i][2];
    if(vb) {
      if(!this.vertsMap.get(vb)) {
       // Vertex array not seen yet, create a buffer object
       // and copy the array's data to that object
        var vbuffer = context.createBuffer();
        if(typeof vbuffer === "undefined" || vbuffer === null) {
          throw new Error("can't create buffer");
        }
        context.bindBuffer(context.ARRAY_BUFFER, vbuffer);
        context.bufferData(context.ARRAY_BUFFER,
       vb, context.STATIC_DRAW);
        this.vertsMap.put(vb, vbuffer);
      }
    }
  }
  context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, this.indices);
  context.bufferData(context.ELEMENT_ARRAY_BUFFER,
    smb.indices, context.STATIC_DRAW);
  var type = context.UNSIGNED_SHORT;
  if(smb.indexBufferSize === 4) {
    type = context.UNSIGNED_INT;
  } else if(smb.indexBufferSize === 1) {
    type = context.UNSIGNED_BYTE;
  }
  this.type = type;
  this.context = context;
  this._lastKnownProgram = null;
  this._attribLocations = [];
  this._attribNames = [];
};
/** @ignore */
H3DU.BufferedMesh.prototype._toMeshBuffer = function() {
  "use strict";
  return this.smb;
};
/** @ignore */
H3DU.BufferedMesh.prototype._getVaoExtension = function() {
  "use strict";
};
/** @ignore */
H3DU.BufferedMesh.prototype._getBounds = function() {
  "use strict";
  return this._bounds;
};
/**
 * Returns the WebGL context associated with this object.
 * @deprecated
 * @returns {WebGLRenderingContext|WebGL2RenderingContext} Return value.
 * @instance
 */
H3DU.BufferedMesh.prototype.getContext = function() {
  "use strict";
  return this.context;
};
/** @ignore */
H3DU.BufferedMesh.prototype.getFormat = function() {
  "use strict";
  return this.smb.format;
};

/**
 * Deletes the vertex and index buffers associated with this object.
 * @instance
 * @returns {Object} Return value.
 */
H3DU.BufferedMesh.prototype.dispose = function() {
  "use strict";
  if(typeof this.vertsMap !== "undefined" && this.vertsMap !== null) {
    var verts = this.vertsMap.values();
    for(var i = 0; i < verts.length; i++) {
      verts[i].dispose();
    }
  }
  if(typeof this.indices !== "undefined" && this.indices !== null) {
    this.context.deleteBuffer(this.indices);
  }
  if(typeof this.vao !== "undefined" && this.vao !== null) {
    this._deleteVertexArray(this.context, this.vao);
  }
  this.vertsMap = null;
  this.indices = null;
  this.smb = null;
  this.vao = null;
  this._lastKnownProgram = null;
  this._attribLocations = [];
  this._attribNames = [];
};

/** @ignore */
H3DU.BufferedMesh.prototype._getAttribLocations = function(program) {
  "use strict";
  if(this._lastKnownProgram !== program) {
    this._lastKnownProgram = program;
    var attrs = this.smb._getAttributes();
    this._attribLocations = [];
    for(var i = 0; i < attrs.length; i++) {
      var arrLoc = [];
      var arrName = [];
      program._addNamesWithSemantic(arrName, attrs[i][0], attrs[i][5]);
      for(var j = 0; j < arrName.length; j++) {
        var loc = program.get(arrName[j]);
        if(typeof loc === "undefined" || loc === null) {
          loc = -1;
        }
        arrLoc.push(loc);
      }
      this._attribLocations[i] = arrLoc;
      this._attribNames[i] = arrName;
    }
    return true;
  }
  return false;
};

/** @ignore */
H3DU.BufferedMesh.prototype._prepareDraw = function(program, context) {
  "use strict";
  var rebind = this._getAttribLocations(program, context);
  if(this.vao) {
    this._bindVertexArray(context, this.vao);
  } else {
    rebind = true;
  }
  if(rebind) {
    context.bindBuffer(context.ELEMENT_ARRAY_BUFFER, this.indices);
    var attrs = this.smb._getAttributes();
    var attrNamesEnabled = [];
    for(var i = 0; i < this._attribLocations.length; i++) {
      for(var j = 0; j < this._attribLocations[i].length; j++) {
        var attrib = this._attribLocations[i][j];
        if(attrib >= 0) {
          var vertBuffer = this.vertsMap.get(attrs[i][2]);
          context.bindBuffer(context.ARRAY_BUFFER, vertBuffer);
          context.enableVertexAttribArray(attrib);
          context.vertexAttribPointer(attrib, attrs[i][3],
         context.FLOAT, false, attrs[i][4] * 4, attrs[i][1] * 4);
          attrNamesEnabled.push(this._attribNames[i][j]);
        }
      }
    }
    program._disableOthers(attrNamesEnabled);
  }
};
/**
 * Binds the buffers in this object to attributes according
 * to their data format, and draws the elements in this mesh
 * according to the data in its buffers.
 * @deprecated
 * @param {H3DU.ShaderProgram} program A shader program object to get
 * the IDs from for attributes named "position", "normal",
 * "colorAttr", and "uv", and the "useColorAttr" uniform.
 * @instance
 * @returns {Object} Return value.
 */
H3DU.BufferedMesh.prototype.draw = function(program) {
  "use strict";
  // Binding phase
  var context = program.getContext();
  if(typeof this.vertsMap === "undefined" || this.vertsMap === null) {
    throw new Error("mesh buffer disposed");
  }
  if(context !== this.context) {
    throw new Error("can't bind mesh: context mismatch");
  }
  this._prepareDraw(program, context);
  // Drawing phase
  var primitive = context.TRIANGLES;
  if((this.smb.format & H3DU.Mesh.LINES_BIT) !== 0) {
    primitive = context.LINES;
  }
  if((this.smb.format & H3DU.Mesh.POINTS_BIT) !== 0) {
    primitive = context.POINTS;
  }
  context.drawElements(primitive,
    this.smb.indices.length,
    this.type, 0);
  this._bindVertexArray(context, null);
};
/**
 * Gets the number of vertices composed by all shapes in this mesh.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.BufferedMesh.prototype.vertexCount = function() {
  "use strict";
  return this.smb.indices.length;
};
/**
 * Gets the number of primitives (triangles, lines,
 * and points) composed by all shapes in this mesh.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.BufferedMesh.prototype.primitiveCount = function() {
  "use strict";
  return this.smb.primitiveCount();
};

/** @ignore */
H3DU.BufferedMesh._Map = function() {
  "use strict";
  this.map = [];
};
/** @ignore */
H3DU.BufferedMesh._Map.prototype.get = function(o) {
  "use strict";
  for(var i = 0; i < this.map.length; i++) {
    if(this.map[i][0] === o)return this.map[i][1];
  }
  return null;
};
/** @ignore */
H3DU.BufferedMesh._Map.prototype.put = function(k, v) {
  "use strict";
  for(var i = 0; i < this.map.length; i++) {
    if(this.map[i][0] === k) {
      this.map[i][1] = v;
      return;
    }
  }
  this.map.push([k, v]);
};
/** @ignore */
H3DU.BufferedMesh._Map.prototype.values = function() {
  "use strict";
  var ret = [];
  for(var i = 0; i < this.map.length; i++) {
    ret.push(this.map[i][1]);
  }
  return ret;
};

/** @ignore */
H3DU.BufferedMesh._MeshLoader = function() {
  "use strict";
  this.meshes = [];
};
/** @ignore */
H3DU.BufferedMesh._MeshLoader.prototype.draw = function(meshBuffer, prog) {
  "use strict";
  if(!(meshBuffer instanceof H3DU.MeshBuffer)) {
    throw new Error("Expected H3DU.MeshBuffer");
  }
  var context = prog.getContext();
  for(var i = 0; i < this.meshes.length; i++) {
    var m = this.meshes[i];
    if(m[0] === meshBuffer && m[1] === context) {
      m[2].draw(prog);
      return;
    }
  }
  var bm = new H3DU.BufferedMesh(meshBuffer, prog);
  this.meshes.push([meshBuffer, context, bm]);
  bm.draw(prog);
};
/** @ignore */
H3DU.BufferedMesh._MeshLoader.prototype.dispose = function() {
  "use strict";
  for(var i = 0; i < this.meshes.length; i++) {
    this.meshes[i][2].dispose();
  }
  this.meshes = [];
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU */

/**
 * A collection of math functions for working
 * with vectors, matrices, quaternions, and other
 * mathematical objects.<p>
 * See the tutorial "{@tutorial glmath}" for more information.
 * @class
 * @memberof H3DU
 */
H3DU.Math = {
/**
 * Finds the cross product of two 3-element vectors (called A and B).
 * The following are properties of the cross product:<ul>
 * <li>The cross product will be a vector that is <i>orthogonal</i> (perpendicular) to both A and B.
 * <li>Switching the order of A and B results in a cross product
 * vector with the same length but opposite direction. (Thus, the cross product is not <i>commutative</i>,
 * but it is <i>anticommutative</i>.)
 * </ul>
 * <li>Let there be a triangle formed by point A, point B, and the point (0,0,0) in that order.
 * While the cross product of A and B points toward the viewer,
 * the triangle's vertices are oriented counterclockwise for [right-handed coordinate systems]{@tutorial glmath},
 * or clockwise for left-handed systems. The triangle's area is half of the cross product's length.
 * <li>The length of the cross
 * product equals |<b>a</b>| &#x2a; |<b>b</b>| &#x2a; |sin &theta;|
 * where |<b>x</b>| is the length of vector <b>x</b>, and
 * &theta; is the shortest angle between <b>a</b> and <b>b</b>.
 * It follows that:<ul>
 * <li>If the length is 0, then A and B are parallel vectors (0 or 180 degrees apart).
 * <li>If A and B are [unit vectors]{@tutorial glmath}, the length equals the absolute value
 * of the sine of the shortest angle between A and B.
 * <li>If A and B are unit vectors, the cross product will be a unit vector only if A is perpendicular
 * to B (the shortest angle between A and B will be 90 degrees, since sin 90&deg; = 1).
 * </ul>
 * The cross product (<b>c</b>) of vectors <b>a</b> and <b>b</b> is found as
 * follows:<br>
 * <b>c</b>.x = <b>a</b>.y &#x2a; <b>b</b>.z - <b>a</b>.z &#x2a; <b>b</b>.y<br>
 * <b>c</b>.y = <b>a</b>.z &#x2a; <b>b</b>.x - <b>a</b>.x &#x2a; <b>b</b>.z<br>
 * <b>c</b>.z = <b>a</b>.x &#x2a; <b>b</b>.y - <b>a</b>.y &#x2a; <b>b</b>.x<br>
 * @param {Array<Number>} a The first 3-element vector.
 * @param {Array<Number>} b The second 3-element vector.
 * @returns {Array<Number>} A 3-element vector containing the cross product.
 * @example <caption>The following example uses the cross product to
 * calculate a triangle's normal vector and its area.</caption>
 * var a=triangle[0];
 * var b=triangle[1];
 * var c=triangle[2];
 * // Find vector from C to A
 * var da=H3DU.Math.vec3sub(a,c);
 * // Find vector from C to B
 * var db=H3DU.Math.vec3sub(b,c);
 * // The triangle's normal is the cross product of da and db
 * var normal=H3DU.Math.vec3cross(da,db);
 * // Find the triangle's area
 * var area=H3DU.Math.vec3length(normal)*0.5;
 * @example <caption>The following example finds the cosine and sine of
 * the angle between two unit vectors and the orthogonal unit vector of both.</caption>
 * var cr=H3DU.Math.vec3cross(unitA,unitB);
 * // Cosine of the angle. Will be positive or negative depending on
 * // the shortest angle between the vectors.
 * var cosine=H3DU.Math.vec3dot(unitA,unitB);
 * // Sine of the angle. Note that the sine will always be 0 or greater because
 * // the shortest angle between the vectors will always be 0 to 180 degrees.
 * var sine=H3DU.Math.vec3length(cr);
 * // Cross product as a unit vector
 * var normCross=sine==0 ? cr : H3DU.Math.vec3scale(cr,1.0/sine);
 */
  "vec3cross":function(a, b) {
    "use strict";
    return [a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]];
  },
/**
 * Finds the dot product of two 3-element vectors. It's the
 * sum of the products of their components (for example, <b>a</b>'s X times
 * <b>b</b>'s X).<p>
 * The following are properties of the dot product:
 * <ul>
 * <li>The dot
 * product equals |<b>a</b>| &#x2a; |<b>b</b>| &#x2a; cos &theta;
 * where |<b>x</b>| is the length of vector <b>x</b>, and
 * &theta; is the shortest angle between <b>a</b> and <b>b</b>.
 * It follows that:<ul>
 * <li>A dot product of 0 indicates that the vectors are 90
 * degrees apart, making them <i>orthogonal</i>
 * (perpendicular to each other).
 * <li>A dot product greater than 0 means less than 90 degrees apart.
 * <li>A dot product less than 0 means greater than 90 degrees apart.
 * <li>If both vectors are [unit vectors]{@tutorial glmath}, the cosine
 * of the shortest angle between them is equal to their dot product.
 * However, <code>Math.acos</code> won't return a negative angle
 * from that cosine, so the dot product can't
 * be used to determine if one vector is "ahead of" or "behind" another
 * vector.
 * <li>If both vectors are unit vectors, a dot product of 1 or -1 indicates
 * that the two vectors are parallel (and the vectors are 0 or
 * 180 degrees apart, respectively.)
 * <li>If one of the vectors is a unit vector, the dot product's absolute
 * value will be the length that vector must have to make the closest
 * approach to the other vector's endpoint. If the dot product is negative,
 * the unit vector must also be in the opposite direction to approach the
 * other vector's endpoint.
 * </ul></li>
 * <li>If the two vectors are the same, the return value indicates
 * the vector's length squared. This is illustrated in the example.
 * <li>Switching the order of the two vectors results in the
 * same cross product. (Thus, the dot product is <i>commutative</i>.)
 * </ul>
 * @param {Array<Number>} a The first 3-element vector.
 * @param {Array<Number>} b The second 3-element vector.
 * @returns {Number} A number representing the dot product.
 * @example <caption>The following shows a fast way to compare
 * a vector's length using the dot product.</caption>
 * // Check if the vector's length squared is less than 20 units squared
 * if(H3DU.Math.vec3dot(vector, vector)<20*20) {
 * // The vector's length is shorter than 20 units
 * }
 */
  "vec3dot":function(a, b) {
    "use strict";
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  },
/**
 * Finds the scalar triple product of three vectors (A, B, and C). The triple
 * product is the [dot product]{@link H3DU.Math.vec3dot} of both A and the
 * [cross product]{@link H3DU.Math.vec3cross}
 * of B and C. The following are properties of the scalar triple product
 * (called triple product in what follows):<ul>
 * <li>Switching the order of B and C, A and C, or A and B results in a triple product
 * with its sign reversed. Moving all three parameters to different positions, though,
 * results in the same triple product.
 * <li>The triple product's absolute value is the volume of a parallelepiped (skewed
 * box) where three of its sides having a vertex in common are
 * defined by A, B, and C, in any order.
 * <li>If the triple product is 0, all three vectors lie on the same plane (are <i>coplanar</i>).
 * <li>The triple product is the same as the <i>determinant</i> (overall scaling factor)
 * of a 3x3 matrix whose rows or columns are the vectors A, B, and C, in that order.
 * <li>Assume A is perpendicular to vectors B and C. If the triple product
 * is positive (resp. negative), then A points at (resp.
 * points directly away from) the cross product of
 * B and C -- which will be perpendicular -- and the angle from B to C, when rotated
 * about vector A, is positive (resp. negative). (See the example below.)
 * </ul>
 * @param {Array<Number>} a The first 3-element vector.
 * @param {Array<Number>} b The second 3-element vector, or the
 * first parameter to the cross product.
 * @param {Array<Number>} c The third 3-element vector, or the
 * second parameter to the cross product.
 * @returns {Number} A number giving the triple product.
 */
  "vec3triple":function(a, b, c) {
    "use strict";
    return H3DU.Math.vec3dot(H3DU.Math.vec3cross(b, c));
  },
/**
 * Adds two 3-element vectors and returns a new
 * vector with the result. Adding two vectors
 * is the same as adding each of their components.
 * The resulting vector describes a straight-line path for the
 * combined paths described by the given vectors, in either order.
 * @param {Array<Number>} a The first 3-element vector.
 * @param {Array<Number>} b The second 3-element vector.
 * @returns {Array<Number>} The resulting 3-element vector.
 */
  "vec3add":function(a, b) {
    "use strict";
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  },
/**
 * Subtracts the second vector from the first vector and returns a new
 * vector with the result. Subtracting two vectors
 * is the same as subtracting each of their components.<p>
 * @param {Array<Number>} a The first 3-element vector.
 * @param {Array<Number>} b The second 3-element vector.
 * @returns {Array<Number>} The resulting 3-element vector.
 * This is the vector <i>to <code>a</code> from <code>b</code></i>.
 */
  "vec3sub":function(a, b) {
    "use strict";
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  },
/**
 * Adds two 3-element vectors and stores
 * the result in the first vector. Adding two vectors
 * is the same as adding each of their components.
 * The resulting vector describes a straight-line path for the
 * combined paths described by the given vectors, in either order.
 * @param {Array<Number>} a The first 3-element vector.
 * @param {Array<Number>} b The second 3-element vector.
 * @returns {Array<Number>} The parameter "a"
 */
  "vec3addInPlace":function(a, b) {
// Use variables in case a and b are the same
    "use strict";
    var b0 = b[0];
    var b1 = b[1];
    var b2 = b[2];
    a[0] += b0;
    a[1] += b1;
    a[2] += b2;
    return a;
  },
/**
 * Subtracts the second vector from the first vector and stores
 * the result in the first vector. Subtracting two vectors
 * is the same as subtracting each of their components.
 * @param {Array<Number>} a The first 3-element vector.
 * @param {Array<Number>} b The second 3-element vector.
 * @returns {Array<Number>} The parameter "a".
 * This is the vector <i>to the previous <code>a</code> from <code>b</code></i>.
 */
  "vec3subInPlace":function(a, b) {
// Use variables in case a and b are the same
    "use strict";
    var b0 = b[0];
    var b1 = b[1];
    var b2 = b[2];
    a[0] -= b0;
    a[1] -= b1;
    a[2] -= b2;
    return a;
  },
/**
 * Adds two 4-element vectors and returns a new
 * vector with the result. Adding two vectors
 * is the same as adding each of their components.
 * The resulting vector describes a straight-line path for the
 * combined paths described by the given vectors, in either order.
 * @param {Array<Number>} a The first 4-element vector.
 * @param {Array<Number>} b The second 4-element vector.
 * @returns {Array<Number>} The resulting 4-element vector.
 */
  "vec4add":function(a, b) {
    "use strict";
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3]];
  },
/**
 * Subtracts the second vector from the first vector and returns a new
 * vector with the result. Subtracting two vectors
 * is the same as subtracting each of their components.<p>
 * @param {Array<Number>} a The first 4-element vector.
 * @param {Array<Number>} b The second 4-element vector.
 * @returns {Array<Number>} The resulting 4-element vector.
 * This is the vector <i>to <code>a</code> from <code>b</code></i>.
 */
  "vec4sub":function(a, b) {
    "use strict";
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2], a[3] - b[3]];
  },
/**
 * Adds two 4-element vectors and stores
 * the result in the first vector. Adding two vectors
 * is the same as adding each of their components.
 * The resulting vector describes a straight-line path for the
 * combined paths described by the given vectors, in either order.
 * @param {Array<Number>} a The first 4-element vector.
 * @param {Array<Number>} b The second 4-element vector.
 * @returns {Array<Number>} The parameter "a".
 * This is the vector <i>to the previous <code>a</code> from <code>b</code></i>.
 */
  "vec4addInPlace":function(a, b) {
// Use variables in case a and b are the same
    "use strict";
    var b0 = b[0];
    var b1 = b[1];
    var b2 = b[2];
    var b3 = b[3];
    a[0] += b0;
    a[1] += b1;
    a[2] += b2;
    a[3] += b3;
    return a;
  },
/**
 * Subtracts the second vector from the first vector and stores
 * the result in the first vector. Subtracting two vectors
 * is the same as subtracting each of their components.
 * @param {Array<Number>} a The first 4-element vector.
 * @param {Array<Number>} b The second 4-element vector.
 * @returns {Array<Number>} The parameter "a"
 */
  "vec4subInPlace":function(a, b) {
// Use variables in case a and b are the same
    "use strict";
    var b0 = b[0];
    var b1 = b[1];
    var b2 = b[2];
    var b3 = b[3];
    a[0] -= b0;
    a[1] -= b1;
    a[2] -= b2;
    a[3] -= b3;
    return a;
  },

/**
 * Returns a new 3-element
 * vector with the absolute value of each of its components.
 * @param {Array<Number>} a A 3-element vector.
 * @returns {Array<Number>} The resulting 3-element vector.
 */
  "vec3abs":function(a) {
    "use strict";
    return [Math.abs(a[0]), Math.abs(a[1]), Math.abs(a[2])];
  },
/**
 * Returns a new 4-element
 * vector with the absolute value of each of its components.
 * @param {Array<Number>} a A 4-element vector.
 * @returns {Array<Number>} The resulting 4-element vector.
 */
  "vec4abs":function(a) {
    "use strict";
    return [Math.abs(a[0]), Math.abs(a[1]), Math.abs(a[2]), Math.abs(a[3])];
  },
/**
 * Sets each component of the given 3-element
 * vector to its absolute value.
 * @param {Array<Number>} a A 3-element vector.
 * @returns {Array<Number>} The vector "a".
 */
  "vec3absInPlace":function(a) {
    "use strict";
    a[0] = Math.abs(a[0]);
    a[1] = Math.abs(a[1]);
    a[2] = Math.abs(a[2]);
    return a;
  },
/**
 * Sets each component of the given 4-element
 * vector to its absolute value.
 * @param {Array<Number>} a A 4-element vector.
 * @returns {Array<Number>} The vector "a".
 */
  "vec4absInPlace":function(a) {
    "use strict";
    a[0] = Math.abs(a[0]);
    a[1] = Math.abs(a[1]);
    a[2] = Math.abs(a[2]);
    a[3] = Math.abs(a[3]);
    return a;
  },
/**
 * Negates a 3-element vector and returns a new
 * vector with the result, which is generally a vector with
 * the same length but opposite direction. Negating a vector
 * is the same as reversing the sign of each of its components.
 * @param {Array<Number>} a A 3-element vector.
 * @returns {Array<Number>} The resulting 3-element vector.
 */
  "vec3negate":function(a) {
    "use strict";
    return [-a[0], -a[1], -a[2]];
  },
/**
 * Negates a 4-element vector and returns a new
 * vector with the result, which is generally a vector with
 * the same length but opposite direction. Negating a vector
 * is the same as reversing the sign of each of its components.
 * @param {Array<Number>} a A 4-element vector.
 * @returns {Array<Number>} The resulting 4-element vector.
 */
  "vec4negate":function(a) {
    "use strict";
    return [-a[0], -a[1], -a[2], -a[3]];
  },
/**
 * Negates a 3-element vector in place, generally resulting in a vector with
 * the same length but opposite direction.
 * Negating a vector
 * is the same as reversing the sign of each of its components.
 * @param {Array<Number>} a A 3-element vector.
 * @returns {Array<Number>} The parameter "a".
 */
  "vec3negateInPlace":function(a) {
    "use strict";
    a[0] = -a[0];
    a[1] = -a[1];
    a[2] = -a[2];
    return a;
  },
/**
 * Negates a 4-element vector in place, generally resulting in a vector with
 * the same length but opposite direction.
 * Negating a vector
 * is the same as reversing the sign of each of its components.
 * @param {Array<Number>} a A 4-element vector.
 * @returns {Array<Number>} The parameter "a".
 */
  "vec4negateInPlace":function(a) {
    "use strict";
    a[0] = -a[0];
    a[1] = -a[1];
    a[2] = -a[2];
    a[3] = -a[3];
    return a;
  },
/**
 * Multiplies two vectors and returns a new
 * vector with the result. Multiplying two vectors
 * is the same as multiplying each of their components.
 * @param {Array<Number>} a The first 3-element vector.
 * @param {Array<Number>} b The second 3-element vector.
 * @returns {Array<Number>} The resulting 3-element vector.
 */
  "vec3mul":function(a, b) {
    "use strict";
    return [a[0] * b[0], a[1] * b[1], a[2] * b[2]];
  },
/**
 * Multiplies two 3-element vectors and stores
 * the result in the first vector. Multiplying two vectors
 * is the same as multiplying each of their components.
 * @param {Array<Number>} a The first 3-element vector.
 * @param {Array<Number>} b The second 3-element vector.
 * @returns {Array<Number>} The parameter "a"
 */
  "vec3mulInPlace":function(a, b) {
// Use variables in case a and b are the same
    "use strict";
    var b0 = b[0];
    var b1 = b[1];
    var b2 = b[2];
    a[0] *= b0;
    a[1] *= b1;
    a[2] *= b2;
    return a;
  },
/**
 * Multiplies each element of a 3-element vector by a factor, so
 * that the vector points in the same direction
 * but its length is multiplied by the given factor.
 * @param {Array<Number>} a A 3-element vector.
 * @param {Number} scalar A factor to multiply. To divide
 * a vector by a number, the factor will be 1 divided by that number.
 * @returns {Array<Number>} The parameter "a".
 */
  "vec3scaleInPlace":function(a, scalar) {
    "use strict";
    a[0] *= scalar;
    a[1] *= scalar;
    a[2] *= scalar;
    return a;
  },
/**
 * Multiplies each element of a 3-element vector by a factor. Returns
 * a new vector that will point in the same direction
 * but with its length multiplied by the given factor.
 * @param {Array<Number>} a A 3-element vector.
 * @param {Number} scalar A factor to multiply. To divide
 * a vector by a number, the factor will be 1 divided by that number.
 * @returns {Array<Number>} The parameter "a".
 */
  "vec3scale":function(a, scalar) {
    "use strict";
    return H3DU.Math.vec3scaleInPlace([a[0], a[1], a[2]], scalar);
  },
/**
 * Does a linear interpolation between two 3-element vectors;
 * returns a new vector.
 * @param {Array<Number>} v1 The first vector to interpolate.
 * The interpolation will occur on each component of this vector and v2.
 * @param {Array<Number>} v2 The second vector to interpolate.
 * @param {Number} factor A value that usually ranges from 0 through 1. Closer to 0 means
 * closer to v1, and closer to 1 means closer to v2.<br>For a nonlinear
 * interpolation, define a function that takes a value that usually ranges from 0 through 1 and returns
 * a value generally ranging from 0 through 1, and pass the result of that
 * function to this method.<br>
 * The following are examples of interpolation functions. See also
 * the code examples following this list.<ul>
 * <li>Linear: <code>factor</code>. Constant speed.
 * <li>Powers: <code>Math.pow(factor, N)</code>, where N &gt; 0.
 * For example, N=2 means a square, N=3 means cube, N=1/2 means square root,
 * and N=1/3 means cube root. If N &gt; 1, this
 * function starts slow and ends fast. If N &lt; 1,
 * this function starts fast and ends slow.
 * <li>Sine: <code>Math.sin(Math.PI*0.5*factor)</code>. This function starts fast and ends slow.
 * <li>Smoothstep: <code>(3.0-2.0*factor)*factor*factor</code>. This function
 * starts and ends slow, and speeds up in the middle.
 * <li>Perlin's "Smootherstep": <code>(10+factor*(factor*6-15))*factor*factor*factor</code>. This function
 * starts and ends slow, and speeds up in the middle.
 * <li>Discrete-step timing, where N is a number of steps greater than 0:<ul>
 * <li>Position start: <code>factor &lt; 0 ? 0 : Math.max(1.0,(1.0+Math.floor(factor*N))/N)</code>.</li>
 * <li>Position end: <code>Math.floor(factor*N)/N</code>.</li></ul>
 * <li>Inverted interpolation: <code>1.0-INTF(1.0-factor)</code>,
 * where <code>INTF(x)</code>
 * is another interpolation function. This function reverses the speed behavior;
 * for example, a function that started fast now starts slow.
 * <li>Ease: <code>factor &lt; 0.5 ? INTF(factor*2)*0.5 : 1.0-(INTF((1.0-factor)*2)*0.5)</code>,
 * where <code>INTF(x)</code> is another interpolation function.
 * Depending on the underlying function, this function eases in,
 * then eases out, or vice versa.
 * </ul>
 * @returns {Array<Number>} The interpolated vector.
 * @example <caption>The following code does a nonlinear
 * interpolation of two vectors that uses the cube of "factor" rather than
 * "factor". Rather than at a constant speed, the vectors are interpolated
 * slowly then very fast.</caption>
 * factor = factor*factor*factor; // cube the interpolation factor
 * var newVector = H3DU.Math.vec3lerp(vector1, vector2, factor);
 * @example <caption>The following code does an inverted cubic
 * interpolation. This time, vectors are interpolated fast then very slowly.</caption>
 * factor = 1 - factor; // Invert the factor
 * factor = factor*factor*factor; // cube the interpolation factor
 * factor = 1 - factor; // Invert the result
 * var newVector = H3DU.Math.vec3lerp(vector1, vector2, factor);
 * @example <caption>The following code does the nonlinear
 *  interpolation called "smoothstep". It slows down at the beginning
 * and end, and speeds up in the middle.</caption>
 * factor = (3.0-2.0*factor)*factor*factor; // smoothstep interpolation
 * var newVector = H3DU.Math.vec3lerp(vector1, vector2, factor);
 */
  "vec3lerp":function(v1, v2, factor) {
    "use strict";
    return [
      v1[0] + (v2[0] - v1[0]) * factor,
      v1[1] + (v2[1] - v1[1]) * factor,
      v1[2] + (v2[2] - v1[2]) * factor
    ];
  },
/**
 * Returns an arbitrary 3-element vector that is perpendicular
 * (orthogonal) to the given 3-element vector. The return value
 * will not be converted to a [unit vector]{@tutorial glmath}.
 * @param {Array<Number>} vec A 3-element vector.
 * @returns {Array<Number>} A perpendicular 3-element
 * vector.  Returns (0,0,0) if "vec" is (0,0,0).
 */
  "vec3perp":function(vec) {
    "use strict";
    var absx = Math.abs(vec[0]);
    var absy = Math.abs(vec[1]);
    var absz = Math.abs(vec[2]);
    var mx = Math.max(absx, absy, absz);
    var normal = [0, 0, 0];
    if(mx === absx) {
      normal[0] = vec[1];
      normal[1] = -vec[0];
      normal[2] = 0;
    } else if(mx === absy) {
      normal[0] = 0;
      normal[1] = vec[2];
      normal[2] = -vec[1];
    } else {
      normal[0] = -vec[2];
      normal[1] = 0;
      normal[2] = vec[0];
    }
    return normal;
  },
/**
 * Returns the projection of a 3-element vector on the given
 * reference vector. Assuming both vectors
 * start at the same point, the resulting vector
 * will be parallel to the
 * reference vector but will make the closest
 * approach possible to the projected vector's
 * endpoint. The difference between the projected
 * vector and the return value will be perpendicular
 * to the reference vector.
 * @param {Array<Number>} vec The vector to project.
 * @param {Array<Number>} refVec The reference vector whose length
 * will be adjusted.
 * @returns {Array<Number>} The projection of
 * "vec" on "refVec".  Returns (0,0,0) if "refVec"'s
 * length is 0 or extremely close to 0.
 */
  "vec3proj":function(vec, refVec) {
    "use strict";
    var lensq = H3DU.Math.vec3dot(refVec, refVec);
    if(lensq === 0.0)return [0, 0, 0];
    return H3DU.Math.vec3scale(refVec,
    H3DU.Math.vec3dot(vec, refVec) / lensq);
  },
/**
 * Returns the projection of a 4-element vector on the given
 * reference vector. Assuming both vectors
 * start at the same point, the resulting vector
 * will be parallel to the
 * reference vector but will make the closest
 * approach possible to the projected vector's
 * endpoint. The difference between the projected
 * vector and the return value will be perpendicular
 * to the reference vector.
 * @param {Array<Number>} vec The vector to project.
 * @param {Array<Number>} refVec The reference vector whose length
 * will be adjusted.
 * @returns {Array<Number>} The projection of
 * "vec" on "refVec".  Returns (0,0,0,0) if "refVec"'s
 * length is 0 or extremely close to 0.
 */
  "vec4proj":function(vec, refVec) {
    "use strict";
    var lensq = H3DU.Math.vec4dot(refVec, refVec);
    if(lensq === 0.0)return [0, 0, 0];
    return H3DU.Math.vec4scale(refVec,
    H3DU.Math.vec4dot(vec, refVec) / lensq);
  },
/**
 * Returns a vector that reflects off a surface.
 * @param {Array<Number>} incident Incident vector, or
 * a vector headed in the direction of the surface, as a 3-element vector.
 * @param {Array<Number>} normal Surface normal vector, or
 * a vector that's perpendicular to the surface, as a 3-element vector.
 * Should be a [unit vector]{@tutorial glmath}.
 * @returns {Array<Number>} A vector that has the same length
 * as "incident" but is reflected away from the surface.
 */
  "vec3reflect":function(incident, normal) {
    "use strict";
    return H3DU.Math.vec3sub(incident,
     H3DU.math.vec3scale(normal, 2 * H3DU.Math.vec3dot(normal, incident)));
  },
/**
 * Transforms the 3D point specified in this 3-element vector to its
 * <i>window coordinates</i>
 * using the given transformation matrix and viewport rectangle.
 * @param {Array<Number>} vector A 3-element vector giving
 * the X, Y, and Z coordinates of the 3D point to transform.
 * @param {Array<Number>} matrix A 4x4 matrix to use to transform
 * the vector according to the {@link H3DU.Math.mat4projectVec3} method,
 * before the transformed vector is converted to window coordinates.
 * <br>This parameter will generally be
 * a projection-view matrix (projection matrix multiplied
 * by the view matrix, in that order), if the vector to transform is in <i>world space</i>,
 * or a model-view-projection matrix, that is, (projection-view matrix multiplied
 * by the model [world] matrix, in that order), if the vector is in <i>model
 * (object) space</i>.
 * <br>If the matrix includes a projection transform returned
 * by {@link H3DU.Math.mat4ortho}, {@link H3DU.Math.mat4perspective}, or
 * similar {@link H3DU.Math} methods, then in the <i>window coordinate</i> space,
 * X coordinates increase rightward, Y coordinates increase upward, and
 * Z coordinates within the view volume range from 0 to 1 and
 * increase from front to back, unless otherwise specified in those methods' documentation.
 * If "yUp" is omitted or is a "falsy" value, the Y coordinates increase downward
 * instead of upward or vice versa.
 * @param {Array<Number>} viewport A 4-element array specifying
 * the starting position and size of the viewport in window units
 * (such as pixels). In order, the four elements are the starting position's
 * X coordinate, its Y coordinate, the viewport's width, and the viewport's
 * height. Throws an error if the width or height is less than 0.
 * @param {Boolean} [yUp] If omitted or a "falsy" value, reverses the sign of
 * the Y coordinate returned by the {@link H3DU.Math.mat4projectVec3} method
 * before converting it to window coordinates. If true, the Y
 * coordinate will remain unchanged. If window Y coordinates increase
 * upward, the viewport's starting position is at the lower left corner. If those
 * coordinates increase downward, the viewport's starting position is
 * at the upper left corner.
 * @returns {Array<Number>} A 3-element array giving the window
 * coordinates, in that order.
 */
  "vec3toWindowPoint":function(vector, matrix, viewport, yUp) {
    "use strict";
    if(viewport[2] < 0 || viewport[3] < 0)throw new Error();
   // Transform the vector and do a perspective divide
    var vec = H3DU.Math.mat4projectVec3(matrix, vector);
   // Now convert the projected vector to window coordinates
    var halfWidth = viewport[2] * 0.5;
    var halfHeight = viewport[3] * 0.5;
    var vecY = yUp ? vec[1] : -vec[1];
    var x = vec[0] * halfWidth + halfWidth + viewport[0];
    var y = vecY * halfHeight + halfHeight + viewport[1];
    var z = (vec[2] + 1.0) * 0.5;
    return [x, y, z];
  },
/**
 * Unprojects the <i>window coordinates</i> given in a
 * 3-element vector,
 * using the given transformation matrix and viewport
 * rectangle.<p>
 * In the window coordinate space, X coordinates increase
 * rightward and Y coordinates increase upward
 * or downward depending on the "yUp" parameter, and
 * Z coordinates within the view volume range from 0 to 1 and
 * increase from front to back.
 * @param {Array<Number>} vector A 3-element vector giving
 * the X, Y, and Z coordinates of the 3D point to transform.
 * @param {Array<Number>} matrix A 4x4 matrix.
 * After undoing the transformation to window coordinates, the vector will
 * be transformed by the inverse of this matrix according to the
 * {@link H3DU.Math.mat4projectVec3} method.<br>
 * To convert to
 * world space, this parameter will generally be a projection-view matrix
 * (projection matrix multiplied by the view matrix, in that order). To convert to
 * object (model) space, this parameter will generally be a model-view-projection
 * matrix (projection-view matrix
 * multiplied by the world [model] matrix, in that order).
 * See {@link H3DU.Math.vec3toWindowPoint} for the meaning of window coordinates
 * with respect to the "matrix" and "yUp" parameters.
 * @param {Boolean} viewport Has the same meaning as "viewport" in
 * the {@link H3DU.Math.vec3toWindowPoint} method.
 * @param {Boolean} [yUp] Has the same meaning as "yUp" in
 * the {@link H3DU.Math.vec3toWindowPoint} method.
 * @returns {Array<Number>} A 3-element array giving the coordinates
 * of the unprojected point, in that order.
 */
  "vec3fromWindowPoint":function(vector, matrix, viewport, yUp) {
    "use strict";
    var halfWidth = viewport[2] * 0.5;
    var halfHeight = viewport[3] * 0.5;
    var x = 0;
    var y = 0;
    var z = vector[2] * 2.0 - 1.0;
    if(halfWidth !== 0 && halfHeight !== 0) {
      x = (vector[0] - viewport[0] - halfWidth) / halfWidth;
      y = (vector[1] - viewport[1] - halfHeight) / halfHeight;
    }
    y = yUp ? y : -y;
    var invMatrix = H3DU.Math.mat4invert(matrix);
    return H3DU.Math.mat4projectVec3(invMatrix, [x, y, z]);
  },
/**
 * Finds the dot product of two 4-element vectors. It's the
 * sum of the products of their components (for example, <b>a</b>'s X times <b>b</b>'s X).
 * For properties of the dot product, see {@link H3DU.Math.vec3dot}.
 * @param {Array<Number>} a The first 4-element vector.
 * @param {Array<Number>} b The second 4-element vector.
 * @returns {Object} Return value.
 */
  "vec4dot":function(a, b) {
    "use strict";
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  },
/**
 * Multiplies each element of a 4-element vector by a factor, so
 * that the vector points in the same direction
 * but its length is multiplied by the given factor.
 * @param {Array<Number>} a A 4-element vector.
 * @param {Number} scalar A factor to multiply. To divide
 * a vector by a number, the factor will be 1 divided by that number.
 * @returns {Array<Number>} The parameter "a".
 */
  "vec4scaleInPlace":function(a, scalar) {
    "use strict";
    a[0] *= scalar;
    a[1] *= scalar;
    a[2] *= scalar;
    a[3] *= scalar;
    return a;
  },
/**
 * Multiplies each element of a 4-element vector by a factor, returning
 * a new vector that will point in the same direction
 * but with its length multiplied by the given factor.
 * @param {Array<Number>} a A 4-element vector.
 * @param {Number} scalar A factor to multiply. To divide
 * a vector by a number, the factor will be 1 divided by that number.
 * @returns {Array<Number>} The resulting 4-element vector.
 */
  "vec4scale":function(a, scalar) {
    "use strict";
    return [a[0] * scalar, a[1] * scalar, a[2] * scalar, a[3] * scalar];
  },
/**
 * Does a linear interpolation between two 4-element vectors;
 * returns a new vector.
 * @param {Array<Number>} v1 The first vector to interpolate.
 * The interpolation will occur on each component of this vector and v2.
 * @param {Array<Number>} v2 The second vector to interpolate.
 * @param {Number} factor A value that usually ranges from 0 through 1. Closer to 0 means
 * closer to v1, and closer to 1 means closer to v2. For a nonlinear
 * interpolation, define a function that takes a value that usually ranges from 0 through 1
 * and generally returns
 * A value that usually ranges from 0 through 1, and pass the result of that function to this method.
 * See the documentation for {@link H3DU.Math.vec3lerp}
 * for examples of interpolation functions.
 * @returns {Array<Number>} The interpolated vector.
 */
  "vec4lerp":function(v1, v2, factor) {
    "use strict";
    return [
      v1[0] + (v2[0] - v1[0]) * factor,
      v1[1] + (v2[1] - v1[1]) * factor,
      v1[2] + (v2[2] - v1[2]) * factor,
      v1[3] + (v2[3] - v1[3]) * factor
    ];
  },
/**
 * Converts a 3-element vector to a [unit vector]{@tutorial glmath}.
 * When a vector is normalized, its direction remains the same but the distance from the origin
 * to that vector becomes 1 (unless all its components are 0).
 * A vector is normalized by dividing each of its components
 * by its [length]{@link H3DU.Math.vec3length}.<p>
 * ("Norm", as used in this method's name, means "normalize"; this is not to be
 * confused with a vector's "norm", another name for its length.)
 * @param {Array<Number>} vec A 3-element vector.
 * @returns {Array<Number>} The parameter "vec".
 * Note that due to rounding error, the vector's length might not be exactly equal to 1, and that the vector will remain unchanged if its length is 0 or extremely close to 0.
 */
  "vec3normalizeInPlace":function(vec) {
    "use strict";
    var x = vec[0];
    var y = vec[1];
    var z = vec[2];
    var len = Math.sqrt(x * x + y * y + z * z);
    if(len !== 0) {
      len = 1.0 / len;
      vec[0] *= len;
      vec[1] *= len;
      vec[2] *= len;
    }
    return vec;
  },
/**
 * Finds the straight-line distance from one three-element vector
 * to another, treating both as 3D points.
 * @param {Array<Number>} vecFrom The first 3-element vector.
 * @param {Array<Number>} vecTo The second 3-element vector.
 * @returns {Number} The distance between the two vectors.
 */
  "vec3dist":function(vecFrom, vecTo) {
    "use strict";
    return H3DU.Math.vec3length(H3DU.Math.vec3sub(vecFrom, vecTo));
  },
/**
 * Converts a 4-element vector to a [unit vector]{@tutorial glmath}.
 * When a vector is normalized, its direction remains the same but the distance from the origin
 * to that vector becomes 1 (unless all its components are 0).
 * A vector is normalized by dividing each of its components
 * by its [length]{@link H3DU.Math.vec4length}.<p>
 * ("Norm", as used in this method's name, means "normalize"; this is not to be
 * confused with a vector's "norm", another name for its length.)
 * @param {Array<Number>} vec A 4-element vector.
 * @returns {Array<Number>} The parameter "vec".
 * Note that due to rounding error, the vector's length might not be exactly equal to 1, and that the vector will remain unchanged if its length is 0 or extremely close to 0.
 */
  "vec4normalizeInPlace":function(vec) {
    "use strict";
    var x = vec[0];
    var y = vec[1];
    var z = vec[2];
    var w = vec[3];
    var len = Math.sqrt(x * x + y * y + z * z + w * w);
    if(len !== 0) {
      len = 1.0 / len;
      vec[0] *= len;
      vec[1] *= len;
      vec[2] *= len;
      vec[3] *= len;
    }
    return vec;
  },
/**
 * Converts a 3-element vector to a [unit vector]{@tutorial glmath}; returns a new vector.
 * When a vector is normalized, its direction remains the same but the distance from the origin
 * to that vector becomes 1 (unless all its components are 0).
 * A vector is normalized by dividing each of its components
 * by its [length]{@link H3DU.Math.vec3length}.<p>
 * ("Norm", as used in this method's name, means "normalize"; this is not to be
 * confused with a vector's "norm", another name for its length.)
 * @param {Array<Number>} vec A 3-element vector.
 * @returns {Array<Number>} The resulting vector.
 * Note that due to rounding error, the vector's length might not be exactly equal to 1, and that the vector will remain unchanged if its length is 0 or extremely close to 0.
 * @example <caption>The following example changes the
 * length of a line segment. </caption>
 * var startPt=[x1,y1,z1]; // Line segment's start
 * var endPt=[x2,y2,z2]; // Line segment's end
 * // Find difference between endPt and startPt
 * var delta=H3DU.Math.vec3sub(endPt,startPt);
 * // Normalize delta to a unit vector
 * var deltaNorm=H3DU.Math.vec3normalize(delta);
 * // Rescale to the desired length, here, 10
 * H3DU.Math.vec3scaleInPlace(deltaNorm,10);
 * // Find the new endpoint
 * endPt=H3DU.Math.vec3add(startPt,deltaNorm);
 */
  "vec3normalize":function(vec) {
    "use strict";
    return H3DU.Math.vec3normalizeInPlace([vec[0], vec[1], vec[2]]);
  },
/**
 * Converts a 4-element vector to a [unit vector]{@tutorial glmath}; returns a new vector.
 * When a vector is normalized, its direction remains the same but the distance from the origin
 * to that vector becomes 1 (unless all its components are 0).
 * A vector is normalized by dividing each of its components
 * by its [length]{@link H3DU.Math.vec4length}.<p>
 * ("Norm", as used in this method's name, means "normalize"; this is not to be
 * confused with a vector's "norm", another name for its length.)
 * @param {Array<Number>} vec A 4-element vector.
 * @returns {Array<Number>} The resulting vector.
 * Note that due to rounding error, the vector's length might not be exactly equal to 1, and that the vector will remain unchanged if its length is 0 or extremely close to 0.
 */
  "vec4normalize":function(vec) {
    "use strict";
    return H3DU.Math.vec4normalizeInPlace([vec[0], vec[1], vec[2], vec[3]]);
  },
/**
 * Returns the distance of this 3-element vector from the origin,
 * also known as its <i>length</i> or <i>magnitude</i>.
 * It's the same as the square root of the sum of the squares
 * of its components.<p>
 * Note that if vectors are merely sorted or compared by their lengths (and
 * those lengths are not added or multiplied together or the like),
 * it's faster to sort or compare them by the squares of their lengths (to find
 * the square of a 3-element vector's length, call {@link H3DU.Math.vec3dot}
 * passing the same vector as both of its arguments).
 * @param {Array<Number>} a A 3-element vector.
 * @returns {Number} Return value. */
  "vec3length":function(a) {
    "use strict";
    var dx = a[0];
    var dy = a[1];
    var dz = a[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  },
/**
 * Returns a 3-element vector in which each element of the given 3-element vector is clamped
 * so it's not less than one value or greater than another value.
 * @param {Array<Number>} a The vector to clamp.
 * @param {Number} min Lowest possible value. Should not be greater than "max".
 * @param {Number} max Highest possible value. Should not be less than "min".
 * @returns {Array<Number>} The resulting vector. */
  "vec3clamp":function(a, min, max) {
    "use strict";
    return H3DU.Math.vec3clampInPlace(H3DU.Math.vec3copy(a), min, max);
  },
/**
 * Returns a 4-element vector in which each element of the given 4-element vector is clamped
 * @param {Array<Number>} a The vector to clamp.
 * @param {Number} min Lowest possible value. Should not be greater than "max".
 * @param {Number} max Highest possible value. Should not be less than "min".
 * @returns {Array<Number>} The resulting vector. */
  "vec4clamp":function(a, min, max) {
    "use strict";
    return H3DU.Math.vec4clampInPlace(H3DU.Math.vec4copy(a), min, max);
  },
/**
 * Clamps each element of the given 3-element vector
 * so it's not less than one value or greater than another value.
 * @param {Array<Number>} a The vector to clamp.
 * @param {Number} min Lowest possible value. Should not be greater than "max".
 * @param {Number} max Highest possible value. Should not be less than "min".
 * @returns {Array<Number>} The resulting vector. */
  "vec3clampInPlace":function(a, min, max) {
    "use strict";
    var x = Math.min(max, Math.max(min, a[0]));
    var y = Math.min(max, Math.max(min, a[1]));
    var z = Math.min(max, Math.max(min, a[2]));
    a[0] = x;
    a[1] = y;
    a[2] = z;
    return a;
  },
/**
 * Clamps each element of the given 4-element vector
 * so it's not less than one value or greater than another value.
 * @param {Array<Number>} a The vector to clamp.
 * @param {Number} min Lowest possible value. Should not be greater than "max".
 * @param {Number} max Highest possible value. Should not be less than "min".
 * @returns {Array<Number>} The resulting vector. */
  "vec4clampInPlace":function(a, min, max) {
    "use strict";
    var x = Math.min(max, Math.max(min, a[0]));
    var y = Math.min(max, Math.max(min, a[1]));
    var z = Math.min(max, Math.max(min, a[2]));
    var w = Math.min(max, Math.max(min, a[3]));
    a[0] = x;
    a[1] = y;
    a[2] = z;
    a[3] = w;
    return a;
  },
/**
 * Returns the distance of this 4-element vector from the origin,
 * also known as its <i>length</i> or <i>magnitude</i>.
 * It's the same as the square root of the sum of the squares
 * of its components.<p>
 * Note that if vectors are merely sorted or compared by their lengths,
 * it's faster to sort or compare them by the squares of their lengths (to find
 * the square of a 4-element vector's length, call {@link H3DU.Math.vec4dot}
 * passing the same vector as both of its arguments).
 * @param {Array<Number>} a A 4-element vector.
 * @returns {Number} Return value. */
  "vec4length":function(a) {
    "use strict";
    var dx = a[0];
    var dy = a[1];
    var dz = a[2];
    var dw = a[3];
    return Math.sqrt(dx * dx + dy * dy + dz * dz + dw * dw);
  },
/**
 * Returns the identity 3x3 matrix (a matrix that keeps
 * vectors unchanged when they are transformed with this matrix).
 * @returns {Array<Number>} Return value. */
  "mat3identity":function() {
    "use strict";
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  },

/**
 * Returns the identity 4x4 matrix (a matrix that keeps
 * vectors unchanged when they are transformed with this matrix).
 * @returns {Array<Number>} Return value. */
  "mat4identity":function() {
    "use strict";
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  },
/** Returns the identity quaternion of multiplication, (0, 0, 0, 1).
 * @returns {Array<Number>} Return value.
 */
  "quatIdentity":function() {
    "use strict";
    return [0, 0, 0, 1];
  },
/**
 * Returns a copy of a 4x4 matrix.
 * @param {Array<Number>} mat A 4x4 matrix.
 * @returns {Array<Number>} Return value. */
  "mat4copy":function(mat) {
    "use strict";
    return [mat[0], mat[1], mat[2], mat[3],
      mat[4], mat[5], mat[6], mat[7],
      mat[8], mat[9], mat[10], mat[11],
      mat[12], mat[13], mat[14], mat[15]];
  },
/**
 * Returns a copy of a 3x3 matrix.
 * @param {Array<Number>} mat A 3x3atrix.
 * @returns {Array<Number>} Return value. */
  "mat3copy":function(mat) {
    "use strict";
    return [mat[0], mat[1], mat[2], mat[3],
      mat[4], mat[5], mat[6], mat[7],
      mat[8]];
  },
/**
 * Returns a copy of a 3-element vector.
 * @param {Array<Number>} vec A 3-element vector.
 * @returns {Array<Number>} Return value. */
  "vec3copy":function(vec) {
    "use strict";
    return [vec[0], vec[1], vec[2]];
  },
/**
 * Returns a copy of a 4-element vector.
 * @param {Array<Number>} vec A 4-element vector.
 * @returns {Array<Number>} Return value. */
  "vec4copy":function(vec) {
    "use strict";
    return [vec[0], vec[1], vec[2], vec[3]];
  },
/**
 * Assigns the values of a 3-element vector into another
 * 3-element vector.
 * @param {Array<Number>} dst The 3-element vector to
 * assign to.
 * @param {Array<Number>} src The 3-element vector whose
 * values will be copied.
 * @returns {Array<Number>} The parameter "dst"
 */
  "vec3assign":function(dst, src) {
    "use strict";
    dst[0] = src[0];
    dst[1] = src[1];
    dst[2] = src[2];
    return dst;
  },
/**
 * Assigns the values of a 4-element vector into another
 * 4-element vector.
 * @param {Array<Number>} dst The 4-element vector to copy
 * the source values to.
 * @param {Array<Number>} src The 4-element vector whose
 * values will be copied.
 * @returns {Array<Number>} The parameter "dst".
 */
  "vec4assign":function(dst, src) {
    "use strict";
    dst[0] = src[0];
    dst[1] = src[1];
    dst[2] = src[2];
    dst[3] = src[3];
    return dst;
  },
/**
 * Returns whether a 4x4 matrix is the identity matrix.
 * @param {Array<Number>} mat A 4x4 matrix.
 * @returns {Boolean} Return value. */
  "mat4isIdentity":function(mat) {
    "use strict";
    return (
    mat[0] === 1 && mat[1] === 0 && mat[2] === 0 && mat[3] === 0 &&
    mat[4] === 0 && mat[5] === 1 && mat[6] === 0 && mat[7] === 0 &&
    mat[8] === 0 && mat[9] === 0 && mat[10] === 1 && mat[11] === 0 &&
    mat[12] === 0 && mat[13] === 0 && mat[14] === 0 && mat[15] === 1
    );
  },
/**
 * Finds the inverse of a 3x3 matrix, describing a transformation that undoes the given transformation.
 * @param {Array<Number>} m A 3x3 matrix.
 * @returns {Array<Number>} The resulting 3x3 matrix.
 * Returns the identity matrix if this matrix's determinant, or overall scaling factor, is 0 or extremely close to 0.
 */
  "mat3invert":function(m) {
    "use strict";
    var ret = [];
    var t4 = m[4] * m[8] - m[5] * m[7];
    var t5 = m[5] * m[6] - m[3] * m[8];
    var t6 = m[3] * m[7] - m[4] * m[6];
    var t7 = 1.0 / (
    m[0] * t4 + m[1] * t5 + m[2] * t6);
    if(t7 === 0)return H3DU.Math.mat3identity();
    ret[0] = t4 * t7;
    ret[1] = (m[2] * m[7] - m[1] * m[8]) * t7;
    ret[2] = (m[1] * m[5] - m[2] * m[4]) * t7;
    ret[3] = t5 * t7;
    ret[4] = (m[0] * m[8] - m[2] * m[6]) * t7;
    ret[5] = (m[2] * m[3] - m[0] * m[5]) * t7;
    ret[6] = t6 * t7;
    ret[7] = (m[1] * m[6] - m[0] * m[7]) * t7;
    ret[8] = (m[0] * m[4] - m[1] * m[3]) * t7;
    return ret;
  },
/**
 * Finds the inverse of a 4x4 matrix, describing a transformation that undoes the given transformation.
 * @param {Array<Number>} m A 4x4 matrix.
 * @returns {Array<Number>} The resulting 4x4 matrix.
 * Returns the identity matrix if this matrix's determinant, or overall scaling factor, is 0 or extremely close to 0.
 */
  "mat4invert":function(m) {
    "use strict";
    var tvar0 = m[0] * m[10];
    var tvar1 = m[0] * m[11];
    var tvar2 = m[0] * m[5];
    var tvar3 = m[0] * m[6];
    var tvar4 = m[0] * m[7];
    var tvar5 = m[0] * m[9];
    var tvar6 = m[10] * m[12];
    var tvar7 = m[10] * m[13];
    var tvar8 = m[10] * m[15];
    var tvar9 = m[11] * m[12];
    var tvar10 = m[11] * m[13];
    var tvar11 = m[11] * m[14];
    var tvar14 = m[1] * m[4];
    var tvar15 = m[1] * m[6];
    var tvar16 = m[1] * m[7];
    var tvar17 = m[1] * m[8];
    var tvar19 = m[2] * m[4];
    var tvar20 = m[2] * m[5];
    var tvar21 = m[2] * m[7];
    var tvar22 = m[2] * m[8];
    var tvar23 = m[2] * m[9];
    var tvar25 = m[3] * m[4];
    var tvar26 = m[3] * m[5];
    var tvar27 = m[3] * m[6];
    var tvar28 = m[3] * m[8];
    var tvar29 = m[3] * m[9];
    var tvar32 = m[4] * m[9];
    var tvar35 = m[5] * m[8];
    var tvar37 = m[6] * m[8];
    var tvar38 = m[6] * m[9];
    var tvar40 = m[7] * m[8];
    var tvar41 = m[7] * m[9];
    var tvar42 = m[8] * m[13];
    var tvar43 = m[8] * m[14];
    var tvar44 = m[8] * m[15];
    var tvar45 = m[9] * m[12];
    var tvar46 = m[9] * m[14];
    var tvar47 = m[9] * m[15];
    var tvar48 = tvar14 - tvar2;
    var tvar49 = tvar15 - tvar20;
    var tvar50 = tvar16 - tvar26;
    var tvar51 = tvar19 - tvar3;
    var tvar52 = tvar2 - tvar14;
    var tvar53 = tvar20 - tvar15;
    var tvar54 = tvar21 - tvar27;
    var tvar55 = tvar25 - tvar4;
    var tvar56 = tvar26 - tvar16;
    var tvar57 = tvar27 - tvar21;
    var tvar58 = tvar3 - tvar19;
    var tvar59 = tvar4 - tvar25;
    var det = tvar45 * tvar57 + tvar6 * tvar50 + tvar9 * tvar53 + tvar42 * tvar54 + tvar7 * tvar55 +
tvar10 * tvar58 + tvar43 * tvar56 + tvar46 * tvar59 + tvar11 * tvar48 + tvar44 * tvar49 +
tvar47 * tvar51 + tvar8 * tvar52;
    if(det === 0)return H3DU.Math.mat4identity();
    det = 1.0 / det;
    var r = [];
    r[0] = m[6] * tvar10 - m[7] * tvar7 + tvar41 * m[14] - m[5] * tvar11 - tvar38 * m[15] + m[5] * tvar8;
    r[1] = m[3] * tvar7 - m[2] * tvar10 - tvar29 * m[14] + m[1] * tvar11 + tvar23 * m[15] - m[1] * tvar8;
    r[2] = m[13] * tvar54 + m[14] * tvar56 + m[15] * tvar49;
    r[3] = m[9] * tvar57 + m[10] * tvar50 + m[11] * tvar53;
    r[4] = m[7] * tvar6 - m[6] * tvar9 - tvar40 * m[14] + m[4] * tvar11 + tvar37 * m[15] - m[4] * tvar8;
    r[5] = m[2] * tvar9 - m[3] * tvar6 + m[14] * (tvar28 - tvar1) + m[15] * (tvar0 - tvar22);
    r[6] = m[12] * tvar57 + m[14] * tvar59 + m[15] * tvar51;
    r[7] = m[8] * tvar54 + m[10] * tvar55 + m[11] * tvar58;
    r[8] = m[5] * tvar9 - tvar41 * m[12] + tvar40 * m[13] - m[4] * tvar10 + m[15] * (tvar32 - tvar35);
    r[9] = tvar29 * m[12] - m[1] * tvar9 + m[13] * (tvar1 - tvar28) + m[15] * (tvar17 - tvar5);
    r[10] = m[12] * tvar50 + m[13] * tvar55 + m[15] * tvar52;
    r[11] = m[8] * tvar56 + m[9] * tvar59 + m[11] * tvar48;
    r[12] = tvar38 * m[12] - m[5] * tvar6 - tvar37 * m[13] + m[4] * tvar7 + m[14] * (tvar35 - tvar32);
    r[13] = m[1] * tvar6 - tvar23 * m[12] + m[13] * (tvar22 - tvar0) + m[14] * (tvar5 - tvar17);
    r[14] = m[12] * tvar53 + m[13] * tvar58 + m[14] * tvar48;
    r[15] = m[8] * tvar49 + m[9] * tvar51 + m[10] * tvar52;
    for(var i = 0; i < 16; i++) {
      r[i] *= det;
    }
    return r;
  },
/**
 * Returns a quaternion that describes a rotation that undoes the given rotation (an "inverted" rotation); this is done by reversing the sign of the X, Y, and Z components (which describe the quaternion's [axis of rotation]{@tutorial glmath}). The return value won't necessarily be a [unit vector]{@tutorial glmath}.
 * @param {Array<Number>} quat A quaternion, containing four elements.
 * @returns {Array<Number>} Return value. */
  "quatConjugate":function(quat) {
    "use strict";
    return [-quat[0], -quat[1], -quat[2], quat[3]];
  },
/**
 * Returns a quaternion that describes a rotation that undoes the given rotation (an "inverted" rotation) and is converted to a [unit vector]{@tutorial glmath}.
 * @param {Array<Number>} quat A quaternion, containing four elements.
 * @returns {Array<Number>} Return value.
 * @see {@link H3DU.Math.quatConjugate}
 */
  "quatInvert":function(quat) {
    "use strict";
    var lsq = 1.0 / H3DU.Math.quatDot(quat, quat);
    return H3DU.Math.vec4scaleInPlace(
  H3DU.Math.quatConjugate(quat), lsq);
  },
/**
 * Returns whether this quaternion is the identity quaternion, (0, 0, 0, 1).
 * @param {Array<Number>} quat A quaternion, containing four elements.
 * @returns {Boolean} Return value.
 */
  "quatIsIdentity":function(quat) {
    "use strict";
    return quat[0] === 0 && quat[1] === 0 && quat[2] === 0 && quat[3] === 1;
  },
/**
 * Generates a 4x4 matrix describing the rotation
 * described by this quaternion.
 * @param {Array<Number>} quat A quaternion, containing four elements.
 * @returns {Array<Number>} The generated 4x4 matrix.
 */
  "quatToMat4":function(quat) {
    "use strict";
    var tx, ty, tz, xx, xy, xz, yy, yz, zz, wx, wy, wz;
    tx = 2.0 * quat[0];
    ty = 2.0 * quat[1];
    tz = 2.0 * quat[2];
    xx = tx * quat[0];
    xy = tx * quat[1];
    xz = tx * quat[2];
    yy = ty * quat[1];
    yz = tz * quat[1];
    zz = tz * quat[2];
    wx = tx * quat[3];
    wy = ty * quat[3];
    wz = tz * quat[3];
    return [
      1 - (yy + zz), xy + wz, xz - wy, 0,
      xy - wz, 1 - (xx + zz), yz + wx, 0,
      xz + wy, yz - wx, 1 - (xx + yy), 0,
      0, 0, 0, 1
    ];
  },
/**
 * Calculates the vector rotation for this quaternion in the form
 * of the angle to rotate the vector by and an [axis of rotation]{@tutorial glmath} to
 * rotate that vector around.
 * @param {Array<Number>} a A quaternion. Must be a [unit vector]{@tutorial glmath}.
 * @returns {Array<Number>} A 4-element array giving the axis
 * of rotation as the first three elements, followed by the angle
 * in degrees as the fourth element. If "a" is a unit vector, the axis
 * of rotation will be a unit vector.
 */
  "quatToAxisAngle":function(a) {
    "use strict";
    var w = a[3];
    var d = 1.0 - w * w;
    if(d > 0) {
      d = 1 / Math.sqrt(d);
      return [a[0] * d, a[1] * d, a[2] * d,
        Math.min(1.0, Math.max(0.0, Math.acos(w))) * H3DU.Math.Num360DividedByPi];
    } else {
      return [0, 1, 0, 0];
    }
  },
/**
 * Generates a quaternion describing a rotation between
 * two 3-element vectors. The quaternion
 * will describe the rotation required to rotate
 * the ray described in the first vector toward the ray described
 * in the second vector. The vectors need not be [unit vectors]{@tutorial glmath}.
 * @param {Array<Number>} vec1 The first 3-element vector.
 * @param {Array<Number>} vec2 The second 3-element vector.
 * @returns {Array<Number>} The generated quaternion, which
 * will be a unit vector.
 */
  "quatFromVectors":function(vec1, vec2) {
    "use strict";
    var ret = H3DU.Math.vec3cross(vec1, vec2);
    if(H3DU.Math.vec3dot(ret, ret) < 1e-9) {
      // The vectors are parallel or close to parallel; there are two possible cases
      var dot = H3DU.Math.vec3dot(vec1, vec2);
      if(dot > 0) {
       // The vectors point in the same direction or almost so
        return [0, 0, 0, 1];
      } else {
       // The vectors point in opposite directions
        ret = H3DU.Math.vec3perp(vec1);
        ret[3] = 0;
      }
    } else {
      var vecLengths = H3DU.Math.vec3length(vec1) * H3DU.Math.vec3length(vec2);
      if(vecLengths === 0)vecLengths = 1; // degenerate case
      ret[3] = vecLengths + H3DU.Math.vec3dot(vec1, vec2);
    }
    return H3DU.Math.quatNormalizeInPlace(ret);
  },
/**
 * Generates a quaternion from a rotation transformation that rotates vectors
 * by the given rotation angle and around the given [axis of rotation]{@tutorial glmath},
 * @param {Array<Number>|Number} angle The desired angle
 * to rotate in degrees.  If "v", "vy", and "vz" are omitted, this can
 * instead be a 4-element array giving the axis
 * of rotation as the first three elements, followed by the angle
 * in degrees as the fourth element.
 * @param {Array<Number>|Number} v X-component of the point lying on the axis
 * of rotation.  If "vy" and "vz" are omitted, this can
 * instead be a 3-element array giving the axis
 * of rotation.
 * @param {Number} vy Y-component of the point lying on the axis
 * of rotation.
 * @param {Number} vz Z-component of the point lying on the axis
 * of rotation.
 * @returns {Array<Number>} The generated quaternion.
 * A quaternion's first three elements (X, Y, Z) describe an
 * [axis of rotation]{@tutorial glmath} whose length is the sine of half of "angle",
 * and its fourth element (W) is the cosine of half of "angle".
 */
  "quatFromAxisAngle":function(angle, v, vy, vz) {
    "use strict";
    var v0, v1, v2, ang;
    if(typeof vy !== "undefined" && typeof vz !== "undefined") {
      v0 = v;
      v1 = vy;
      v2 = vz;
      ang = (angle >= 0 && angle < 360 ? angle : angle % 360 + (angle < 0 ? 360 : 0)) * H3DU.Math.PiDividedBy360;
    } else if(typeof v === "undefined") {
      v0 = angle[0];
      v1 = angle[1];
      v2 = angle[2];
      ang = angle[3];
      ang = (angle >= 0 && angle < 360 ? angle : angle % 360 + (angle < 0 ? 360 : 0)) * H3DU.Math.PiDividedBy360;
    } else {
      v0 = v[0];
      v1 = v[1];
      v2 = v[2];
      ang = (angle >= 0 && angle < 360 ? angle : angle % 360 + (angle < 0 ? 360 : 0)) * H3DU.Math.PiDividedBy360;
    }
    var cost = Math.cos(ang);
    var sint = ang >= 0 && ang < 6.283185307179586 ? ang <= 3.141592653589793 ? Math.sqrt(1.0 - cost * cost) : -Math.sqrt(1.0 - cost * cost) : Math.sin(ang);
    var vec = H3DU.Math.vec3normalizeInPlace([v0, v1, v2]);
    var ret = [vec[0], vec[1], vec[2], cost];
    ret[0] *= sint;
    ret[1] *= sint;
    ret[2] *= sint;
    return ret;
  },
/**
 * Generates a quaternion from pitch, yaw and roll angles (or <i>Tait-Bryan angles</i>).
 * See "Axis of Rotation" in "{@tutorial glmath}" for the meaning of each angle.
 * @param {Number} pitchDegrees Vector rotation about the X axis (upward or downward turn), in degrees.
 * This can instead be a 3-element
 * array giving the rotation about the X axis, Y axis, and Z axis,
 * respectively.
 * @param {Number} yawDegrees Vector rotation about the Y axis (left or right turn), in degrees.
 * May be null or omitted if "pitchDegrees" is an array.
 * @param {Number} rollDegrees Vector rotation about the Z axis (swaying side by side), in degrees.
 * May be null or omitted if "pitchDegrees" is an array.
 * @param {Number} [mode] Specifies the order in which the rotations will occur (in terms of their effect).
 * This is one of the {@link H3DU.Math} constants such as {@link H3DU.Math.LocalPitchYawRoll}
 * and {@link H3DU.Math.GlobalYawRollPitch}. If null or omitted, the default is {@link H3DU.Math.GlobalRollPitchYaw}.
 * The constants starting with <code>Global</code>
 * describe a vector rotation in the order given, each about the original axes (these angles are also called <i>extrinsic</i>
 * angles). The constants starting with <code>Local</code> describe a vector rotation in the order given,
 * where the second and third rotations occur around the rotated object's new axes
 * and not necessarily the original axes (these angles are also called <i>intrinsic</i>
 * angles). The order of <code>Local</code> rotations has the same result as the reversed
 * order of <code>Global</code> rotations and vice versa.
 * @returns {Array<Number>} The generated quaternion.
 */
  "quatFromTaitBryan":function(pitchDegrees, yawDegrees, rollDegrees, mode) {
    "use strict";
    var rollRad, pitchRad, yawRad;
    if(typeof mode === "undefined" || mode === null)mode = H3DU.Math.GlobalRollPitchYaw;
    if(mode < 0 || mode >= 6)throw new Error("invalid mode");
    if(pitchDegrees.constructor === Array) {
      rollRad = (pitchDegrees[2] >= 0 && pitchDegrees[2] < 360 ? pitchDegrees[2] : pitchDegrees[2] % 360 + (pitchDegrees[2] < 0 ? 360 : 0)) * H3DU.Math.PiDividedBy360;
      pitchRad = (pitchDegrees[0] >= 0 && pitchDegrees[0] < 360 ? pitchDegrees[0] : pitchDegrees[0] % 360 + (pitchDegrees[0] < 0 ? 360 : 0)) * H3DU.Math.PiDividedBy360;
      yawRad = (pitchDegrees[1] >= 0 && pitchDegrees[1] < 360 ? pitchDegrees[1] : pitchDegrees[1] % 360 + (pitchDegrees[1] < 0 ? 360 : 0)) * H3DU.Math.PiDividedBy360;
    } else {
      rollRad = (rollDegrees >= 0 && rollDegrees < 360 ? rollDegrees : rollDegrees % 360 + (rollDegrees < 0 ? 360 : 0)) * H3DU.Math.PiDividedBy360;
      pitchRad = (pitchDegrees >= 0 && pitchDegrees < 360 ? pitchDegrees : pitchDegrees % 360 + (pitchDegrees < 0 ? 360 : 0)) * H3DU.Math.PiDividedBy360;
      yawRad = (yawDegrees >= 0 && yawDegrees < 360 ? yawDegrees : yawDegrees % 360 + (yawDegrees < 0 ? 360 : 0)) * H3DU.Math.PiDividedBy360;
    }
    var py = Math.cos(pitchRad);
    var px = pitchRad >= 0 && pitchRad < 6.283185307179586 ? pitchRad <= 3.141592653589793 ? Math.sqrt(1.0 - py * py) : -Math.sqrt(1.0 - py * py) : Math.sin(pitchRad);
    var yy = Math.cos(yawRad);
    var yx = yawRad >= 0 && yawRad < 6.283185307179586 ? yawRad <= 3.141592653589793 ? Math.sqrt(1.0 - yy * yy) : -Math.sqrt(1.0 - yy * yy) : Math.sin(yawRad);
    var ry = Math.cos(rollRad);
    var rx = rollRad >= 0 && rollRad < 6.283185307179586 ? rollRad <= 3.141592653589793 ? Math.sqrt(1.0 - ry * ry) : -Math.sqrt(1.0 - ry * ry) : Math.sin(rollRad);
    var t8, t7;
    if(mode === H3DU.Math.GlobalPitchYawRoll || mode === H3DU.Math.GlobalPitchRollYaw) {
      t7 = [rx * yx, ry * yx, rx * yy, ry * yy];
      if(mode === H3DU.Math.GlobalPitchYawRoll)t7[0] = -t7[0];
      t8 = [t7[3] * px + t7[0] * py, t7[1] * py + t7[2] * px, t7[2] * py - t7[1] * px, t7[3] * py - t7[0] * px];
    } else if(mode === H3DU.Math.GlobalYawPitchRoll || mode === H3DU.Math.GlobalYawRollPitch) {
      t7 = [ry * px, rx * px, rx * py, ry * py];
      if(mode === H3DU.Math.GlobalYawRollPitch)t7[1] = -t7[1];
      t8 = [t7[0] * yy - t7[2] * yx, t7[3] * yx + t7[1] * yy, t7[2] * yy + t7[0] * yx, t7[3] * yy - t7[1] * yx];
    } else {
      t7 = [yy * px, yx * py, yx * px, yy * py];
      if(mode === H3DU.Math.GlobalRollPitchYaw)t7[2] = -t7[2];
      t8 = [t7[0] * ry + t7[1] * rx, t7[1] * ry - t7[0] * rx, t7[3] * rx + t7[2] * ry, t7[3] * ry - t7[2] * rx];
    }
    return t8;
  },
/**
 * Converts this quaternion to the same version of the rotation
 * in the form of pitch, yaw, and roll angles (or <i>Tait-Bryan angles</i>).
 * @param {Array<Number>} a A quaternion. Should be a [unit vector]{@tutorial glmath}.
 * @param {Number} [mode] Specifies the order in which the rotations will occur
 * (in terms of their effect, not in terms of how they will be returned by this method).
 * This is one of the {@link H3DU.Math} constants such as {@link H3DU.Math.LocalPitchYawRoll}
 * and {@link H3DU.Math.GlobalYawRollPitch}. If null or omitted, the default is {@link H3DU.Math.GlobalRollPitchYaw}.
 * The constants starting with <code>Global</code>
 * describe a vector rotation in the order given, each about the original axes (these angles are also called <i>extrinsic</i>
 * angles). The constants starting with <code>Local</code> describe a vector rotation in the order given,
 * where the second and third rotations occur around the rotated object's new axes
 * and not necessarily the original axes (these angles are also called <i>intrinsic</i>
 * angles). The order of <code>Local</code> rotations has the same result as the reversed
 * order of <code>Global</code> rotations and vice versa.
 * @returns {Array<Number>} A 3-element array containing the
 * pitch, yaw, and roll angles (X, Y, and Z axis angles), in that order and in degrees, by which to rotate vectors.
 * See "Axis of Rotation" in "{@tutorial glmath}" for the meaning of each angle.
 */
  "quatToTaitBryan":function(a, mode) {
    "use strict";
    var c0 = a[3];
    var c1, c2, c3;
    var e = 1;
    if(typeof mode === "undefined" || mode === null)mode = H3DU.Math.GlobalRollPitchYaw;
    if(mode < 0 || mode >= 6)throw new Error("invalid mode");
    if(mode === H3DU.Math.GlobalRollPitchYaw) {
      c1 = a[1]; c2 = a[0]; c3 = a[2];
      e = -1;
    } else if(mode === H3DU.Math.GlobalPitchYawRoll) {
      c1 = a[2]; c2 = a[1]; c3 = a[0];
      e = -1;
    } else if(mode === H3DU.Math.GlobalPitchRollYaw) {
      c1 = a[1]; c2 = a[2]; c3 = a[0];
    } else if(mode === H3DU.Math.GlobalYawPitchRoll) {
      c1 = a[2]; c2 = a[0]; c3 = a[1];
    } else if(mode === H3DU.Math.GlobalYawRollPitch) {
      c1 = a[0]; c2 = a[2]; c3 = a[1];
      e = -1;
    } else {
      c1 = a[0]; c2 = a[1]; c3 = a[2];
    }
    var sq1 = c1 * c1;
    var sq2 = c2 * c2;
    var sq3 = c3 * c3;
    var e1 = Math.atan2(2 * (c0 * c1 - e * c2 * c3), 1 - (sq1 + sq2) * 2);
    var sine = 2 * (c0 * c2 + e * c1 * c3);
    if(sine > 1.0)sine = 1.0; // for stability
    if(sine < -1.0)sine = -1.0; // for stability
    var e2 = Math.asin(sine);
    var e3 = Math.atan2(2 * (c0 * c3 - e * c1 * c2), 1 - (sq2 + sq3) * 2);
    e1 *= H3DU.Math.Num180DividedByPi;
    e2 *= H3DU.Math.Num180DividedByPi;
    e3 *= H3DU.Math.Num180DividedByPi;
  // Singularity near the poles
    if(Math.abs(e2 - 90) < 0.000001 ||
      Math.abs(e2 + 90) < 0.000001) {
      e3 = 0;
      e1 = Math.atan2(c1, c0) * H3DU.Math.Num180DividedByPi;
      if(isNaN(e1))e1 = 0;
    }
  // Return the pitch/yaw/roll angles in the standard order
    var angles = [];
    if(mode === H3DU.Math.GlobalRollPitchYaw) {
      angles[0] = e2; angles[1] = e1; angles[2] = e3;
    } else if(mode === H3DU.Math.GlobalPitchYawRoll) {
      angles[0] = e3; angles[1] = e2; angles[2] = e1;
    } else if(mode === H3DU.Math.GlobalPitchRollYaw) {
      angles[0] = e3; angles[1] = e1; angles[2] = e2;
    } else if(mode === H3DU.Math.GlobalYawPitchRoll) {
      angles[0] = e2; angles[1] = e3; angles[2] = e1;
    } else if(mode === H3DU.Math.GlobalYawRollPitch) {
      angles[0] = e1; angles[1] = e3; angles[2] = e2;
    } else {
      angles[0] = e1; angles[1] = e2; angles[2] = e3;
    }
    return angles;
  },
/**
 * Returns a quaternion that lies along the shortest path between the
 * given two quaternion rotations, using a linear interpolation function, and converts
 * it to a [unit vector]{@tutorial glmath}.
 * This is called a normalized linear interpolation, or "nlerp".<p>
 * Because the shortest path is curved, not straight, this method
 * will generally not interpolate at constant velocity;
 * however, the difference in this velocity when interpolating is
 * rarely noticeable and this method is generally faster than
 * the {@link H3DU.Math.quatSlerp} method.
 * @param {Array<Number>} q1 The first quaternion. Must be a unit vector.
 * @param {Array<Number>} q2 The second quaternion. Must be a unit vector.
 * @param {Number} factor A value that usually ranges from 0 through 1. Closer to 0 means
 * closer to q1, and closer to 1 means closer to q2.
 * @returns {Array<Number>} The interpolated quaternion,
 * which will be a unit vector.
 */
  "quatNlerp":function(q1, q2, factor) {
    "use strict";
    var t1 = 1.0 - factor;
    var t2 = q1[0] * t1;
    var t3 = q1[1] * t1;
    var t4 = q1[2] * t1;
    var t5 = q1[3] * t1;
    var t6 = q2[0] * factor;
    var t7 = q2[1] * factor;
    var t8 = q2[2] * factor;
    var t9 = q2[3] * factor;
    var t10 = q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3];
    if (t10 < 0.0) {
      return H3DU.Math.quatNormalizeInPlace([t2 - t6, t3 - t7, t4 - t8, t5 - t9]);
    } else {
      return H3DU.Math.quatNormalizeInPlace([t2 + t6, t3 + t7, t4 + t8, t5 + t9]);
    }
  },
/**
 * Returns a quaternion that lies along the shortest path between the
 * given two quaternion rotations, using a spherical interpolation function.
 * This is called spherical linear interpolation, or "slerp". (A spherical
 * interpolation finds the shortest angle between the two quaternions -- which
 * are treated as 4D vectors -- and then finds a vector with a smaller angle
 * between it and the first quaternion.  The "factor" parameter specifies
 * how small the new angle will be relative to the original angle.)<p>
 * This method will generally interpolate at constant velocity; however,
 * this method is commutative (the order in which the quaternions are given
 * matters), unlike [quatNlerp]{@link H3DU.Math.quatNlerp}, making it
 * unsuitable for blending multiple quaternion rotations,
 * and this method is generally more computationally expensive
 * than the [quatNlerp]{@link H3DU.Math.quatNlerp} method.
 * @param {Array<Number>} q1 The first quaternion. Must be a [unit vector]{@tutorial glmath}.
 * @param {Array<Number>} q2 The second quaternion. Must be a unit vector.
 * @param {Number} factor A value that usually ranges from 0 through 1. Closer to 0 means
 * closer to q1, and closer to 1 means closer to q2.
 * @returns {Array<Number>} The interpolated quaternion.
 * @see ["Understanding Slerp, Then Not Using It", Jonathan Blow](http://number-none.com/product/Understanding%20Slerp,%20Then%20Not%20Using%20It/),
 * for additional background
 */
  "quatSlerp":function(q1, q2, factor) {
    "use strict";
    var cosval = H3DU.Math.quatDot(q1, q2);
    var qd = q2;
    if(cosval < 0) {
      qd = [-q2[0], -q2[1], -q2[2], -q2[3]];
      cosval = H3DU.Math.quatDot(q1, qd);
    }
    var angle = 0;
    if(cosval > -1) {
      if(cosval < 1) {
        angle = Math.acos(cosval);
        if(angle === 0)
          return H3DU.Math.quatNlerp(q1, q2, factor);
      } else {
        return H3DU.Math.quatNlerp(q1, q2, factor);
      }
    } else {
      angle = Math.PI;
    }
    var s = Math.sin(angle);
    var sinv = 1.0 / s;
    var c1 = Math.sin((1.0 - factor) * angle) * sinv;
    var c2 = Math.sin(factor * angle) * sinv;
    return [
      q1[0] * c1 + qd[0] * c2,
      q1[1] * c1 + qd[1] * c2,
      q1[2] * c1 + qd[2] * c2,
      q1[3] * c1 + qd[3] * c2
    ];
  },
/**
 * Multiplies a quaternion by a rotation transformation that rotates vectors
 * by the given rotation angle and around the given [axis of rotation]{@tutorial glmath}.
 * The result is such that the angle-axis
 * rotation happens before the quaternion's rotation when applied
 * in the global coordinate frame.<p>
 * This method is equivalent to the following:<pre>
 * return quatMultiply(quat,quatFromAxisAngle(angle,v,vy,vz));
 * </pre>
 * @param {Array<Number>} quat Quaternion to rotate.
 * @param {Array<Number>|Number} angle The desired angle
 * to rotate in degrees.  If "v", "vy", and "vz" are omitted, this can
 * instead be a 4-element array giving the axis
 * of rotation as the first three elements, followed by the angle
 * in degrees as the fourth element.
 * @param {Array<Number>|Number} v X-component of the point lying on the axis
 * of rotation.  If "vy" and "vz" are omitted, this can
 * instead be a 3-element array giving the axis
 * of rotation.
 * @param {Number} vy Y-component of the point lying on the axis
 * of rotation.
 * @param {Number} vz Z-component of the point lying on the axis
 * of rotation.
 * @returns {Array<Number>} The resulting quaternion.
 */
  "quatRotate":function(quat, angle, v, vy, vz) {
    "use strict";
    return H3DU.Math.quatMultiply(quat,
    H3DU.Math.quatFromAxisAngle(angle, v, vy, vz));
  },
/**
 * Transforms a 3- or 4-element vector using a
 * quaternion's vector rotation.
 * @param {Array<Number>} q A quaternion describing
 * the rotation.
 * @param {Array<Number>} v A 3- or 4-element vector to
 * transform. The fourth element, if any, is ignored.
 * @returns {Array<Number>} A 4-element vector representing
 * the transformed vector. The fourth element will be 1.0.
 * If the input vector has 3 elements, a 3-element vector will
 * be returned instead.
 */
  "quatTransform":function(q, v) {
    "use strict";
    var t1 = q[1] * v[2] - q[2] * v[1] + v[0] * q[3];
    var t2 = q[2] * v[0] - q[0] * v[2] + v[1] * q[3];
    var t3 = q[0] * v[1] - q[1] * v[0] + v[2] * q[3];
    var t4 = q[0] * v[0] + q[1] * v[1] + q[2] * v[2];
    if(v.length === 3) {
      return [t1 * q[3] - (t2 * q[2] - t3 * q[1]) + q[0] * t4,
        t2 * q[3] - (t3 * q[0] - t1 * q[2]) + q[1] * t4,
        t3 * q[3] - (t1 * q[1] - t2 * q[0]) + q[2] * t4];
    }
    return [t1 * q[3] - (t2 * q[2] - t3 * q[1]) + q[0] * t4,
      t2 * q[3] - (t3 * q[0] - t1 * q[2]) + q[1] * t4,
      t3 * q[3] - (t1 * q[1] - t2 * q[0]) + q[2] * t4, 1.0];
  },
/**
 * Generates a quaternion from the vector rotation described in a 4x4 matrix.
 * The upper 3x3 portion of the matrix is used for this calculation.
 * The results are undefined if the matrix includes any transformation
 * other than rotation.
 * @param {Array<Number>} m A 4x4 matrix.
 * @returns {Array<Number>} The resulting quaternion.
 */
  "quatFromMat4":function(m) {
    "use strict";
    var ret = [];
    var xy = m[1];
    var xz = m[2];
    var yx = m[4];
    var yz = m[6];
    var zx = m[8];
    var zy = m[9];
    var trace = m[0] + m[5] + m[10];
    var s, t;
    if (trace >= 0.0) {
      s = Math.sqrt(trace + 1.0) * 0.5;
      t = 0.25 / s;
      ret[0] = (yz - zy) * t;
      ret[1] = (zx - xz) * t;
      ret[2] = (xy - yx) * t;
      ret[3] = s;
    } else if(m[0] > m[5] && m[0] > m[10]) {
// s=4*x
      s = Math.sqrt(1.0 + m[0] - m[5] - m[10]) * 0.5;
      t = 0.25 / s;
      ret[0] = s;
      ret[1] = (yx + xy) * t;
      ret[2] = (xz + zx) * t;
      ret[3] = (yz - zy) * t;
    } else if(m[5] > m[10]) {
// s=4*y
      s = Math.sqrt(1.0 + m[5] - m[0] - m[10]) * 0.5;
      t = 0.25 / s;
      ret[0] = (yx + xy) * t;
      ret[1] = s;
      ret[2] = (zy + yz) * t;
      ret[3] = (zx - xz) * t;
    } else{
// s=4*z
      s = Math.sqrt(1.0 + m[10] - m[0] - m[5]) * 0.5;
      t = 0.25 / s;
      ret[0] = (zx + xz) * t;
      ret[1] = (zy + yz) * t;
      ret[2] = s;
      ret[3] = (xy - yx) * t;
    }
    return ret;
  },
/**
 * Returns the upper-left part of a 4x4 matrix as a new
 * 3x3 matrix.
 * @param {Array<Number>} m4 A 4x4 matrix.
 * @returns {Array<Number>} The resulting 3x3 matrix.
 */
  "mat4toMat3":function(m4) {
    "use strict";
    return [
      m4[0], m4[1], m4[2],
      m4[4], m4[5], m4[6],
      m4[8], m4[9], m4[10]
    ];
  },
/**
 * Returns the transpose of a 4x4 matrix. (A transpose is a
 * matrix whose rows are converted to columns and vice versa.)
 * @param {Array<Number>} m4 A 4x4 matrix.
 * @returns {Array<Number>} The resulting 4x4 matrix.
 */
  "mat4transpose":function(m4) {
    "use strict";
    return H3DU.Math.mat4transposeInPlace(H3DU.Math.mat4copy(m4));
  },
/**
 * Transposes a 4x4 matrix in place without creating
 * a new matrix. (A transpose is a matrix whose rows
 * are converted to columns and vice versa.)
 * @param {Array<Number>} mat A 4x4 matrix.
 * @returns {Array<Number>} The parameter "mat".
 */
  "mat4transposeInPlace":function(mat) {
    "use strict";
    var tmp = mat[1]; mat[1] = mat[4]; mat[4] = tmp;
    tmp = mat[2]; mat[2] = mat[8]; mat[8] = tmp;
    tmp = mat[3]; mat[3] = mat[12]; mat[12] = tmp;
    tmp = mat[6]; mat[6] = mat[9]; mat[9] = tmp;
    tmp = mat[7]; mat[7] = mat[13]; mat[13] = tmp;
    tmp = mat[11]; mat[11] = mat[14]; mat[14] = tmp;
    return mat;
  },
/**
 * Returns the transpose of a 3x3 matrix. (A transpose is a
 * matrix whose rows are converted to columns and vice versa.)
 * @param {Array<Number>} m3 A 3x3 matrix.
 * @returns {Array<Number>} The resulting 3x3 matrix.
 */
  "mat3transpose":function(m3) {
    "use strict";
    return H3DU.Math.mat3transposeInPlace(H3DU.Math.mat3copy(m3));
  },
/**
 * Transposes a 3x3 matrix in place without creating
 * a new matrix. (A transpose is a matrix whose rows
 * are converted to columns and vice versa.)
 * @param {Array<Number>} mat A 3x3 matrix.
 * @returns {Array<Number>} The parameter "mat".
 */
  "mat3transposeInPlace":function(mat) {
    "use strict";
    var tmp = mat[1]; mat[1] = mat[3]; mat[3] = tmp;
    tmp = mat[2]; mat[2] = mat[6]; mat[6] = tmp;
    tmp = mat[5]; mat[5] = mat[7]; mat[7] = tmp;
    return mat;
  },
/**
 * Returns the transposed result of the inverted 3x3 upper left corner of
 * the given 4x4 matrix.<p>
 * This is usually used to convert a model-view matrix (view matrix multiplied by model or world matrix) to a matrix
 * for transforming surface normals in order to keep them perpendicular
 * to a surface transformed by the model-view matrix. Normals are then
 * transformed by this matrix and then converted to [unit vectors]{@tutorial glmath}. But if the
 * input matrix uses only rotations, translations, and/or uniform scaling
 * (same scaling in X, Y, and Z), the 3x3 upper left of the input matrix can
 * be used instead of the inverse-transpose matrix to transform the normals.
 * @param {Array<Number>} m4 A 4x4 matrix.
 * @returns {Array<Number>} The resulting 3x3 matrix. If the matrix
 * can't be inverted, returns the identity 3x3 matrix.
 */
  "mat4inverseTranspose3":function(m4) {
    "use strict";
    if(m4[1] === 0 && m4[2] === 0 && m4[4] === 0 &&
   m4[6] === 0 && m4[8] === 0 && m4[9] === 0) {
      if(m4[0] === 1 && m4[5] === 1 && m4[10] === 1) {
  // upper 3x3 is identity
        return [1, 0, 0, 0, 1, 0, 0, 0, 1];
      } else if(m4[0] * m4[5] * m4[10] !== 0) {
  // upper 3x3 is simple scaling
        return [1 / m4[0], 0, 0, 0, 1 / m4[5], 0, 0, 0, 1 / m4[10]];
      } else {
  // upper 3x3 is uninvertable scaling
        return [1, 0, 0, 0, 1, 0, 0, 0, 1];
      }
    }
    var m = [m4[0], m4[1], m4[2], m4[4], m4[5], m4[6],
      m4[8], m4[9], m4[10]];
    var det = m[0] * m[4] * m[8] +
m[3] * m[7] * m[2] +
m[6] * m[1] * m[5] -
m[6] * m[4] * m[2] -
m[3] * m[1] * m[8] -
m[0] * m[7] * m[5];
    if(det === 0) {
      return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    }
    det = 1.0 / det;
    return [
      (-m[5] * m[7] + m[4] * m[8]) * det,
      (m[5] * m[6] - m[3] * m[8]) * det,
      (-m[4] * m[6] + m[3] * m[7]) * det,
      (m[2] * m[7] - m[1] * m[8]) * det,
      (-m[2] * m[6] + m[0] * m[8]) * det,
      (m[1] * m[6] - m[0] * m[7]) * det,
      (-m[2] * m[4] + m[1] * m[5]) * det,
      (m[2] * m[3] - m[0] * m[5]) * det,
      (-m[1] * m[3] + m[0] * m[4]) * det];
  },
/**
 * Multiplies a 4x4 matrix by a scaling transformation.
 * @param {Array<Number>} mat 4x4 matrix to multiply.
 * @param {Array<Number>|Number} v3 Scale factor along the
 * X axis. A scale factor can be negative, in which case the transformation
 * also causes reflection about the corresponding axis.  If "v3y" and "v3z" are omitted, this value can instead
 * be a 3-element array giving the scale factors along the X, Y, and
 * Z axes.
 * @param {Number} v3y Scale factor along the Y axis.
 * @param {Number} v3z Scale factor along the Z axis.
 * @returns {Array<Number>} The resulting 4x4 matrix.
 */
  "mat4scale":function(mat, v3, v3y, v3z) {
    "use strict";
    var scaleX, scaleY, scaleZ;
    if(typeof v3y !== "undefined" && typeof v3z !== "undefined") {
      scaleX = v3;
      scaleY = v3y;
      scaleZ = v3z;
    } else {
      scaleX = v3[0];
      scaleY = v3[1];
      scaleZ = v3[2];
    }
    return [
      mat[0] * scaleX, mat[1] * scaleX, mat[2] * scaleX, mat[3] * scaleX,
      mat[4] * scaleY, mat[5] * scaleY, mat[6] * scaleY, mat[7] * scaleY,
      mat[8] * scaleZ, mat[9] * scaleZ, mat[10] * scaleZ, mat[11] * scaleZ,
      mat[12], mat[13], mat[14], mat[15]
    ];
  },
/**
 * Returns a 4x4 matrix representing a scaling transformation.
 * @param {Array<Number>|Number} v3 Scale factor along the
 * X axis. A scale factor can be negative, in which case the transformation
 * also causes reflection about the corresponding axis.  If "v3y" and "v3z" are omitted, this value can instead
 * be a 3-element array giving the scale factors along the X, Y, and
 * Z axes.
 * @param {Number} v3y Scale factor along the Y axis.
 * @param {Number} v3z Scale factor along the Z axis.
 * @returns {Array<Number>} The resulting 4x4 matrix.
 */
  "mat4scaled":function(v3, v3y, v3z) {
    "use strict";
    if(typeof v3y !== "undefined" && typeof v3z !== "undefined") {
      return [v3, 0, 0, 0, 0, v3y, 0, 0, 0, 0, v3z, 0, 0, 0, 0, 1];
    } else {
      return [v3[0], 0, 0, 0, 0, v3[1], 0, 0, 0, 0, v3[2], 0, 0, 0, 0, 1];
    }
  },
/**
 * Transforms a 4-element vector with a 4x4 matrix and returns
 * the transformed vector.
 * @param {Array<Number>} mat A 4x4 matrix.
 * @param {Array<Number>|Number} v X coordinate.
 * If "vy", "vz", and "vw" are omitted, this value can instead
 * be a 4-element array giving the X, Y, Z, and W coordinates.
 * @param {Number} vy Y coordinate.
 * @param {Number} vz Z coordinate.
 * @param {Number} vw W coordinate. To transform a 3D
 * point, set W to 1 and divide the result's X, Y, and Z by the
 * result's W. To transform a 2D point, set Z to 0 and W to 1
 * and divide the result's X and Y by the result's W.
 * @returns {Array<Number>} The transformed vector.
 */
  "mat4transform":function(mat, v, vy, vz, vw) {
    "use strict";
    var x, y, z, w;
    if(typeof vy !== "undefined" && typeof vz !== "undefined" &&
      typeof vw !== "undefined") {
      x = v;
      y = vy;
      z = vz;
      w = vw;
    } else {
      x = v[0];
      y = v[1];
      z = v[2];
      w = v[3];
    }
    return [x * mat[0] + y * mat[4] + z * mat[8] + w * mat[12],
      x * mat[1] + y * mat[5] + z * mat[9] + w * mat[13],
      x * mat[2] + y * mat[6] + z * mat[10] + w * mat[14],
      x * mat[3] + y * mat[7] + z * mat[11] + w * mat[15]];
  },
/**
 * Transforms a 3-element vector with the first three rows
 * of a 4x4 matrix (in column-major order) and returns the transformed vector.
 * This method assumes the matrix describes an affine
 * transformation, without perspective.<p>
 * The effect is as though elements
 * 3, 7, 11, and 15 (counting from 0) of the matrix
 * were assumed to be (0, 0, 0, 1) instead of their actual values
 * (those elements correspond to the last
 * row of the matrix in column-major order) and as though the 3-element
 * vector had a fourth element valued at 1.<p>
 * For most purposes, use
 * the {@link H3DU.Math.mat4projectVec3} method instead, which supports
 * 4x4 matrices that may be in a perspective
 * projection (whose last row is not necessarily (0, 0, 0, 1)).
 * @param {Array<Number>} mat A 4x4 matrix.
 * @param {Array<Number>|Number} v X coordinate.
 * If "vy" and "vz" are omitted, this value can instead
 * be a 4-element array giving the X, Y, and Z coordinates.
 * @param {Number} vy Y coordinate.
 * @param {Number} vz Z coordinate. To transform a 2D
 * point, set Z to 0.
 * @returns {Array<Number>} The transformed 3-element vector.
 */
  "mat4transformVec3":function(mat, v, vy, vz) {
    "use strict";
    var x, y, z;
    if(typeof vy !== "undefined" && typeof vz !== "undefined") {
      x = v;
      y = vy;
      z = vz;
    } else {
      x = v[0];
      y = v[1];
      z = v[2];
    }
    return [x * mat[0] + y * mat[4] + z * mat[8] + mat[12],
      x * mat[1] + y * mat[5] + z * mat[9] + mat[13],
      x * mat[2] + y * mat[6] + z * mat[10] + mat[14]];
  },
/**
 * Transforms a 3-element vector with a 4x4 matrix and returns
 * a perspective-correct version of the vector as a 3D point. <p>
 * The transformation involves
 * multiplying the matrix by a 4-element column vector with the same X,
 * Y, and Z coordinates, but with a W coordinate equal to 1, and
 * then dividing X, Y, and Z of the resulting 4-element
 * vector by that vector's W (a <i>perspective divide</i>),
 * then returning that vector's new X, Y, and Z.<p>
 * @param {Array<Number>} mat A 4x4 matrix to use to transform
 * the vector. This will generally be
 * a projection-view matrix (projection matrix multiplied
 * by the view matrix, in that order), if the vector to transform is in <i>world space</i>,
 * or a model-view-projection matrix, that is, (projection-view matrix multiplied
 * by the model [world] matrix, in that order), if the vector is in <i>model
 * (object) space</i>.<br>
 * If the matrix includes a projection transform returned
 * by {@link H3DU.Math.mat4ortho}, {@link H3DU.Math.mat4perspective}, or
 * similar {@link H3DU.Math} methods, the X, Y, and Z coordinates within the
 * view volume (as is the case in WebGL) will range from -1 to 1 and
 * increase from left to right, front to back, and bottom to top, unless otherwise specified
 * in those methods' documentation.
 * @param {Array<Number>|Number} v X coordinate of a 3D point to transform.
 * If "vy" and "vz" are omitted, this value can instead
 * be a 3-element array giving the X, Y, and Z coordinates.
 * @param {Number} vy Y coordinate.
 * @param {Number} vz Z coordinate. To transform a 2D
 * point, set Z to 0.
 * @returns {Array<Number>} The transformed 3-element vector.
 * The elements, in order, are
 * the transformed vector's X, Y, and Z coordinates.
 */
  "mat4projectVec3":function(mat, v, vy, vz) {
    "use strict";
    var x, y, z;
    if(typeof vy !== "undefined" && typeof vz !== "undefined") {
      x = v;
      y = vy;
      z = vz;
    } else {
      x = v[0];
      y = v[1];
      z = v[2];
    }
    var x1 = x * mat[0] + y * mat[4] + z * mat[8] + mat[12];
    var y1 = x * mat[1] + y * mat[5] + z * mat[9] + mat[13];
    var z1 = x * mat[2] + y * mat[6] + z * mat[10] + mat[14];
    var w = 1.0 / (x * mat[3] + y * mat[7] + z * mat[11] + mat[15]);
    return [x1 * w, y1 * w, z1 * w];
  },
/**
 * Transforms a 3-element vector with a 3x3 matrix and returns
 * the transformed vector.
 * @param {Array<Number>} mat A 3x3 matrix.
 * @param {Array<Number>|Number} v X coordinate.
 * If "vy", and "vz" are omitted, this value can instead
 * be a 4-element array giving the X, Y, and Z coordinates.
 * @param {Number} vy Y coordinate.
 * @param {Number} vz Z coordinate. To transform a 2D
 * point, set Z to 1, and divide the result's X and Y by
 * the result's Z.
 * @returns {Array<Number>} The transformed vector.
 */
  "mat3transform":function(mat, v, vy, vz) {
    "use strict";
    var x, y, z;
    if(typeof vy !== "undefined" && typeof vz !== "undefined") {
      x = v;
      y = vy;
      z = vz;
    } else {
      x = v[0];
      y = v[1];
      z = v[2];
    }
    return [x * mat[0] + y * mat[3] + z * mat[6],
      x * mat[1] + y * mat[4] + z * mat[7],
      x * mat[2] + y * mat[5] + z * mat[8]];
  },
/**
 * Returns a 4x4 matrix representing a translation.
 * @param {Array<Number>|Number} v3 Translation along the
 * X axis.  If "v3y" and "v3z" are omitted, this value can instead
 * be a 3-element array giving the translations along the X, Y, and
 * Z axes.
 * @param {Number} v3y Translation along the Y axis.
 * @param {Number} v3z Translation along the Z axis.
 * @returns {Array<Number>} The resulting 4x4 matrix.
 */
  "mat4translated":function(v3, v3y, v3z) {
    "use strict";
    var x, y, z;
    if(typeof v3y !== "undefined" && typeof v3z !== "undefined") {
      x = v3;
      y = v3y;
      z = v3z;
    } else {
      x = v3[0];
      y = v3[1];
      z = v3[2];
    }
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
  },
/**
 * Multiplies a 4x4 matrix by a translation transformation.
 * @param {Array<Number>} mat The matrix to multiply.
 * @param {Array<Number>|Number} v3 Translation along the
 * X axis.  If "v3y" and "v3z" are omitted, this value can instead
 * be a 3-element array giving the translations along the X, Y, and
 * Z axes.
 * @param {Number} v3y Translation along the Y axis.
 * @param {Number} v3z Translation along the Z axis.
 * @returns {Array<Number>} The resulting 4x4 matrix.
 */
  "mat4translate":function(mat, v3, v3y, v3z) {
    "use strict";
    var x, y, z;
    if(typeof v3y !== "undefined" && typeof v3z !== "undefined") {
      x = v3;
      y = v3y;
      z = v3z;
    } else {
      x = v3[0];
      y = v3[1];
      z = v3[2];
    }
    return [
      mat[0], mat[1], mat[2], mat[3],
      mat[4], mat[5], mat[6], mat[7],
      mat[8], mat[9], mat[10], mat[11],
      mat[0] * x + mat[4] * y + mat[8] * z + mat[12],
      mat[1] * x + mat[5] * y + mat[9] * z + mat[13],
      mat[2] * x + mat[6] * y + mat[10] * z + mat[14],
      mat[3] * x + mat[7] * y + mat[11] * z + mat[15]
    ];
  },
/**
 * Returns a 4x4 matrix representing a [perspective projection]{@tutorial camera}.<p>
 * This method is designed for enabling a [right-handed coordinate system]{@tutorial glmath}.
 * To adjust the result of this method for a left-handed system,
 * reverse the sign of the 9th, 10th, 11th, and 12th
 * elements of the result (zero-based indices 8, 9, 10, and 11).
 * @param {Number} fovY Y axis field of view, in degrees, that is, the shortest angle
 * between the top and bottom clipping planes. Should be less
 * than 180 degrees. (The smaller
 * this number, the bigger close objects appear to be. As a result, zooming out
 * can be implemented by raising this value, and zooming in by lowering it.)
 * @param {Number} aspectRatio The ratio of width to height of the viewport, usually
 * the scene's aspect ratio.
 * @param {Number} near The distance, in eye space, from the "camera" to
 * the near clipping plane. Objects closer than this distance won't be
 * seen.<p>This value should be greater than 0, and should be set to the highest distance
 * from the "camera" that the application can afford to clip out for being too
 * close, for example, 0.5, 1, or higher.
 * @param {Number} far The distance, in eye space, from the "camera" to
 * the far clipping plane. Objects beyond this distance will be too far
 * to be seen.<br>This value is usually greater than "near",
 * should be greater than 0, and should be set
 * so that the absolute ratio of "far" to "near" is as small as
 * the application can accept.<br>
 * In the usual case that "far" is greater than "near", depth
 * buffer values will be more concentrated around the near
 * plane than around the far plane due to the perspective
 * projection.  The greater the ratio of "far" to "near", the more
 * concentrated the values will be around the near plane, and the
 * more likely two objects close to the far plane will have identical depth values.
 * (Most WebGL implementations support 24-bit depth buffers, meaning they support 16,777,216 possible values per pixel.)
 * @returns {Array<Number>} The resulting 4x4 matrix.
 */
  "mat4perspective":function(fovY, aspectRatio, near, far) {
    "use strict";
    var fov = (fovY >= 0 && fovY < 360 ? fovY : fovY % 360 + (fovY < 0 ? 360 : 0)) * H3DU.Math.PiDividedBy360;
    var f = 1 / Math.tan(fov);
    var nmf = near - far;
    nmf = 1 / nmf;
    return [f / aspectRatio, 0, 0, 0, 0, f, 0, 0, 0, 0,
      nmf * (near + far), -1, 0, 0, nmf * near * far * 2, 0];
  },
/**
 * Returns a 4x4 matrix that represents a camera view,
 * transforming world space coordinates to <i>eye space</i>
 * (or <i>camera space</i>). This essentially rotates a "camera"
 * and moves it to somewhere in the scene. In eye space:<ul>
 * <li>The "camera" is located at the origin (0,0,0), or
 * at <code>viewerPos</code> in world space,
 * and points away from the viewer toward the <code>lookingAt</code>
 * position in world space. This generally
 * puts <code>lookingAt</code> at the center of the view.
 * <li>The X axis points rightward from the "camera"'s viewpoint.
 * <li>The Y axis points upward from the center of the "camera" to its top. The
 * <code>up</code> vector guides this direction.
 * <li>The Z axis is parallel to the direction from the "camera"
 * to the <code>lookingAt</code> point.</ul><p>
 * This method is designed for use in a [right-handed coordinate system]{@tutorial glmath}
 * (the Z axis's direction will be from the "camera" to the point looked at).
 * To adjust the result of this method for a left-handed system,
 * reverse the sign of the 1st, 3rd, 5th, 7th, 9th, 11th,
 * 13th, and 15th elements of the result (zero-based indices 0, 2, 4, 6, 8,
 * 10, 12, and 14); the Z axis's direction will thus be from the point looked at to the "camera".
 * @param {Array<Number>} viewerPos A 3-element vector specifying
 * the "camera" position in world space.
 * @param {Array<Number>} [lookingAt] A 3-element vector specifying
 * the point in world space that the "camera" is looking at. May be null or omitted,
 * in which case the default is the coordinates (0,0,0).
 * @param {Array<Number>} [up] A 3-element vector specifying
 * the direction from the center of the "camera" to its top. This parameter may
 * be null or omitted, in which case the default is the vector (0, 1, 0),
 * the vector that results when the "camera" is held upright.<br>
 * This vector must not be parallel to the view direction
 * (the direction from "viewerPos" to "lookingAt").
 * (See the example for one way to ensure this.)<br>
 * @returns {Array<Number>} The resulting 4x4 matrix.
 * @example <caption>The following example calls this method with an
 * up vector of (0, 1, 0) except if the view direction is parallel to that
 * vector or nearly so.</caption>
 * var upVector=[0,1,0]; // Y axis
 * var viewdir=H3DU.Math.vec3sub(lookingAt, viewerPos);
 * var par=H3DU.Math.vec3length(H3DU.Math.vec3cross(viewdir,upVector));
 * if(par<0.00001)upVector=[0,0,1]; // view is almost parallel, so use Z axis
 * var matrix=H3DU.Math.mat4lookat(viewerPos,lookingAt,upVector);
 */
  "mat4lookat":function(viewerPos, lookingAt, up) {
    "use strict";
    if(typeof up === "undefined" || up === null)up = [0, 1, 0];
    if(typeof lookingAt === "undefined" || lookingAt === null)lookingAt = [0, 0, 0];
    var f = H3DU.Math.vec3sub(lookingAt, viewerPos);
    var len = H3DU.Math.vec3length(f);
    if(len < 1e-6) {
      return H3DU.Math.mat4identity();
    }
   // "f" is the normalized vector from "viewerPos" to "lookingAt"
    H3DU.Math.vec3scaleInPlace(f, 1.0 / len);
    // normalize the "up" vector
    up = H3DU.Math.vec3normalize(up);
    // make "s" a vector perpendicular to "f" and "up" vector;
    // "s" will point rightward from the camera's viewpoint.
    var s = H3DU.Math.vec3cross(f, up);
    H3DU.Math.vec3normalizeInPlace(s);
    // orthonormalize the "up" vector
    var u = H3DU.Math.vec3cross(s, f);
    H3DU.Math.vec3normalizeInPlace(u);
    // negate the "f" vector so that it points forward from
    // the camera's viewpoint
    H3DU.Math.vec3negateInPlace(f);
    return [s[0], u[0], f[0], 0, s[1], u[1], f[1], 0, s[2], u[2], f[2], 0,
      -H3DU.Math.vec3dot(viewerPos, s),
      -H3DU.Math.vec3dot(viewerPos, u),
      -H3DU.Math.vec3dot(viewerPos, f), 1];
  },
/**
 * Returns a 4x4 matrix representing an [orthographic projection]{@tutorial camera}.
 * In this projection, the left clipping plane is parallel to the right clipping
 * plane and the top to the bottom.<p>
 * This method is designed for enabling a [right-handed coordinate system]{@tutorial glmath}.
 * To adjust the result of this method for a left-handed system,
 * reverse the sign of the 9th, 10th, 11th, and 12th
 * elements of the result (zero-based indices 8, 9, 10, and 11).
 * <p>The projection returned by this method only scales and/or shifts the view, so that
 * objects with the same size won't appear smaller as they get more distant from the  "camera".
 * @param {Number} l Leftmost coordinate of the orthographic view.
 * @param {Number} r Rightmost coordinate of the orthographic view.
 * ("l" is usually less than "r", so that X coordinates increase leftward.
 * If "l" is greater than "r", X coordinates increase in the opposite direction.)
 * @param {Number} b Bottommost coordinate of the orthographic view.
 * @param {Number} t Topmost coordinate of the orthographic view.
 * ("b" is usually less than "t", so that Y coordinates increase upward, as they do in WebGL when just this matrix is used to transform vertices.
 * If "b" is greater than "t", Y coordinates increase in the opposite direction.)
 * @param {Number} n Distance from the "camera" to the near clipping
 * plane. A positive value means the plane is in front of the viewer.
 * @param {Number} f Distance from the "camera" to the far clipping
 * plane. A positive value means the plane is in front of the viewer.
 * (Note that n can be greater than f or vice versa.) The absolute difference
 * between n and f should be as small as the application can accept.
 * @returns {Array<Number>} The resulting 4x4 matrix.
 */
  "mat4ortho":function(l, r, b, t, n, f) {
    "use strict";
    var width = 1 / (r - l);
    var height = 1 / (t - b);
    var depth = 1 / (f - n);
    return [2 * width, 0, 0, 0, 0, 2 * height, 0, 0, 0, 0, -2 * depth, 0,
      -(l + r) * width, -(t + b) * height, -(n + f) * depth, 1];
  },

/**
 * Returns a 4x4 matrix representing a [perspective projection]{@tutorial camera},
 * given an X axis field of view.</p>
 * This method is designed for enabling a [right-handed coordinate system]{@tutorial glmath}.
 * To adjust the result of this method for a left-handed system,
 * reverse the sign of the 9th, 10th, 11th, and 12th
 * elements of the result (zero-based indices 8, 9, 10, and 11).
 * @param {Number} fovX X axis field of view, in degrees, that is, the shortest angle
 * between the left and right clipping planes. Should be less
 * than 180 degrees. (The smaller
 * this number, the bigger close objects appear to be. As a result, zooming out
 * can be implemented by raising this value, and zooming in by lowering it.)
 * @param {Number} aspectRatio The ratio of width to height of the viewport, usually
 * the scene's aspect ratio.
 * @param {Number} near The distance, in eye space, from the "camera" to
 * the near clipping plane. Objects closer than this distance won't be
 * seen.<p>This value should be greater than 0, and should be set to the highest distance
 * from the "camera" that the application can afford to clip out for being too
 * close, for example, 0.5, 1, or higher.
 * @param {Number} far The distance, in eye space, from the "camera" to
 * the far clipping plane. Objects beyond this distance will be too far
 * to be seen.<br>This value is usually greater than "near",
 * should be greater than 0, and should be set
 * so that the absolute ratio of "far" to "near" is as small as
 * the application can accept.<br>
 * In the usual case that "far" is greater than "near", depth
 * buffer values will be more concentrated around the near
 * plane than around the far plane due to the perspective
 * projection.  The greater the ratio of "far" to "near", the more
 * concentrated the values will be around the near plane, and the
 * more likely two objects close to the far plane will have identical depth values.
 * (Most WebGL implementations support 24-bit depth buffers, meaning they support 16,777,216 possible values per pixel.)
 * @returns {Array<Number>} The resulting 4x4 matrix.
 */
  "mat4perspectiveHorizontal":function(fovX, aspectRatio, near, far) {
    "use strict";
    var fov = (fovX >= 0 && fovX < 360 ? fovX : fovX % 360 + (fovX < 0 ? 360 : 0)) * H3DU.Math.PiDividedBy360;
    var fovY = H3DU.Math.Num360DividedByPi * Math.atan2(Math.tan(fov), aspectRatio);
    return H3DU.Math.mat4perspective(fovY, aspectRatio, near, far);
  },
/**
 * Returns a 4x4 matrix representing a 2D [orthographic projection]{@tutorial camera}.<p>
 * This is the same as mat4ortho() with the near clipping plane
 * set to -1 and the far clipping plane set to 1.<p>
 * This method is designed for enabling a [right-handed coordinate system]{@tutorial glmath}; see [mat4ortho()]{@link H3DU.Math.mat4ortho}.
 * @param {Number} l Leftmost coordinate of the orthographic view.
 * @param {Number} r Rightmost coordinate of the orthographic view.
 * ("l" is usually less than "r", so that X coordinates increase leftward.
 * If "l" is greater than "r", X coordinates increase in the opposite direction.)
 * @param {Number} b Bottommost coordinate of the orthographic view.
 * @param {Number} t Topmost coordinate of the orthographic view.
 * ("b" is usually less than "t", so that Y coordinates increase upward, as they do in WebGL when just this matrix is used to transform vertices.
 * If "b" is greater than "t", Y coordinates increase in the opposite direction.)
 * @returns {Array<Number>} The resulting 4x4 matrix.
 */
  "mat4ortho2d":function(l, r, b, t) {
    "use strict";
    return H3DU.Math.mat4ortho2d(l, r, b, t, -1, 1);
  },
/**
 * Returns a 4x4 matrix representing a 2D [orthographic projection]{@tutorial camera},
 * retaining the view rectangle's aspect ratio.<p>
 * If the view rectangle's aspect ratio doesn't match the desired aspect
 * ratio, the view rectangle will be centered on the viewport
 * or otherwise moved and scaled so as to keep the entire view rectangle visible without stretching
 * or squishing it.<p>
 * This is the same as mat4orthoAspect() with the near clipping plane
 * set to -1 and the far clipping plane set to 1.<p>
 * This method is designed for enabling a [right-handed coordinate system]{@tutorial glmath}; see [mat4ortho()]{@link H3DU.Math.mat4ortho}.
 * @param {Number} l Leftmost coordinate of the view rectangle.
 * @param {Number} r Rightmost coordinate of the orthographic view.
 * ("l" is usually less than "r", so that X coordinates increase leftward.
 * If "l" is greater than "r", X coordinates increase in the opposite direction.)
 * @param {Number} b Bottommost coordinate of the orthographic view.
 * @param {Number} t Topmost coordinate of the orthographic view.
 * ("b" is usually less than "t", so that Y coordinates increase upward, as they do in WebGL when just this matrix is used to transform vertices.
 * If "b" is greater than "t", Y coordinates increase in the opposite direction.)
 * @param {Number} aspect The ratio of width to height of the viewport, usually
 * the scene's aspect ratio.
 * @returns {Array<Number>} The resulting 4x4 matrix.
 */
  "mat4ortho2dAspect":function(l, r, b, t, aspect) {
    "use strict";
    return H3DU.Math.mat4orthoAspect(l, r, b, t, -1, 1, aspect);
  },
/**
 * Returns a 4x4 matrix representing an [orthographic projection]{@tutorial camera},
 * retaining the view rectangle's aspect ratio.<p>
 * If the view rectangle's aspect ratio doesn't match the desired aspect
 * ratio, the view rectangle will be centered on the viewport
 * or otherwise moved and scaled so as to keep the entire view rectangle visible without stretching
 * or squishing it.<p>
 * This method is designed for enabling a [right-handed coordinate system]{@tutorial glmath}; see [mat4ortho()]{@link H3DU.Math.mat4ortho}.
 * <p>The projection returned by this method only scales and/or shifts the view, so that
 * objects with the same size won't appear smaller as they get more distant from the  "camera".
 * @param {Number} l Leftmost coordinate of the view rectangle.
 * @param {Number} r Rightmost coordinate of the orthographic view.
 * ("l" is usually less than "r", so that X coordinates increase leftward.
 * If "l" is greater than "r", X coordinates increase in the opposite direction.)
 * @param {Number} b Bottommost coordinate of the orthographic view.
 * @param {Number} t Topmost coordinate of the orthographic view.
 * ("b" is usually less than "t", so that Y coordinates increase upward, as they do in WebGL when just this matrix is used to transform vertices.
 * If "b" is greater than "t", Y coordinates increase in the opposite direction.)
 * @param {Number} n Distance from the "camera" to the near clipping
 * plane. A positive value means the plane is in front of the viewer.
 * @param {Number} f Distance from the "camera" to the far clipping
 * plane. A positive value means the plane is in front of the viewer.
 * (Note that n can be greater than f or vice versa.) The absolute difference
 * between n and f should be as small as the application can accept.
 * @param {Number} aspect The ratio of width to height of the viewport, usually
 * the scene's aspect ratio.
 * @returns {Array<Number>} The resulting 4x4 matrix.
 */
  "mat4orthoAspect":function(l, r, b, t, n, f, aspect) {
    "use strict";
    var newDim;
    var boxAspect = Math.abs((r - l) / (t - b));
    aspect /= boxAspect;
    var w = Math.abs(r - l);
    var h = Math.abs(t - b);
    if (aspect < 1.0) {
      newDim = h / aspect;
      if(t > b) {
        b -= (newDim - h) * 0.5;
        t += (newDim - h) * 0.5;
      } else {
        t -= (newDim - h) * 0.5;
        b += (newDim - h) * 0.5;
      }
    } else {
      newDim = w * aspect;
      if(r > l) {
        l -= (newDim - w) * 0.5;
        r += (newDim - w) * 0.5;
      } else {
        r -= (newDim - w) * 0.5;
        l += (newDim - w) * 0.5;
      }
    }
    return H3DU.Math.mat4ortho(l, r, b, t, n, f);
  },
/**
 * Returns a 4x4 matrix representing a [perspective projection]{@tutorial camera}
 * in the form of a view frustum, or the limits in the "camera"'s view.<p>
 * This method is designed for enabling a [right-handed coordinate system]{@tutorial glmath}.
 * To adjust the result of this method for a left-handed system,
 * reverse the sign of the 9th, 10th, 11th, and 12th
 * elements of the result (zero-based indices 8, 9, 10, and 11).
 * @param {Number} l X coordinate of the point in eye space where the left
 * clipping plane meets the near clipping plane.
 * @param {Number} r X coordinate of the point in eye space where the right
 * clipping plane meets the near clipping plane.
 * ("l" is usually less than "r", so that X coordinates increase leftward.
 * If "l" is greater than "r", X coordinates increase in the opposite direction.)
 * @param {Number} b Y coordinate of the point in eye space where the bottom
 * clipping plane meets the near clipping plane.
 * @param {Number} t Y coordinate of the point in eye space where the top
 * clipping plane meets the near clipping plane.
 * ("b" is usually less than "t", so that Y coordinates increase upward, as they do in WebGL when just this matrix is used to transform vertices.
 * If "b" is greater than "t", Y coordinates increase in the opposite direction.)
 * @param {Number} near The distance, in eye space, from the "camera" to
 * the near clipping plane. Objects closer than this distance won't be
 * seen.<p>This value should be greater than 0, and should be set to the highest distance
 * from the "camera" that the application can afford to clip out for being too
 * close, for example, 0.5, 1, or higher.
 * @param {Number} far The distance, in eye space, from the "camera" to
 * the far clipping plane. Objects beyond this distance will be too far
 * to be seen.<br>This value is usually greater than "near",
 * should be greater than 0, and should be set
 * so that the absolute ratio of "far" to "near" is as small as
 * the application can accept.<br>
 * In the usual case that "far" is greater than "near", depth
 * buffer values will be more concentrated around the near
 * plane than around the far plane due to the perspective
 * projection.  The greater the ratio of "far" to "near", the more
 * concentrated the values will be around the near plane, and the
 * more likely two objects close to the far plane will have identical depth values.
 * (Most WebGL implementations support 24-bit depth buffers, meaning they support 16,777,216 possible values per pixel.)
 * @returns {Array<Number>} The resulting 4x4 matrix.
 */
  "mat4frustum":function(l, r, b, t, near, far) {
    "use strict";
    var dn = 2 * near;
    var onedx = 1 / (r - l);
    var onedy = 1 / (t - b);
    var onedz = 1 / (far - near);
    return [
      dn * onedx, 0, 0, 0,
      0, dn * onedy, 0, 0,
      (l + r) * onedx, (t + b) * onedy, -(far + near) * onedz, -1,
      0, 0, -(dn * far) * onedz, 0];
  },
/**
 * Modifies a 4x4 matrix by multiplying it by a
 * scaling transformation.
 * @param {Array<Number>} mat A 4x4 matrix.
 * @param {Array<Number>|Number} v3 Scale factor along the
 * X axis. A scale factor can be negative, in which case the transformation
 * also causes reflection about the corresponding axis.  If "v3y" and "v3z" are omitted, this value can instead
 * be a 3-element array giving the scale factors along the X, Y, and
 * Z axes.
 * @param {Number} v3y Scale factor along the Y axis.
 * @param {Number} v3z Scale factor along the Z axis.
 * @returns {Array<Number>} The same parameter as "mat".
 */
  "mat4scaleInPlace":function(mat, v3, v3y, v3z) {
    "use strict";
    var x, y, z;
    if(typeof v3y !== "undefined" && typeof v3z !== "undefined") {
      x = v3;
      y = v3y;
      z = v3z;
    } else {
      x = v3[0];
      y = v3[1];
      z = v3[2];
    }
    mat[0] *= x;
    mat[1] *= x;
    mat[2] *= x;
    mat[3] *= x;
    mat[4] *= y;
    mat[5] *= y;
    mat[6] *= y;
    mat[7] *= y;
    mat[8] *= z;
    mat[9] *= z;
    mat[10] *= z;
    mat[11] *= z;
    return mat;
  },
/**
 * Multiplies two 4x4 matrices. A new matrix is returned.
 * The matrices are multiplied such that the transformations
 * they describe happen in reverse order. For example, if the first
 * matrix (input matrix) describes a translation and the second
 * matrix describes a scaling, the multiplied matrix will describe
 * the effect of scaling then translation. (Multiplying the first matrix
 * by the second is the same as multiplying the second matrix
 * by the first matrix's transpose; a transpose is a matrix whose rows
 * are converted to columns and vice versa.)
 * @param {Array<Number>} a The first matrix.
 * @param {Array<Number>} b The second matrix.
 * @returns {Array<Number>} The resulting 4x4 matrix.
 */
  "mat4multiply":function(a, b) {
    "use strict";
    var dst = [];
    for(var i = 0; i < 16; i += 4) {
      for(var j = 0; j < 4; j++) {
        dst[i + j] =
    b[i] * a[j] +
    b[i + 1] * a[j + 4] +
    b[i + 2] * a[j + 8] +
    b[i + 3] * a[j + 12];
      }
    }
    return dst;
  },
/**
 * Multiplies two 3x3 matrices. A new matrix is returned.
 * The matrices are multiplied such that the transformations
 * they describe happen in reverse order. For example, if the first
 * matrix (input matrix) describes a translation and the second
 * matrix describes a scaling, the multiplied matrix will describe
 * the effect of scaling then translation. (Multiplying the first matrix
 * by the second is the same as multiplying the second matrix
 * by the first matrix's transpose; a transpose is a matrix whose rows
 * are converted to columns and vice versa.)
 * @param {Array<Number>} a The first matrix.
 * @param {Array<Number>} b The second matrix.
 * @returns {Array<Number>} The resulting 3x3 matrix.
 */
  "mat3multiply":function(a, b) {
    "use strict";
    var ret = [];
    ret[0] = b[0] * a[0] + b[1] * a[3] + b[2] * a[6];
    ret[1] = b[0] * a[1] + b[1] * a[4] + b[2] * a[7];
    ret[2] = b[0] * a[2] + b[1] * a[5] + b[2] * a[8];
    ret[3] = b[3] * a[0] + b[4] * a[3] + b[5] * a[6];
    ret[4] = b[3] * a[1] + b[4] * a[4] + b[5] * a[7];
    ret[5] = b[3] * a[2] + b[4] * a[5] + b[5] * a[8];
    ret[6] = b[6] * a[0] + b[7] * a[3] + b[8] * a[6];
    ret[7] = b[6] * a[1] + b[7] * a[4] + b[8] * a[7];
    ret[8] = b[6] * a[2] + b[7] * a[5] + b[8] * a[8];
    return ret;
  },
/**
 * Multiplies two quaternions, creating a composite rotation.
 * The quaternions are multiplied such that the second quaternion's
 * rotation happens before the first quaternion's rotation when applied
 * in the global coordinate frame.<p>
 * If both quaternions are [unit vectors]{@tutorial glmath}, the resulting
 * quaternion will also be a unit vector. However, for best results, you should
 * normalize the quaternions every few multiplications (using
 * {@link H3DU.Math.quatNormalize} or {@link H3DU.Math.quatNormalizeInPlace}), since successive
 * multiplications can cause rounding errors.
 * @param {Array<Number>} a The first quaternion.
 * @param {Array<Number>} b The second quaternion.
 * @returns {Array<Number>} The resulting quaternion.
 */
  "quatMultiply":function(a, b) {
    "use strict";
    return [
      a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
      a[3] * b[1] + a[1] * b[3] + a[2] * b[0] - a[0] * b[2],
      a[3] * b[2] + a[2] * b[3] + a[0] * b[1] - a[1] * b[0],
      a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  },
/**
 * Multiplies a 4x4 matrix by a rotation transformation that rotates vectors
 * by the given rotation angle and around the given [axis of rotation]{@tutorial glmath},
 * and returns a new matrix.
 * The effect will be that the rotation transformation will
 * happen before the transformation described in the given matrix,
 * when applied in the global coordinate frame.
 * @param {Array<Number>} mat A 4x4 matrix to multiply.
 * @param {Array<Number>|Number} angle The desired angle
 * to rotate in degrees.  If "v", "vy", and "vz" are omitted, this can
 * instead be a 4-element array giving the [axis of rotation]{@tutorial glmath}
 * as the first three elements, followed by the angle
 * in degrees as the fourth element.
 * @param {Array<Number>|Number} v X-component of the point lying on the axis
 * of rotation.  If "vy" and "vz" are omitted, this can
 * instead be a 3-element array giving the axis
 * of rotation.
 * @param {Number} vy Y-component of the point lying on the axis
 * of rotation.
 * @param {Number} vz Z-component of the point lying on the axis
 * of rotation.
 * @returns {Array<Number>} The resulting 4x4 matrix.
 */
  "mat4rotate":function(mat, angle, v, vy, vz) {
    "use strict";
    var v0, v1, v2, ang;
    if(typeof vy !== "undefined" && typeof vz !== "undefined") {
      v0 = v;
      v1 = vy;
      v2 = vz;
      ang = angle;
    } else if(typeof v === "undefined") {
      v0 = angle[0];
      v1 = angle[1];
      v2 = angle[2];
      ang = angle[3];
    } else {
      v0 = v[0];
      v1 = v[1];
      v2 = v[2];
      ang = angle;
    }
    ang = (ang >= 0 && ang < 360 ? ang : ang % 360 + (ang < 0 ? 360 : 0)) * H3DU.Math.PiDividedBy180;
    var cost = Math.cos(ang);
    var sint = ang <= 3.141592653589793 ? Math.sqrt(1.0 - cost * cost) : -Math.sqrt(1.0 - cost * cost);
    if( v0 === 1 && v1 === 0 && v2 === 0 ) {
      return [mat[0], mat[1], mat[2], mat[3],
        cost * mat[4] + mat[8] * sint, cost * mat[5] + mat[9] * sint, cost * mat[6] + mat[10] * sint, cost * mat[7] + mat[11] * sint,
        cost * mat[8] - sint * mat[4], cost * mat[9] - sint * mat[5], cost * mat[10] - sint * mat[6], cost * mat[11] - sint * mat[7],
        mat[12], mat[13], mat[14], mat[15]];
    } else if( v0 === 0 && v1 === 1 && v2 === 0 ) {
      return [cost * mat[0] - sint * mat[8], cost * mat[1] - sint * mat[9], cost * mat[2] - sint * mat[10], cost * mat[3] - sint * mat[11],
        mat[4], mat[5], mat[6], mat[7],
        cost * mat[8] + mat[0] * sint, cost * mat[9] + mat[1] * sint, cost * mat[10] + mat[2] * sint, cost * mat[11] + mat[3] * sint,
        mat[12], mat[13], mat[14], mat[15]];
    } else if( v0 === 0 && v1 === 0 && v2 === 1 ) {
      return [cost * mat[0] + mat[4] * sint, cost * mat[1] + mat[5] * sint, cost * mat[2] + mat[6] * sint, cost * mat[3] + mat[7] * sint,
        cost * mat[4] - sint * mat[0], cost * mat[5] - sint * mat[1], cost * mat[6] - sint * mat[2], cost * mat[7] - sint * mat[3],
        mat[8], mat[9], mat[10], mat[11], mat[12], mat[13], mat[14], mat[15]];
    } else if(v0 === 0 && v1 === 0 && v2 === 0) {
      return H3DU.Math.mat4copy(mat);
    } else {
      var iscale = 1.0 / Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2);
      v0 *= iscale;
      v1 *= iscale;
      v2 *= iscale;
      var x2 = v0 * v0;
      var y2 = v1 * v1;
      var z2 = v2 * v2;
      var mcos = 1.0 - cost;
      var xy = v0 * v1;
      var xz = v0 * v2;
      var yz = v1 * v2;
      var xs = v0 * sint;
      var ys = v1 * sint;
      var zs = v2 * sint;
      v1 = mcos * x2;
      var v10 = mcos * yz;
      var v12 = mcos * z2;
      var v3 = mcos * xy;
      var v5 = mcos * xz;
      var v7 = mcos * y2;
      var v15 = cost + v1;
      var v16 = v3 + zs;
      var v17 = v5 - ys;
      var v18 = cost + v7;
      var v19 = v3 - zs;
      var v20 = v10 + xs;
      var v21 = cost + v12;
      var v22 = v5 + ys;
      var v23 = v10 - xs;
      return [
        mat[0] * v15 + mat[4] * v16 + mat[8] * v17, mat[1] * v15 + mat[5] * v16 + mat[9] * v17,
        mat[10] * v17 + mat[2] * v15 + mat[6] * v16, mat[11] * v17 + mat[3] * v15 + mat[7] * v16,
        mat[0] * v19 + mat[4] * v18 + mat[8] * v20, mat[1] * v19 + mat[5] * v18 + mat[9] * v20,
        mat[10] * v20 + mat[2] * v19 + mat[6] * v18, mat[11] * v20 + mat[3] * v19 + mat[7] * v18,
        mat[0] * v22 + mat[4] * v23 + mat[8] * v21, mat[1] * v22 + mat[5] * v23 + mat[9] * v21,
        mat[10] * v21 + mat[2] * v22 + mat[6] * v23, mat[11] * v21 + mat[3] * v22 + mat[7] * v23,
        mat[12], mat[13], mat[14], mat[15]];
    }
  },
/**
 * Returns a 4x4 matrix representing a rotation transformation that rotates vectors
 * by the given rotation angle and around the given [axis of rotation]{@tutorial glmath}.
 * @param {Array<Number>|Number} angle The desired angle
 * to rotate in degrees.  If "v", "vy", and "vz" are omitted, this can
 * instead be a 4-element array giving the axis of rotation as the first three elements, followed by the angle
 * in degrees as the fourth element.
 * @param {Array<Number>|Number} v X-component of the point lying on the axis
 * of rotation.  If "vy" and "vz" are omitted, this can
 * instead be a 3-element array giving the axis
 * of rotation.
 * @param {Number} vy Y-component of the point lying on the axis
 * of rotation.
 * @param {Number} vz Z-component of the point lying on the axis
 * of rotation.
 * @returns {Array<Number>} The resulting 4x4 matrix.
 */
  "mat4rotated":function(angle, v, vy, vz) {
    "use strict";
    var v0, v1, v2, ang;
    if(typeof vy !== "undefined" && typeof vz !== "undefined") {
      v0 = v;
      v1 = vy;
      v2 = vz;
      ang = angle;
    } else if(typeof v === "undefined") {
      v0 = angle[0];
      v1 = angle[1];
      v2 = angle[2];
      ang = angle[3];
    } else {
      v0 = v[0];
      v1 = v[1];
      v2 = v[2];
      ang = angle;
    }
    ang = (ang >= 0 && ang < 360 ? ang : ang % 360 + (ang < 0 ? 360 : 0)) * H3DU.Math.PiDividedBy180;
    if(ang === 90 || ang === -270) {
      var iscale = 1.0 / Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2);
      v0 *= iscale;
      v1 *= iscale;
      v2 *= iscale;
      return [v0 * v0, v0 * v1 + v2, v0 * v2 - v1, 0.0,
        v1 * v0 - v2, v1 * v1, v1 * v2 + v0, 0.0,
        v2 * v0 + v1, v2 * v1 - v0, v2 * v2, 0.0,
        0.0, 0.0, 0.0, 1.0];
    }
    if(ang === -90 || ang === 270) {
      iscale = 1.0 / Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2);
      v0 *= iscale;
      v1 *= iscale;
      v2 *= iscale;
      return [v0 * v0, v0 * v1 - v2, v0 * v2 + v1, 0.0,
        v1 * v0 + v2, v1 * v1, v1 * v2 - v0, 0,
        v2 * v0 - v1, v2 * v1 + v0, v2 * v2, 0,
        0.0, 0.0, 0.0, 1.0];
    }
    if(ang === 180 || ang === -180) {
      iscale = 1.0 / Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2);
      v0 *= iscale;
      v1 *= iscale;
      v2 *= iscale;
      return [v0 * v0 * 2.0 - 1.0,
        v0 * v1 * 2.0,
        v0 * v2 * 2.0,
        0.0,
        v1 * v0 * 2.0,
        v1 * v1 * 2.0 - 1.0,
        v1 * v2 * 2.0,
        0.0,
        v2 * v0 * 2.0,
        v2 * v1 * 2.0,
        v2 * v2 * 2.0 - 1.0,
        0.0, 0.0, 0.0, 0.0, 1.0];
    }
    var cost = Math.cos(ang);
    var sint = ang >= 0 && ang < 6.283185307179586 ? ang <= 3.141592653589793 ? Math.sqrt(1.0 - cost * cost) : -Math.sqrt(1.0 - cost * cost) : Math.sin(ang);
    if( v0 === 1 && v1 === 0 && v2 === 0 ) {
      return[1, 0, 0, 0, 0, cost, sint, 0, 0, -sint, cost, 0, 0, 0, 0, 1];
    } else if( v0 === 0 && v1 === 1 && v2 === 0 ) {
      return [cost, 0, -sint, 0, 0, 1, 0, 0, sint, 0, cost, 0, 0, 0, 0, 1];
    } else if( v0 === 0 && v1 === 0 && v2 === 1 ) {
      return [cost, sint, 0, 0, -sint, cost, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    } else if(v0 === 0 && v1 === 0 && v2 === 0) {
      return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    } else {
      iscale = 1.0 / Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2);
      v0 *= iscale;
      v1 *= iscale;
      v2 *= iscale;
      var x2 = v0 * v0;
      var y2 = v1 * v1;
      var z2 = v2 * v2;
      var xy = v0 * v1;
      var xz = v0 * v2;
      var yz = v1 * v2;
      var xs = v0 * sint;
      var ys = v1 * sint;
      var zs = v2 * sint;
      var mcos = 1.0 - cost;
      v0 = mcos * xy;
      v1 = mcos * xz;
      v2 = mcos * yz;
      return [cost + mcos * x2, v0 + zs, v1 - ys, 0, v0 - zs, cost + mcos * y2, v2 + xs, 0, v1 + ys,
        v2 - xs, cost + mcos * z2, 0, 0, 0, 0, 1];
    }
  },
/**
 * Normalizes this plane so that its normal is a [unit vector]{@tutorial glmath},
 * unless all the normal's components are 0, and sets this plane to the result.
 * The plane's distance will be divided by the
 * current normal's length.<p>
 * ("Norm", as used in this method's name, means "normalize"; this is not to be
 * confused with a vector's "norm", another name for its length.)
 * @param {Array<Number>} plane A four-element array
 * defining the plane. The first three elements of the array
 * are the X, Y, and Z components of the plane's normal vector, and
 * the fourth element is the shortest distance from the plane
 * to the origin, or if negative, from the origin to the plane,
 * divided by the normal's length.
 * @returns {Array<Number>} The parameter "plane".
 */
  "planeNormalizeInPlace":function(plane) {
    "use strict";
    var x = plane[0];
    var y = plane[1];
    var z = plane[2];

    var len = Math.sqrt(x * x + y * y + z * z);
    if(len !== 0) {
      len = 1.0 / len;
      plane[0] *= len;
      plane[1] *= len;
      plane[2] *= len;
      plane[3] *= len;
    }
    return plane;
  },
/**
 * Normalizes this plane so that its normal is a [unit vector]{@tutorial glmath},
 * unless all the normal's components are 0, and returns a new plane with the result.
 * The plane's distance will be divided by the
 * normal's length. Returns a new plane.
 * @param {Array<Number>} plane A four-element array
 * defining the plane. The first three elements of the array
 * are the X, Y, and Z components of the plane's normal vector, and
 * the fourth element is the shortest distance from the plane
 * to the origin, or if negative, from the origin to the plane,
 * divided by the normal's length.
 * @returns {Array<Number>} A normalized version of
 * the plane.
 * Note that due to rounding error, the length of the plane's normal might not be exactly equal to 1, and that the vector will remain unchanged if its length is 0 or extremely close to 0.
 */
  "planeNormalize":function(plane) {
    "use strict";
    return H3DU.Math.planeNormalizeInPlace(H3DU.Math.vec4copy(plane));
  },
/**
 * Finds the six clipping planes of a view frustum defined
 * by a 4x4 matrix. These six planes together form the
 * shape of a "chopped-off" pyramid (or frustum).<p>
 * In this model, the eye, or camera, is placed at the top
 * of the pyramid (before being chopped off), four planes are placed at the pyramid's
 * sides, one plane (the far plane) forms its base, and a
 * final plane (the near plane) is the pyramid's chopped
 * off top.
 * @param {Array<Number>} matrix A 4x4 matrix. This will
 * usually be a projection-view matrix (projection matrix
 * multiplied by view matrix, in that order).
 * @returns {Array<Array<Number>>} An array of six
 * 4-element arrays representing the six clipping planes of the
 * view frustum. In order, they are the left, right, top,
 * bottom, near, and far clipping planes. All six planes
 * will be normalized (see {@link H3DU.Math.planeNormalizeInPlace}).
 */
  "mat4toFrustumPlanes":function(matrix) {
    "use strict";
    var frustum = [[], [], [], [], [], []];
 // Left clipping plane
    frustum[0] = H3DU.Math.planeNormalizeInPlace([
      matrix[3] + matrix[0],
      matrix[7] + matrix[4],
      matrix[11] + matrix[8],
      matrix[15] + matrix[12]
    ]);
 // Right clipping plane
    frustum[1] = H3DU.Math.planeNormalizeInPlace([
      matrix[3] - matrix[0],
      matrix[7] - matrix[4],
      matrix[11] - matrix[8],
      matrix[15] - matrix[12]
    ]);
 // Top clipping plane
    frustum[2] = H3DU.Math.planeNormalizeInPlace([
      matrix[3] - matrix[1],
      matrix[7] - matrix[5],
      matrix[11] - matrix[9],
      matrix[15] - matrix[13]
    ]);
 // Bottom clipping plane
    frustum[3] = H3DU.Math.planeNormalizeInPlace([
      matrix[3] + matrix[1],
      matrix[7] + matrix[5],
      matrix[11] + matrix[9],
      matrix[15] + matrix[13]
    ]);
 // Near clipping plane
    frustum[4] = H3DU.Math.planeNormalizeInPlace([
      matrix[3] + matrix[2],
      matrix[7] + matrix[6],
      matrix[11] + matrix[10],
      matrix[15] + matrix[14]
    ]);
 // Far clipping plane
    frustum[5] = H3DU.Math.planeNormalizeInPlace([
      matrix[3] - matrix[2],
      matrix[7] - matrix[6],
      matrix[11] - matrix[10],
      matrix[15] - matrix[14]
    ]);
    return frustum;
  },
/**
 * Determines whether a sphere is at least
 * partially inside a view frustum.
 * @param {Array<Array<Number>>} frustum An array of six
 * 4-element arrays representing the six clipping planes of the
 * view frustum. In order, they are the left, right, top,
 * bottom, near, and far clipping planes.
 * @param {Number} x X coordinate of the sphere's center
 * in world space.
 * @param {Number} y Y coordinate of the sphere's center
 * in world space.
 * @param {Number} z Z coordinate of the sphere's center
 * in world space.
 * @param {Number} radius Radius of the sphere
 * in world-space units.
 * @returns {Boolean} <code>true</code> if the sphere
 * is partially or totally
 * inside the frustum; <code>false</code> otherwise.
 */
  "frustumHasSphere":function(frustum, x, y, z, radius) {
    "use strict";
    if(radius < 0)throw new Error("radius is negative");
    for(var i = 0; i < 6; i++) {
      var plane = frustum[i];
      var dot = plane[3] + plane[0] * x +
     plane[1] * y + plane[2] * z;
      if(dot < -radius)return false;
    }
    return true;
  },
/**
 * Determines whether a 3D bounding box is empty.
 * This is determined if the minimum coordinate
 * is larger than the corresponding maximum coordinate.
 * @param {Array<Number>} box An axis-aligned bounding
 * box, which is an array of six values.
 * The first three values are the smallest X, Y, and Z coordinates,
 * and the last three values are the largest X, Y, and Z
 * coordinates.
 * @returns {Boolean} <code>true</code> if at least one
 * of the minimum coordinates is greater than its
 * corresponding maximum coordinate; otherwise, <code>false</code>.
 */
  "boxIsEmpty":function(box) {
    "use strict";
    return box[0] > box[3] || box[1] > box[4] || box[2] > box[5];
  },
/**
 * Finds the dimensions of a 3D bounding box. This is done by subtracting
 * the first three values of the given array with its last three values.
 * @param {Array<Number>} box An axis-aligned bounding
 * box, which is an array of six values.
 * The first three values are the smallest X, Y, and Z coordinates,
 * and the last three values are the largest X, Y, and Z
 * coordinates.
 * @returns {Array<Number>} A 3-element array containing the
 * width, height, and depth of the bounding box, respectively. If
 * at least one of the minimum coordinates is greater than its
 * corresponding maximum coordinate, the array can contain
 * negative values.
 */
  "boxDimensions":function(box) {
    "use strict";
    return [box[3] - box[0], box[4] - box[1], box[5] - box[2]];
  },
/**
 * Finds the center of a 3D bounding box.
 * @param {Array<Number>} box An axis-aligned bounding
 * box, which is an array of six values.
 * The first three values are the smallest X, Y, and Z coordinates,
 * and the last three values are the largest X, Y, and Z
 * coordinates.
 * @returns {Array<Number>} A 3-element array containing the
 * X, Y, and Z coordinates, respectively, of the bounding box's
 * center.
 */
  "boxCenter":function(box) {
    "use strict";
    return [box[0] + (box[3] - box[0]) * 0.5,
      box[1] + (box[4] - box[1]) * 0.5,
      box[2] + (box[5] - box[2]) * 0.5];
  },
/**
 * Determines whether an axis-aligned bounding box
 * is at least partially inside a view frustum.
 * @param {Array<Array<Number>>} frustum An array of six
 * 4-element arrays representing the six clipping planes of the
 * view frustum. In order, they are the left, right, top,
 * bottom, near, and far clipping planes.
 * @param {Array<Number>} box An axis-aligned bounding
 * box in world space, which is an array of six values.
 * The first three values are the smallest X, Y, and Z coordinates,
 * and the last three values are the largest X, Y, and Z
 * coordinates.
 * @returns {Boolean} <code>true</code> if the box
 * may be partially or totally
 * inside the frustum; <code>false</code> if the box is
 * definitely outside the frustum, or if the box is empty
 * (see "boxIsEmpty").
 */
  "frustumHasBox":function(frustum, box) {
    "use strict";
    if(H3DU.Math.boxIsEmpty(box)) {
      return false;
    }
    for(var i = 0; i < 6; i++) {
      var plane = frustum[i];
      var p3 = plane[3];
      var p0b0 = plane[0] * box[0];
      var p2b2 = plane[2] * box[2];
      var p1b1 = plane[1] * box[1];
      if( p0b0 + p1b1 + p2b2 + p3 <= 0.0 &&
      plane[0] * box[3] + plane[1] * box[4] + plane[2] * box[5] + p3 <= 0.0 &&
      p0b0 + plane[1] * box[4] + p2b2 + p3 <= 0.0 &&
      p0b0 + plane[1] * box[4] + plane[2] * box[5] + p3 <= 0.0 &&
      p0b0 + p1b1 + plane[2] * box[5] + p3 <= 0.0 &&
      plane[0] * box[3] + plane[1] * box[4] + p2b2 + p3 <= 0.0 &&
      plane[0] * box[3] + p1b1 + p2b2 + p3 <= 0.0 &&
      plane[0] * box[3] + p1b1 + plane[2] * box[5] + p3 <= 0.0) {
        return false;
      }
    }
    // To increase robustness in frustum culling; see
    // <http://www.iquilezles.org/www/articles/frustumcorrect/frustumcorrect.htm>
    var pts = H3DU.Math._frustumPoints(frustum);
    for(i = 0; i < 3; i++) {
      var minval = box[i];
      if(pts[i] < minval && pts[3 + i] < minval && pts[6 + i] < minval &&
      pts[9 + i] < minval && pts[12 + i] < minval && pts[15 + i] < minval &&
    pts[18 + i] < minval && pts[21 + i] < minval) {
        return false;
      }
      var maxval = box[i + 3];
      if(pts[i] > maxval && pts[3 + i] > maxval && pts[6 + i] > maxval &&
      pts[9 + i] > maxval && pts[12 + i] > maxval && pts[15 + i] > maxval &&
    pts[18 + i] > maxval && pts[21 + i] > maxval) {
        return false;
      }
    }
    return true;
  },
/** @ignore */
  "_frustumPoints":function(frustum) {
    "use strict";
    var p0 = frustum[0];
    var p1 = frustum[1];
    var p2 = frustum[2];
    var p3 = frustum[3];
    var p4 = frustum[4];
    var p5 = frustum[5];
  // left-top-near, left-bottom-near, right-top-near, ..., right-bottom-far
    var ret = [];
    var t1 = p2[1] * p4[2];
    var t2 = p2[2] * p4[1];
    var t3 = t1 - t2;
    var t4 = p2[2] * p4[0];
    var t5 = p2[0] * p4[2];
    var t6 = t4 - t5;
    var t7 = p2[0] * p4[1];
    var t8 = p2[1] * p4[0];
    var t9 = t7 - t8;
    var t10 = p0[2] * p2[0];
    var t11 = p0[0] * p2[2];
    var t12 = p0[0] * p2[1];
    var t13 = p0[1] * p2[0];
    var t14 = p4[2] * p0[0];
    var t15 = p4[0] * p0[2];
    var t16 = p4[0] * p0[1];
    var t17 = p4[1] * p0[0];
    var t18 = 1.0 / (p0[0] * t3 + p0[1] * t6 + p0[2] * t9);
    var t19 = p4[1] * p0[2];
    var t20 = p4[2] * p0[1];
    var t21 = p0[1] * p2[2];
    var t22 = p0[2] * p2[1];
    var t23 = -p0[3];
    var t24 = -p2[3];
    var t25 = -p4[3];
    ret[0] = (t3 * t23 + (t19 - t20) * t24 + (t21 - t22) * t25) * t18;
    ret[1] = (t6 * t23 + (t14 - t15) * t24 + (t10 - t11) * t25) * t18;
    ret[2] = (t9 * t23 + (t16 - t17) * t24 + (t12 - t13) * t25) * t18;
    var t26 = p3[1] * p4[2];
    var t27 = p3[2] * p4[1];
    var t28 = t26 - t27;
    var t29 = p3[2] * p4[0];
    var t30 = p3[0] * p4[2];
    var t31 = t29 - t30;
    var t32 = p3[0] * p4[1];
    var t33 = p3[1] * p4[0];
    var t34 = t32 - t33;
    var t35 = p0[2] * p3[0];
    var t36 = p0[0] * p3[2];
    var t37 = p0[0] * p3[1];
    var t38 = p0[1] * p3[0];
    var t39 = 1.0 / (p0[0] * t28 + p0[1] * t31 + p0[2] * t34);
    var t40 = p0[1] * p3[2];
    var t41 = p0[2] * p3[1];
    var t42 = -p3[3];
    ret[3] = (t28 * t23 + (t19 - t20) * t42 + (t40 - t41) * t25) * t39;
    ret[4] = (t31 * t23 + (t14 - t15) * t42 + (t35 - t36) * t25) * t39;
    ret[5] = (t34 * t23 + (t16 - t17) * t42 + (t37 - t38) * t25) * t39;
    var t43 = t1 - t2;
    var t44 = t4 - t5;
    var t45 = t7 - t8;
    var t46 = p1[2] * p2[0];
    var t47 = p1[0] * p2[2];
    var t48 = p1[0] * p2[1];
    var t49 = p1[1] * p2[0];
    var t50 = p4[2] * p1[0];
    var t51 = p4[0] * p1[2];
    var t52 = p4[0] * p1[1];
    var t53 = p4[1] * p1[0];
    var t54 = 1.0 / (p1[0] * t43 + p1[1] * t44 + p1[2] * t45);
    var t55 = p4[1] * p1[2];
    var t56 = p4[2] * p1[1];
    var t57 = p1[1] * p2[2];
    var t58 = p1[2] * p2[1];
    var t59 = -p1[3];
    ret[6] = (t43 * t59 + (t55 - t56) * t24 + (t57 - t58) * t25) * t54;
    ret[7] = (t44 * t59 + (t50 - t51) * t24 + (t46 - t47) * t25) * t54;
    ret[8] = (t45 * t59 + (t52 - t53) * t24 + (t48 - t49) * t25) * t54;
    var t60 = t26 - t27;
    var t61 = t29 - t30;
    var t62 = t32 - t33;
    var t63 = p1[2] * p3[0];
    var t64 = p1[0] * p3[2];
    var t65 = p1[0] * p3[1];
    var t66 = p1[1] * p3[0];
    var t67 = 1.0 / (p1[0] * t60 + p1[1] * t61 + p1[2] * t62);
    var t68 = p1[1] * p3[2];
    var t69 = p1[2] * p3[1];
    ret[9] = (t60 * t59 + (t55 - t56) * t42 + (t68 - t69) * t25) * t67;
    ret[10] = (t61 * t59 + (t50 - t51) * t42 + (t63 - t64) * t25) * t67;
    ret[11] = (t62 * t59 + (t52 - t53) * t42 + (t65 - t66) * t25) * t67;
    var t70 = p2[1] * p5[2];
    var t71 = p2[2] * p5[1];
    var t72 = t70 - t71;
    var t73 = p2[2] * p5[0];
    var t74 = p2[0] * p5[2];
    var t75 = t73 - t74;
    var t76 = p2[0] * p5[1];
    var t77 = p2[1] * p5[0];
    var t78 = t76 - t77;
    var t79 = p5[2] * p0[0];
    var t80 = p5[0] * p0[2];
    var t81 = p5[0] * p0[1];
    var t82 = p5[1] * p0[0];
    var t83 = 1.0 / (p0[0] * t72 + p0[1] * t75 + p0[2] * t78);
    var t84 = p5[1] * p0[2];
    var t85 = p5[2] * p0[1];
    var t86 = -p5[3];
    ret[12] = (t72 * t23 + (t84 - t85) * t24 + (t21 - t22) * t86) * t83;
    ret[13] = (t75 * t23 + (t79 - t80) * t24 + (t10 - t11) * t86) * t83;
    ret[14] = (t78 * t23 + (t81 - t82) * t24 + (t12 - t13) * t86) * t83;
    var t87 = p3[1] * p5[2];
    var t88 = p3[2] * p5[1];
    var t89 = t87 - t88;
    var t90 = p3[2] * p5[0];
    var t91 = p3[0] * p5[2];
    var t92 = t90 - t91;
    var t93 = p3[0] * p5[1];
    var t94 = p3[1] * p5[0];
    var t95 = t93 - t94;
    var t96 = 1.0 / (p0[0] * t89 + p0[1] * t92 + p0[2] * t95);
    ret[15] = (t89 * t23 + (t84 - t85) * t42 + (t40 - t41) * t86) * t96;
    ret[16] = (t92 * t23 + (t79 - t80) * t42 + (t35 - t36) * t86) * t96;
    ret[17] = (t95 * t23 + (t81 - t82) * t42 + (t37 - t38) * t86) * t96;
    var t97 = t70 - t71;
    var t98 = t73 - t74;
    var t99 = t76 - t77;
    var t100 = p5[2] * p1[0];
    var t101 = p5[0] * p1[2];
    var t102 = p5[0] * p1[1];
    var t103 = p5[1] * p1[0];
    var t104 = 1.0 / (p1[0] * t97 + p1[1] * t98 + p1[2] * t99);
    var t105 = p5[1] * p1[2];
    var t106 = p5[2] * p1[1];
    ret[18] = (t97 * t59 + (t105 - t106) * t24 + (t57 - t58) * t86) * t104;
    ret[19] = (t98 * t59 + (t100 - t101) * t24 + (t46 - t47) * t86) * t104;
    ret[20] = (t99 * t59 + (t102 - t103) * t24 + (t48 - t49) * t86) * t104;
    var t107 = t87 - t88;
    var t108 = t90 - t91;
    var t109 = t93 - t94;
    var t110 = 1.0 / (p1[0] * t107 + p1[1] * t108 + p1[2] * t109);
    ret[21] = (t107 * t59 + (t105 - t106) * t42 + (t68 - t69) * t86) * t110;
    ret[22] = (t108 * t59 + (t100 - t101) * t42 + (t63 - t64) * t86) * t110;
    ret[23] = (t109 * t59 + (t102 - t103) * t42 + (t65 - t66) * t86) * t110;
    return ret;
  },
/**
 * Determines whether a point is
 * outside or inside a view frustum.
 * @param {Array<Array<Number>>} frustum An array of six
 * 4-element arrays representing the six clipping planes of the
 * view frustum. In order, they are the left, right, top,
 * bottom, near, and far clipping planes.
 * @param {Number} x X coordinate of a point
 * in world space.
 * @param {Number} y Y coordinate of a point
 * in world space.
 * @param {Number} z Z coordinate of a point
 * in world space.
 * @returns {Boolean} true if the point is inside;
 * otherwise false;
 */
  "frustumHasPoint":function(frustum, x, y, z) {
    "use strict";
    for(var i = 0; i < 6; i++) {
      var d = frustum[i][0] * x + frustum[i][1] * y +
     frustum[i][2] * z + frustum[i][3];
      if(d <= 0)return false;
    }
    return true;
  },
/**
 * Converts a color in linear RGB to the sRGB color space, and returns
 * a new vector with the result.<p>
 * The sRGB color space is a nonlinear red-green-blue color space;
 * it <i>roughly</i> differs from linear RGB in having an exponent
 * of 1/2.2 from linear RGB. Linear RGB is linear because of its linear relationship of light emitted
 * by a surface of the given color.
 * @param {Array<Number>} lin A three- or four-element vector giving
 * the red, green, and blue components, in that order, of a linear RGB color. The alpha component
 * is either the fourth element in the case of a four-element vector, or 1.0
 * in the case of a three-element vector. Each element in the vector ranges from 0 through 1.
 * @returns {Array<Number>} lin A four-element vector giving
 * the red, green, blue, and alpha components, in that order, of the given color
 * in the sRGB color space. The alpha component will be as specified
 * in the "lin" parameter.
 */
  "colorTosRGB":function(lin) {
    "use strict";
    return [
      lin[0] <= 0.00304 ? 12.92 * lin[0] : Math.pow(lin[0], 0.41666666667) * 1.0556 - 0.0556,
      lin[1] <= 0.00304 ? 12.92 * lin[1] : Math.pow(lin[1], 0.41666666667) * 1.0556 - 0.0556,
      lin[2] <= 0.00304 ? 12.92 * lin[2] : Math.pow(lin[2], 0.41666666667) * 1.0556 - 0.0556,
      lin.length <= 3 ? 1.0 : lin[3]];
  },
/**
 * Converts a color in sRGB to the linear RGB color space, and returns
 * a new vector with the result.<p>
 * The sRGB color space is a nonlinear red-green-blue color space;
 * it <i>roughly</i> differs from linear RGB in having an exponent
 * of 1/2.2 from linear RGB. Linear RGB is linear because of its linear relationship of light emitted
 * by a surface of the given color.
 * @param {Array<Number>} srgb A three- or four-element vector giving
 * the red, green, and blue components, in that order, of an sRGB color. The alpha component
 * is either the fourth element in the case of a four-element vector, or 1.0
 * in the case of a three-element vector. Each element in the vector ranges from 0 through 1.
 * @returns {Array<Number>} lin A three-element vector giving
 * the red, green, and blue components, in that order, of the given color
 * in linear RGB.The alpha component will be as specified
 * in the "srgb" parameter.
 */
  "colorToLinear":function(lin) {
    "use strict";
    return [
      lin[0] <= 0.03928 ? 0.077399381 * lin[0] : Math.pow((0.0556 + lin[0]) * 0.947328534, 2.4),
      lin[1] <= 0.03928 ? 0.077399381 * lin[1] : Math.pow((0.0556 + lin[1]) * 0.947328534, 2.4),
      lin[2] <= 0.03928 ? 0.077399381 * lin[2] : Math.pow((0.0556 + lin[2]) * 0.947328534, 2.4),
      lin.length <= 3 ? 1.0 : lin[3]];
  }
};

/**
 * Finds the dot product of two quaternions.
 * It's equal to the sum of the products of
 * their components (for example, <b>a</b>'s X times <b>b</b>'s X).
 * @function
 * @param {Array<Number>} a The first quaternion.
 * @param {Array<Number>} b The second quaternion.
 * @returns {Number} Return value.
 * @method
 * @static
 * @see {@link H3DU.Math.vec4dot}
 */
H3DU.Math.quatDot = H3DU.Math.vec4dot;
/**
 * Converts a quaternion to a [unit vector]{@tutorial glmath}.
 * When a quaternion is normalized, it describes the same rotation but the distance from the origin
 * to that quaternion becomes 1 (unless all its components are 0).
 * A quaternion is normalized by dividing each of its components
 * by its [length]{@link H3DU.Math.quatLength}.<p>
 * ("Norm", as used in this method's name, means "normalize"; this is not to be
 * confused with a vector's "norm", another name for its length.)
 * @function
 * @param {Array<Number>} quat A quaternion, containing four elements.
 * @returns {Array<Number>} The parameter "quat".
 * Note that due to rounding error, the vector's length might not be exactly equal to 1, and that the vector will remain unchanged if its length is 0 or extremely close to 0.
 * @method
 * @static
 * @see {@link H3DU.Math.vec4normalizeInPlace}
 */
H3DU.Math.quatNormalizeInPlace = H3DU.Math.vec4normalizeInPlace;
/**
 * Converts a quaternion to a [unit vector]{@tutorial glmath}; returns a new quaternion.
 * When a quaternion is normalized, the distance from the origin
 * to that quaternion becomes 1 (unless all its components are 0).
 * A quaternion is normalized by dividing each of its components
 * by its [length]{@link H3DU.Math.quatLength}.<p>
 * ("Norm", as used in this method's name, means "normalize"; this is not to be
 * confused with a vector's "norm", another name for its length.)
 * @function
 * @param {Array<Number>} quat A quaternion, containing four elements.
 * @returns {Array<Number>} The normalized quaternion.
 * Note that due to rounding error, the vector's length might not be exactly equal to 1, and that the vector will remain unchanged if its length is 0 or extremely close to 0.
 * @method
 * @static
 * @see {@link H3DU.Math.vec4normalize}
 */
H3DU.Math.quatNormalize = H3DU.Math.vec4normalize;
/**
 * Returns the distance of this quaternion from the origin.
 * It's the same as the square root of the sum of the squares
 * of its components.
 * @function
 * @param {Array<Number>} quat The quaternion.
 * @returns {Number} Return value.
 * @method
 * @static
 * @see {@link H3DU.Math.vec4length}
 */
H3DU.Math.quatLength = H3DU.Math.vec4length;
/**
 * Multiplies each element of a quaternion by a factor
 * and stores the result in that quaternion.
 * @function
 * @param {Array<Number>} a A quaternion.
 * @param {Number} scalar A factor to multiply.
 * @returns {Array<Number>} The parameter "a".
 * @method
 * @static
 * @see {@link H3DU.Math.vec4scaleInPlace}
 */
H3DU.Math.quatScaleInPlace = H3DU.Math.vec4scaleInPlace;
/**
 * Multiplies each element of a quaternion by a factor
 * and returns the result as a new quaternion.
 * @function
 * @param {Array<Number>} a A quaternion.
 * @param {Number} scalar A factor to multiply.
 * @returns {Array<Number>} The resulting quaternion.
 * @method
 * @static
 * @see {@link H3DU.Math.vec4scaleInPlace}
 */
H3DU.Math.quatScale = H3DU.Math.vec4scale;
/**
 * Returns a copy of a quaternion.
 * @function
 * @returns {Array<Number>} Return value.
 * @method
 * @static
 * @see {@link H3DU.Math.vec4copy}
 */
H3DU.Math.quatCopy = H3DU.Math.vec4copy;
/**
 * Closest approximation to pi times 2, or a 360-degree turn in radians.
 * @const
 * @default
 */
H3DU.Math.PiTimes2 = 6.283185307179586476925286766559;
/**
 * Closest approximation to pi divided by 2, or a 90-degree turn in radians.
 * @const
 * @default
 */
H3DU.Math.HalfPi = 1.5707963267948966192313216916398;
/**
 * Closest approximation to pi divided by 180, or the number
 * of radians in a degree. Multiply by this number to convert degrees to radians.
 * @const
 * @default
 */
H3DU.Math.PiDividedBy180 = 0.01745329251994329576923690768489;
/**
 * Closest approximation to pi divided by 180, or the number
 * of radians in a degree. Multiply by this number to convert degrees to radians.
 * @const
 * @default
 */
H3DU.Math.ToRadians = H3DU.Math.PiDividedBy180;
/**
 * @private
 * @const */
H3DU.Math.PiDividedBy360 = 0.00872664625997164788461845384244;
/**
 * @private
 * @const */
H3DU.Math.Num360DividedByPi = 114.59155902616464175359630962821;
/**
 * Closest approximation to 180 divided by pi, or the number of
 * degrees in a radian. Multiply by this number to convert radians to degrees.
 * @const
 * @default
 */
H3DU.Math.Num180DividedByPi = 57.295779513082320876798154814105;
/**
 * Closest approximation to 180 divided by pi, or the number of
 * degrees in a radian. Multiply by this number to convert radians to degrees.
 * @const
 * @default
 */
H3DU.Math.ToDegrees = H3DU.Math.Num180DividedByPi;
/**
 * Indicates that a vector's rotation occurs as a pitch, then yaw, then roll (each rotation around the original axes),
 * or in the reverse order around
 * @const
 */
H3DU.Math.GlobalPitchYawRoll = 0;
/**
 * Indicates that a vector's rotation occurs as a pitch, then roll, then yaw (each rotation around the original axes).
 * @const
 */
H3DU.Math.GlobalPitchRollYaw = 1;
/**
 * Indicates that a vector's rotation occurs as a yaw, then pitch, then roll (each rotation around the original axes).
 * @const
 */
H3DU.Math.GlobalYawPitchRoll = 2;
/**
 * Indicates that a vector's rotation occurs as a yaw, then roll, then pitch (each rotation around the original axes).
 * @const
 */
H3DU.Math.GlobalYawRollPitch = 3;
/**
 * Indicates that a vector's rotation occurs as a roll, then pitch, then yaw (each rotation around the original axes).
 * @const
 */
H3DU.Math.GlobalRollPitchYaw = 4;
/**
 * Indicates that a vector's rotation occurs as a roll, then yaw, then pitch (each rotation around the original axes).
 * @const
 */
H3DU.Math.GlobalRollYawPitch = 5;
/**
 * Indicates that a vector's rotation occurs as a pitch, then yaw, then roll, where the yaw and roll
 * occur around the rotated object's new axes and not necessarily the original axes.
 * @const
 */
H3DU.Math.LocalPitchYawRoll = H3DU.Math.GlobalRollYawPitch;
/**
 * Indicates that a vector's rotation occurs as a pitch, then roll, then yaw, where the roll and yaw
 * occur around the rotated object's new axes and not necessarily the original axes.
 * @const
 */
H3DU.Math.LocalPitchRollYaw = H3DU.Math.GlobalYawRollPitch;
/**
 * Indicates that a vector's rotation occurs as a yaw, then pitch, then roll, where the pitch and roll
 * occur around the rotated object's new axes and not necessarily the original axes.
 * @const
 */
H3DU.Math.LocalYawPitchRoll = H3DU.Math.GlobalRollPitchYaw;
/**
 * Indicates that a vector's rotation occurs as a yaw, then roll, then pitch, where the roll and pitch
 * occur around the rotated object's new axes and not necessarily the original axes.
 * @const
 */
H3DU.Math.LocalYawRollPitch = H3DU.Math.GlobalPitchRollYaw;
/**
 * Indicates that a vector's rotation occurs as a roll, then pitch, then yaw, where the pitch and yaw
 * occur around the rotated object's new axes and not necessarily the original axes.
 * @const
 */
H3DU.Math.LocalRollPitchYaw = H3DU.Math.GlobalYawPitchRoll;
/**
 * Indicates that a vector's rotation occurs as a roll, then yaw, then pitch, where the yaw and pitch
 * occur around the rotated object's new axes and not necessarily the original axes.
 * @const
 */
H3DU.Math.LocalRollYawPitch = H3DU.Math.GlobalPitchYawRoll;
/**
 * Indicates that a vector's rotation occurs as a pitch, then yaw, then roll (each rotation around the original axes).
 * @deprecated This constant's name is ambiguous between local and global rotations.
 * Use {@link H3DU.Math.GlobalPitchYawRoll} instead.
 * @const
 */
H3DU.Math.PitchYawRoll = 0;
/**
 * Indicates that a vector's rotation occurs as a pitch, then roll, then yaw (each rotation around the original axes).
 * @deprecated This constant's name is ambiguous between local and global rotations.
 * Use {@link H3DU.Math.GlobalPitchRollYaw} instead.
 * @const
 */
H3DU.Math.PitchRollYaw = 1;
/**
 * Indicates that a vector's rotation occurs as a yaw, then pitch, then roll (each rotation around the original axes).
 * @deprecated This constant's name is ambiguous between local and global rotations.
 * Use {@link H3DU.Math.GlobalYawPitchRoll} instead.
 * @const
 */
H3DU.Math.YawPitchRoll = 2;
/**
 * Indicates that a vector's rotation occurs as a yaw, then roll, then pitch (each rotation around the original axes).
 * @deprecated This constant's name is ambiguous between local and global rotations.
 * Use {@link H3DU.Math.GlobalYawRollPitch} instead.
 * @const
 */
H3DU.Math.YawRollPitch = 3;
/**
 * Indicates that a vector's rotation occurs as a roll, then pitch, then yaw (each rotation around the original axes).
 * @deprecated This constant's name is ambiguous between local and global rotations.
 * Use {@link H3DU.Math.GlobalRollPitchYaw} instead.
 * @const
 */
H3DU.Math.RollPitchYaw = 4;
/**
 * Indicates that a vector's rotation occurs as a roll, then yaw, then pitch (each rotation around the original axes).
 * @deprecated This constant's name is ambiguous between local and global rotations.
 * Use {@link H3DU.Math.GlobalRollYawPitch} instead.
 * @const
 */
H3DU.Math.RollYawPitch = 5;
/**
 * Inverts the rotation given in this quaternion, describing a rotation that undoes the given rotation.
 * Returns a new quaternion; same as the quatInverse method.
 * @deprecated Use {@link H3DU.Math.quatInvert} instead.
 * @param {Array<Number>} quat A quaternion, containing four elements.
 * @returns {Array<Number>} Return value.
 * @method
 * @static
 */
H3DU.Math.quatInverse = H3DU.Math.quatInvert;
/**
 * Deprecated alias for {@link H3DU.Math.vec3normalize}
 * @deprecated Use {@link H3DU.Math.vec3normalize} instead.
 * The name of this method may be confused with a vector's "norm", another name for its length.
 * @function
 * @param {Array<Number>} vec Vector to normalize.
 * @returns {Array<Number>} The normalized vector.
 */
H3DU.Math.vec3norm = H3DU.Math.vec3normalize;
/**
 * Deprecated alias for {@link H3DU.Math.vec4normalize}
 * @deprecated Use {@link H3DU.Math.vec4normalize} instead.
 * The name of this method may be confused with a vector's "norm", another name for its length.
 * @function
 * @param {Array<Number>} vec Vector to normalize.
 * @returns {Array<Number>} The normalized vector.
 */
H3DU.Math.vec4norm = H3DU.Math.vec4normalize;
/**
 * Deprecated alias for {@link H3DU.Math.quatNormalize}
 * @deprecated Use {@link H3DU.Math.quatNormalize} instead.
 * The name of this method may be confused with a vector's "norm", another name for its length.
 * @function
 * @param {Array<Number>} quat Quaternion to normalize.
 * @returns {Array<Number>} The normalized quaternion.
 */
H3DU.Math.quatNorm = H3DU.Math.quatNormalize;
/**
 * Deprecated alias for {@link H3DU.Math.vec3normalizeInPlace}
 * @deprecated Use {@link H3DU.Math.vec3normalizeInPlace} instead.
 * The name of this method may be confused with a vector's "norm", another name for its length.
 * @function
 * @param {Array<Number>} vec Vector to normalize in place.
 * @returns {Array<Number>} The parameter "vec"
 */
H3DU.Math.vec3normInPlace = H3DU.Math.vec3normalizeInPlace;
/**
 * Deprecated alias for {@link H3DU.Math.vec4normalizeInPlace}
 * @deprecated Use {@link H3DU.Math.vec4normalizeInPlace} instead.
 * The name of this method may be confused with a vector's "norm", another name for its length.
 * @function
 * @param {Array<Number>} vec Vector to normalize in place.
 * @returns {Array<Number>} The parameter "vec"
 */
H3DU.Math.vec4normInPlace = H3DU.Math.vec4normalizeInPlace;
/**
 * Deprecated alias for {@link H3DU.Math.quatNormalizeInPlace}
 * @deprecated Use {@link H3DU.Math.quatNormalizeInPlace} instead.
 * The name of this method may be confused with a vector's "norm", another name for its length.
 * @function
 * @param {Array<Number>} quat Quaternion to normalize in place.
 * @returns {Array<Number>} The parameter "quat"
 */
H3DU.Math.quatNormInPlace = H3DU.Math.quatNormalizeInPlace;
/**
 * Deprecated alias for {@link H3DU.Math.planeNormalizeInPlace}
 * @deprecated Use {@link H3DU.Math.planeNormalizeInPlace} instead.
 * The name of this method may be confused with a vector's "norm", another name for its length.
 * @function
 * @param {Array<Number>} plane Plane to normalize in place.
 * @returns {Array<Number>} The parameter "plane"
 */
H3DU.Math.planeNormInPlace = H3DU.Math.planeNormalizeInPlace;
/**
 * Deprecated alias for {@link H3DU.Math.planeNormalize}
 * @deprecated Use {@link H3DU.Math.planeNormalize} instead.
 * The name of this method may be confused with a vector's "norm", another name for its length.
 * @function
 * @param {Array<Number>} plane Plane to normalize.
 * @returns {Array<Number>} The normalized plane.
 */
H3DU.Math.planeNorm = H3DU.Math.planeNormalize;
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU, Uint32Array, console */

/**
 * Holds source code for a WebGL shader program. A shader program in
 * WebGL consists of a vertex shader (which processes vertices),
 * and a fragment shader (which processes pixels). Shader programs
 * are specially designed for running on a graphics processing unit,
 * or GPU.<p>
 * This class also stores semantics and uniform values associated with the shader
 * source code.<p>
 * Note that this class is not associated with any WebGL context, so the
 * uniform values this object stores is not set for any WebGL context.
 * <p>Currently, the following attribute names are associated
 * with this object by default:<ul>
 * <li><code>position</code> - "POSITION" semantic</li>
 * <li><code>normal</code> - "NORMAL" semantic</li>
 * <li><code>uv</code> - "TEXCOORD_0" semantic</li>
 * <li><code>tangent</code> - Attribute for tangents.</li>
 * <li><code>bitangent</code> - Attribute for bitangents</li>
 * <li><code>colorAttr</code> - "COLOR"</li>
 * </ul>
 * <p>Currently, the following uniform names are associated
 * with this object by default:<ul>
 * <li><code>projection</code> - Projection matrix</li>
 * <li><code>modelViewMatrix</code> - Model-view matrix</li>
 * <li><code>normalMatrix</code> - Inverse transpose of the model-view matrix</li>
 * <li><code>world</code> - World matrix.</li>
 * <li><code>inverseView</code> - Inverse view matrix.</li>
 * </ul>
 * @class
 * @memberof H3DU
 * @param {String} [vertexShader] Source text of a vertex shader, in OpenGL
 * ES Shading Language (GLSL). If null, a default
 * vertex shader is used instead.
 * @param {String} [fragmentShader] Source text of a fragment shader in GLSL.
 * If null, a default fragment shader is used instead.
 */
H3DU.ShaderInfo = function(vertexShader, fragmentShader) {
  "use strict";
  if(typeof vertexShader === "undefined" || vertexShader === null) {
    vertexShader = H3DU.ShaderInfo.getDefaultVertex();
  }
  if(typeof fragmentShader === "undefined" || fragmentShader === null) {
    fragmentShader = H3DU.ShaderInfo.getDefaultFragment();
  }
  this.vertexShader = vertexShader;
  this.fragmentShader = fragmentShader;
  this.uniformValues = {};
  this.attributeSemantics = {};
  this.attributeSemantics.position = new Uint32Array([H3DU.Semantic.POSITION, 0]);
  this.attributeSemantics.tangent = new Uint32Array([H3DU.Semantic.TANGENT, 0]);
  this.attributeSemantics.bitangent = new Uint32Array([H3DU.Semantic.BITANGENT, 0]);
  this.attributeSemantics.normal = new Uint32Array([H3DU.Semantic.NORMAL, 0]);
  this.attributeSemantics.uv = new Uint32Array([H3DU.Semantic.TEXCOORD, 0]);
  this.attributeSemantics.colorAttr = new Uint32Array([H3DU.Semantic.COLOR, 0]);
  this.uniformSemantics = {};
  this.uniformSemantics.projection = H3DU.Semantic.PROJECTION;
  this.uniformSemantics.world = H3DU.Semantic.MODEL;
  this.uniformSemantics.inverseView = H3DU.Semantic.VIEWINVERSE;
  this.uniformSemantics.modelViewMatrix = H3DU.Semantic.MODELVIEW;
  this.uniformSemantics.normalMatrix = H3DU.Semantic.MODELVIEWINVERSETRANSPOSE;
};
/**
 * Sets a semantic for the given named uniform.
 * @param {String} u The name of the uniform.
 * @param {Number} sem A uniform semantic given in {@link H3DU.Semantic}.
 * @returns {H3DU.ShaderInfo} This object.
 * @instance
 */
H3DU.ShaderInfo.prototype.setUniformSemantic = function(u, sem) {
  "use strict";
  this.uniformSemantics[u] = sem;
  return this;
};

/**
 * Gets the text of the vertex shader stored in this object.
 * @returns {String} return value.
 * @instance
 */
H3DU.ShaderInfo.prototype.getVertexShader = function() {
  "use strict";
  return this.vertexShader;
};
/**
 * Gets the text of the fragment shader stored in this object.
 * @returns {String} return value.
 * @instance
 */
H3DU.ShaderInfo.prototype.getFragmentShader = function() {
  "use strict";
  return this.fragmentShader;
};

/**
 * Has no effect. A method introduced for compatibility reasons.
 * @deprecated
 * @instance
 */
H3DU.ShaderInfo.prototype.dispose = function() {
  "use strict";
};

/**
 * Sets the semantic for a vertex attribute.
 * @param {String} name Name of the attribute.
 * @param {Number|String} semantic An attribute semantic, such
 * as {@link H3DU.Semantic.POSITION}, "POSITION", or "TEXCOORD_0".
 * @param {Number} semanticIndex The set index of the attribute
 * for the given semantic.
 * 0 is the first index of the attribute, 1 is the second, and so on.
 * This is ignored if "semantic" is a string.
 * @returns {H3DU.ShaderInfo} This object. Throws an error if the given
 * semantic is unsupported.
 * @instance
 */
H3DU.ShaderInfo.prototype.setSemantic = function(name, sem, index) {
  "use strict";
  var an = this.attributeSemantics[name];
  var semIndex = H3DU.MeshBuffer._resolveSemantic(sem, index);
  if(!semIndex) {
    throw new Error("Can't resolve " + [name, sem, index]);
  }
  if(an) {
    an[0] = semIndex[0];
    an[1] = semIndex[1];
  } else {
    this.attributeSemantics[name] = semIndex;
  }
  return this;
};

/**
 * Returns a new shader info object with the information in this object
 * copied to that object.
 * @returns {H3DU.ShaderInfo} Return value.
 * @instance
 */
H3DU.ShaderInfo.prototype.copy = function() {
  "use strict";
  var sp = new H3DU.ShaderInfo(this.vertexShader, this.fragmentShader);
  sp.setUniforms(this.uniformValues);
  for(var k in this.attributeSemantics)
    if(Object.prototype.hasOwnProperty.call(this.attributeSemantics, k)) {
      var v = this.attributeSemantics[k];
      sp.attributeSemantics[k] = v.slice(0, 2);
    }
  for(k in this.uniformSemantics)
    if(Object.prototype.hasOwnProperty.call(this.uniformSemantics, k)) {
      v = this.uniformSemantics[k];
      sp.uniformSemantics[k] = v;
    }
  return sp;
};
/**
 * Sets the values of one or more uniforms used by this shader program.
 * Since this object doesn't store a WebGL context, or receive one as input,
 * the uniforms won't be associated with a WebGL context.
 * @param {Object} uniforms An object whose keys are the names of uniforms
 * defined in either the
 * vertex or fragment shader of this shader program. If the uniform
 * is an array, each element in the array is named as in these examples:
 * "unif[0]", "unif[1]". If it's a struct, each member in the struct is named as in these examples:
 * "unif.member1", "unif.member2". If it's an array of struct, each
 * member is named as in these examples: "unif[0].member1",
 * "unif[0].member2". The value of each key depends on the data type
 * expected for the uniform named by that key. The value can be a 3-, 4-,
 * 9-, or 16-element array if the uniform is a "vec3", "vec4", "mat3", or "mat4",
 * respectively, or a Number if the uniform is a "float" or "int".
 * @returns {H3DU.ShaderInfo} This object.
 * @instance
 */
H3DU.ShaderInfo.prototype.setUniforms = function(uniforms) {
  "use strict";
  H3DU.ShaderInfo._setUniformsInternal(uniforms, this.uniformValues, null);
  return this;
};
/** @ignore */
H3DU.ShaderInfo._setUniformInternal = function(uniforms, uniformValues, i, changedUniforms) {
  "use strict";
  var v = uniforms[i];
  var uv = uniformValues[i];
  if(typeof v === "number") {
    var newUv = false;
    if(typeof uv === "undefined" || uv === null) {
      uniformValues[i] = uv = v;
      newUv = true;
    } else if(uv !== v) {
      uv = v;
      uniformValues[i] = v;
      newUv = true;
    }
    if(newUv) {
      if(changedUniforms)changedUniforms[i] = uv;
    }
  } else if(v instanceof H3DU.TextureInfo) {
    if(typeof uv === "undefined" || uv === null || !(uv instanceof H3DU.TextureInfo)) {
      uniformValues[i] = uv = new H3DU.TextureInfo().copyFrom(v);
    } else {
      uv.copyFrom(v);
    }
  } else if(v.length === 3) {
    if(!uv) {
      uniformValues[i] = uv = v.slice(0, v.length);
      if(changedUniforms)changedUniforms[i] = v.slice(0, v.length);
    } else if(uv[0] !== v[0] || uv[1] !== v[1] || uv[2] !== v[2]) {
      uv[0] = v[0]; uv[1] = v[1]; uv[2] = v[2];
      if(changedUniforms)changedUniforms[i] = uv.slice(0, uv.length);
    }
  } else if(v.length === 2) {
    if(!uv) {
      uniformValues[i] = uv = v.slice(0, v.length);
      if(changedUniforms)changedUniforms[i] = v.slice(0, v.length);
    } else if(uv[0] !== v[0] || uv[1] !== v[1]) {
      uv[0] = v[0]; uv[1] = v[1];
      if(changedUniforms)changedUniforms[i] = uv.slice(0, uv.length);
    }
  } else if(v.length === 4) {
    if(!uv) {
      uniformValues[i] = uv = v.slice(0, v.length);
      if(changedUniforms)changedUniforms[i] = v.slice(0, v.length);
    } else if(uv[0] !== v[0] || uv[1] !== v[1] || uv[2] !== v[2] || uv[3] !== v[3]) {
      uv[0] = v[0]; uv[1] = v[1]; uv[2] = v[2]; uv[3] = v[3];
      if(changedUniforms)changedUniforms[i] = uv.slice(0, uv.length);
    }
  } else if(v.length === 16) {
    if(!uv) {
      uniformValues[i] = uv = v.slice(0, v.length);
      if(changedUniforms)changedUniforms[i] = v.slice(0, v.length);
    } else if(H3DU.ShaderInfo._copyIfDifferent(v, uv, 16)) {
      if(changedUniforms)changedUniforms[i] = uv.slice(0, uv.length);
    }
  } else if(v.length === 9) {
    if(!uv) {
      uniformValues[i] = uv = v.slice(0, v.length);
      if(changedUniforms)changedUniforms[i] = v.slice(0, v.length);
    } else if(H3DU.ShaderInfo._copyIfDifferent(v, uv, 9)) {
      if(changedUniforms)changedUniforms[i] = uv.slice(0, uv.length);
    }
  }
};

/** @ignore */
H3DU.ShaderInfo._copyIfDifferent = function(src, dst, len) {
  "use strict";
  for(var i = 0; i < len; i++) {
    if(src[i] !== dst[i]) {
   // Arrays are different
      dst[i] = src[i];
      for(var j = i + 1; j < len; j++) {
        dst[j] = src[j];
      }
      return true;
    }
  }
  return false;
};

/** @ignore */
H3DU.ShaderInfo._setUniformsInternal = function(uniforms, outputUniforms, changedUniforms) {
  "use strict";
  var i;
  var keys = Object.keys(uniforms);
  for(var ki = 0; ki < keys.length; ki++) {
    i = keys[ki];
    H3DU.ShaderInfo._setUniformInternal(uniforms, outputUniforms, i, changedUniforms);
  }
};
/** @ignore */
H3DU.ShaderInfo.fragmentShaderHeader = function() {
  "use strict";
  return "" +
"#ifdef GL_ES\n" +
"#ifndef GL_FRAGMENT_PRECISION_HIGH\n" +
"precision mediump float;\n" +
"#else\n" +
"precision highp float;\n" +
"#endif\n" +
"#endif\n";
};

/**
 * Generates source code for a fragment shader for applying
 * a raster effect to a texture.
 * @param {String} functionCode See {@link H3DU.ShaderInfo.makeEffect}.
 * @returns {String} The source text of the resulting fragment shader.
 */
H3DU.ShaderInfo.makeEffectFragment = function(functionCode) {
  "use strict";
  var shader = H3DU.ShaderInfo.fragmentShaderHeader();
  shader += "" +
"uniform sampler2D sampler;\n" + // texture sampler
"uniform vec2 textureSize;\n" + // texture size
"varying vec2 uvVar;\n" +
"varying vec3 colorAttrVar;\n";
  shader += functionCode;
  shader += "\n\nvoid main() {\n" +
" // normalize coordinates to 0..1\n" +
" vec2 uv=gl_FragCoord.xy/textureSize.xy;\n" +
" gl_FragColor=textureEffect(sampler,uv,textureSize);\n" +
"}";
  return shader;
};
/**
 * Generates source code for a shader program that copies the colors of a texture.
 * @returns {H3DU.ShaderInfo} The resulting shader program.
 */
H3DU.ShaderInfo.makeCopyEffect = function() {
  "use strict";
  var shader = H3DU.ShaderInfo.fragmentShaderHeader();
  shader += "" +
"uniform sampler2D sampler;\n" + // texture sampler
"varying vec2 uvVar;\n" +
"varying vec3 colorAttrVar;\n";
  shader += "\n\nvoid main() {\n" +
" gl_FragColor=texture2D(sampler,uvVar);\n" +
"}";
  return new H3DU.ShaderInfo(
   H3DU.ShaderInfo.getBasicVertex(), shader);
};

/**
 * Generates source code for a shader program for applying
 * a raster effect (postprocessing effect) to a texture.
 * @param {String} functionCode A string giving shader code
 * in OpenGL ES Shading Language (GLSL) that must contain
 * a function with the following signature:
 * <pre>
 * vec4 textureEffect(sampler2D sampler, vec2 uvCoord, vec2 textureSize)
 * </pre>
 * where <code>sampler</code> is the texture sampler, <code>uvCoord</code>
 * is the texture coordinates ranging from 0 to 1 in each component,
 * <code>textureSize</code> is the dimensions of the texture in pixels,
 * and the return value is the new color at the given texture coordinates. Besides
 * this requirement, the shader code is also free to define additional uniforms,
 * constants, functions, and so on (but not another "main" function).
 * @returns {H3DU.ShaderInfo} The resulting shader program.
 */
H3DU.ShaderInfo.makeEffect = function(functionCode) {
  "use strict";
  return new H3DU.ShaderInfo(
   H3DU.ShaderInfo.getBasicVertex(),
   H3DU.ShaderInfo.makeEffectFragment(functionCode));
};
/**
 * Generates source code for a shader program that inverts the colors of a texture.
 * @returns {H3DU.ShaderInfo} The resulting shader program.
 */
H3DU.ShaderInfo.makeInvertEffect = function() {
  "use strict";
  return H3DU.ShaderInfo.makeEffect(
[
  "vec4 textureEffect(sampler2D sampler, vec2 uvCoord, vec2 textureSize) {",
  " vec4 color=texture2D(sampler,uvCoord);",
  " vec4 ret; ret.xyz=vec3(1.0,1.0,1.0)-color.xyz; ret.w=color.w; return ret;",
  "}"].join("\n"));
};
/**
 * Generates source code for a shader program that generates a two-color texture showing
 * the source texture's edges.
 * @returns {H3DU.ShaderInfo} The resulting shader program.
 */
H3DU.ShaderInfo.makeEdgeDetectEffect = function() {
  "use strict";
// Adapted by Peter O. from David C. Bishop's EdgeDetect.frag,
// in the public domain

  return H3DU.ShaderInfo.makeEffect(
["float luma(vec3 color) {",
  " return 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;",
  "}",
  "const vec4 edge_color=vec4(0.,0,0,1);",
  "const vec4 back_color=vec4(1.,1,1,1);",
  "vec4 textureEffect(sampler2D sampler, vec2 uvCoord, vec2 textureSize) {",
  "float dx = 1.0 / float(textureSize.x);",
  "float dy = 1.0 / float(textureSize.y);",
  "float s00 = luma(texture2D(sampler, uvCoord + vec2(-dx,dy)).rgb);",
  "float s10 = luma(texture2D(sampler, uvCoord + vec2(-dx,0.0)).rgb);",
  "float s20 = luma(texture2D(sampler, uvCoord + vec2(-dx,-dy)).rgb);",
  "float s01 = luma(texture2D(sampler, uvCoord + vec2(0.0,dy)).rgb);",
  "float s21 = luma(texture2D(sampler, uvCoord + vec2(0.0,-dy)).rgb);",
  "float s02 = luma(texture2D(sampler, uvCoord + vec2(dx, dy)).rgb);",
  "float s12 = luma(texture2D(sampler, uvCoord + vec2(dx, 0.0)).rgb);",
  "float s22 = luma(texture2D(sampler, uvCoord + vec2(dx, -dy)).rgb);",
  "float sx = s00 + 2.0 * s10 + s20 - (s02 + 2.0 * s12 + s22);",
  "float sy = s00 + 2.0 * s01 + s02 - (s20 + 2.0 * s21 + s22);",
  "float dist = sx * sx + sy * sy;",
  "if(dist > 0.4) {",
  "return edge_color;",
  "} else {",
  "return back_color;",
  "}}"
].join("\n"));
};

/**
 * Gets the text of a basic vertex shader.
 * @returns {String} The resulting shader text.
 */
H3DU.ShaderInfo.getBasicVertex = function() {
  "use strict";
  var shader = [
    "attribute vec3 position;\n",
    "attribute vec2 uv;\n",
    "varying vec2 uvVar;\n",
    "#ifdef COLORATTR\n",
    "attribute vec3 colorAttr;\n",
    "varying vec3 colorAttrVar;\n",
    "#endif\n",
    "void main() {\n",
    "vec4 positionVec4;\n",
    "positionVec4.w=1.0;\n",
    "positionVec4.xyz=position;\n",
    "gl_PointSize=1.0;\n",
    "uvVar=uv;\n",
    "#ifdef COLORATTR\n",
    "colorAttrVar=colorAttr;\n",
    "#endif\n",
    "gl_Position=positionVec4;\n",
    "}\n"].join("\n");
  return shader;
};
/**
 * Gets the text of the default vertex shader.  Putting "#define SHADING\n"
 * at the start of the return value enables the lighting model.
 * @returns {String} The resulting shader text.
 */
H3DU.ShaderInfo.getDefaultVertex = function() {
  "use strict";
  var shader = [
    "attribute vec3 position;",
    "attribute vec3 normal;",
    "attribute vec2 uv;",
    "#ifdef COLORATTR",
    "attribute vec3 colorAttr;",
    "varying vec3 colorAttrVar;",
    "#endif",
    "attribute vec3 tangent;",
    "attribute vec3 bitangent;",
    "uniform mat4 projection;",
    "uniform mat4 modelViewMatrix;",
    "#ifdef SHADING",
    "uniform mat3 normalMatrix; /* internal */",
    "uniform mat4 world;",
    "#ifdef NORMAL_MAP",
    "varying mat3 tbnMatrixVar;",
    "#endif",
    "varying vec4 viewPositionVar;",
    "varying vec3 transformedNormalVar;",
    "#endif",
    "varying vec2 uvVar;",
    "void main() {",
    "vec4 positionVec4;",
    "positionVec4.w=1.0;",
    "positionVec4.xyz=position;",
    "gl_PointSize=1.0;",
    "gl_Position=(projection*modelViewMatrix)*positionVec4;",
    "#ifdef COLORATTR\n" +
    "colorAttrVar=colorAttr;\n" +
    "#endif\n" +
    "uvVar=uv;",
    "#ifdef SHADING",
    "transformedNormalVar=normalize(normalMatrix*normal);",
    "#ifdef NORMAL_MAP",
    "tbnMatrixVar=mat3(normalize(vec3(world*vec4(tangent,0.0))),",
    "   normalize(bitangent),transformedNormalVar);",
    "#endif",
    "viewPositionVar=modelViewMatrix*positionVec4;",
    "#endif",
    "}"].join("\n");
  return shader;
};

/**
 * Gets the text of the default fragment shader.
 * @returns {String} The resulting shader text.
 */
H3DU.ShaderInfo.getDefaultFragment = function() {
  "use strict";
  var i;
  var shader = H3DU.ShaderInfo.fragmentShaderHeader() + [
    "#define ONE_DIV_PI 0.318309886",
    "#define ONE_DIV_TWOPI 0.159154943",
    "#define PI 3.141592654",
    "#define TWOPI 6.283185307",
    // Clamp to range [0, 1]
    "#define saturate(f) clamp(f, 0.0, 1.0)",
    // Convert from sRGB to linear RGB
    "vec3 tolinear(vec3 c) {",
    " c=saturate(c);",
    " bvec3 lt=lessThanEqual(c,vec3(0.03928));",
    " return mix(pow((0.0556+c)*0.947328534,vec3(2.4)),0.077399381*c,vec3(lt));",
    "}",
    // Convert from linear RGB to sRGB
    "vec3 fromlinear(vec3 c) {",
    " c=saturate(c);",
    " bvec3 lt=lessThanEqual(c,vec3(0.00304));",
    " return mix(pow(c,vec3(0.41666666667))*1.0556-0.0556,12.92*c,vec3(lt));",
    "}",
 // if shading is disabled, this is solid color instead of material diffuse
    "uniform vec4 md;",
    "#ifdef SHADING",
    "struct light {",
// NOTE: These struct members must be aligned to
// vec4 size; otherwise, Chrome may have issues retaining
// the value of lights[i].specular, causing flickering.
// ---
// Source light direction/position, in camera/eye space
    " vec4 position;",
// Source light diffuse color
    " vec4 diffuse;",
// Source light specular color
    "#ifdef SPECULAR", " vec4 specular;", "#endif",
// Light radius
    " vec4 radius;",
    "};",
    "uniform vec3 sceneAmbient;",
    "uniform light lights[" + H3DU.Lights.MAX_LIGHTS + "];",
    "uniform vec3 ma;",
    "uniform vec3 me;",
    "#ifdef METALNESS", "uniform float metalness;", "#endif",
    "#ifdef METALNESS_MAP", "uniform sampler2D metalnessMap;", "#endif",
    "#ifdef ROUGHNESS", "uniform float roughness;", "#endif",
    "#ifdef ROUGHNESS_MAP", "uniform sampler2D roughnessMap;", "#endif",
    "#ifdef SPECULAR_MAP", "uniform sampler2D specularMap;", "#endif",
    "#ifdef ENV_MAP", "uniform samplerCube envMap;", "#endif",
    "#ifdef ENV_EQUIRECT", "uniform sampler2D envMap;", "#endif",
    "#ifdef EMISSION_MAP", "uniform sampler2D emissionMap;", "#endif",
    "uniform mat4 inverseView;",
    "#ifdef NORMAL_MAP", "uniform sampler2D normalMap;", "#endif",
    "#ifdef NORMAL_MAP", "varying mat3 tbnMatrixVar;", "#endif",
    "#ifdef SPECULAR",
    "uniform vec3 ms;",
    "uniform float mshin;",
    "#endif",
    "#endif",
    "#ifdef TEXTURE", "uniform sampler2D sampler;", "#endif",
    "#ifdef COLORATTR", "varying vec3 colorAttrVar;", "#endif",
    "varying vec2 uvVar;",
    "#ifdef SHADING",
    "varying vec4 viewPositionVar;",
    "varying vec3 transformedNormalVar;",
    "vec4 calcLightPower(light lt, vec4 vertexPosition) {",
    " vec3 sdir;",
    " float attenuation;",
    " if(lt.position.w == 0.0) { /* directional light */",
    "  sdir=normalize((lt.position).xyz);",
    "  attenuation=1.0;",
    " } else { /* point light */",
    "  vec3 vertexToLight=(lt.position-vertexPosition).xyz;",
    "  float dsSquared=dot(vertexToLight,vertexToLight);",
    "  sdir=inversesqrt(dsSquared)*vertexToLight;",
    "  if(lt.radius.x == 0.0) {",
    "    attenuation=1.0;", // Unlimited extent
    "  } else {",
// See page 32-33 of
// <http://www.frostbite.com/wp-content/uploads/2014/11/course_notes_moving_frostbite_to_pbr_v2.pdf>
    "   float radiusPow4=lt.radius.x;", // Radius is light's radius to power of 4
    "   float distPow4=dsSquared*dsSquared;",
    "   float attenDivisor=max(0.0001,dsSquared);",
    "   float cut=saturate(1.0-distPow4/radiusPow4);",
    "   attenuation=(cut*cut)/attenDivisor;",
    "  }",
    " }",
    " return vec4(sdir,attenuation);",
    "}",
    "#endif",
// ////////////
    "#ifdef PHYSICAL_BASED",
     // John Hable's tonemapping function, mentioned at
     // at http://filmicgames.com/archives/75
    "#define HABLE_TONEMAP_WHITE 1.37906425",
    "vec3 tonemapHable(vec3 c) {",
    "  vec3 c2=c*2.0;",
    "  return HABLE_TONEMAP_WHITE*",
    "    (((c2*(0.15*c2+0.05)+0.004)/",
    "     (c2*(0.15*c2+0.5)+0.06))-0.066666);",
    "}",
    // Reflectance function
    "float ndf(float dotnh, float alpha) {",
    " float alphasq=alpha*alpha;",
    " float d=dotnh*dotnh*(alphasq-1.0)+1.0;",
    " return alphasq*ONE_DIV_PI/(d*d);",
    "}",
    "float gsmith(float dotnv, float dotnl, float alpha) {",
    " float a1=(alpha+1.0);",
    " float k=a1*a1*0.125;",
    " float invk=(1.0-k);",
    " return dotnl/(dotnl*invk+k)*dotnv/(dotnv*invk+k);",
    "}",
    "float gsmithindirect(float dotnv, float dotnl, float alpha) {",
    " float k=alpha*alpha*0.5;",
    " float invk=(1.0-k);",
    " return dotnl/(dotnl*invk+k)*dotnv/(dotnv*invk+k);",
    "}",
    "vec3 fresnelschlick(float dothl, vec3 f0) {",
    " float id=1.0-dothl;",
    " float idsq=id*id;",
    " return f0+(vec3(1.0)-f0)*idsq*idsq*id;",
    "}",
    // NOTE: Color and specular parameters are in linear RGB
    "vec3 reflectancespec(vec3 diffuse, vec3 specular, vec3 lightDir, vec3 viewDir, vec3 n, float rough) {",
    " vec3 h=normalize(viewDir+lightDir);",
    " float dotnv=abs(dot(n,viewDir))+0.0001;",
    " float dotnh=saturate(dot(n,h));",
    " float dotnl=saturate(dot(n,lightDir));",
    " float dothl=saturate(dot(h,lightDir));",
    " vec3 ctnum=ndf(dotnh,rough)*gsmith(dotnv,dotnl,rough)*fresnelschlick(dothl,specular);",
    " float ctden=min(dotnl*dotnv,0.0001);",
    " return diffuse*ONE_DIV_PI+ctnum*0.25/ctden;",
    "}",
    "#ifndef SPECULAR",
   // NOTE: Color parameter is in linear RGB
    "vec3 reflectance(vec3 color, vec3 lightDir, vec3 viewDir, vec3 n, float rough, float metal) {",
    " vec3 h=normalize(viewDir+lightDir);",
    " float dothl=saturate(dot(h,lightDir));",
    // 0.04 is a good approximation of F0 reflectivity for most nonmetals (with the exception of gemstones,
    // which can go at least as high as 0.17 for diamond). On the other hand, most metals reflect
    // all the light that passes through them, so their F0 is approximated with the base color (assuming the
    // metallic workflow is used)
    " vec3 refl=mix(vec3(0.04),color,metal);",
    " vec3 fr=fresnelschlick(dothl,refl);",
    " vec3 refr=mix((vec3(1.0)-fr)*color,vec3(0.0),metal);",
    " return reflectancespec(refr, refl, lightDir, viewDir, n, rough);",
    "}",
    "#endif",
    "#endif",
// ////////////
    "void main() {",
    " vec3 normal;",
    "#ifdef TEXTURE",
    "   vec4 baseColor=texture2D(sampler,uvVar);",
    "#else",
    "#ifdef COLORATTR",
    "   vec4 baseColor;",
    "   baseColor.w=1.0;",
    "   baseColor.xyz=colorAttrVar;",
    "#else",
    "   vec4 baseColor=md;",
    "#endif",
    "#endif",
    "#ifdef SHADING",
    "#ifdef NORMAL_MAP",
    "normal = normalize(tbnMatrixVar*(2.0*texture2D(normalMap,uvVar).rgb - vec3(1.0)));",
    "#else",
    "normal = normalize(transformedNormalVar);",
    "#endif",
    "vec4 lightPowerVec;",
    "float lightCosine, specular;",
    "vec3 materialAmbient=tolinear(ma);", // ambient
    "vec3 materialDiffuse=tolinear(baseColor.rgb);",
    "vec3 materialEmission;",
    "#ifdef EMISSION_MAP", "materialEmission=texture2D(emissionMap,uvVar).rgb;", "#else",
    " materialEmission=me.rgb;", "#endif",
    " materialEmission=tolinear(materialEmission);",
    "float materialAlpha=baseColor.a;",
    "vec4 tview=inverseView*vec4(0.0,0.0,0.0,1.0)-viewPositionVar;",
    "vec3 viewDirection=normalize(tview.xyz/tview.w);",
    "vec3 environment=vec3(1.0);",
/* LATER: Support environment maps
    "#ifdef ENV_MAP",
    "vec3 eyepos=vec3(inverseView*vec4(viewPositionVar.xyz,1.0));",
    "vec3 refl=reflect(-eyepos,normal);",
    "environment=vec3(textureCube(envMap,vec3(-refl.x,refl.y,refl.z)));",
    "environment=tolinear(environment);",
    "#else", "#ifdef ENV_EQUIRECT",
    "vec3 eyepos=vec3(inverseView*vec4(viewPositionVar.xyz,1.0));",
    "vec3 refl=reflect(-eyepos,normal);",
    "refl.x=-refl.x;",
    "environment=vec3(texture2D(envMap,vec2(",
    "  (atan(refl.x,refl.z)+PI)*ONE_DIV_TWOPI, acos(clamp(-refl.y,-1.0,1.0))*ONE_DIV_PI )));",
    "environment=tolinear(environment);",
    "#endif", "#endif",
*/
    "#ifdef PHYSICAL_BASED",
    "vec3 lightedColor=vec3(0.05)*materialDiffuse;", // ambient
    "#else",
    "vec3 lightedColor=sceneAmbient*materialAmbient;", // ambient
    "#endif",
    "#if defined(SPECULAR) || defined(SPECULAR_MAP)", "vec3 materialSpecular=vec3(0.0);", "#endif",
    "vec3 spectmp, lightFactor;",
    "float rough = 0.0;",
    "float metal = 0.0;",
    // Specular reflection
    "#ifdef SPECULAR", "materialSpecular=tolinear(ms);", "#endif",
    // NOTE: Default shader no longer multiplies specular by the specular texture
    "#ifdef SPECULAR_MAP", "materialSpecular=tolinear(texture2D(specularMap,uvVar).rgb);", "#endif",
    "#ifdef PHYSICAL_BASED",
    "#ifdef ROUGHNESS", "rough=roughness;", "#endif",
// Convert Blinn-Phong shininess to roughness
// See http://simonstechblog.blogspot.ca/2011/12/microfacet-brdf.html
    "#ifndef ROUGHNESS", "#ifdef SPECULAR", "rough=clamp(sqrt(2.0/(2.0+mshin)),0.0,1.0);", "#endif", "#endif",
    "#ifdef ROUGHNESS_MAP", "rough=texture2D(roughnessMap,uvVar).r;", "#endif",
    "#ifdef INVERT_ROUGHNESS", "rough=1.0-rough;", "#endif",
    "#ifdef METALNESS", "metal=metalness;", "#endif",
    "#ifdef METALNESS_MAP", "metal=texture2D(metalnessMap,uvVar).r;", "#endif",
    "#endif", // PHYSICAL_BASED
    ""].join("\n") + "\n";
  for(i = 0; i < H3DU.Lights.MAX_LIGHTS; i++) {
    shader += [
      "lightPowerVec=calcLightPower(lights[" + i + "],viewPositionVar);",
      "lightCosine=saturate(dot(normal,lightPowerVec.xyz));",
// not exactly greater than 0 in order to avoid speckling or
// flickering specular highlights if the surface normal is perpendicular to
// the light's direction vector
      "spectmp = vec3(greaterThan(vec3(lightCosine),vec3(0.0001)));",
      "#ifdef PHYSICAL_BASED",
      "    lightFactor=spectmp*lightCosine*lightPowerVec.w*tolinear(lights[" + i + "].diffuse.xyz);",
      "#ifdef SPECULAR",
      "    lightedColor+=reflectancespec(materialDiffuse,materialSpecular,normalize(lightPowerVec.xyz),",
      "         normalize(viewDirection),normal,rough)*lightFactor;",
      "#else",
      "    lightedColor+=reflectance(materialDiffuse,normalize(lightPowerVec.xyz),",
      "         normalize(viewDirection),normal,rough,metal)*lightFactor;",
      "#endif",
      "#else",
     // Lambert diffusion term
      "    lightedColor+=spectmp*materialDiffuse*lightCosine*lightPowerVec.w*tolinear(lights[" + i + "].diffuse.xyz);",
      "#ifdef SPECULAR",
      "    specular=saturate(dot(normalize(viewDirection+lightPowerVec.xyz),normal));",
      "    specular=pow(specular,mshin);",
     // Blinn-Phong specular term
      "    lightedColor+=spectmp*materialSpecular*specular*lightPowerVec.w*tolinear(lights[" + i + "].specular.xyz);",
      "#endif",
      "#endif",
      ""].join("\n") + "\n";
  }
  shader += [
    " lightedColor+=materialEmission.rgb;",
    // "#ifdef PHYSICAL_BASED"," lightedColor=tonemapHable(lightedColor);","#endif",
    " lightedColor=fromlinear(lightedColor);",
    " baseColor=vec4(lightedColor,materialAlpha);",
    "#endif",
    " gl_FragColor=baseColor;",
    "}"
  ].join("\n") + "\n";
  return shader;
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU */
// NOTE: RenderPass3D is independent of
// any WebGL context or the WebGL API.
/**
 * Describes a batch (a scene graph of 3D objects) and options for
 * rendering that batch.
 * @class H3DU.RenderPass3D
 * @param {H3DU.Batch3D} batch The batch to render using
 * the options described by this object.
 * @param {Object} [parameters] An object whose keys have
 * the possibilities given in {@link H3DU.RenderParams#setParams}, and whose values are those
 * allowed for each key.
 */
H3DU.RenderPass3D = function(batch, parameters) {
  "use strict";
 /** The batch to render.
  * @type {H3DU.Batch3D}
  */
  this.batch = batch;
 /** Whether to clear the color buffer before rendering the batch.
  * @default
  */
  this.clearColor = true;
 /** Whether to clear the depth buffer before rendering the batch.
  * @default
  */
  this.clearDepth = true;
 /** Whether to clear the stencil buffer before rendering the batch.
  * @default
  */
  this.clearStencil = true;
 /** Framebuffer to render to.
  * @type {H3DU.FrameBufferInfo}
  * @default
  */
  this.frameBuffer = null;
 /** Shader to use.
  * @type {H3DU.ShaderInfo}
  * @default
  */
  this.shader = null;
 /** Use the dimensions of the given framebuffer rather than those
  * of the scene rendering it.
  * @type {H3DU.ShaderInfo}
  * @default
  */
  this.useFrameBufferSize = false;
  this.setParams(parameters);
};
/**
 * Sets parameters for this render pass object.
 * @param {Object} parameters An object whose keys have
 * the possibilities given below, and whose values are those
 * allowed for each key.<ul>
 * <li><code>subScene</code> - The batch to render. An {@link H3DU.Batch3D} object.
 * <li><code>clearColor</code> - Whether to clear the color buffer before rendering the batch. Either true or false.
 * <li><code>clearDepth</code> - Whether to clear the depth buffer before rendering the batch. Either true or false.
 * <li><code>clearStencil</code> - Whether to clear the stencil buffer before rendering the batch. Either true or false.
 * <li><code>frameBuffer</code> - Framebuffer to render to. An {@link H3DU.FrameBufferInfo} object.
 * <li><code>shader</code> - Shader to use. An {@link H3DU.ShaderInfo} object.
 * <li><code>useFrameBufferSize</code> - Use the dimensions of the given framebuffer rather than those
 * of the scene rendering it.
 * </ul>
 * Any or all of these keys can exist in the parameters object. If a value is undefined, it is ignored.
 * @returns {H3DU.RenderPass3D} This object.
 * @instance
 */
H3DU.RenderPass3D.prototype.setParams = function(parameters) {
  "use strict";
  if(!parameters)return;
  if(typeof parameters.clearColor !== "undefined") {
    this.clearColor = parameters.clearColor;
  }
  if(typeof parameters.clearDepth !== "undefined") {
    this.clearDepth = parameters.clearDepth;
  }
  if(typeof parameters.shader !== "undefined") {
    this.shader = parameters.shader;
  }
  if(typeof parameters.clearStencil !== "undefined") {
    this.clearStencil = parameters.clearStencil;
  }
  if(typeof parameters.useFrameBufferSize !== "undefined") {
    this.useFrameBufferSize = parameters.useFrameBufferSize;
  }
  if(typeof parameters.frameBuffer !== "undefined") {
    if(parameters.frameBuffer instanceof H3DU.FrameBuffer) {
      throw new Error("FrameBuffer not supported");
    }
    this.frameBuffer = parameters.frameBuffer;
  }
  return this;
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU */

/**
 * Represents a grouping of shapes. This object
 * can hold both {@link H3DU.Shape} objects and
 * other {@link H3DU.ShapeGroup} objects.
 * @class
 * @memberof H3DU
 */
H3DU.ShapeGroup = function() {
  "use strict";
 /** List of shapes contained in this group.
  * This property should only be used to access properties
  * and call methods on each shape, and not to add, remove
  * or replace shapes directly.
  * @deprecated Use the {@link H3DU.ShapeGroup#shapeCount},
  * {@link H3DU.ShapeGroup#getShape}, and
  * {@link H3DU.ShapeGroup#setShape} methods instead.
  * @readonly
  */
  this.shapes = [];
  this.parent = null;
  this.visible = true;
  this.transform = new H3DU.Transform();
};
/**
 * Returns the number of shapes and/or shape groups that
 * are direct children of this shape group.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.ShapeGroup.prototype.shapeCount = function() {
  "use strict";
  return this.shapes.length;
};
/**
 * Gets the shape or shape group located
 * in this shape group at the given index.
 * @param {Number} index Integer index, starting from 0, of the shape or shape group to set.
 * @returns {H3DU.Shape|H3DU.ShapeGroup} The shape or shape group located
 * in this shape group at the given index, or null if none is found there.
 * @instance
 */
H3DU.ShapeGroup.prototype.getShape = function(index) {
  "use strict";
  return typeof this.shapes[index] === "undefined" ? null : this.shapes[index];
};
/**
 * Sets a shape or shape group at the given index in this shape group.
 * @param {Number} index Integer index, starting from 0, to set the shape or shape group at.
 * @param {H3DU.Shape|H3DU.ShapeGroup} shape Shape object to set at the given index.
 * @returns {H3DU.ShapeGroup} This object.
 * @instance
 */
H3DU.ShapeGroup.prototype.setShape = function(index, shape) {
  "use strict";
  this.shapes[index] = shape;
  return this;
};

/**
 * Makes a copy of this shape group and the objects contained
 * in it. The copied object will
 * will have its own version of the transform and
 * visibility flag, and any objects contained in this one
 * will be copied using their <code>copy()</code> method.
 * The copied shape group won't have a parent.
 * @returns {H3DU.ShapeGroup} A copy of this shape group.
 * @instance
 */
H3DU.ShapeGroup.prototype.copy = function() {
  "use strict";
  var ret = new H3DU.ShapeGroup();
  ret.visible = this.visible;
  ret.transform = this.transform.copy();
  for(var i = 0; i < this.shapes.length; i++) {
    ret.addShape(this.shapes[i].copy());
  }
  return ret;
};

/**
 * Adds a 3D shape to this shape group, at the end of the list
 * of shapes. Its reference, not a copy,
 * will be stored in the list of shapes.
 * @param {H3DU.Shape|H3DU.ShapeGroup} shape A 3D shape.
 * Throws an error if null.
 * @returns {H3DU.ShapeGroup} This object.
 * @instance
 */
H3DU.ShapeGroup.prototype.addShape = function(shape) {
  "use strict";
  if(!shape)throw new Error();
  shape.parent = this;
  this.shapes.push(shape);
  return this;
};
/**
 * Sets whether this shape group will be drawn on rendering.
 * @param {Boolean} value True if this shape group will be visible; otherwise, false.
 * @returns {H3DU.ShapeGroup} This object.
 * @instance
 */
H3DU.ShapeGroup.prototype.setVisible = function(value) {
  "use strict";
  this.visible = !!value;
  return this;
};
/**
 * Gets whether this shape group will be drawn on rendering.
 * @returns {Boolean} value True if this shape group will be visible; otherwise, false.
 * @instance
 */
H3DU.ShapeGroup.prototype.getVisible = function() {
  "use strict";
  return this.visible;
};
/**
 * Gets a reference to the transform used by this shape group object.
 * @returns {H3DU.Transform} Return value.
 * @instance
 */
H3DU.ShapeGroup.prototype.getTransform = function() {
  "use strict";
  return this.transform;
};
/**
 * Gets a copy of the transformation needed to transform
 * this shape group's coordinates to world coordinates.
 * @returns {H3DU.Transform} A 4x4 matrix.
 * @instance
 */
H3DU.ShapeGroup.prototype.getMatrix = function() {
  "use strict";
  var xform = this.getTransform();
  var thisIdentity = xform.isIdentity();
  var mat;
  if(typeof this.parent !== "undefined" && this.parent !== null) {
    var pmat = this.parent.getMatrix();
    if(thisIdentity) {
      mat = H3DU.Math.mat4multiply(pmat, xform.getMatrix());
    } else if(H3DU.Math.mat4isIdentity(pmat)) {
      mat = xform.getMatrix();
    } else {
      mat = pmat;
    }
  } else {
    mat = xform.getMatrix();
  }
  return mat;
};
/**
 * Sets the transform used by this shape group to a copy
 * of the given transform. Child
 * shapes can set their own transforms, in which case the
 * rendering process will multiply this shape group's transform
 * with the child shape's transform as it renders the child shape.
 * @param {H3DU.Transform} transform The transform to
 * copy for the use of this shape group.
 * @instance
 * @returns {Object} Return value.
 */
H3DU.ShapeGroup.prototype.setTransform = function(transform) {
  "use strict";
  this.transform = transform.copy();
  return this;
};
/**
 * Sets the material used by all shapes in this shape group.
 * @param {H3DU.Material} material The material to use.
 * @instance
 * @returns {Object} Return value.
 */
H3DU.ShapeGroup.prototype.setMaterial = function(material) {
  "use strict";
  for(var i = 0; i < this.shapes.length; i++) {
    this.shapes[i].setMaterial(material);
  }
  return this;
};

/**
 * Sets the texture used by all shapes in this shape group.
 * @param {H3DU.Texture|String} material {@link H3DU.Texture} object, or a string with the
 * URL of the texture data. In the case of a string the texture will be loaded via
 * the JavaScript DOM's Image class. However, this method
 * will not load that image if it hasn't been loaded yet. This parameter can also
 * be a {@link H3DU.FrameBuffer} object that refers to a frame buffer; this can be useful
 * if that frame buffer refers to a shader-generated texture (see the <code>procedtexture</code>
 * demo in the HTML 3D Library to see how this is done).
 * NOTE: The default shader program assumes that the texture is in
 * the [sRGB color space]{@link H3DU.Math.colorTosRGB}.
 * @instance
 * @returns {Object} Return value.
 */
H3DU.ShapeGroup.prototype.setTexture = function(material) {
  "use strict";
  for(var i = 0; i < this.shapes.length; i++) {
    this.shapes[i].setTexture(material);
  }
  return this;
};
/**
 * Sets the shader program used by all shapes in this shape group.
 * @param {H3DU.ShaderInfo} material Source code for a WebGL
 * shader program. <i>Using a {@link H3DU.ShaderProgram} here
 * is deprecated.</i>
 * @instance
 * @returns {Object} Return value.
 */
H3DU.ShapeGroup.prototype.setShader = function(material) {
  "use strict";
  for(var i = 0; i < this.shapes.length; i++) {
    this.shapes[i].setShader(material);
  }
  return this;
};
/**
 * Removes all instances of a 3D shape from this shape group
 * @param {H3DU.Shape|H3DU.ShapeGroup} shape The 3D shape to remove.
 * @returns {H3DU.ShapeGroup} This object.
 * @instance
 */
H3DU.ShapeGroup.prototype.removeShape = function(shape) {
  "use strict";
  for(var i = 0; i < this.shapes.length; i++) {
    if(this.shapes[i] === shape) {
      this.shapes.splice(i, 1);
      i--;
    }
  }
  return this;
};
/**
 * Finds a bounding box that holds all vertices in this shape group.
 * The bounding box is not guaranteed to be the
 * tightest, and the box will be in world space coordinates.
 * @returns {Array<Number>} An array of six numbers describing an
 * axis-aligned bounding box
 * that fits all vertices in the shape group. The first three numbers
 * are the smallest-valued X, Y, and Z coordinates, and the
 * last three are the largest-valued X, Y, and Z coordinates.
 * If the shape group has no vertices, returns the array [Inf, Inf, Inf, -Inf,
 * -Inf, -Inf].
 * @instance
 */
H3DU.ShapeGroup.prototype.getBounds = function() {
  "use strict";
  var inf = Number.POSITIVE_INFINITY;
  var ret = [inf, inf, inf, -inf, -inf, -inf];
  var first = true;
  for(var i = 0; i < this.shapes.length; i++) {
    var b = this.shapes[i].getBounds();
    // NOTE: The returned bounding
    if(!H3DU.Math.boxIsEmpty(b)) {
      if(first) {
        ret[0] = b[0];
        ret[1] = b[1];
        ret[2] = b[2];
        ret[3] = b[3];
        ret[4] = b[4];
        ret[5] = b[5];
        first = false;
      } else {
        ret[0] = Math.min(b[0], ret[0]);
        ret[1] = Math.min(b[1], ret[1]);
        ret[2] = Math.min(b[2], ret[2]);
        ret[3] = Math.max(b[3], ret[3]);
        ret[4] = Math.max(b[4], ret[4]);
        ret[5] = Math.max(b[5], ret[5]);
      }
    }
  }
  return ret;
};

/**
 * Gets the number of vertices composed by all shapes in this shape group.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.ShapeGroup.prototype.vertexCount = function() {
  "use strict";
  var c = 0;
  for(var i = 0; i < this.shapes.length; i++) {
    c += this.shapes[i].vertexCount();
  }
  return c;
};
/**
 * Gets the number of primitives (triangles, lines,
 * and points) composed by all shapes in this shape group.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.ShapeGroup.prototype.primitiveCount = function() {
  "use strict";
  var c = 0;
  for(var i = 0; i < this.shapes.length; i++) {
    c += this.shapes[i].primitiveCount();
  }
  return c;
};
/**
 * Sets the relative position of the shapes in this group
 * from their original position.
 * See {@link H3DU.Transform#setPosition}
 * This method will modify this shape group's transform
 * rather than the transform for each shape in the group.
 * @param {number|Array<Number>} x X coordinate
 * or a 3-element position array, as specified in {@link H3DU.Transform#setScale}.
 * @param {Number} y Y coordinate.
 * @param {Number} z Z coordinate.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.ShapeGroup.prototype.setPosition = function(x, y, z) {
  "use strict";
  this.transform.setPosition(x, y, z);
  return this;
};
/**
 * Sets this shape group's rotation in the form of a [quaternion]{@tutorial glmath}.
 * See {@link H3DU.Transform#setQuaternion}.
 * This method will modify this shape group's transform
 * rather than the transform for each shape in the group.
 * @param {Array<Number>} quat A four-element array describing the rotation.
 * @returns {H3DU.Shape} This object.
 * @instance
 */
H3DU.ShapeGroup.prototype.setQuaternion = function(quat) {
  "use strict";
  this.transform.setQuaternion(quat);
  return this;
};
/**
 * Sets the scale of this shape group relative to its original
 * size. See {@link H3DU.Transform#setScale}.
 * This method will modify this shape group's transform
 * rather than the transform for each shape in the group.
 * @param {number|Array<Number>} x Scaling factor for this object's width,
 * or a 3-element scaling array, as specified in {@link H3DU.Transform#setScale}.
 * @param {Number} y Scaling factor for this object's height.
 * @param {Number} z Scaling factor for this object's depth.
 * @returns {H3DU.Scene3D} This object.
 * @instance
 */
H3DU.ShapeGroup.prototype.setScale = function(x, y, z) {
  "use strict";
  this.transform.setScale(x, y, z);
  return this;
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
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
 * <p>Notes:<ul>
 * <li>Previous versions of this class allowed meshes to contain more than one
 * primitive type (triangles, lines, and points are the primitive types). This is
 * no longer the case, to simplify the implementation.<p>
 * <li>The default shader program assumes that all colors specified in this object are in
 * the [sRGB color space]{@link H3DU.Math.colorTosRGB}.
 * <li>Starting in version 2.0, this class should not be used as a general purpose
 * class for storing geometric meshes. It should only be used as a convenient
 * way to build mesh buffers. In the future, some of the functionality in this class
 * may be reimplemented in the MeshBuffer class and the corresponding methods
 * in this class may be rewritten by having them convert objects to a MeshBuffer and
 * call the new MeshBuffer method; this may affect performance. Afterward,
 * or at that point, those methods may be deprecated.</li></ul>
 * @class
 * @memberof H3DU
 * @param {Array<Number>} [vertices] An array that contains data on each
 * vertex of the mesh.
 * Each vertex is made up of the same number of elements, as defined in
 * format. May be null or omitted, in which case an empty vertex array is used.
 * @param {Array<Number>} [indices] An array of vertex indices. Each trio of
 * indices specifies a separate triangle, or each pair of indices specifies
 * a line segment.
 * If null or omitted, creates an initially empty mesh.
 * @param {Number} [format] A set of bit flags depending on the kind of data
 * each vertex contains. Each vertex contains 3 elements plus:<ul>
 * <li> 3 more elements if H3DU.Mesh.NORMALS_BIT is set, plus
 * <li> 3 more elements if H3DU.Mesh.COLORS_BIT is set, plus
 * <li> 2 more elements if H3DU.Mesh.TEXCOORDS_BIT is set.</ul>
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
/** @ignore */
H3DU.Mesh._primitiveType = function(mode) {
  "use strict";
  if(mode === H3DU.Mesh.LINES || mode === H3DU.Mesh.LINE_STRIP)
    return H3DU.Mesh.LINES;
  else if(mode === H3DU.Mesh.POINTS)
    return H3DU.Mesh.POINTS;
  else
  return H3DU.Mesh.TRIANGLES;
};
/** @ignore */
H3DU.Mesh._isCompatibleMode = function(oldMode, newMode) {
  "use strict";
  if(oldMode === newMode)return true;
  if(H3DU.Mesh._primitiveType(oldMode) === H3DU.Mesh._primitiveType(newMode))
    return true;
  return false;
};
/** @ignore */
H3DU.Mesh._recalcNormalsStart = function(vertices, uniqueVertices, faces, stride, offset, flat) {
  "use strict";
  for(var i = 0; i < vertices.length; i += stride) {
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
/** @ignore */
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
          for(i = 1; i < v.length; i++) {
            var dupfound = false;
            var nx = vertices[v[i]];
            var ny = vertices[v[i] + 1];
            var nz = vertices[v[i] + 2];
            for(var j = 0; j < dupvertcount; j += 3) {
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
          for(i = 0; i < v.length; i++) {
            vertices[v[i]] = avgx;
            vertices[v[i] + 1] = avgy;
            vertices[v[i] + 2] = avgz;
          }
        }
      }
    }
  }
  // Normalize each normal of the vertex
  for(i = 0; i < vertices.length; i += stride) {
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

/** @ignore */
H3DU.Mesh._recalcNormals = function(vertices, faces, stride, offset, flat, inward) {
  "use strict";
  var normDir = inward ? -1 : 1;
  var uniqueVertices = {};
  var len;
  H3DU.Mesh._recalcNormalsStart(vertices, uniqueVertices, faces, stride, offset, flat);
  for(var i = 0; i < faces.length; i += 3) {
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
 * types, such as triangles and lines. For example, it's allowed
 * to have a mesh with triangles, then call this method, say,
 * with <code>H3DU.Mesh.LINE_STRIP</code> to add line segments
 * to that mesh. However, this functionality may be deprecated
 * in future versions.
 * @param {Number} m A primitive type. One of the following:
 * H3DU.Mesh.TRIANGLES, H3DU.Mesh.LINES, H3DU.Mesh.LINE_STRIP, H3DU.Mesh.TRIANGLE_STRIP,
 * H3DU.Mesh.TRIANGLE_FAN, H3DU.Mesh.QUADS, H3DU.Mesh.QUAD_STRIP.
 * Throws an error if the primitive type is incompatible with the
 * current primitive type (for example, a triangle type with LINE_STRIP).
 * @returns {H3DU.Mesh} This object.
 * @instance
 */
H3DU.Mesh.prototype.mode = function(m) {
  "use strict";
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
  } else if( !H3DU.Mesh._isCompatibleMode(this.currentMode, m)) {
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
 * @instance
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
  for(i = oldIndexLength; i < this.indices.length; i++) {
    this.indices[i] += oldVertexLength;
  }
  // Reset the primitive
  this.newPrimitive();
  return this;
};

 /**
  * Sets the current normal for this mesh. Future vertex positions
  * defined (with vertex3()) will have this normal. The new current
  * normal will apply to future vertices even if the current mode
  * is TRIANGLE_FAN and some vertices were already given for
  * that mode. The normal passed to this method will
  * not automatically be normalized to unit length.
  * @param {Number} x X coordinate of the normal.
  *   If "y" and "z" are null or omitted, this is instead
  * a 3-element array giving the X, Y, and Z coordinates, or a single number
  * giving the coordinate for all three dimensions.
  * @param {Number} y Y coordinate of the normal.
  * If "x" is an array, this parameter may be omitted.
  * @param {Number} z Z coordinate of the normal.
  * If "x" is an array, this parameter may be omitted.
  * @returns {H3DU.Mesh} This object.
  * @instance
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
 * Sets the current tangent vector for this mesh. Future vertex positions
 * defined (with vertex3()) will have this normal. The new current
 * tangent will apply to future vertices even if the current mode
 * is TRIANGLE_FAN and some vertices were already given for
 * that mode. The tangent passed to this method will
 * not automatically be normalized to unit length.
 * @param {Number} x X coordinate of the tangent vector.
 *   If "y" and "z" are null or omitted, this is instead
 * a 3-element array giving the X, Y, and Z coordinates, or a single number
 * giving the coordinate for all three dimensions.
 * @param {Number} y Y coordinate of the tangent vector.
 * If "x" is an array, this parameter may be omitted.
 * @param {Number} z Z coordinate of the tangent vector.
 * If "x" is an array, this parameter may be omitted.
 * @returns {H3DU.Mesh} This object.
 * @instance
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
 * Sets the current bitangent vector for this mesh. Future vertex positions
 * defined (with vertex3()) will have this bitangent. The new current
 * bitangent will apply to future vertices even if the current mode
 * is TRIANGLE_FAN and some vertices were already given for
 * that mode. The bitangent passed to this method will
 * not automatically be normalized to unit length.
 * @param {Number} x X coordinate of the bitangent vector.
 *   If "y" and "z" are null or omitted, this is instead
 * a 3-element array giving the X, Y, and Z coordinates, or a single number
 * giving the coordinate for all three dimensions.
 * @param {Number} y Y coordinate of the bitangent vector.
 * If "x" is an array, this parameter may be omitted.
 * @param {Number} z Z coordinate of the bitangent vector.
 * If "x" is an array, this parameter may be omitted.
 * @returns {H3DU.Mesh} This object.
 * @instance
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
  * Sets the current color for this mesh. Future vertex positions
  * defined (with vertex3()) will have this color. The new current
  * color will apply to future vertices even if the current mode
  * is TRIANGLE_FAN and some vertices were already given for
  * that mode. Only the red, green, and blue components will be used.
  * @param {Array<Number>|number|string} r A [color vector or string]{@link H3DU.toGLColor},
  * or the red color component (0-1).
  * @param {Number} g Green color component (0-1).
  * May be null or omitted if a string or array is given as the "r" parameter.
  * @param {Number} b Blue color component (0-1).
  * May be null or omitted if a string or array is given as the "r" parameter.
  * @returns {H3DU.Mesh} This object.
  * @instance
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
  * Sets the current texture coordinates for this mesh. Future vertex positions
  * defined (with vertex3()) will have these texture coordinates.
  * The new current texture coordinates will apply to future vertices
  * even if the current mode
  * is TRIANGLE_FAN and some vertices were already given for
  * that mode.<p>
  * H3DU.Texture coordinates are a set of 2 values each ranging from 0 to
  * 1, where (0, 0) is the lower right corner of the texture (by default), and (1, 1) is the upper
  * right corner (by default).
  * @param {Number} u X coordinate of the texture, from 0-1.
  *   If "v" are null or omitted, this is instead
  * a 3-element array giving the X and Y coordinates, or a single number
  * giving the coordinate for all three dimensions.
  * @param {Number} v Y coordinate of the texture, from 0-1.
  * If "u" is an array, this parameter can be omitted.
  * @returns {H3DU.Mesh} This object.
  * @instance
  */
H3DU.Mesh.prototype.texCoord2 = function(u, v) {
  "use strict";
// LATER: Support 3D texture coordinates
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
  * Adds a new vertex to this mesh. If appropriate, adds an
  * additional face index according to this mesh's current mode.
  * The vertex will adopt this mesh's current normal, color,
  * and texture coordinates if they have been defined.
  * @param {Array<Number>|number} x The X coordinate.
  *   If "y" and "z" are null or omitted, this is instead
  * a 3-element array giving the X, Y, and Z coordinates, or a single number
  * giving the coordinate for all three dimensions.
  * @param {Number} y The Y coordinate.
  * If "x" is an array, this parameter may be omitted.
  * @param {Number} z The Z coordinate.
  * If "x" is an array, this parameter may be omitted.
  * @returns {H3DU.Mesh} This object.
  * @instance
  */
H3DU.Mesh.prototype.vertex3 = function(x, y, z) {
  "use strict";
  if(typeof x !== "undefined" && x !== null && (typeof y === "undefined" || y === null) && (typeof z === "undefined" || z === null)) {
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
  * Adds a new vertex to this mesh. The Z coordinate will
  * be treated as 0.
  * @param {Array<Number>|number} x The X coordinate.
  * If "y" is null or omitted, this is instead
  * a 3-element array giving the X, Y, and Z coordinates, or a single number
  * giving the coordinate for all three dimensions.
  * @param {Number} y The Y coordinate.
  * If "x" is an array, this parameter may be omitted.
  * @returns {H3DU.Mesh} This object.
  * @instance
  */
H3DU.Mesh.prototype.vertex2 = function(x, y) {
  "use strict";
  if(typeof x !== "undefined" && x !== null && (typeof y === "undefined" || y === null)) {
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
  * @instance
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
  for(var i = colorOffset; i < this.vertices.length; i += stride) {
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
 * @instance
 */
H3DU.Mesh.prototype.normalizeNormals = function() {
  "use strict";
  var i;
  var stride = this.getStride();
  var vertices = this.vertices;
  var normalOffset = H3DU.Mesh._normalOffset(
     this.attributeBits);
  if(normalOffset < 0)return this;
  for(i = 0; i < vertices.length; i += stride) {
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
 * given index. Has no effect if the index is less than 0 or
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
 * @instance
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
 * given index. Has no effect if the index is less than 0 or
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
 * @instance
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
 * @instance
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
 * @instance
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

/** @ignore */
H3DU.Mesh.prototype._initialize = function(vertices, faces, format) {
  "use strict";
  this.vertices = vertices || [];
  this.indices = faces || [];
  this.startIndex = 0;
  var prim = format & H3DU.Mesh.PRIMITIVES_BITS;
  if(prim !== 0 && prim !== H3DU.Mesh.LINES_BIT && prim !== H3DU.Mesh.POINTS_BIT) {
    throw new Error("invalid format");
  }
  this.attributeBits = typeof format === "undefined" || format === null ? 0 : format;
 /**
  * Gets the number of vertices included in this mesh.
  * @returns {Number} Return value.
  */
  this.vertexCount = function() {
    return this.vertices.length / this.getStride();
  };
/** @ignore */
  this.getStride = function() {
    return H3DU.Mesh._getStride(this.attributeBits);
  };
 /** @ignore */
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
 /** @ignore */
  this._rebuildVertices = function(newAttributes) {
    var oldBits = this.attributeBits;
    var newBits = oldBits | newAttributes & H3DU.Mesh.ATTRIBUTES_BITS;
    if(newBits === oldBits)return;
    var currentStride = this.getStride();
    var x, y, z;
  // Rebuild the list of vertices if a new kind of
  // attribute is added to the mesh
    var newVertices = [];
    for(var i = 0; i < this.vertices.length; i += currentStride) {
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
      for(var j = 0; j < stride && found !== 0; j++) {
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

/** @ignore */
H3DU.Mesh.prototype._makeRedundant = function() {
  "use strict";
  var existingIndices = [];
  var stride = this.getStride();
  var originalIndicesLength = this.indices.length;
  for(var i = 0; i < originalIndicesLength; i++) {
    var index = this.indices[i];
    if(existingIndices[index]) {
     // Index already exists, so duplicate
      var offset = index * stride;
      var newIndex = this.vertices.length / stride;
      for(var j = 0; j < stride; j++) {
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
 * @instance
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
    var tmp = f1; f1 = f2; f2 = tmp;
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
 * to line segments. The new mesh will reuse the vertices
 * contained in this one without copying the vertices. If the mesh consists
 * of points or line segments, it will remain
 * unchanged.
 * @returns {H3DU.Mesh} A new mesh with triangles converted
 * to lines.
 * @instance
 */
H3DU.Mesh.prototype.toWireFrame = function() {
  "use strict";
  // LATER: Implement and favor MeshBuffer version of this method
  if((this.attributeBits & H3DU.Mesh.PRIMITIVES_BITS) !== 0) {
   // Not a triangle mesh
    return this;
  }
  var lineIndices = [];
  var existingLines = {};
  for(var i = 0; i < this.indices.length; i += 3) {
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

/** @ignore */
H3DU.Mesh._isIdentityInUpperLeft = function(m) {
  "use strict";
  return m[0] === 1 && m[1] === 0 && m[2] === 0 &&
    m[4] === 0 && m[5] === 1 && m[6] === 0 &&
    m[8] === 0 && m[9] === 0 && m[10] === 1;
};
 /**
  * Transforms the positions and normals of all the vertices currently
  * in this mesh. The matrix won't affect vertices added afterwards.
  * Also, resets the primitive
  * mode (see {@link H3DU.Mesh#mode}) so that future vertices given
  * will not build upon previous vertices. Future vertices should not be
  * added after calling this method without calling mode() first.
  * @param {Array<Number>} matrix A 4x4 matrix described in
  * the {@link H3DU.Math.mat4projectVec3} method. The normals will be transformed using the
  * 3x3 inverse transpose of this matrix (see {@link H3DU.Math.mat4inverseTranspose3}).
  * @returns {H3DU.Mesh} This object.
  * @instance
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
  for(var i = 0; i < v.length; i += stride) {
    var xform = H3DU.Math.mat4projectVec3(matrix, v[i], v[i + 1], v[i + 2]);
    v[i] = xform[0];
    v[i + 1] = xform[1];
    v[i + 2] = xform[2];
    if(normalOffset >= 0 && isNonTranslation) {
     // Transform and normalize the normals
     // (using a modified matrix) to ensure
     // they point in the correct direction
      xform = H3DU.Math.mat3transform(matrixForNormals,
      v[i + normalOffset], v[i + normalOffset + 1], v[i + normalOffset + 2]);
      H3DU.Math.vec3normalizeInPlace(xform);
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
 * for each primitive in the mesh. The function takes a single
 * parameter, consisting of an array of one, two, or three vertex
 * objects. A point will have one vertex, a line two vertices and
 * a triangle three. Each vertex object may have these properties:<ul>
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
 * @instance
 */
H3DU.Mesh.prototype.enumPrimitives = function(func) {
  "use strict";
  // LATER: Implement and favor MeshBuffer version of this method
  var prim = this.primitiveType();
  var normals = H3DU.Mesh._normalOffset(this.attributeBits);
  var colors = H3DU.Mesh._colorOffset(this.attributeBits);
  var texcoords = H3DU.Mesh._texCoordOffset(this.attributeBits);
  var stride = this.getStride();
  var v = this.vertices;
  var primSize = 3;
  if(prim === H3DU.Mesh.LINES)primSize = 2;
  if(prim === H3DU.Mesh.POINTS)primSize = 1;
  for(var j = 0; j < this.indices.length; j += primSize) {
    var p = [];
    for(var k = 0; k < primSize; k++) {
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
 * @instance
 */
H3DU.Mesh.prototype.getBoundingBox = function() {
  // LATER: Implement and favor MeshBuffer version of this method
  "use strict";
  var empty = true;
  var inf = Number.POSITIVE_INFINITY;
  var ret = [inf, inf, inf, -inf, -inf, -inf];
  var stride = this.getStride();
  var v = this.vertices;
  for(var j = 0; j < this.indices.length; j++) {
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
/** @ignore */
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
  var t14 = (t10 * t1 + t12 * t4) * t11;
  var t15 = (t10 * t2 + t12 * t5) * t11;
  var t16 = (t10 * t3 + t12 * t6) * t11;
  var t17 = (t13 * t1 + t7 * t4) * t11;
  var t18 = (t13 * t2 + t7 * t5) * t11;
  var t19 = (t13 * t3 + t7 * t6) * t11;
  return [t14, t15, t16, t17, t18, t19];
};
/** @ignore */
H3DU.Mesh._recalcTangentsInternal = function(vertices, indices, stride, uvOffset, normalOffset, tangentOffset) {
  "use strict";
 // NOTE: no need to specify bitangent offset, since tangent
 // and bitangent will always be contiguous (this method will
 // always be called after the recalcTangents method ensures
 // that both fields are present)
  var vi = [0, 0, 0];
  for(var i = 0; i < indices.length; i += 3) {
    vi[0] = indices[i] * stride;
    vi[1] = indices[i + 1] * stride;
    vi[2] = indices[i + 2] * stride;
    var ret = H3DU.Mesh._findTangentAndBitangent(vertices, vi[0], vi[1], vi[2], uvOffset);
  // NOTE: It would be more mathematically correct to use the inverse
  // of the matrix
  // [ Ax Bx Nx ]
  // [ Ay By Ny ]
  // [ Az Bz Nz ]
  // (where A and B are the tangent and bitangent and returned
  // in _findTangentAndBitangent) as the tangent space
  // transformation, that is, include three
  // different vectors (tangent, bitangent, and modified normal).
  // Instead we use the matrix
  // [ AAx AAy AAz ]
  // [ BBx BBy BBz ]
  // [ Nx Ny Nz ]
  // (where AA and BB are the orthonormalized versions of the tangent
  // and bitangent) as the tangent space transform, in order to avoid
  // the need to also specify a transformed normal due to matrix inversion.
    for(var j = 0; j < 3; j++) {
      var m = ret;
      var vicur = vi[j];
      var norm0 = vertices[vicur + normalOffset];
      var norm1 = vertices[vicur + normalOffset + 1];
      var norm2 = vertices[vicur + normalOffset + 2];
      var t20 = m[0] * norm0 + m[1] * norm1 + m[2] * norm2;
      var tangent = H3DU.Math.vec3normalizeInPlace([
        m[0] - t20 * norm0,
        m[1] - t20 * norm1,
        m[2] - t20 * norm2]);
      var t22 = m[3] * norm0 + m[4] * norm1 + m[5] * norm2;
      var t23 = m[3] * tangent[0] + m[4] * tangent[1] + m[5] * tangent[2];
      var bitangent = H3DU.Math.vec3normalizeInPlace([
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
  * Recalculates the tangent and bitangent vectors for triangles
  * in this mesh. Tangent and bitangent vectors are required for
  * normal mapping (bump mapping) to work.
  * This method only has an effect if this mesh
  * includes normals and texture coordinates.
  * @returns {H3DU.Mesh} This object.
  * @instance
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
 * new H3DU.Mesh().merge(originalMesh).reverseWinding().reverseNormals()
 * );
 * @instance
 */
H3DU.Mesh.prototype.reverseNormals = function() {
  "use strict";
  // LATER: Implement and favor MeshBuffer version of this method
  var i;
  var stride = this.getStride();
  var vertices = this.vertices;
  var normalOffset = H3DU.Mesh._normalOffset(
     this.attributeBits);
  if(normalOffset < 0) return this;
  for(i = 0; i < vertices.length; i += stride) {
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
 * with different winding orders. This is useful when enabling
 * back-face culling and drawing open geometric shapes such as
 * those generated by H3DU.Meshes.createCylinder or H3DU.Meshes.createDisk.
 * Due to the z-fighting effect, drawing this kind of mesh is
 * recommended only if face culling is enabled.</caption>
 * var frontBackMesh = originalMesh.merge(
 * new H3DU.Mesh().merge(originalMesh).reverseWinding()
 * );
 * @instance
 */
H3DU.Mesh.prototype.reverseWinding = function() {
  "use strict";
  // LATER: Implement and favor MeshBuffer version of this method
  if((this.attributeBits & H3DU.Mesh.PRIMITIVES_BITS) !== 0) {
   // Not a triangle mesh
    return this;
  }
  for(var i = 0; i < this.indices.length; i += 3) {
    var f2 = this.indices[i + 1];
    var f3 = this.indices[i + 2];
    this.indices[i + 2] = f2;
    this.indices[i + 1] = f3;
  }
  return this;
};

/**
 * Recalculates the normal vectors for triangles
 * in this mesh. For this to properly affect shading, each triangle in
 * the mesh must have its vertices defined in
 * counterclockwise order (if the triangle is being rendered
 * in a right-handed coordinate system). Each normal calculated will
 * be normalized to have a length of 1 (unless the normal is (0,0,0)).
 * @param {Boolean} flat If true, each triangle in the mesh
 * will have the same normal, which usually leads to a flat
 * appearance. If false, each unique vertex in the mesh
 * will have its own normal, which usually leads to a smooth
 * appearance.
 * @param {Boolean} inward If true, the generated normals
 * will point inward; otherwise, outward.
 * @returns {H3DU.Mesh} This object.
 * @instance
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
/** @ignore */
H3DU.Mesh._getStride = function(format) {
  "use strict";
  var s = [3, 6, 6, 9, 5, 8, 8, 11][format & (H3DU.Mesh.NORMALS_BIT | H3DU.Mesh.COLORS_BIT | H3DU.Mesh.TEXCOORDS_BIT)];
  if((format & H3DU.Mesh.TANGENTS_BIT) !== 0)s += 3;
  if((format & H3DU.Mesh.BITANGENTS_BIT) !== 0)s += 3;
  return s;
};
/** @ignore */
H3DU.Mesh._normalOffset = function(format) {
  "use strict";
  return [-1, 3, -1, 3, -1, 3, -1, 3][format & (H3DU.Mesh.NORMALS_BIT | H3DU.Mesh.COLORS_BIT | H3DU.Mesh.TEXCOORDS_BIT)];
};
/** @ignore */
H3DU.Mesh._tangentOffset = function(format) {
  "use strict";
  var x = 3;
  if((format & H3DU.Mesh.TANGENTS_BIT) === 0)return -1;
  if((format & H3DU.Mesh.NORMALS_BIT) !== 0)x += 3;
  if((format & H3DU.Mesh.COLORS_BIT) !== 0)x += 3;
  if((format & H3DU.Mesh.TEXCOORDS_BIT) !== 0)x += 2;
  return x;
};
/** @ignore */
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
/** @ignore */
H3DU.Mesh._colorOffset = function(format) {
  "use strict";
  return [-1, -1, 3, 6, -1, -1, 3, 6][format & (H3DU.Mesh.NORMALS_BIT | H3DU.Mesh.COLORS_BIT | H3DU.Mesh.TEXCOORDS_BIT)];
};
/** @ignore */
H3DU.Mesh._texCoordOffset = function(format) {
  "use strict";
  return [-1, -1, -1, -1, 3, 6, 6, 9][format & (H3DU.Mesh.NORMALS_BIT | H3DU.Mesh.COLORS_BIT | H3DU.Mesh.TEXCOORDS_BIT)];
};
/** @ignore */
H3DU.Mesh.ATTRIBUTES_BITS = 255;
/** @ignore */
H3DU.Mesh.PRIMITIVES_BITS = 768;
/** The mesh contains normals for each vertex.
 * @const
 * @default
 */
H3DU.Mesh.NORMALS_BIT = 1;
/** The mesh contains colors for each vertex.
 * @const
 * @default
 */
H3DU.Mesh.COLORS_BIT = 2;
/** The mesh contains texture coordinates for each vertex.
 * @const
 * @default
 */
H3DU.Mesh.TEXCOORDS_BIT = 4;
/**
 * The mesh contains tangent vectors for each vertex.
 * @const
 * @default
 */
H3DU.Mesh.TANGENTS_BIT = 8;
/**
 * The mesh contains bitangent vectors for each vertex.
 * @const
 * @default
 */
H3DU.Mesh.BITANGENTS_BIT = 16;
/** The mesh consists of lines (2 vertices per line) instead
 * of triangles (3 vertices per line).
 * @const
 * @default
 */
H3DU.Mesh.LINES_BIT = 256;
/** The mesh consists of points (1 vertex per line).
 * @const
 * @default
 */
H3DU.Mesh.POINTS_BIT = 512;
/**
 * Primitive mode for rendering triangles, made up
 * of 3 vertices each.
 * @const
 * @default
 */
H3DU.Mesh.TRIANGLES = 4;
/**
 * Primitive mode for rendering a strip of quadrilaterals (quads).
 * The first 4 vertices make up the first quad, and each additional
 * quad is made up of the last 2 vertices of the previous quad and
 * 2 new vertices. Each quad is broken into two triangles: the first
 * triangle consists of the first, second, and third vertices, in that order,
 * and the second triangle consists of the third, second, and fourth
 * vertices, in that order.
 * @const
 * @default
 */
H3DU.Mesh.QUAD_STRIP = 8;
/**
 * Primitive mode for rendering quadrilaterals, made up
 * of 4 vertices each. Each quadrilateral is broken into two triangles: the first
 * triangle consists of the first, second, and third vertices, in that order,
 * and the second triangle consists of the first, third, and fourth
 * vertices, in that order.
 * @const
 * @default
 */
H3DU.Mesh.QUADS = 7;
/**
 * Primitive mode for rendering line segments, made up
 * of 2 vertices each.
 * @const
 */
H3DU.Mesh.LINES = 1;
/**
 * Primitive mode for rendering a triangle fan. The first 3
 * vertices make up the first triangle, and each additional
 * triangle is made up of the first vertex of the first triangle,
 * the previous vertex, and 1 new vertex.
 * @const
 * @default
 */
H3DU.Mesh.TRIANGLE_FAN = 6;
/**
 * Primitive mode for rendering a triangle strip. The first 3
 * vertices make up the first triangle, and each additional
 * triangle is made up of the last 2 vertices and 1
 * new vertex. For the second triangle in the strip, and
 * every other triangle after that, the first and second
 * vertices are swapped when generating that triangle.
 * @const
 * @default
 */
H3DU.Mesh.TRIANGLE_STRIP = 5;
/**
 * Primitive mode for rendering connected line segments.
 * The first 2 vertices make up the first line, and each additional
 * line is made up of the last vertex and 1 new vertex.
 * @const
 * @default
 */
H3DU.Mesh.LINE_STRIP = 3;
/**
 * Primitive mode for rendering points, made up
 * of 1 vertex each.
 * @const
 * @default
 */
H3DU.Mesh.POINTS = 0;

this.H3DU.Mesh = H3DU.Mesh;
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU, Promise */
/**
 * An object that caches loaded textures and uploads them
 * to WebGL contexts.
 * @class
 * @memberof H3DU
 */
H3DU.TextureLoader = function() {
  "use strict";
  this.loadedTextures = [];
  this.textureImages = {};
  this.maxAnisotropy = [];
  this.fbLoader = new H3DU.FrameBufferLoader();
};
/**
 * Gets an already loaded texture by name from this texture loader.
 * @param {String} name The name of the texture, usually its file name.
 * @returns {Texture} The texture with the given name, or null
 * if it doesn't exist.
 * @instance
 */
H3DU.TextureLoader.prototype.getTexture = function(name) {
  "use strict";
  var tex = this.textureImages[name] || null;
  if(tex && tex.loadStatus !== 2) {
    this.textureImages[name] = null;
    return null;
  }
  return this.textureImages[name] || null;
};

/**
 * Loads a texture by its URL and stores its data.
 * @param {String|H3DU.TextureInfo|H3DU.Texture} texture An {@link H3DU.Texture} object,
 * an {@link H3DU.TextureInfo} object, or a string with the
 * URL of the texture data.<p>
 * Images with a TGA
 * extension that use the RGBA or grayscale format are supported.
 * Images supported by the browser will be loaded via
 * the JavaScript DOM's Image class.
 * @returns {Promise<H3DU.Texture>} A promise that resolves when the texture
 * is fully loaded. If it resolves, the result will be an H3DU.Texture object.
 * @instance
 */
H3DU.TextureLoader.prototype.loadTexture = function(texture) {
  "use strict";
  return H3DU.Texture.loadTexture(texture, this.textureImages);
};
/** @ignore */
H3DU.TextureLoader.prototype._setMaxAnisotropy = function(context, target) {
  "use strict";
  context = context.getContext ? context.getContext() : context;
  var ma = this.maxAnisotropy;
  for(var i = 0; i < ma.length; i++) {
    if(ma[i][0] === context) {
      if(ma[i][2] >= 0) {
        context.texParameteri(target, ma[i][2], ma[i][1]);
      } else {
        return;
      }
    }
  }
  var ext = context.getExtension("EXT_texture_filter_anisotropic") ||
         context.getExtension("WEBKIT_EXT_texture_filter_anisotropic") ||
         context.getExtension("MOZ_EXT_texture_filter_anisotropic");
  if(!ext) {
    ma.push([context, 1, -1, null]);
    return 1;
  } else {
    var cnst = ext.TEXTURE_MAX_ANISOTROPY_EXT;
    var ret = context.getParameter(
    ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
    ma.push([context, ret, cnst]);
    context.texParameteri(target, cnst, ret);
    return ret;
  }
};
/**
 * Loads the textures referred to in an array of URLs and
 * stores their texture data.
 * @param {Array<String|H3DU.TextureInfo|H3DU.Texture>} textures An array of objects described in
 * {@link H3DU.TextureLoader.loadTexture}.
 * @param {Function} [resolve] A function called as each
 * individual texture is loaded and its promise resolves.
 * @param {Function} [reject] A function called as each
 * individual texture is loaded and its promise is rejected.
 * @returns {Promise<H3DU.Texture>} A promise as described in
 * {@link H3DU.getPromiseResultsAll}. If the promise
 * resolves, each item in the resulting array will be a loaded
 * {@link H3DU.Texture} object.
 * @instance
 */
H3DU.TextureLoader.prototype.loadTexturesAll = function(textures, resolve, reject) {
  "use strict";
  var promises = [];
  for(var i = 0; i < textures.length; i++) {
    promises.push(this.loadTexture(textures[i]));
  }
  return H3DU.getPromiseResultsAll(promises, resolve, reject);
};
/**
 * Loads the texture referred to in an array of URLs and
 * uploads its texture data to a WebGL context.
 * @param {String|H3DU.TextureInfo|H3DU.Texture} texture An object described in
 * {@link H3DU.TextureLoader.loadTexture}.
 * @param {WebGLRenderingContext|WebGL2RenderingContext|object} context
 * A WebGL context to associate with this scene, or an object, such as {@link H3DU.Scene3D}, that
 * implements a no-argument <code>getContext</code> method
 * that returns a WebGL context.
 * @returns {Promise<H3DU.Texture>} A promise that resolves when
 * the texture is loaded successfully (the result will be an H3DU.Texture object)
 * and is rejected when an error occurs.
 * @instance
 */
H3DU.TextureLoader.prototype.loadAndMapTexture = function(texture, context) {
  "use strict";
  context = context.getContext ? context.getContext() : context;
  var that = this;
  return this.loadTexture(texture).then(function(tex) {
    var texinfo = H3DU.TextureInfo._texInfoOrString(texture);
    that._mapTextureWithInfo(tex, texinfo, context);
    return Promise.resolve(tex);
  });
};
/**
 * Loads one or more textures by their URL and uploads their data to a WebGL context.
 * @param {Array<String|H3DU.TextureInfo|H3DU.Texture>} textures An array of objects described in
 * {@link H3DU.TextureLoader.loadTexture}.
 * @param {WebGLRenderingContext|WebGL2RenderingContext|object} context
 * A WebGL context to associate with this scene, or an object, such as {@link H3DU.Scene3D}, that
 * implements a no-argument <code>getContext</code> method
 * that returns a WebGL context.
 * @param {Function} [resolve] A function called as each
 * individual texture is loaded and its promise resolves.
 * @param {Function} [reject] A function called as each
 * individual texture is loaded and its promise is rejected.
 * @returns {Promise<H3DU.Texture>} A promise as described in
 * {@link H3DU.getPromiseResultsAll}. If the promise
 * resolves, each item in the resulting array will be a loaded
 * {@link H3DU.Texture} object.
 * @instance
 */
H3DU.TextureLoader.prototype.loadAndMapTexturesAll = function(textures, context, resolve, reject) {
  "use strict";
  context = context.getContext ? context.getContext() : context;
  var promises = [];
  for(var i = 0; i < textures.length; i++) {
    promises.push(this.loadAndMapTexture(textures[i], context));
  }
  return H3DU.getPromiseResultsAll(promises, resolve, reject);
};

/** @ignore */
H3DU.TextureLoader.prototype._mapTextureWithInfo = function(texture, textureInfo, context) {
  "use strict";
  context = context.getContext ? context.getContext() : context;
  var lt = this.loadedTextures;
  for(var i = 0; i < lt.length; i++) {
    if(lt[i][0] === texture && lt[i][1] === context) {
      return lt[i][2];
    }
  }
  var loadedTex = texture instanceof H3DU.CubeMap ?
     new H3DU._LoadedCubeMap(texture, context) :
     new H3DU._LoadedTexture(texture, textureInfo, context);
  lt.push([texture, context, loadedTex]);
  return loadedTex;
};

/**
 * Loads the textures described in a cube map.
 * @param {Array<String|H3DU.TextureInfo|H3DU.Texture>|H3DU.CubeMap} texturesOrCubeMap Either
 * an array of objects described in
 * {@link H3DU.TextureLoader.loadTexture} or a cube map object.
 * @param {Function} [resolve] A function called as each
 * individual texture is loaded and its promise resolves.
 * @param {Function} [reject] A function called as each
 * individual texture is loaded and its promise is rejected.
 * @returns {Promise<H3DU.Texture>} A promise that resolves when
 * all textures used by the cube map are loaded successfully
 * (the result will be an H3DU.CubeMap object)
 * and is rejected when an error occurs.
 * @instance
 */
H3DU.TextureLoader.prototype.loadCubeMap = function(texturesOrCubeMap, resolve, reject) {
  "use strict";
  var cubemap = texturesOrCubeMap;
  if(!(texturesOrCubeMap instanceof H3DU.CubeMap)) {
    cubemap = new H3DU.CubeMap(texturesOrCubeMap);
  }
  return H3DU.TextureLoader.prototype.loadTexturesAll(cubemap.textures, resolve, reject)
 .then(function() {
   return Promise.resolve(cubemap);
 });
};

/** @ignore */
H3DU.TextureLoader.prototype.mapFrameBuffer = function(info, context) {
  "use strict";
  context = context.getContext ? context.getContext() : context;
  return this.fbLoader.mapFrameBuffer(info, context);
};
/** @ignore */
H3DU.TextureLoader.prototype.bindFrameBuffer = function(info, context, textureUnit) {
  "use strict";
  context = context.getContext ? context.getContext() : context;
  return this.fbLoader.bind(info, context, textureUnit);
};
/** @ignore */
H3DU.TextureLoader.prototype.unbindFrameBuffer = function(info, context) {
  "use strict";
  context = context.getContext ? context.getContext() : context;
  this.fbLoader.unbind(info, context);
};
/**
 * Disposes all resources used by this texture loader.
 * @returns {void} This method doesn't return a value.
 * @instance
 */
H3DU.TextureLoader.prototype.dispose = function() {
  "use strict";
  for(var tex in this.textureImages) {
    if(Object.prototype.hasOwnProperty.call(this.textureImages, tex)) {
      this.textureImages[tex].dispose();
    }
  }
  var lt = this.loadedTextures;
  for(var i = 0; i < lt.length; i++) {
    this.loadedTextures[i][2].dispose();
  }
  if(typeof this.fbLoader === "undefined" || this.fbLoader === null) {
    this.fbLoader.dispose();
  }
  this.fbLoader = null;
  this.textureImages = {};
  this.loadedTextures = [];
  this.maxAnisotropy = [];
};
/* global H3DU */
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/**
 * A material for physically-based rendering. Specifies parameters for geometry materials,
 * which describe the appearance of a 3D object. This includes how an object
 * scatters, reflects, or absorbs light.<p>
 * NOTE: The default shader program assumes that all colors, as well as the albedo,
 * specular, and emission maps, specified in this object are in
 * the [sRGB color space]{@link H3DU.Math.colorTosRGB}.
 * @param {Object} [params] An object described in {@link H3DU.PbrMaterial.setParams}.
 * @class
 * @memberof H3DU
 */
H3DU.PbrMaterial = function(params) {
  // LATER: Support ambient occlusion maps.
  "use strict";
/**
 * Albedo (or base color) of this material.<p>
 * This value is a 3- or 4-element array giving the red, green, blue, and
 * alpha components of the albedo (in the [sRGB color space]{@link H3DU.Math.colorTosRGB}). (0,0,0,1) means an
 * albedo value of black, and (1,1,1,1) means an albedo value of white.<p>
 * In the <b>metallic workflow</b>, this color specifies the amount
 * of light that is reflected by this material's surface. For both metals and nonmetals, this color
 * is the generally observed color of the surface. <p>
 * In the <b>specular workflow</b>, this color specifies the amount
 * of light that passes through the material and bounces back (<i>diffuse</i> color). For most nonmetals, this color
 * is the generally observed color of the surface, though somewhat desaturated. Most metals absorb
 * all the light that passes through them,
 * so for most metals, this color should generally be black or a very
 * dark shade of gray. (In physically-based rendering, the sum of albedo and specular
 * colors should not exceed 1.0 in each [linear RGB]{@link H3DU.Math.colorToLinear} channel.)<p>
 * In <b>both workflows</b> in physically-based rendering, the albedo
 * color should not have any added lighting.<p>
 * This value can have an optional fourth element giving the alpha component
 * (0-1). If this element is omitted, the default is 1.<p>
 * In the default shader program, if a mesh defines its own colors, those
 * colors are used rather than this property to set the color defined here.<p>
 * @type {Array<Number>}
 * @default
 */
  this.albedo = [0.8, 0.8, 0.8, 1.0];
  /**
   * A texture indicating the albedo (or base color) of each part of the texture,
   * in the red, green, blue, and alpha channels. In physically-based rendering, the albedo
   * texture should not have any added lighting or shadow detail.
   * @type {H3DU.Texture|H3DU.TextureInfo|H3DU.FrameBufferInfo}
   * @default
   */
  this.albedoMap = null;
  /**
   * A value indicating whether objects described by this material are metals.
   * This value ranges from 0 through 1. If 0, the surface is a nonmetal; if 1,
   * the surface is a metal. Values in between
   * 0 and 1 are rather rare and generally appear in transitions between metals and nonmetals.
   * This value is only used in the <b>metallic workflow</b>.
   * @type {Number}
   * @default
   */
  this.metalness = 0;
  /**
   * A texture indicating the metalness of each part of the texture,
   * as specified in the texture's red channel.
   * Each pixel value in the red channel (which ranges from 0-255 in most image
   * formats) is scaled to the range [0, 1].<p>
   * This value is only used in the <b>metallic workflow</b>.
   * Any texture used for this map should not be in JPEG format or any other
   * format that uses lossy compression, as compression artifacts can result in inaccurate
   * metalness values in certain areas.
   * @type {H3DU.Texture|H3DU.TextureInfo|H3DU.FrameBufferInfo}
   * @default
   */
  this.metalnessMap = null;
  /**
   * Describes the roughness of the surface described
   * by this material. The inverse of roughness is <i>glossiness</i> or <i>smoothness</i>,
   * which equals 1 minus roughness. To make this property equivalent to glossiness
   * or smoothness, set the <code>invertRoughness</code> property to <code>true</code>.
   * @type {Number}
   * @default
   */
  this.roughness = 0.35;
  /**
   * A texture indicating the roughness of each part of the texture,
   * as specified in the texture's red channel.
   * Each pixel value in the red channel (which ranges from 0-255 in most image
   * formats) is scaled to the range [0, 1].<p>
   * The inverse of roughness is <i>glossiness</i> or <i>smoothness</i>;
   * to treat the texture as a glossiness or smoothness map, set the
   * <code>invertRoughness</code> property to <code>true</code>.
   * Any texture used for this map should not be in JPEG format or any other
   * format that uses lossy compression, as compression artifacts can result in inaccurate
   * roughness values in certain areas.
   * @type {H3DU.Texture|H3DU.TextureInfo|H3DU.FrameBufferInfo}
   * @default
   */
  this.roughnessMap = null;
 /**
  * Specular reflectivity of this material.
  * Specular reflection is a bounced-back reflection from the direction
  * the light reaches the material in, similar to a mirror. As a result, depending
  * on the viewing angle, specular reflection can give off
  * shiny highlights on the material.<p>
  * This value is a 3-element array giving the red, green, and blue
  * components of the surface's base reflectivity when looking directly at the surface
  * (base reflectivity at 0 degree incidence, or F<sub>0</sub>).
  * For most nonmetals, this is a shade of gray ranging from
  * (0.15, 0.15, 0.15) to (0.32, 0.32, 0.32) in sRGB. For most metals,
  * this is a very light version of the surface's color.<p>
  * This value is only used in the <b>specular workflow</b>.
  * @type {Array<Number>}
  * @default
  */
  this.specular = [0.2, 0.2, 0.2];
  /**
   * A texture where each pixel identifies the "specular" property of that
   * part of the texture, as specified in the texture's red, green, and blue channels
   * (in the [sRGB color space]{@link H3DU.Math.colorTosRGB}).<p>
   * This value is only used in the <b>specular workflow</b>.<p>
   * Any texture used for this map should not be in JPEG format or any other
   * format that uses lossy compression, as compression artifacts can result in inaccurate
   * specular factors in certain areas.
   * @type {H3DU.Texture|H3DU.TextureInfo|H3DU.FrameBufferInfo}
   * @default
   */
  this.specularMap = null;
/**
 * Specifies which workflow to use when interpreting values for this
 * material. <p>
 * The <b>metallic workflow</b> (<code>H3DU.PbrMaterial.Metallic</code>, the default)
 * is usually easier to understand and uses <code>albedo</code> to set the
 * surface's color and <code>metalness</code> to set whether the surface
 * is a metal or not.<p>
 * The <b>specular workflow</b> (<code>H3DU.PbrMaterial.Specular</code>)
 * uses <code>albedo</code> to set the
 * surface's color for nonmetals and <code>specular</code> to set the
 * surface's specular reflectivity.
 * @type {Number}
 * @default
 */
  this.workflow = H3DU.PbrMaterial.Metallic;
 /**
  * Normal map (bump map) texture. Normal maps are used either to add
  * a sense of roughness to an otherwise flat surface or to give an object a highly-detailed
  * appearance with fewer polygons.<p>
  * In a normal map texture, each pixel is a vector in which
  * each component (which usually ranges from 0-255 in most image formats) is scaled to
  * the range [-1, 1], where:
  * <ul>
  * <li>The pixel's red component is the vector's X component.
  * <li>The pixel's green component is the vector's Y component.
  * <li>The pixel's blue component is the vector's Z component.
  * <li>An unchanged normal vector will have the value (0, 0, 1), which is usually
  * the value (127, 127, 255) in most image formats.
  * <li>The vector is normalized so its length is about equal to 1.
  * <li>The vector is expressed in tangent space, where the Z axis points outward
  * and away from the surface's edges.
  * </ul>
  * Each pixel indicates a tilt from the vector (0, 0, 1), or positive Z axis,
  * to the vector given in that pixel. This tilt adjusts the normals used for the
  * purpose of calculating lighting effects at that part of the surface.
  * A strong tilt indicates strong relief detail at that point.<p>
  * Any texture used for normal maps should not be in JPEG format or any other
  * format that uses lossy compression, as compression artifacts can result in inaccurate
  * normals in certain areas.
  * <p>
  * For normal mapping to work, an object's mesh must include normals,
  * tangents, bitangents, and texture coordinates, though if a <code>H3DU.Mesh</code>
  * object only has normals and texture coordinates, the <code>recalcTangents()</code>
  * method can calculate the tangents and bitangents appropriate for normal mapping.
  * @type {H3DU.Texture|H3DU.TextureInfo|H3DU.FrameBufferInfo}
  * @default
  */
  this.normalMap = null;
 /**
  * Additive color emitted by objects with this material.
  * Used for objects that glow on their own, among other things.
  * This additive color is unaffected by lighting or shading.<p>
  * This value is a 3-element array giving the red, green, and blue
  * components.
  * For each of the three color components, positive values add to that component,
  * while negative values subtract from it. (0,0,0), the default, means no additive color.
  * @type {Array<Number>}
  * @default
  */
  this.emission = [0, 0, 0];
  /**
   * Emission map texture.
   * @type {H3DU.Texture|H3DU.TextureInfo|H3DU.FrameBufferInfo}
   * @default
   */
  this.emissionMap = null;
 /**
  * Shader program to use when rendering objects with this material.
  * @default
  */
  this.shader = null;
  /**
   * If true, the roughness property is treated as a "glossiness" property,
   * or 1 minus roughness, and the roughness map is treated as a "glossiness"
   * map, or an inverted roughness map.
   * @type {Boolean}
   * @default
   */
  this.invertRoughness = false;
  // LATER: Support environment maps; store them in H3DU.Lights, not here
  if(typeof params !== "undefined" && params !== null) {
    this.setParams(params);
  }
};
H3DU.PbrMaterial.Specular = 0;
H3DU.PbrMaterial.Metallic = 1;
/**
 * Sets parameters for this material object.
 * @param {Object} params An object whose keys have
 * the possibilities given below, and whose values are those
 * allowed for each key.<ul>
 * <li><code>workflow</code> - Either {@link H3DU.PbrMaterial.Specular} or {@link H3DU.PbrMaterial.Metalness}
 * <li><code>invertRoughness</code> - If true, the roughness property is treated as a "glossiness" property,
 * or 1 minus roughness, and the roughness map is treated as a "glossiness"
 * map, or an inverted roughness map. See {@link H3DU.PbrMaterial#invertRoughness}.
 * <li><code>diffuse</code> or <code>albedo</code> - A [color vector or string]{@link H3DU.toGLColor} giving
 * the diffusion color (also called "albedo"). (See {@link H3DU.PbrMaterial#diffuse}.) The default is (0.8, 0.8, 0.8).
 * <li><code>specular</code> - A [color vector or string]{@link H3DU.toGLColor} giving
 * the specular reflection. (See {@link H3DU.PbrMaterial#specular}.) The default is (0,0,0), meaning no specular highlights.
 * <li><code>roughness</code> - Roughness.
 * <li><code>emission</code> - A [color vector or string]{@link H3DU.toGLColor} giving
 * the additive color. (See {@link H3DU.PbrMaterial#emission}.) If this is an array, its numbers can
 * range from -1 to 1. The default is (0,0,0).
 * <li><code>texture</code> or <code>albedoMap</code> - {@link H3DU.Texture} object, {@link H3DU.TextureInfo} object, {@link H3DU.FrameBufferInfo} object, ora string with the URL of the texture
 * to use. Can be null.
 * <li><code>specularMap</code> - Specular
 * map texture, taking the same types as for "albedoMap" (see {@link H3DU.PbrMaterial#specularMap}).
 * Can be null.
 * <li><code>normalMap</code> - Normal
 * map (bump map) texture, taking the same types as for "albedoMap" (see {@link H3DU.PbrMaterial#normalMap}). Can be null.
 * <li><code>metalnessMap</code> - Metalness texture, taking the same types as for "albedoMap" (see {@link H3DU.PbrMaterial#metalnessMap}). Can be null.
 * <li><code>roughnessMap</code> - Roughness texture, taking the same types as for "albedoMap" (see {@link H3DU.PbrMaterial#roughnessMap}). Can be null.
 * <li><code>emissionMap</code> - Emission texture, taking the same types as for "albedoMap" (see {@link H3DU.PbrMaterial#emissionMap}). Can be null.
 * <li><code>shader</code> - {@link H3DU.ShaderInfo} object for a WebGL shader program
 * to use when rendering objects with this material. Can be null.
 * <li><code>environmentMap</code> - {@link H3DU.CubeMap} object of an environment
 * map texture (see {@link H3DU.PbrMaterial#environmentMap}). Can be null.
 * </ul>
 * Any or all of these keys can exist in the parameters object. If a value is null or undefined, it is ignored
 * unless otherwise noted.
 * @returns {H3DU.PbrMaterial} This object.
 * @instance
 */
H3DU.PbrMaterial.prototype.setParams = function(params) {
  "use strict";
  if(typeof params.diffuse !== "undefined" && params.diffuse !== null) {
    this.albedo = H3DU.toGLColor(params.diffuse);
    if(this.albedo.length > 4)this.albedo = this.diffuse.slice(0, 4);
  }
  if(typeof params.albedo !== "undefined" && params.albedo !== null) {
    this.albedo = H3DU.toGLColor(params.albedo);
    if(this.albedo.length > 4)this.albedo = this.albedo.slice(0, 4);
  }
  if(typeof params.specular !== "undefined" && params.specular !== null) {
    this.specular = H3DU.toGLColor(params.specular);
    if(this.specular.length > 3)this.specular = this.specular.slice(0, 3);
  }
  if(typeof params.emission !== "undefined" && params.emission !== null) {
    this.emission = H3DU.toGLColor(params.emission);
    if(this.emission.length > 3)this.emission = this.emission.slice(0, 3);
  }
  if(typeof params.texture !== "undefined" && params.texture !== null) {
    this.albedoMap = H3DU.TextureInfo._texInfoOrString(params.texture);
  }
  if(typeof params.albedoMap !== "undefined") {
    this.albedoMap = H3DU.TextureInfo._texInfoOrString(params.albedoMap);
  }
  if(typeof params.specularMap !== "undefined") {
    this.specularMap = H3DU.TextureInfo._texInfoOrString(params.specularMap);
  }
  if(typeof params.normalMap !== "undefined") {
    this.normalMap = H3DU.TextureInfo._texInfoOrString(params.normalMap);
  }
  if(typeof params.metalnessMap !== "undefined") {
    this.metalnessMap = H3DU.TextureInfo._texInfoOrString(params.metalnessMap);
  }
  if(typeof params.roughnessMap !== "undefined") {
    this.roughnessMap = H3DU.TextureInfo._texInfoOrString(params.roughnessMap);
  }
  /*
  if(typeof params.environmentMap !== "undefined") {
    this.environmentMap = H3DU.TextureInfo._texInfoOrString(params.environmentMap);
  }
  */
  if(typeof params.emissionMap !== "undefined") {
    this.emissionMap = H3DU.TextureInfo._texInfoOrString(params.emissionMap);
  }
  if(typeof params.metalness !== "undefined" && params.metalness !== null) {
    this.metalness = params.metalness;
  }
  if(typeof params.invertRoughness !== "undefined" && params.invertRoughness !== null) {
    this.invertRoughness = params.invertRoughness;
  }
  if(typeof params.roughness !== "undefined" && params.roughness !== null) {
    this.roughness = params.roughness;
  }
  if(typeof params.shader !== "undefined") {
    this.shader = params.shader;
  }
  return this;
};

/**
 * Clones this object's parameters to a new {@link H3DU.PbrMaterial}
 * object and returns that object. The material's texture
 * maps and shader info, if any, won't be cloned, but rather, a reference
 * to the same object will be used.
 * @returns {H3DU.PbrMaterial} A copy of this object.
 * @instance
 */
H3DU.PbrMaterial.prototype.copy = function() {
  "use strict";
  return new H3DU.PbrMaterial({
    "environmentMap":this.environmentMap,
    "metalness":this.metalness,
    "metalnessMap":this.metalnessMap,
    "roughness":this.roughness,
    "roughnessMap":this.roughnessMap,
    "albedo":this.albedo,
    "invertRoughness":this.invertRoughness,
    "specular":this.specular,
    "emission":this.emission,
    "albedoMap":this.albedoMap,
    "specularMap":this.specularMap,
    "normalMap":this.normalMap,
    "shader":this.shader
  });
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU */

/**
 * Specifies parameters for light sources.<p>
 * NOTE: The default shader program assumes that all colors specified in this object are in
 * the [sRGB color space]{@link H3DU.Math.colorTosRGB}.
 * @class
 * @memberof H3DU
 * @param {Object|Array<Number>} [params] An object as described in "setParams". <i>Using this parameter
 * as described in the "position" property is deprecated since version 2.0.</i>
 * @param {Array<Number>} [ambient] See "ambient" property. <i>This parameter is deprecated.</i>
 * @param {Array<Number>} [diffuse] See "diffuse" property. <i>This parameter is deprecated.</i>
 * @param {Array<Number>} [specular] See "specular" property. <i>This parameter is deprecated.</i>
 */
H3DU.LightSource = function(params, ambient, diffuse, specular) {
  "use strict";
 /**
  * A 4-element vector giving an additional color to multiply with the ambient
  * color of each object, in the red, green,
  * and blue components respectively.
  * The default is (0,0,0,1), or black.<p>
  * NOTE: This property is not used in the default shader program.
  * @default
  */
  this.ambient = [0, 0, 0, 1.0];
 /**
  * Light position. An array of four numbers, where the first three numbers are the X, Y, and Z components and the fourth number is the W component.<ul>
  * <li> If W is 0, then X, Y, and Z specify a vector in world space; the light will shine the brightest on surfaces that face the light in
  * this vector's direction from the origin (0, 0, 0).
  * <li> If W is 1, then X, Y, and Z specify the position of the light in world space; the light will shine brightest, and in every direction, at the given position.</ul>
  * @default
  */

  this.position = [0, 0, 1, 0];
 /**
  * A 4-element vector giving an additional color to multiply with the diffuse
  * or albedo color (base color) of each object, in the red, green,
  * and blue components respectively. See also {@link H3DU.PbrMaterial#albedo}.
  * Each component ranges from 0 to 1.
  * The default is (1,1,1,1), or white.
  * @default
  */
  this.diffuse = [1, 1, 1, 1];
 /**
  * A 3-element vector giving the color of the light when it causes a specular
  * reflection, in the red, green,
  * and blue components respectively. Each component ranges from 0 to 1.
  * A specular reflection is a reflection in the opposite direction from the direction
  * the light reaches the object in, like a mirror. Specular reflections can cause shiny
  * highlights depending on the viewing angle.
  * The default is (1,1,1), or white.<p>
  * NOTE: <i>The default shader uses this only for {@link H3DU.Material}, not
  * for {@link H3DU.PbrMaterial}.</i>
  * @default
  */
  this.specular = [1, 1, 1];
 /**
  * Radius of the light source. If 0, the light's intensity doesn't change
  * with distance.
  * @default */
  this.radius = 0.0;
  if(params && params.constructor === Array) {
    this.setParams({
      "diffuse":diffuse,
      "position":params,
      "specular":specular,
      "ambient":ambient
    });
  } else if(typeof params !== "undefined" && params !== null) {
    this.setParams(params);
  }
};
/**
 * Sets parameters for this material object.
 * @param {Object} params An object whose keys have
 * the possibilities given below, and whose values are those
 * allowed for each key.<ul>
 * <li><code>position</code> - Light position. (See {@link H3DU.LightSource#position}.)
 * <li><code>ambient</code> - Not used in the default shader program.
 * <li><code>diffuse</code> - A [color vector or string]{@link H3DU.toGLColor} giving an additional color to multiply with the diffusion
 * color of each object (which is also called "albedo").
 * The default is (1, 1, 1, 1) for light index 0 and (0, 0, 0, 0) otherwise.
 * <li><code>specular</code> - A [color vector or string]{@link H3DU.toGLColor} giving the color of specular highlights caused by the light.
 * The default is (1, 1, 1) for light index 0 and (0, 0, 0) otherwise.
 * <li><code>radius</code> - Radius of the light source. If 0, the light's intensity doesn't change
 * with distance.
 * </ul>
 * If a value is null or undefined, it is ignored.
 * @returns {H3DU.Material} This object.
 * @instance
 */
H3DU.LightSource.prototype.setParams = function(params) {
  "use strict";
  if(typeof params.ambient !== "undefined" && params.ambient !== null) {
    this.ambient = H3DU.toGLColor(params.ambient);
    this.ambient = this.ambient.slice(0, 4);
  }
  if(typeof params.position !== "undefined" && params.position !== null) {
    var position = params.position;
    this.position = [position[0], position[1], position[2],
      position[3] === null ? 0.0 : position[3]];
  }
  if(typeof params.specular !== "undefined" && params.specular !== null) {
    this.specular = H3DU.toGLColor(params.specular);
  }
  if(typeof params.diffuse !== "undefined" && params.diffuse !== null) {
    this.diffuse = H3DU.toGLColor(params.diffuse);
  }
  if(typeof params.radius !== "undefined" && params.radius !== null) {
    this.radius = params.radius;
  }
  return this;
};
/* global H3DU */
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/**
 * Contains constants for assigning semantics
 * to uniforms and vertex attributes.
 * @class
 * @alias H3DU.Semantic
 */
H3DU.Semantic = {};
/** Attribute semantic for a vertex position.
 * @const
 */
H3DU.Semantic.POSITION = 0;
/** Attribute semantic for a vertex normal.
 * @const
 */
H3DU.Semantic.NORMAL = 1;
/** Attribute semantic for a texture coordinate.
 * @const
 */
H3DU.Semantic.TEXCOORD = 2;
 /** Attribute semantic for a color.
  * @const
  */
H3DU.Semantic.COLOR = 3;
  /** Attribute semantic for a skinning joint.
   * @const
   */
H3DU.Semantic.JOINT = 4;
/** Attribute semantic for a skinning weight.
 * @const
 */
H3DU.Semantic.WEIGHT = 5;
/** Attribute semantic for a tangent vector.
 * @const
 */
H3DU.Semantic.TANGENT = 6;
/** Attribute semantic for a bitangent vector.
 * @const
 */
H3DU.Semantic.BITANGENT = 7;
/** Uniform semantic for a model matrix.
 * @const
 */
H3DU.Semantic.MODEL = 101;
/** Uniform semantic for a view matrix.
 * @const
 */
H3DU.Semantic.VIEW = 102;
/** Uniform semantic for a projection matrix.
 * @const
 */
H3DU.Semantic.PROJECTION = 103;
/** Uniform semantic for a model-view matrix.
 * @const
 */
H3DU.Semantic.MODELVIEW = 104;
/** Uniform semantic for a model-view-projection matrix.
 * @const
 */
H3DU.Semantic.MODELVIEWPROJECTION = 105;
/** Uniform semantic for the inverse of the 3x3 transpose of the model view matrix.
 * @const
 */
H3DU.Semantic.MODELVIEWINVERSETRANSPOSE = 106;
/** Uniform semantic for an inverse view matrix.
 * @const
 */
H3DU.Semantic.VIEWINVERSE = 107;
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global Float32Array, H3DU, Uint16Array, Uint32Array, Uint8Array */

/**
 * A geometric mesh in the form of buffer objects.
 * @class
 * @memberof H3DU
 * @param {H3DU.Mesh} mesh A geometric mesh object.
 * A series of default attributes will be set based on that mesh's
 * data.
 */
H3DU.MeshBuffer = function(mesh) {
  "use strict";
  var vertices = new Float32Array(mesh.vertices);
  if(mesh.vertices.length >= 65536 || mesh.indices.length >= 65536) {
    this.indexBufferSize = 4;
    this.indices = new Uint32Array(mesh.indices);
  } else if(mesh.vertices.length <= 256 && mesh.indices.length <= 256) {
    this.indexBufferSize = 1;
    this.indices = new Uint8Array(mesh.indices);
  } else {
    this.indexBufferSize = 2;
    this.indices = new Uint16Array(mesh.indices);
  }
  this.format = mesh.attributeBits;
  var stride = H3DU.Mesh._getStride(this.format);
  this.attributes = [];
  this.attributes.push([H3DU.Semantic.POSITION, 0, vertices, 3, stride, 0]);
  var o = H3DU.Mesh._normalOffset(this.format);
  if(o >= 0) {
    this.attributes.push([H3DU.Semantic.NORMAL, o, vertices, 3, stride, 0]);
  }
  o = H3DU.Mesh._colorOffset(this.format);
  if(o >= 0) {
    this.attributes.push([H3DU.Semantic.COLOR, o, vertices, 3, stride, 0]);
  }
  o = H3DU.Mesh._texCoordOffset(this.format);
  if(o >= 0) {
    this.attributes.push([H3DU.Semantic.TEXCOORD, o, vertices, 2, stride, 0]);
  }
  o = H3DU.Mesh._tangentOffset(this.format);
  if(o >= 0) {
    this.attributes.push([H3DU.Semantic.TANGENT, o, vertices, 3, stride, 0]);
  }
  o = H3DU.Mesh._bitangentOffset(this.format);
  if(o >= 0) {
    this.attributes.push([H3DU.Semantic.BITANGENT, o, vertices, 3, stride, 0]);
  }
};
/**
 * Sets the array of vertex indices used by this mesh buffer.
 * @param {Uint16Array|Uint32Array|Uint8Array} indices Array of vertex indices.
 * @param {Number} byteSize Size, in bytes, of each index. Must be 1, 2, or 4.
 * @returns {H3DU.MeshBuffer} This object.
 * @instance
 */
H3DU.MeshBuffer.prototype.setIndices = function(indices, byteSize) {
  "use strict";
  if(byteSize !== 1 && byteSize !== 2 && byteSize !== 4)
    throw new Error();
  this.indexBufferSize = byteSize;
  this.indices = indices;
  return this;
};
/**
 * Sets the type of graphics primitives stored in this mesh buffer.
 * @param {Number} primType The primitive type, either {@link H3DU.Mesh.TRIANGLES},
 * {@link H3DU.Mesh.LINES}, or {@link H3DU.Mesh.POINTS}.
 * @returns {H3DU.MeshBuffer} This object.
 * @instance
 */
H3DU.MeshBuffer.prototype.setPrimitiveType = function(primType) {
  "use strict";
  if(primType === H3DU.Mesh.TRIANGLES) {
    this.format = 0;
  } else if(primType === H3DU.Mesh.LINES) {
    this.format = H3DU.Mesh.LINES_BIT;
  } else if(primType === H3DU.Mesh.POINTS) {
    this.format = H3DU.Mesh.POINTS_BIT;
  }
  return this;
};

/**
 * Adds information about a buffer attribute to this
 * mesh buffer (or sets an
 * existing attribute's information). An attribute
 * gives information about the per-vertex data used and
 * stored in a vertex buffer.
 * @param {Number|String} semantic An attribute semantic, such
 * as {@link H3DU.Semantic.POSITION}, "POSITION", or "TEXCOORD_0".
 * @param {Number} semanticIndex The set index of the attribute
 * for the given semantic.
 * 0 is the first index of the attribute, 1 is the second, and so on.
 * This is ignored if "semantic" is a string.
 * @param {Float32Array|Array} buffer The buffer where
 * the per-vertex data is stored.
 * @param {Number} startIndex The index into the array
 * (starting from 0) where the first per-vertex
 * item starts.
 * @param {Number} countPerVertex The number of elements in each
 * per-vertex item. For example, if each vertex is a 3-element
 * vector, this value is 3.
 * @param {Number} stride The number of elements from the start of
 * one per-vertex item to the start of the next.
 * @returns {H3DU.MeshBuffer} This object.Throws an error if the given
 * semantic is unsupported.
 * @instance
 */
H3DU.MeshBuffer.prototype.setAttribute = function(
  name, index, buffer, startIndex, countPerVertex, stride
) {
  "use strict";
  if(buffer.constructor === Array) {
    buffer = new Float32Array(buffer);
  }
  var semanticIndex = 0;
  var semantic = 0;
  var sem = H3DU.MeshBuffer._resolveSemantic(name, index);
  if(typeof sem === "undefined" || sem === null) {
    console.warn("Unsupported attribute semantic: " + name);
    return this;
  }
  semantic = sem[0];
  semanticIndex = sem[1];
  var attr = this._getAttribute(semantic, semanticIndex);
  if(attr) {
    attr[1] = startIndex;
    attr[2] = buffer;
    attr[3] = countPerVertex;
    attr[4] = stride;
  } else {
    this.attributes.push([semantic, startIndex, buffer, countPerVertex, stride, semanticIndex]);
  }
  if(name === "position") {
    this._bounds = null;
  }
  return this;
};
/** @ignore */
H3DU.MeshBuffer._resolveSemantic = function(name, index) {
  "use strict";
  if(typeof name === "number") {
    return [name, index | 0];
  } else {
    var wka = H3DU.MeshBuffer._wellKnownAttributes[name];
    if(typeof wka === "undefined" || wka === null) {
      var io = name.indexOf(name);
      if(io < 0) {
        return null;
      }
      wka = H3DU.MeshBuffer._wellKnownAttributes[name.substr(0, io)];
      if(typeof wka === "undefined" || wka === null) {
        return null;
      }
      var number = name.substr(io + 1);
      if(number.length <= 5 && (/^\d$/).test(number)) {
  // Only allow 5-digit-or-less numbers; more than
        // that is unreasonable
        return new Uint32Array([wka, parseInt(number, 10)]);
      } else {
        return null;
      }
    } else {
      return new Uint32Array([wka, 0]);
    }
  }
};

/** @ignore */
H3DU.MeshBuffer.prototype._getAttributes = function() {
  "use strict";
  return this.attributes;
};

/** @ignore */
H3DU.MeshBuffer.prototype._getAttribute = function(name, index) {
  "use strict";
  var idx = typeof index === "undefined" || index === null ? 0 : index;
  for(var i = 0; i < this.attributes.length; i++) {
    if(this.attributes[i][0] === name &&
    this.attributes[i][5] === idx) {
      return this.attributes[i];
    }
  }
  return null;
};

/**
 * Gets the number of primitives (triangles, lines,
 * and points) composed by all shapes in this mesh.
 * @returns {Number} Return value.
 * @instance
 */
H3DU.MeshBuffer.prototype.primitiveCount = function() {
  "use strict";
  if((this.format & H3DU.Mesh.LINES_BIT) !== 0)
    return Math.floor(this.indices.length / 2);
  if((this.format & H3DU.Mesh.POINTS_BIT) !== 0)
    return this.indices.length;
  return Math.floor(this.indices.length / 3);
};
/**
 * Gets an array of vertex positions held by this mesh buffer,
 * arranged by primitive
 * @returns {Array<Array<Number>>} An array of primitives,
 * each of which holds the vertices that make up that primitive.
 * If this mesh holds triangles, each primitive will contain three
 * vertices; if lines, two; and if points, one. Each vertex is a 3-element
 * array containing that vertex's X, Y, and Z coordinates, in that order.
 * @instance
 */
H3DU.MeshBuffer.prototype.getPositions = function() {
  "use strict";
  var count = 3;
  var primtype = this.primitiveType();
  if(primtype === H3DU.Mesh.LINES) {
    count = 2;
  }
  if(primtype === H3DU.Mesh.POINTS) {
    count = 1;
  }
  var posattr = this._getAttribute(H3DU.Semantic.POSITION);
  if(!posattr || posattr[3] < 3) {
    return [];
  }
  var primcount = this.primitiveCount();
  var stride = posattr[4];
  var v = posattr[2];
  var vindex = posattr[1];
  var ret = [];
  for(var j = 0; j < primcount; j++) {
    var jc = j * count;
    var i1 = this.indices[jc];
    var i2 = count < 2 ? i1 : this.indices[jc + 1];
    var i3 = count < 3 ? i2 : this.indices[jc + 2];
    var vi1 = i1 * stride + vindex;
    var vi2 = i2 * stride + vindex;
    var vi3 = i3 * stride + vindex;
    var primitive = [];
    primitive.push( [v[vi1], v[vi1 + 1], v[vi1 + 2]]);
    if(count >= 2) {
      primitive.push([v[vi2], v[vi2 + 1], v[vi2 + 2]]);
    }
    if(count >= 3) {
      primitive.push([v[vi3], v[vi3 + 1], v[vi3 + 2]]);
    }
    ret.push(primitive);
  }
  return ret;
};

/**
 * Finds the tightest
 * bounding box that holds all vertices in the mesh buffer.
 * @returns {Array<Number>} An array of six numbers describing the tightest
 * axis-aligned bounding box
 * that fits all vertices in the mesh. The first three numbers
 * are the smallest-valued X, Y, and Z coordinates, and the
 * last three are the largest-valued X, Y, and Z coordinates.
 * This calculation uses the attribute with the semantic POSITION
 * and set index 0. If there is no such attribute,
 * or no vertices are defined in this buffer, returns the array
 * [Inf, Inf, Inf, -Inf, -Inf, -Inf].
 * @instance
 */
H3DU.MeshBuffer.prototype.getBounds = function() {
  "use strict";
  if(!this._bounds) {
    var empty = true;
    var inf = Number.POSITIVE_INFINITY;
    var ret = [inf, inf, inf, -inf, -inf, -inf];
    var posattr = this._getAttribute(H3DU.Semantic.POSITION);
    if(!posattr || posattr[3] < 3)return ret;
    var stride = posattr[4];
    var v = posattr[2];
    var vindex = posattr[1];
    for(var j = 0; j < this.indices.length; j++) {
      var vi = this.indices[j] * stride + vindex;
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
    this._bounds = ret.slice(0, 6);
    return ret;
  }
  return this._bounds.slice(0, 6);
};
/**
 * Gets the type of primitive stored in this mesh buffer.
 * @returns {Number} Either {@link H3DU.Mesh.TRIANGLES},
 * {@link H3DU.Mesh.LINES}, or {@link H3DU.Mesh.POINTS}.
 * @instance
 */
H3DU.MeshBuffer.prototype.primitiveType = function() {
  "use strict";
  if((this.format & H3DU.Mesh.LINES_BIT) !== 0)
    return H3DU.Mesh.LINES;
  if((this.format & H3DU.Mesh.POINTS_BIT) !== 0)
    return H3DU.Mesh.POINTS;
  return H3DU.Mesh.TRIANGLES;
};
H3DU.MeshBuffer._wellKnownAttributes = {
  "POSITION":0,
  "TEXCOORD":2,
  "TEXCOORD_0":2,
  "NORMAL":1,
  "JOINT":4,
  "WEIGHT":5,
  "TANGENT":6,
  "BITANGENT":7
};

/** @ignore */
H3DU.MeshBuffer.prototype.getFormat = function() {
  "use strict";
  return this.format;
};
/**
 * Gets the number of vertices in this mesh buffer
 * @returns {Number} Return value.
 * @instance
 */
H3DU.MeshBuffer.prototype.vertexCount = function() {
  "use strict";
  return this.indices.length;
};
/*
 Any copyright to this file is released to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/
 If you like this, you should donate
 to Peter O. (original author of
 the Public Domain HTML 3D Library) at:
 http://peteroupc.github.io/
*/
/* global H3DU */
/* exported BezierCurve, BezierSurface, BSplineCurve, BSplineSurface, BufferedMesh, FrameBuffer, GLUtil, GLMath, CurveEval, SurfaceEval, Lights, LightSource, Material, Mesh, Meshes, Scene3D, ShaderProgram, Shape, ShapeGroup, Texture, TextureLoader, Transform, ShaderInfo, RenderPass3D */
/** @deprecated Use {@link H3DU.BezierCurve} instead. */
var BezierCurve = H3DU.BezierCurve;
/** @deprecated Use {@link H3DU.BezierSurface} instead. */
var BezierSurface = H3DU.BezierSurface;
/** @deprecated Use {@link H3DU.BSplineCurve} instead. */
var BSplineCurve = H3DU.BSplineCurve;
/** @deprecated Use {@link H3DU.BSplineSurface} instead. */
var BSplineSurface = H3DU.BSplineSurface;
/** @deprecated Use H3DU instead. */
var GLUtil = H3DU;
var GLMath = H3DU.Math;
var BufferedMesh = H3DU.BufferedMesh;
var FrameBuffer = H3DU.FrameBuffer;
var CurveEval = H3DU.CurveEval;
var SurfaceEval = H3DU.SurfaceEval;
var Lights = H3DU.Lights;
var LightSource = H3DU.LightSource;
var Material = H3DU.Material;
var Mesh = H3DU.Mesh;
var Meshes = H3DU.Meshes;
var Scene3D = H3DU.Scene3D;
var ShaderProgram = H3DU.ShaderProgram;
var Shape = H3DU.Shape;
var ShapeGroup = H3DU.ShapeGroup;
var Texture = H3DU.Texture;
var TextureLoader = H3DU.TextureLoader;
var Transform = H3DU.Transform;
