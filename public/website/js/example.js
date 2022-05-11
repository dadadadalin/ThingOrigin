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
            ],
        },
    ],
};

var vm = new Vue({
    el: "#menu",
    data: data,
    methods: {
        jump(title, url) {
            document.title = "TO - " + title;
            const frame = document.getElementById("iframe");
            frame.src = url;
        },
    },
});
