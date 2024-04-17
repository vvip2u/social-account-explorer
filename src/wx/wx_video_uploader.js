const path = require('path');
const fs = require('fs');
const { DateTime } = require('luxon');
const { promisify } = require('util');
const { resolve } = require('path');
const { chromium } = require('playwright')
const readdir = promisify(fs.readdir);
const { SocialAccountType, uniformSetup, getAuthFileLocation} = require('../utils/auth_utils');
const { chromePath } = require('../utils/env_utils');

class WxVideoUploader {
    constructor( title, filePath, tags, publishDate, accountFile, category) {
        this.title = title;
        this.filePath = filePath;
        this.tags = tags;
        this.publishDate = publishDate;
        this.accountFile = accountFile;
        this.category = category
    }

    formatStrForShortTitle(originTitle) {
        // 定义允许的特殊字符
        const allowedSpecialChars = "《》“”:+?%°";

        // 移除不允许的特殊字符
        const filteredChars = Array.from(originTitle, char =>
            char.match(/[a-zA-Z0-9]/) || allowedSpecialChars.includes(char) ? char : char === ',' ? ' ' : ''
        );
        let formattedString = filteredChars.join('');

        // 调整字符串长度
        if (formattedString.length > 16) {
            // 截断字符串
            formattedString = formattedString.substring(0, 16);
        } else if (formattedString.length < 6) {
            // 使用空格来填充字符串
            formattedString += ' '.repeat(6 - formattedString.length);
        }

        return formattedString;
    }

    async handleUploadError(page) {
        console.log("视频出错了，重新上传中");
        await page.locator('div.media-status-content div.tag-inner:has-text("删除")').click();
        await page.waitForSelector('button[role="button"][name="删除"][exact]', { state: 'visible' });
        await page.click('button[role="button"][name="删除"][exact]');
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(this.filePath);
    }

    // 添加标签
    async addTitleTags(page) {
        await page.locator("div.input-editor").click();
        await page.keyboard.type(this.title);
        await page.keyboard.press("Enter");
        for (let index = 0; index < this.tags.length; index++) {
            const tag = this.tags[index];
            await page.keyboard.type("#" + tag);
            await page.keyboard.press("Space");
        }
        console.log(`成功添加hashtag: ${this.tags.length}`);
    }

    // 加入合集
    async addCollection(page) {
        const collectionElements = await page.$$('text="添加到合集" xpath=following-sibling::div .option-list-wrap > div');
        if (collectionElements.length > 1) {
            await page.click('text="添加到合集" xpath=following-sibling::div');
            await collectionElements[0].click();
        }
    }

    // 添加原创
    async addOriginal(page) {
        const originalCheckbox = await page.$('text="视频为原创"');
        if (originalCheckbox) {
            await originalCheckbox.check();
        }

        const agreeLabel = await page.locator('label:has-text("我已阅读并同意 《视频号原创声明使用条款》")').isVisible();
        if (agreeLabel) {
            await page.check('text="我已阅读并同意 《视频号原创声明使用条款》"');
            await page.click('button:has-text("声明原创")');
        }

        if (await page.$('text="声明原创"') && this.category) {
            const declareOriginalCheckbox = await page.$('div.declare-original-checkbox input.ant-checkbox-input');
            if (declareOriginalCheckbox && !(await declareOriginalCheckbox.isDisabled())) {
                await declareOriginalCheckbox.click();
                if (!(await page.isVisible('div.declare-original-dialog label.ant-checkbox-wrapper.ant-checkbox-wrapper-checked'))) {
                    await page.click('div.declare-original-dialog input.ant-checkbox-input:visible');
                }
            }

            if (await page.$('div.original-type-form > div.form-label:has-text("原创类型")')) {
                await page.click('div.form-content:visible'); // 下拉菜单
                await page.click(`div.form-content:visible ul.weui-desktop-dropdown__list li.weui-desktop-dropdown__list-ele:has-text("${this.category}")`);
                await page.waitForTimeout(1000);
                if (await page.$('button:has-text("声明原创")')) {
                    await page.click('button:has-text("声明原创")');
                }
            }
        }
    }

    async addShortTitle(page) {
        const shortTitleElement = await page.waitForSelector('text="短标题"', { exact: true });
        if (shortTitleElement) {
            // const inputElement = await shortTitleElement.$('xpath=following-sibling::div span input[type="text"]');
            const inputElement = await page.$('div.short-title-wrap input[type="text"]');
            if (inputElement) {
                console.log('找到了添加短标题的地点')
                const shortTitle = this.formatStrForShortTitle(this.title);
                await inputElement.fill(shortTitle);
            } else {
                console.log('没有找到添加短标题的地点')
            }
        }

    }

