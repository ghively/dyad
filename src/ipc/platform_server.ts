import { EventEmitter } from 'events';
import path from 'path';
import os from 'os';

// Mock ipcMain
export const ipcMain = new EventEmitter() as any;
ipcMain._handlers = new Map<string, (event: any, ...args: any[]) => any>();
ipcMain.handle = (channel: string, listener: any) => {
    ipcMain._handlers.set(channel, listener);
};
ipcMain.handleOnce = (channel: string, listener: any) => {
    ipcMain._handlers.set(channel, async (...args: any[]) => {
        ipcMain._handlers.delete(channel);
        return listener(...args);
    });
};
ipcMain.removeHandler = (channel: string) => {
    ipcMain._handlers.delete(channel);
};

// Mock app
export const app = {
    getPath: (name: string) => {
        if (name === 'userData') return path.join(process.cwd(), 'userData');
        if (name === 'home') return os.homedir();
        if (name === 'appData') return path.join(process.cwd(), 'appData');
        if (name === 'temp') return os.tmpdir();
        if (name === 'sessionData') return path.join(process.cwd(), 'userData', 'session');
        return process.cwd();
    },
    getAppPath: () => process.cwd(),
    isPackaged: false,
    quit: () => process.exit(0),
    relaunch: () => console.log('[Server] App relaunch requested'),
    whenReady: () => Promise.resolve(),
    on: () => {},
    isInApplicationsFolder: () => false,
    moveToApplicationsFolder: () => {},
    requestSingleInstanceLock: () => true,
    setAsDefaultProtocolClient: () => {},
    name: 'Dyad',
    getVersion: () => '0.0.0-server',
} as any;

// Mock shell
export const shell = {
    openExternal: (url: string) => console.log(`[Server] Open External URL: ${url}`),
    showItemInFolder: (path: string) => console.log(`[Server] Show Item in Folder: ${path}`),
} as any;

// Mock clipboard
export const clipboard = {
    writeImage: (image: any) => console.log(`[Server] Clipboard writeImage`),
    readText: () => '',
    writeText: (text: string) => {},
} as any;

export const session = {
    defaultSession: {
        clearStorageData: async () => console.log('[Server] Clear storage data'),
    }
} as any;

// Mock dialog
export const dialog = {
    showOpenDialog: async (options: any) => {
        console.log(`[Server] Dialog requested:`, options);
        return { canceled: true, filePaths: [] };
    },
    showMessageBox: async (options: any) => {
        console.log(`[Server] Message Box:`, options);
        return { response: 0 };
    },
    showErrorBox: (title: string, content: string) => {
        console.error(`[Server] Error Box: ${title} - ${content}`);
    }
} as any;

// Global broadcaster for server mode
let broadcaster: (channel: string, ...args: any[]) => void = (channel, ...args) => {
    console.log(`[Server] Broadcast (no clients): ${channel}`, args);
};

export function setBroadcaster(fn: (channel: string, ...args: any[]) => void) {
    broadcaster = fn;
}

// Mock BrowserWindow
export class BrowserWindow {
    webContents: any;
    constructor(options: any) {
        this.webContents = {
            send: (channel: string, ...args: any[]) => broadcaster(channel, ...args),
            openDevTools: () => {},
            on: () => {},
            once: () => {},
            isDestroyed: () => false,
            replaceMisspelling: () => {},
            inspectElement: () => {},
        };
    }
    loadURL(url: string) { console.log(`[Server] BrowserWindow.loadURL: ${url}`); }
    loadFile(path: string) { console.log(`[Server] BrowserWindow.loadFile: ${path}`); }
    static getAllWindows() {
        // Return a mock window that can send
        return [new BrowserWindow({})];
    }
    static getFocusedWindow() { return null; }
    // Add static method fromWebContents
    static fromWebContents(webContents: any) { return new BrowserWindow({}); }
    isMinimized() { return false; }
    isMaximized() { return false; }
    minimize() {}
    maximize() {}
    restore() {}
    focus() {}
    close() {}
    capturePage() { return Promise.resolve({ isEmpty: () => true }); }
}
