/**
 * @Author: kesally
 * @Date: 2022-10-09 00:00:00
 * @LastEditTime: 2022-10-09 03:00:00
 * @LastEditors: kesally
 * @Description: 入群验证码
 * @FilePath: \Yunzai-Bot\plugins\example\入群验证码v3 By kesally.js
 * @版权声明
 * @宣传下群不过分吧707499227
 * @写插件不易，请勿倒卖
 * @作者QQ2770706493
 **/

import plugin from '../../lib/plugins/plugin.js'
import { segment } from 'oicq'

//提示：如果群开启了管理员审核等就不要开这个，只适用于无审核防机器人
/**
 * @Author: kesally
 * @Date: 2022-10-09 00:00:00
 * @LastEditTime: 2022-10-09 03:00:00
 * @LastEditors: kesally
 * @Description: 入群验证码
 * @FilePath: \Yunzai-Bot\plugins\example\入群验证码v3 By kesally.js
 * @版权声明
 * @宣传下群不过分吧707499227
 * @写插件不易，请勿倒卖
 * @作者QQ2770706493
 **/

import plugin from '../../lib/plugins/plugin.js'
import { segment } from 'oicq'

//提示：如果群开启了管理员审核等就不要开这个，只适用于无审核防机器人
// 因为这样，人工延迟审核的人进来后可能不能实时验证导致被误踢
/**
 * --------第一步先给予机器人管理员吧 >-----------------
 * 1.要开启的群请在WelcomeListGroup中添加群号，全局开关CodeON_OF
 * 2.要修改验证码长度请修改CodeLength项
 * 3.要修改验证码时间请修改下面CodeTime项
 * 4.不区分大小写,统一转换为大写对比。
 * 5.增加了群标识，修复串群问题。
 * 6.设置了延迟发送，以免抢在【Q群管家】入群欢迎前发送，导致入群的人可能没注意机器人的提示。
 * 7.暂时没有其他BUG了，大体上应该可能是的
 * 8.作者是小白，写的不怎么好，请见谅，如有其他问题相信大佬们都会解决的
 * */


let CodeTime = 3 // 验证时间，分钟，默认3也就是3分钟。
let CodeLength = 5 // 验证码长度，默认5，如ABIDE
let CodeON_OF = true // 全局验证码系统开关，即直接控制是否开启和关闭。
let WelcomeListGroup = [707499227]
// 开启入群验证的群，自带BOT管理员or群主检测，如果不是管理员，开启也不会验证

let DelayTime = 5 // 延迟发送验证时间，秒，即检测到入群后多少秒对入群者开始验证。
/**
 * --------第一步先给予机器人管理员吧 >-----------------
 * 1.要开启的群请在WelcomeListGroup中添加群号，全局开关CodeON_OF
 * 2.要修改验证码长度请修改CodeLength项
 * 3.要修改验证码时间请修改下面CodeTime项
 * 4.不区分大小写,统一转换为大写对比。
 * 5.增加了群标识，修复串群问题。
 * 6.设置了延迟发送，以免抢在【Q群管家】入群欢迎前发送，导致入群的人可能没注意机器人的提示。
 * 7.暂时没有其他BUG了，大体上应该可能是的
 * 8.作者是小白，写的不怎么好，请见谅，如有其他问题相信大佬们都会解决的
 * */


let CodeTime = 3 // 验证时间，分钟，默认3也就是3分钟。
let CodeLength = 5 // 验证码长度，默认5，如ABIDE
let CodeON_OF = true // 全局验证码系统开关，即直接控制是否开启和关闭。
let WelcomeListGroup = [707499227]
// 开启入群验证的群，自带BOT管理员or群主检测，如果不是管理员，开启也不会验证

