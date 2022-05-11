var data = {
    menu: [
        {
            title: "开发指南",
            children: [
                {
                    title: "安装",
                    url: "./start/install.html",
                },
                {
                    title: "快速上手",
                    url: "./start/start.html",
                },
            ],
        },
        {
            title: "Examples",
            children: [
                {
                    title: "control",
                    children: [
                        {
                            title: "鼠标点击连线",
                            url: "./controls/mouseLine.html",
                        },
                    ],
                },
                {
                    title: "effect",
                    children: [
                        {
                            title: "剖切面_全局",
                            url: "./effect/clipGlobal.html",
                        },
                        {
                            title: "剖切面_单模型",
                            url: "./effect/clipGlobal.html",
                        },
                    ],
                },
            ],
        },
    ],
};

var vm = new Vue({
    el: "#menu",
    data: data,
    methods: {
        jump(title, url) {
            console.log(title, url);
            document.title = "TO - " + title;
            const frame = document.getElementById("iframe");
            frame.src = url;
        },
    },
});
