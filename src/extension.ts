import * as vscode from 'vscode';
import { MarkdownPreviewPanel } from './previewPanel';
import { TocProvider } from './tocProvider';
import { ExportProvider } from './exportProvider';

export function activate(context: vscode.ExtensionContext): void {

    // --- TOC Sidebar ---
    const tocProvider = new TocProvider();
    const tocTreeView = vscode.window.createTreeView('markdownVisualizer.toc', {
        treeDataProvider: tocProvider,
        showCollapseAll: true
    });

    // --- Comando: Abrir Vista Previa ---
    const openPreviewCmd = vscode.commands.registerCommand(
        'markdownVisualizer.openPreview',
        () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'markdown') {
                MarkdownPreviewPanel.createOrShow(context);
            } else {
                vscode.window.showWarningMessage(
                    'Abre un archivo Markdown para usar la vista previa.'
                );
            }
        }
    );

    // --- Comando: Exportar HTML ---
    const exportHtmlCmd = vscode.commands.registerCommand(
        'markdownVisualizer.exportHtml',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'markdown') {
                const exportProvider = new ExportProvider(context);
                await exportProvider.exportHtml(editor.document);
            }
        }
    );

    // --- Comando: Exportar PDF ---
    const exportPdfCmd = vscode.commands.registerCommand(
        'markdownVisualizer.exportPdf',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (editor && editor.document.languageId === 'markdown') {
                const exportProvider = new ExportProvider(context);
                await exportProvider.exportPdf(editor.document);
            }
        }
    );

    // --- Comando: Ir a línea (usado por TOC items) ---
    const goToLineCmd = vscode.commands.registerCommand(
        'markdownVisualizer.goToLine',
        (line: number) => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const position = new vscode.Position(line, 0);
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(
                    new vscode.Range(position, position),
                    vscode.TextEditorRevealType.InCenter
                );
            }
        }
    );

    // --- Actualizar TOC y preview al cambiar de editor activo ---
    const onActiveEditorChange = vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor && editor.document.languageId === 'markdown') {
            tocProvider.refresh(editor.document);
            MarkdownPreviewPanel.update(editor.document.getText());
        }
    });

    // --- Actualizar TOC y preview en cada cambio del documento (tiempo real) ---
    const onDocumentChange = vscode.workspace.onDidChangeTextDocument(event => {
        if (event.document.languageId === 'markdown') {
            tocProvider.refresh(event.document);
            MarkdownPreviewPanel.update(event.document.getText());
        }
    });

    // --- Scroll sync: editor → preview ---
    const onEditorScroll = vscode.window.onDidChangeTextEditorVisibleRanges(event => {
        if (event.textEditor.document.languageId === 'markdown') {
            const line = event.visibleRanges[0]?.start.line ?? 0;
            MarkdownPreviewPanel.scrollToLine(line);
        }
    });

    // Carga inicial si ya hay un archivo markdown abierto
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor && activeEditor.document.languageId === 'markdown') {
        tocProvider.refresh(activeEditor.document);
    }

    context.subscriptions.push(
        openPreviewCmd,
        exportHtmlCmd,
        exportPdfCmd,
        goToLineCmd,
        tocTreeView,
        onActiveEditorChange,
        onDocumentChange,
        onEditorScroll
    );
}

export function deactivate(): void {}
