function ui_login($socket){
    this.input = $('#token');
    this.socket = $socket;
    this.input.focus();
}


ui_login.prototype.submit = function(){
  this.socket.token = $('#token').val();
  $('#login').hide();
  $('#queue').show();
  this.socket.setui(ui_queue);
}