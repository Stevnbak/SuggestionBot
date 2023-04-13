const io = require('@pm2/io');
const {Client} = Bot;

const currentUsers = io.metric({
    name: 'Current Users',
    id: 'app/realtime/users',
    historic: true,
});
const currentServers = io.metric({
    name: 'Current Servers',
    id: 'app/realtime/guilds',
    historic: true,
});
updateMetrics();
setInterval(updateMetrics, 5 * 60 * 1000);
function updateMetrics() {
    Client.guilds.fetch();
    currentServers.set(Client.guilds.cache.size);
    var users = 0;
    Client.guilds.cache.forEach((guild) => {
        users += guild.memberCount;
    });
    currentUsers.set(users);
}
