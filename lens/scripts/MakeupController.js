// Lens Studio script. Requires the custom material graph described in lens/README.md.
// @input Component.FaceMaskVisual blush
// @input Component.FaceMaskVisual guide
// @input Component.Text faceHint

(function () {
  var valid = false;
  var faceVisible = false;
  var guideOn = false;

  function hide() {
    if (script.blush) script.blush.enabled = false;
    if (script.guide) script.guide.enabled = false;
  }
  function refresh() {
    if (script.blush) script.blush.enabled = valid && faceVisible;
    if (script.guide) script.guide.enabled = valid && faceVisible && guideOn;
    if (script.faceHint) script.faceHint.enabled = valid && !faceVisible;
  }
  function bounded(value, min, max) {
    return typeof value === 'number' && isFinite(value) && value >= min && value <= max;
  }
  function read(store, key, method) {
    if (!store || !store.has(key)) throw new Error('Missing launch parameter');
    return store[method](key);
  }
  function initialize() {
    hide();
    valid = false;
    if (script.faceHint) script.faceHint.enabled = false;
    try {
      if (!script.blush || !script.guide) throw new Error('Missing Face Mask components');
      var store = global.launchParams;
      if (
        read(store, 'template_id', 'getString') !== 'BLUSH_APPLE' ||
        read(store, 'zone', 'getString') !== 'blush' ||
        read(store, 'part', 'getString') !== 'apply' ||
        read(store, 'guide_region', 'getString') !== 'cheek_apple'
      ) {
        throw new Error('Unsupported template combination');
      }
      var rgb = read(store, 'color_rgb', 'getFloatArray');
      var intensity = read(store, 'intensity', 'getFloat');
      var softness = read(store, 'softness', 'getFloat');
      var on = read(store, 'guide_on', 'getFloat');
      if (
        !rgb ||
        rgb.length !== 3 ||
        !bounded(intensity, 0, 1) ||
        !bounded(softness, 0, 1) ||
        (on !== 0 && on !== 1)
      ) {
        throw new Error('Invalid launch parameter range');
      }
      for (var i = 0; i < 3; i++) {
        if (!bounded(rgb[i], 0, 255) || Math.floor(rgb[i]) !== rgb[i])
          throw new Error('Invalid RGB');
      }
      // makeupColor and edgeSoftness are CUSTOM graph parameters, not built-in SDK properties.
      var material = script.blush.mainMaterial.clone();
      script.blush.mainMaterial = material;
      material.mainPass.makeupColor = new vec4(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, intensity);
      material.mainPass.edgeSoftness = softness;
      guideOn = on === 1;
      valid = true;
      refresh();
    } catch (_) {
      hide();
      // Never print launch values or camera data.
      print('MakeupController: input or material setup unavailable; effects hidden.');
    }
  }
  var found = script.createEvent('FaceFoundEvent');
  found.faceIndex = 0;
  found.bind(function () {
    faceVisible = true;
    refresh();
  });
  var lost = script.createEvent('FaceLostEvent');
  lost.faceIndex = 0;
  lost.bind(function () {
    faceVisible = false;
    refresh();
  });
  script.createEvent('OnStartEvent').bind(initialize);
  hide();
})();
