
$('.alert-danger').hide();
$('#loginForm').submit(function(event) {

    event.preventDefault();
    
    $.post($(this).attr('action'), $(this).serialize())
        .done(function(data) {
            $('.alert-danger').hide();

      
            if(data.redirection) {
                location.href = data.redirection;
            }
        })
        .fail(function(xhr, textStatus, errorThrown) {
            $('.alert-danger').hide();
            if(xhr.status === 403) {
                $('#forbiddenAlert').show();
            } else if(xhr.status === 401) {
                $('#unauthorizedAlert').show();
            }
        })
})

/*
        $.ajaxSetup({
            beforeSend: function(jqXHR,settings) {
                // Only attach auth header for requests to relative paths
                if (!/^\s*(https?:|\/|\.)/.test(settings.url)) {
                    var auth_tokens = RED.settings.get("auth-tokens");
                    if (auth_tokens) {
                        jqXHR.setRequestHeader("Authorization","Bearer "+auth_tokens.access_token);
                    }
                    jqXHR.setRequestHeader("Node-RED-API-Version","v2");
                }
            }
        });

*/