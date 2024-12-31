import * as vscode from 'vscode';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

class NotesProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private notesFolder: string) {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): Thenable<vscode.TreeItem[]> {
        if (!fs.existsSync(this.notesFolder)) {
            return Promise.resolve([]);
        }

        const files = fs.readdirSync(this.notesFolder);
        return Promise.resolve(
            files.map(file => {
                const filePath = path.join(this.notesFolder, file);
                const treeItem = new vscode.TreeItem(file, vscode.TreeItemCollapsibleState.None);
                treeItem.command = {
                    command: 'vscode.open',
                    title: 'Open Note',
                    arguments: [vscode.Uri.file(filePath)],
                };
                return treeItem;
            })
        );
    }
}

export function activate(context: vscode.ExtensionContext) {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    let notesFolder: string;
    if (workspaceFolders && workspaceFolders.length > 0) {
        notesFolder = path.join(workspaceFolders[0].uri.fsPath, 'Notes');
    } else {
        notesFolder = path.join(os.homedir(), '.vscode-notes');
        if (!fs.existsSync(notesFolder)) {
            fs.mkdirSync(notesFolder);
        }
    }

    const notesProvider = new NotesProvider(notesFolder);
    vscode.window.registerTreeDataProvider('notesExplorer', notesProvider);

    const createNoteCommand = vscode.commands.registerCommand('notes.createNote', async () => {
        const noteTitle = await vscode.window.showInputBox({
            prompt: 'Enter the title of your note:',
            placeHolder: 'Note title...'
        });

        if (!noteTitle) {
            vscode.window.showWarningMessage('Note creation canceled. No title provided.');
            return;
        }

        const noteContent = await vscode.window.showInputBox({
            prompt: 'Enter your note content:',
            placeHolder: 'Type your note here...'
        });

        if (!noteContent) {
            vscode.window.showWarningMessage('Note creation canceled. No content provided.');
            return;
        }

        const filePath = path.join(notesFolder, `${noteTitle}.txt`);
        try {
            fs.writeFileSync(filePath, noteContent, 'utf8');
            vscode.window.showInformationMessage(`Note saved to: ${filePath}`);
            notesProvider.refresh();
        } catch (error) {
            if (error instanceof Error) {
                vscode.window.showErrorMessage(`Failed to save note: ${error.message}`);
            } else {
                vscode.window.showErrorMessage('An unknown error occurred while saving the note.');
            }
        }
    });

    const quickNoteCommand = vscode.commands.registerCommand('notes.quickNote', async () => {
        const quickNoteContent = await vscode.window.showInputBox({
            prompt: 'Enter quick note content:',
            placeHolder: 'Quick note...'
        });

        if (!quickNoteContent) {
            vscode.window.showWarningMessage('Quick note canceled. No content provided.');
            return;
        }

        const filePath = path.join(notesFolder, `quick-note-${Date.now()}.txt`);
        try {
            fs.writeFileSync(filePath, quickNoteContent, 'utf8');
            vscode.window.showInformationMessage(`Quick note saved to: ${filePath}`);
            notesProvider.refresh();
        } catch (error) {
            vscode.window.showErrorMessage('Failed to save quick note.');
        }
    });

    const searchNotesCommand = vscode.commands.registerCommand('notes.searchNotes', async () => {
        const searchTerm = await vscode.window.showInputBox({
            prompt: 'Enter search term:',
            placeHolder: 'Search notes...'
        });

        if (!searchTerm) {
            vscode.window.showWarningMessage('Search canceled. No term provided.');
            return;
        }

        const matchingNotes = fs.readdirSync(notesFolder)
            .filter(file => file.includes(searchTerm));

        if (matchingNotes.length === 0) {
            vscode.window.showInformationMessage('No matching notes found.');
        } else {
            vscode.window.showQuickPick(matchingNotes.map(name => ({ label: name })), {
                placeHolder: 'Matching notes:'
            });
        }
    });

    context.subscriptions.push(createNoteCommand, quickNoteCommand, searchNotesCommand);
}

export function deactivate() {}
