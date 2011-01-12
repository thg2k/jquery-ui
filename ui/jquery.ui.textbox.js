/*
 * jQuery UI TextBox @VERSION
 *
 * Copyright 2010, AUTHORS.txt (http://jqueryui.com/about)
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * http://docs.jquery.com/UI/TextBox
 *
 * Depends:
 *	jquery.ui.core.js
 *	jquery.ui.widget.js
 */
(function( $ ) {

// FIXME: there is some confusion about .autoLabel and .label
//   plus there is some useless events about focus/unfocus in the element
//   widget (i.e. the wrapping <span/>: it cannot receive focus)

var lastActive,
	baseClasses = "ui-textbox ui-widget ui-state-default ui-corner-all",
	stateClasses = "ui-state-hover ui-state-active ",
	typeClasses = "ui-textbox-text-icons ui-textbox-text-icon",
	// common reset handler for all textboxes
	formResetHandler = function( event ) {
		$( ":ui-textbox", event.target.form ).each(function() {
			var inst = $( this ).data( "textbox" );
			setTimeout(function() {
				inst.refresh();
			}, 1 );
		});
	},
	// common submit handler for all textboxes
	formSubmitHandler = function( event ) {
		$( ":ui-textbox", event.target.form ).each(function() {
			var inst = $( this ).data( "textbox" );
			if ( inst.autoLabel && inst.autoLabel == inst.inputElement.val() ) {
				console.debug("[textbox] .. removing content \"" + inst.inputElement.val() + "\" because it's autolabel");
				inst.inputElement.val( "" );
			}
		});

		return true;
	};

$.widget( "ui.textbox", {
	options: {
		label: null,
		icon: {
		}
	},

	_create: function() {
		// auto-rebind the form reset handler
		this.element.closest( "form" )
			.unbind( "reset.textbox" )
			.bind( "reset.textbox", formResetHandler )
			.unbind( "submit.textbox" )
			.bind( "submit.textbox", formSubmitHandler );

		if ( this.element.is("input[type=\"text\"]") || this.element.is("input[type=\"password\"]") ) {
			this.inputElement = this.element;
		}
		else {
			// FIXME: how to abort creation?
			return;
		}

		// wrap the input into a span, which will become the new widget
		this.inputElement.wrap("<span />");

		// our widget becomes the parent of this one
		this.element = this.inputElement.parent();

		// saving the automatic label
		this.autoLabel = this.inputElement.attr("title");

		if ( this.autoLabel ) {
			if ( this.inputElement.attr( "value" ) == "" ) {
				this.inputElement.attr( "value", this.autoLabel );
			}
			this.inputElement.attr("title", "");
		}

		var self = this,
			options = this.options;

		if ( options.label === null ) {
			// FIXME: shouldn't we use .val() here?
			options.label = this.inputElement.html();
		}

		if ( this.inputElement.is( ":disabled" ) ) {
			options.disabled = true;
		}

		this.element
			.addClass( baseClasses )
			.attr( "role", "textbox" )
			.bind( "mouseenter.textbox", function() {
				if ( options.disabled ) {
					return;
				}
				$( this ).addClass( "ui-state-hover" );
				// FIXME: i don't understand this
				if ( this === lastActive ) {
					$( this ).addClass( "ui-state-active" );
				}
			})
			.bind( "mouseleave.textbox", function() {
				if ( options.disabled ) {
					return;
				}
				$( this ).removeClass( "ui-state-hover" );
			})
			.bind( "focus.textbox", function() {
				// no need to check disabled, focus wouldn't be triggered
				$( this ).addClass( "ui-state-focus" );
			})
			.bind( "blur.textbox", function() {
				$( this ).removeClass( "ui-state-focus" );
			});

		// FIXME: why separating this?
		// note that in these handlers self.element can be replaced with $( this ).parent()
		this.inputElement
			.bind( "mousedown.textbox", function() {
				if ( options.disabled ) {
					return false;
				}
				self.element.addClass( "ui-state-active" );
				lastActive = this;
				$( document ).one( "mouseup", function() {
					lastActive = null;
				});
			})
			.bind( "mouseup.textbox", function() {
				if ( options.disabled ) {
					return false;
				}
				self.element.removeClass( "ui-state-active" );
			})
			.bind( "keydown.textbox", function(event) {
				if ( options.disabled ) {
					return false;
				}
				if ( event.keyCode == $.ui.keyCode.ENTER ) {
					// FIXME: go to the next tabindex (?)
					// FIXME: make it an option (?)
					self.element.addClass( "ui-state-active" );
				}
			})
			.bind( "keyup.textbox", function() {
				self.element.removeClass( "ui-state-active" );
			})
			.bind( "focus.textbox", function() {
				self.element.addClass( "ui-state-focus" );

				// check if we still have the default text inside
				if ( $( this ).attr("value") == self.autoLabel ) {
					$( this ).attr("value", "");
				}
			})
			.bind( "blur.textbox", function() {
				self.element.removeClass("ui-state-focus");

				// restore the default text if we left it empty
				if ( $( this ).attr("value") == "" )
					$( this ).attr("value", self.autoLabel);
			});

		// TODO: pull out $.Widget's handling for the disabled option into
		// $.Widget.prototype._setOptionDisabled so it's easy to proxy and can
		// be overridden by individual plugins
		this._setOption( "disabled", options.disabled );
	},

	widget: function() {
		return this.inputElement;
	},

	destroy: function() {
		this.element
			.removeClass( "ui-helper-hidden-accessible" );
		this.inputElement
			.removeClass( baseClasses + " " + stateClasses + " " + typeClasses )
			.removeAttr( "role" )
			.removeAttr( "aria-pressed" )
			.html( this.inputElement.find(".ui-textbox-text").html() );

		if ( this.autoLabel ) {
			this.inputElement.attr("title", this.autoLabel);
		}

		$.Widget.prototype.destroy.call( this );
	},

	_setOption: function( key, value ) {
		$.Widget.prototype._setOption.apply( this, arguments );
		if ( key === "disabled" ) {
			if ( value ) {
				this.element.attr( "disabled", true );
			} else {
				this.element.removeAttr( "disabled" );
			}
		}
		this._resetTextBox();
	},

	refresh: function() {
		var isDisabled = this.element.is( ":disabled" );
		if ( isDisabled !== this.options.disabled ) {
			this._setOption( "disabled", isDisabled );
		}

		if ( this.autoLabel && $( this ).inputElement.attr("value") == "" ) {
			$( this ).inputElement.attr("value", this.autoLabel);
		}
	},

	_resetTextBox: function() {
		if ( this.options.label ) {
			this.element.val( this.options.label );
		}
	}
});

}( jQuery ) );
