;(function($, window, document, undefined) {
    'use strict';

    var pluginName = 'touchSwipe',
        defaults = {
            itemClass: 'swipe-items',
            prevClass: 'swipe-prev',
            nextClass: 'swipe-next',
            dotPageClass: 'swipe-page',
            dotPageWrapClass: 'swipe-page-wrap',
            swipe: null,
            tap: null,
            touchObject: {
                threshold: 100,
                restraint: 100,
                allowedTime: 300,
                tapThreshold: 6,
            }
        };

    function Plugin(element, options) {
        this.element = element;
        this._defaults = defaults;
        this.options = $.extend({}, defaults, options);
        this._name = pluginName;

        this._touchTarget = null;
        this._touchObject = this.options.touchObject;

        this._init();
    }

    Plugin.prototype = {
        TYPE: 4,
        SWIPE: 'swipe',
        TAP: 'tap',
        SCROLL: 'scroll',
        _init: function() {
            this._initProperties();
            this._assignedHTMLElements();
            this._buildSwipe();
            this._attachEvents();
        },

        _initProperties: function() {
            this._currentPageIndex = 0;
            this._beforeMoveLeft = 0;
            this._cachedScreenWidth = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;
        },

        _reinit: function() {
            this._initProperties();
            $(document.activeElement).blur();
        },

        activate: function() {
            this._initProperties();
            this._buildSwipe();
            this._detachEvents();
            this._attachEvents();
            $(document.activeElement).blur();
        },

        deactivate: function() {
            this._removeSwipeStyles();
            this._detachEvents();
            $(document.activeElement).blur();
        },

        _assignedHTMLElements: function() {
            var options = this.options;
            var $element = $(this.element);
            var prefix = '.';

            this._items = $element.find($(prefix + options.itemClass));

            this._pagePrev = $element.find($(prefix + options.prevClass));
            this._pageNext = $element.find($(prefix + options.nextClass));

            this._dotPageWrap = $element.find($(prefix + options.dotPageWrapClass));
            this._dotPages = $element.find($(prefix + options.dotPageClass));

            // 구조가 있을 경우
            this._swipeWrap = $element;
            this._swipeFrame = this._swipeWrap.find('div').first();
            this._swipeTrack = this._swipeFrame.find('div').first();

            this._touchTarget = this._swipeFrame;
        },

        _buildSwipe: function() {
            var $element = $(this.element);

            $element.addClass('swipe-initialized');

            this._items.each(function(index, value) {
                $(value).attr('data-index', index);
            });

            this._pageNext.prop('disabled', '');
            this._pagePrev.prop('disabled', 'disabled');

            this._applyResponsiveType(this._cachedScreenWidth);
            this._applySwipeStyles();
        },

        _attachEvents: function() {
            var $touchTarget = this._touchTarget;

            this._pagePrev.on('click', $.proxy(this.movePrev, this));
            this._pageNext.on('click', $.proxy(this.moveNext, this));

            this._items.on('keydown', $.proxy(this._onKeydownItems, this));

            $touchTarget.on('touchstart', $.proxy(this._onTouchStart, this));
            $touchTarget.on('touchmove', $.proxy(this._onTouchMove, this));
            $touchTarget.on('touchend', $.proxy(this._onTouchEnd, this));

            $(window).on('resize', $.proxy(this._onResize, this));
        },

        _detachEvents: function() {
            var $touchTarget = this._touchTarget;

            this._pagePrev.off('click', $.proxy(this.movePrev, this));
            this._pageNext.off('click', $.proxy(this.moveNext, this));

            this._items.off('keydown', $.proxy(this._onKeydownItems, this));

            $touchTarget.off('touchstart', $.proxy(this._onTouchStart, this));
            $touchTarget.off('touchend', $.proxy(this._onTouchEnd, this));

            $(window).off('resize', $.proxy(this._onResize, this));
        },

        _onClickDotPages: function(e) {
            this._currentPageIndex = parseInt($(e.currentTarget).attr('data-page-index'), 10);
            this.move(this._currentPageIndex);
        },

        _onResize: function() {
            var cachedScreenWidth = this._cachedScreenWidth,
                newScreenWidth;

            newScreenWidth = window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth;

            if (newScreenWidth !== cachedScreenWidth) {
                this._reinit();
                this._applyResponsiveType(newScreenWidth);
                this._applySwipeStyles();
            }
        },

        _onTouchStart: function(event) {
            var originEvent = event.originalEvent,
                touches = originEvent.changedTouches[0],
                touchObject = this._touchObject;

            touchObject.direction = null;
            touchObject.startX = touches.pageX;
            touchObject.startY = touches.pageY;
            touchObject.startTime = new Date().getTime();

            event.preventDefault();
        },

        _onTouchEnd: function(event) {
            var originEvent = event.originalEvent,
                touches = originEvent.changedTouches[0],
                touchObject = this._touchObject;

            touchObject.scrollY = window.scrollY;
            touchObject.distX = touches.pageX - touchObject.startX;
            touchObject.distY = touches.pageY - touchObject.startY;
            touchObject.elapsedTime = new Date().getTime() - touchObject.startTime;

            if (this._isTap()) {
                this.triggerHandlerForGesture(event, this.TAP);
            }
            if (touchObject.elapsedTime <= touchObject.allowedTime) {
                if (this._isSwipe()) {
                    this.triggerHandlerForGesture(event, this.SWIPE);
                }

                if (this._isScroll()) {
                    this.triggerHandlerForGesture(event, this.SCROLL);
                }
            }

            event.preventDefault();
        },

        _onKeydownItems: function(e) {
            var itemSelector = '.' + this.options.itemClass;
            var $element = $(this.element);
            var target = e.currentTarget;
            var targetIndex = parseInt($(target).attr('data-index'), 10);
            var prevTarget = this._swipeTrack.find(itemSelector+'[data-index=' + (targetIndex-1) + ']');
            var nextTarget = this._swipeTrack.find(itemSelector+'[data-index=' + (targetIndex+1) + ']');
            var LastTarget = this._dotPages.eq(0);

            var itemsLength = this._items.length;

            
            var type = this.TYPE;
            var swipIndex;

            if (e.keyCode == 9 && e.shiftKey) {
                if (targetIndex === 0) {
                    $element.prev().attr('tabindex', 0).focus();
                    return false;
                }

                swipIndex = (targetIndex) % type;
                if (swipIndex === 0) {
                    this.movePrev();
                    setTimeout(function() {
                        prevTarget.find('a').focus();
                    }, 300);
                } else {
                    prevTarget.find('a').focus();
                }
                return false;
            }

            if (e.keyCode == 9) {
                if (targetIndex === (itemsLength - 1)) {
                    LastTarget.focus();
                    return false;
                }

                swipIndex = (targetIndex + 1) % type;
                if (swipIndex === 0) {
                    this.moveNext();
                    setTimeout(function() {
                        nextTarget.find('a').focus();
                    }, 300);
                } else {
                    nextTarget.find('a').focus();
                }
                return false;
            }
        },

        movePrev: function() {
            this._currentPageIndex = this._currentPageIndex - 1;
            this.move(this._currentPageIndex);
        },

        moveNext: function() {
            this._currentPageIndex = this._currentPageIndex + 1;
            this.move(this._currentPageIndex);
        },

        move: function(moveIndex, callback) {
            var moveLeft,
                type = this.TYPE,
                currentPageIndex = this._currentPageIndex,
                beforeMoveLeft = this._beforeMoveLeft,
                items = this._items;

            moveLeft = items.first().width() * type * moveIndex;

            if (beforeMoveLeft === moveLeft) {
                return false;
            }

            this._swipeTrack.css('position', 'relative').animate({
                'left': '-' + moveLeft + 'px'
            }, 300, function() {
                items.eq(currentPageIndex * type).find('a').focus();
            });

            this._beforeMoveLeft = moveLeft;

            this._setActiveDotPage(moveIndex);
            this._setDisablePager(moveIndex);

            if (callback) {
                callback();
            }
        },

        _setActiveDotPage: function(moveIndex) {
            var activeDotPage = this._dotPages.eq(moveIndex);

            this._dotPages.removeClass('active');
            this._dotPages.find('span em').remove();

            activeDotPage.addClass('active');
            activeDotPage.find('span').append('<em>active</em>');
        },

        _setDisablePager: function(moveIndex) {
            this._pagePrev.prop('disabled', '');
            this._pageNext.prop('disabled', '');

            if (moveIndex === 0) {
                this._pagePrev.prop('disabled', 'disabled');
            }

            if (moveIndex >= (this._dotPages.length - 1)) {
                this._pageNext.prop('disabled', 'disabled');
            }
        },

        _removeSwipeStyles: function() {
            this._swipeFrame.removeAttr('style');
            this._swipeTrack.removeAttr('style');
        },

        _applyResponsiveType: function(screenWidth) {
            var itemLength = this._items.length,
                itemWidth = this._items.width(),
                dotLength;

            if (screenWidth >= 1280) {
                this.TYPE = 4;
                return false;
            } else if (screenWidth >= itemWidth * 3) {
                dotLength = Math.ceil(itemLength / 3);
                this.TYPE = 3;
            } else if (screenWidth >= itemWidth * 2) {
                dotLength = Math.ceil(itemLength / 2);
                this.TYPE = 2;
            } else if (screenWidth >= itemWidth) {
                dotLength = itemLength;
                this.TYPE = 1;
            }

            this._appendDotPages(dotLength - 1);
        },

        _appendDotPages: function(length) {
            var dotPages = this._dotPages;

            if (dotPages.length > 0) {
                dotPages.remove();
            }

            for (var i = 0; i <= length; i++) {
                this._dotPages = this._dotPageWrap.append('<button type="button" data-page-index="' + i + '" class="' + this.options.dotPageClass + '"><span>Service &amp; Support Page ' + (i + 1) + ' of ' + (length + 1) + '<em>active</em></span></button>');
            }

            if (length <= 0) {
                this._pagePrev.hide();
                this._pageNext.hide();
                this._dotPages.hide();
            } else {
                this._pagePrev.show();
                this._pageNext.show();
                this._dotPages.show();
            }

            this._dotPages = this._dotPageWrap.find('.' + this.options.dotPageClass);
            this._dotPages.first().addClass('active');
            this._currentPageIndex = 0;

            this._pagePrev.prop('disabled', 'disabled');
            this._pagePrev.prop('disabled', 'disabled');

            this._dotPages.off('click', $.proxy(this._onClickDotPages, this));
            this._dotPages.on('click', $.proxy(this._onClickDotPages, this));
        },

        _applySwipeStyles: function() {
            var items = this._items;
            var swipeWidth = items.width() * this.TYPE;
            var swipeInnerWidth = items.width() * items.length;

            this._swipeFrame.css({
                'width': swipeWidth,
                'margin': '0 auto'
            });

            this._swipeTrack.css({
                'width': swipeInnerWidth,
                'margin': 0,
                'left': 0
            });
        },

        _isFirstPage: function() {
            return this._currentPageIndex === 0;

        },

        _isLastPage: function() {
            return this._currentPageIndex >= (this._dotPages.length - 1);

        },

        _isTap: function() {
            var touchObject = this._touchObject;

            return Math.abs(touchObject.distX) <= touchObject.tapThreshold && Math.abs(touchObject.distY) <= touchObject.tapThreshold;
        },

        _isSwipe: function() {
            var touchObject = this._touchObject;

            return Math.abs(touchObject.distX) >= touchObject.threshold && Math.abs(touchObject.distY) <= touchObject.restraint;
        },

        _isScroll: function() {
            var touchObject = this._touchObject;

            return Math.abs(touchObject.distY) >= touchObject.threshold && Math.abs(touchObject.distX) <= touchObject.restraint;
        },

        triggerHandlerForGesture: function(event, gesture) {
            var $element = $(this.element),
                $touchTarget = this._touchTarget,
                touchObject = this._touchObject;

            if (gesture == this.TAP) {
                $element.trigger('tap');

                if (this.options.tap) {
                    this.options.tap.call($touchTarget, event);
                }
            }

            if (gesture == this.SWIPE) {
                touchObject.direction = (touchObject.distX < 0) ? 'left' : 'right';

                if (touchObject.direction == 'left' && !this._isLastPage()) {
                    this.moveNext();
                }
                if (touchObject.direction == 'right' && !this._isFirstPage()) {
                    this.movePrev();
                }

                $element.trigger('swipe', [touchObject.direction]);

                if (this.options.swipe) {
                    this.options.swipe.call($touchTarget, event, touchObject.direction);
                }
            }

            if (gesture == this.SCROLL) {
                if (touchObject.distY <= 0) {
                    touchObject.scrollY += Math.abs(touchObject.distY);
                } else {
                    touchObject.scrollY -= Math.abs(touchObject.distY);
                }

                $('body').animate({
                    scrollTop: touchObject.scrollY + 20
                }, 200);
            }
        }
    };

    $.fn[pluginName] = function(options) {
        return this.each(function() {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName,
                    new Plugin(this, options));
            }
        });
    };
})(jQuery, window, document);