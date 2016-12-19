$(function() {
  var GATEWAY = 'ws://127.0.0.1:100';
  var $window = $(window);


  var $socket = new socket_io_client(GATEWAY);
  $socket.setui(ui_login);


  // Keyboard events
  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $($socket.ui.input).focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      $socket.ui.submit();
    }
  });

  var $loginPage = $('.login.page'); // The login page
  var $messages = $('#messages');
  // Focus input when clicking anywhere on login page
  $loginPage.click(function () {
    $('#token').focus();
  });

  // Focus input when clicking on the message input's border
  $messages.click(function () {
    $('#msg').focus();
  });


});
