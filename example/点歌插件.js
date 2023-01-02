import plugin from '../../lib/plugins/plugin.js'
import { segment } from "oicq";
import fetch from "node-fetch";
import { core } from "oicq";
const _path = process.cwd();

const no_pic = 'https://h5static.kuwo.cn/upload/image/4f768883f75b17a426c95b93692d98bec7d3ee9240f77f5ea68fc63870fdb050.png';

/** 
插件更新地址：https://gitee.com/xfdown/yun-zai-robot-plug-in/
*/

export class xiaofei_music extends plugin {
	constructor () {
		super({
			/** 功能名称 */
			name: '小飞点歌插件v1.8.1',
			/** 功能描述 */
			dsc: '使用互联分享接口发送音乐，目前支持以下命令：【#点歌 #多选点歌 #QQ点歌 #网易点歌 #酷我点歌 #酷狗点歌】',
			/** https://oicqjs.github.io/oicq/#events */
			event: 'message',
			/** 优先级，数字越小等级越高 */
			priority: 6000,
			rule: [
				{
					/** 命令正则匹配 */
					reg: '^#?(多选)?(qq|QQ|腾讯|网易(云)?|酷我|酷狗)?(点播音乐|点播|点歌|播放|来一?首).*$',
					/** 执行方法 */
					fnc: 'message'
				}
			]
		});
		
		this.task = {
			cron: '*/10 * * * * ?',
			name: '多选点歌缓存清理任务',
			fnc: clear_music_cache,
			log: false
		};
	}
	
	async message(){
		return music_message(this.e);
	}
	
	/** 接受到消息都会先执行一次 */
	accept () {
		if(/^([1-9]|(1|2|3)[0-9])$/.test(this.e.msg)){
			return music_message(this.e);
		}
		return false;
	}
}

if(Bot.xiaofei_music_guild){
	Bot.off('guild.message',Bot.xiaofei_music_guild);
}

Bot.xiaofei_music_guild = async (e) => {//处理频道消息
	e.msg = e.raw_message;
	if(/^#?(多选)?(qq|QQ|腾讯|网易(云)?|酷我|酷狗)?(点播音乐|点播|点歌|播放|来一?首).*$/.test(e.msg) || /^([1-9]|(1|2|3)[0-9])$/.test(e.msg)){
		music_message(e);
	}
};

Bot.on('guild.message',Bot.xiaofei_music_guild);

if(!Bot.xiaofei_music_temp_data){
	Bot.xiaofei_music_temp_data = {};
}

async function clear_music_cache(){
	let data = Bot.xiaofei_music_temp_data;
	for(let key in data){
		if((new Date().getTime() - data[key].time) > (1000 * 60)){
			await recallMusicMsg(key,data[key].msg_result);
			delete data[key];
		}
	}
}

async function recallMusicMsg(key,msg_result){
	if(msg_result){
		let arr = key.split('_');
		let type = arr[0];
		let message_id = msg_result.message_id;
		switch(type){
			case 'group':
				await Bot.pickGroup(arr[1]).recallMsg(message_id);
				break;
			case 'friend':
				await Bot.pickFriend(arr[1]).recallMsg(message_id);
				break;
		}
	}
}

async function music_message(e){
	let reg = /^(\d+)$/.exec(e.msg);
	if(reg){
		let key = get_MusicListId(e);
		let data = Bot.xiaofei_music_temp_data;
		if(!data[key] || (new Date().getTime() - data[key].time) > (1000 * 60)){
			return false;
		}
		
		let index = Number(reg[1]) - 1;
		if(data[key].data.length > index && index > -1){
			let music = data[key].data[index];
			await SendMusicShare(e,music);
			await recallMusicMsg(key,data[key].msg_result);
			delete data[key];
			return true;
		}
		return false;
	}
	
	
	reg = /^#?(多选)?(.*)?(点播音乐|点播|点歌|播放|来一?首)(.*)$/.exec(e.msg);
	let search = reg[4];
	let source = '';
	if(!reg[1]) reg[1] = '';
	
	switch(reg[2]){
		case '网易':
		case '网易云':
			source = 'netease';
			break;
		case '酷我':
			source = 'kuwo';
			break;
		case '酷狗':
			source = 'kugou';
			break;
			case '咪咕':
			source = 'migu';
			break;
		case 'qq':
		case 'QQ':
		default:
			reg[2] = 'QQ';
			source = 'qq';
			break;
	}
	if(search == ''){
		e.reply("格式：#"+reg[1]+reg[2]+"点歌(歌名|歌手|歌词|专辑)\r\n例如：#"+reg[1]+reg[2]+"点歌周杰伦",true);
		return true;
	}
	
	return music_handle(e,search,source,reg[1] == '多选' ? 1 : 0);
}

