import * as vscode from 'vscode';

export interface TocEntry {
    label: string;
    level: number;  // 1–6 (h1–h6)
    line: number;   // 0-based
}

export class TocItem extends vscode.TreeItem {
    constructor(public readonly entry: TocEntry) {
        super(
            '\u00a0'.repeat((entry.level - 1) * 2) + entry.label,
            vscode.TreeItemCollapsibleState.None
        );

        this.tooltip = `Línea ${entry.line + 1}`;
        this.description = `L${entry.line + 1}`;

        // Al hacer click navega al heading en el editor
        this.command = {
            command: 'markdownVisualizer.goToLine',
            title: 'Ir a encabezado',
            arguments: [entry.line]
        };

        // Icono diferente por nivel
        this.iconPath = new vscode.ThemeIcon(
            entry.level === 1 ? 'symbol-class' :
            entry.level === 2 ? 'symbol-method' :
            'symbol-field'
        );
    }
}

export class TocProvider implements vscode.TreeDataProvider<TocItem> {

    private readonly _onDidChangeTreeData =
        new vscode.EventEmitter<TocItem | undefined | null | void>();

    readonly onDidChangeTreeData: vscode.Event<TocItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    private _items: TocItem[] = [];

    /** Llamado desde extension.ts cuando el documento cambia */
    public refresh(document: vscode.TextDocument): void {
        this._items = this._parseHeadings(document);
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TocItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TocItem): TocItem[] {
        if (element) { return []; }
        return this._items;
    }

    private _parseHeadings(document: vscode.TextDocument): TocItem[] {
        const entries: TocEntry[] = [];
        const headingRegex = /^(#{1,6})\s+(.+)$/;
        let inCodeBlock = false;

        for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text;

            // Detecta apertura/cierre de code fences
            if (/^(`{3,}|~{3,})/.test(lineText)) {
                inCodeBlock = !inCodeBlock;
                continue;
            }
            if (inCodeBlock) { continue; }

            const match = headingRegex.exec(lineText);
            if (match) {
                entries.push({
                    level: match[1].length,
                    label: match[2].trim(),
                    line: i
                });
            }
        }

        return entries.map(e => new TocItem(e));
    }
}
