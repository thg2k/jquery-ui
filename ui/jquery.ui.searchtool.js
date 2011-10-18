/*
 * the original requirements come from DeckTutor, so it's good to keep an eye on them:
 *  - keep some compatibility with autocomplete, so it's possible one day to resynch with it
 *  - 
 *  - conditionally list the set name if it's not really needed
 */

(function( $ ) {

$.widget( "ui.searchtool", {
	options: {
		delay: 300,
		minLength: 1,
		additional_fields: "",
		rendering: "text",
		menu_position: "body",
		menu_height: "auto",
		source: null
	},

	_create: function() {
		 myFunc = function( event ) {
				var keyCode = $.ui.keyCode;
				switch( event.keyCode ) {
				case keyCode.UP:
					self._move( "previous", event );
					// prevent moving cursor to beginning of text field in some browsers
					event.preventDefault();
					break;
				case keyCode.DOWN:
					self._move( "next", event );
					// prevent moving cursor to end of text field in some browsers
					event.preventDefault();
					break;
				case keyCode.ENTER:
					// when menu is open or has focus
					if ( self.menu.active ) {
						event.preventDefault();
					}
					//passthrough - ENTER and TAB both select the current element
				case keyCode.TAB:
					if ( !self.menu.active ) {
						return;
					}
					self.menu.select( event );
					break;
				case keyCode.ESCAPE:
					self.element.val( self.term );
					self.close( event );
					break;
				case keyCode.LEFT:
				case keyCode.RIGHT:
				case keyCode.SHIFT:
				case keyCode.CONTROL:
				case keyCode.ALT:
					// ignore metakeys (shift, ctrl, alt)
					break;
				default:
					// keypress is triggered before the input value is changed
					clearTimeout( self.searching );
					self.searching = setTimeout(function() {
						self.search( null, event );
					}, self.options.delay );
					break;
				}
			};

		var self = this,
			doc = this.element[ 0 ].ownerDocument;

		this.element
			// TODO: use textbox?
			.addClass( "ui-searchtool-input" )
			.attr( "searchtool", "off" )
			// TODO verify these actually work as intended
			.attr({
				"role": "textbox",
				"aria-searchtool": "list",
				"aria-haspopup": "true"
			})
			.bind( "keydown.searchtool", myFunc)
			.bind( "focus.searchtool", function() {
				self.selectedItem = null;
				self.previous = self.element.val();
			})
			.bind( "blur.searchtool", function( event ) {
				clearTimeout( self.searching );
				// clicks on the menu (or a button to trigger a search) will cause a blur event
				// TODO try to implement this without a timeout, see clearTimeout in search()
				self.closing = setTimeout(function() {
					self.close( event );
					self._change( event );
				}, 150 );
			});
		this._initSource();
		this.response = function() {
			return self._response.apply( self, arguments );
		};
		this.menu = $( "<ul></ul>" )
			.addClass( "ui-searchtool" )
			.appendTo( this.options.menu_position, doc )
			.menu({
				focus: function( event, ui ) {
					var item = ui.item.data( "item.searchtool" );
					if ( false !== self._trigger( "focus", null, { item: item } ) ) {
						// use value to match what will end up in the input, if it was a key event
						if ( /^key/.test(event.originalEvent.type) ) {
							self.element.val( item.value );
						}
					}
				},
				selected: function( event, ui ) {
          if (!ui.item)
            return;
					// fetch the original structured data from the selected item
					var item = ui.item.data( "item.searchtool" );
					if ( self._trigger( "select", event, { item: item } ) !== false ) {
						self.element.val( item.value );
					}
					self.close( event );
					// only trigger when focus was lost (click on menu)
					var previous = self.previous;
					if ( self.element[0] !== doc.activeElement ) {
						self.element.focus();
						self.previous = previous;
					}
					self.selectedItem = item;
				},
				blur: function( event, ui ) {
					if ( self.menu.element.is(":visible") ) {
						self.element.val( self.term );
					}
				}
			})
			.css({
			  height: this.options.menu_height
			})
			.zIndex( this.element.zIndex() + 1 )
			.data( "menu" );
		if ( $.fn.bgiframe ) {
			 this.menu.element.bgiframe();
		}
		$(this.options.additional_fields).bind("keydown.searchtool", myFunc);
		this.search();
	},

	destroy: function() {
		this.element
			.removeClass( "ui-searchtool-input" )
			.removeAttr( "searchtool" )
			.removeAttr( "role" )
			.removeAttr( "aria-searchtool" )
			.removeAttr( "aria-haspopup" );
		this.menu.element.remove();
		$.Widget.prototype.destroy.call( this );
	},

	_setOption: function( key ) {
		$.Widget.prototype._setOption.apply( this, arguments );
		if ( key === "source" ) {
			this._initSource();
		}
	},

	_initSource: function() {
		var url;
		if ( typeof this.options.source === "string" ) {
			url = this.options.source;
			this.source = function( request, response ) {
				$.getJSON( url, request, response );
			};
		} else {
			this.source = this.options.source;
		}
	},

	search: function( value, event ) {
		value = value != null ? value : this.element.val();
		if ( value.length < this.options.minLength ) {
			return this.close( event );
		}
		
		var fields = [];
		$(this.options.additional_fields).each(function() {
		  fields.push($(this).val());
		});
		
		clearTimeout( this.closing );
		if ( this._trigger("search") === false ) {
			return;
		}

		return this._search( value, fields );
	},

	_search: function( value, fields ) {
		this.term = this.element
			.addClass( "ui-searchtool-loading" )
			// always save the actual value, not the one passed as an argument
			.val();

		this.source( { term: value, additional_fields: fields }, this.response );
	},

	_response: function( content ) {
		this._suggest( content );
		this._trigger( "open" );
		this.element.removeClass( "ui-searchtool-loading" );
	},

	close: function( event ) {
		clearTimeout( this.closing );
		if ( this.menu.element.is(":visible") ) {
			this._trigger( "close", event );
			this.menu.deactivate();
		}
	},

	_change: function( event ) {
		if ( this.previous !== this.element.val() ) {
			this._trigger( "change", event, { item: this.selectedItem } );
		}
	},

	_suggest: function( items ) {
		var ul = this.menu.element;
		this._renderMenu( ul, items );

		// TODO refresh should check if the active item is still in the dom, removing the need for a manual deactivate
		this.menu.deactivate();
		this.menu.refresh();
	},

	_renderMenu: function( ul, items ) {
		var self = this;
		ul.empty();
		$.each( items, function( index, item ) {
			self._renderItem( ul, item );
		});
	},

	// renders a single <li> </li> item inside the menu
	_renderItem: function( ul, item ) {
		return $( "<li></li>" )
			.data( "item.searchtool", item )
			//.append($("<a></a>").append(document.createTextNode(item.label)))
			.append("<a>" + item.label + "</a>")
			.appendTo( ul );
	},

	_move: function( direction, event ) {
		if ( !this.menu.element.is(":visible") ) {
			this.search( null, event );
			return;
		}
		if ( this.menu.first() && /^previous/.test(direction) ||
				this.menu.last() && /^next/.test(direction) ) {
			this.element.val( this.term );
			this.menu.deactivate();
			return;
		}
		this.menu[ direction ]( event );
	},

	widget: function() {
		return this.menu.element;
	}
});

$.extend( $.ui.searchtool, {
	escapeRegex: function( value ) {
		return value.replace( /([\^\$\(\)\[\]\{\}\*\.\+\?\|\\])/gi, "\\$1" );
	},
	filter: function(array, term) {
		var matcher = new RegExp( $.ui.searchtool.escapeRegex(term), "i" );
		return $.grep( array, function(value) {
			return matcher.test( value.label || value.value || value );
		});
	}
});

}( jQuery ));