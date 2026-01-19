'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import {
    Terminal,
    ChevronDown,
    ChevronUp,
    X,
    RefreshCw,
    Info,
    AlertCircle,
    Clock,
    Code
} from 'lucide-react';
import { apiLogHistory, ApiLogEntry } from '@/lib/api-client';

export default function ApiInspector() {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState<ApiLogEntry[]>([]);
    const [selectedEntry, setSelectedEntry] = useState<string | null>(null);

    useEffect(() => {
        // Initial load
        setLogs([...apiLogHistory]);

        // Listen for updates
        const handleUpdate = () => {
            setLogs([...apiLogHistory]);
        };

        window.addEventListener('api-log-updated' as any, handleUpdate);
        return () => window.removeEventListener('api-log-updated' as any, handleUpdate);
    }, []);

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 z-[500] bg-gray-900 text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2"
            >
                <Terminal className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">API Inspector</span>
                {logs.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                        {logs.length}
                    </span>
                )}
            </button>
        );
    }

    return (
        <div className="fixed bottom-0 right-0 w-[500px] h-[600px] z-[500] p-4 bg-transparent pointer-events-none">
            <Card className="h-full flex flex-col shadow-2xl border-2 border-gray-900 pointer-events-auto bg-gray-50 overflow-hidden">
                {/* Header */}
                <div className="bg-gray-900 text-white p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-green-400" />
                        <h3 className="text-xs font-bold uppercase tracking-widest">API Inspector</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { apiLogHistory.length = 0; setLogs([]); }}
                            className="p-1 hover:bg-white/10 rounded"
                            title="Clear logs"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-white/10 rounded"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Log List */}
                <div className="flex-1 overflow-y-auto bg-black font-mono text-[11px]">
                    {logs.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-500 italic">
                            No API requests captured yet...
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-800">
                            {logs.map((log) => {
                                const isSelected = selectedEntry === log.id;
                                const isError = log.status && log.status >= 400;
                                const isPending = !log.status && !log.error;

                                return (
                                    <div key={log.id} className="group">
                                        <div
                                            onClick={() => setSelectedEntry(isSelected ? null : log.id)}
                                            className={`
                        flex items-center gap-3 p-2 cursor-pointer transition-colors
                        ${isSelected ? 'bg-gray-800' : 'hover:bg-gray-900'}
                        ${isError ? 'text-red-400' : isPending ? 'text-yellow-400' : 'text-green-400'}
                      `}
                                        >
                                            <span className="w-12 font-bold">{log.method}</span>
                                            <span className="flex-1 truncate text-gray-300">{log.url}</span>
                                            <div className="flex items-center gap-2">
                                                {log.duration && <span className="text-gray-500 text-[10px]">{log.duration}ms</span>}
                                                <span className={`px-1 rounded ${isError ? 'bg-red-900/50' : 'bg-gray-800'}`}>
                                                    {log.status || '...'}
                                                </span>
                                                {isSelected ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div className="p-3 bg-gray-900 border-t border-gray-800 space-y-3">
                                                {/* Summary */}
                                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                    <div className="flex items-center gap-1 text-gray-400">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{log.timestamp.toLocaleTimeString()}</span>
                                                    </div>
                                                    {log.error && (
                                                        <div className="flex items-center gap-1 text-red-500">
                                                            <AlertCircle className="w-3 h-3" />
                                                            <span className="truncate">{log.error}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Request Data */}
                                                {log.requestData && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1 text-gray-500 uppercase text-[9px] font-bold">
                                                            <Code className="w-3 h-3" />
                                                            <span>Request Payload</span>
                                                        </div>
                                                        <pre className="p-2 bg-black rounded border border-gray-800 text-gray-300 overflow-x-auto">
                                                            {JSON.stringify(log.requestData, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}

                                                {/* Response Data */}
                                                {log.responseData && (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1 text-gray-500 uppercase text-[9px] font-bold">
                                                            <Info className="w-3 h-3" />
                                                            <span>Response Body</span>
                                                        </div>
                                                        <pre className="p-2 bg-black rounded border border-gray-800 text-gray-400 overflow-x-auto max-h-40">
                                                            {JSON.stringify(log.responseData, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-2 bg-white border-t border-gray-200 text-[10px] text-gray-400 flex justify-between items-center">
                    <span>{logs.length} Requests recorded</span>
                    <span className="text-primary italic">Developer Mode Active</span>
                </div>
            </Card>
        </div>
    );
}