async function music_handle(e,search,source,page = 0){
	let result = await music_search(search,source,page == 0 ? 1 : page);
	if(result && result.data && result.data.length > 0){
		if(page > 0){
			let message = ['---搜索结果---'];
			for(let i in result.data){
				let music = result.data[i];
				message.push((Number(i)+1) + '.' + music.name + '-' + music.artist);
			}
			message.push('----------------');
			message.push('提示：请在一分钟内发送序号进行点歌！');
			let msg_result = await e.reply(message.join("\r\n"),true);
			let data = {
				time: new Date().getTime(),
				data: result.data,
				page: result.page,
				msg_result: msg_result
			};
			Bot.xiaofei_music_temp_data[get_MusicListId(e)] = data;
		}else{
			let music = result.data[0];
			await SendMusicShare(e,music);
		}
	}else{
		e.reply('没有找到该歌曲！',true);
	}
	return true;
	
}

function get_MusicListId(e){
	let id = '';
	if(e.guild_id){
		id = `guild_${e.channel_id}_${e.guild_id}`;
	}else if(e.group){
		id = `group_${e.group.gid}_${e.user_id}`;
	}else{
		id = `friend_${e.user_id}`;
	}
	return `${id}`;
}

async function music_search(search,source,page = 1){
	let list = [];
	let result = [];
	
	let value = {
		netease: {
			name: 'name',id: 'id',
			artist: (data) => {
				let ars = [];
				for(let index in data.ar){
					ars.push(data.ar[index].name);
				}
				return ars.join('·');
			},
			pic: (data) => {
				let url = data.al ? data.al.picUrl + '?param=300x300' : no_pic;
				return url;
			},
			link: (data) => {
				let url = 'http://music.163.com/#/song?id=' + data.id;
				return url;
			},
			url: (data) => {
				let url = 'http://music.163.com/song/media/outer/url?id=' + data.id;
				return url;
			}
		},
		kuwo: {
			name: 'SONGNAME',id: 'MUSICRID',artist: 'ARTIST',
			pic1: async (data) => {
				let url = `http://artistpicserver.kuwo.cn/pic.web?type=rid_pic&pictype=url&content=list&size=320&rid=${data.MUSICRID.substring(6)}`;
				let response = await fetch(url); //调用接口获取数据
				let res = await response.text(); //结果json字符串转对象
				url = '';
				if(res && res.indexOf('http') != -1){
					url = res;
				}
				return url;
			},
			pic: (data) => {
				let url = data.web_albumpic_short;
				url = url ? 'http://img2.kuwo.cn/star/albumcover/' + url : (data.web_artistpic_short ? 'http://img2.kuwo.cn/star/starheads/' + data.web_artistpic_short : no_pic);
				return url;
			},
			link: (data) => {
				let url = 'http://yinyue.kuwo.cn/play_detail/' + data.MUSICRID.substring(6);
				return url;
			},
			url: async (data) => {
				let url = `http://antiserver.kuwo.cn/anti.s?useless=/resource/&format=mp3&rid=${data.MUSICRID}&response=res&type=convert_url3&br=320kmp3`;
				let response = await fetch(url); //调用接口获取数据
				let res = await response.json(); //结果json字符串转对象
				if(res && res.url){
					url = res.url;
				}
				return url;
			}
		},
		qq: {
			name: (data) => {
				let name = data.title;
				return name.replace(/\<(\/)?em\>/g,''); 
			},
			id: 'mid',
			artist: (data) => {
				let ars = [];
				for(let index in data.singer){
					ars.push(data.singer[index].name);
				}
				return ars.join('·');
			},
			pic: (data) => {
				let album_mid = data.album ? data.album.mid : '';
				let singer_mid = data.singer ? data.singer[0].mid : '';
				let pic = album_mid != '' ? `T002R150x150M000${album_mid}` : (singer_mid != '' ? `T001R150x150M000${singer_mid}` : '');
				let url = pic == '' ? no_pic : `http://y.gtimg.cn/music/photo_new/${pic}.jpg`;
				return url;
			},
			link: (data) => {
				let url = 'https://y.qq.com/n/yqq/song/' + data.mid + '.html';
				return url;
			},
			url1: async (data) => {
				let url = `http://u.y.qq.com/cgi-bin/musicu.fcg?g_tk=5381&uin=0&format=json&data={"comm":{"ct":23,"cv":0},"url_mid":{"module":"vkey.GetVkeyServer","method":"CgiGetVkey","param":{"guid":"1234567890","songmid":["${data.mid}"],"songtype":[0],"uin":"0","loginflag":1,"platform":"23"}}}&_=${new Date().getTime()}`;
				let response = await fetch(url); //调用接口获取数据
				let res = await response.json(); //结果json字符串转对象
				let midurlinfo = res.url_mid.data.midurlinfo;
				let purl = '';
				if(midurlinfo && midurlinfo.length > 0){
					purl = midurlinfo[0].purl;
				}
				return purl;
			},
			url: (data) => {
				let code = md5(`${data.mid}q;z(&l~sdf2!nK`,32).substring(0,5).toLocaleUpperCase();
				let url = `http://c6.y.qq.com/rsc/fcgi-bin/fcg_pyq_play.fcg?songid=&songmid=${data.mid}&songtype=1&fromtag=50&uin=${Bot.uin}&code=${code}`;
				return url;
			}
		},
		kugou: {
			name: 'songname',id: 'hash',artist: 'singername',
			pic: null,
			link: (data) => {
				let url = `http://www.kugou.com/song/#hash=${data.hash}&album_id=${data.album_id}`;
				return url;
			},
			url: null,
			api: async (data,types) => {
				let hash = data.hash;
				let album_id = data.album_id;
				let url = `https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=${hash}&dfid=&appid=1014&mid=1234567890&platid=4&album_id=${album_id}&_=${new Date().getTime()}`;
				let response = await fetch(url); //调用接口获取数据
				let res = await response.json(); //结果json字符串转对象
				
				let result = {};
				
				if(res.status != 1){
					return result;
				}
				
				data = res.data;
				
				if(types.indexOf('pic') > -1){
					result.pic = data.img ? data.img : no_pic;
				}
				if(types.indexOf('url') > -1){
					let key = md5(`${hash}mobileservice`,32);
					result.url = `https://m.kugou.com/api/v1/wechat/index?cmd=101&hash=${hash}&key=${key}`;//播放直链
					//如果直链失效了再取消注释下面
					//result.url = data.play_url ? data.play_url : result.url;
				}
				return result;
			}
		}
	};
	
	switch(source){
		case 'netease':
			result = await netease_search(search,page);
			break;
		case 'kuwo':
			result = await kuwo_search(search,page);
			break;
		case 'kugou':
			result = await kugou_search(search,page);
			break;
		case 'qq':
		default:
			source = 'qq';
			result = await qqmusic_search(search,page);
			break;
	}
	if(result && result.data && result.data.length > 0){
		page = result.page;
		result = result.data;
		for(let i in result){
			let data = result[i];
			let name = value[source].name;name = typeof(name) == 'function' ? await name(data) : data[name];
			let id = data[value[source].id];if(source == 'kuwo'){id = id.substring(6);}
			let artist = value[source].artist;artist = typeof(artist) == 'function' ? await artist(data) : data[artist];
			let pic = value[source].pic;pic = typeof(pic) == 'function' ? pic/*await pic(data)*/ : data[pic];
			let link = value[source].link;link = typeof(link) == 'function' ? link(data) : data[link];
			let url = value[source].url;url = typeof(url) == 'function' ? url/*await url(data)*/ : data[url];
			list.push({
				id: id,
				name: name,
				artist: artist,
				pic: pic,
				link: link,
				url: url,
				source: source,
				data: data,
				api: value[source].api
			});
		}
	}
	return {page: page,data: list};
}

