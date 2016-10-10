function socket_io_client(gateway){
    this.ui = null;
    this.host = null;
    this.gateway = gateway;
}

socket_io_client.prototype.setui = function(fu){
    this.ui = new fu(this);
}

socket_io_client.prototype.msg = function(html){
    $("#sysmsg").empty().html(html);
}