/**
 * 侧栏兜底：若仍出现非 Classes 分组则隐藏（正常由 filter-doc-nav 在构建时处理）
 */
(function () {
    var HIDE = /^(Interfaces|Types|Utils|Modules|Type Aliases|Functions|Variables)$/i
    function hide() {
        var nav = document.querySelector('.site-menu .tsd-navigation')
        if (!nav) return
        nav.querySelectorAll('details').forEach(function (el) {
            var summary = el.querySelector(':scope > summary')
            if (!summary) return
            var label = (summary.textContent || '').replace(/\s+/g, ' ').trim()
            if (HIDE.test(label)) el.style.display = 'none'
        })
    }
    setTimeout(hide, 0)
    setTimeout(hide, 400)
})()
