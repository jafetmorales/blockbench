var Toolbars, BarItems, MenuBar, open_menu, Toolbox;
//Bars
class MenuSeperator {
	constructor() {
		this.menu_node = $('<li class="menu_seperator"></li>')
	}
}
class BarItem {
	constructor(data) {
		this.id = data.id;
		if (!data.private) {
			BarItems[this.id] = this;
		}
		this.name = tl('action.'+this.id)
		this.description = tl('action.'+this.id+'.desc')
		if (data.name) this.name = tl(data.name);
		if (data.description) this.description = tl(data.description);
		this.node;
		this.condition = data.condition;
		this.nodes = []
	}
	conditionMet() {
		if (this.condition === undefined) {
			return true;
		} else if (typeof this.condition === 'function') {
			return this.condition()
		} else {
			return !!this.condition
		}
	}
	addLabel(in_bar) {
		$(this.node).attr('title', this.description)
		if (in_bar) {
			$(this.node).prepend('<label class="f_left in_toolbar">'+this.name+':</label>')
		} else {
			$(this.node).append('<div class="tooltip">'+this.name+'</div>')
			.on('mouseenter', function() {

				var tooltip = $(this).find('div.tooltip')
				if (!tooltip || typeof tooltip.offset() !== 'object') return;
				//Left
				if (tooltip.css('left') === '-4px') {
					tooltip.css('left', 'auto')
				}
				if (-tooltip.offset().left > 4) {
					tooltip.css('left', '-4px')
				}
				//Right
				if (tooltip.css('right') === '-4px') {
					tooltip.css('right', 'auto')
				}
				if ((tooltip.offset().left + tooltip.width()) - $(window).width() > 4) {
					tooltip.css('right', '-4px')
				}
			})
		}
	}
	getNode() {
		var scope = this;
		if (this.id === 'uv_rotation') {
		}
		if (scope.nodes.length === 0) {
			scope.nodes = [scope.node]
		}
		if (!scope.node.isConnected) {
			$(scope.node).detach()
			return scope.node;
		}
		var i = 0;
		while (i < scope.nodes.length) {
			if (!scope.nodes[i].isConnected) {
				$(scope.nodes[i]).detach()
				return scope.nodes[i];
			}
			i++;
		}
		var clone = $(scope.node).clone(true, true).get(0);
		scope.nodes.push(clone);
		return clone;

	}
	toElement(destination) {
		$(destination).append(this.node)
		return this;
	}
}
class KeybindItem {
	constructor(data) {
		this.id = data.id
		this.type = 'keybind_item'
		this.name = tl('keybind.'+this.id)
		this.category = data.category ? data.category : 'misc'
		if (data.keybind) {
			this.default_keybind = data.keybind
		}
		this.keybind = new Keybind(data.keybind).set(Keybinds.stored[this.id])

		Keybinds.actions.push(this)
		Keybinds.extra[this.id] = this;
		this.keybind.setAction(this.id)
	}
}
class Action extends BarItem {
	constructor(data) {
		super(data)
		var scope = this;
		this.type = 'action'
		this.category = data.category ? data.category : 'misc'
		//Key
		if (data.keybind) {
			this.default_keybind = data.keybind
		}
		if (Keybinds.stored[this.id]) {
			this.keybind = new Keybind(Keybinds.stored[this.id])
		} else {
			this.keybind = new Keybind(data.keybind)
		}
		this.keybind.setAction(this.id)
		this.work_in_dialog = data.work_in_dialog === true
		//Icon
		this.icon = data.icon
		this.color = data.color

		if (data.linked_setting) {
			this.description = tl('settings.'+data.linked_setting+'.desc')
			this.linked_setting = data.linked_setting
		}
		if (data.condition) this.condition = data.condition

		//Node
		this.click = data.click
		this.icon_node = Blockbench.getIconNode(this.icon, this.color)
		this.node = $(`<div class="tool ${this.id}"></div>`).get(0)
		this.nodes = [this.node]
		this.addLabel(data.label)
		this.menu_node = $(`<li>${this.name}</li>`).get(0)
		$(this.node).add(this.menu_node).prepend(this.icon_node)
		$(this.node).click(function(e) {scope.trigger(e)})
		if (data.linked_setting) {
			this.toggleLinkedSetting(false)
		}
		Keybinds.actions.push(this)
	}
	trigger(event) {
		var scope = this;
		if (BARS.condition(scope.condition, scope)) {
			scope.click(event)
			$(scope.nodes).each(function() {
				$(this).css('color', 'var(--color-light)')
			})
			setTimeout(function() {
				$(scope.nodes).each(function() {
					$(this).css('color', '')
				})
			}, 200)
			return true;
		}
		return false;
	}
	setIcon(icon) {
		var scope = this;
		this.icon = icon
		this.icon_node = Blockbench.getIconNode(this.icon)
		$(this.menu_node).find('.icon').replaceWith(this.icon_node)

		this.nodes.forEach(function(n) {
			$(n).find('.icon').replaceWith($(scope.icon_node).clone())
		})
	}
	toggleLinkedSetting(change) {
		if (this.linked_setting && settings[this.linked_setting]) {
			if (change !== false) {
				settings[this.linked_setting].value = !settings[this.linked_setting].value
			}
			this.setIcon(settings[this.linked_setting].value ? 'check_box' : 'check_box_outline_blank')
		}
	}
}
class Tool extends Action {
	constructor(data) {
		super(data)
		var scope = this;
		this.type = 'tool'
		this.toolbar = data.toolbar;
		this.selectFace = data.selectFace;
		this.selectCubes = data.selectCubes !== false;
		this.paintTool = data.paintTool;
		this.transformerMode = data.transformerMode;
		this.allowWireframe = data.allowWireframe == true;

		this.onCanvasClick = data.onCanvasClick;
		this.onSelect = data.onSelect;
		this.onUnselect = data.onUnselect;
		$(this.node).click(function() {scope.select()})
	}
	trigger() {
		if (BARS.condition(this.condition, this)) {
			this.select()
			return true;
		}
		return false;
	}
	select() {
		if (this === Toolbox.selected) return;
		if (Toolbox.selected && Toolbox.selected.onUnselect && typeof Toolbox.selected.onUnselect == 'function') {
			Toolbox.selected.onUnselect()
		}
		Toolbox.selected = this;

		if (this.transformerMode) {
			Transformer.setMode(this.transformerMode)
		}
		if (Prop.wireframe && !this.allowWireframe) {
			Prop.wireframe = false
			Canvas.updateAll()
		}
		if (this.toolbar && Toolbars[this.toolbar]) {
			Toolbars[this.toolbar].toPlace('tool_options')
			resizeWindow()
		} else {
			$('.toolbar_wrapper.tool_options > .toolbar').detach()
		}
		$('#preview').css('cursor', (this.cursor ? this.cursor : 'default'))
		updateSelection()
		$('.tool.sel').removeClass('sel')
		$('.tool.'+this.id).addClass('sel')

		if (typeof this.onSelect == 'function') {
			this.onSelect()
		}
		return this;
	}
}
class Widget extends BarItem {
	constructor(data) {
		super(data)
		this.type = 'widget'
	}
}
class NumSlider extends Widget {
	constructor(data) {
		super(data);
		this.uv = !!data.uv;
		this.type = 'numslider'
		this.icon = 'code'
		this.value = 0;
		this.width = 79;
		if (typeof data.get === 'function') this.get = data.get;
		this.onBefore = data.onBefore;
		this.onAfter = data.onAfter;
		if (typeof data.change === 'function') this.change = data.change;
		if (data.settings) {
			this.settings = data.settings;
			if (this.settings.default) {
				this.value = this.settings.default
			}
			if (data.settings.interval) {
				this.getInterval = data.settings.interval
			} else {
				this.getInterval = function(event) {
					return this.settings.step ? this.settings.step : 1
				};
			}
		} else {
			this.getInterval = function(event) {
				return canvasGridSize(event.shiftKey, event.ctrlKey);
			};
		}
		if (typeof data.getInterval === 'function') {
			this.getInterval = data.getInterval;
		}
		var scope = this;
		this.node = $( `<div class="tool wide widget nslide_tool">
							<div class="nslide" n-action="${this.id}"></div>
							<div class="tooltip">${this.name}</div>
					  	</div>`).get(0);
		this.jq_outer = $(this.node)
		this.jq_inner = this.jq_outer.find('.nslide');

		//Slide
		this.jq_inner.draggable({
			revert: true,
			axis: 'x',
			revertDuration: 0,
			helper: function () {return '<div id="nslide_head"><span id="nslide_offset"></span></div>'},
			opacity: 0.8,
			appendTo: 'body',
			cursor: "none",
			start: function(event, ui) {
				if (typeof scope.onBefore === 'function') {
					scope.onBefore()
				}
				scope.pre = canvasGridSize()
				scope.top = ui.position.top
				scope.left = ui.position.left
				scope.last_value = scope.value
			},
			drag: function(event, ui) {
				scope.slide(event, ui)
			},
			stop: function() {
				if (typeof scope.onAfter === 'function') {
					scope.onAfter(scope.value - scope.last_value)
				}
			}
		})
		//Input
		.keypress(function (e) {
			if (e.keyCode === 10 || e.keyCode === 13) {
				e.preventDefault();
				scope.stopInput()
			}
		})
		.keyup(function (e) {
			if (e.keyCode !== 10 && e.keyCode !== 13) {
				scope.input()
			}
		})
		.focusout(function() {
			scope.stopInput()
		})
		.click(function(event) {
			if (event.target != this) return;
			scope.jq_inner.find('.nslide_arrow').remove()
			scope.jq_inner.attr('contenteditable', 'true')
			scope.jq_inner.addClass('editing')
			scope.jq_inner.focus()
			document.execCommand('selectAll')
		});
		//Arrows
		this.jq_outer
		.on('mouseenter', function() {
			scope.jq_outer.append(
				'<div class="nslide_arrow na_left" ><i class="material-icons">navigate_before</i></div>'+
				'<div class="nslide_arrow na_right"><i class="material-icons">navigate_next</i></div>'
			)

			var n = limitNumber(scope.width/2-24, 6, 1000)

			scope.jq_outer.find('.nslide_arrow.na_left').click(function(e) {
				scope.arrow(-1, e)
			}).css('margin-left', (-n-24)+'px')

			scope.jq_outer.find('.nslide_arrow.na_right').click(function(e) {
				scope.arrow(1, e)
			}).css('margin-left', n+'px')
		})
		.on('mouseleave', function() {
			scope.jq_outer.find('.nslide_arrow').remove()
		})
	}
	setWidth(width) {
		if (width) {
			this.width = width
		} else {
			width = this.width
		}
		$(this.node).width(width).find('> div.nslide').css('width', width+'px')
		return this;
	}
	slide(event, ui) {
		//Variables
		var scope = this;
		var number = 0;
		//Math
		var offset = Math.round((event.clientX-scope.left)/50)
		if (scope.uv === false) {
			offset *= canvasGridSize();
		}
		var difference = offset - scope.pre;
		scope.pre = offset;
		difference *= this.getInterval(event)
		if (difference == 0 || isNaN(difference)) return;

		this.change(difference)
		this.update()
	}
	input(obj) {
		var scope = this;
		if (typeof this.onBefore === 'function') {
			this.onBefore()
		}
		this.last_value = this.value
		var number = this.jq_inner.text().replace(/[^-.0-9]/g, "");
		var number = parseFloat(number)
		if (isNaN(number)) {
			number = 0;
		}
		this.change(number, true)
		this.update()
		if (typeof this.onAfter === 'function') {
			this.onAfter(scope.value - scope.last_value)
		}
	}
	stopInput() {
		this.jq_inner.attr('contenteditable', 'false')
		this.jq_inner.removeClass('editing')
		this.update()
	}
	arrow(difference, event) {
		if (typeof this.onBefore === 'function') {
			this.onBefore()
		}
		difference *= this.getInterval(event)
		this.change(difference)
		this.update()
		if (typeof this.onAfter === 'function') {
			this.onAfter(difference)
		}
	}
	setValue(value, trim) {
		if (typeof value === 'string') {
			value = parseFloat(value)
		}
		if (trim === false) {
			this.value = value
		} else if (typeof value === 'number') {
			this.value = trimFloatNumber(value)
		} else {

		}
		this.jq_outer.find('.nslide:not(.editing)').text(this.value)
		//this.jq_inner.text(this.value)
		return this;
	}
	change(difference, fixed) {
		//Solo Sliders only
		var num = difference
		if (!fixed) {
			num += this.get()
		}
		if (this.settings && typeof this.settings.min === 'number') {
			num = limitNumber(num, this.settings.min, this.settings.max)
		}
		this.value = num
	}
	get() {
		//Solo Sliders only
		return parseFloat(this.value);
	}
	update() {
		var number = this.get();
		this.setValue(number)
		$('#nslide_head #nslide_offset').text(this.name+': '+number)
	}
}
class BarSlider extends Widget {
	constructor(data) {
		super(data)
		var scope = this;
		this.type = 'slider'
		this.icon = 'fa-sliders'
		this.value = data.value||0
		this.node = $('<div class="tool widget">'+
			'<input type="range" class="dark_bordered"'+
				' value="'+(data.value?data.value:0)+'" '+
				' min="'+(data.min?data.min:0)+'" '+
				' max="'+(data.max?data.max:10)+'" '+
				' step="'+(data.step?data.step:1)+'" '+
				' style="width: '+(data.width?data.width:'auto')+'px;">'+
		'</div>').get(0)
		this.addLabel(data.label)
		if (typeof data.onChange === 'function') {
			this.onChange = data.onChange
		}
		$(this.node).children('input').on('input', function(event) {
			scope.change(event)
		})
	}
	change(event) {
		this.set( parseFloat( $(event.target).val() ) )
		if (this.onChange) {
			this.onChange(this, event)
		}
	}
	set(value) {
		this.value = value
		$(this.nodes).children('input').val(value)
	}
	get() {
		return this.value
	}
}
class BarSelect extends Widget {
	constructor(data) {
		super(data)
		var scope = this;
		this.type = 'select'
		this.icon = 'list'
		this.node = $('<div class="tool widget"><select class="dark_bordered"></select></div>').get(0)
		if (data.width) {
			$(this.node).children('select').css('width', data.width+'px')
		}
		var select = $(this.node).find('select')
		if (data.options) {
			for (var key in data.options) {
				if (data.options.hasOwnProperty(key)) {
					if (!this.value) {
						this.value = key
					}
					var name = data.options[key]
					if (name === true) {
						name = tl('action.'+this.id+'.'+key)
					}
					select.append('<option id="'+key+'">'+name+'</option>')
				}
			}
		}
		this.addLabel(data.label)
		if (typeof data.onChange === 'function') {
			this.onChange = data.onChange
		}
		$(this.node).children('select').change(function(event) {
			scope.change(event)
		})
	}
	change(event) {
		this.set( $(event.target).find('option:selected').attr('id') )
		if (this.onChange) {
			this.onChange(this, event)
		}
	}
	set(id) {
		this.value = id
		$(this.nodes).find('option#'+id).attr('selected', true).siblings().attr('selected', false)
	}
	get() {
		return this.value
	}
}
class BarText extends Widget {
	constructor(data) {
		super(data)
		this.type = 'bar_text'
		this.icon = 'text_format'
		this.node = $('<div class="tool widget bar_text">'+data.text||''+'</div>').get(0)
		if (data.right) {
			$(this.node).addClass('f_right')
		}
		if (typeof data.click === 'function') {
			this.click = data.click;
			this.node.addEventListener('click', this.click)
		}
	}
	set(text) {
		$(this.nodes).text(text)
	}
}
class ColorPicker extends Widget {
	constructor(data) {
		super(data)
		var scope = this;
		this.type = 'color_picker'
		this.icon = 'color_lens'
		this.node = $('<div class="tool widget"><input class="f_left" type="text"></div>').get(0)
		this.addLabel(data.label)
		this.jq = $(this.node).find('input')
		if (typeof data.onChange === 'function') {
			this.onChange = data.onChange
		}
		this.value = new tinycolor('ffffff')
		this.jq.spectrum({
			preferredFormat: "hex",
			color: 'ffffff',
			showAlpha: true,
			showInput: true,
			maxSelectionSize: 128,
			showPalette: data.palette === true,
			palette: data.palette ? [] : undefined,
			show: function() {
				open_interface = scope
			},
			hide: function() {
				open_interface = false
			},
			change: function(c) {
				scope.change(c)
			}
		})
	}
	change(color) {
		if (this.onChange) {
			this.onChange()
		}
	}
	hide() {
		this.jq.spectrum('cancel');
	}
	confirm() {
		this.jq.spectrum('hide');
	}
	set(color) {
		this.value = new tinycolor(color)
		this.jq.spectrum('set', this.value.toHex8String())
		return this;
	}
	get() {
		this.value = this.jq.spectrum('get');
		return this.value;
	}
}

