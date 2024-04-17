# Social-Account-Explorer
=======================
Social Platform Auto-Upload Tools


## 1. Introduction
This project is a social platform auto-upload tools, which can help you to upload your video to social platform automatically.

## 2. Platform Support
- Chinese Media Social Platform
  - [x] 抖音
  - [x] 微信视频号
  - [ ] 小红书
  - [ ] B站
  - [ ] 快手
- Global Media Social Platform
  - [ ] tiktok
  - [ ] youtube

## 3. How to use
### 3.1 Requisite
- Node.js
### 3.1 Install
```shell
cd /path/to/social-account-explorer
npm install
```

### 3.2 Usage
- 抖音
```shell
node src/douyin/douyin_uploader.js
```

- 微信视频号
```shell
node src/douyin/douyin_uploader.js
```

## File Structure
- Directory【config】: 

`auth.json` file is stored under `config/douyin` and `config/wx` directory

- Directory【data】:

all video files which need to be uploaded are stored under `data/videos` directory

- Directory【src】:

main code files are stored under `src` directory