async function SendMusicShare(e,data,to_uin = null){
	let appid, appname, appsign, style = 4;
	switch(data.source){
		case 'netease':
			appid = 100495085, appname = "com.netease.cloudmusic", appsign = "da6b069da1e2982db3e386233f68d76d";
			break;
		case 'kuwo':
			appid = 100243533, appname = "cn.kuwo.player", appsign = "bf9ff4ffb4c558a34ee3fd52c223ebf5";
			break;
		case 'kugou':
			appid = 205141, appname = "com.kugou.android", appsign = "fe4a24d80fcf253a00676a808f62c2c6";
			break;
		case 'migu':
			appid = 1101053067, appname = "cmccwm.mobilemusic", appsign = "6cdc72a439cef99a3418d2a78aa28c73";
			break;
		case 'qq':
		default:
			appid = 100497308, appname = "com.tencent.qqmusic", appsign = "cbd27cd7c861227d013a25b2d10f0799";
			break;
	}
	
	var title = data.name, singer = data.artist, prompt = '[分享]', jumpUrl, preview, musicUrl;
	
	let types = [];
	if(data.url == null){types.push('url')};
	if(data.pic == null){types.push('pic')};
	if(data.link == null){types.push('link')};
	if(types.length > 0 && typeof(data.api) == 'function'){
		let {url,pic,link} = await data.api(data.data,types);
		if(url){data.url = url;}
		if(pic){data.pic = pic;}
		if(link){data.link = link;}
	}
	
	typeof(data.url) == 'function' ? musicUrl = await data.url(data.data) : musicUrl = data.url;
	typeof(data.pic) == 'function' ? preview = await data.pic(data.data) : preview = data.pic;
	typeof(data.link) == 'function' ? jumpUrl = await data.link(data.data) : jumpUrl = data.link;
	
	if(typeof(musicUrl) != 'string' || musicUrl == ''){
		style = 0;
		musicUrl = '';
	}
	
	prompt = '[分享]' + title + '-' + singer;
	
	let recv_uin = 0;
	let send_type = 0;
	let recv_guild_id = 0;
	let ShareMusic_Guild_id = false;
	
	if(e.isGroup && to_uin == null){//群聊
		recv_uin = e.group.gid;
		send_type = 1;
	}else if(e.guild_id){//频道
		recv_uin = Number(e.channel_id);
		recv_guild_id = BigInt(e.guild_id);
		send_type = 3;
	}else if(to_uin == null){//私聊
		recv_uin = e.friend.uid;
		send_type = 0;
	}else{//指定号码私聊
		recv_uin = to_uin;
		send_type = 0;
	}
	
	let body = {
		1: appid,
		2: 1,
		3: style,
		5: {
			1: 1,
			2: "0.0.0",
			3: appname,
			4: appsign,
		},
		10: send_type,
		11: recv_uin,
		12: {
			10: title,
			11: singer,
			12: prompt,
			13: jumpUrl,
			14: preview,
			16: musicUrl,
		},
		19: recv_guild_id
	};
	
	
	let payload = await Bot.sendOidb("OidbSvc.0xb77_9", core.pb.encode(body));
	
	let result = core.pb.decode(payload);

	if(result[3] != 0){
		e.reply('歌曲分享失败：'+result[3],true);
	}
}

