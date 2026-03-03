// media/preview.js
// Corre en el contexto del webview (browser). NO tiene acceso al módulo de Node.js.
// Se comunica con la extensión usando acquireVsCodeApi() / postMessage.

(function () {
    'use strict';

    const vscode = acquireVsCodeApi();
    const container = document.getElementById('preview-container');

    // ── Configuración de marked.js ──────────────────────────────────────────

    const renderer = new marked.Renderer();

    // Resaltado de código con highlight.js
    renderer.code = function (code, language) {
        const lang = (language || '').split('{')[0].trim(); // quita fence info extras
        if (lang && hljs.getLanguage(lang)) {
            try {
                const highlighted = hljs.highlight(code, { language: lang }).value;
                return '<pre><code class="hljs language-' + lang + '">' + highlighted + '</code></pre>\n';
            } catch (_) { /* fallthrough */ }
        }
        const auto = hljs.highlightAuto(code);
        return '<pre><code class="hljs">' + auto.value + '</code></pre>\n';
    };

    marked.use({
        renderer,
        gfm: true,
        breaks: true
    });

    // ── Renderizado principal ───────────────────────────────────────────────

    function renderMarkdown(markdownText) {
        // Inyecta spans data-line antes de cada línea para scroll sync
        const lines = markdownText.split('\n');
        const annotated = lines.map(function (line, i) {
            return '<span data-line="' + i + '"></span>' + line;
        }).join('\n');

        container.innerHTML = marked.parse(annotated);

        // Aplica highlight.js a cualquier bloque de código no procesado
        container.querySelectorAll('pre code:not(.hljs)').forEach(function (block) {
            hljs.highlightElement(block);
        });
    }

    // ── Scroll sync: preview → editor ──────────────────────────────────────

    let scrollTimeout = null;

    window.addEventListener('scroll', function () {
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        scrollTimeout = setTimeout(function () {
            const spans = Array.from(container.querySelectorAll('[data-line]'));
            const viewportTop = window.scrollY + 10; // pequeño offset

            let closestLine = 0;
            for (let i = 0; i < spans.length; i++) {
                const span = spans[i];
                if (span.offsetTop >= viewportTop) {
                    const lineAttr = span.getAttribute('data-line');
                    closestLine = lineAttr ? parseInt(lineAttr, 10) : 0;
                    break;
                }
            }

            vscode.postMessage({ command: 'scrolled', line: closestLine });
        }, 100);
    });

    // ── Scroll sync: editor → preview ──────────────────────────────────────

    function scrollToLine(lineNumber) {
        const target = container.querySelector('[data-line="' + lineNumber + '"]');
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            // Busca el span más cercano disponible
            const spans = Array.from(container.querySelectorAll('[data-line]'));
            let closest = null;
            let closestDiff = Infinity;
            for (let i = 0; i < spans.length; i++) {
                const attr = spans[i].getAttribute('data-line');
                const n = attr ? parseInt(attr, 10) : 0;
                const diff = Math.abs(n - lineNumber);
                if (diff < closestDiff) {
                    closestDiff = diff;
                    closest = spans[i];
                }
            }
            if (closest) {
                closest.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    }

    // ── Mensajes desde la extensión ─────────────────────────────────────────

    window.addEventListener('message', function (event) {
        const message = event.data;
        switch (message.command) {
            case 'update':
                renderMarkdown(message.content);
                break;
            case 'scrollToLine':
                scrollToLine(message.line);
                break;
        }
    });

})();
