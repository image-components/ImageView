;(function() {
    'use strict'
   var win = window,
      doc = win.document;

  var w3c = window.dispatchEvent,
        fixEvent = function(event) {
            var target = event.target = event.srcElement;
            event.which = event.charCode != null ? event.charCode : event.keyCode;
            if (/mouse|click/.test(event.type)) {
                var doc = target.ownerDocument || doc
                var box = doc.compatMode === 'BackCompat' ? doc.body : doc.documentElement
                event.pageX = event.clientX + (box.scrollLeft >> 0) - (box.clientLeft >> 0)
                event.pageY = event.clientY + (box.scrollTop >> 0) - (box.clientTop >> 0)
            }
            event.preventDefault = function() {
                event.returnValue = false
            }
            event.stopPropagation = function() {
                event.cancelBubble = true
            }
            return event
        },
        bind = function(ele, name, func, bubble) {
            function callback(e) {
                var ex = e.target ? e : fixEvent(e || window.event)
                var ret = func.call(ele, e)
                if (ret === false) {
                    ex.preventDefault()
                    ex.stopPropagation()
                }
                return ret
            }
            if (w3c) {
                ele.addEventListener(name, callback, !!bubble)
            } else {
                try {
                    ele.attachEvent('on' + name, callback)
                } catch (e) {}
            }
            return callback;
        },
        unbind = w3c ? function(ele, name, func, bubble) {
            ele.removeEventListener(name, func, !!bubble)
        } : function(ele, name, func, bubble) {
            ele.detachEvent('on' + name, func)
        },
        transforms = ['transform', '-webkit-transform', '-moz-transform', '-o-transform', '-ms-transform'],
        transitions = ['transition', '-webkit-transition', '-moz-transition', '-o-transition', '-ms-transition'];

    var EVENT_OBJ = {};

    var EVENT = {
        on: function(ele, name, func, bubble) {
            return bind(ele, name, func, bubble)
        },

        off: function(ele, name, func, bubble) {
            unbind(ele, name, func, bubble)
        },

        stop: function(e) {
            e.stopPropagation();
            e.preventDefault();
        }

    };

    if (!bind.bind) {
        Function.prototype.bind = function(context) {
            var that = this;
            var args = Array.prototype.slice.call(arguments, 1);
            return function() {
                var ars = args.concat();
                ars.push.apply(ars, arguments)
                return that.apply(context, ars);
            };
        };
    }

    function getParentElement(ele) {
      if (ele.parentElement) return ele.parentElement;
      var ret = ele.parentNode;
      while (ret.nodeType !== 1) {
        ret = ret.parentNode;
      }
      return ret;
    }

  function ImageView(img, options) {
    var that = this;
    if (!img) return;
    var newImg = new Image();
    this.img = img;
    this.img.style.visibility = 'hidden';
    this.options = options || {};
    if (typeof this.options.scaleNum === 'undefined') this.options.scaleNum = 2;
    this.options.scaleNum = parseFloat(this.options.scaleNum) || 2;
    if (typeof this.options.movingCheck === 'undefined') this.options.movingCheck = true;
    this.options.movingCheck = !!this.options.movingCheck;
    newImg.src = this.img.src;
    if (!newImg.complete) {
      newImg.onload = newImg.onerror = function() {
        that.img.style.display = 'block';
        that.container = getParentElement(img);
        that.init();
        that.bindEvts();
      };
      var interval = setInterval(function() {
        if (newImg.complete) {
          clearInterval(interval);
          newImg.onload();
        }
      }, 100)
    } else {
      setTimeout(function() {
        that.img.style.display = 'block';
        that.container = getParentElement(img);
        that.init();
        that.bindEvts();
      }, 100)
    }
  }

  ImageView.prototype = {

    constructor: ImageView,

    destroy: function() {
      EVENT.off(this.img, 'mousedown', this.__mosuedown);
      this.container && EVENT.off(this.container, this.wheelType, this.__mosuewheel);
      this.container && this.container.removeChild(this.div);
      if (!this.imgStyle) return;
      this.imgStyle.display = '';
      this.imgStyle.position = '';
      this.imgStyle.width = '';
      this.imgStyle.height = '';
      this.imgStyle.maxWidth = '';
      this.imgStyle.maxHeight = '';
      this.imgStyle.visibility = 'hidden';
      var i = 0, len;
      for (i = 0, len = transitions.length; i < len; i++) {
        this.imgStyle[transitions[i]] = 'none';
      }
      for (i = 0, len = transforms.length; i < len; i++) {
        this.imgStyle[transforms[i]] = '';
      }
    },

    init: function() {
      if (this.options.onload) this.options.onload();
      this.initPos = {
        x: 0,
        y: 0
      };
      // this.lastW = this.w;
      // this.lastH = this.h;
      this.zoom = 100;
      this.deg = 0;
      this.reverse = 0;
      this.getRes();
      this.posi = {};
      this.c = {};
      this.maxBounds = {};
      this.imgStyle = this.img.style;
      if (!this.div) {
        this.div = doc.createElement('div');
        this.divStyle = this.div.style;
        this.initStyles();
        this.container.appendChild(this.div);
      }
      var i = 0, len;
      for (i = 0, len = transitions.length; i < len; i++) {
        this.imgStyle[transitions[i]] = '';
      }
      this.resized();
      this.imgStyle.visibility = 'visible';
    },

    resized: function() {
      this.imgStyle.width = '';
      this.imgStyle.height = '';
      this.imgStyle.maxWidth = 'none';
      this.imgStyle.maxHeight = 'none';
      this.maxW = this.container.offsetWidth;
      this.maxH = this.container.offsetHeight;
      this.refresh();
      this.ow = this.w;
      this.oh = this.h;
      this.center({
        x: 0,
        y: this.h > this.maxH ? (this.h - this.maxH) / 2 : 0
      });
      this.checkSize();
    },

    getRes: function() {
      this.res = 1 / (this.zoom / 100);
      return this.res;
    },

    getResFromZoom: function(zoom) {
      return (1 / (zoom / 100));
    },

    checkSize: function() {
      var per, per1;
      if (this.w > this.maxW) {
        per = this.maxW / this.w;
      }
      if (this.h > this.maxH) {
        per1 = this.maxH / this.h;
      }
      if (per && per1) {
        per = Math.min(per, per1);
        this.scale(per - 1);
      } else if (per && !per1) {
        this.scale(per - 1);
      } else if (!per && per1) {
        this.scale(per1 - 1);
      }
    },

    initStyles: function() {
      this.container.style.position = 'relative';
      this.container.style.overflow = 'hidden';
      this.imgStyle.position = 'absolute';
      this.divStyle.position = 'absolute';
      var zIndex = this.imgStyle.zIndex || 0;
      this.divStyle.zIndex = zIndex - 100;
    },

    scale: function(scale, poi) {
      var w = this.w;
      var h = this.h;
      w += w*scale*this.options.scaleNum;
      h += h*scale*this.options.scaleNum;
      this.computeScale(w);
      if (this.zoom <= 20) {
        w = 20 / 100 * this.ow;
        h = 20 / 100 * this.oh;
      }
      // this.lastW = this.w;
      // this.lastH = this.h;
      if (this.reverse) {
        this.imgStyle.width = h + 'px';
        this.imgStyle.height = w + 'px';
      } else {
        this.imgStyle.width = w + 'px';
        this.imgStyle.height = h + 'px';
      }
      
      this.refresh();
      if (!poi) poi = {x:0,y:0};
      this.center({
        x: 0,
        y: 0 // (this.c.y - ((this.h - this.lastH)/this.lastH) * this.getPosFromPx({x:0,y:poi.y}).y) * (this.getRes()) // 0
      });
      this.checkBoundary(true);
    },

    computeScale: function(w) {
      w || (w = this.w)
      this.zoom = w / this.ow * 100;
      if (this.zoom < 20) {
        this.zoom = 20;
      }
    },

    bindEvts: function() {
      this.__mosuedown = EVENT.on(this.img, 'mousedown', this.mousedown.bind(this));
      var wheelType = 'mousewheel';
      try {
        doc.createEvent('MouseScrollEvents');
        wheelType = 'DOMMouseScroll';
      } catch(e) {}
      this.wheelType = wheelType;
      this.__mosuewheel = EVENT.on(this.container, wheelType, this.mousewheel.bind(this));
    },

    mousewheel: function(e) {
      if (!e.shiftKey) return;
      var delta;
      if (e.wheelDelta) {
        delta = e.wheelDelta / 120;
      } else if ('detail' in e) {
        delta = (-e.detail * 40) / 120;
      }
      this.scale(delta*0.1, {
        x: e.pageX,
        y: e.pageY
      });
      EVENT.stop(e);
    },

    mousedown: function(e) {
      var that = this,
        startPos = {
          x: e.pageX,
          y: e.pageY
        },
        initPosi = {
          top: this.posi.top,
          left: this.posi.left
        },
        mousemove = function(e) {
          EVENT.stop(e);
          if (that._mouseDown && startPos) {
            var x = e.pageX;
                  var y = e.pageY;
                  var diffX = x - startPos.x;
                  var diffY = y - startPos.y;
                  that.pos({
              top: initPosi.top + diffY,
              left: initPosi.left + diffX
            });
            if (that.options.movingCheck) {
              that.checkBoundary(true);
            }
          }
          return false;
        },
        mouseup = function(e) {
          EVENT.stop(e);
                that._mouseDown = false;
                startPos = null;
                ended();
        },
        ended = function() {
          EVENT.off(doc, 'mousemove', _mousemove);
          EVENT.off(doc, 'mouseup', _mouseup);
          that.imgStyle.cursor = 'default';
          that.checkBoundary();
        };
      EVENT.stop(e);
      this._mouseDown = true;
      this.imgStyle.cursor = 'move';
      var _mousemove = EVENT.on(doc, 'mousemove', mousemove);
      var _mouseup = EVENT.on(doc, 'mouseup', mouseup);
    },

    checkBoundary: function(disClass) {
      if (this.bounds.right < this.maxBounds.right || this.bounds.left > this.maxBounds.left ||
        this.bounds.top > this.maxBounds.top || this.bounds.bottom < this.maxBounds.bottom) {
        // 此时 超出范围了
        var x = this.c.x;
        var y = this.c.y;
        if (this.bounds.right < this.maxBounds.right) {
          x -= (this.bounds.right - this.maxBounds.right);
        }
        if (this.bounds.left > this.maxBounds.left) {
          x -= (this.bounds.left - this.maxBounds.left);
        }
        if (this.bounds.top > this.maxBounds.top) {
          y -= (this.bounds.top - this.maxBounds.top);
        }
        if (this.bounds.bottom < this.maxBounds.bottom) {
          y -= (this.bounds.bottom - this.maxBounds.bottom);
        }
        if (!disClass) {
          this.img.className += ' ani';
          setTimeout(function() {
            this.img.className = this.img.className.replace(/\bani\b/g, '');
          }.bind(this), 50)
        }
        this.center({
          x: x,
          y: y
        });
      }

    },

    getBounds: function() {
      return {
        top: this.c.y - this.h / 2,
        right: this.c.x  + this.w / 2,
        bottom: this.c.y + this.h / 2,
        left: this.c.x - this.w / 2
      }
    },

    _bounds: function() {
      this.bounds = this.getBounds();
    },

    center: function(pos) {
      if (pos) {
        if (this.w < this.maxW) {
          pos.x = 0;
        }
        if (this.h < this.maxH) {
          pos.y = 0;
        }
        this.c.x = pos.x;
        this.c.y = pos.y;
        this.pos({
          left: this.c.x - this.maxBounds.left - this.w / 2,
          top: this.c.y - this.maxBounds.top - this.h / 2
        });
        if (!this.reverse) {
          this.refresh();
        }
      } else {
        this.c.x = this.maxBounds.left + this.posi.left + this.w / 2;
        this.c.y = this.maxBounds.top + this.posi.top + this.h / 2;
      }
      this._bounds();
      return this.c;
    },

    pos: function(obj) {
      if (obj) {
        this.posi = {
          top: parseInt(obj.top) || 0,
          left: parseInt(obj.left) || 0
        };
        this.divStyle.top = this.posi.top + 'px';
          this.divStyle.left = this.posi.left + 'px';
          if (this.reverse) {
            this.imgStyle.top = (this.img.offsetWidth - this.w) / 2 + this.posi.top + 'px';
            this.imgStyle.left = (this.img.offsetHeight - this.h) / 2 + this.posi.left + 'px';
          } else {
            this.imgStyle.top = this.posi.top + 'px';
            this.imgStyle.left = this.posi.left + 'px';
          }
          this.center();
      } else {
        this.posi = {
          top: parseInt(this.divStyle.top, 10) || 0,
          left: parseInt(this.divStyle.left, 10) || 0
        };
      }
      return this.posi;
    },

    getPosFromPx: function(px) {
      return {
        x: px.x - this.container.offsetLeft + this.maxBounds.left,
        y: px.y - this.container.offsetTop + this.maxBounds.top
      }
    },

    rotate: function(deg) {
      this.center({
        x: 0,
        y: 0
      });
      this.deg = parseFloat(deg);
      var rotate = 'rotate(' + deg + 'deg)';
      for (var i = 0, len = transforms.length, v; i < len; i++) {
        this.imgStyle[transforms[i]] = rotate;
      }
      this.checkReverse(this.deg);
      this.imgStyle.width = '';
      this.imgStyle.height = '';
      this.refresh();
      // this.checkBoundary(true);
      this.checkSize();
      this.center({
        x:0,
        y:0
      });
    },

    checkReverse: function(deg) {
      if (deg) {
        deg = parseInt(deg);
        if (deg % 180 !== 0 && deg % 90 === 0) {
          // 在 90度 方向上
          return (this.reverse = deg);
        }
        return (this.reverse = 0);
      }
      for (var i = 0, len = transforms.length, v; i < len; i++) {
        if (transforms[i] in this.imgStyle) {
          v = this.imgStyle[transforms[i]];
          if (v) {
            v = v.match(/\brotate\((.+?)\)\s?/);
            if (v && v.length > 1) {
              v = parseInt(v[1]);
              if (v % 180 !== 0 && v % 90 === 0) {
                // 在 90度 方向上
                return (this.reverse = v);
              }
            }
          }
        }
      }
      return (this.reverse = 0);
    },

    _updateDiv: function(top, left) {
      var w, h, tmp;
      if (this.reverse) {
        // 
        w = this.h;
        h = this.w;
        this.divStyle.width = w + 'px';
        this.divStyle.height = h + 'px';
        tmp = (this.reverse / 90);
        if ((tmp >= 0 && tmp % 2 === 0) || (tmp < 0 && tmp % 2 !== 0)) {
          // top => 右
          tmp = left;
          left = top;
          top = tmp;
          this.divStyle.left = left + 'px';
            this.divStyle.top = top + 'px';
        } else {
          // top => 左
          tmp = left;
          left = top + w - this.maxW;
          top = tmp;
          this.divStyle.left = left + 'px';
            this.divStyle.top = top + 'px';
        }
      } else {
        w = this.w;
        h = this.h;
          this.divStyle.width = w + 'px';
        this.divStyle.height = h + 'px';
        this.divStyle.left = left;
          this.divStyle.top = top;
      }
      this.w = w;
      this.h = h;
      // 宽 高 都小于
      if (w < this.maxW && h < this.maxH) {
        // 不变
        this.pos({
          top: (this.maxH - h) / 2,
          left: (this.maxW - w) / 2
        });
      } else if (w < this.maxW) {
        // 宽度小于最小宽度
        this.pos({
          top: top,
          left: (this.maxW - w) / 2
        });
      } else if (h < this.maxH) {
        this.pos({
          top: (this.maxH - h) / 2,
          left: left
        });
      } else {
        this.pos();
        this.center();
      }
    },

    refresh: function() {
      this.maxBounds = {
        top: -this.maxH / 2,
        right: this.maxW / 2,
        bottom: this.maxH / 2,
        left: -this.maxW / 2
      };
      this.w = this.img.offsetWidth;
      this.h = this.img.offsetHeight;
      var top = parseInt(this.divStyle.top, 10) || 0;
      var left = parseInt(this.divStyle.left, 10) || 0;
      this._updateDiv(top, left);
    }

  };

  win.ImageView = ImageView;

  return ImageView;
})()
