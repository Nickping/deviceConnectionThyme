var os=require('os');
var net=require('net');
var fs=require('fs');
var exec = require('child_process').exec
var sleep = require('sleep');
var real_sleep = require('system-sleep');

var waterfall = require('async-waterfall');

// for network restart
var wlan0down = "sudo ifdown wlan0"
var wlan0up = "sudo ifup wlan0"
var hosts = ['8,8,8,8'];
var connected = 0;

var PASS=true     // for promise pass

var networkInterfaces=os.networkInterfaces();

var port = 8081;    // android -> pi port
var count = 0;      // #of request
var msg = ""        // pi -> android message



function setInterfaces(ssid, pwd) {

	var ph = "source-directory /etc/network/interfaces.d\n\n" +
	"auto lo\n" + "iface lo inet loopback\n" + "iface eth0 inet manual\n\n"

	var wl0 = "allow-hotplug wlan0\n" + "iface wlan0 inet dhcp\n" +
	"   wpa-ssid \"" + ssid + "\"\n"  + "   wpa-psk \"" + pwd + "\"\n\n"

	var wl1 = "allow-hotplug wlan1\n" + "iface wlan1 inet static\n" +
	"   address 10.0.0.1\n" + "   netmask 255.255.255.0"

	var interface = ph + wl0 + wl1;

	fs.writeFile('/etc/network/interfaces',interface,function(err) {
        	if(err) throw err;
        	console.log("interfaces saved");
	});
}


function ifdown(err) {
	exec(wlan0down, function (error, stdout, stderr) {
                console.log("ifdwon stdout : " + stdout);
                console.log("ifdown stderr : " + stderr);
        });
}

function ifup(err) {
	exec(wlan0up, function (error, stdout, stderr) {
                console.log("ifup stdout : " + stdout);
                console.log("ifup stderr" + stderr);
	});
}

function callback_server_connection(socket){
    var remoteAddress = socket.remoteAddress;
    var remotePort = socket.remotePort;
    socket.setNoDelay(true);
    console.log("////////socket connected: \n", remoteAddress, " : ", remotePort);

    socket.on('data', function (data) {

      waterfall([
	function (callback) {
          exec(wlan0down, function (error, stdout, stderr) {
                        console.log("ifdown finished");
                });
            callback(null, '1');
            console.log("ifdown executed");
        },
        function (arg1, callback) {
          real_sleep(3000);
            callback(null, '1');
            console.log("sleep0");
        },
        function (arg1, callback) {
          var wifistring = data.toString();
          var wifiObj = JSON.parse(wifistring);
          console.log("data from android : "+ data.toString());
          console.log("ssid from android : "+ wifiObj.ssid);
          console.log("pwd from android : "+ wifiObj.pwd);
          console.log("datareceived done\n");

          var ph = "source-directory /etc/network/interfaces.d\n\n" +
          "auto lo\n" + "iface lo inet loopback\n" + "iface eth0 inet manual\n\n"

          var wl0 = "allow-hotplug wlan0\n" + "iface wlan0 inet dhcp\n" +
          "   wpa-ssid \"" + wifiObj.ssid + "\"\n"  + "   wpa-psk \"" + wifiObj.pwd + "\"\n\n"

          var wl1 = "allow-hotplug wlan1\n" + "iface wlan1 inet static\n" +
          "   address 10.0.0.1\n" + "   netmask 255.255.255.0"

          var interface = ph + wl0 + wl1;

          fs.writeFile('/etc/network/interfaces',interface,function(err) {
                  if(err) throw err;
                  console.log("interfaces saved\n");
          });
            callback(null, '1');
        },
        function (arg1, callback) {
          real_sleep(3000);
            callback(null, '1');
            console.log("sleep1");
        },
        function (arg1, callback) {
          exec(wlan0up, function (error, stdout, stderr) {
                        console.log("stderr : "+stderr);
                        console.log("ifup finished")
          });
            callback(null, '1');
            console.log("ifup executed");
        },
        function (arg1, callback) {
          real_sleep(3000);
            callback(null, '1');
            console.log("sleep2");
        },
        function (arg1, callback) {
            count++;
            msg = "#" + count + "//// network? " + connected;
            socket.end(msg);
            callback(null, 'done');
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
