
// Polyfill for Electron IPC in web environment
if (!(window as any).electron) {
    console.log('Injecting web polyfill for Electron IPC');

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // Default to localhost:3000 if running in dev mode separately
    const wsUrl = `${protocol}//${host}/ws`;

    let socket: WebSocket | null = null;
    const listeners = new Map<string, Set<Function>>();

    function connect() {
        try {
            socket = new WebSocket(wsUrl);
            socket.onopen = () => console.log('WS connected');
            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const { channel, args } = data;
                    const channelListeners = listeners.get(channel);
                    if (channelListeners) {
                        // Electron renderer listener: (event, ...args)
                        const mockEvent = { sender: null };
                        channelListeners.forEach(listener => listener(mockEvent, ...args));
                    }
                } catch (e) {
                    console.error('Failed to parse WS message', e);
                }
            };
            socket.onclose = () => {
                console.log('WS closed, reconnecting...');
                setTimeout(connect, 2000);
            };
            socket.onerror = (err) => {
                console.error('WS error', err);
            };
        } catch (e) {
            console.error("Failed to connect WS", e);
        }
    }

    connect();

    (window as any).electron = {
        ipcRenderer: {
            invoke: async (channel: string, ...args: any[]) => {
                const response = await fetch(`/api/ipc/${channel}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ args })
                });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({ error: response.statusText }));
                    throw new Error(err.error || response.statusText);
                }
                const result = await response.json();
                return result;
            },
            on: (channel: string, listener: Function) => {
                if (!listeners.has(channel)) {
                    listeners.set(channel, new Set());
                }
                listeners.get(channel)!.add(listener);
                // Return cleanup function if the original API supports it (my preload.ts does)
                return () => {
                    listeners.get(channel)?.delete(listener);
                };
            },
            removeListener: (channel: string, listener: Function) => {
                listeners.get(channel)?.delete(listener);
            },
            removeAllListeners: (channel: string) => {
                listeners.delete(channel);
            }
        },
        webFrame: {
            setZoomFactor: () => {},
            getZoomFactor: () => 1,
        }
    };
}
