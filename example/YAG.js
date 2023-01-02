import { segment } from 'oicq'
import fetch from 'node-fetch'
import cfg from "../../lib/config/config.js"//用来遍历文件中的主人QQ
//项目路径
const _path = process.cwd();

const defaultBotName = "云小安"; //机器人默认昵称(一般用不上)

//1.踢出群成员
export class kick extends plugin {
	constructor() {
		super({
			name: '踢群成员',
			dsc: '踢出指定成员',
			event: 'message',
			/**优先级，数字越小等级越高 */
			priority: 100,
			rule: [
				{
					/*命令正则匹配*/
					reg: "^#踢出",
					/*执行方法 */
					fnc: 'kickaMember',
				}
			]
		})
	}
	async kickaMember(e) {
		/*判断机器人是否为群主或者管理员*/
		if (e.group.is_owner || e.group.is_admin) {
			/*判断发言人是否为主人或者管理*/
			if (e.sender.role === 'owner' || e.isMaster || e.sender.role === 'admin') {
				let example = '示例：#踢出 @xxx'
				let qq = null
				for (let msg of e.message) {
					if (msg.type === 'at') {
						qq = msg.qq
						break
					}
				}
				let nickname=await (e.group.pickMember(qq).nickname || e.group.pickMember(qq).card)
				console.log(nickname)
				console.log(e.group.pickMember(qq).nickname)
				qq = Number(qq)
				console.log(qq)
				if (qq == null) {
					e.reply([`${defaultBotName}:未找到该群成员\n` + example])
				} else {
					/*判断被踢的人是否为主人*/
					if (cfg.masterQQ.includes(Number(qq))) {
						e.reply([`${defaultBotName}:无法踢出主人`])
					}
					/*判断当发言人为主人时，同时机器人和被踢的人都为管理时，机器人无法将其踢出*/
					else if((e.isMaster||e.sender.role === 'owner')&&e.group.is_admin&&e.group.pickMember(qq).is_admin)
					{
						e.reply([`${defaultBotName}:无法踢出群主或管理员`])
					}
					/*判断被踢的人是否为管理
					 * 但当发言人为主人时，Bot你能将其踢出，前提是机器人必须是群主
					*/
					else if (!e.isMaster || e.group.pickMember(qq).is_admin) {
						e.reply([`${defaultBotName}:无法踢出管理员`])
					}
					else {
						e.group.kickMember(qq)
						let msg = [
							`由于${nickname}(${qq}违反群规，${defaultBotName}已将${nickname}(${qq})踢出本群`,
						];
						e.reply(msg)
					}
				}
			}
			else {
				e.reply([`${defaultBotName}:您未获授权`])
			}
		}
		else {
			e.reply([`${defaultBotName}:机器人未获授权`])
		}
	}
}

//2.设置管理员
export class setAdmin extends plugin {
	constructor() {
		super({
			name: '设置管理员',
			dsc: '设置指定群成员为管理员',
			event: 'message',
			/**优先级，数字越小等级越高 */
			priority: 100,
			rule: [
				{
					/*命令正则匹配*/
					reg: "^#设置管理员",
					/*执行方法 */
					fnc: 'setaAdmin',
				},
				{
					/*命令正则匹配*/
					reg: "^#取消管理员",
					/*执行方法 */
					fnc: 'cancelaAdmin',
				},
			]
		})
	}
	/**
	 * #设置管理员
	 * @param e oicq传递的事件参数e
	 */
	async setaAdmin(e) {
		/*判断机器人是否为群主*/
		if (e.group.is_owner) {
			/*判断发言人是否为主人*/
			if (e.isMaster) {
				let example = '示例：#设置管理员 @xxx'
				let qq = null
				for (let msg of e.message) {
					if (msg.type === 'at') {
						qq = msg.qq
						break
					}
				}
				if (qq == null) {
					e.reply([`${defaultBotName}：无法找到该群员` + example])
				} else {
					if (e.group.pickMember(qq).is_admin) {
						e.reply([`该成员已经是管理员`])
					}
					else {
						e.group.setAdmin(qq, 1)
						let msg = [
							`${defaultBotName}:已将`,
							segment.at(qq),
							`设置为管理`,
						];
						e.reply(msg)
					}
				}
				return true
			}
			else {
				e.reply([`您未获授权`])
			}
		}
		else {
			e.reply([`${defaultBotName}非群主，无法设置管理员`])
		}
	}

	/**
	 * #取消管理员
	 * @param e oicq传递的事件参数e
	 */
	async cancelaAdmin(e) {
		/*判断机器人是否为群主*/
		if (e.group.is_owner) {
			/*判断发言人是否为主人*/
			if (e.isMaster) {
				let example = '示例：#取消管理员 @xxx'
				let qq = null
				for (let msg of e.message) {
					if (msg.type === 'at') {
						qq = msg.qq
						break
					}
				}
				qq = Number(qq)
				if (qq == null) {
					e.reply([`${defaultBotName}:无法找到该群员` + example])
		
				} else {
					if (e.group.pickMember(qq).is_admin) {
						e.group.setAdmin(qq, 0)
						let msg = [
							`${defaultBotName}已取消`,
							segment.at(qq),
							`的管理员权限`,
						];
						e.reply(msg)
					}
					else {
						e.reply([`该成员非管理员`])
					}
				}
				return true
			}
			else {
				e.reply([`您未获授权`])
			}
		}
		else {
			e.reply([`${defaultBotName}非群主，无法取消管理员`])
		}
	}
}

export class MemberTaboo extends plugin {
    constructor() {
		super({
			name: '禁言群员',
			dsc: '指定禁言成员十分钟',
			event: 'message',
			/**优先级，数字越小等级越高 */
			priority: 100,
			rule: [
				{
					/*命令正则匹配*/
					reg: "^#禁言",
					/*执行方法 */
					fnc: 'muteMember',
				},
			]
		})
	}
	/**
	 * #设置管理员
	 * @param e oicq传递的事件参数e
	 */
	async setaAdmin(e) {
		let qq = null;
		qq = Number(qq)
		if (qq == null) {
			e.reply([`${defaultBotName}:无法找到该群员` + example])
		} else {
			if (e.group.is_owner || e.group.is_admin) {
				if (e.sender.role === 'owner' || e.isMaster || e.sender.role === 'admin') {
					let example = '示例：#禁言 @xxx'
					e.group.muteMembrer(qq)
				}
			} else {
				e.reply([`${defaultBotName}无权限`])
			}
		}	
	}
}