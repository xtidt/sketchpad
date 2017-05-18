'use strict';
//嵌入样式表
// require('../demo/css/app.less');

var isMobile = !!navigator.userAgent.match(/(iPhone|iPod|Android|ios|ipad)/i);

var UISketchpad = {
    index: 0,
    container: null,
    canvas: null,
    context: null,
    paint: false, //正在绘制状态

    //设置舞台宽度
    canvasWidth: document.documentElement.clientWidth,
    canvasHeight: document.documentElement.clientHeight,

    //默认设置
    defaultOptions: {
        Color: "red",
        Alpha: 1,
        Tool: "pen",
        Size: "small",
    },

    //当前画线笔触
    templine: {
        points: [],
        color: null,
        alpha: null,
        tool: null,
        size: null
    },

    //线数组
    lines: new Array(),

    //当前笔触
    curTool: null,
    curColor: null,
    curSize: null,
    curAlpha: null,

    //时间触发器
    emitTime: {
        start: 0,
        end: 0,
        debounce: 10
    },

    //设置批注的最小宽高
    minSize: {
        width: '100px',
        height: '30px'
    },

    //事件触发器
    events: {},

    //初始化舞台
    create: function() {
        var canvasDiv = document.getElementById(this.container);
        var style = window.getComputedStyle(canvasDiv);
        this.canvasWidth = parseInt(style.width, 10);
        this.canvasHeight = parseInt(style.height, 10);

        var canvas = this.canvas = document.createElement('canvas');
        canvas.setAttribute('width', style.width);
        canvas.setAttribute('height', style.height);
        canvas.setAttribute('id', 'canvas');
        canvasDiv.appendChild(canvas);
        this.context = canvas.getContext("2d");
    },

    getPosition: function(e) {
        var _temp = new Object();

        //fixed surface下touch事件问题
        try {
            if (!!e.changedTouches) {
                isMobile = true;
            } else {
                isMobile = false;
            }
        } catch (error) {

        }

        if (isMobile) {
            var touches = e.changedTouches;
            _temp.offsetX = app.canvas.getBoundingClientRect().left;
            _temp.offsetY = app.canvas.getBoundingClientRect().top;
            _temp.x = touches[0].pageX - _temp.offsetX;
            _temp.y = touches[0].pageY - _temp.offsetY;
        } else {
            _temp.x = e.offsetX;
            _temp.y = e.offsetY;
        }
        return _temp;
    },

    /**
     * 事件触发器
     */
    delegate: function() {
        var _self = this;
        //事件注册
        var handleStart = function(e) {
            var mouseX = _self.getPosition(e).x,
                mouseY = _self.getPosition(e).y;

            if (_self.curTool == "pen" || _self.curTool == "marker") {
                _self.paint = true;
                _self.addLine(mouseX, mouseY, false);
            } else if (_self.curTool == "easer") {
                _self.paint = true;
                //橡皮擦工具 碰撞检测
                var willdelLine = _self.checkIntersection(mouseX, mouseY);
                if (willdelLine != null) {
                    _self.delSingleLine(willdelLine);
                }
            } else if (_self.curTool == "remarks") {
                _self.paint = true;
                _self.rectangle._creat({ x: mouseX, y: mouseY });
            };

            e.preventDefault();
        };

        //listener end 完成画线事件
        var handleEnd = function(e) {
            mouseReset();

            //只在批注时更新状态
            if (_self.curTool == "remarks") {
                _self.rectangle._definite();
            };

            e.preventDefault();
        };

        //listener mouseleave 超出画布区域事件
        var handleCancel = function(e) {
            var mouseX = _self.getPosition(e).x,
                mouseY = _self.getPosition(e).y;

            //超出边界
            if (mouseX > _self.canvasWidth || mouseY > _self.canvasHeight) {
                //批注 正在绘制时超出边界检测
                if (_self.curTool == "remarks" && !_self.rectangle._hasDone && _self.rectangle._isPaiting) {
                    //清除非正常结束的矩形框
                    _self.rectangle._cancel();
                }

                if (_self.curTool == "pen" || _self.curTool == "marker") {
                    mouseReset();
                }
            };

            e.preventDefault();
        };

        function _loop(e) {
            var mouseX = _self.getPosition(e).x,
                mouseY = _self.getPosition(e).y;

            //橡皮擦的响应
            //橡皮擦工具 && 碰撞检测
            if (_self.curTool == "easer" && _self.paint == true) {
                var willdelLine = _self.checkIntersection(mouseX, mouseY);
                if (willdelLine != null) {
                    _self.delSingleLine(willdelLine);
                }
            }

            //批注
            if (_self.curTool == "remarks" && _self.paint == true) {
                _self.rectangle._change({ x: mouseX, y: mouseY });
            }

            //画笔的过滤高频响应
            _self.emitTime.end = new Date().getTime();
            if ((_self.emitTime.end - _self.emitTime.start) < _self.emitTime.debounce) {
                return;
            } else {
                _self.emitTime.start = _self.emitTime.end;
            };

            //画笔与萤火笔情况 
            if (_self.paint == true && (_self.curTool == "pen" || _self.curTool == "marker")) {
                _self.addLine(mouseX, mouseY, true);

                //重新绘制原始数据
                _self.clearCanvas();
                _self.drawOldLines();

                //绘制新线
                _self.drawLine();
            };
        }

        var handleMove = function(e) {
            var event = e;
            //通过requestAnimationFrame来更新界面 解决性能问题
            requestAnimationFrame(function(e) {
                _loop(event);
            });

            e.preventDefault();
        };

        //mouseup || mouseleave handle 操作完成，数据推送与下一画笔准备事件
        var mouseReset = function() {
            if (_self.paint == true) {
                _self.paint = false;
                _self.templine.id = _self.index;
                _self.index++;
                _self.lines.push(_self.templine);

                //发送IM
                _self.events.addOne(_self.templine);
                //reset arrays
                _self.resetTempline();
            };
        };

        // if (isMobile) {}
        // 移动端事件监听
        _self.canvas.addEventListener("touchstart", handleStart, false);
        _self.canvas.addEventListener("touchend", handleEnd, false);
        _self.canvas.addEventListener("touchmove", handleMove, false);
        _self.canvas.addEventListener("touchcancel", handleCancel, false);
        // pc端事件监听
        //mousedown事件
        _self.canvas.addEventListener("mousedown", handleStart, false);
        //mousemove事件
        _self.canvas.addEventListener("mousemove", handleMove, false);
        //listener end 完成画线事件
        _self.canvas.addEventListener("mouseup", handleEnd, false);
        //listener mouseleave 超出画布区域事件
        _self.canvas.addEventListener("mouseleave", handleCancel, false);
    },

    /**
     * Adds a point to the drawing array.
     * @param x
     * @param y
     * @param flag
     */
    addLine: function(x, y, flag) {
        var _self = this;
        _self.templine.points.push({ "x": x, "y": y });
        _self.templine.tool = _self.curTool;
        _self.templine.color = _self.curColor;
        _self.templine.alpha = _self.curAlpha;
        _self.templine.size = _self.curSize;
    },

    /**
     * 画笔工具参数设置
     * ${param type} 0:pen,  1:marker,  2:easer
     ***/
    toolsSet: function() {
        var _self = this;
        if (_self.curTool == "pen") { //实心笔
            _self.curAlpha = 1;
            _self.curSize = "normal";
        } else if (_self.curTool == "marker") { //萤光笔
            _self.curAlpha = 0.15;
            _self.curSize = "huge";
        } else if (_self.curTool == "easer") { //橡皮擦

        }

    },

    /**
     * 画笔笔触大小设置
     * 画笔半径大小设置
     * ${param} item
     * 输入笔触的数据对象
     */
    brushworkSet: function(item) {
        var radius = 0;

        if (item.size == "small") {
            radius = 2;
        } else if (item.size == "normal") {
            radius = 5;
        } else if (item.size == "large") {
            radius = 10;
        } else if (item.size == "huge") {
            radius = 20;
        } else {
            radius = 0;
        }

        return radius;
    },

    /**
     * 绘制原始数据 基于数据<Array>
     * */
    drawOldLines: function() {
        var _self = this;
        for (var i = 0, l = _self.lines.length; i < l; i++) {
            var item = _self.lines[i];
            _self.drawSingleLines(item);
        }
    },

    /**
     * 绘制一条线 可复用
     * @{param item} 数据元素数据
     */
    drawSingleLines: function(item) {
        var _self = this;
        var radius = null;

        //工具参数设置
        _self.toolsSet();

        //set size
        radius = _self.brushworkSet(item);

        _self.context.strokeStyle = item.color;
        _self.context.globalAlpha = item.alpha;

        for (var i = 0, l = item.points.length; i < l; i++) {
            //begin a new path
            _self.context.beginPath();

            if (i) {
                _self.context.moveTo(item.points[i - 1].x, item.points[i - 1].y);
            } else {
                _self.context.moveTo(item.points[i].x, item.points[i].y);
            }

            _self.context.lineTo(item.points[i].x, item.points[i].y);
            _self.context.closePath();

            _self.context.lineJoin = "round";
            _self.context.lineWidth = radius;
            _self.context.stroke();
        };

        //end a the new path
        _self.context.restore();
    },

    /**
     * nw端实时绘制当前线
     * */
    drawLine: function() {
        var _self = this;

        /*pen size*/
        var radius;

        _self.toolsSet();

        for (var i = 0, l = _self.templine.points.length; i < l; i++) {
            radius = _self.brushworkSet(_self.templine);

            _self.context.beginPath();

            if (i) {
                _self.context.moveTo(_self.templine.points[i - 1].x, _self.templine.points[i - 1].y);
            } else {
                _self.context.moveTo(_self.templine.points[i].x, _self.templine.points[i].y);
            }
            _self.context.lineTo(_self.templine.points[i].x, _self.templine.points[i].y);
            _self.context.closePath();

            _self.context.strokeStyle = _self.templine.color;
            _self.context.globalAlpha = _self.templine.alpha;

            _self.context.lineJoin = "round";
            _self.context.lineWidth = radius;
            _self.context.stroke();
        }

        _self.context.restore();
    },

    /**
     * 重置当前笔触数据
     */
    resetTempline: function() {
        this.templine = {
            points: [],
            color: null,
            alpha: null,
            tool: null,
            size: null
        }
    },

    /**
     * clear canvas
     * 清除画布 并不删除数据
     * */
    clearCanvas: function() {
        this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    },

    /**
     * 清除画布并删除数据
     */
    clearAndEmpty: function() {
        var _self = this;
        _self.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        _self.resetTempline();
        _self.lines = [];

        //发送IM
        _self.events.delAll();
    },

    /**
     * 检测是否交界
     * @{param} x, y
     * @return 碰撞的线
     * */
    checkIntersection: function(x, y) {
        var _self = this;
        var x1, x2, y1, y2;
        var boo = false;
        var willDelLine = null;

        for (var i = 0, len = _self.lines.length; i < len; i++) {
            var item = _self.lines[i];
            for (var j = 0, jlen = item.points.length - 1; j < jlen; j++) {
                x1 = item.points[j].x;
                x2 = item.points[j + 1].x;
                y1 = item.points[j].y;
                y2 = item.points[j + 1].y;

                boo = _self.checkout({
                    x1: x1,
                    y1: y1,
                    x2: x2,
                    y2: y2,
                    x: x,
                    y: y
                });

                if (boo) {
                    willDelLine = i;
                }
            }
        };

        return willDelLine;
    },

    /***
     * 数学公式计算斜率
     * 换算斜率公式
     * 求点到直线的距离
     */
    checkout: function(options) {
        var x1 = options.x1,
            x2 = options.x2,
            y1 = options.y1,
            y2 = options.y2,
            x = options.x,
            y = options.y;

        var radio = 10; //检测半径

        var returnBoo = false; //default
        var boundary = 15;

        var maxX = Math.max(x1, x2) + radio,
            maxY = Math.max(y1, y2) + radio,
            minX = Math.min(x1, x2) - radio,
            minY = Math.min(y1, y2) - radio;

        //设置检测区域    
        //判断是否在检测区域内
        if (x > minX && x < maxX && y > minY && y < maxY) {
            var l = Math.abs((y2 - y1) * x - (x2 - x1) * y + (x2 - x1) * y1 - (y2 - y1) * x1);
            var value = Math.sqrt(Math.pow((y2 - y1), 2) + Math.pow((x2 - x1), 2));

            if (l / value < boundary) {
                returnBoo = true;
            }
        }

        return returnBoo;
    },

    /**
     * 工具选择
     * ${param type} 0:pen,  1:marker,  2:easer
     ***/
    changeTool: function(type) {
        var _self = this;
        switch (type) {
            case 0:
                _self.curTool = "pen";
                break;
            case 1:
                _self.curTool = "marker";
                break;
            case 2:
                _self.curTool = "easer";
                break;
            case 3:
                _self.curTool = "remarks";
                break;
            default:
                break;
        };

        _self.events.selectTool();
    },

    /**
     * change color
     */
    changeColor: function(color) {
        var _self = this;
        _self.curColor = color;

        //监测
        _self.events.selectColor();
    },

    /**
     * 空函数
     */
    _noop: function() {},

    /**
     * 通过 index 删除单一线 并绘制出来
     * */
    delSingleLine: function(index) {
        var _self = this;
        //发送IM
        _self.events.delOne(_self.lines[index].id);

        _self.lines.splice(index, 1);

        //重新绘制
        _self.clearCanvas();
        _self.drawOldLines();
    },

    /**
     * 添加单一线 并绘制出来
     * */
    addSingleLine: function(item) {
        var _self = this;
        _self.lines.push(item);

        //重新绘制
        _self.clearCanvas();
        _self.drawOldLines();

        //发送IM
        _self.events.addOne(item);
    },

    /**
     * 通过id删掉某一线
     */
    delOne: function(id) {
        var _self = this;
        //发送IM
        _self.events.delOne(id);

        var line = _self.lines.filter(function(line) {
            return line.id == id
        })[0];

        for (var i = 0, len = _self.lines.length; i < len; i++) {
            var line = _self.lines[i];
            if (line.id == id) {
                _self.lines.splice(i, 1);
                break;
            }
        }

        //重新绘制
        _self.clearCanvas();
        _self.drawOldLines();
    },


    //绘制一个矩形
    rectangle: {
        _isPaiting: false, //正在绘制状态
        _hasDone: false, //是否完成矩形绘制
        _target: null,
        _startpoints: {},
        _endpoints: {},
        _creat: function(options) {
            //若完成了矩形绘制则不再绘制
            if (this._hasDone) return;
            this._isPaiting = true;

            var div = document.createElement('div');
            div.setAttribute('class', 'remarks');
            div.setAttribute('style', 'left:' + options.x + 'px; top:' + options.y + 'px;');
            this._startpoints = {
                "x": options.x,
                "y": options.y
            };

            document.getElementById(UISketchpad.container).appendChild(div);
            this._build();
        },

        _build: function() {
            var _selfRec = this;
            //ok
            var okBtn = document.createElement("div");
            okBtn.setAttribute("class", "ok_btn hidden");
            //cancel
            var cancelBtn = document.createElement("div");
            cancelBtn.setAttribute("class", "cancel_btn hidden");
            //textarea
            var textArea = document.createElement("textarea");
            textArea.setAttribute("class", "textarea hidden");

            _selfRec._target = document.getElementsByClassName('remarks')[0];
            _selfRec._target.appendChild(okBtn);
            _selfRec._target.appendChild(cancelBtn);
            _selfRec._target.appendChild(textArea);

            setTimeout(function() {
                _selfRec._handler();
            }, 50);
        },

        _handler: function() {
            var _selfRec = this;

            if (document.getElementsByClassName('remarks').length > 0) {
                document.getElementsByClassName('ok_btn')[0].addEventListener('click', function() {
                    _selfRec._finished();
                }, false);

                document.getElementsByClassName('cancel_btn')[0].addEventListener('click', function() {
                    _selfRec._cancel();
                }, false);
            }
        },

        _change: function(options) {
            if (this._isPaiting) {
                var deviation = 5;

                this._endpoints = {
                    "x": options.x,
                    "y": options.y
                };
                var w = this._endpoints.x - this._startpoints.x;
                var h = this._endpoints.y - this._startpoints.y;
                this._target.style.width = w - deviation + "px";
                this._target.style.height = h - deviation + "px";
            }
        },

        _definite: function() {
            var _selfRec = this;
            var _self = UISketchpad;
            if (document.getElementsByClassName("remarks").length > 0) {
                document.getElementsByClassName("ok_btn")[0].setAttribute('class', 'ok_btn');
                document.getElementsByClassName("cancel_btn")[0].setAttribute('class', 'cancel_btn');
                document.getElementsByClassName("textarea")[0].setAttribute('class', 'textarea');
                _selfRec._isPaiting = false;
                _selfRec._hasDone = true;

                //设置默认最小尺寸
                if (parseInt(_selfRec._target.style.width) < parseInt(_self.minSize.width)) {
                    _selfRec._target.style.width = _self.minSize.width;
                }

                if (parseInt(_selfRec._target.style.width) < parseInt(_self.minSize.height)) {
                    _selfRec._target.style.width = _self.minSize.height;
                }

            }
        },

        _finished: function() {
            var _selfRec = this;
            this._writeTextOnCanvas(_selfRec._cancel);
        },

        _cancel: function() {
            var _selfRec = UISketchpad.rectangle;
            if (document.getElementsByClassName('remarks').length > 0) {
                document.getElementById('canvasDiv').removeChild(document.getElementsByClassName('remarks')[0]);
            }

            _selfRec._hasDone = false;
        },

        _writeTextOnCanvas: function(callback) {
            var _selfRec = this;
            var ctx = UISketchpad.context; //ctx对象
            var lineheight = 30; //字行高
            var fontsize = 24; //字体大小
            var textString = document.getElementsByClassName("textarea")[0].value; //内容
            var rw = (_selfRec._endpoints.x - _selfRec._startpoints.x) / (fontsize / 1.6); //行内宽度
            ctx.font = fontsize + "px 微软雅黑"; //字体类型与字号
            ctx.fillStyle = "#f00"; //字体颜色

            for (var i = 1; UISketchpad._util.getTrueLength(textString) > 0; i++) {
                var tl = UISketchpad._util.cutString(textString, rw);
                ctx.fillText(textString.substr(0, tl).replace(/^\s+|\s+$/, ""), _selfRec._startpoints.x, i * lineheight + _selfRec._startpoints.y);
                textString = textString.substr(tl);
            };

            setTimeout(function() {
                if (typeof callback == 'function') {
                    callback();
                }
            }, 0);
        }
    },

    _util: {
        getTrueLength: function(str) { //获取字符串的真实长度（字节长度）
            var len = str.length,
                truelen = 0;
            for (var x = 0; x < len; x++) {
                if (str.charCodeAt(x) > 128) {
                    truelen += 2;
                } else {
                    truelen += 1;
                }
            }
            return truelen;
        },

        cutString: function(str, leng) { //按字节长度截取字符串，返回substr截取位置
            var len = str.length,
                tlen = len,
                nlen = 0;
            for (var x = 0; x < len; x++) {
                if (str.charCodeAt(x) > 128) {
                    if (nlen + 2 < leng) {
                        nlen += 2;
                    } else {
                        tlen = x;
                        break;
                    }
                } else {
                    if (nlen + 1 < leng) {
                        nlen += 1;
                    } else {
                        tlen = x;
                        break;
                    }
                }
            }
            return tlen;
        }
    },

    //UISketchpad init
    init: function(options) {
        this.container = options.container;
        this.create();
        this.delegate();

        this.curTool = this.defaultOptions.Tool;
        this.curColor = this.defaultOptions.Color;
        this.curSize = this.defaultOptions.Size;
        this.curAlpha = this.defaultOptions.Alpha;

        //event事件监听器
        this.events = {
            open: options.onEvent.open || this._noop,
            close: options.onEvent.close || this._noop,
            addOne: options.onEvent.addOne || this._noop,
            delOne: options.onEvent.delOne || this._noop,
            delAll: options.onEvent.delAll || this._noop,
            selectColor: options.onEvent.selectColor || this._noop,
            selectTool: options.onEvent.selectTool || this._noop
        };

        //canvas open
        this.events.open();
    },

    //UISketchpad close
    close: function() {
        var _selfRec = this;
        document.getElementById(_selfRec.container).innerHTML = '';
        _selfRec.resetTempline();
        _selfRec.lines = [];

        //canvas close
        this.events.close();
    }
};

module.exports = UISketchpad;