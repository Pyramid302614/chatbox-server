if(!require("fs").readFileSync("clients.json")) require("fs").writeFileSync("clients.json","{}");

process.on("uncaughtException",e => console.error(e));
process.on("unhandledRejection",r => console.error(r));

console.log("Starting box engine...");

const http = require("http");
const server = http.createServer(serverRequest);

const ws = require("ws");
const wss = new ws.Server({ server });
wss.on("connection",webSocketConnection);

console.log("All good! :)");

server.listen(3000,() => {
    console.log("Server is now listening for you");
});

function serverRequest(req,res) {

    if(req.url == "/me") {
        res.writeHead(200,{"Content-Type":"text/plain"});
        res.end((getClient(getClientIdFromIP(req.socket.remoteAddress)) ?? {}).displayName ?? "Anonymous");
    }

}

function webSocketConnection(ws,req) {

    if(getClientIdFromIP(req.socket.remoteAddress)) connectClient(req.socket.remoteAddress);

    ws.on("close",() => webSocketClose(ws,req));

    ws.on("message", event => {

        const message = event.toString();

        if(message == "heartbeat") return;

        const clientId = getClientIdFromIP(req.socket.remoteAddress);
            const client = getClient() ?? {};

        switch(message.split(">")[0]) {

            case "join": 

                updateClientIP(message.split(">")[1],req.socket.remoteAddress);
                connectClient(req.socket.remoteAddress);                        
                break;

            case "message":

                webSocketSendAll("message>"+message.slice("message>".length)+"&&&&&&&&"+(client.displayName ?? "Anonymous"));
                break;

            case "name":

                const newName = message.slice("name>".length);
                webSocketSendAll(`name>${getClient(getClientIdFromIP(req.socket.remoteAddress)).displayName}&&&&&&&&${newName}`)
                client.displayName = newName;
                updateClient(clientId,client);
                break;

        } 

    });

}
function webSocketClose(ws,req) {

    const clientId = getClientIdFromIP(req.socket.remoteAddress);
    const client = getClient(clientId);
    client.connected = false;
    updateClient(clientId,client);
    webSocketSendAll(`leave>${client.displayName ?? "Anonymous"}`);

}

function webSocketSendAll(message) {

    require("fs").writeFileSync("chat.log",(require("fs").readFileSync("chat.log") ?? "")+"\n"+parseSignal(message));
    wss.clients.forEach(client => client.send(message));

}
function parseSignal(signal) {

    switch(signal.split(">")[0]) {

        case "join":

            return `${signal.slice("join>".length)} joined.`;

        case "leave":

            return `${signal.slice("leave>".length)} left.`;

        case "message":

            return `${signal.split("&&&&&&&&")[1]} >> ${(signal.slice("message>".length)).split("&&&&&&&&")[0]}`;

        case "name":

            return `${signal.slice("name>").split("&&&&&&&&")[0]} has changed their name to ${signal.split("&&&&&&&&")[1]}`;

        default:

            return `[RAW] ${signal}`;


    }

}


function getClient(clientId) {

    return require("./clients.json")[clientId];

}
function getClientIdFromIP(ip) {

    for(const clientId of Object.keys(require("./clients.json")))
        if(getClient(clientId).ip == ip) return clientId;
    return undefined;

}
function updateClient(clientId,newClient) {

    const data = require("./clients.json");
    data[clientId] = newClient;
    require("fs").writeFileSync("clients.json",JSON.stringify(data,null,2));

}
function updateClientIP(clientId,ip) {

    const client = getClient(clientId) ?? {};
    client.ip = ip;
    updateClient(clientId,client);

}
function connectClient(ip) {

    const clientId = getClientIdFromIP(ip);
    const client = getClient(clientId) ?? {};

    if(!client.connected) webSocketSendAll(`join>${client.displayName ?? "Anonymous"}`);

    client.connected = true;
    updateClient(clientId,client);

}