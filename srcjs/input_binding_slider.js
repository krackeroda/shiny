var sliderInputBinding = {};
$.extend(sliderInputBinding, textInputBinding, {
  find: function(scope) {
    // Check if ionRangeSlider plugin is loaded
    if (!$.fn.ionRangeSlider)
      return [];

    return $(scope).find('input.js-range-slider');
  },
  getValue: function(el) {
    var result = $(el).data('ionRangeSlider').result;
    if (this._numValues(el) == 2) {
      return [+result.from, +result.to];
    }
    else {
      return +result.from;
    }
  },
  setValue: function(el, value) {
    var slider = $(el).data('ionRangeSlider');

    if (this._numValues(el) == 2 && value instanceof Array) {
      slider.update({ from: value[0], to: value[1] });
    } else {
      slider.update({ from: value });
    }
  },
  subscribe: function(el, callback) {
    $(el).on('change.sliderInputBinding', function(event) {
      callback(!$(el).data('updating') && !$(el).data('animating'));
    });
  },
  unsubscribe: function(el) {
    $(el).off('.sliderInputBinding');
  },
  receiveMessage: function(el, data) {
    var slider = $(el).data('ionRangeSlider');
    var msg = {};

    if (data.hasOwnProperty('value')) {
      if (this._numValues(el) == 2 && data.value instanceof Array) {
        msg.from = data.value[0];
        msg.to = data.value[1];
      } else {
        msg.from = data.value;
      }
    }
    if (data.hasOwnProperty('min'))  msg.min   = data.min;
    if (data.hasOwnProperty('max'))  msg.max   = data.max;
    if (data.hasOwnProperty('step')) msg.step  = data.step;

    if (data.hasOwnProperty('label'))
      $(el).parent().find('label[for="' + $escape(el.id) + '"]').text(data.label);

    $(el).data('updating', true);
    try {
      slider.update(msg);
    } finally {
      $(el).data('updating', false);
    }
  },
  getRatePolicy: function() {
    return {
      policy: 'debounce',
      delay: 250
    };
  },
  getState: function(el) {
  },
  initialize: function(el) {
    $(el).ionRangeSlider();
  },

  // Number of values; 1 for single slider, 2 for range slider
  _numValues: function(el) {
    if ($(el).data('ionRangeSlider').options.type === 'double')
      return 2;
    else
      return 1;
  }
});
inputBindings.register(sliderInputBinding, 'shiny.sliderInput');



$(document).on('click', '.slider-animate-button', function(evt) {
  evt.preventDefault();
  var self = $(this);
  var target = $('#' + $escape(self.attr('data-target-id')));
  var startLabel = 'Play';
  var stopLabel = 'Pause';
  var loop = self.attr('data-loop') !== undefined &&
             !/^\s*false\s*$/i.test(self.attr('data-loop'));
  var animInterval = self.attr('data-interval');
  if (isNaN(animInterval))
    animInterval = 1500;
  else
    animInterval = +animInterval;

  if (!target.data('animTimer')) {
    var slider;
    var timer;

    // Separate code paths:
    // Backward compatible code for old-style jsliders (Shiny <= 0.10.2.2),
    // and new-style ionsliders.
    if (target.hasClass('jslider')) {
      slider = target.slider();

      // If we're currently at the end, restart
      if (!slider.canStepNext())
        slider.resetToStart();

      timer = setInterval(function() {
        if (loop && !slider.canStepNext()) {
          slider.resetToStart();
        }
        else {
          slider.stepNext();
          if (!loop && !slider.canStepNext()) {
            self.click(); // stop the animation
          }
        }
      }, animInterval);

    } else {
      slider = target.data('ionRangeSlider');
      // Single sliders have slider.options.type == "single", and only the
      // `from` value is used. Double sliders have type == "double", and also
      // use the `to` value for the right handle.
      var sliderCanStep = function() {
        if (slider.options.type === "double")
          return slider.result.to < slider.result.max;
        else
          return slider.result.from < slider.result.max;
      };
      var sliderReset = function() {
        var val = { from: slider.result.min };
        // Preserve the current spacing for double sliders
        if (slider.options.type === "double")
          val.to = val.from + (slider.result.to - slider.result.from);

        slider.update(val);
      };
      var sliderStep = function() {
        // Don't overshoot the end
        var val = {
          from: Math.min(slider.result.max, slider.result.from + slider.options.step)
        };
        if (slider.options.type === "double")
          val.to = Math.min(slider.result.max, slider.result.to + slider.options.step);

        slider.update(val);
      };

      // If we're currently at the end, restart
      if (!sliderCanStep())
        sliderReset();

      timer = setInterval(function() {
        if (loop && !sliderCanStep()) {
          sliderReset();
        }
        else {
          sliderStep();
          if (!loop && !sliderCanStep()) {
            self.click(); // stop the animation
          }
        }
      }, animInterval);
    }

    target.data('animTimer', timer);
    self.attr('title', stopLabel);
    self.addClass('playing');
    target.data('animating', true);
  }
  else {
    clearTimeout(target.data('animTimer'));
    target.removeData('animTimer');
    self.attr('title', startLabel);
    self.removeClass('playing');
    target.removeData('animating');
  }
});
