const fs = require('fs').promises;
const path = require('path');

ensureDirExists = (dirPath) => {
    console.log(`dirPath:  ${dirPath}`)
    const dirs = dirPath.split(path.sep);

    console.log(dirs)
    let currentDir = '';

    for (const dir of dirs) {
        console.log(`dir:  ${dir}`)
        currentDir = path.join(currentDir, dir);
        console.log(currentDir)

        // 判断当前路径是否存在
        try {
            fs.accessSync(currentDir, fs.constants.F_OK);
        } catch (err) {
            // 如果不存在，则创建该路径
            try {
                fs.mkdirSync(currentDir);
                console.log(`已创建目录：${currentDir}`);
            } catch (err) {
                // console.error(`创建目录时发生错误：${currentDir}`, err);
                return;
            }
        }
    }

    console.log('所有路径都已创建或已存在！');
}

writeFileAsync = async (absoluteFilePath, content) => {
    const folderPath = path.dirname(absoluteFilePath);

    console.log(`folderPath:  ${folderPath}`)
    ensureDirExists(folderPath)
    fs.mkdir(folderPath, (err) => {
        if (err) {
            console.error('创建文件夹时发生错误：', err);
            return;
        }
        console.log('文件夹已成功创建！');
    });

    try {
        await fs.writeFile(absoluteFilePath, content);
        console.log('文件已成功写入！');
    } catch (err) {
        console.error('写入文件时发生错误：', err);
    }
}

getAbsolutePath = (relativePath, baseDir = null) => {
    // Convert the relative path to an absolute path
    return path.join(__dirname, baseDir, relativePath);
}

fileExists = (filePath) => {
    try {
        // 判断文件是否存在
        fs.accessSync(filePath, fs.constants.F_OK);
        return true;
    } catch (err) {
        return false;
    }
}


module.exports = { writeFileAsync, getAbsolutePath, fileExists }
