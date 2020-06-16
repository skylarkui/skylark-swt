/**
 * skylark-fuelux - A version of fuelux that ported to running on skylarkjs
 * @author Hudaokeji, Inc.
 * @version v0.9.2
 * @link https://github.com/skylarkui/skylark-fuelux/
 * @license MIT
 */
define(["skylark-langx/langx","skylark-domx/browser","skylark-domx/eventer","skylark-domx/noder","skylark-domx/geom","skylark-domx/query","./fuelux"],function(e,t,i,c,o,s,h){var n=s.fn.checkbox,a=function(e){window&&window.console&&window.console.error&&window.console.error(e)},r=h.Checkbox=h.WidgetBase.inherit({klassName:"Checkbox",init:function(t,i){this.options=e.mixin({},s.fn.checkbox.defaults,i);var c=s(t);if("label"===t.tagName.toLowerCase()){this.$label=c,this.$chk=this.$label.find('input[type="checkbox"]'),this.$container=c.parent(".checkbox"),!this.options.ignoreVisibilityCheck&&this.$chk.css("visibility").match(/hidden|collapse/)&&a("For accessibility reasons, in order for tab and space to function on checkbox, checkbox `<input />`'s `visibility` must not be set to `hidden` or `collapse`. See https://github.com/ExactTarget/fuelux/pull/1996 for more details.");var o=this.$chk.attr("data-toggle");this.$toggleContainer=s(o),this.$chk.on("change",e.proxy(this.itemchecked,this)),this.setInitialState()}else a("Checkbox must be initialized on the `label` that wraps the `input` element. See https://github.com/ExactTarget/fuelux/blob/master/reference/markup/checkbox.html for example of proper markup. Call `.checkbox()` on the `<label>` not the `<input>`")},setInitialState:function(){var e=this.$chk,t=e.prop("checked"),i=e.prop("disabled");this.setCheckedState(e,t),this.setDisabledState(e,i)},setCheckedState:function(e,t){var i=e,c=this.$label,o=this.$toggleContainer;t?(i.prop("checked",!0),c.addClass("checked"),o.removeClass("hide hidden"),c.trigger("checked.fu.checkbox")):(i.prop("checked",!1),c.removeClass("checked"),o.addClass("hidden"),c.trigger("unchecked.fu.checkbox")),c.trigger("changed.fu.checkbox",t)},setDisabledState:function(e,t){var i=s(e),c=this.$label;return t?(i.prop("disabled",!0),c.addClass("disabled"),c.trigger("disabled.fu.checkbox")):(i.prop("disabled",!1),c.removeClass("disabled"),c.trigger("enabled.fu.checkbox")),i},itemchecked:function(e){var t=s(e.target),i=t.prop("checked");this.setCheckedState(t,i)},toggle:function(){this.isChecked()?this.uncheck():this.check()},check:function(){this.setCheckedState(this.$chk,!0)},uncheck:function(){this.setCheckedState(this.$chk,!1)},isChecked:function(){return this.$chk.prop("checked")},enable:function(){this.setDisabledState(this.$chk,!1)},disable:function(){this.setDisabledState(this.$chk,!0)},destroy:function(){return this.$label.remove(),this.$label[0].outerHTML}});return r.prototype.getValue=r.prototype.isChecked,s.fn.checkbox=function(e){var t,i=Array.prototype.slice.call(arguments,1),c=this.each(function(){var c=s(this),o=c.data("fu.checkbox"),h="object"==typeof e&&e;o||c.data("fu.checkbox",o=new r(this,h)),"string"==typeof e&&(t=o[e].apply(o,i))});return void 0===t?c:t},s.fn.checkbox.defaults={ignoreVisibilityCheck:!1},s.fn.checkbox.Constructor=r,s.fn.checkbox.noConflict=function(){return s.fn.checkbox=n,this},s.fn.checkbox});
//# sourceMappingURL=sourcemaps/checkbox.js.map
