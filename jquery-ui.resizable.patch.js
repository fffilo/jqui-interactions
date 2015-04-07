/*!
 * jQuery UI Resizable patch
 *
 * Fixing rotated element issues
 *
 * Depends:
 *		jquery
 *		jquery-ui
 *		jquery-ui-resizable
 *
 * Source:
 *		https://github.com/unlocomqx/jQuery-ui-resizable-rotation-patch
 *
 * Customized by:
 *		fffilo
 */

$(document).ready(function(){

	/**
	 * Parse integer
	 * @param  {Mixed}  value
	 * @return {Number}
	 */
	function _parseInte(value) {
		return parseInt(value, 10) || 0
	}

	/**
	 * Parse float
	 * @param  {Mixed}  value
	 * @return {Number}
	 */
	function _parseFloat(value) {
		return isNaN(parseFloat(value)) ? 0: parseFloat(value);
	}

	/**
	 * Rounds number
	 * @param  {Numbew} value
	 * @return {Numbew}
	 */
	function _round(value) {
		return Math.round((value + 0.00001) * 100) / 100;
	}

	/**
	 * Get delta transformation point
	 * source: https://gist.github.com/fwextensions/2052247
	 * @param  {Object} values
	 * @param  {Object} point
	 * @return {Object}
	 */
	var _deltaTransformPoint = function(values, point)  {
		var dx = point.x * values.a + point.y * values.c + 0;
		var dy = point.x * values.b + point.y * values.d + 0;

		return { x: dx, y: dy };
	}

	/**
	 * Calculate the size correction for resized rotated element
	 * source: https://github.com/unlocomqx/jQuery-ui-resizable-rotation-patch
	 * @param  {Number} init_w
	 * @param  {Number} init_h
	 * @param  {Number} delta_w
	 * @param  {Number} delta_h
	 * @param  {Number} angle      angle in radians
	 * @return {Object} correction css object {left, top}
	 */
	var _getCorrection = function(init_w, init_h, delta_w, delta_h, angle) {
		//Get position after rotation with original size
		var x = -init_w/2;
		var y = init_h/2;
		var new_x = y * Math.sin(angle) + x * Math.cos(angle);
		var new_y = y * Math.cos(angle) - x * Math.sin(angle);
		var diff1 = {left: new_x - x, top: new_y - y};

		var new_width = init_w + delta_w;
		var new_height = init_h + delta_h;

		//Get position after rotation with new size
		var x = -new_width/2;
		var y = new_height/2;
		var new_x = y * Math.sin(angle) + x * Math.cos(angle);
		var new_y = y * Math.cos(angle) - x * Math.sin(angle);
		var diff2 = {left: new_x - x, top: new_y - y};

		//Get the difference between the two positions
		var offset = {left: diff2.left - diff1.left, top: diff2.top - diff1.top};
		return offset;
	}

	/**
	 * Mouse start event
	 * source: https://github.com/unlocomqx/jQuery-ui-resizable-rotation-patch
	 * @param  {Object}  event
	 * @return {Boolean}
	 */
	$.ui.resizable.prototype._mouseStart = function(event) {
		// patch(2): get transform and fix handles before we begin
		this.fixHandles();

		var curleft, curtop, cursor,
		o = this.options,
		el = this.element;

		this.resizing = true;

		this._renderProxy();

		curleft = _parseInte(this.helper.css("left"));
		curtop = _parseInte(this.helper.css("top"));

		if (o.containment) {
			curleft += $(o.containment).scrollLeft() || 0;
			curtop += $(o.containment).scrollTop() || 0;
		}

		this.offset = this.helper.offset();
		this.position = { left: curleft, top: curtop };

		this.size = this._helper ? {
			width: this.helper.width(),
			height: this.helper.height()
		} : {
			width: el.width(),
			height: el.height()
		};

		this.originalSize = this._helper ? {
			width: el.outerWidth(),
			height: el.outerHeight()
		} : {
			width: el.width(),
			height: el.height()
		};

		// patch(2): get opposite axis and calculate it's position
		this.oppositeAxisPosition = this._oppositeAxisPosition();

		this.sizeDiff = {
			width: el.outerWidth() - el.width(),
			height: el.outerHeight() - el.height()
		};

		this.originalPosition = { left: curleft, top: curtop };
		this.originalMousePosition = { left: event.pageX, top: event.pageY };

		//patch: object to store previous data
		this.lastData = this.originalPosition;

		this.aspectRatio = (typeof o.aspectRatio === "number") ?
		o.aspectRatio :
		((this.originalSize.width / this.originalSize.height) || 1);

		cursor = $(".ui-resizable-" + this.axis).css("cursor");
		$("body").css("cursor", cursor === "auto" ? this.axis + "-resize" : cursor);

		el.addClass("ui-resizable-resizing");
		this._propagate("start", event);

		return true;
	};

	/**
	 * Mouse drag event
	 * source: https://github.com/unlocomqx/jQuery-ui-resizable-rotation-patch
	 * @param  {Object}  event
	 * @return {Boolean}
	 */
	$.ui.resizable.prototype._mouseDrag = function(event) {
		var data,
		el = this.helper, props = {},
		smp = this.originalMousePosition,
		a = this.axis,
		prevTop = this.position.top,
		prevLeft = this.position.left,
		prevWidth = this.size.width,
		prevHeight = this.size.height,
		dx = (event.pageX-smp.left)||0,
		dy = (event.pageY-smp.top)||0,
		trigger = this._change[a];

		var init_w = this.size.width;
		var init_h = this.size.height;

		if (!trigger) {
			return false;
		}

		//patch: cache cosine & sine
		var _cos = Math.cos(this.transform.rotate);
		var _sin = Math.sin(this.transform.rotate);

		//patch: calculate the corect mouse offset for a more natural feel
		ndx = dx * _cos + dy * _sin;
		ndy = dy * _cos - dx * _sin;
		dx = ndx;
		dy = ndy;

		// Calculate the attrs that will be change
		data = trigger.apply(this, [event, dx, dy]);

		// Put this in the mouseDrag handler since the user can start pressing shift while resizing
		this._updateVirtualBoundaries(event.shiftKey);
		if (this._aspectRatio || event.shiftKey) {
			data = this._updateRatio(data, event);
		}

		data = this._respectSize(data, event);

		//patch: backup the position
		var oldPosition = {left: this.position.left, top: this.position.top};

		this._updateCache(data);

		//patch: revert to old position
		this.position = {left: oldPosition.left, top: oldPosition.top};

		//patch: difference between datas
		var diffData = {
			left: _parseFloat(data.left || this.lastData.left) - _parseFloat(this.lastData.left),
			top:  _parseFloat(data.top || this.lastData.top)  - _parseFloat(this.lastData.top),
		}

		//patch: calculate the correct position offset based on angle
		var new_data = {};
		new_data.left = diffData.left * _cos - diffData.top  * _sin;
		new_data.top  = diffData.top  * _cos + diffData.left * _sin;

		//patch: round the values
		new_data.left = _round(new_data.left);
		new_data.top  = _round(new_data.top);

		//patch: update the position
		this.position.left += new_data.left;
		this.position.top  += new_data.top;

		//patch: save the data for later use
		this.lastData = {
			left: _parseFloat(data.left || this.lastData.left),
			top:  _parseFloat(data.top  || this.lastData.top)
		};

		// plugins callbacks need to be called first
		this._propagate("resize", event);

		//patch: calculate the difference in size
		var diff_w = init_w - this.size.width;
		var diff_h = init_h - this.size.height;

		//patch: get the offset based on angle
		var offset = _getCorrection(init_w, init_h, diff_w, diff_h, this.transform.rotate);

		//patch: update the position
		this.position.left += offset.left;
		this.position.top -= offset.top;

		// patch(2): set position by opposite axis
		var oppositeAxisPosition = this._oppositeAxisPosition();
		this.position.left += this.oppositeAxisPosition.left - oppositeAxisPosition.left;
		this.position.top  += this.oppositeAxisPosition.top  - oppositeAxisPosition.top;

		if (this.position.top !== prevTop) {
			props.top = this.position.top + "px";
		}
		if (this.position.left !== prevLeft) {
			props.left = this.position.left + "px";
		}
		if (this.size.width !== prevWidth) {
			props.width = this.size.width + "px";
		}
		if (this.size.height !== prevHeight) {
			props.height = this.size.height + "px";
		}
		el.css(props);

		if (!this._helper && this._proportionallyResizeElements.length) {
			this._proportionallyResize();
		}

		// Call the user callback if the element was resized
		if ( ! $.isEmptyObject(props) ) {
			this._trigger("resize", event, this.ui());
		}

		return false;
	}

	/**
	 * Decode element matrix transformation
	 * @return {Object}
	 */
	$.ui.resizable.prototype._transform = function() {
		var transform = $(this.element[0]).css('transform')
			|| $(this.element).css('-o-transform')
			|| $(this.element).css('-ms-transform')
			|| $(this.element).css('-moz-transform')
			|| $(this.element).css('-webkit-transform')
			|| 'matrix(1, 0, 0, 1, 0, 0)';
		if (( ! transform) || (transform == 'none'))
			transform = 'matrix(1, 0, 0, 1, 0, 0)';

		var values = transform.match(/matrix\((.*)\)/)[1].split(',');
		values = {
			a : isNaN(values[0] * 1) ? 1 : values[0] * 1,
			b : isNaN(values[1] * 1) ? 0 : values[1] * 1,
			c : isNaN(values[2] * 1) ? 0 : values[2] * 1,
			d : isNaN(values[3] * 1) ? 1 : values[3] * 1,
			e : isNaN(values[4] * 1) ? 0 : values[4] * 1,
			f : isNaN(values[5] * 1) ? 0 : values[5] * 1
		}

		var px = _deltaTransformPoint(values, { x: 0, y: 1 });
		var py = _deltaTransformPoint(values, { x: 1, y: 0 });

		this.transform = {
			translateX : values.e,
			translateY : values.f,
			scaleX     : Math.sqrt(values.a * values.a + values.b * values.b),
			scaleY     : Math.sqrt(values.c * values.c + values.d * values.d),
			skewX      : Math.atan2(px.y, px.x) - Math.PI / 2,
			skewY      : Math.atan2(py.y, py.x) -           0,
			rotate     : Math.atan2(px.y, px.x) - Math.PI / 2
		}
	}

	/**
	 * Calculate opposite axis position
	 * @return {Object} position object -> eq: { left: 0, top: 0 }
	 */
	$.ui.resizable.prototype._oppositeAxisPosition = function() {
		// find opposite axis index
		var axisArray = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
		axisArray = axisArray.concat(axisArray);
		var axis = axisArray[axisArray.indexOf(this.axis) + 4];

		// calculate unrotated element offset (to do -> i dont like it this way...)
		var offset = {
			left : this.position.left + $(this.element[0]).parent().offset().left - (parseFloat($(this.element[0]).parent().css('margin-left') || 0)),
			top  : this.position.top  + $(this.element[0]).parent().offset().top  - (parseFloat($(this.element[0]).parent().css('margin-top')  || 0))
		}

		// find opposite axis offset
		var result = false;
		if (axis == 'n')  result = { left: offset.left + this.size.width * 0.5, top: offset.top + this.size.height * 0.0 };
		if (axis == 'ne') result = { left: offset.left + this.size.width * 1.0, top: offset.top + this.size.height * 0.0 };
		if (axis == 'e')  result = { left: offset.left + this.size.width * 1.0, top: offset.top + this.size.height * 0.5 };
		if (axis == 'se') result = { left: offset.left + this.size.width * 1.0, top: offset.top + this.size.height * 1.0 };
		if (axis == 's')  result = { left: offset.left + this.size.width * 0.5, top: offset.top + this.size.height * 1.0 };
		if (axis == 'sw') result = { left: offset.left + this.size.width * 0.0, top: offset.top + this.size.height * 1.0 };
		if (axis == 'w')  result = { left: offset.left + this.size.width * 0.0, top: offset.top + this.size.height * 0.5 };
		if (axis == 'nw') result = { left: offset.left + this.size.width * 0.0, top: offset.top + this.size.height * 0.0 };

		// calculate rotated offset
		if (result) {
			var center = {
				left : offset.left + this.size.width  * 0.5,
				top  : offset.top  + this.size.height * 0.5
			}
			var shift = {
				left : result.left - center.left,
				top  : result.top  - center.top
			}
			var translate = {
				left : shift.left * Math.cos(this.transform.rotate) - shift.top * Math.sin(this.transform.rotate),
				top  : shift.left * Math.sin(this.transform.rotate) + shift.top * Math.cos(this.transform.rotate)
			}

			result.left = center.left + translate.left;
			result.top  = center.top  + translate.top;
		}

		// finally...
		return result;
	}

	/**
	 * Adds ui-resizable-rotated-{axis} class to each axis element
	 * @return {[Void]}
	 */
	$.ui.resizable.prototype.fixHandles = function() {
		// recalculate transform
		this._transform();

		// angle in degrees (0..360)
		var angle = this.transform.rotate * 180 / Math.PI;
		while (angle >= 360) angle = 360 - angle;
		while (angle <    0) angle = 360 + angle;

		// fix each handle
		$.each(this.handles, function(key, value) {
			var axisArray = ["n", "ne", "e", "se", "s", "sw", "w", "nw"];
			var octant    = Math.round(angle / 45);
			var index     = axisArray.indexOf(key);
			var newIndex  = (index + octant) % 8;

			$(value)
				.removeClass('ui-resizable-rotated-n')
				.removeClass('ui-resizable-rotated-ne')
				.removeClass('ui-resizable-rotated-e')
				.removeClass('ui-resizable-rotated-se')
				.removeClass('ui-resizable-rotated-s')
				.removeClass('ui-resizable-rotated-sw')
				.removeClass('ui-resizable-rotated-w')
				.removeClass('ui-resizable-rotated-nw')
				.addClass('ui-resizable-rotated-' + axisArray[newIndex]);
		});
	}

});
