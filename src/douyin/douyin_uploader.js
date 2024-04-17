const path = require('path');
const fs = require('fs');
const { DateTime } = require('luxon');
const { promisify } = require('util');
const { resolve } = require('path');
const { chromium } = require('playwright')
const readdir = promisify(fs.readdir);
const { uniformSetup, SocialAccountType, getAuthFileLocation} = require("../utils/auth_utils");
const { chromePath } = require('../utils/env_utils');
const { getCurrentTimestampInSeconds } = require('../utils/datetime_utils');
const { sleep } = require('../utils/datetime_utils');

class DouyinUploader {
    constructor(title, filePath, tags, publishDate) {
        this.title = title;
        this.filePath = filePath;
        this.tags = tags;
        this.publishDate = publishDate;
        this.dateFormat = "%Y年%m月%d日 %H:%M";
    }

    async setScheduleTime(page, publishDate) {
        // 选择包含特定文本内容的 label 元素
        const labelElement = await page.$("label.radio--4Gpx6:has-text('定时发布')");
        // 在选中的 label 元素下点击 checkbox
        await labelElement.click();
        await page.waitForTimeout(1000); // Node.js equivalent of asyncio.sleep(1)

        const publishDateHour = publishDate.toLocaleString('en-US', {
            timeZone: 'UTC',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        await page.waitForTimeout(1000); // Node.js equivalent of asyncio.sleep(1)
        await page.click('.semi-input[placeholder="日期和时间"]');
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await page.keyboard.type(publishDateHour);
        await page.keyboard.press('Enter');

        await page.waitForTimeout(1000); // Node.js equivalent of asyncio.sleep(1)
    }

    async handleUploadError(page) {
        console.log("视频出错了，重新上传中");
        const inputFileElement = await page.$('div.progress-div [class^="upload-btn-input"]');
        console.log(`---inputFileElement:         ${inputFileElement}`)
        await inputFileElement.setInputFiles(this.filePath); // Assuming this.filePath is defined elsewhere
    }

    async upload(filePath, publishDate) {
        const authFile = getAuthFileLocation(SocialAccountType.DOUYIN);

        const browser = await chromium.launch({ headless: false, executablePath: chromePath });
        const context = await browser.newContext({ storageState: authFile });
        const page = await context.newPage();
        await page.goto("https://creator.douyin.com/creator-micro/content/upload");
        console.log(`[+]正在上传-------${this.title}.mp4`);
        console.log('[-] 正在打开主页...');

        await page.waitForURL("https://creator.douyin.com/creator-micro/content/upload");

        // 放弃按钮
        const ignorePreviousButton = await page.$('span:text("放弃")')
        if (ignorePreviousButton) {
            ignorePreviousButton.click()
        }

        await page.setInputFiles('.upload-btn--9eZLd', this.filePath);

        while (true) {
            try {
                await page.waitForURL("https://creator.douyin.com/creator-micro/content/publish?enter_from=publish_page");
                break;
            } catch {
                console.log("  [-] 正在等待进入视频发布页面...");
                await sleep(100);
            }
        }

        await sleep(1000);
        console.log("  [-] 正在填充标题和话题...");
        // const titleContainer = await page.$('text=作品标题 >> ../.. >> input');
        // if (titleContainer) {
        //     await titleContainer.fill(this.title.substring(0, 30));
        // } else {
        //     await page.$('.notranslate').click();
        //     console.log("clear existing title");
        //     await page.keyboard.press("Backspace");
        //     await page.keyboard.press("Control+KeyA");
        //     await page.keyboard.press("Delete");
        //     console.log("filling new  title");
        //     await page.keyboard.type(this.title);
        //     await page.keyboard.press("Enter");
        // }

        const titleInputElement = await page.$('input[placeholder*="作品标题"]');
        if (titleInputElement) {
            console.log('找到作品标题输入框')
            const placeholder = await titleInputElement.evaluate(node => node.getAttribute('placeholder'));
            console.log('包含【作品标题】的输入节点的 placeholder 属性值为:', placeholder);
            await titleInputElement.fill(this.title.substring(0, 30));
        } else {
            console.log('没有找到作品标题输入框')
        }

        const cssSelector = ".zone-container";
        for (let index = 0; index < this.tags.length; index++) {
            console.log("正在添加第%s个话题", index + 1);
            await page.type(cssSelector, "#" + this.tags[index]);
            await page.press(cssSelector, "Space");
        }

        let uploadDuration = 0
        while (true) {
            try {
                // const reuploadLabelCount = await page.$$('div >> label:has-text("重新上传")').length;
                // const div = await page.$x('//div[contains(text(), "重新上传")]');
                const reUploadButton = await page.$$('div:text("重新上传")')
                console.log('----div.length:   ', reUploadButton.length)
                if (reUploadButton.length > 0) {
                    console.log("  [-]视频上传完毕");
                    break;
                } else {
                    if (uploadDuration > 300) {
                        if (await page.$$('.progress-div > div > div:has-text("上传失败")')) {
                            console.log("  [-] 发现上传出错了...");
                            await this.handleUploadError(page);
                        }
                    } else {
                        console.log("  [-] 正在上传视频中...");
                        await sleep(2000);
                    }
                }
            } catch(e) {
                console.log("  [-] 正在上传视频中...", e);
                await sleep(2000);
            }
        }


        await page.click('div.semi-select span:has-text("输入地理位置")');
        await sleep(1);
        console.log("clear existing location");
        await page.keyboard.press("Backspace");
        await page.keyboard.press("Control+KeyA");
        await page.keyboard.press("Delete");
        await page.keyboard.type("上海市");
        await sleep(50);
        await page.click('div[role="listbox"] [role="option"]')

        const thirdPartElement = '[class^="info"] > [class^="first-part"] div div.semi-switch';
        if (await page.$(thirdPartElement)) {
            if (!await page.$eval(thirdPartElement, div => div.classList.contains('semi-switch-checked'))) {
                await page.click(`${thirdPartElement} input.semi-switch-native-control`);
            }
        }

        if (this.publishDate !== 0) {
            await this.setScheduleTime(page, this.publishDate);
        }

        while (true) {
            // try {
            //     // const publishButton = await page.$('button[role="button"][name="发布"][aria-label="发布"]');
            //     const publishButton = await page.$$('button[role="button"][name="发布"][aria-label="发布"]');
            //     if (publishButton) {
            //         console.log('找到【发布】按钮')
            //         await publishButton.click();
            //     } else {
            //         console.log('找到【发布】按钮')
            //     }
            //     await page.waitForURL("https://creator.douyin.com/creator-micro/content/manage", { timeout: 1500 });
            //     console.log("  [-]视频发布成功");
            //     break;
            // } catch(e) {
            //     console.log("  [-] 视频正在发布中...", e);
            //     await page.screenshot({ fullPage: true });
            //     await sleep(0.5);
            // }
            const submitBtns = await page.getByText('发布', { exact: true })
                // page.getByRole('button', { name: '发布' })
            if (submitBtns) {
                console.log(`找到【发布】按钮, count:   `)
                console.log(submitBtns)
                await submitBtns.click()
                // await submitBtns[0].click()
            } else {
                console.log('没有找到【发布】按钮')
                await sleep(1000)
            }
        }

        await sleep(60000);

        await context.storageState({ path: authFile });
        console.log('  [-]cookie更新完毕！');
        await sleep(2);
        await context.close();
        await browser.close();
    }
}

(async () => {
    try {
        videoDir = path.resolve(__dirname, '../../data/videos');
        let files = await readdir(videoDir);
        // 过滤出视频文件
        const videoFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.mp4', '.mov', '.avi', '.mkv'].includes(ext);
        });

        // 构建视频文件的绝对路径列表
        files = videoFiles.map(file => path.join(videoDir, file));
        console.log(files)

        const fileNum = files.length;
        // const publishDatetimes = generateScheduleTimeNextDay(fileNum, 1, [16], true) + 1800;

        const cookieSetup = await uniformSetup(SocialAccountType.DOUYIN, true)

        console.log('---after auth----')

        for (let index = 0; index < fileNum; index++) {
            const file = files[index];
            // const [title, tags] = getTitleAndHashtags(file);

            const title = 'AI红酒调配'
            const tags = ['AI', '红酒', '红酒大赏']
            // 打印视频文件名、标题和 hashtag
            console.log(`视频文件名：${file}`);
            console.log(`标题：${title}`);
            console.log(`Hashtag：${tags}`);

            let currentTimestamp = getCurrentTimestampInSeconds()

            currentTimestamp += 1800;

            const app = new DouyinUploader(title, file, tags, currentTimestamp);
            console.log(app)

            // await app.upload(file, publishDatetimes[index]);

            await app.upload(file, currentTimestamp)
        }
    } catch (error) {
        console.error('Error:', error);
    }
})();
