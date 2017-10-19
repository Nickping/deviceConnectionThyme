var os=require('os');
var net=require('net');
var fs=require('fs');
var exec = require('child_process').exec
var waterfall = require('async-waterfall');


var networkInterfaces=os.networkInterfaces();

var port = 8082;    // android -> pi port

function callback_server_connection(socket){
    var remoteAddress = socket.remoteAddress;
    var remotePort = socket.remotePort;
    socket.setNoDelay(true);
    console.log("////////socket connected: \n", remoteAddress, " : ", remotePort);

    socket.on('data', function (data) {
	waterfall([
	 function(callback) {
          var infoString = data.toString();
          var infoObj = JSON.parse(infoString);
          console.log("data from android : "+ infoString);
          console.log("ae from android : "+ infoObj.ae);
          console.log("cnt from android : "+ infoObj.cnt);
	  console.log("token from android : "+ infoObj.token);
          console.log("datareceived done\n");

          fs.writeFile('/home/pi/infojson.txt',infoString,function(err) {
                if(err) throw err;
                console.log("info saved");
          });  
	  callback(null,'1')
	},
	function(arg1, callback) {
	  socket.end("");
	  callback(null,'done');
	},
	]);

      socket.on('end', function () {
	console.log("///////socket ended: ", remoteAddress, " : ", remotePort + "\n");      	  
      });
  });
}


console.log("node.js net server is waiting:");
for (var interface in networkInterfaces) {
    networkInterfaces[interface].forEach(function(details){
        if ((details.family=='IPv4') && !details.internal) {
            console.log(interface, details.address);
        }
    });
}

console.log("port: ", port);

var netServer = net.createServer(callback_server_connection);
netServer.listen(port);
