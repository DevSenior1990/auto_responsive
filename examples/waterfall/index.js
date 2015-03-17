KISSY.add('mods/album', function (S, D, E, Anim, $, IO, Lazy) {
    var letIE9 = S.UA.ie <= 9, ltIE9 = S.UA.ie < 9;
    var tpl = D.html('#tpl'),
            count = 0;

    var JI_ALBUM_PANEL = '#J_AlbumPanel',
            JC_CONTAINER = '.j_Container',
            JC_ALBUM = '.album',
            JC_AL_MORE = '.j_ALMore',
            JC_AP_MORE = '.j_APMore',
            C_HAS_ALBUMS = 'hasAlbums',
            C_ALBUM_LAST_CHILD = 'album-last-child',
            C_ALBUM_PANEL_COLLAPSE = 'aP-collapse',
            C_ALBUM_PANEL_EXPAND = 'aP-expand',

            dAlbumPanel, dContainer,

            auto, loader, openMarquee = parseInt((location.search.match(/\bmarquee=(\d)\b/i) || [1,1])[1]);

    // 跑马灯效果组件
    function marquee(items, inc, speed, execAsap /* execute at start of the detection period */) {
        D.css(items, {opacity: 0});

        var timer = execAsap ? 0 : inc,
                fn = function(item){
                    setTimeout(function () {
                        S.Anim(item, {opacity: 1}, speed / 1000).run();
                    }, timer);
                    timer += inc;
                };
        for (var i = 0, len = items.length; i < len; i++) {
            fn(items[i]);
        }
    }

    function Album() {
        if (!(this instanceof Album)) {
            return new Album();
        }

        this._init();
    }

    Album.prototype = {
        _init: function () {
            if (!dAlbumPanel || !dContainer) return;

            !ltIE9 && new Anim(JC_AP_MORE, {opacity: 1}).run();

            this._loadData();
            this._bindEvents();
        },
        _loadData: function () {
            var self = this;
            S.use('gallery/autoResponsive/1.3/base, gallery/autoResponsive/1.3/plugin/loader', function (S, AutoResponsive, Loader) {
                loader = self._createLoader(Loader);
                auto = self._createAuto(AutoResponsive);
                auto.init();
                loader.load(); // load数据一定要在auto初始化之后进行，否则loader没有存入auto的引用
            });
        },
        _createLoader: function (Loader) {
            var self = this,
                    times = 0,
                    loadStopFn = function () {
                        if (times > 7) {
                            loader.stop();
                            D.removeClass(dContainer, C_HAS_ALBUMS);
                        }

                    },
                    callback = function(){
                        self._lazy();
                        loadStopFn();
                    };

            return new Loader({
                diff: 300,
                mod: 'manual',
                qpt: 7,
                load: function (success, end) {
                    ltIE9 && D.removeClass(JC_ALBUM, C_ALBUM_LAST_CHILD);

                    IO({
                        url: 'data.json',
                        dataType: "json",
                        success: function (d) {
                            if (d['success'] !== 1) {
                                end();
                                return;
                            }

                            var items = [];
                            S.each(d['data'], function (item) {
                                item.idx = ++count;
                                items.push(D.create(S.substitute(tpl, item)));
                            });

                            success(items, callback);
                            openMarquee && marquee(items, 100, 10, 1);

                        },
                        complete: function () {
                            ++times == 1 && ltIE9 && D.addClass(D.query(JC_ALBUM).pop(), C_ALBUM_LAST_CHILD);
                        }
                    });
                }
            });
        },
        _createAuto: function (AutoResponsive) {
            return new AutoResponsive({
                container: JC_CONTAINER,
                selector: JC_ALBUM,
//                closeAnim: true,
                gridWidth: 100, // 合适地调大这个值，有助于性能提高
                resizeFrequency: 150,
                duration: 0.6,
                autoInit: false,
                unitMargin: {
                    x: 10,
                    y: 10
                },
                plugins: [loader],
                suspend: true,
                whensRecountUnitWH: ['resize']
            });
        },
        _bindEvents: function () {
            // 产品图load
            E.delegate(dAlbumPanel, 'mouseenter', JC_ALBUM, function (e) {
                var dAlbum = e.currentTarget;
                if (dAlbum._hasContImg)
                    return;
                var dContImg = D.get('.j_ACont', dAlbum);
                dContImg.src = D.attr(dContImg, 'data-src');
                D.removeClass(dContImg, 'j_ACont');
                D.removeAttr(dContImg, 'data-src');
                dAlbum._hasContImg = 1;
            });

            // 图片切换
            letIE9 && E.delegate(dAlbumPanel, 'mouseenter mouseleave', JC_ALBUM, function (e) {
                var dAlbum = e.currentTarget,
                        dImgs = D.query('img', dAlbum);

                dAlbum._fadeIn && dAlbum._fadeIn.stop();
                dAlbum._fadeOut && dAlbum._fadeOut.stop();

                dAlbum._fadeIn = new Anim(dImgs[e.type == 'mouseenter' ? 'shift' : 'pop'](), {opacity: 1}, .3, 'easeIn');
                dAlbum._fadeIn.run();
                dAlbum._fadeOut = new Anim(dImgs[0], {opacity: 0}, .3, 'easeOut');
                dAlbum._fadeOut.run();

            });

            // 加载更多
            D.addClass(JI_ALBUM_PANEL + ' div', C_HAS_ALBUMS);
            E.delegate(dAlbumPanel, 'click', JC_AL_MORE, function (e) {
                e.halt();
                D.removeClass(JI_ALBUM_PANEL + ' div', C_HAS_ALBUMS);

                loader.changeCfg({mod: 'auto'}); // 改变为auto模式后初始便会有一次load检测

            });

            var a = [C_ALBUM_PANEL_COLLAPSE, C_ALBUM_PANEL_EXPAND],
                    b = ['收起专辑<i></i>', '展开更多专辑<i></i>'],
                    c = 0;
            E.on(JC_AP_MORE, 'click', function (e) {
                D.replaceClass(this, a[0], a[1]);
                a.reverse();

                var containerH = D.outerHeight(dContainer),
                        panelH = D.outerHeight(dAlbumPanel),
                        height = c == 0 ? containerH + 60 : 350;

                c !== 0 && panelH > 1010 && D.css(dAlbumPanel, 'height', '1010px'); // 这层的目的是为了控制动画elasticOut函数的尾部波动

                new Anim(dAlbumPanel, {height: height}, .2, 'easeOutStrong', function () { //elasticOut
                    D.toggleClass(dAlbumPanel, 'fixedH');
                    c == 0 && D.css(dAlbumPanel, 'height', ''); // 高度释放开
                    c = ++c % 2;

                }).run();

                D.html(this, b[0]);
                b.reverse();
            });

        },
        _lazy: function(){
            setTimeout(function () {
                Lazy(dAlbumPanel, {diff: 100}); // 需要一些延迟时间来等首屏新加入的一些单元layout完成（否则首屏图片不会展示）
            }, 100); // AutoResponsive 1.2.0会校正内置自定义事件，到时候可以摒弃setTimeout使用afterArrange事件绑定进行延迟加载实例化会更加准确
        }
    };

    return {
        init: function () {
            this._initNodes();
            new Album();
        },
        _initNodes: function () {
            dAlbumPanel = D.get(JI_ALBUM_PANEL);
            dContainer = D.get(JC_CONTAINER, dAlbumPanel);
        }
    }
}, {
    requires: ['dom', 'event', 'anim', 'node', 'ajax', 'datalazyload']
});

KISSY.use('mods/album', function (S, m) {
  m.init();
});
