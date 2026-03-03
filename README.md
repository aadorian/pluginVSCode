# Markdown Visualizer

Real-time Markdown preview with table of contents, syntax highlighting, and HTML/PDF export — all inside VS Code.

## Features

- **Live Preview** — side-by-side preview that updates as you type
- **Table of Contents** — interactive TOC panel in the Explorer sidebar, click any heading to jump to it
- **Syntax Highlighting** — code blocks highlighted via highlight.js (GitHub theme)
- **Export to HTML** — generates a self-contained HTML file with all styles inlined
- **Export to PDF** — opens the rendered page in your browser, ready to print as PDF
- **Scroll Sync** — editor and preview scroll position stay in sync

## Usage

Open any `.md` file and:

- Click the **preview icon** (top-right of the editor toolbar) to open the live preview
- Use the **Command Palette** (`Ctrl+Shift+P`) and search for `Markdown Visualizer`

### Available Commands

| Command | Description |
|---|---|
| `Markdown Visualizer: Abrir Vista Previa` | Open live preview panel |
| `Markdown Visualizer: Exportar a HTML` | Export to standalone HTML file |
| `Markdown Visualizer: Exportar a PDF` | Open in browser to print as PDF |

## Extension Settings

| Setting | Default | Description |
|---|---|---|
| `markdownVisualizer.scrollSync` | `true` | Sync scroll position between editor and preview |

## Requirements

No external dependencies required. Everything runs inside VS Code.

## Release Notes

### 0.1.0

Initial release:
- Live preview panel
- Table of contents sidebar
- Syntax highlighting for code blocks
- Export to HTML and PDF
- Scroll sync
