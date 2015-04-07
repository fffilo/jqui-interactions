/*!
 * jQuery UI Rotatable
 *
 * Adds a small handle to an HTML element to allow it to be rotated
 *
 * Depends:
 *		jquery.ui.core.js
 *		jquery.ui.mouse.js
 *		jquery.ui.widget.js
 *
 * Source:
 *		https://github.com/godswearhats/jquery-ui-rotatable
 *
 * Customized by:
 *		fffilo
 */

 (function($) {

	$.widget('ui.rotatable', {

		/**
		 * Widget options
		 * @type {Object}
		 */
		options: {
			angle  : 0,         // radian value
			handle : true,      // draggable handle (jQuery object | create on true | dismiss on false)
			start  : false,     // callback function
			rotate : false,     // callback function
			stop   : false      // callback function
		},

		/**
		 * Widget method
		 * @return {Void}
		 */
		_create: function() {
			if (this.options.handle === true) {
				this.options.handle = $('<div />')
					.appendTo(this.element.get(0).nodeName.match(/canvas|textarea|input|select|button|img/i) ? this.element.parent() : this.element);

				this.handleAppended = true;
			}

			if ($(this.options.handle).length != 0)
				$(this.options.handle)
					.removeClass('ui-rotatable-handle')
					.addClass('ui-rotatable-handle')
					.data('ui-rotatable-parent', this.element)
					.on('dblclick', this._dblclick)
					.on('mousedown', this._start);

			$(this.element)
				.removeClass('ui-rotatable')
				.addClass('ui-rotatable');

			this._clear();
			this._rotate(this._ui('init'));
		},

		/**
		 * Widget method
		 * @return {Void}
		 */
		_destroy: function() {
			if ($(this.options.handle).length != 0)
				$(this.options.handle)
					.unbind('mousedown', this._start)
					.removeData('ui-rotatable-parent')
					.removeClass('ui-rotatable-handle');

			if (this.handleAppended)
				$(this.options.handle)
					.remove();

			$(this.element)
				.removeClass('ui-rotatable-rotating')
				.removeClass('ui-rotatable');
		},

		/**
		 * Widget method
		 * @param  {String} key
		 * @param  {Mixed}  value
		 * @return {Void}
		 */
		_setOption: function(key, value) {
			if (key == 'angle') {
				value = this._fix(value);

				if (value == this.options.angle) {
					return;
				}

				this.startAngleElement = this._fix(this.options.angle);
			}

			this._super(key, value);

			if (key == 'angle') {
				this._rotate(this._ui());
			}
		},

		/**
		 * Clears private properties
		 * @return {Void}
		 */
		_clear: function() {
			this.center            = null;
			this.startAngleMouse   = null;
			this.startAngleElement = null;
			this.status            = 'stop';
		},

		/**
		 * UI object
		 * @param  {String} interaction (init|mousedrag|reset|option)
		 * @return {Object}
		 */
		_ui: function(interaction) {
			return {
				interaction : interaction || 'option',
				startAngle  : this.startAngleElement || 0,
				angle       : this.options.angle
			}
		},

		/**
		 * Get center of this.element
		 * @return {Object}
		 */
		_center: function() {
			/*
			// overflow (scroll) bug
			return {
				left: $(this.element).parent().offset().left + ($(this.element).css('left') || 0).replace(/px/, '') * 1 + $(this.element).width()  / 2,
				top:  $(this.element).parent().offset().top  + ($(this.element).css('top')  || 0).replace(/px/, '') * 1 + $(this.element).height() / 2
			}
			*/

			var box = $(this.element).get(0).getBoundingClientRect();

			return {
				left: box.left + box.width  / 2,
				top:  box.top  + box.height / 2
			}
		},

		/**
		 * Get/set this.element matrix transform
		 * @param  {Mixed} values empty, string or array or a,b,c,d,e,f object
		 * @return {Mixed}        a,b,c,d,e,f object or void
		 */
		_transform: function(values) {
			if (values === undefined) {
				var transform = $(this.element).css('transform')
					|| $(this.element).css('-o-transform')
					|| $(this.element).css('-ms-transform')
					|| $(this.element).css('-moz-transform')
					|| $(this.element).css('-webkit-transform')
					|| 'matrix(1, 0, 0, 1, 0, 0)';
				if (( ! transform) || (transform == 'none'))
					transform = 'matrix(1, 0, 0, 1, 0, 0)';

				var values = transform.match(/matrix\((.*)\)/)[1].split(',');
				return {
					a : isNaN(values[0] * 1) ? 1 : values[0] * 1,
					b : isNaN(values[1] * 1) ? 0 : values[1] * 1,
					c : isNaN(values[2] * 1) ? 0 : values[2] * 1,
					d : isNaN(values[3] * 1) ? 1 : values[3] * 1,
					e : isNaN(values[4] * 1) ? 0 : values[4] * 1,
					f : isNaN(values[5] * 1) ? 0 : values[5] * 1
				}
			}

			var transform;
			if (typeof(values) == 'string') {
				transform = values;
			}
			else if ($.isArray(values)) {
				transform = 'matrix('
					+ values[0] + ','
					+ values[1] + ','
					+ values[2] + ','
					+ values[3] + ','
					+ values[4] + ','
					+ values[5] + ')';
			}
			else if (typeof(values) == 'object') {
				transform = 'matrix('
					+ values.a + ','
					+ values.b + ','
					+ values.c + ','
					+ values.d + ','
					+ values.e + ','
					+ values.f + ')';
			}

			if (transform) {
				$(this.element)
					.css('-webkit-transform', transform)
					.css('-moz-transform', transform)
					.css('-ms-transform', transform)
					.css('-o-transform', transform)
					.css('transform', transform);
			}
		},

		/**
		 * Fix angle value
		 * @param  {Mixed} value angle in rad|grad|deg|turn
		 * @return {Float}       angle in rad
		 */
		_fix: function(value) {
			var result, match;

			// no need to do conversion
			if (typeof(value) == 'number') {
				result = value;
			}

			// convert unit to rad
			if (result === undefined) {
				match = value.toString().match(/rad$/);
				if (match) result = parseFloat(value) * 1;
			}
			if (result === undefined) {
				match = value.toString().match(/grad$/);
				if (match) result = parseFloat(value) * (Math.PI / 200);
			}
			if (result === undefined) {
				match = value.toString().match(/deg$/);
				if (match) result = parseFloat(value) * (Math.PI / 180);
			}
			if (result === undefined) {
				match = value.toString().match(/turn$/);
				if (match) result = parseFloat(value) * (Math.PI * 2);
			}
			if (result === undefined) {
				result = value * 1;
			}

			// try to parse number
			if (isNaN(result)) {
				result = parseFloat(result);
			}

			// not a number? throw exception!
			if (isNaN(result)) {
				throw value + ' is not an angle value.'
			}

			// normalize
			result = result % (2 * Math.PI);                                // reduce
			result = (result + (2 * Math.PI)) % (2 * Math.PI);              // force positive number
			result = result > Math.PI ? result - (2 * Math.PI) : result;    // force -180°<result<=180°

			return result;
		},

		/**
		 * Event mousedown
		 * @param  {Object}  event
		 * @return {Boolean}
		 */
		_start: function(event) {
			if (event.which != 1) {
				return;
			}

			var that = $(this).data('ui-rotatable-parent').data('ui-rotatable');

			that.center            = that._center();
			that.startTransform    = that._transform();
			that.startAngleMouse   = that._fix(Math.atan2(event.clientX - that.center.left, (event.clientY - that.center.top) * -1));
			that.startAngleElement = that._fix(Math.atan2(that.startTransform.b, that.startTransform.a));
			that.status            = 'start';

			// fix:
			// if object is flipped horizontally and vertically
			// start angle will be 180°, so we need to use
			// option.angle instead
			that.startAngleElement = that._fix(that.options.angle);

			var mousemoveHandler = function(event) {
				that._move.apply(that, [event]);
			}
			var mouseupHandler = function(event) {
				that._stop.apply(that, [event]);

				$(this)
					.unbind('mousemove', mousemoveHandler)
					.unbind('mouseup',   mouseupHandler);
			}

			$(document)
				.on('mousemove', mousemoveHandler)
				.on('mouseup',   mouseupHandler);

			return false;
		},

		/**
		 * Event mousemove
		 * @param  {Object}  event
		 * @return {Void}
		 */
		_move: function(event) {
			if (this.status == 'start') {
				$('body')
					.removeClass('ui-interaction-rotatable')
					.addClass('ui-interaction-rotatable');
				$(this.element)
					.removeClass('ui-rotatable-rotating')
					.addClass('ui-rotatable-rotating');

				this.status = 'rotate';

				this._trigger('start', null, this._ui('mousedrag'));
			}

			var angleMouse   = this._fix(Math.atan2(event.clientX - this.center.left, (event.clientY - this.center.top) * -1));
			var angleDrag    = angleMouse - this.startAngleMouse;
			if (event.shiftKey) {
				angleDrag = (15 * Math.round(((angleDrag + this.startAngleElement) * 180 / Math.PI) / 15)) * Math.PI / 180 - this.startAngleElement;
			}

			this.options.angle = this._fix(angleDrag + this.startAngleElement);

			var transform = ''
				+ 'rotate('
				+ angleDrag + 'rad'
				+ ') '
				+ 'matrix('
				+ this.startTransform.a + ','
				+ this.startTransform.b + ','
				+ this.startTransform.c + ','
				+ this.startTransform.d + ','
				+ this.startTransform.e + ','
				+ this.startTransform.f
				+ ')';

			this._transform(transform);
			this._trigger('rotate', null, this._ui('mousedrag'));
		},

		/**
		 * Event mouseup
		 * @param  {Object}  event
		 * @return {Void}
		 */
		_stop: function(event) {
			if (this.status != 'rotate') {
				return;
			}

			this._transform(this._transform());

			setTimeout(function() {
				$('body')
					.removeClass('ui-interaction-rotatable');
			});

			$(this.element)
				.removeClass('ui-rotatable-rotating');

			var ui = this._ui('mousedrag');

			this._clear();
			this._trigger('stop', null, ui);
		},

		/**
		 * Reset angle
		 * @param  {Object} event
		 * @return {Void}
		 */
		_dblclick: function(event) {
			if (event.which != 1) {
				return;
			}

			var that = $(this).data('ui-rotatable-parent').data('ui-rotatable');

			that.startAngleElement = that._fix(that.options.angle);
			that.options.angle     = 0;

			that._rotate(that._ui('reset'));
		},

		/**
		 * Rotate this.element
		 * @param  {Object} ui
		 * @return {Void}
		 */
		_rotate: function(ui) {
			var transform = this._transform();
			var angle     = this._fix(ui.angle) - this._fix(ui.startAngle);

			transform = 'rotate('
				+ angle + 'rad'
				+ ') '
				+ 'matrix('
				+ transform.a + ','
				+ transform.b + ','
				+ transform.c + ','
				+ transform.d + ','
				+ transform.e + ','
				+ transform.f + ')';

			this._transform(transform);
			this._transform(this._transform());
			this._trigger('rotate', null, ui);
		}

	});

})(jQuery);
