﻿/**
 * This file is part of Adguard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * Adguard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Adguard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Adguard Browser Extension.  If not, see <http://www.gnu.org/licenses/>.
 */
var Adguard = function () {

	var self = this;

	var i18n = {
		getMessage: function (id) {
			return self.localization[id];
		}
	};
	var settings = {
		iframeId: 'adguard-assistant-dialog',
		path: null,
		selectedElement: null,
		lastPreview: null,
		cssRuleIndex: null,
		urlBlockAttributes: ["src", "data"],
		urlInfo: null,
		croppedDomain: null,
		domainRule: '##'
	};

	var constants = {
		phishing: 'phishing',
		wrongRender: 'wrongRender',
		adMissing: 'adMissing',
		another: 'another',
		minComplaintMessageLength: 8,
		maxComplaintCommentLength: 500,
		iframe: {//maximum values for all browsers was leaved for compatibility
			baseWidth: 560,
			extendDetailedSettingsHeight: 460,
			detailedMenuHeight: 270,
			selectorMenuHeight: 95
		}
	};

	var utils = {
		getAllChilds: function (element) {
			var childArray = [];
			var child = element;
			while ((child = utils.getChildren(child))) {
				childArray.push(child);
			}
			return childArray;
		},
		getChildren: function (element) {
			var childs = element.childNodes;
			if (childs) {
				var count = 0;
				var child;
				var i;
				for (i = 0; i < childs.length; i++) {
					if (childs[i].nodeType == 1) {
						child = childs[i];
						count++;
					}
				}
			}
			return count == 1 ? child : null;
		},
		getParentsLevel: function (element) {
			var parent = element;
			var parentArr = [];
			while ((parent = parent.parentNode) && utils.getNodeName(parent) != "BODY") {
				parentArr.push(parent);
			}
			return parentArr;
		},

		getNodeName: function (element) {
			return element && element.nodeName ? element.nodeName.toUpperCase() : "";
		},

		getUrl: function (url) {
			var pattern = "^(([^:/\\?#]+):)?(//(([^:/\\?#]*)(?::([^/\\?#]*))?))?([^\\?#]*)(\\?([^#]*))?(#(.*))?$";
			var rx = new RegExp(pattern);
			var parts = rx.exec(url);

			return {
				host: parts[4] || "",
				path: parts[7] || ""
			};
		},

		cropDomain: function (domain) {
			return domain.replace("www.", "");
		},

		isScopeOne: function () {
			var scope = findInIframe('#oneDomainRadio').get(0);
			if (scope) {
				return scope.checked;
			} else {
				return null;
			}
		},
		makeDomainPrefix: function (inverse) {
			var result;
			var isOneDomain = utils.isScopeOne();
			if (inverse && inverse == 'true') {
				isOneDomain = !isOneDomain;
			}
			if (isOneDomain) {
				result = getCroppedDomain() + settings.domainRule;
			} else {
				result = "##";
			}

			return result;
		}
	};

	var getCroppedDomain = function () {
		if (!settings.croppedDomain) {
			settings.croppedDomain = utils.cropDomain(getUrlInfo().host);
		}
		return settings.croppedDomain;
	};

	var getUrlInfo = function () {
		if (!settings.urlInfo) {
			settings.urlInfo = utils.getUrl(document.location);
		}
		return settings.urlInfo;
	};

	var getMessage = function (msgId) {
		return self.localization[msgId];
	};

	/**
	 * Makes iframe draggable
	 *
	 * @param iframe
	 */
	var makeDraggable = function (iframe) {

		var iframeJ = findIframe();
		var dragHandle = findInIframe('#drag-handle');
		var $iframeDocument = $(iframe.get(0).contentDocument);

		var offset = Object.create(null);

		// Generalized function to get position of an event (like mousedown, mousemove, etc)
		var getEventPosition = function (e) {
			if (!e) {
				e = window.event;
			}
			return {
				x: e.screenX,
				y: e.screenY
			};
		};

		/**
		 * Function that does actual "dragging"
		 * @param x
		 * @param y
		 */
		var drag = function (x, y) {
			var newPositionX = x;
			var newPositionY = y;
			// Don't drag it off the top or left of the screen?
			if (newPositionX < 0) {
				newPositionX = 0;
			}
			if (newPositionY < 0) {
				newPositionY = 0;
			}

			iframeJ.css({
				left: newPositionX + 'px',
				top: newPositionY + 'px'
			});
		};

		var cancelIfameSelection = function (e) {
			e.preventDefault();
			e.stopPropagation();
		};

		var onMouseMove = function (e) {
			var eventPosition = getEventPosition(e);
			drag(eventPosition.x + offset.x, eventPosition.y + offset.y);
		};

		var onMouseDown = function (e) {

			var eventPosition = getEventPosition(e);
			offset.x = iframeJ.offset().left - $(window).scrollLeft() + dragHandle.position().left - eventPosition.x;
			offset.y = iframeJ.offset().top - $(window).scrollTop() + dragHandle.position().top - eventPosition.y;

			$iframeDocument.on('mousemove', onMouseMove);
			$iframeDocument.on('selectstart', cancelIfameSelection);
		};

		var onMouseUp = function () {
			$iframeDocument.off('mousemove', onMouseMove);
			$iframeDocument.off('selectstart', cancelIfameSelection);
		};

		dragHandle.on('mousedown', onMouseDown);
		$iframeDocument.on('mouseup', onMouseUp);
	};

	var getViewport = function () {
		return {
			width: window.innerWidth,
			height: window.innerHeight
		}
	};

	var getPositionsForIframe = function (offset, viewPort, height, width) {
		return {
			left: viewPort.width - width - offset,
			top: offset
		};
	};

	var createIframe = function (width, height, dfd) {
		var viewPort = getViewport();
		var constOffset = 25;
		var positions = getPositionsForIframe(constOffset, viewPort, height, width);
		var top = positions.top;
		if (top < 0) top = height / 4;
		var left = positions.left;
		var cssStyle = {
			width: width,
			height: height,
			position: 'fixed',
			left: left
		};
		cssStyle.top = top;
		//for src
		var iframe = $('<iframe />"').attr({
			id: settings.iframeId,
			'class': 'sg_ignore adg-view-important',
			frameBorder: 0,
			allowTransparency: 'true'
		}).css(cssStyle).appendTo('body');
		//load styles
		loadDefaultScriptsAndStyles(iframe, dfd);
		return iframe;
	};

	var loadDefaultScriptsAndStyles = function (iframe, dfd) {

		// Chrome doesn't inject scripts in empty iframe
		try {
			var doc = iframe[0].contentDocument;
			doc.open();
			doc.write("<html><head></head></html>");
			doc.close();
		} catch (ex) {
			// Ignore (does not work in FF)
		}

		sendMessage('load-assistant-iframe', null, function (response) {

			if (response.localization) {
				self.localization = response.localization;
			}

			var scripts = response.scripts;
			var cssContent = response.cssContent;
			var cssLink = response.cssLink;

			var iframe = document.getElementById(settings.iframeId);
			var head = iframe.contentDocument.getElementsByTagName('head')[0];

			if (scripts) {
				for (var i = 0; i < scripts.length; i++) {
					var js = document.createElement("script");
					js.type = "text/javascript";
					js.textContent = scripts[i];
					head.appendChild(js);
				}
			}
			if (cssContent) {
				var style = document.createElement("style");
				style.type = "text/css";
				style.textContent = cssContent;
				head.appendChild(style);
			}
			if (cssLink) {
				var link = document.createElement("link");
				link.type = "text/css";
				link.rel = "stylesheet";
				link.href = cssLink;
				head.appendChild(link);
			}
			dfd.resolve();
		});
	};

	var findIframe = function (iframeId) {
		if (iframeId) {
			return $('#' + iframeId);
		} else {
			return $('#' + settings.iframeId);
		}
	};

	var findInIframe = function (selector) {
		return findIframe().contents().find(selector);
	};

	var runCallbacks = function (iframe, beforeUnhide, afterUnhide) {
		if (beforeUnhide) {
			beforeUnhide(iframe);
		}
		makeDraggable(iframe);
		findInIframe('body').removeClass('adg-hide');
		if (afterUnhide) {
			afterUnhide(iframe);
		}
	};

	/**
	 * Shows dialog window (create iframe dynamically)
	 *
	 * @param content
	 * @param width
	 * @param height
	 * @param beforeUnhide
	 * @param afterUnhide
	 */
	var showDialog = function (content, width, height, beforeUnhide, afterUnhide) {
		var appendContent = function () {
			appendContentToIframe(iframe, content);
			runCallbacks(iframe, beforeUnhide, afterUnhide);
			checkPosition();
		};

		var existIframe = findIframe();
		if (existIframe.size() > 0) {
			iframe = existIframe;
			changeCurrentIframe(width, height, existIframe);
			appendContent();
			return;
		}

		var dfd = $.Deferred();
		var iframe = createIframe(width, height, dfd);
		$.when(dfd).done(appendContent);
	};

	var changeCurrentIframe = function (width, height, existIframe) {
		existIframe.css({width: width, height: height});
	};

	var appendContentToIframe = function (iframe, content) {
		iframe.contents().find('body').children().remove();
		iframe.contents().find('body').append(content);
		findInIframe('body').addClass('adg-hide');
	};


	var bindClicks = function (iframe, events) {
		$.each(events, function (key, value) {
			iframe.contents().find(key).click(value);
		});
	};

	var onSelectElementClicked = function (e) {
		e.preventDefault();
		var loaded = showSelectorMenu();
		loaded.done(function () {
			localizeMenu();
			removePreview();
			startSelector();
		});
	};

	var makeRadioButtonsAndCheckBoxes = function () {
		findInIframe('.radiobox').radioButton();
		findInIframe('.checkbox').checkbox();
	};

	var onCancelSelectModeClicked = function (e) {
		e.preventDefault();
		removePreview();
		cancelSelectMode();
		closeAssistant();
	};

	/**
	 * Cancels select mode, removes all elements using for selecting
	 */
	var cancelSelectMode = function () {
		if (self.selector) {
			self.selector.unbind();
			self.selector.removeBorders();
		}
	};

	var onElementSelected = function (path, similarPath, element) {
		settings.selectedElement = element;
		settings.path = path;
		settings.similarPath = similarPath;
		self.selector.closeSelector();
		var urlBlock = haveUrlBlockParameter(element);
		var blockSimilar = haveClassAttribute(element);
		showHidingRuleWindow(settings.path, element, urlBlock, blockSimilar);
	};

	var closeAssistant = function () {
		cancelSelectMode();
		findIframe().remove();
	};

	/**
	 * Starts AdguardSelector work
	 */
	var startSelector = function () {
		// Initializing AdguardSelector with default configuration
		if (self.selector) self.selector.clearEverything();
		self.selector = new AdguardSelector(onElementSelected);
		self.selector.setup();
	};

	var haveUrlBlockParameter = function (element) {
		var value = getUrlBlockAttribute(element);
		return value && value != '';
	};

	var haveClassAttribute = function (element) {
		var className = element.className;
		return className && className.trim() != '';
	};

	var setPath = function (path) {
		findInIframe('#filter-rule').val(path);
	};

	var makeUrlBlockFilter = function () {
		var iframe = findIframe().contents();
		var needMakeUrlBlock = iframe.find('#blockByUrl').is(':checked');
		if (!needMakeUrlBlock) {
			return 'false';
		}
		var urlMask = getUrlBlockAttribute(settings.selectedElement);
		if (!urlMask || urlMask == '') return 'false';
		var blockUrl = urlMask.replace(/^http:\/\/(www\.)?/, "||");
		var value;
		if (!iframe.find("#oneDomainRadio").is(':checked')) {
			value = "domain=" + getCroppedDomain();
		}
		var result = value;
		var filterRule = iframe.find('#filter-rule');
		filterRule.val(result ? blockUrl + "$" + result : blockUrl);
		settings.urlBlockPath = filterRule.val();
		return 'true';
	};

	var translateElement = function (element, message) {

		function createElement(tagName, attributes) {

			var el = document.createElement(tagName);
			if (!attributes) {
				return el;
			}

			var attrs = attributes.split(' ');
			for (var i = 0; i < attrs.length; i++) {
				var attr = attrs[i].trim();
				if (!attr) {
					continue;
				}
				var index = attr.indexOf("=");
				var attrName;
				var attrValue;
				if (index > 0) {
					attrName = attr.substring(0, index);
					attrValue = attr.substring(index + 2, attr.length - 1);
				}
				if (attrName && attrValue) {
					el.setAttribute(attrName, attrValue);
				}
			}

			return el;
		}

		function processString(str, element) {

			var match1 = /^(.*?)<(a|strong|span)([^>]*)>(.*?)<\/\2>(.*)$/.exec(str);
			var match2 = /^(.*?)<(br|input)([^>]*)\/?>(.*)$/.exec(str);
			if (match1) {

				processString(match1[1], element);

				var e = createElement(match1[2], match1[3]);

				processString(match1[4], e);
				element.appendChild(e);

				processString(match1[5], element);

			} else if (match2) {

				processString(match2[1], element);

				var e = createElement(match2[2], match2[3]);
				element.appendChild(e);

				processString(match2[4], element);

			} else {
				element.appendChild(document.createTextNode(str.replace(/&nbsp;/g, '\u00A0')));
			}
		}

		while (element.lastChild) {
			element.removeChild(element.lastChild);
		}

		processString(message, element);
	};

	var localizeMenu = function () {
		$.each(findInIframe("[i18n]"), function () {
			translateElement(this, getMessage($(this).attr("i18n")));
		});
	};

	var createAdguardDetailedMenu = function () {
		return $('<div>', {class: 'adg-container'})
			.append($('<div>', {id: 'drag-handle', class: 'adg-head'})
				.append($('<div>', {class: 'adg-close'}))
				.append($('<div>', {class: 'adg-head-h', i18n: 'assistant_block_element'}))
				.append($('<div>', {class: 'adg-head-opt comment'})
					.append($('<span>', {i18n: 'assistant_block_element_explain'}))))
			.append($('<div>', {class: 'adg-content'})
				.append($('<div>', {class: 'adg-slide-block'})
					.append($('<div>', {class: 'adg-slide-text', i18n: 'assistant_slider_explain'}))
					.append($('<div>', {id: 'slider', class: 'adg-slide'})
						.append($('<div>', {class: 'adg-slide-clue-max', i18n: 'assistant_slider_min'}))
						.append($('<div>', {class: 'adg-slide-clue-min', i18n: 'assistant_slider_max'})))))
			.append($('<div>', {class: 'adg-more'})
				.append($('<a>', {id: 'ExtendedSettingsText', i18n: 'assistant_extended_settings'})))
			.append($('<div>', {id: 'adv-settings', class: 'adg-form-block', style: 'display: none;'})
				.append($('<span>')
					.append($('<strong>', {i18n: 'assistant_rule_parameters'})))
				.append($('<p>', {id: 'one-domain-p'})
					.append($('<label>', {class: 'checkbox-label', i18n: 'assistant_apply_rule_to_all_sites'})))
				.append($('<p>', {id: 'block-by-url-p', style: 'display: none;'})
					.append($('<label>', {class: 'checkbox-label', i18n: 'assistant_block_by_reference'})))
				.append($('<p>', {id: 'block-similar-p', style: 'display: none;'})
					.append($('<label>', {class: 'checkbox-label', i18n: 'assistant_block_similar'})))
				.append($('<p>')
					.append($('<input>', {id: 'filter-rule', type: 'type'}))))
			.append($('<div>', {class: 'adg-foot clearfix2'})
				.append($('<a>', {id: 'adg-accept', class: 'btn btn-blue', href: '#'}).append($('<span>', {i18n: 'assistant_block'})))
				.append($('<a>', {id: 'adg-cancel', class: 'btn btn-gray f-right', href: '#'}).append($('<span>', {i18n: 'assistant_another_element'})))
				.append($('<a>', {id: 'adg-preview', class: 'btn btn-gray f-right', href: '#'}).append($('<span>', {i18n: 'assistant_preview'}))));
	};

	var createAdguardSelectorMenu = function () {
		return $('<div>', {class: 'adg-container adg-auto-width sg_ignore'})
			.append($('<div>', {id: 'drag-handle', class: 'adg-head'})
				.append($('<div>', {id: 'close-button', class: 'adg-close'}))
				.append($('<div>', {class: 'adg-head-h', i18n: 'assistant_select_element'}))
				.append($('<div>', {class: 'adg-head-opt comment'})
					.append($('<span>', {i18n: 'assistant_select_element_ext'}))
					.append($('<span>')
						.append($('<a>', {id: 'cancel-select-mode', href: '#', i18n: 'assistant_select_element_cancel'})))));
	};

	var showDetailedMenu = function () {
		var d = $.Deferred();
		var content = createAdguardDetailedMenu();
		showDialog(content, constants.iframe.baseWidth, constants.iframe.detailedMenuHeight, function (iframe) {
			bindClicks(iframe, {
				'#close-button': onCancelSelectModeClicked,
				'.adg-close': onCancelSelectModeClicked,
				'#adv-settings': onScopeChange,
				'#adg-cancel': onSelectElementClicked,
				'#adg-preview': onRulePreview,
				'#adg-accept': onRuleAccept,
				'#ExtendedSettingsText': onExtendDetailedSettings
			});
			d.resolve('');
		}, function () {
			localizeMenu();
			makeRadioButtonsAndCheckBoxes();
		});
		return d;
	};

	/**
	 * Shows Adguard selector menu
	 */
	var showSelectorMenu = function () {
		var content = createAdguardSelectorMenu();
		var d = $.Deferred();
		showDialog(content, constants.iframe.baseWidth, constants.iframe.selectorMenuHeight, function (iframe) {
			bindClicks(iframe, {
				'#cancel-select-mode': onCancelSelectModeClicked,
				'.adg-close': onCancelSelectModeClicked
			});
			d.resolve('');
		}, null);
		return d;
	};

	var showHidingRuleWindow = function (path, element, urlBlock, blockSimilar) {
		var loaded = showDetailedMenu();
		loaded.done(function () {
			createSlider(element);
			self.selector.reset(element);
			setPath(path);
			onScopeChange();
			setScopeOneDomainText();
			if (urlBlock) {
				findInIframe('#block-by-url-p').show();
			}
			if (blockSimilar) {
				findInIframe('#block-similar-p').show();
			}
		});
	};

	var resizeIframe = function (width, height) {
		var iframe = findIframe().get(0);
		if (height) {
			iframe.style.height = height + "px";
		}
		if (width) {
			iframe.style.width = width + "px";
		}
		checkPosition();
	};

	var checkPosition = function () {

		var w = $(window);
		var winHeight = w.height();
		var bottom = w.scrollTop() + winHeight;

		var iframe = findIframe();
		var offset = iframe.offset();
		var height = iframe.outerHeight();
		if (offset.top + height > bottom) {
			//replace
			iframe.css({
				top: winHeight - height - 25
			});
		}
	};

	var extendAdvSettings = function (width, height) {
		resizeIframe(width, height);
		findInIframe('#adv-settings').slideToggle(100);
	};

	var onExtendDetailedSettings = function () {
		var hidden = findInIframe('#adv-settings').is(":hidden");
		if (hidden)
			extendAdvSettings(null, constants.iframe.extendDetailedSettingsHeight, null);
		else {
			var animationCallback = function () {
				resizeIframe(null, constants.iframe.detailedMenuHeight);
			};
			findInIframe('#adv-settings').slideToggle({duration: 100, complete: animationCallback});

		}
	};

	var setScopeOneDomainText = function () {
		var path = getCroppedDomain();
		findInIframe('#oneDomainText').text(path);
	};

	if (typeof(cloneInto) == 'undefined') {
		cloneInto = function (targetObject) {
			return targetObject;
		}
	}
	if (typeof(exportFunction) == 'undefined') {
		exportFunction = function (func, targetScope, define) {
			targetScope[define.defineAs] = func;
		}
	}

	var createSlider = function (element) {
		var parents = utils.getParentsLevel(element);
		var childs = utils.getAllChilds(element);
		var value = Math.abs(parents.length + 1);
		var max = parents.length + childs.length + 1;
		var min = 1;
		var options = {value: value, min: min, max: max};
		if (min == max) {
			//hide slider text
			findInIframe('#slider').hide();
			findInIframe('.adg-slide-text').text(getMessage("assistant_slider_if_hide"));
		}
		var concreteWindow = typeof (unsafeWindow) != 'undefined' ? unsafeWindow : window;
		var frameContentWindow = concreteWindow.document.getElementById(settings.iframeId).contentWindow;
		var onSliderMoveWrapper = function (delta) {
			var elem;
			if (delta > 0) {
				elem = parents[delta - 1];
			}
			if (delta == 0) {
				elem = element;
			}
			if (delta < 0) {
				elem = childs[Math.abs(delta + 1)];
			}
			onSliderMove(elem);
		};
		frameContentWindow.unsafeOptions = cloneInto(options, frameContentWindow);
		exportFunction(onSliderMoveWrapper, frameContentWindow.unsafeOptions, {defineAs: 'callback'});
		frameContentWindow.CreateSlider();
	};

	var handleShowBlockSettings = function (showBlockByUrl, showBlockSimilar) {
		if (showBlockByUrl) {
			findInIframe('#block-by-url-p').show();
		} else {
			findInIframe('#blockByUrl').attr('checked', false);
			findInIframe('#block-by-url-p').hide();
		}
		if (showBlockSimilar) {
			findInIframe('#block-similar-p').show();
		} else {
			findInIframe('#blockSimilar').attr('checked', false);
			findInIframe('#block-similar-p').hide();
		}
	};

	var onSliderMove = function (element) {
		removePreview();
		settings.selectedElement = element;
		self.selector.makeBorders(element);
		settings.path = self.selector.getSelectorPath(element);
		settings.similarPath = self.selector.getSelectorSimilarPath(element);
		settings.similarBlock = false;
		setPath(settings.path);
		makeDefaultCheckboxesForDetailedMenu();
		onScopeChange();
		makeRadioButtonsAndCheckBoxes();
		handleShowBlockSettings(haveUrlBlockParameter(element), haveClassAttribute(element));
	};

	var makeDefaultCheckboxesForDetailedMenu = function () {
		findInIframe('#blockByUrl').attr('checked', false);
		findInIframe('#blockSimilar').attr('checked', false);
		findInIframe('#oneDomainRadio').attr('checked', false);
		findInIframe('#block-by-url-p >div >span').removeClass('active');
		findInIframe('#block-similar-p >div >span').removeClass('active');
		findInIframe('#one-domain-p >div >span').removeClass('active');
	};

	var getUrlBlockAttribute = function (element) {
		for (var i = 0; i < settings.urlBlockAttributes.length; i++) {
			var attr = settings.urlBlockAttributes[i];
			var value = element.getAttribute(attr);
			if (value) {
				return value;
			}
		}
		return null;
	};

	var onRulePreview = function (e) {
		if (e) {
			e.preventDefault();
		}
		if (settings.lastPreview) {
			removePreview();
			findInIframe('#adg-preview > span').text(getMessage("assistant_preview_start"));
			self.selector.showBorders();
			findInIframe('#slider').show();
			findInIframe('.adg-slide-text').show();
			findInIframe('#ExtendedSettingsText').show();
			return;
		}
		hideElement();
		findInIframe('#adg-preview >span').text(getMessage("assistant_preview_end"));
		findInIframe('#slider').hide();
		findInIframe('.adg-slide-text').hide();
		findInIframe('#ExtendedSettingsText').hide();
		findInIframe('#adv-settings').hide();
	};

	var hideElement = function () {
		self.selector.removeBorders();
		var selector = getSelector();
		var style = document.createElement("style");
		style.setAttribute("type", "text/css");
		settings.lastPreview = style;

		var head = document.getElementsByTagName('head')[0];
		if (head) {
			style.appendChild(document.createTextNode(selector + " {display: none !important;}"));
			head.appendChild(style);
		}
	};

	var getSelector = function () {
		var path = settings.similarBlock ? settings.similarPath : settings.path;
		var index = path.indexOf('##');
		return index == -1 ? path.substring(0, path.length) : path.substring(index + 2, path.length);
	};

	var removePreview = function () {
		if (settings.lastPreview == null) {
			return;
		}

		var head = document.getElementsByTagName("head")[0];
		if (head) {
			head.removeChild(settings.lastPreview);
		}
		settings.lastPreview = null;
	};

	var onScopeChange = function () {

		var iframe = findIframe().contents();
		var isBlockByUrl = iframe.find('#blockByUrl').is(':checked');
		var isBlockSimilar = iframe.find('#blockSimilar').is(':checked');
		handleShowBlockSettings(haveUrlBlockParameter(settings.selectedElement) && !isBlockSimilar, haveClassAttribute(settings.selectedElement) && !isBlockByUrl);

		var isUrlBlock = makeUrlBlockFilter();
		if (isUrlBlock == 'true') {
			return;
		}

		var path = settings.path;
		var similarPath = settings.similarPath;
		var indexSub = path.indexOf('##');
		path = path.substring(indexSub + 2);
		similarPath = similarPath.substring(indexSub + 2);
		var isNeedReverse = 'true';
		var prefix = utils.makeDomainPrefix(isNeedReverse);

		settings.path = prefix + path;
		settings.similarPath = prefix + similarPath;
		settings.similarBlock = isBlockSimilar;

		setPath(!isBlockSimilar ? settings.path : settings.similarPath);
	};

	var onRuleAccept = function () {
		removePreview();
		onRulePreview();
		settings.lastPreview = null;
		var path = findInIframe('#filter-rule').val();
		sendMessage("add-user-rule", {ruleText: path});
		closeAssistant();
	};

	var sendMessage = function (type, data, callback) {
		var message = data || Object.create(Object.prototype);
		message.type = type;
		ext.backgroundPage.sendMessage(message, callback || function () {
		});
	};

	var windowZoomFix = function () {
		$(window).resize(function () {
			if (settings.selectedElement && self.selector) {
				self.selector.makeBorders(settings.selectedElement);
			}
		});
	};
	windowZoomFix();

	this.init = function (options) {
		self.localization = options.localization;
		var loaded = showSelectorMenu();
		loaded.done(function () {
			localizeMenu();
			removePreview();
			startSelector();
			//choose element for assistant
			if (options.selectedElement) {
				$(options.selectedElement).click();
			}
		});
	};

	this.destroy = function () {
		removePreview();
		cancelSelectMode();
		closeAssistant();
	}
};
