/* Studio gate. Gated pages (anything with front matter `gate: true`) load
 * this. The passcode lives here and in the page cookie — a simple lock that
 * keeps casual visitors out, not a login. Anything behind it should also be
 * unpublished so it stays out of listings, maps, and the sitemap.
 */
(function () {
  var CODE = '042986';
  var COOKIE = 'ar_editor=' + CODE;

  function unlocked() {
    return document.cookie.split('; ').indexOf(COOKIE) !== -1;
  }

  function remember() {
    document.cookie = COOKIE + '; Max-Age=31536000; Path=/; SameSite=Lax';
  }

  function overlay() {
    var box = document.createElement('div');
    box.setAttribute('class', 'gate-overlay');
    box.innerHTML =
      '<div class="gate-card" role="dialog" aria-modal="true" aria-labelledby="gateTitle">' +
      '<p class="gate-eyebrow">Studio · Private</p>' +
      '<h1 id="gateTitle">Enter the code</h1>' +
      '<p>This part of the site is for the author. Enter the studio code to continue.</p>' +
      '<form id="gateForm">' +
      '<label class="gate-field">Code<input id="gateCode" type="password" inputmode="numeric" autocomplete="off" required></label>' +
      '<p class="gate-error" id="gateError" hidden>That code did not match.</p>' +
      '<button class="gate-btn" type="submit">Enter</button>' +
      '</form>' +
      '<p class="gate-back"><a href="/editor/">Go to the studio sign-in</a></p>' +
      '</div>';
    document.body.appendChild(box);
    var form = box.querySelector('#gateForm');
    var input = box.querySelector('#gateCode');
    var error = box.querySelector('#gateError');
    input.focus();
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (input.value.trim() === CODE) {
        remember();
        window.location.reload();
      } else {
        error.hidden = false;
        input.select();
      }
    });
  }

  if (!unlocked()) {
    var main = document.getElementById('main-content');
    if (main) main.setAttribute('hidden', '');
    overlay();
  }
})();
