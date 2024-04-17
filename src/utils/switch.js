// 枚举参数名称
const { SocialAccountType } = require('./auth_utils')


const WxParamNames = {
    TITLE: 0,
    VIDEO_UPLOAD: 1,
    TITLE_TAGS: 2,
    PARAM_4: 3,
    PARAM_5: 4,
    PARAM_6: 5,
    PARAM_7: 6,
    PARAM_8: 7,
    PARAM_9: 8,
    PARAM_10: 9,
    PARAM_11: 10,
    PARAM_12: 11,
    PARAM_13: 12,
    PARAM_14: 13,
    PARAM_15: 14,
    PARAM_16: 15
};


class ParamsSwitch {
    constructor(socialAccountType) {
        console.log(socialAccountType)
        this.socialAccountType = socialAccountType;
        this.params = 0b0000000000000000;
        switch (socialAccountType) {
            case SocialAccountType.WX:
                console.log('----')
                this.params = 0b0000000000000001;
                this.paramNames = WxParamNames
                break
            case SocialAccountType.DOUYIN:
                this.params = 0b0000000011111111;
                this.paramNames = WxParamNames
                break
            case SocialAccountType.XHS:
                this.params = 0b0000000011111111;
                this.paramNames = WxParamNames
                break
            case SocialAccountType.KS:
                this.params = 0b0000000011111111;
                this.paramNames = WxParamNames
                break
        }
    }

    // 设置参数开关状态
    setParams = (position, state) => {
        if (state === 1) {
            // 将指定位置的参数开启
            this.params |= (1 << position);
        } else if (state === 0) {
            // 将指定位置的参数关闭
            this.params &= ~(1 << position);
        }
        return this.params;
    }

    // 检查所有参数是否都已经开启
    allParamsEnabled = () => {
        return (this.params & 0b1111111111111111) === 0b1111111111111111;
    }

    // 获取参数名称
    getParamName = (position) => {
        for (const name in this.paramNames) {
            if (this.paramNames[name] === position) {
                return name;
            }
        }
        return null;
    }

    print = () => {
        console.log(this.paramNames)
        for (const name in this.paramNames) {
            const position = this.paramNames[name];
            const enabled = (this.params & (1 << position)) ? '开启' : '关闭';
            console.log(`${name}: ${enabled}`);
        }
    }

}



// 示例用法
let params = 0b0000000000000000;

paramSwitch = new ParamsSwitch(SocialAccountType.WX)

// 设置第1、3、5、7、9、11、13、15位的参数为开启状态
// paramSwitch.setParams(ParamNames.PARAM_1, 1);
// paramSwitch.setParams(ParamNames.PARAM_3, 1);
// paramSwitch.setParams(ParamNames.PARAM_5, 1);
// paramSwitch.setParams(ParamNames.PARAM_7, 1);
// paramSwitch.setParams(ParamNames.PARAM_9, 1);
// paramSwitch.setParams(ParamNames.PARAM_11, 1);
// paramSwitch.setParams(ParamNames.PARAM_13, 1);
// paramSwitch.setParams(ParamNames.PARAM_15, 1);

console.log("参数开关状态:");
paramSwitch.print()

// 检查是否所有参数都已经开启
if (paramSwitch.allParamsEnabled()) {
    console.log('所有参数都已经开启');
} else {
    console.log('有参数未开启');
}