let DelayTime = 5 // 延迟发送验证时间，秒，即检测到入群后多少秒对入群者开始验证。
// ↑↑↑<作用是避免抢在【Q群管家】欢迎前发送，从而容易被入群者忽略掉Bot消息。一般不用动，除非你想延迟得更长。
const CodeGroup = {}// 全局QQ群标识，防串群，不用管
const CodeCD = {} // 全局QQ号验证码标识初始化，不用管
export class CreateCode extends plugin {
    constructor() {
        super({
            name: '入群验证码',
            dsc: '请在xx分钟内发送验证码xxx',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'notice.group.increase',
            priority: 5 //优先级 数字越小优先级越高
        })
    }
    async accept(e) {
      if (CodeON_OF === false) {
        return false
      }// 如果没有打开全局开关
        if(!WelcomeListGroup.includes(e.group_id)){
            return false
        }//如果不在开启的群名单
// ↑↑↑<作用是避免抢在【Q群管家】欢迎前发送，从而容易被入群者忽略掉Bot消息。一般不用动，除非你想延迟得更长。
const CodeGroup = {}// 全局QQ群标识，防串群，不用管
const CodeCD = {} // 全局QQ号验证码标识初始化，不用管
export class CreateCode extends plugin {
    constructor() {
        super({
            name: '入群验证码',
            dsc: '请在xx分钟内发送验证码xxx',
            /** https://oicqjs.github.io/oicq/#events */
            event: 'notice.group.increase',
            priority: 5 //优先级 数字越小优先级越高
        })
    }
    async accept(e) {
      if (CodeON_OF === false) {
        return false
      }// 如果没有打开全局开关
        if(!WelcomeListGroup.includes(e.group_id)){
            return false
        }//如果不在开启的群名单
      if (!(Bot.pickGroup(e.group_id).is_owner || Bot.pickGroup(e.group_id).is_admin)) {
        return false
      }// 如果机器人不是群主或管理员
      let gainType = e.sub_type
      // 有人入群
      if (gainType === 'increase') {
          logger.mark('#新人入群：', gainType)
        // Bot.logger.mark('#新人入群：', gainType)
        // const checkCode = document.getElementById("checkCode");
        // 所有候选组成验证码的字符，当然也可以用中文的
        let code = ''
        // const checkCode = document.getElementById("checkCode");
        const codeChars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
        // 循环组成验证码的字符串
        for (let i = 0; i < CodeLength; i++) {
          // 获取随机验证码下标
          const charNum = Math.floor(Math.random() * 60)
          // 组合成指定字符验证码
          code += codeChars[charNum]
        }
      if (!(Bot.pickGroup(e.group_id).is_owner || Bot.pickGroup(e.group_id).is_admin)) {
        return false
      }// 如果机器人不是群主或管理员
      let gainType = e.sub_type
      // 有人入群
      if (gainType === 'increase') {
          logger.mark('#新人入群：', gainType)
        // Bot.logger.mark('#新人入群：', gainType)
        // const checkCode = document.getElementById("checkCode");
        // 所有候选组成验证码的字符，当然也可以用中文的
        let code = ''
        // const checkCode = document.getElementById("checkCode");
        const codeChars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
        // 循环组成验证码的字符串
        for (let i = 0; i < CodeLength; i++) {
          // 获取随机验证码下标
          const charNum = Math.floor(Math.random() * 60)
          // 组合成指定字符验证码
          code += codeChars[charNum]
        }
        let CodeQQ = [e.user_id, code]
        // 延迟艾特并提醒发送验证码，防止秒发送抢在Q群管家欢迎前，从而被忽略掉。
        setTimeout(async () => {
          let msg = [segment.at(this.e.user_id), `请在${CodeTime}分钟内发送如下验证码(不区分大小写)：`, '\n', CodeQQ[1]]
          await e.reply(msg)
        }, DelayTime * 1000)
        // 入群QQ进入计时。
        CodeCD[e.user_id] = setTimeout(async () => {
          if (CodeCD[e.user_id]) {
            await e.group.sendMsg(`${e.user_id}由于您未能及时验证，已飞向M78星云~`)
            await e.group.kickMember(e.user_id,true)
            delete CodeCD[e.user_id]
            delete CodeGroup[e.user_id]
          }
        }, CodeTime * 60000)
        CodeGroup[e.user_id] = setTimeout(async () => {
          if (CodeGroup[e.user_id]) {
            delete CodeGroup[e.user_id]
          }
        }, CodeTime * 60000)
        let CodeQQ = [e.user_id, code]
        // 延迟艾特并提醒发送验证码，防止秒发送抢在Q群管家欢迎前，从而被忽略掉。
        setTimeout(async () => {
          let msg = [segment.at(this.e.user_id), `请在${CodeTime}分钟内发送如下验证码(不区分大小写)：`, '\n', CodeQQ[1]]
          await e.reply(msg)
        }, DelayTime * 1000)
        // 入群QQ进入计时。
        CodeCD[e.user_id] = setTimeout(async () => {
          if (CodeCD[e.user_id]) {
            await e.group.sendMsg(`${e.user_id}由于您未能及时验证，已飞向M78星云~`)
            await e.group.kickMember(e.user_id,true)
            delete CodeCD[e.user_id]
            delete CodeGroup[e.user_id]
          }
        }, CodeTime * 60000)
        CodeGroup[e.user_id] = setTimeout(async () => {
          if (CodeGroup[e.user_id]) {
            delete CodeGroup[e.user_id]
          }
        }, CodeTime * 60000)
          logger.mark('标记_A5')
        CodeCD[e.user_id] = code
        CodeGroup[e.user_id] = e.group_id
        logger.mark('群：', CodeGroup[e.user_id])
        logger.mark('验证码：', CodeCD[e.user_id])
      }else{
          return false;
      }
    }
}

export class ListenCode extends plugin{
    constructor() {
        super(
            {
                name:'监听并验证验证码',
                dsc:'请发送验证码xxx',
                event:'message.group',
                priority:'20',
 
            }
        );
        this.tipsFale='发送的验证码有误，请检查一下重新发送。'
        this.tipsTrue='验证成功，在群里尽情van耍吧，ご主人様を歓迎します祝您玩得愉快！qwq'
        this.tipsTrue='验证成功，群蛮大的累了可以直接睡，尽情在群里van耍吧'
    }
    async accept(e){
        if(CodeCD[e.user_id]&&(e.group_id===CodeGroup[e.user_id])){
            for(let val of e.message){
                if((val.type==='image')||(e.msg.toUpperCase()!==CodeCD[e.user_id].toUpperCase())){
                    let msg=[segment.at(e.user_id),`${this.tipsFale}`,'\n',CodeCD[e.user_id]]
                    await e.reply(msg)
                }else{
                    let msg=`${this.tipsTrue}`
                    await e.reply(msg,true)
                    delete CodeCD[e.user_id]
                    delete CodeGroup[e.group_id]
                }
            }
        }else{
            return false;
        }
    }
}