    async clickPublish(page) {
        while (true) {
            try {
                const publishButton = await page.waitForSelector('div.form-btns button:has-text("发表")');
                if (publishButton) {
                    await publishButton.click();
                }
                await page.waitForURL("https://channels.weixin.qq.com/platform/post/list", { timeout: 1500 });
                console.log("  [-]视频发布成功");
                break;
            } catch (error) {
                const currentUrl = page.url();
                if (currentUrl.includes("https://channels.weixin.qq.com/platform/post/list")) {
                    console.log("  [-]视频发布成功");
                    break;
                } else {
                    console.log(`  [-] Exception: ${error}`);
                    console.log("  [-] 视频正在发布中...");
                    await page.screenshot({ fullPage: true });
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }
    }

    async detectUploadStatus(page) {
        while (true) {
            try {

                // 发表按钮
                const publishButton = await page.$('button.weui-desktop-btn:has-text("发表")');
                const classAttribute = await publishButton.evaluate(button => button.getAttribute('class'));
                console.log(`classAttribute:   ${classAttribute}`)

                // 检查 class 属性是否包含特定的 class 名称
                if (classAttribute && classAttribute.includes('weui-desktop-btn_disabled')) {
                    console.log("未上传完成，正在上传视频中");
                    await page.waitForTimeout(2000);
                    if (await page.$('div.status-msg.error') && await page.$('div.media-status-content div.tag-inner:has-text("删除")')) {
                        console.log("  [-] 发现上传出错了...");
                        await this.handleUploadError(page);
                    }
                } else {
                    console.log("上传完成")
                    break;
                }
            } catch (error) {
                console.log("  [-] 正在上传视频中...", error);
                await page.waitForTimeout(2000);
            }
        }
    }

    // 返回年月日时分秒的列表
    formatTime(timestamp_in_seconds) {
        const date = new Date(timestamp_in_seconds * 1000); // 将秒级时间戳转换为毫秒级时间戳
        const year = String(date.getUTCFullYear()); // 获取年份
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // 获取月份，并在前面补0
        const day = String(date.getUTCDate()).padStart(2, '0'); // 获取日期，并在前面补0
        const hours = String(date.getUTCHours()).padStart(2, '0'); // 获取小时，并在前面补0
        const minutes = String(date.getUTCMinutes()).padStart(2, '0'); // 获取分钟，并在前面补0
        const seconds = String(date.getUTCSeconds()).padStart(2, '0'); // 获取秒，并在前面补0
        return [year, month, day, hours, minutes, seconds];
    }

    async setScheduleTimeTencent(page, publish_timestamp_in_seconds) {
        // 1. 选择定时发表选项：不定时/定时
        const labelElement = await page.locator("label").filter({ hasText: '定时' }).nth(1);
        await labelElement.click();

        // 2. 如果是定时发表，则选择日期和时间
        await page.click('input[placeholder="请选择发表时间"]');

        const yearMonthDayHoursMinSecs = this.formatTime(publish_timestamp_in_seconds);
        console.log(`发布日期时间是：    ${yearMonthDayHoursMinSecs}`)
        const year = yearMonthDayHoursMinSecs[0]; // 获取年份
        const month = yearMonthDayHoursMinSecs[1]; // 获取月份，并在前面补0
        const day = yearMonthDayHoursMinSecs[2]; // 获取日期，并在前面补0
        const hours = yearMonthDayHoursMinSecs[3]; // 获取小时，并在前面补0
        const minutes = yearMonthDayHoursMinSecs[4]; // 获取分钟，并在前面补0

        const currentMonth = month + "月";
        // 获取当前的月份
        const pageMonth = await page.innerText('span.weui-desktop-picker__panel__label:has-text("月")');

        // 检查当前月份是否与目标月份相同
        if (pageMonth !== currentMonth) {
            await page.click('button.weui-desktop-btn__icon__right');
        }

        // 获取页面元素
        const elements = await page.$$('table.weui-desktop-picker__table a');

        // 遍历元素并点击匹配的元素
        for (const element of elements) {
            if ((await element.evaluate(el => el.classList.contains('weui-desktop-picker__disabled')))) {
                continue;
            }
            const text = await element.innerText();
            console.log(`--------点击的日期:   ${text}`)
            if (text.trim() === day) {
                await element.click();
                break;
            }
        }

        // 输入小时部分（假设选择11小时）
        await page.click('input[placeholder="请选择时间"]');
        await page.keyboard.press("Control+KeyA");
        // await page.keyboard.type(String(publishDate.getHours()));
        await page.keyboard.type(hours);


        // 选择标题栏（令定时时间生效）
        await page.locator("div.input-editor").click();
    }


    // localExecutablePath,
    async upload(filePath, publishDate) {
        // const browser = await chromium.launch({ headless: false, executablePath: localExecutablePath });
        const browser = await chromium.launch({ headless: false, executablePath: chromePath })
        const accountFile = this.accountFile
        const context = await browser.newContext({ storageState: `${accountFile}` });
        const page = await context.newPage();
        await page.goto("https://channels.weixin.qq.com/platform/post/create");
        console.log(`[+]正在上传-------${this.title}.mp4`);
        await page.waitForURL("https://channels.weixin.qq.com/platform/post/create");
        const fileInput = page.locator('input[type="file"]');

        console.log(`准备上传文件：       ${filePath}`);

        await fileInput.setInputFiles(filePath);
        await this.addTitleTags(page, this.title, this.tags);
        await this.addCollection(page);
        await this.addOriginal(page, this.category);
        await this.detectUploadStatus(page);
        if (publishDate !== 0) {
            await this.setScheduleTimeTencent(page, publishDate);
        }
        await this.addShortTitle(page, this.title);
        await this.clickPublish(page);
        await context.storageState({ path: `${accountFile}` });
        console.log('  [-]cookie更新完毕！');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await context.close();
        await browser.close();
        console.log('[+]正在监控执行计划中.......');
    }

}

function generateScheduleTimeNextDay(totalVideos, videosPerDay, dailyTimes = null, timestamps = false, startDays = 0) {
    if (videosPerDay <= 0) {
        throw new Error("videosPerDay should be a positive integer");
    }

    if (!dailyTimes) {
        // Default times to publish videos if not provided
        dailyTimes = [6, 11, 14, 16, 22];
    }

    if (videosPerDay > dailyTimes.length) {
        throw new Error("videosPerDay should not exceed the length of dailyTimes");
    }

    // Generate timestamps
    const schedule = [];
    const currentTime = DateTime.local();

    for (let video = 0; video < totalVideos; video++) {
        const day = Math.floor(video / videosPerDay) + startDays + 1; // +1 to start from the next day
        const dailyVideoIndex = video % videosPerDay;

        // Calculate the time for the current video
        const hour = dailyTimes[dailyVideoIndex];
        const timestamp = currentTime.plus({ days: day, hours: hour - currentTime.hour }).startOf('hour');

        schedule.push(timestamp);
    }

    if (timestamps) {
        return schedule.map(time => time.toSeconds());
    }
    return schedule;
}

function getTitleAndHashtags(filename) {
    // 获取视频标题和 hashtag txt 文件名
    const txtFilename = filename.replace(".mp4", ".txt");

    // 读取 txt 文件
    const content = fs.readFileSync(txtFilename, { encoding: "utf-8" });

    // 获取标题和 hashtag
    const splitStr = content.trim().split("\n");
    const title = splitStr[0];
    const hashtags = splitStr[1].replace("#", "").split(" ");

    return [title, hashtags];
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
        const publishDatetimes = generateScheduleTimeNextDay(fileNum, 1, [16], true) + 1800;

        const cookieSetup = await uniformSetup(SocialAccountType.WX, true)
        const authFilePath = getAuthFileLocation(SocialAccountType.WX)

        console.log('---after auth----')
        const category = '科技'; // TencentZoneTypes.LIFESTYLE; // 标记原创需要否则不需要传

        for (let index = 0; index < files.length; index++) {
            const file = files[index];
            // const [title, tags] = getTitleAndHashtags(file);

            const title = 'AI红酒调配'
            const tags = ['AI', '红酒', '红酒大赏']
            // 打印视频文件名、标题和 hashtag
            console.log(`视频文件名：${file}`);
            console.log(`标题：${title}`);
            console.log(`Hashtag：${tags}`);

            const app = new WxVideoUploader(title, file, tags, publishDatetimes[index], authFilePath, category);
            console.log(app)

            // await app.upload(file, publishDatetimes[index]);

            await app.upload(file, 1713074400)
        }
    } catch (error) {
        console.error('Error:', error);
    }
})();
