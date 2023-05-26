const{token, prefix} = require('./config.json');
const DisCord = require('discord.js');
const client = new DisCord.Client();
const ytdl = require('ytdl-core');
const {getVideoInfo} = require('youtube-video-exists');

client.login(token);
client.on('ready', ()=> {
    console.log(`${client.user.tag} is ready.`);
    client.user.setStatus("ONLINE");
    client.user.setPresence({ activity: { name: '~help' }, status: 'available' });
});
client.once("reconnecting", () => {
    console.log("Reconnecting!");
});
client.once("disconnect", () => {
    console.log("Disconnect!");
});

const queues = new Map();
class Queue {
    constructor(voiceChannel) {
        this.voiceChannel = voiceChannel;
        this.connection = null;
        this.songs = [];
        this.volume = 100;
        this.playing = true;
        this.repeat = false;
    }
}

class Song {
    constructor(title, url) {
        this.title = title;
        this.url = url;
    }
}

client.on(`message`, async message => {
    if (message.author.bot) return;
    const args = message.content.slice(prefix.length).split(/ +/);
    const cmd = args[0];

    if (cmd==="ping"){
        const timeTaken = Date.now() - message.createdTimestamp;
        message.channel.send(`Act kool, mất ${timeTaken}ms để hết đứng hình.`);
    }

    if (cmd==='play'){
        try {
            let voiceChannel = message.member.voice.channel;
            // let voiceChannel = message.member.voice;
            if (!voiceChannel) return message.reply("Vào voice hoặc có cl tao bật nhạc cho nghe.");
            let permissions = message.member.voice.channel.permissionsFor(message.client.user);
            if (!permissions.has('CONNECT')||!permissions.has('SPEAK')) return message.reply(`Cấp quyền đi thanglon. <(") `);
            let url = args.slice(1).join(' ');
            if (url===""){
                message.channel.send("Bắt tao phát nhạc câm à? Điền cái url vào!");
                return;
            }
            if (!ytdl.validateURL(url)) {
                return message.reply("Hỗ trợ link video Youtube thôi, gimme link video Youtube or bị đút đít");
            }
            else {
                let str = "";
                for (let i=0; i<url.length-2; i++)
                {
                    if (url[i] === 'v' && url[i+1] === '='){
                        for (let j=i+2; j<url.length; j++){
                            str+=url[j];
                        }
                    }
                }
                let check = getVideoInfo(str);
                if ((await check).existing){
                    let video = await ytdl.getInfo(url);
                    const song = new Song(video.videoDetails.title, video.videoDetails.video_url);
                    console.log(song);
                    var embedPlay = {
                        color:'#00FFFF',
                        description: `:notes: Thêm vào hàng chờ: ${song.title}`,
                        thumbnail: {
                            url:'https://pbs.twimg.com/media/FZ1oM4MX0AE0jbA?format=jpg&name=900x900' /*Sage*/
                        },
                        timestamp: new Date(),
                        footer: {
                            text: 'Create by Infinity9591 with GitHub Source',
                            icon_url: 'https://static.tvtropes.org/pmwiki/pub/images/genshin_memetic.jpg'
                        }
                    }
                    const serverQueue = queues.get(message.guild.id);
                    if (!serverQueue) {
                        let queue = new Queue(voiceChannel);
                        queues.set(message.guild.id, queue);
                        queue.songs.push(song);
                        // let connection = await voiceChannel.join();
                        let connection = await voiceChannel.join();
                        queue.connection = connection;
                        playSong(message);
                    } else {
                        serverQueue.songs.push(song);
                        message.channel.send({embed:embedPlay})
                    }
                    return;
                } else return message.reply("Gõ lại url hoặc tao sút đít.");
            }
        } catch (error) {
            return message.reply("Lmao có lỗi kết nối rồi");
        }
    }
    if (cmd === 'stop') {
        const serverQueue = queues.get(message.guild.id);
        if (!serverQueue) return message.reply("Có bài chết liền!");
        serverQueue.songs=[];
        serverQueue.connection.dispatcher.end();
        var embedStop = {
            color: '00FFFF',
            description: `:notes: Đã tắt hết list rồi ehe.`,
            timestamp: new Date(),
            footer: {
                text: 'Create by Infinity9591 with GitHub Source'
            }
        };
        message.channel.send({embed:embedStop});
        return;
    }
    if (cmd === 'skip') {
        const serverQueue = queues.get(message.guild.id);
        if (!serverQueue) return message.reply("Thêm bài hát hoặc tao sủi.");
        var embedSkip = {
            color:'#00FFFF',
            description:`:notes: Bỏ qua bài: ${serverQueue.songs[0].title}`,
            timestamp: new Date(),
            footer: {
                text: 'Create by Infinity9591'
            }
        }
        if (serverQueue.songs.length<1){
            serverQueue.songs=[];
            serverQueue.connection.dispatcher.end();
        } else {
            serverQueue.connection.dispatcher.end();
            message.channel.send({ embed: embedSkip });
        }
        return;
    }
    if (cmd === 'pause') {
        const serverQueue = queues.get(message.guild.id);
        var embedPause = {
            color:'#00FFFF',
            description:`:notes: Đã tạm dừng ${serverQueue.songs[0].title}`,
            timestamp: new Date(),
                footer: {
                text: 'Create by Infinity9591'
            }
        }
        if (!serverQueue) return message.reply("Thêm bài!");
        serverQueue.playing = false;
        serverQueue.connection.dispatcher.pause();
        message.channel.send({ embed: embedPause });
        return;
    }
    if (cmd === 'resume') {
        const serverQueue = queues.get(message.guild.id);
        if (!serverQueue) return message.reply("AĐ MÚIC PLEÁE. =))))") ;
        var embedResume = {
            color:'#00FFFF',
            description:`Đã bật lại ${serverQueue.songs[0].title}`,
            timestamp: new Date(),
            footer: {
                text: 'Create by Infinity9591',
            }
        }
        serverQueue.playing = true;
        serverQueue.connection.dispatcher.resume(message);
        serverQueue.connection.dispatcher.pause(message);
        serverQueue.connection.dispatcher.resume(message);
        message.channel.send({ embed: embedResume });
        return;
    }
    if (cmd === 'repeat') {
        const serverQueue = queues.get(message.guild.id);
        if (!serverQueue) return message.reply("=)))????");
        var embedRepeat = {
            color:'#00FFFF',
            description:`:notes: Lặp lại bài: ${serverQueue.songs[0].title}`,
            timestamp: new Date(),
            footer: {
                text: 'Create by Infinity9591',
            }
        }
        serverQueue.repeat = true;
        message.channel.send({ embed: embedRepeat });
        return;
    }
    if (cmd === 'offrepeat') {
        const serverQueue = queues.get(message.guild.id)
        var embedOffepeat = {
            color:'#00FFFF',
            description:`:notes: Ngừng lặp lại bài: ${serverQueue.songs[0].title}`,
            timestamp: new Date(),
            footer: {
                text: 'Create by Infinity9591'
            }
        }
        if (!serverQueue) return message.reply("((((=??");
        serverQueue.repeat = false;
        message.channel.send({ embed: embedOffepeat });
        return;
    }
    if (cmd === 'queue') {
        const serverQueue = queues.get(message.guild.id);
        if (!serverQueue) return message.reply("List trống như lượng người yêu mày có vậy.");
        let result = serverQueue.songs.map((song, i) => {
            return `${(i === 0) ? `\`Đang phát:\`` : `${i}.`} ${song.title}`
        }).join('\n');
        var embedQueue = {
            color:'#00FFFF',
            description:`${result}`,
            timestamp: new Date(),
            footer: {
                text: 'Create by Infinity9591',
            }
        }
        message.channel.send({embed:embedQueue});
        return;
    }
    if (cmd==='help'){
        var embedHelp = {
            color:'#00FFFF',
            title:'List lệnh:',
            description:'\n~help: Bảng lệnh\n~ping: Check độ trễ\n~play + url: Chơi nhạc\n~stop: Dừng nhạc\n~skip: Bỏ qua bài nhac\n~pause: Tạm dừng nhạc\n~resume: Tiếp tục phát nhạc\n~repeat: Bật lặp lại\n~offrepeat: Tắt lặp lại\n~queue: List nhạc dang chờ\n~leave : Rời kênh voice\nCó lệnh ẩn đấy, giỏi thì tìm đi.',
            timestamp: new Date(),
            footer: {
                text: 'Create by Infinity9591'
            }
        }
        message.channel.send({ embed: embedHelp });
    }
    if (cmd === 'leave'){
        const serverQueue = queues.get(message.guild.id);
        if (!serverQueue) return;
        serverQueue.voiceChannel.leave();
        queues.delete(message.guild.id);
        message.channel.send("Cook đây");
    }
})

async function playSong(message) {
    const serverQueue = queues.get(message.guild.id);
    if (!serverQueue) return;
    if (serverQueue.songs.length < 1) {
        return message.channel.send("Hết nhạc rồi, phắn đây.");
    }
    let song = serverQueue.songs[0];
    let dispatcher = serverQueue.connection.play(ytdl(song.url, {filter: 'audioonly', highWaterMark: 1<<25, type: 'opus', quality : 'highest'}));
    dispatcher.setVolume(serverQueue.volume/100);
    dispatcher.on('finish', () => {
        if (!serverQueue.repeat) serverQueue.songs.shift();
        return playSong(message);
    });
}