async function kugou_search(search,page = 1){
	let url = `http://msearchcdn.kugou.com/api/v3/search/song?page=${page}&pagesize=10&keyword=${encodeURI(search)}`;
	let response = await fetch(url,{ method: "get" }); //调用接口获取数据
	let res = await response.json(); //结果json字符串转对象
	if(!res.data || res.data.info < 1){
		return [];
	}
	return {page: page,data: res.data.info};
}

async function qqmusic_search(search,page = 1){
	let qq_search_json = JSON.parse('{"search":{"module":"music.search.SearchBrokerCgiServer","method":"DoSearchForQQMusicMobile","param":{"query":"","highlight":1,"searchid":"123456789","sub_searchid":0,"search_type":0,"nqc_flag":0,"sin":0,"ein":30,"page_num":1,"num_per_page":10,"cat":2,"grp":1,"remoteplace":"search.android.defaultword","multi_zhida":1,"sem":0}}}');
	
	qq_search_json['search']['param']['searchid'] = new Date().getTime();
	qq_search_json['search']['param']['query'] = search;
	qq_search_json['search']['param']['page_num'] = page;
	
	let options = {
		method: 'POST',//post请求 
		headers: { 'Content-Type': 'application/x-www-form-urlencoded'},
		body: JSON.stringify(qq_search_json)
	};
	
	let url = `http://u.y.qq.com/cgi-bin/musicu.fcg`;

	let response = await fetch(url,options); //调用接口获取数据
	
	let res = await response.json(); //结果json字符串转对象
	
	if(res.code != '0'){
		return [];
	}
	return {page: page,data: res.search.data.body.item_song};
}

