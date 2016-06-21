
var socket = io.connect('http://10.10.60.202');

function changeSource(url)
{
    $("#frame").fadeOut(function()
    {
        $("#frame").attr("src",url);

        $("#frame").load(function(){
            $(this).fadeIn();
        });
    });
}

function getSource(){
    socket.emit('sourceRequest');
}

socket.on('test',function(data){
    console.log('paused: '+data.paused+' forward: '+data.fwDir);
    
    var height = $("#frame").height()-$("#clock").height();
    var width = $("#frame").width();
    socket.emit('ctest', {width:width,height:height});
});

socket.on('sourceChange',function(data){
    console.log(data.but+" button pressed.");
    console.log("Going to "+data.url);
    changeSource(data.url);
});

socket.on('Paused',function(data){
    console.log(data.but+" button pressed.");
});

socket.on('weatherInfo',function(data){
    if(data.bad){
        console.log("Received weather info: "+data.info);
        $("div.weather").text(data.info);
        $("div.weather").show();
    } else {
        console.log("Bad weather is gone.");
        $("div.weather").text("");
        $("div.weather").hide();
    }
});