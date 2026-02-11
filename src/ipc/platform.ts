/* eslint-disable @typescript-eslint/no-var-requires */
// We define types based on Electron namespace to ensure compatibility
// Note: We don't import 'electron' directly to avoid runtime require issues in Node
import type { IpcMain, App, Shell, Dialog, Clipboard, Session, BrowserWindow as BrowserWindowType } from 'electron';

let ipcMain: IpcMain;
let app: App;
let shell: Shell;
let dialog: Dialog;
let clipboard: Clipboard;
let session: { defaultSession: Session }; // session module exports defaultSession
let BrowserWindow: typeof BrowserWindowType;

// Use require directly to ensure we can load modules conditionally
// In a standard CJS build (Electron), require is available.
// In tsx/ts-node, require is available.

if (process.versions.electron) {
  const electron = require('electron');
  ipcMain = electron.ipcMain;
  app = electron.app;
  shell = electron.shell;
  dialog = electron.dialog;
  clipboard = electron.clipboard;
  session = electron.session;
  BrowserWindow = electron.BrowserWindow;
} else {
  // We are in Node Server
  const server = require('./platform_server');
  ipcMain = server.ipcMain;
  app = server.app;
  shell = server.shell;
  dialog = server.dialog;
  clipboard = server.clipboard;
  session = server.session;
  BrowserWindow = server.BrowserWindow;
}

export { ipcMain, app, shell, dialog, clipboard, session, BrowserWindow };