async function netease_search(search,page = 1){
	let url = 'http://music.163.com/api/cloudsearch/pc';
	let options = {
		method: 'POST',//post请求 
		headers: { 'Content-Type': ' application/x-www-form-urlencoded'},
		body: `offset=${page-1}&limit=10&type=1&s=${encodeURI(search)}`
	};

	let response = await fetch(url,options); //调用接口获取数据
	let res = await response.json(); //结果json字符串转对象
	
	if(res.result.songs < 1){
	  return [];
	}
	return {page: page,data: res.result.songs};
}
	
async function kuwo_search(search,page = 1){
	let url = `http://search.kuwo.cn/r.s?user=&android_id=&prod=kwplayer_ar_10.1.2.1&corp=kuwo&newver=3&vipver=10.1.2.1&source=kwplayer_ar_10.1.2.1_40.apk&p2p=1&q36=&loginUid=&loginSid=&notrace=0&client=kt&all=${search}&pn=${page-1}&rn=10&uid=&ver=kwplayer_ar_10.1.2.1&vipver=1&show_copyright_off=1&newver=3&correct=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1&searchapi=5&issubtitle=1&province=&city=&latitude=&longtitude=&userIP=&searchNo=&spPrivilege=0`;
	
	let response = await fetch(url,{ method: "get" }); //调用接口获取数据
	let res = await response.json(); //结果json字符串转对象
	if(res.abslist.length < 1){
		return [];
	}
	return {page: page,data:res.abslist};
}

function random(min,max){
	 //如生成3位的随机数就定义100-999；
	//const max = 100;
	//const min = 999;
	//生成6位的随机数就定义100000-999999之间
	//const min    = 100000;                            //最小值
	//const max    = 999999;                            //最大值
	const range  = max - min;                         //取值范围差
	const random = Math.random();                     //小于1的随机数
	const result = min + Math.round(random * range);  //最小数加随机数*范围差 
	//————————————————
	//版权声明：本文为CSDN博主「浪里龙小白丶」的原创文章，遵循CC 4.0 BY-SA版权协议，转载请附上原文出处链接及本声明。
	//原文链接：https://blog.csdn.net/m0_51317381/article/details/124499851
	return result;
}

/*
休眠函数sleep
调用 await sleep(1500)
 */
function sleep(ms) {
    return new Promise(resolve=>setTimeout(resolve, ms))
}

