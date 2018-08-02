$(function() {
    
    $(window).load(function() {
        var $bot = $('#bot');
        var connector = new BotChat.DirectLine({
            secret: "viseo",
            domain: "http://"+document.location.hostname+":3000/directline",
            webSocket: false // defaults to true
        });

        BotChat.App({
            botConnection: connector,
            user: { 
                id: $bot.data('user'),
                name: "User"
            },
            bot: { id: "viseo" },
            resize: 'detect'
        }, $bot.get(0));

        connector.postActivity({
            from: { id: $bot.data('user')},
            type: 'message',
            text: $bot.data('start')
        }).subscribe(
            id => {},
            error => console.log("Error posting activity", error)
        );

        connector.activity$
                 .filter(activity => activity.type === "event")
                 .subscribe(activity => { console.log(activity); })
    })
});