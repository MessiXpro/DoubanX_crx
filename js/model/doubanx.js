class DoubanX {
    constructor(options) {
        this.name = options.name || '';     // 名称
        this.type = options.type || '';     // 类型 movie/book
        this.force = options.force || 0;    // 是否强制更新 0否 1是
        this.time = null;   // 缓存的时间戳
        this.expire = 5;    // 缓存过期时间5天，0表示不缓存
        this.api = {
            getRate: '//doubanx.wange.im/get_rate',
            getReview: '//doubanx.wange.im/get_review'
        };
        // localStorage.clear();
    }

    /**
     * 格式化标题
     */
    static formatName(name) {
        const num = ['一', '二', '三', '四', '五',
                     '六', '七', '八', '九', '十'];
        return name.trim()
                .replace('《', '').replace('》', '')  // 去掉书名号
                .replace(/(.*)?(第.*?季)/i, "$1 $2")  // 美剧名格式化
                .replace(/(.*)?第(\d*)?季/i, ($1, $2, $3) => {
                    return $2 + '第' + num[$3-1] + '季';
                })                                   // 美剧名格式化
                .replace(/(\(.*\))/i, "")            // 去掉英文括号
                .replace(/(.*)?(（.*）)$/i, "$1")     // 去掉中文括号里的内容
                .replace(/(.*)?(第.*?集)/i, "$1");    // 电视剧名格式化
    }

    /**
     * 格式化数据
     */
    static formatData(data) {
        data.rate = JSON.parse(data.rate);
        data.time = Date.parse(data.time);

        return data;
    }

    /**
     * 实时获取
     */
    getOnline(key, url, params, callback) {
        const that = this;
        const xhttp = new XMLHttpRequest();
        xhttp.open('POST', url, true);
        xhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
        xhttp.onreadystatechange = () => {
            if(xhttp.readyState == 4 && xhttp.status == 200) {
                const data = JSON.parse(xhttp.responseText);
                if (data.ret === 0) {
                    callback(data);
                    localStorage.setItem(key, JSON.stringify(data.data));
                }
            }
        };
        xhttp.send(params);
    }

    /**
     * 从本地缓存中获取
     */
    getOffline(key, callback) {
        let output = false;
        if (localStorage.getItem(key)) {
            const jsonObj = JSON.parse(localStorage.getItem(key));
            callback(jsonObj);
            this.time = jsonObj.time;
            output = true;
        }

        return output;
    }

    /**
     * 实时获取豆瓣信息
     */
    getRateOnline(callback) {
        const key = `${this.name}_${this.type}_rate`;
        const url = this.api.getRate;
        const params = `name=${DoubanX.formatName(this.name)}&type=${this.type}&force=${this.force}`;

        this.getOnline(key, url, params, (data) => {
            callback(DoubanX.formatData(data.data));
        });
    }

    /**
     * 从本地缓存中获取豆瓣信息
     */
    getRateOffline(callback) {
        const key = `${this.name}_${this.type}_rate`;
        return this.getOffline(key, (data) => {
            callback(data);
        });
    }

    /**
     * 获取豆瓣信息
     */
    getRate(callback) {
        const that = this;
        const name = that.name;
        // 优先读取缓存
        const inCache = that.getRateOffline((data) => {
            new Template(data).showRate();
            that.getReview(data, (review) => {
                new Template(Object.assign(
                    {}, {rate: data}, {review: review}
                )).showReview();
            });
        });

        // 没有缓存则实时获取
        if (!inCache) {
            that.getRateOnline((data) => {
                new Template(data).showRate();
                that.getReview(data, (review) => {
                    new Template(Object.assign(
                        {}, {rate: data}, {review: review}
                    )).showReview();
                });
            });
        }

        // 超过缓存时间重新拉取豆瓣最新数据
        if (that.time) {
            const now = Date.parse(new Date());
            const gap = (now - that.time) / 1000 / 60 / 60 / 24;
            if (gap >= that.expire) {
                that.force = 1;
                that.getRateOnline((data) => {
                    new Template(data).showRate();
                    that.getReview(data, (review) => {
                        new Template(Object.assign(
                            {}, {rate: data}, {review: review}
                        )).showReview();
                    });
                });
            }
        }
    }

    /**
     * 实时获取豆瓣评论
     */
    getReviewOnline(data, callback) {
        const key = `${this.name}_${this.type}_review`;
        const url = this.api.getReview;
        const params = `id=${data.id}`;

        this.getOnline(key, url, params, (data) => {
            callback(data.data);
        });
    }

    /**
     * 从本地缓存中获取豆瓣评论
     */
    getReviewOffline(callback) {
        const key = `${this.name}_${this.type}_review`;
        return this.getOffline(key, (data) => {
            callback(data);
        });
    }

    /**
     * 获取豆瓣评论
     */
    getReview(data, callback) {
        const that = this;
        // 优先读取缓存
        const inCache = that.getReviewOffline((review) => {
            callback(review);
        });

        // 没有缓存则实时获取
        if (!inCache) {
            that.getReviewOnline(data, (review) => {
                callback(review);
            });
        }

        // 超过缓存时间重新拉取豆瓣最新数据
        if (that.time) {
            const now = Date.parse(new Date());
            const gap = (now - that.time) / 1000 / 60 / 60 / 24;
            if (gap >= that.expire) {
                that.getReviewOnline(data, (review) => {
                    callback(review);
                });
            }
        }
    }
}