function md5(string,bit) {
    function md5_RotateLeft(lValue, iShiftBits) {
        return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    }
    function md5_AddUnsigned(lX, lY) {
        var lX4, lY4, lX8, lY8, lResult;
        lX8 = (lX & 0x80000000);
        lY8 = (lY & 0x80000000);
        lX4 = (lX & 0x40000000);
        lY4 = (lY & 0x40000000);
        lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
        if (lX4 & lY4) {
            return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
        }
        if (lX4 | lY4) {
            if (lResult & 0x40000000) {
                return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
            } else {
                return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
            }
        } else {
            return (lResult ^ lX8 ^ lY8);
        }
    }
    function md5_F(x, y, z) {
        return (x & y) | ((~x) & z);
    }
    function md5_G(x, y, z) {
        return (x & z) | (y & (~z));
    }
    function md5_H(x, y, z) {
        return (x ^ y ^ z);
    }
    function md5_I(x, y, z) {
        return (y ^ (x | (~z)));
    }
    function md5_FF(a, b, c, d, x, s, ac) {
        a = md5_AddUnsigned(a, md5_AddUnsigned(md5_AddUnsigned(md5_F(b, c, d), x), ac));
        return md5_AddUnsigned(md5_RotateLeft(a, s), b);
    };
    function md5_GG(a, b, c, d, x, s, ac) {
        a = md5_AddUnsigned(a, md5_AddUnsigned(md5_AddUnsigned(md5_G(b, c, d), x), ac));
        return md5_AddUnsigned(md5_RotateLeft(a, s), b);
    };
    function md5_HH(a, b, c, d, x, s, ac) {
        a = md5_AddUnsigned(a, md5_AddUnsigned(md5_AddUnsigned(md5_H(b, c, d), x), ac));
        return md5_AddUnsigned(md5_RotateLeft(a, s), b);
    };
    function md5_II(a, b, c, d, x, s, ac) {
        a = md5_AddUnsigned(a, md5_AddUnsigned(md5_AddUnsigned(md5_I(b, c, d), x), ac));
        return md5_AddUnsigned(md5_RotateLeft(a, s), b);
    };
    function md5_ConvertToWordArray(string) {
        var lWordCount;
        var lMessageLength = string.length;
        var lNumberOfWords_temp1 = lMessageLength + 8;
        var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
        var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
        var lWordArray = Array(lNumberOfWords - 1);
        var lBytePosition = 0;
        var lByteCount = 0;
        while (lByteCount < lMessageLength) {
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
            lByteCount++;
        }
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
        lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
        return lWordArray;
    };
    function md5_WordToHex(lValue) {
        var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
        for (lCount = 0; lCount <= 3; lCount++) {
            lByte = (lValue >>> (lCount * 8)) & 255;
            WordToHexValue_temp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
        }
        return WordToHexValue;
    };
    function md5_Utf8Encode(string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    };
    var x = Array();
    var k, AA, BB, CC, DD, a, b, c, d;
    var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    var S41 = 6, S42 = 10, S43 = 15, S44 = 21;
    string = md5_Utf8Encode(string);
    x = md5_ConvertToWordArray(string);
    a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
    for (k = 0; k < x.length; k += 16) {
        AA = a; BB = b; CC = c; DD = d;
        a = md5_FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
        d = md5_FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
        c = md5_FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
        b = md5_FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
        a = md5_FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
        d = md5_FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
        c = md5_FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
        b = md5_FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
        a = md5_FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
        d = md5_FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
        c = md5_FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
        b = md5_FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
        a = md5_FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
        d = md5_FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
        c = md5_FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
        b = md5_FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
        a = md5_GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
        d = md5_GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
        c = md5_GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
        b = md5_GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
        a = md5_GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
        d = md5_GG(d, a, b, c, x[k + 10], S22, 0x2441453);
        c = md5_GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
        b = md5_GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
        a = md5_GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
        d = md5_GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
        c = md5_GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
        b = md5_GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
        a = md5_GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
        d = md5_GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
        c = md5_GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
        b = md5_GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
        a = md5_HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
        d = md5_HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
        c = md5_HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
        b = md5_HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
        a = md5_HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
        d = md5_HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
        c = md5_HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
        b = md5_HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
        a = md5_HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
        d = md5_HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
        c = md5_HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
        b = md5_HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
        a = md5_HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
        d = md5_HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
        c = md5_HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
        b = md5_HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
        a = md5_II(a, b, c, d, x[k + 0], S41, 0xF4292244);
        d = md5_II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
        c = md5_II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
        b = md5_II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
        a = md5_II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
        d = md5_II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
        c = md5_II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
        b = md5_II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
        a = md5_II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
        d = md5_II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
        c = md5_II(c, d, a, b, x[k + 6], S43, 0xA3014314);
        b = md5_II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
        a = md5_II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
        d = md5_II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
        c = md5_II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
        b = md5_II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
        a = md5_AddUnsigned(a, AA);
        b = md5_AddUnsigned(b, BB);
        c = md5_AddUnsigned(c, CC);
        d = md5_AddUnsigned(d, DD);
    }
    if(bit==32){
        return (md5_WordToHex(a) + md5_WordToHex(b) + md5_WordToHex(c) + md5_WordToHex(d)).toLowerCase();
    }
    return (md5_WordToHex(b) + md5_WordToHex(c)).toLowerCase();
}