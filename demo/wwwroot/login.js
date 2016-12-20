
  var login = {};
  var $loginPage = $('.login.page'); // The login page
  var $usernameInput = $('.usernameInput');
  var $currentInput = $usernameInput.focus();

  login.dom = $('#login');

  login.start = function(){
    $currAct = login;
  }

  login.submit = function(){
    if(!$('#username').val()){
      return alert('用户名不能为空');
    }
    $loginPage.off('click');
    $('#login').hide();
    gateway.start();

  }


  $('#loginPage').click(function () {
    $currentInput.focus();
  });