/* Connect to YouTube only after the visitor explicitly chooses playback. */
(function () {
  document.querySelectorAll('[data-youtube-id]').forEach(function (container) {
    var videoId = container.getAttribute('data-youtube-id');
    var play = container.querySelector('[data-video-play]');
    if (!/^[A-Za-z0-9_-]{11}$/.test(videoId || '') || !play) return;
    play.hidden = false;
    play.addEventListener('click', function () {
      var frame = document.createElement('iframe');
      var lang = document.documentElement.getAttribute('data-lang') === 'zh' ? 'zh' : 'en';
      frame.title = container.getAttribute(lang === 'zh' ? 'data-zh-label' : 'data-en-label');
      frame.src = 'https://www.youtube-nocookie.com/embed/' + videoId + '?autoplay=1&rel=0&cc_load_policy=1&cc_lang_pref=en';
      frame.loading = 'lazy';
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      container.replaceChildren(frame);
      frame.focus();
    }, {once: true});
  });
})();
