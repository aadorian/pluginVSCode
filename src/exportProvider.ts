import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

export class ExportProvider {

    private readonly _extensionUri: vscode.Uri;

    constructor(context: vscode.ExtensionContext) {
        this._extensionUri = context.extensionUri;
    }

    /** Exporta el documento como HTML standalone con todos los assets embebidos */
    public async exportHtml(document: vscode.TextDocument): Promise<void> {
        const markdownText = document.getText();

        // Diálogo de guardado con URI default basada en el archivo actual
        const defaultUri = document.uri.with({
            path: document.uri.path.replace(/\.md$/i, '.html')
        });

        const saveUri = await vscode.window.showSaveDialog({
            defaultUri,
            filters: { 'Archivos HTML': ['html'] }
        });
        if (!saveUri) { return; }

        try {
            const html = this._buildStandaloneHtml(markdownText, false);
            fs.writeFileSync(saveUri.fsPath, html, 'utf-8');

            const action = await vscode.window.showInformationMessage(
                `Exportado a: ${saveUri.fsPath}`,
                'Abrir archivo'
            );
            if (action === 'Abrir archivo') {
                vscode.commands.executeCommand('vscode.open', saveUri);
            }
        } catch (err) {
            vscode.window.showErrorMessage(`Error al exportar: ${String(err)}`);
        }
    }

    /**
     * Exporta el documento a PDF abriendo el HTML en el navegador.
     * El usuario usa Ctrl+P → Guardar como PDF en el navegador.
     */
    public async exportPdf(document: vscode.TextDocument): Promise<void> {
        const markdownText = document.getText();

        try {
            const html = this._buildStandaloneHtml(markdownText, true);

            const tmpPath = path.join(
                os.tmpdir(),
                `markdown-visualizer-${Date.now()}.html`
            );
            fs.writeFileSync(tmpPath, html, 'utf-8');

            await vscode.env.openExternal(vscode.Uri.file(tmpPath));

            vscode.window.showInformationMessage(
                'HTML abierto en el navegador. Usa Ctrl+P → Guardar como PDF para exportar.'
            );
        } catch (err) {
            vscode.window.showErrorMessage(`Error al generar PDF: ${String(err)}`);
        }
    }

    /**
     * Genera un HTML completamente autónomo con todos los assets embebidos inline.
     * No requiere conexión a internet ni archivos externos.
     */
    private _buildStandaloneHtml(markdownText: string, forPrint: boolean): string {
        const mediaPath = path.join(this._extensionUri.fsPath, 'media');

        const markedJs     = fs.readFileSync(path.join(mediaPath, 'marked.min.js'), 'utf-8');
        const highlightJs  = fs.readFileSync(path.join(mediaPath, 'highlight.min.js'), 'utf-8');
        const highlightCss = fs.readFileSync(path.join(mediaPath, 'github.min.css'), 'utf-8');
        const previewCss   = fs.readFileSync(path.join(mediaPath, 'preview.css'), 'utf-8');

        // Escapa el markdown para embebido seguro en un template literal JS
        const escapedMarkdown = markdownText
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$/g, '\\$');

        const printStyles = forPrint ? `
        @media print {
            body { max-width: 100%; margin: 0; padding: 1cm; color: #000; background: #fff; }
            pre { border: 1px solid #ddd; }
        }` : '';

        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Exportado</title>
    <style>
${previewCss}
${highlightCss}
/* Reset VSCode CSS variables para HTML standalone */
body {
    --vscode-editor-foreground: #24292e;
    --vscode-editor-background: #ffffff;
    --vscode-textLink-foreground: #0366d6;
    --vscode-textCodeBlock-background: #f6f8fa;
    --vscode-textBlockQuote-border: #dfe2e5;
    --vscode-textBlockQuote-foreground: #6a737d;
    --vscode-panel-border: #e1e4e8;
    --vscode-editor-lineHighlightBackground: #f1f8ff;
}
${printStyles}
    </style>
</head>
<body>
    <div id="content"></div>
    <script>
${markedJs}
    </script>
    <script>
${highlightJs}
    </script>
    <script>
        (function() {
            marked.use({
                gfm: true,
                breaks: true
            });

            const renderer = new marked.Renderer();
            const originalCode = renderer.code.bind(renderer);
            renderer.code = function(code, language) {
                const lang = language || '';
                if (lang && hljs.getLanguage(lang)) {
                    try {
                        const highlighted = hljs.highlight(code, { language: lang }).value;
                        return '<pre><code class="hljs language-' + lang + '">' + highlighted + '</code></pre>';
                    } catch (e) { /* fallthrough */ }
                }
                return '<pre><code class="hljs">' + hljs.highlightAuto(code).value + '</code></pre>';
            };

            marked.use({ renderer });

            const raw = \`${escapedMarkdown}\`;
            document.getElementById('content').innerHTML = marked.parse(raw);
        })();
    </script>
</body>
</html>`;
    }
}