class Toolbar {
	constructor(data) {
		var scope = this;
		this.children = [];
		this.default_children = data.children.slice()
		this.node = $('<div class="toolbar">'+
			'<div class="content"></div>'+
			'<div class="tool toolbar_menu"><i class="material-icons">more_vert</i><div class="tooltip">'+tl('data.toolbar')+'</div></div>'+
		'</div>').get(0)
		$(this.node).find('div.toolbar_menu').click(function(event) {scope.contextmenu(event)})
		if (data) {
			this.id = data.id
			this.narrow = !!data.narrow
			this.build(data)
		}
	}
	build(data, force) {
		var scope = this;
		//Items
		this.children.length = 0;
		var items = data.children
		if (!force && BARS.stored[scope.id] && typeof BARS.stored[scope.id] === 'object') {
			items = BARS.stored[scope.id]
		}
		if (items && items.constructor.name === 'Array') {
			var content = $(scope.node).find('div.content')
			content.children().detach()
			items.forEach(function(id) {
				if (typeof id === 'string' && id.substr(0, 1) === '_') {
					content.append('<div class="toolbar_seperator"></div>')
					scope.children.push('_'+guid().substr(0,8))
					return;
				}
				var item = BarItems[id]
				if (item) {
					scope.children.push(item)
					if (BARS.condition(item.condition)) {
						content.append(item.getNode())
					}
				}
			})
		}
		$(scope.node).toggleClass('narrow', this.narrow)
		if (data.default_place) {
			this.toPlace(this.id)
		}
		return this;
	}
	contextmenu(event) {
		this.menu.open(event, this)
	}
	editMenu() {
		var scope = this;
		BARS.editing_bar = this;
		this.children.forEach(function(c, ci) {
		})
		BARS.list.currentBar = this.children;
		showDialog('toolbar_edit');


		return this;
	}
	add(action, position) {
		if (position === undefined) position = this.children.length
		this.children.splice(position, 0, action)
		this.update()
		return this;
	}
	remove(action) {
		var i = this.children.length-1;
		while (i >= 0) {
			var item = this.children[i]
			if (item === action || item.id === action) {
				this.children.splice(i, 1)
				this.update()
				return this;
			}
			i--;
		}
		return this;
	}
	update() {
		var scope = this;
		var content = $(this.node).find('.content')
		content.find('> .tool').detach()
		var seperators = content.find('> .toolbar_seperator').detach()
		var sep_nr = 0;

		this.children.forEach(function(item, i) {
			if (typeof item === 'string') {
				var last = content.find('> :last-child')
				if (last.length === 0 || last.hasClass('toolbar_seperator') || i == scope.children.length-1) {
					return
				}
				var sep = seperators[sep_nr]
				if (sep) {
					content.append(sep)
					sep_nr++;
				} else {
					content.append('<div class="toolbar_seperator"></div>')
				}
			} else if (!BARS.condition( item.condition )) {
			} else {
				content.append(item.getNode())
			}
		})
		var last = content.find('> :last-child')
		if (last.length && last.hasClass('toolbar_seperator')) {
			last.remove()
		}
		this.save()
		return this;
	}
	toPlace(place) {
		if (!place) place = this.id
		$('div.toolbar_wrapper.'+place+' > .toolbar').detach()
		$('div.toolbar_wrapper.'+place).append(this.node)
		return this;
	}
	save() {
		var arr = []
		this.children.forEach(function(c) {
			if (typeof c === 'string') {
				arr.push(c)
			} else {
				arr.push(c.id)
			}
		})
		BARS.stored[this.id] = arr
		localStorage.setItem('toolbars', JSON.stringify(BARS.stored))
		return this;
	}
	reset() {
		this.build({
			children: this.default_children,
			default_place: this.default_place
		}, true)
		this.save()
		return this;
	}
}

