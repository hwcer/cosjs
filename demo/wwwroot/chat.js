  var FADE_TIME = 150; // ms
  var $messages = $('.messages');
  var $inputMessage = $('.inputMessage');

  var chat = {};
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  chat.dom = $('#chat');
  chat.submit = function(){}
  chat.connected = false;

  chat.start = function(opts){
    $currAct = chat;

    var host = opts.host + ':' + opts.port;
    var protocol = 'ws://';
    chat.dom.show();
    log("正在前往服务器: "+ host, { prepend: true  });
    // $inputMessage.click(function () {
    //   $inputMessage.focus();
    // });
    chat.socket = io(protocol + host);
    // Socket events
    // Whenever the server emits 'login', log the login message
    chat.socket.on('message', function (data) {
      log(JSON.stringify(data));
    });

    chat.socket.on('login', function (data) {
      chat.connected = true;
      log("Welcome to Socket.IO Chat – ", { prepend: true  });
    });

    chat.socket.on('disconnect', function () {
      log('you have been disconnected');
    });

    chat.socket.on('reconnect', function () {
      log('you have been reconnected');
    });

    chat.socket.on('reconnect_error', function () {
      log('attempt to reconnect has failed');
    });

    userlogin();

  }

  // Sets the client's username
  function userlogin () {
    var username = $("#username").val().trim();
    chat.socket.send('/login/', username);
  }



  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    $messages.append($el);
    //addMessageElement($el, options);
  }



  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)

  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

