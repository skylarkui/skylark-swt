/**
 * skylark-fuelux - A version of fuelux that ported to running on skylarkjs
 * @author Hudaokeji, Inc.
 * @version v0.9.2
 * @link https://github.com/skylarkui/skylark-fuelux/
 * @license MIT
 */
define(["skylark-langx/langx","skylark-domx/browser","skylark-domx/eventer","skylark-domx/noder","skylark-domx/geom","skylark-domx/query","./fuelux","./dropdown-autoflip"],function(t,e,i,l,s,n,a){var o=n.fn.pillbox,r=a.CONST,d=r.COMMA_KEYCODE,h=r.ENTER_KEYCODE,p=a.isBackspaceKey,u=a.isDeleteKey,c=a.isTabKey,m=a.isUpArrow,f=a.isDownArrow,g=a.cleanInput,v=a.isShiftHeld,$=a.Pillbox=a.WidgetBase.inherit({klassName:"Pillbox",init:function(e,i){this.$element=n(e),this.$moreCount=this.$element.find(".pillbox-more-count"),this.$pillGroup=this.$element.find(".pill-group"),this.$addItem=this.$element.find(".pillbox-add-item"),this.$addItemWrap=this.$addItem.parent(),this.$suggest=this.$element.find(".suggest"),this.$pillHTML='<li class="btn btn-default pill">\t<span></span>\t<span class="glyphicon glyphicon-close">\t\t<span class="sr-only">Remove</span>\t</span></li>',this.options=t.mixin({},n.fn.pillbox.defaults,i),-1===this.options.readonly?void 0!==this.$element.attr("data-readonly")&&this.readonly(!0):this.options.readonly&&this.readonly(!0),this.acceptKeyCodes=this._generateObject(this.options.acceptKeyCodes),this.$element.on("click.fu.pillbox",".pill-group > .pill",t.proxy(this.itemClicked,this)),this.$element.on("click.fu.pillbox",t.proxy(this.inputFocus,this)),this.$element.on("keydown.fu.pillbox",".pillbox-add-item",t.proxy(this.inputEvent,this)),this.options.onKeyDown&&this.$element.on("mousedown.fu.pillbox",".suggest > li",t.proxy(this.suggestionClick,this)),this.options.edit&&(this.$element.addClass("pills-editable"),this.$element.on("blur.fu.pillbox",".pillbox-add-item",t.proxy(this.cancelEdit,this))),this.$element.on("blur.fu.pillbox",".pillbox-add-item",t.proxy(this.inputEvent,this))},destroy:function(){return this.$element.remove(),this.$element[0].outerHTML},items:function(){var t=this;return this.$pillGroup.children(".pill").map(function(){return t.getItemData(n(this))}).get()},itemClicked:function(e){var i,l=n(e.target);if(e.preventDefault(),e.stopPropagation(),this._closeSuggestions(),l.hasClass("pill"))i=l;else if(i=l.parent(),void 0===this.$element.attr("data-readonly")){if(l.hasClass("glyphicon-close"))return this.options.onRemove?this.options.onRemove(this.getItemData(i,{el:i}),t.proxy(this._removeElement,this)):this._removeElement(this.getItemData(i,{el:i})),!1;if(this.options.edit){if(i.find(".pillbox-list-edit").length)return!1;this.openEdit(i)}}return this.$element.trigger("clicked.fu.pillbox",this.getItemData(i)),!0},readonly:function(t){t?this.$element.attr("data-readonly","readonly"):this.$element.removeAttr("data-readonly"),this.options.truncate&&this.truncate(t)},suggestionClick:function(t){var e=n(t.currentTarget),i={text:e.html(),value:e.data("value")};t.preventDefault(),this.$addItem.val(""),e.data("attr")&&(i.attr=JSON.parse(e.data("attr"))),i.data=e.data("data"),this.addItems(i,!0),this._closeSuggestions()},itemCount:function(){return this.$pillGroup.children(".pill").length},addItems:function(){var e,i,l,s=this;!isFinite(String(arguments[0]))||arguments[0]instanceof Array?l=(e=[].slice.call(arguments).slice(0))[1]&&!e[1].text:(e=[].slice.call(arguments).slice(1),i=arguments[0]),e[0]instanceof Array&&(e=e[0]),e.length&&(t.each(e,function(t,i){var l={text:i.text,value:i.value?i.value:i.text,el:s.$pillHTML};i.attr&&(l.attr=i.attr),i.data&&(l.data=i.data),e[t]=l}),this.options.edit&&this.currentEdit&&(e[0].el=this.currentEdit.wrap("<div></div>").parent().html()),l&&e.pop(1),s.options.onAdd&&l?this.options.edit&&this.currentEdit?s.options.onAdd(e[0],t.proxy(s.saveEdit,this)):s.options.onAdd(e[0],t.proxy(s.placeItems,this)):this.options.edit&&this.currentEdit?s.saveEdit(e):i?s.placeItems(i,e):s.placeItems(e,l))},removeItems:function(t,e){if(t)for(var i=e||1,l=0;l<i;l++){var s=this.$pillGroup.find("> .pill:nth-child("+t+")");if(!s)break;s.remove()}else this.$pillGroup.find(".pill").remove(),this._removePillTrigger({method:"removeAll"})},placeItems:function(){var e,i,l,s;if(!isFinite(String(arguments[0]))||arguments[0]instanceof Array?s=(e=[].slice.call(arguments).slice(0))[1]&&!e[1].text:(e=[].slice.call(arguments).slice(1),i=arguments[0]),e[0]instanceof Array&&(e=e[0]),e.length){var a=[];t.each(e,function(e,i){var l=n(i.el);l.attr("data-value",i.value),l.find("span:first").html(i.text),i.attr&&t.each(i.attr,function(t,e){"cssClass"===t||"class"===t?l.addClass(e):l.attr(t,e)}),i.data&&l.data("data",i.data),a.push(l)}),this.$pillGroup.children(".pill").length>0?i&&(l=this.$pillGroup.find(".pill").eq(i)).length?l.before(a):this.$pillGroup.children(".pill").last().after(a):this.$pillGroup.prepend(a),s&&this.$element.trigger("added.fu.pillbox",{text:e[0].text,value:e[0].value})}},inputEvent:function(t){var e=this,i=e.options.cleanInput(this.$addItem.val()),l="focusout"===t.type,s=l&&i.length>0;if(this.acceptKeyCodes[t.keyCode]&&!v(t)||s){var n,a;if(this.options.onKeyDown&&this._isSuggestionsOpen()){var o=this.$suggest.find(".pillbox-suggest-sel");o.length&&(i=e.options.cleanInput(o.html()),a=e.options.cleanInput(o.data("value")),n=o.data("attr"))}return(i.replace(/[ ]*\,[ ]*/,"").match(/\S/)||this.options.allowEmptyPills&&i.length)&&(this._closeSuggestions(),this.$addItem.val("").hide(),n?this.addItems({text:i,value:a,attr:JSON.parse(n)},!0):this.addItems({text:i,value:a},!0),setTimeout(function(){e.$addItem.show().attr({size:10}).focus()},0)),t.preventDefault(),!0}if(p(t)||u(t)){if(!i.length){if(t.preventDefault(),this.options.edit&&this.currentEdit)return this.cancelEdit(),!0;this._closeSuggestions();var r=this.$pillGroup.children(".pill:last");return r.hasClass("pillbox-highlight")?this._removeElement(this.getItemData(r,{el:r})):r.addClass("pillbox-highlight"),!0}}else i.length>10&&this.$addItem.width()<this.$pillGroup.width()-6&&this.$addItem.attr({size:i.length+3});if(this.$pillGroup.find(".pill").removeClass("pillbox-highlight"),this.options.onKeyDown&&!l){if(c(t)||m(t)||f(t))return this._isSuggestionsOpen()&&this._keySuggestions(t),!0;this.callbackId=t.timeStamp,this.options.onKeyDown({event:t,value:i},function(i){e._openSuggestions(t,i)})}return!0},openEdit:function(t){var e=t.index()+1,i=this.$addItemWrap.detach().hide();this.$pillGroup.find(".pill:nth-child("+e+")").before(i),this.currentEdit=t.detach(),i.addClass("editing"),this.$addItem.val(t.find("span:first").html()),i.show(),this.$addItem.focus().select()},cancelEdit:function(t){var e;return!!this.currentEdit&&(this._closeSuggestions(),t&&this.$addItemWrap.before(this.currentEdit),this.currentEdit=!1,(e=this.$addItemWrap.detach()).removeClass("editing"),this.$addItem.val(""),this.$pillGroup.append(e),!0)},saveEdit:function(){var t=arguments[0][0]?arguments[0][0]:arguments[0];this.currentEdit=n(t.el),this.currentEdit.data("value",t.value),this.currentEdit.find("span:first").html(t.text),this.$addItemWrap.hide(),this.$addItemWrap.before(this.currentEdit),this.currentEdit=!1,this.$addItem.val(""),this.$addItemWrap.removeClass("editing"),this.$pillGroup.append(this.$addItemWrap.detach().show()),this.$element.trigger("edited.fu.pillbox",{value:t.value,text:t.text})},removeBySelector:function(){var e=[].slice.call(arguments).slice(0),i=this;t.each(e,function(t,e){i.$pillGroup.find(e).remove()}),this._removePillTrigger({method:"removeBySelector",removedSelectors:e})},removeByValue:function(){var e=[].slice.call(arguments).slice(0),i=this;t.each(e,function(t,e){i.$pillGroup.find('> .pill[data-value="'+e+'"]').remove()}),this._removePillTrigger({method:"removeByValue",removedValues:e})},removeByText:function(){var e=[].slice.call(arguments).slice(0),i=this;t.each(e,function(t,e){i.$pillGroup.find('> .pill:contains("'+e+'")').remove()}),this._removePillTrigger({method:"removeByText",removedText:e})},truncate:function(t){var e=this;if(this.$element.removeClass("truncate"),this.$addItemWrap.removeClass("truncated"),this.$pillGroup.find(".pill").removeClass("truncated"),t){this.$element.addClass("truncate");var i=this.$element.width(),l=!1,s=0,a=this.$pillGroup.find(".pill").length,o=0;this.$pillGroup.find(".pill").each(function(){var t=n(this);l?t.addClass("truncated"):(s++,e.$moreCount.text(a-s),o+t.outerWidth(!0)+e.$addItemWrap.outerWidth(!0)<=i?o+=t.outerWidth(!0):(e.$moreCount.text(a-s+1),t.addClass("truncated"),l=!0))}),s===a&&this.$addItemWrap.addClass("truncated")}},inputFocus:function(){this.$element.find(".pillbox-add-item").focus()},getItemData:function(e,i){return t.mixin({text:e.find("span:first").html()},e.data(),i)},_removeElement:function(t){t.el.remove(),delete t.el,this.$element.trigger("removed.fu.pillbox",t)},_removePillTrigger:function(t){this.$element.trigger("removed.fu.pillbox",t)},_generateObject:function(e){var i={};return t.each(e,function(t,e){i[e]=!0}),i},_openSuggestions:function(e,i){var l=n("<ul>");return this.callbackId===e.timeStamp&&(i.data&&i.data.length&&(t.each(i.data,function(t,e){var i=e.value?e.value:e.text,s=n('<li data-value="'+i+'">'+e.text+"</li>");e.attr&&s.data("attr",JSON.stringify(e.attr)),e.data&&s.data("data",e.data),l.append(s)}),this.$suggest.html("").append(l.children()),n(document).trigger("suggested.fu.pillbox",this.$suggest)),!0)},_closeSuggestions:function(){this.$suggest.html("").parent().removeClass("open")},_isSuggestionsOpen:function(){return this.$suggest.parent().hasClass("open")},_keySuggestions:function(t){var e=this.$suggest.find("li.pillbox-suggest-sel"),i=m(t);if(t.preventDefault(),e.length){var l=i?e.prev():e.next();l.length||(l=i?this.$suggest.find("li:last"):this.$suggest.find("li:first")),l&&(l.addClass("pillbox-suggest-sel"),e.removeClass("pillbox-suggest-sel"))}else(e=this.$suggest.find("li:first")).addClass("pillbox-suggest-sel")}});return $.prototype.getValue=$.prototype.items,n.fn.pillbox=function(t){var e,i=Array.prototype.slice.call(arguments,1),l=this.each(function(){var l=n(this),s=l.data("fu.pillbox"),a="object"==typeof t&&t;s||l.data("fu.pillbox",s=new $(this,a)),"string"==typeof t&&(e=s[t].apply(s,i))});return void 0===e?l:e},n.fn.pillbox.defaults={edit:!1,readonly:-1,truncate:!1,acceptKeyCodes:[h,d],allowEmptyPills:!1,cleanInput:g},n.fn.pillbox.Constructor=$,n.fn.pillbox.noConflict=function(){return n.fn.pillbox=o,this},n.fn.pillbox});
//# sourceMappingURL=sourcemaps/pillbox.js.map