var BARS = {
	stored: {},
	editing_bar: undefined,
	condition: function(condition, context) {
		if (condition === undefined) {
			return true;
		} else if (typeof condition === 'function') {
			return condition(context)
		} else {
			return !!condition
		}
	},
	setupActions: function() {
		BarItems = {}

		//Extras
			new KeybindItem({
				id: 'preview_select',
				category: 'navigate',
				keybind: new Keybind({key: 1, ctrl: null, shift: null, alt: null})
			})
			new KeybindItem({
				id: 'preview_rotate',
				category: 'navigate',
				keybind: new Keybind({key: 1})
			})
			new KeybindItem({
				id: 'preview_drag',
				category: 'navigate',
				keybind: new Keybind({key: 3})
			})

			new KeybindItem({
				id: 'confirm',
				category: 'navigate',
				keybind: new Keybind({key: 13})
			})
			new KeybindItem({
				id: 'cancel',
				category: 'navigate',
				keybind: new Keybind({key: 27})
			})

		//Sliders
			function moveOnAxis(value, fixed, axis) {
				selected.forEach(function(obj, i) {
					var number = value
					if (fixed) {
						number -= obj.from[axis]
					}
					number = limitToBox(obj.to  [axis] + number) - obj.to  [axis];
					number = limitToBox(obj.from[axis] + number) - obj.from[axis];
					obj.from[axis] += number
					obj.to[axis] += number
					obj.mapAutoUV()
				})
				Canvas.updatePositions()
			}
			new NumSlider({
				id: 'slider_pos_x',
				condition: function() {return selected.length},
				get: function() {
					return selected[0].from[0]
				},
				change: function(value, fixed) {
					moveOnAxis(value, fixed, 0)
				},
				onBefore: function() {
					Undo.initEdit({cubes: selected})
				},
				onAfter: function() {
					Undo.finishEdit('move')
				}
			}) 
			new NumSlider({
				id: 'slider_pos_y',
				condition: function() {return selected.length},
				get: function() {
					return selected[0].from[1]
				},
				change: function(value, fixed) {
					moveOnAxis(value, fixed, 1)
				},
				onBefore: function() {
					Undo.initEdit({cubes: selected})
				},
				onAfter: function() {
					Undo.finishEdit('move')
				}
			}) 
			new NumSlider({
				id: 'slider_pos_z',
				condition: function() {return selected.length},
				get: function() {
					return selected[0].from[2]
				},
				change: function(value, fixed) {
					moveOnAxis(value, fixed, 2)
				},
				onBefore: function() {
					Undo.initEdit({cubes: selected})
				},
				onAfter: function() {
					Undo.finishEdit('move')
				}
			})


			function scaleOnAxis(value, fixed, axis) {
				selected.forEach(function(obj, i) {
					var diff = value
					if (fixed) {
						diff -= obj.size(axis)
					}
					obj.to[axis] = limitToBox(obj.to[axis] + diff)
					obj.mapAutoUV()
				})
				Canvas.updatePositions()
			}
			new NumSlider({
				id: 'slider_size_x',
				condition: function() {return selected.length},
				get: function() {
					return selected[0].to[0] - selected[0].from[0]
				},
				change: function(value, fixed) {
					scaleOnAxis(value, fixed, 0)
				},
				onBefore: function() {
					Undo.initEdit({cubes: selected})
				},
				onAfter: function() {
					Undo.finishEdit('resize')
				}
			})
			new NumSlider({
				id: 'slider_size_y',
				condition: function() {return selected.length},
				get: function() {
					return selected[0].to[1] - selected[0].from[1]
				},
				change: function(value, fixed) {
					scaleOnAxis(value, fixed, 1)
				},
				onBefore: function() {
					Undo.initEdit({cubes: selected})
				},
				onAfter: function() {
					Undo.finishEdit('resize')
				}
			})
			new NumSlider({
				id: 'slider_size_z',
				condition: function() {return selected.length},
				get: function() {
					return selected[0].to[2] - selected[0].from[2]
				},
				change: function(value, fixed) {
					scaleOnAxis(value, fixed, 2)
				},
				onBefore: function() {
					Undo.initEdit({cubes: selected})
				},
				onAfter: function() {
					Undo.finishEdit('resize')
				}
			})

			new NumSlider({
				id: 'slider_inflate',
				condition: function() {return Blockbench.entity_mode && selected.length},
				get: function() {
					return selected[0].inflate
				},
				change: function(value, fixed) {
					selected.forEach(function(obj, i) {
						var diff = value
						if (fixed) {
							diff -= obj.inflate
						}
						obj.inflate = obj.inflate + diff
					})
					Canvas.updatePositions()
				},
				onBefore: function() {
					Undo.initEdit({cubes: selected})
				},
				onAfter: function() {
					Undo.finishEdit('inflate')
				}
			})

			function rotateOnAxis(value, fixed, axis) {
				if (Blockbench.entity_mode) {	
					if (!selected_group) return;
					if (!fixed) {
						value = value + selected_group.rotation[axis]
					}
					value = value % 360
					selected_group.rotation[axis] = value
					Canvas.updatePositions()
					return;
				}
				//Warning
				if (settings.limited_rotation.value && settings.dialog_rotation_limit.value) {
					var i = 0;
					while (i < selected.length) {
						if (selected[i].rotation[(axis+1)%3] ||
							selected[i].rotation[(axis+2)%3]
						) {
							i = Infinity

							Blockbench.showMessageBox({
								title: tl('message.rotation_limit.title'),
								icon: 'rotate_right',
								message: tl('message.rotation_limit.message'),
								buttons: [tl('dialog.ok'), tl('dialog.dontshowagain')]
							}, function(r) {
								if (r === 1) {
									settings.dialog_rotation_limit.value = false
									saveSettings()
								}
							})
							return;
							//Gotta stop the numslider here
						}
						i++;
					}
				}
				var origin = selected[0].origin
				selected.forEach(function(obj, i) {
					if (!obj.rotation.equals([0,0,0])) {
						origin = obj.origin
					}
				})
				selected.forEach(function(obj, i) {
					if (obj.rotation.equals([0,0,0])) {
						obj.origin = origin
					}
					var obj_val = value;
					if (!fixed) {
						obj_val += obj.rotation[axis]
					}
					obj_val = obj_val % 360
					if (settings.limited_rotation.value) {
						//Limit To 1 Axis
						obj.rotation[(axis+1)%3] = 0
						obj.rotation[(axis+2)%3] = 0
						//Limit Angle
						obj_val = Math.round(obj_val/22.5)*22.5
						if (obj_val > 45 || obj_val < -45) {

							let f = obj_val > 45
							obj.roll(axis, f!=(axis==1) ? 1 : 3)
							obj_val = f ? -22.5 : 22.5;
						}
					}
					obj.rotation[axis] = obj_val
				})
				Canvas.updatePositions()
			}
			function getRotationInterval(event) {
				if (settings.limited_rotation.value && !Blockbench.entity_mode) {
					return 22.5;
				} else if (event.shiftKey && event.ctrlKey) {
					return 0.25;
				} else if (event.shiftKey) {
					return 45;
				} else if (event.ctrlKey) {
					return 1;
				} else {
					return 5;
				}
			}
			new NumSlider({
				id: 'slider_rotation_x',
				condition: function() {return !!(Blockbench.entity_mode ? selected_group : selected.length)},
				get: function() {
					var obj = Blockbench.entity_mode ? selected_group : selected[0]
					return obj ? obj.rotation[0] : ''
				},
				change: function(value, fixed) {
					rotateOnAxis(value, fixed, 0)
				},
				onBefore: function() {
					Undo.initEdit({cubes: selected, group: selected_group})
				},
				onAfter: function() {
					Undo.finishEdit('rotate')
				},
				getInterval: getRotationInterval
			})
			new NumSlider({
				id: 'slider_rotation_y',
				condition: function() {return !!(Blockbench.entity_mode ? selected_group : selected.length)},
				get: function() {
					var obj = Blockbench.entity_mode ? selected_group : selected[0]
					return obj ? obj.rotation[1] : ''
				},
				change: function(value, fixed) {
					rotateOnAxis(value, fixed, 1)
				},
				onBefore: function() {
					Undo.initEdit({cubes: selected, group: selected_group})
				},
				onAfter: function() {
					Undo.finishEdit('rotate')
				},
				getInterval: getRotationInterval
			})
			new NumSlider({
				id: 'slider_rotation_z',
				condition: function() {return !!(Blockbench.entity_mode ? selected_group : selected.length)},
				get: function() {
					var obj = Blockbench.entity_mode ? selected_group : selected[0]
					return obj ? obj.rotation[2] : ''
				},
				change: function(value, fixed) {
					rotateOnAxis(value, fixed, 2)
				},
				onBefore: function() {
					Undo.initEdit({cubes: selected, group: selected_group})
				},
				onAfter: function() {
					Undo.finishEdit('rotate')
				},
				getInterval: getRotationInterval
			})


			function moveOriginOnAxis(value, fixed, axis) {
				if (selected_group) {
					var diff = value
					if (fixed) {
						diff -= selected_group.origin[axis]
					}
					selected_group.origin[axis] += diff
					Canvas.updatePositions()
					return;
				}
				selected.forEach(function(obj, i) {
					var diff = value
					if (fixed) {
						diff -= obj.origin[axis]
					}
					obj.origin[axis] += diff
				})
				Canvas.updatePositions()
			}
			new NumSlider({
				id: 'slider_origin_x',
				condition: function() {return !!(Blockbench.entity_mode ? selected_group : selected.length)},
				get: function() {
					var obj = Blockbench.entity_mode ? selected_group : selected[0]
					return obj ? obj.origin[0] : ''
				},
				change: function(value, fixed) {
					moveOriginOnAxis(value, fixed, 0)
				},
				onBefore: function() {
					Undo.initEdit({cubes: selected, group: selected_group})
				},
				onAfter: function() {
					Undo.finishEdit('origin')
				}
			})
			new NumSlider({
				id: 'slider_origin_y',
				condition: function() {return !!(Blockbench.entity_mode ? selected_group : selected.length)},
				get: function() {
					var obj = Blockbench.entity_mode ? selected_group : selected[0]
					return obj ? obj.origin[1] : ''
				},
				change: function(value, fixed) {
					moveOriginOnAxis(value, fixed, 1)
				},
				onBefore: function() {
					Undo.initEdit({cubes: selected, group: selected_group})
				},
				onAfter: function() {
					Undo.finishEdit('origin')
				}
			})
			new NumSlider({
				id: 'slider_origin_z',
				condition: function() {return !!(Blockbench.entity_mode ? selected_group : selected.length)},
				get: function() {
					var obj = Blockbench.entity_mode ? selected_group : selected[0]
					return obj ? obj.origin[2] : ''
				},
				change: function(value, fixed) {
					moveOriginOnAxis(value, fixed, 2)
				},
				onBefore: function() {
					Undo.initEdit({cubes: selected, group: selected_group})
				},
				onAfter: function() {
					Undo.finishEdit('origin')
				}
			})

		//Brush
			new BarSelect({
				id: 'vertex_snap_mode',
				options: {
					move: true,
					scale: true
				}
			})
			new ColorPicker({
				id: 'brush_color',
				palette: true
			})
			new BarSelect({
				id: 'brush_mode',
				options: {
					brush: true,
					noise: true,
					eraser: true,
					fill: true
				}
			})

			new NumSlider({
				id: 'slider_brush_size',
				settings: {
					min: 1, max: 20, step: 1, default: 1,
				}
			})
			new NumSlider({
				id: 'slider_brush_softness',
				settings: {
					min: 0, max: 100, default: 0,
					interval: function(event) {
						if (event.shiftKey && event.ctrlKey) {
							return 0.25;
						} else if (event.shiftKey) {
							return 5;
						} else if (event.ctrlKey) {
							return 1;
						} else {
							return 10;
						}
					}
				}
			})
			new NumSlider({
				id: 'slider_brush_opacity',
				settings: {
					min: 0, max: 100, default: 100,
					interval: function(event) {
						if (event.shiftKey && event.ctrlKey) {
							return 0.25;
						} else if (event.shiftKey) {
							return 5;
						} else if (event.ctrlKey) {
							return 1;
						} else {
							return 10;
						}
					}
				}
			})


		//Tools
			new Tool({
				id: 'move_tool',
				icon: 'fa-hand-paper-o',
				category: 'tools',
				selectFace: true,
				allowWireframe: true,
				transformerMode: 'translate',
				toolbar: 'transform',
				keybind: new Keybind({key: 86})
			})
			new Tool({
				id: 'resize_tool',
				icon: 'open_with',
				category: 'tools',
				selectFace: true,
				allowWireframe: true,
				transformerMode: 'scale',
				toolbar: 'transform',
				keybind: new Keybind({key: 83})
			})
			new Tool({
				id: 'brush_tool',
				icon: 'fa-paint-brush',
				category: 'tools',
				toolbar: 'brush',
				selectFace: true,
				transformerMode: 'hidden',
				paintTool: true,
				keybind: new Keybind({key: 66}),
				onCanvasClick: function(data) {
					Painter.startBrushCanvas(data, data.event)
				},
				onSelect: function() {
					BarItems.slider_brush_size.update()
					BarItems.slider_brush_softness.update()
					BarItems.slider_brush_opacity.update()
					$('.UVEditor').find('#uv_size').hide()
				},
				onUnselect: function() {
					$('.UVEditor').find('#uv_size').show()
				}
			})
			new Tool({
				id: 'vertex_snap_tool',
				icon: 'icon-vertexsnap',
				transformerMode: 'hidden',
				toolbar: 'vertex_snap',
				category: 'tools',
				selectCubes: true,
				cursor: 'copy',
				keybind: new Keybind({key: 88}),
				onCanvasClick: function(data) {
					Vertexsnap.canvasClick(data)
				},
				onSelect: function() {
					Blockbench.addListener('update_selection', Vertexsnap.select)
					Vertexsnap.select()
				},
				onUnselect: function() {
					Vertexsnap.removeVertexes()
					Vertexsnap.step1 = true
					Blockbench.removeListener('update_selection', Vertexsnap.select)
				}
			})
			new Tool({
				id: 'display_mode_tool',
				icon: 'icon-player',
				transformerMode: 'hidden',
				category: 'tools',
				selectCubes: false,
				condition: function() {return !Blockbench.entity_mode},
				onCanvasClick: function(data) {
				},
				onSelect: function() {
					enterDisplaySettings()
				},
				onUnselect: function() {
					exitDisplaySettings()
				}
			})
			/*
			new Tool({
				id: 'animation_mode_tool',
				icon: 'movie',
				transformerMode: 'hidden',
				category: 'tools',
				selectCubes: false,
				condition: () => Blockbench.entity_mode,
				onCanvasClick: function(data) {
					if (data.cube && data.cube.parent.type === 'group') {

						data.cube.parent.select()
					}
				},
				onSelect: function() {
					Animator.join()
				},
				onUnselect: function() {
					Animator.leave()
				}
			})*/

			new Action({
				id: 'swap_tools',
				icon: 'swap_horiz',
				category: 'tools',
				keybind: new Keybind({key: 32}),
				click: function () {
					if (Toolbox.selected.id === 'move_tool') {
						BarItems.resize_tool.select()
					} else if (Toolbox.selected.id === 'resize_tool') {
						BarItems.move_tool.select()
					}
				}
			})

		//File
			new Action({
				id: 'project_window',
				icon: 'featured_play_list',
				category: 'file',
				click: function () {showDialog('project_settings');}
			})
			new Action({
				id: 'open_model_folder',
				icon: 'folder_open',
				category: 'file',
				condition: () => {return isApp && Prop.file_path && Prop.file_path !== ''},
				click: function () {
					shell.showItemInFolder(Prop.file_path)
				}
			})
			new Action({
				id: 'new_block_model',
				icon: 'insert_drive_file',
				category: 'file',
				keybind: new Keybind({key: 78, ctrl: true}),
				click: function () {newProject()}
			})
			new Action({
				id: 'new_entity_model',
				icon: 'pets',
				category: 'file',
				keybind: new Keybind({key: 78, ctrl: true, shift: true}),
				click: function () {newProject(true)}
			})
			new Action({
				id: 'open_model',
				icon: 'assessment',
				category: 'file',
				keybind: new Keybind({key: 79, ctrl: true}),
				click: function () {
					Blockbench.import({
						extensions: ['json', 'jem', 'jpm'],
						type: 'JSON Model'
					}, function(files) {
						if (isApp) {
							addRecentProject({name: pathToName(files[0].path, 'mobs_id'), path: files[0].path})
						}
						loadModel(files[0].content, files[0].path)
					})
				}
			})
			new Action({
				id: 'add_model',
				icon: 'assessment',
				category: 'file',
				click: function () {
					Blockbench.import({
						extensions: ['json', 'jem', 'jpm'],
						type: 'JSON Model'
					}, function(files) {
						if (isApp) {
							addRecentProject({name: pathToName(files[0].path, 'mobs_id'), path: files[0].path})
						}
						loadModel(files[0].content, files[0].path, true)
					})
				}
			})
			new Action({
				id: 'extrude_texture',
				icon: 'eject',
				category: 'file',
				click: function () {
					Blockbench.import({
						extensions: ['png'],
						type: 'PNG Texture',
						readtype: 'image'
					}, function(files) {
						if (files.length) {
							if (isApp) {
			                	new Texture().fromPath(files[0].path).add().fillParticle()
							} else {
			                	new Texture().fromDataURL(files[0].content).add().fillParticle()
							}
			                showDialog('image_extruder')
							Extruder.drawImage(isApp ? files[0].path : files[0].content)
						}
					})
				}
			})
			new Action({
				id: 'export_blockmodel',
				icon: 'insert_drive_file',
				category: 'file',
				keybind: new Keybind({key: 83, ctrl: true, shift: true}),
				condition: function() {return !Blockbench.entity_mode},
				click: function () {
					var content = buildBlockModel()
					Blockbench.export({
						type: 'JSON Model',
						extensions: ['json'],
						name: Project.name||'model',
						startpath: Prop.file_path,
						content: content
					})
				}
			})
			new Action({
				id: 'export_entity',
				icon: 'pets',
				category: 'file',
				keybind: new Keybind({key: 83, ctrl: true, shift: true}),
				condition: function() {return Blockbench.entity_mode},
				click: function () {
					var content = buildEntityModel({raw: true});
					Blockbench.export({
						type: 'JSON Entity Model',
						extensions: ['json'],
						name: Project.name,
						startpath: Prop.file_path,
						content: content,
						custom_writer: writeFileEntity
					})
				}
			})
			new Action({
				id: 'export_optifine_part',
				icon: 'icon-optifine_file',
				category: 'file',
				condition: function() {return !Blockbench.entity_mode},
				click: function () {
					var content = buildJPMModel()
					Blockbench.export({
						type: 'Optifine Part Model',
						extensions: ['jpm'],
						name: Project.name,
						startpath: Prop.file_path,
						content: content
					})
				}
			})
			new Action({
				id: 'export_optifine_full',
				icon: 'icon-optifine_file',
				category: 'file',
				condition: function() {return Blockbench.entity_mode},
				click: function () {
					var content = buildJEMModel()
					Blockbench.export({
						type: 'Optifine Entity Model',
						extensions: ['jem'],
						startpath: Prop.file_path,
						content: content
					})
				}
			})
			new Action({
				id: 'export_obj',
				icon: 'icon-objects',
				category: 'file',
				click: function () {
					Blockbench.export({
						type: 'Alias Wavefront',
						extensions: ['obj'],
						startpath: Prop.file_path,
						custom_writer: writeFileObj
					})
				}
			})
			new Action({
				id: 'save',
				icon: 'save',
				category: 'file',
				keybind: new Keybind({key: 83, ctrl: true}),
				click: function () {saveFile();saveTextures();}
			})
			new Action({
				id: 'settings_window',
				icon: 'settings',
				category: 'blockbench',
				keybind: new Keybind({key: 69, ctrl: true}),
				click: function () {openSettings()}
			})
			new Action({
				id: 'plugins_window',
				icon: 'extension',
				category: 'blockbench',
				click: function () {showDialog('plugins')}
			})
			new Action({
				id: 'update_window',
				icon: 'update',
				category: 'blockbench',
				condition: isApp,
				click: function () {checkForUpdates()}
			})
			new Action({
				id: 'donate',
				icon: 'loyalty',
				category: 'blockbench',
				click: function () {Blockbench.openLink('http://blockbench.net/donate')}
			})

		//Dialogs, UI
			new Action({
				id: 'reset_keybindings',
				icon: 'replay',
				category: 'blockbench',
				click: function () {Keybinds.reset()}
			})
			new Action({
				id: 'import_layout',
				icon: 'folder',
				category: 'blockbench',
				click: function () {
					Blockbench.import({
						extensions: ['bbstyle', 'js'],
						type: 'Blockbench Style'
					}, function(files) {
						applyBBStyle(files[0].content)
					})
				}
			})
			new Action({
				id: 'export_layout',
				icon: 'style',
				category: 'blockbench',
				click: function () {
					Blockbench.export({
						type: 'Blockbench Style',
						extensions: ['bbstyle'],
						content: autoStringify(app_colors)
					})
				}
			})
			new Action({
				id: 'reset_layout',
				icon: 'replay',
				category: 'blockbench',
				click: function () {
					colorSettingsSetup(true)
					Interface.data = $.extend(true, {}, Interface.default_data)
					Interface.data.left_bar.forEach((id) => {
						$('#left_bar').append(Interface.Panels[id].node)
					})
					Interface.data.right_bar.forEach((id) => {
						$('#right_bar').append(Interface.Panels[id].node)
					})
					updateInterface()
				}
			})
			new Action({
				id: 'load_plugin',
				icon: 'fa-file-code-o',
				category: 'blockbench',
				click: function () {
					Blockbench.import({
						extensions: ['bbplugin', 'js'],
						type: 'Blockbench Plugin',
						startpath: localStorage.getItem('plugin_dev_path')
					}, function(files) {
						loadPluginFromFile(files[0])
					})
				}
			})

		//Edit
			new Action({
				id: 'undo',
				icon: 'undo',
				category: 'edit',
				condition: () => (!display_mode && !Animator.state),
				keybind: new Keybind({key: 90, ctrl: true}),
				click: function () {Undo.undo()}
			})
			new Action({
				id: 'redo',
				icon: 'redo',
				category: 'edit',
				condition: () => (!display_mode && !Animator.state),
				keybind: new Keybind({key: 89, ctrl: true}),
				click: function () {Undo.redo()}
			})
			new Action({
				id: 'copy',
				icon: 'fa-clone',
				category: 'edit',
				work_in_dialog: true,
				keybind: new Keybind({key: 67, ctrl: true, shift: null}),
				click: function (event) {Clipbench.copy(event)}
			})
			new Action({
				id: 'paste',
				icon: 'fa-clipboard',
				category: 'edit',
				work_in_dialog: true,
				keybind: new Keybind({key: 86, ctrl: true, shift: null}),
				click: function (event) {Clipbench.paste(event)}
			})
			new Action({
				id: 'cut',
				icon: 'fa-scissors',
				category: 'edit',
				work_in_dialog: true,
				keybind: new Keybind({key: 88, ctrl: true, shift: null}),
				click: function (event) {Clipbench.copy(event, true)}
			})
			new Action({
				id: 'duplicate',
				icon: 'content_copy',
				category: 'edit',
				keybind: new Keybind({key: 68, ctrl: true}),
				click: function () {
					duplicateCubes();
				}
			})
			new Action({
				id: 'delete',
				icon: 'delete',
				category: 'edit',
				keybind: new Keybind({key: 46}),
				click: function () {
					deleteCubes();
				}
			})
			new Action({
				id: 'sort_outliner',
				icon: 'sort_by_alpha',
				category: 'edit',
				click: function () {
					Undo.initEdit({outliner: true});
					sortOutliner();
					Undo.finishEdit('sort_outliner')
				}
			})
			new Action({
				id: 'local_move',
				icon: 'check_box',
				category: 'edit',
				linked_setting: 'local_move',
				click: function () {
					BarItems.local_move.toggleLinkedSetting()
					updateSelection()
				}
			})
			new Action({
				id: 'select_window',
				icon: 'filter_list',
				category: 'edit',
				keybind: new Keybind({key: 70, ctrl: true}),
				click: function () {
					showDialog('selection_creator')
					$('#selgen_name').focus()
				}
			})
			new Action({
				id: 'invert_selection',
				icon: 'swap_vert',
				category: 'edit',
				keybind: new Keybind({key: 73, ctrl: true, shift: true}),
				click: function () {invertSelection()}
			})
			new Action({
				id: 'select_all',
				icon: 'select_all',
				category: 'edit',
				keybind: new Keybind({key: 65, ctrl: true}),
				click: function () {selectAll()}
			})
			new Action({
				id: 'collapse_groups',
				icon: 'format_indent_decrease',
				category: 'edit',
				condition: function() {
					return TreeElements.length > 0
				},
				click: function () {collapseAllGroups()}
			})

		//Transform
			new Action({
				id: 'scale',
				icon: 'settings_overscan',
				category: 'transform',
				click: function () {
					$('#model_scale_range').val(1)
					$('#model_scale_label').val(1)

					Undo.initEdit({cubes: selected})

					selected.forEach(function(obj) {
						obj.before = {
							from: obj.from.slice(),
							to: obj.to.slice(),
							origin: obj.origin.slice()
						}
					})
					showDialog('scaling')
				}
			})
			new Action({
				id: 'rotate_x_cw',
				icon: 'rotate_right',
				color: 'x',
				category: 'transform',
				click: function () {
					rotateSelected(0, 1);
				}
			})
			new Action({
				id: 'rotate_x_ccw',
				icon: 'rotate_left',
				color: 'x',
				category: 'transform',
				click: function () {
					rotateSelected(0, 3);
				}
			})
			new Action({
				id: 'rotate_y_cw',
				icon: 'rotate_right',
				color: 'y',
				category: 'transform',
				click: function () {
					rotateSelected(1, 1);
				}
			})
			new Action({
				id: 'rotate_y_ccw',
				icon: 'rotate_left',
				color: 'y',
				category: 'transform',
				click: function () {
					rotateSelected(1, 3);
				}
			})
			new Action({
				id: 'rotate_z_cw',
				icon: 'rotate_right',
				color: 'z',
				category: 'transform',
				click: function () {
					rotateSelected(2, 1);
				}
			})
			new Action({
				id: 'rotate_z_ccw',
				icon: 'rotate_left',
				color: 'z',
				category: 'transform',
				click: function () {
					rotateSelected(2, 3);
				}
			})

			new Action({
				id: 'flip_x',
				icon: 'icon-mirror_x',
				color: 'x',
				category: 'transform',
				click: function () {
					mirrorSelected(0);
				}
			})
			new Action({
				id: 'flip_y',
				icon: 'icon-mirror_y',
				color: 'y',
				category: 'transform',
				click: function () {
					mirrorSelected(1);
				}
			})
			new Action({
				id: 'flip_z',
				icon: 'icon-mirror_z',
				color: 'z',
				category: 'transform',
				click: function () {
					mirrorSelected(2);
				}
			})

			new Action({
				id: 'center_x',
				icon: 'vertical_align_center',
				color: 'x',
				category: 'transform',
				click: function () {
					Undo.initEdit({cubes: selected});
					centerCubes(0);
					Undo.finishEdit('center')
				}
			})
			new Action({
				id: 'center_y',
				icon: 'vertical_align_center',
				color: 'y',
				category: 'transform',
				click: function () {
					Undo.initEdit({cubes: selected});
					centerCubes(1);
					Undo.finishEdit('center')
				}
			})
			new Action({
				id: 'center_z',
				icon: 'vertical_align_center',
				color: 'z',
				category: 'transform',
				click: function () {
					Undo.initEdit({cubes: selected});
					centerCubes(2);
					Undo.finishEdit('center')
				}
			})
			new Action({
				id: 'center_all',
				icon: 'filter_center_focus',
				category: 'transform',
				click: function () {
					Undo.initEdit({cubes: selected});
					centerCubesAll();
					Undo.finishEdit('center')
				}
			})

			new Action({
				id: 'toggle_visibility',
				icon: 'visibility',
				category: 'transform',
				click: function () {toggleCubeProperty('visibility')}
			})
			new Action({
				id: 'toggle_export',
				icon: 'save',
				category: 'transform',
				click: function () {toggleCubeProperty('export')}
			})
			new Action({
				id: 'toggle_autouv',
				icon: 'fullscreen_exit',
				category: 'transform',
				click: function () {toggleCubeProperty('autouv')}
			})
			new Action({
				id: 'toggle_shade',
				icon: 'wb_sunny',
				category: 'transform',
				click: function () {toggleCubeProperty('shade')}
			})
			new Action({
				id: 'rename',
				icon: 'text_format',
				category: 'transform',
				keybind: new Keybind({key: 113}),
				click: function () {renameCubes()}
			})
			new Action({
				id: 'update_autouv',
				icon: 'brightness_auto',
				category: 'transform',
				condition: () => !Blockbench.entity_mode,
				click: function () {
					if (selected.length) {
						Undo.initEdit({cubes: selected[0].forSelected(), selection: true})
						selected[0].forSelected(function(cube) {
							cube.mapAutoUV()
						})
						Undo.finishEdit('update_autouv')
					}
				}
			})

		//Move Cube Keys
			new Action({
				id: 'move_up',
				icon: 'arrow_upward',
				category: 'transform',
				condition: () => (selected.length && !open_interface && !open_menu),
				keybind: new Keybind({key: 38, ctrl: null, shift: null}),
				click: function (e) {moveCubesRelative(-1, 2, e)}
			})
			new Action({
				id: 'move_down',
				icon: 'arrow_downward',
				category: 'transform',
				condition: () => (selected.length && !open_interface && !open_menu),
				keybind: new Keybind({key: 40, ctrl: null, shift: null}),
				click: function (e) {moveCubesRelative(1, 2, e)}
			})
			new Action({
				id: 'move_left',
				icon: 'arrow_back',
				category: 'transform',
				condition: () => (selected.length && !open_interface && !open_menu),
				keybind: new Keybind({key: 37, ctrl: null, shift: null}),
				click: function (e) {moveCubesRelative(-1, 0, e)}
			})
			new Action({
				id: 'move_right',
				icon: 'arrow_forward',
				category: 'transform',
				condition: () => (selected.length && !open_interface && !open_menu),
				keybind: new Keybind({key: 39, ctrl: null, shift: null}),
				click: function (e) {moveCubesRelative(1, 0, e)}
			})
			new Action({
				id: 'move_forth',
				icon: 'keyboard_arrow_up',
				category: 'transform',
				condition: () => (selected.length && !open_interface && !open_menu),
				keybind: new Keybind({key: 33, ctrl: null, shift: null}),
				click: function (e) {moveCubesRelative(-1, 1, e)}
			})
			new Action({
				id: 'move_back',
				icon: 'keyboard_arrow_down',
				category: 'transform',
				condition: () => (selected.length && !open_interface && !open_menu),
				keybind: new Keybind({key: 34, ctrl: null, shift: null}),
				click: function (e) {moveCubesRelative(1, 1, e)}
			})


		//View
			new Action({
				id: 'fullscreen',
				icon: 'fullscreen',
				category: 'view',
				condition: isApp,
				keybind: new Keybind({key: 122}),
				click: function () {
					currentwindow.setFullScreen(!currentwindow.isFullScreen())
				}
			})
			new Action({
				id: 'zoom_in',
				icon: 'zoom_in',
				category: 'view',
				condition: isApp,
				click: function () {setZoomLevel('in')}
			})
			new Action({
				id: 'zoom_out',
				icon: 'zoom_out',
				category: 'view',
				condition: isApp,
				click: function () {setZoomLevel('out')}
			})
			new Action({
				id: 'zoom_reset',
				icon: 'zoom_out_map',
				category: 'view',
				condition: isApp,
				click: function () {setZoomLevel('reset')}
			})
			new Action({
				id: 'toggle_wireframe',
				icon: 'border_clear',
				category: 'view',
				keybind: new Keybind({key: 90}),
				condition: () => Toolbox && Toolbox.selected && Toolbox.selected.allowWireframe,
				click: function () {toggleWireframe()}
			})

			new Action({
				id: 'screenshot_model',
				icon: 'fa-cubes',
				category: 'view',
				keybind: new Keybind({key: 80, ctrl: true}),
				click: function () {quad_previews.current.screenshot()}
			})
			new Action({
				id: 'screenshot_app',
				icon: 'icon-bb_interface',
				category: 'view',
				click: function () {Screencam.fullScreen()}
			})
			new Action({
				id: 'toggle_quad_view',
				icon: 'widgets',
				category: 'view',
				keybind: new Keybind({key: 9}),
				click: function () {
					main_preview.toggleFullscreen()
				}
			})

		//Textures
			new Action({
				id: 'import_texture',
				icon: 'library_add',
				category: 'textures',
				keybind: new Keybind({key: 84, ctrl: true}),
				click: function () {
					openTexture()
				}
			})
			new Action({
				id: 'create_texture',
				icon: 'icon-create_bitmap',
				category: 'textures',
				keybind: new Keybind({key: 84, ctrl: true, shift: true}),
				click: function () {
					Painter.addBitmapDialog()
				}
			})
			new Action({
				id: 'reload_textures',
				icon: 'refresh',
				category: 'textures',
				keybind: new Keybind({key: 82, ctrl: true}),
				condition: isApp,
				click: reloadTextures
			})
			new Action({
				id: 'save_textures',
				icon: 'save',
				category: 'textures',
				keybind: new Keybind({key: 83, ctrl: true, alt: true}),
				click: function () {saveTextures()}
			})
			new Action({
				id: 'change_textures_folder',
				icon: 'fa-hdd-o',
				category: 'textures',
				condition: () => textures.length > 0,
				click: function () {changeTexturesFolder()}
			})
			new Action({
				id: 'animated_textures',
				icon: 'play_arrow',
				category: 'textures',
				condition: function() {
					if (Blockbench.entity_mode) return false;
					var i = 0;
					var show = false;
					while (i < textures.length) {
						if (textures[i].frameCount > 1) {
							show = true;
							i = textures.length
						}
						i++;
					}
					return show;
				},
				click: function () {
					TextureAnimator.toggle()
				}
			})

		//UV
			new Action({
				id: 'uv_dialog',
				icon: 'view_module',
				category: 'blockbench',
				condition: ()=>!Blockbench.entity_mode && selected.length,
				click: function () {uv_dialog.openAll()}
			})
			new Action({
				id: 'uv_dialog_full',
				icon: 'web_asset',
				category: 'blockbench',
				click: function () {uv_dialog.openFull()}
			})

			new BarSlider({
				id: 'uv_rotation',
				category: 'uv',
				condition: () => !Blockbench.entity_mode && selected.length,
				min: 0, max: 270, step: 90, width: 80,
				onChange: function(slider) {
					Undo.initEdit({cubes: selected, uv_only: true})
					uv_dialog.forSelection('rotate')
					Undo.finishEdit('uv')
				}
			})
			new BarSelect({
				id: 'uv_grid', 
				category: 'uv',
				condition: () => !Blockbench.entity_mode && selected.length,
				width: 60,
				options: {
					auto: true,
					'16': '16x16',
					'32': '32x32',
					'64': '64x64',
					none: true,
				},
				onChange: function(slider) {
					if (open_dialog) {
						uv_dialog.changeGrid(slider.get())
					} else {
						main_uv.setGrid()
					}
				}
			})
			new Action({
				id: 'uv_maximize',
				icon: 'zoom_out_map',
				category: 'uv',
				condition: () => !Blockbench.entity_mode && selected.length,
				click: function (event) { 
					Undo.initEdit({cubes: selected, uv_only: true})
					uv_dialog.forSelection('maximize', event)
					Undo.finishEdit('uv')
				}
			})
			new Action({
				id: 'uv_auto',
				icon: 'brightness_auto',
				category: 'uv',
				condition: () => !Blockbench.entity_mode && selected.length,
				click: function (event) {
					Undo.initEdit({cubes: selected, uv_only: true})
					uv_dialog.forSelection('setAutoSize', event)
					Undo.finishEdit('uv')
				}
			})
			new Action({
				id: 'uv_rel_auto',
				icon: 'brightness_auto',
				category: 'uv',
				condition: () => !Blockbench.entity_mode && selected.length,
				click: function (event) {
					Undo.initEdit({cubes: selected, uv_only: true})
					uv_dialog.forSelection('setRelativeAutoSize', event)
					Undo.finishEdit('uv')
				}
			})
			new Action({
				id: 'uv_mirror_x',
				icon: 'icon-mirror_x',
				category: 'uv',
				condition: () => !Blockbench.entity_mode && selected.length,
				click: function (event) {
					Undo.initEdit({cubes: selected, uv_only: true})
					uv_dialog.forSelection('mirrorX', event)
					Undo.finishEdit('uv')
				}
			})
			new Action({
				id: 'uv_mirror_y',
				icon: 'icon-mirror_y',
				category: 'uv',
				condition: () => !Blockbench.entity_mode && selected.length,
				click: function (event) {
					Undo.initEdit({cubes: selected, uv_only: true})
					uv_dialog.forSelection('mirrorY', event)
					Undo.finishEdit('uv')
				}
			})
			new Action({
				id: 'uv_transparent',
				icon: 'clear',
				category: 'uv',
				condition: () => !Blockbench.entity_mode && selected.length,
				click: function (event) {
					Undo.initEdit({cubes: selected, uv_only: true})
					uv_dialog.forSelection('clear', event)
					Undo.finishEdit('uv')
				}
			})
			new Action({
				id: 'uv_reset',
				icon: 'replay',
				category: 'uv',
				condition: () => !Blockbench.entity_mode && selected.length,
				click: function (event) {
					Undo.initEdit({cubes: selected, uv_only: true})
					uv_dialog.forSelection('reset', event)
					Undo.finishEdit('uv')
				}
			})
			new Action({
				id: 'uv_apply_all',
				icon: 'format_color_fill',
				category: 'uv',
				condition: () => !Blockbench.entity_mode && selected.length,
				click: function (e) {
					Undo.initEdit({cubes: selected, uv_only: true})
					main_uv.applyAll(e)
					Undo.finishEdit('uv')
				}
			})
			new BarSelect({
				id: 'cullface', 
				category: 'uv',
				condition: () => !Blockbench.entity_mode && selected.length,
				options: {
					off: tl('uv_editor.no_faces'),
					north: tl('face.north'),
					south: tl('face.south'),
					west: tl('face.west'),
					east: tl('face.east'),
					top: tl('face.up'),
					bottom: tl('face.down'),
				},
				onChange: function(sel, event) {
					Undo.initEdit({cubes: selected, uv_only: true})
					uv_dialog.forSelection('switchCullface')
					Undo.finishEdit('uv')
				}
			})
			new Action({
				id: 'auto_cullface',
				icon: 'block',
				category: 'uv',
				condition: () => !Blockbench.entity_mode && selected.length,
				click: function (event) {
					Undo.initEdit({cubes: selected, uv_only: true})
					uv_dialog.forSelection('autoCullface', event)
					Undo.finishEdit('uv')
				}
			})
			new Action({
				id: 'face_tint',
				category: 'uv',
				condition: () => !Blockbench.entity_mode && selected.length,
				click: function (event) {
					Undo.initEdit({cubes: selected, uv_only: true})
					uv_dialog.forSelection('switchTint', event)
					Undo.finishEdit('uv')
				}
			})
			new Action({
				id: 'uv_shift',
				condition: () => Blockbench.entity_mode,
				icon: 'photo_size_select_large',
				category: 'uv',
				click: function () {
					showUVShiftDialog()
				}
			})

		//Rotations
			new Action({
				id: 'origin_to_geometry',
				icon: 'filter_center_focus',
				category: 'transform',
				click: function () {origin2geometry()}
			})
			new Action({
				id: 'rescale_toggle',
				icon: 'check_box_outline_blank',
				category: 'transform',
				condition: function() {return !Blockbench.entity_mode && selected.length;},
				click: function () {
					Undo.initEdit({cubes: selected})
					var value = !selected[0].rescale
					selected.forEach(function(cube) {
						cube.rescale = value
					})
					Canvas.updatePositions()
					updateNslideValues()
					Undo.finishEdit('rescale')
				}
			})
			new Action({
				id: 'bone_reset_toggle',
				icon: 'check_box_outline_blank',
				category: 'transform',
				condition: function() {return Blockbench.entity_mode && selected_group;},
				click: function () {
					Undo.initEdit({group: selected_group})
					selected_group.reset = !selected_group.reset
					updateNslideValues()
					Undo.finishEdit('bone_reset')
				}
			})

		//Outliner
			new Action({
				id: 'add_cube',
				icon: 'add_box',
				category: 'edit',
				keybind: new Keybind({key: 78, ctrl: true}),
				condition: function() {return !Blockbench.entity_mode || selected_group || selected.length},
				click: function () {
					addCube();
				}
			})
			new Action({
				id: 'add_group',
				icon: 'create_new_folder',
				category: 'edit',
				keybind: new Keybind({key: 71, ctrl: true}),
				click: function () {
					addGroup();
				}
			})
			new Action({
				id: 'outliner_toggle',
				icon: 'view_stream',
				category: 'edit',
				keybind: new Keybind({key: 115}),
				click: function () {
					toggleOutlinerOptions()
				}
			})
			new BarText({
				id: 'cube_counter',
				right: true,
				click: function() {selectAll()}
			})

		//Display Mode
			new Action({
				id: 'add_display_preset',
				icon: 'add',
				category: 'display',
				click: function () {showDialog('create_preset')}
			})

		//Animations
		/*
			new Action({
				id: 'add_animation',
				icon: 'fa-plus-circle',
				category: 'animation',
				condition: () => Animator.state,
				click: function () {
					var animation = new Animation({name: 'animation.'+Project.parent.replace(/geometry./, '')+'.new'}).add()

				}
			})
			new Action({
				id: 'load_animation_file',
				icon: 'fa-file-video-o',
				category: 'animation',
				condition: () => Animator.state,
				click: function () {
					
					Blockbench.import({
						extensions: ['json'],
						type: 'JSON Animation'
					}, function(files) {
						Animator.loadFile(files[0])
					})

				}
			})
			new Action({
				id: 'export_animation_file',
				icon: 'fa-file-video-o',
				category: 'animation',
				condition: () => Animator.state,
				click: function () {
					var content = autoStringify(Animator.buildFile())
					Blockbench.export({
						type: 'JSON Animation',
						extensions: ['json'],
						name: Project.parent||'animation',
						startpath: Prop.file_path,
						content: content
					})

				}
			})
			new Action({
				id: 'play_animation',
				icon: 'play_arrow',
				category: 'animation',
				condition: () => Animator.state,
				click: function () {
					
					if (Animator.playing) {
						Timeline.pause()
					} else {
						Timeline.start()
					}

				}
			})*/

		//Misc
			new Action({
				id: 'reload',
				icon: 'refresh',
				category: 'file',
				condition: () => Blockbench.hasFlag('dev'),
				click: function () {Blockbench.reload()}
			})
	},
	setupToolbars: function() {
		//
		Toolbars = {}
		var stored = localStorage.getItem('toolbars')
		if (stored) {
			stored = JSON.parse(stored)
			if (typeof stored === 'object') {
				BARS.stored = stored
			}
		}
		Toolbars.outliner = new Toolbar({
			id: 'outliner',
			children: [
				'add_cube',
				'add_group',
				'outliner_toggle',
				'cube_counter'
			],
			default_place: true
		})
		//Toolbars.animations = new Toolbar({
		//	id: 'animations',
		//	children: [
		//		'add_animation',
		//		'load_animation_file',
		//		'play_animation',
		//		'export_animation_file'
		//	],
		//	default_place: true
		//})
		//Toolbars.keyframe = new Toolbar({
		//	id: 'keyframe',
		//	children: [
		//		'reload_textures'
		//	],
		//	default_place: true
		//})
		Toolbars.texturelist = new Toolbar({
			id: 'texturelist',
			children: [
				'import_texture',
				'create_texture',
				'reload_textures',
				'animated_textures'
			],
			default_place: true
		})
		Toolbars.tools = new Toolbar({
			id: 'tools',
			children: [
				'move_tool',
				'resize_tool',
				'vertex_snap_tool',
				'brush_tool',
				'display_mode_tool',
				//'animation_mode_tool'
			],
			default_place: true
		})
		Toolbars.rotation = new Toolbar({
			id: 'rotation',
			children: [
				'slider_rotation_x',
				'slider_rotation_y',
				'slider_rotation_z',
				'rescale_toggle',
				'bone_reset_toggle'
			],
			default_place: true
		})
		Toolbars.origin = new Toolbar({
			id: 'origin',
			children: [
				'slider_origin_x',
				'slider_origin_y',
				'slider_origin_z',
				'origin_to_geometry'
			],
			default_place: true
		})
		Toolbars.display = new Toolbar({
			id: 'display',
			children: [
				'copy',
				'paste',
				'add_display_preset'
			],
			default_place: true
		})
		//UV
		Toolbars.main_uv = new Toolbar({
			id: 'main_uv',
			children: [
				'uv_grid',
				'uv_apply_all',
				'uv_maximize',
				'uv_auto',
				'uv_transparent',
				'uv_rotation',
			],
			default_place: true
		})
		Toolbars.uv_dialog = new Toolbar({
			id: 'uv_dialog',
			children: [
				'uv_grid',
				'_',
				'uv_select_all',
				'uv_select_none',
				'_',
				'uv_maximize',
				'uv_auto',
				'uv_rel_auto',
				'_',
				'uv_mirror_x',
				'uv_mirror_y',
				'_',
				'copy',
				'paste',
				'_',
				'uv_transparent',
				'uv_reset',
				'_',
				'face_tint',
				'_',
				'cullface',
				'auto_cullface',
				'_',
				'uv_rotation'
			],
			default_place: true
		})
		//Tools
		Toolbars.transform = new Toolbar({
			id: 'transform',
			children: [
				'slider_pos_x',
				'slider_pos_y',
				'slider_pos_z',
				'_',
				'slider_size_x',
				'slider_size_y',
				'slider_size_z',
				'_',
				'slider_inflate'
			]
		})
		Toolbars.brush = new Toolbar({
			id: 'brush',
			children: [
				'brush_mode',
				'brush_color',
				'slider_brush_size',
				'slider_brush_opacity',
				'slider_brush_softness'
			]
		})
		Toolbars.vertex_snap = new Toolbar({
			id: 'vertex_snap',
			children: [
				'vertex_snap_mode'
			]
		})

		Toolbox = Toolbars.tools;
		Toolbox.toggleTransforms = function() {
			if (Toolbox.selected.id === 'move_tool') {
				BarItems['resize_tool'].select()
			} else if (Toolbox.selected.id === 'resize_tool') {
				BarItems['move_tool'].select()
			}
		}
		BarItems.move_tool.select()

		BarItems.reset_keybindings.toElement('#keybinds_title_bar')
		BarItems.import_layout.toElement('#layout_title_bar')
		BarItems.export_layout.toElement('#layout_title_bar')
		BarItems.reset_layout.toElement('#layout_title_bar')
		BarItems.load_plugin.toElement('#plugins_header_bar')
		BarItems.uv_dialog.toElement('#uv_title_bar')
		BarItems.uv_dialog_full.toElement('#uv_title_bar')
	},
	setupVue: function() {
		BARS.list = new Vue({
			el: '#toolbar_edit',
			data: {
				showAll: true,
				items: BarItems,
				currentBar: []
			},
			computed: {
				searchedBarItems() {

					var name = $('#action_search_bar').val().toUpperCase()
					var list = [{
						icon: 'bookmark',
						name: tl('data.seperator'),
						type: 'seperator'
					}]
					if (this.showAll == false) {
						return list
					}
					for (var key in BarItems) {
						var item = BarItems[key]
						if (name.length == 0 ||
							item.name.toUpperCase().includes(name) ||
							item.id.toUpperCase().includes(name)
						) {
							if (
								BARS.condition(item.condition) &&
								!this.currentBar.includes(item)
							) {
								list.push(item)
							}
						}
					}
					return list;
				}
			},
			methods: {
				sort: function(event) {
					var item = this.currentBar.splice(event.oldIndex, 1)[0]
					this.currentBar.splice(event.newIndex, 0, item)
					this.update()
				},
				drop: function(event) {
					var scope = this;
					var index = event.oldIndex
					$('#bar_items_current .tooltip').css('display', '')
					setTimeout(() => {
						if ($('#bar_items_current:hover').length === 0) {
							var item = this.currentBar.splice(event.oldIndex, 1)[0]
							scope.update()
						}
					}, 30)
				},
				choose: function(event) {
					$('#bar_items_current .tooltip').css('display', 'none')
				},
				update: function() {
					BARS.editing_bar.update()
				},
				addItem: function(item) {
					if (item.type === 'seperator') {
						item = '_'
					}
					this.currentBar.push(item)
					this.update()
				}
			}
		})
		BARS.list.updateSearch = function() {	
			BARS.list._data.showAll = !BARS.list._data.showAll
			BARS.list._data.showAll = !BARS.list._data.showAll
		}
	},
	updateConditions: function() {
		for (var key in Toolbars) {
			if (Toolbars.hasOwnProperty(key) &&
				$(Toolbars[key].node).find('input[type="text"]:focus, input[type="number"]:focus, div[contenteditable="true"]:focus').length === 0
			) {
				Toolbars[key].update()
			}
		}
		uv_dialog.all_editors.forEach((editor) => {
			editor.updateInterface()
		})
	}
}

