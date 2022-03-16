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
    ],
};

var vm = new Vue({
    el: "#menu",
    data: data,
    methods: {
        jump(url) {
            const frame = document.getElementById("iframe");
            frame.src = url;
        },
    },
});
