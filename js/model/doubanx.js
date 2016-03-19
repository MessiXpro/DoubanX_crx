'use strict';

class DoubanX {
    constructor(options) {
        this.name = options.name || '';     // 名称
        this.type = options.type || '';     // 类型 movie/book
        this.force = options.force || 0;    // 是否强制更新 0否 1是
        this.time = null;   // 缓存的时间戳
        this.expire = 5;    // 缓存过期时间5天，0表示不缓存
        this.csrfKey = 'i@wange.im';    // 防止CSRF的private key
        this.api = 'http://doubanx.wange.im/get_rate'; // 接口地址
        // localStorage.clear();
    }

    static getToken(key) {
        const timestamp = Date.parse(new Date);
        const l = key.length;
        let i = 0;
        let hash = 5381;
        for(; i < l; ++i) {
        	hash += (hash << 5) + key.charCodeAt(i);
        }

        return hash = hash & 0x7fffffff;
    };

    /**
     * 格式化标题
     */
    static formatName(name) {
        return $.trim(name)
                .replace('《', '').replace('》', '')  // 去掉书名号
                .replace(/(.*)?(第.*?季)/i, "$1 $2")  // 美剧名格式化
                .replace(/(\(.*\))/i, "");           // 去掉括号
    };

    /**
     * 格式化数据
     */
    static formatData(data) {
        data.rate = JSON.parse(data.rate);
        data.time = Date.parse(data.time);

        return data;
    }

    /**
     * 实时获取豆瓣信息
     */
    getRateOnline(callback) {
        const that = this;
        const name = that.name;
        const type = that.type;
        const force = that.force;

        $.ajax({
            url: that.api,
            data: {
                name: DoubanX.formatName(name),
                type: type,
                force: force,
                token: DoubanX.getToken(that.csrfKey)
            },
            type: 'post',
            dataType: 'json',
            success: (data) => {
                if (data.ret === 0) {
                    callback(DoubanX.formatData(data.data));
                    localStorage.setItem(name, JSON.stringify(data.data));
                }
            }
        });
    }

    /**
     * 从本地缓存中获取豆瓣信息
     */
    getRateOffline(callback) {
        let output = false;
        if (localStorage.getItem(this.name)) {
            const jsonObj = JSON.parse(localStorage.getItem(this.name));
            callback(
                jsonObj
            );
            this.time = jsonObj.time;
            output = true;
        }

        return output;
    }

    /**
     * 获取豆瓣信息
     */
    getRate(callback) {
        const that = this;
        const name = that.name;
        const inCache = that.getRateOffline(callback || that.defaultCallback);
        if (!inCache) {
            that.getRateOnline(callback || that.defaultCallback);
        }

        // 超过缓存时间重新拉取豆瓣最新数据
        if (that.time) {
            const now = Date.parse(new Date);
            const gap = (now - that.time) / 1000 / 60 / 60 / 24;
            if (gap >= that.expire) {
                that.force = 1;
                that.getRateOnline(callback || that.defaultCallback);
            }
        }
    }

    /**
     * 默认回调方法
     */
    defaultCallback(data) {
        $('body').append(new Template(data).typeA());
    }
}
