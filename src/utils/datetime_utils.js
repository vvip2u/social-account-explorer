const {DateTime} = require("luxon");
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

generateScheduleTimeNextDay = (totalVideos, videosPerDay, dailyTimes = null, timestamps = false, startDays = 0) => {
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


generateTime = (totalVideos, videosPerDay, dailyTimes = null, timestamps = false, startDays = 0) => {
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

getCurrentTimestampInSeconds = () => {
    // const currentTimestampInSeconds = Math.floor(Date.now() / 1000);
    // console.log(currentTimestampInSeconds);
    return Math.floor(DateTime.local().toSeconds());
}


module.exports = { sleep, getCurrentTimestampInSeconds }
