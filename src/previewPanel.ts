import * as vscode from 'vscode';

export class MarkdownPreviewPanel {

    private static currentPanel: MarkdownPreviewPanel | undefined;
    // Flag para evitar loops de scroll sync
    private static _ignoreScrollEvent = false;

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Genera el HTML shell una sola vez
        this._panel.webview.html = this._buildHtmlShell();

        // Limpia el panel cuando el usuario lo cierra
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Recibe mensajes del webview (scroll sync del webview → editor)
        this._panel.webview.onDidReceiveMessage(
            (message: { command: string; line?: number }) => {
                if (message.command === 'scrolled' && !MarkdownPreviewPanel._ignoreScrollEvent) {
                    this._syncEditorScroll(message.line ?? 0);
                }
            },
            null,
            this._disposables
        );
    }

    // ── API pública estática ──────────────────────────────────────────────────

    public static createOrShow(context: vscode.ExtensionContext): void {
        // Si el panel ya existe, solo mostrarlo
        if (MarkdownPreviewPanel.currentPanel) {
            MarkdownPreviewPanel.currentPanel._panel.reveal(vscode.ViewColumn.Beside);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'markdownVisualizer',
            'Markdown Preview',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(context.extensionUri, 'media')
                ],
                retainContextWhenHidden: true
            }
        );

        MarkdownPreviewPanel.currentPanel = new MarkdownPreviewPanel(
            panel,
            context.extensionUri
        );

        // Carga el contenido actual inmediatamente
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            MarkdownPreviewPanel.currentPanel._postContent(editor.document.getText());
        }
    }

    /** Envía nuevo contenido markdown al webview para re-renderizar */
    public static update(markdownText: string): void {
        if (MarkdownPreviewPanel.currentPanel) {
            MarkdownPreviewPanel.currentPanel._postContent(markdownText);
        }
    }

    /** Scroll del editor → preview */
    public static scrollToLine(line: number): void {
        if (!MarkdownPreviewPanel.currentPanel) { return; }

        const config = vscode.workspace.getConfiguration('markdownVisualizer');
        if (!config.get<boolean>('scrollSync', true)) { return; }

        // Activa el flag para ignorar el evento de scroll que provoque el webview
        MarkdownPreviewPanel._ignoreScrollEvent = true;
        setTimeout(() => { MarkdownPreviewPanel._ignoreScrollEvent = false; }, 300);

        MarkdownPreviewPanel.currentPanel._panel.webview.postMessage({
            command: 'scrollToLine',
            line
        });
    }

    // ── Métodos privados ──────────────────────────────────────────────────────

    /** Envía el texto markdown al webview; el JS cliente hace el render */
    private _postContent(markdownText: string): void {
        this._panel.webview.postMessage({
            command: 'update',
            content: markdownText
        });
    }

    /** Scroll del preview → editor */
    private _syncEditorScroll(line: number): void {
        const config = vscode.workspace.getConfiguration('markdownVisualizer');
        if (!config.get<boolean>('scrollSync', true)) { return; }

        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const position = new vscode.Position(line, 0);
            editor.revealRange(
                new vscode.Range(position, position),
                vscode.TextEditorRevealType.AtTop
            );
        }
    }

    /**
     * Construye el HTML estático del webview una sola vez.
     * El contenido se inyecta después via postMessage para evitar parpadeo.
     */
    private _buildHtmlShell(): string {
        const webview = this._panel.webview;

        const markedUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'marked.min.js')
        );
        const highlightJsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'highlight.min.js')
        );
        const highlightCssUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'github.min.css')
        );
        const previewCssUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'preview.css')
        );
        const previewJsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'preview.js')
        );

        const nonce = this._getNonce();

        return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none';
                   img-src ${webview.cspSource} https: data:;
                   style-src ${webview.cspSource} 'unsafe-inline';
                   script-src 'nonce-${nonce}';">
    <link rel="stylesheet" href="${highlightCssUri}">
    <link rel="stylesheet" href="${previewCssUri}">
    <title>Markdown Preview</title>
</head>
<body>
    <div id="preview-container"></div>

    <script nonce="${nonce}" src="${markedUri}"></script>
    <script nonce="${nonce}" src="${highlightJsUri}"></script>
    <script nonce="${nonce}" src="${previewJsUri}"></script>
</body>
</html>`;
    }

    private _getNonce(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let nonce = '';
        for (let i = 0; i < 32; i++) {
            nonce += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return nonce;
    }

    public dispose(): void {
        MarkdownPreviewPanel.currentPanel = undefined;
        this._panel.dispose();
        this._disposables.forEach(d => d.dispose());
        this._disposables = [];
    }
}
