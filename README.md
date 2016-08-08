Touch Swipe


```javascript
// load init 
    $(function() {
       var $touchSwipe = $('.tools-container').touchSwipe({
            itemClass: 'tools-item',
            prevClass: 'button-action.button-prev',
            nextClass: 'button-action.button-next',
            dotPageWrapClass: 'tools-pagination',
            dotPageClass: 'tools-page',
            tap: function(e) {
                var target = e.target;

                if (target.tagName === 'IMG') {
                    location.href = $(target).closest('a').attr('href');
                }
            }
        }).data('plugin_touchSwipe');
    });
```