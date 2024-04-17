const {chromium} = require("playwright");
const { promisify } = require('util');
// const { writeFileAsync } = require('./utils/file_utils.js')

const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { writeFileAsync } = require("../utils/file_utils");
const {chromePath} = require("./env_utils");
const execPromise = promisify(exec);


const SocialAccountType = {
    WX: 'wx', // 微信视频号
    DOUYIN: 'douyin', // 抖音
    XHS: 'xhs', // 小红书
    KS: 'ks' // 快手
}

getAuthFileLocation = (socialAccountType) => {
    const currentDir = __dirname;
    const rootDir = path.resolve(currentDir, '../');
    return path.join(rootDir, '..', 'config', socialAccountType, 'auth.json');
}

uniformSetup = async (socialAccountType, handle) => {
    let configFilePath = getAuthFileLocation(socialAccountType)
    switch (socialAccountType) {
        case SocialAccountType.WX:
            return wxSetup(configFilePath, handle)
        case SocialAccountType.DOUYIN:
            return douyinSetup(configFilePath, handle)
        case SocialAccountType.XHS:
            return xhsSetup(configFilePath, handle)
        case SocialAccountType.KS:
            return ksSetup(configFilePath, handle)
        default:
            return false
    }
}


async function wxSetup(absoluteAccountFilePath, handle) {
    console.log(`---wx.accountFile---${absoluteAccountFilePath}`)

    cookieAuth = async (accountFilePath) => {
        console.log(`accountFilePath:    ${accountFilePath}`)
        let browser;
        // const page = await browser.newPage();

        try {
            browser = await chromium.launch({headless: true, executablePath: chromePath});
            // const content = fs.readFileSync(accountFilePath, { encoding: "utf-8" });

            const context = await browser.newContext({ storageState: accountFilePath })
            const page = await context.newPage()
            await page.goto("https://channels.weixin.qq.com/platform/post/create");
            // await page.screenshot({ path: 'wx_shop_auth.png' });
            await page.waitForSelector('div.title-name:has-text("视频号小店")', {timeout: 5000})
            console.log("[+] 等待5秒 cookie 失效")
            return false
        } catch (error) {
            console.log("[+] cookie 有效")
            console.log(error);
            return true
        } finally {
            await browser.close();
        }
    }

    // accountFile = absoluteAccountFilePath
    if (!fs.existsSync(absoluteAccountFilePath) || !(await cookieAuth(absoluteAccountFilePath))) {
        if (!handle) {
            // Todo alert message
            return false;
        }
        console.log('[+] cookie文件不存在或已失效，即将自动打开浏览器，请扫码登录，登陆后会自动生成cookie文件')
        // await saveStorageState(accountFile)
        await execPromise(`playwright codegen channels.weixin.qq.com --save-storage=${absoluteAccountFilePath}`); // 生成cookie文件
    }
    console.log('----after wxSetup----')
    return true
}

async function douyinSetup(absoluteAccountFilePath, handle) {
    console.log(`---douyin.accountFile---${absoluteAccountFilePath}`)
    accountFile = absoluteAccountFilePath

    cookieAuth = async (accountFilePath) => {
        console.log(`accountFilePath:    ${accountFilePath}`)
        let browser;
        try {
            browser = await chromium.launch({headless: true, executablePath: chromePath});
            // const content = fs.readFileSync(accountFilePath, { encoding: "utf-8" });
            const context = await browser.newContext({ storageState: accountFilePath })
            const page = await context.newPage()
            await page.goto("https://creator.douyin.com/creator-micro/content/upload");
            console.log('---before waitForSelector---')
            await page.waitForSelector("div.boards-more h3:text('抖音排行榜')", {timeout: 5000})
            console.log('---after waitForSelector---')
            console.log("[+] 等待5秒 cookie 失效")
            return false
        } catch (error) {
            console.log("[+] cookie 有效")
            console.log(error);
            return true
        } finally {
            await browser.close();
        }
    }

    async function douyinCookieGen(accountFile) {
        browser = await chromium.launch({ headless: false, executablePath: chromePath })
        context = await browser.newContext()
        page = await context.newPage()
        await page.goto("https://www.douyin.com/")
        await page.pause()

        // 点击调试器的继续，保存cookie
        await context.storageState({ path: accountFile })
    }

    const exists = await fs.existsSync(accountFile)
    console.log(`accountFile: ${accountFile}, exists: ${exists}`)
    if (!fs.existsSync(accountFile) || !(await cookieAuth(accountFile))) {
        console.log('--in judgement--')
        if (!handle) {
            // Todo alert message
            return false;
        }
        console.log('[+] cookie文件不存在或已失效，即将自动打开浏览器，请扫码登录，登陆后会自动生成cookie文件')
        // await saveStorageState(accountFile)
        // await execPromise(`playwright codegen channels.weixin.qq.com --save-storage=${accountFile}`); // 生成cookie文件

        await douyinCookieGen(accountFile)
    }
    console.log('----after douyinSetup----')
    return true
}

xhsSetup = async (absoluteAccountFilePath, handle) => {

}

ksSetup = async (absoluteAccountFilePath, handle) => {

}

module.exports = { SocialAccountType, uniformSetup, getAuthFileLocation }