//Menu
class Menu {
	constructor(structure) {
		var scope = this;
		this.children = [];
		this.node = $('<ul class="contextMenu"></ul>')[0]
		this.structure = structure
	}
	hover(node, event) {
		if (event) event.stopPropagation()
		$(this.node).find('li.focused').removeClass('focused')
		$(this.node).find('li.opened').removeClass('opened')
		var obj = $(node)
		obj.addClass('focused')
		obj.parents('li.parent').addClass('opened')

		if (obj.hasClass('parent')) {
			var childlist = obj.find('> ul.contextMenu.sub')

			var p_width = obj.outerWidth()
			childlist.css('left', p_width + 'px')
			var el_width = childlist.width()
			var offset = childlist.offset()
			var el_height = childlist.height()

			if (offset.left + el_width > $(window).width()) {
				childlist.css('left', -el_width + 'px')
			}

			if (offset.top + el_height > $(window).height()) {
				childlist.css('margin-top', 4-childlist.height() + 'px')
				if (childlist.offset().top < 0) {
					var space = $(window).height() - $(window).height()
					childlist.offset({top: space/2})
				}
			}
			if (el_height > $(window).height()) {
				childlist.css('height', $(window).height()+'px').css('overflow-y', 'scroll')
			}
		}
	}
	open(position, context) {

		var scope = this;
		var ctxmenu = $(this.node)
		if (open_menu) {
			open_menu.hide()
		}
		$('body').append(ctxmenu)

		ctxmenu.children().detach()

		function getEntry(s, parent) {

			var entry;
			if (s === '_') {
				entry = new MenuSeperator().menu_node
				var last = parent.children().last()
				if (last.length && !last.hasClass('menu_seperator')) {
					parent.append(entry)
				}
			} else if (typeof s === 'string' || s instanceof Action) {
				if (typeof s === 'string') {
					s = BarItems[s]
				}
				if (!s) {
					return;
				}
				s.menu_node.addEventListener('click', s.click)
				entry = s.menu_node
				if (BARS.condition(s.condition)) {
					parent.append(entry)
					$(entry).on('mouseenter mousedown', function(e) {
						scope.hover(this, e)
					})
				}
			} else if (typeof s === 'object') {

				if (BARS.condition(s.condition, context)) {

					var icon = Blockbench.getIconNode(s.icon, s.color)
					entry = $('<li>' + tl(s.name) + '</li>')
					entry.prepend(icon)
					if (typeof s.click === 'function') {
						entry.click(function() {s.click(context)})
					}
					//Submenu
					if (typeof s.children == 'function' || typeof s.children == 'object') {
						if (typeof s.children == 'function') {
							var list = s.children(context)
						} else {
							var list = s.children
						}
						if (list.length) {
							entry.addClass('parent')
							var childlist = $('<ul class="contextMenu sub"></ul>')
							entry.append(childlist)
							list.forEach(function(s2, i) {
								getEntry(s2, childlist)
							})
							var last = childlist.children().last()
							if (last.length && last.hasClass('menu_seperator')) {
								last.remove()
							}
						}
					}
					parent.append(entry)
					entry.mouseenter(function(e) {
						scope.hover(this, e)
					})
				}
			}
		}

		this.structure.forEach(function(s, i) {
			getEntry(s, ctxmenu)
		})
		var last = ctxmenu.children().last()
		if (last.length && last.hasClass('menu_seperator')) {
			last.remove()
		}

		var el_width = ctxmenu.width()
		var el_height = ctxmenu.height()

		if (position && position.clientX !== undefined) {
			var offset_left = position.clientX
			var offset_top  = position.clientY
		} else {
			if (!position && scope.type === 'bar_menu') {
				position = scope.label
			}
			var offset_left = $(position).offset().left
			var offset_top  = $(position).offset().top + $(position).height()+3
		}

		if (offset_left > $(window).width() - el_width) {
			offset_left -= el_width
		}
		if (offset_top  > $(window).height() - el_height ) {
			offset_top -= el_height
		}

		ctxmenu.css('left', offset_left+'px')
		ctxmenu.css('top',  offset_top +'px')

		$(this.node).filter(':not(.tx)').addClass('tx').click(function(ev) {
			if (
				ev.target.className.includes('parent') ||
				(ev.target.parentNode && ev.target.parentNode.className.includes('parent'))
			) {} else {
				scope.hide()
			}

		})

		if (this.type === 'bar_menu') {
			MenuBar.open = this
			$(this.label).addClass('opened')
		}
		open_menu = this;
		return this;

	}
	show(position) {
		return this.open(position);
	}
	hide() {
		$(this.node).detach()
		open_menu = undefined;
		return this;
	}
	conditionMet() {
		if (this.condition === undefined) {
			return true;
		} else if (typeof this.condition === 'function') {
			return this.condition()
		} else {
			return !!this.condition
		}
	}
	addAction(action, path) {

		if (path === undefined) path = ''
		path = path.split('.')

		function traverse(arr, layer) {
			if (path.length === layer || path[layer] === '' || !isNaN(parseInt(path[layer]))) {
				var index = arr.length;
				if (path[layer] !== '' && path.length !== layer) {
					index = parseInt(path[layer])
				}
				arr.splice(index, 0, action)
			} else {
				for (var i = 0; i < arr.length; i++) {
					var item = arr[i]
					if (item.children && item.children.length > 0 && item.id === path[layer] && layer < 20) {
						traverse(item.children, layer+1)
						i = 1000
					}
				}
			}
		}
		traverse(this.structure, 0)
	}
	removeAction(path) {

		if (path === undefined) path = ''
		path = path.split('.')

		function traverse(arr, layer) {
			var result;
			if (!isNaN(parseInt(path[layer]))) {
				result = arr[parseInt(path[layer])]

			} else if (typeof path[layer] === 'string') {
				var i = arr.length-1;
				while (i >= 0) {
					var item = arr[i]
					if (item.id === path[layer] && layer < 20) {
						if (layer === path.length-1) {
							arr.splice(i, 1)
						} else if (item.children) {
							traverse(item.children, layer+1)
						}
					}
					i--;
				}
			}
		}
		traverse(this.structure, 0)
	}
}
class BarMenu extends Menu {
	constructor(id, structure, condition) {
		super()
		var scope = this;
		this.type = 'bar_menu'
		this.id = id
		this.children = [];
		this.condition = condition
		this.node = $('<ul class="contextMenu"></ul>')[0]
		this.label = $('<li class="menu_bar_point">'+tl('menu.'+id)+'</li>')[0]
		$(this.label).click(function() {
			if (open_menu === scope) {
				scope.hide()
			} else {
				scope.open()
			}
		})
		$(this.label).mouseenter(function() {
			if (MenuBar.open && MenuBar.open !== scope) {
				scope.open()
			}
		})
		this.structure = structure
	}
	hide() {
		$(this.node).detach()
		$(this.label).removeClass('opened')
		MenuBar.open = undefined
		open_menu = undefined;
		return this;
	}
}
var MenuBar = {
	menues: {},
	open: undefined,
	setup: function() {
		MenuBar.menues.file = new BarMenu('file', [
			'project_window',
			{name: 'menu.file.new', id: 'new', icon: 'insert_drive_file', children: [
				'new_block_model',
				'new_entity_model'
			]},
			{name: 'menu.file.recent', id: 'recent', icon: 'history', condition: function() {return isApp && recent_projects.length}, children: function() {
				var arr = []
				recent_projects.forEach(function(p) {
					var entity = p.name.substr(0,4) === 'mobs'
					arr.splice(0, 0, {
						name: p.name,
						path: p.path,
						icon: entity ? 'view_list' : 'insert_drive_file',
						click: function() {
							readFile(p.path, true)
						}
					})
				})
				return arr
			}},
			'open_model',
			{name: 'menu.file.import', id: 'import', icon: 'insert_drive_file', children: [
				'add_model',
				'extrude_texture'
			]},
			{name: 'menu.file.export', id: 'export', icon: 'insert_drive_file', children: [
				'export_blockmodel',
				'export_entity',
				'export_optifine_part',
				'export_optifine_full',
				'export_obj'
			]},
			'save',
			'_',
			'settings_window',
			'update_window',
			'show_tip',
			'donate',
			'reload'
		])
		MenuBar.menues.edit = new BarMenu('edit', [
			'undo',
			'redo',
			'_',
			'add_cube',
			'duplicate',
			'delete',
			'sort_outliner',
			'_',
			'local_move',
			'_',
			'select_window',
			'invert_selection'
		], function() {return !display_mode})
		MenuBar.menues.transform = new BarMenu('transform', [
			'scale',
			{name: 'menu.transform.rotate', id: 'rotate', icon: 'rotate_90_degrees_ccw', children: [
				'rotate_x_cw',
				'rotate_x_ccw',
				'rotate_y_cw',
				'rotate_y_ccw',
				'rotate_z_cw',
				'rotate_z_ccw'
			]},
			{name: 'menu.transform.flip', id: 'flip', icon: 'flip', children: [
				'flip_x',
				'flip_y',
				'flip_z'
			]},
			{name: 'menu.transform.center', id: 'center', icon: 'filter_center_focus', children: [
				'center_x',
				'center_y',
				'center_z',
				'center_all'
			]},
			{name: 'menu.transform.properties', id: 'properties', icon: 'navigate_next', children: [
				'toggle_visibility',
				'toggle_export',
				'toggle_autouv',
				'toggle_shade',
				'rename'
			]}

		], function() {return !display_mode})
		MenuBar.menues.filter = new BarMenu('filter', [
			'plugins_window',
			'_'
			/*
			plaster
			optimize
			sort by transparency
			entity / player model / shape generator
			*/

		], function() {return !display_mode})

		MenuBar.menues.display = new BarMenu('display', [
			'copy',
			'paste',
			'_',
			'add_display_preset',
			{name: 'menu.display.preset', icon: 'fa-list', children: function() {
				var presets = []
				display_presets.forEach(function(p) {
					var icon = 'label'
					if (p.fixed) {
						switch(p.id) {
							case 'item': icon = 'filter_vintage'; break;
							case 'block': icon = 'fa-cube'; break;
							case 'handheld': icon = 'build'; break;
							case 'rod': icon = 'remove'; break;
						}
					}
					presets.push({
						icon: icon,
						name: p.id ? tl('display.preset.'+p.id) : p.name,
						click: function() {
							applyDisplayPreset(p)
						}
					})
				})
				return presets;
			}},
			{name: 'menu.display.preset_all', icon: 'fa-list', children: function() {
				var presets = []
				display_presets.forEach(function(p) {
					var icon = 'label'
					if (p.fixed) {
						switch(p.id) {
							case 'item': icon = 'filter_vintage'; break;
							case 'block': icon = 'fa-cube'; break;
							case 'handheld': icon = 'build'; break;
							case 'rod': icon = 'remove'; break;
						}
					}
					presets.push({
						icon: icon,
						name: p.id ? tl('display.preset.'+p.id) : p.name,
						click: function() {
							applyDisplayPreset(p, true)
						}
					})
				})
				return presets;
			}},
			{name: 'menu.display.remove_preset', icon: 'fa-list', children: function() {
				var presets = []
				display_presets.forEach(function(p) { 
					if (!p.fixed) {
						presets.push({
							icon: 'label',
							name: p.name,
							click: function() {
								display_presets.splice(display_presets.indexOf(p),1)
							}
						})
					}
				})
				return presets;
			}}
		], function() {return display_mode})


		MenuBar.menues.view = new BarMenu('view', [
			'fullscreen',
			{name: 'menu.view.zoom', id: 'zoom', condition: isApp, icon: 'search', children: [
				'zoom_in',
				'zoom_out'
			]},
			'_',
			'toggle_wireframe',
			'toggle_quad_view',
			{name: 'menu.view.screenshot', id: 'screenshot', condition: isApp, icon: 'camera_alt', children: [
				'screenshot_model',
				'screenshot_app'
			]},
		])
		MenuBar.update()
	},
	update: function() {
		var bar = $('#menu_bar')
		bar.children().detach()
		this.keys = []
		for (var menu in MenuBar.menues) {
			if (MenuBar.menues.hasOwnProperty(menu)) {
				if (MenuBar.menues[menu].conditionMet()) {
					bar.append(MenuBar.menues[menu].label)
					this.keys.push(menu)
				}
			}
		}
	},
	getNode: function(data) {	
	},
	addAction: function(action, path) {
		if (path) {
			path = path.split('.')
			var menu = MenuBar.menues[path.splice(0, 1)[0]]
			if (menu) {
				menu.addAction(action, path.join('.'))
			}
		}
	},
	removeAction: function(path) {
		if (path) {
			path = path.split('.')
			var menu = MenuBar.menues[path.splice(0, 1)[0]]
			if (menu) {
				menu.removeAction(path.join('.'))
			}
		}
	}
}
var Keybinds = {
	actions: [],
	stored: {},
	extra: {},
	structure: {},
	save: function() {
		localStorage.setItem('keybindings', JSON.stringify(Keybinds.stored))
	},
	reset: function() {
		for (var category in Keybinds.structure) {
			var entries = Keybinds.structure[category].actions
			if (entries && entries.length) {
				entries.forEach(function(item) {
					if (item.keybind) {
						if (item.default_keybind) {
							item.keybind.set(item.default_keybind);
						} else {
							item.keybind.clear();
						}
						item.keybind.save(false)
					}
				})
			}
		}
		Keybinds.save()
	}
}
if (localStorage.getItem('keybindings')) {
	try {
		Keybinds.stored = JSON.parse(localStorage.getItem('keybindings'))
	} catch (err) {}
}

Toolbar.prototype.menu = new Menu([
	//Needs to be down here because Menu isn't defined before
	{name: 'menu.toolbar.edit', icon: 'edit', click: function(bar) {
		bar.editMenu()
	}},
	{name: 'menu.toolbar.reset', icon: 'refresh', click: function(bar) {
		bar.reset()
	}}
])