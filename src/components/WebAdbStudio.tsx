import React, { useEffect, useRef, useState } from 'react';
import { Terminal,Usb,Copy,Check,AlertTriangle,Play,Square } from 'lucide-react';
import type { Adb, AdbDaemonConnection } from '@yume-chan/adb';
import type { AdbDaemonWebUsbConnection } from '@yume-chan/adb-daemon-webusb';
import { copyText } from '../utils/api.ts';
const presets = [
  { name:'Device identity',command:'getprop ro.product.model',note:'Read the model identifier.' },
  { name:'Firmware version',command:'getprop ro.build.version.release',note:'Read the Android base version.' },
  { name:'Storage usage',command:'df -h /data',note:'Read free space; no files are changed.' },
  { name:'Third-party packages',command:'pm list packages -3',note:'List installed third-party package IDs.' },
  { name:'Trim reclaimable cache',command:'pm trim-caches 1G',note:'Ask Android to reclaim up to 1 GB of cache. Review before running.' }
];
interface Reader { read(): Promise<{ done: boolean; value?: Uint8Array }>; cancel(): Promise<void>; releaseLock(): void; }
interface Stream { getReader(): Reader; }
function abortPromise(signal: AbortSignal) {
  return new Promise<never>((_resolve,reject) => {
    const abort = () => reject(signal.reason || new Error('Cancelled.'));
    if (signal.aborted) abort(); else signal.addEventListener('abort',abort,{ once:true });
  });
}
export const WebAdbStudio: React.FC = () => {
  const [adb,setAdb] = useState<Adb | null>(null);
  const [busy,setBusy] = useState(false); const [running,setRunning] = useState(false);
  const [device,setDevice] = useState(''); const [command,setCommand] = useState('getprop ro.product.model');
  const [logs,setLogs]=useState<string[]>(['WebUSB transport ready. No device is connected.']);
  const [error,setError]=useState(''); const [copied,setCopied]=useState('');
  const current=useRef<Adb|null>(null); const abort=useRef<AbortController|null>(null); const connectionAbort=useRef<AbortController|null>(null); const mounted=useRef(true);
  const supported=typeof navigator !== 'undefined' && 'usb' in navigator && window.isSecureContext;
  useEffect(() => { mounted.current=true; return () => { mounted.current=false; connectionAbort.current?.abort(); abort.current?.abort(); void current.current?.close().catch(() => {}); }; },[]);
  const log=(message: string) => { if(mounted.current) setLogs(l => [...l.slice(-199),message]); };
  const connect=async () => {
    if(!supported || busy) return;
    setError(''); setBusy(true);
    const controller=new AbortController(); connectionAbort.current=controller;
    let opened: AdbDaemonWebUsbConnection | undefined;
    const closeConnection = (connection: AdbDaemonConnection) => Promise.all([connection.readable.cancel(),connection.writable.close()]).then(() => {});
    let client: Adb | undefined;
    try {
      const [{ Adb,AdbDaemonTransport },{ AdbDaemonWebUsbDeviceManager },{ default:AdbWebCredentialStore }]=await Promise.all([import('@yume-chan/adb'),import('@yume-chan/adb-daemon-webusb'),import('@yume-chan/adb-credential-web')]);
      const selected=await AdbDaemonWebUsbDeviceManager.BROWSER!.requestDevice();
      if(!selected || controller.signal.aborted || !mounted.current) return;
      log(`USB device selected: ${selected.name}. Accept the RSA authorization prompt on the device.`);
      const timer=setTimeout(() => controller.abort(new Error('USB authorization timed out.')),60_000);
      try {
        // Tango's connect/authenticate APIs do not accept a signal. Close late results too.
        const opening=selected.connect();
        void opening.then(value => { if(controller.signal.aborted) return closeConnection(value); }).catch(() => {});
        opened=await Promise.race([opening,abortPromise(controller.signal)]);
        const authenticating=AdbDaemonTransport.authenticate({ serial:selected.serial,connection:opened,credentialStore:new AdbWebCredentialStore('OpenCast') });
        void authenticating.then(value => { if(controller.signal.aborted) return value.close(); }).catch(() => {});
        const transport=await Promise.race([authenticating,abortPromise(controller.signal)]);
        if(controller.signal.aborted || !mounted.current) { await transport.close(); return; }
        client=new Adb(transport); current.current=client; setAdb(client); setDevice(`${selected.name} · ${selected.serial}`);
        log(`Authenticated USB connection established: ${transport.banner.product || selected.name}`);
        void client.disconnected.catch(() => {}).finally(() => { if(mounted.current && current.current===client) { current.current=null; setAdb(null); log('Device disconnected.'); } });
      } finally { clearTimeout(timer); }
    } catch(e) {
      if(opened) await closeConnection(opened).catch(() => {});
      if(mounted.current) setError(controller.signal.aborted ? String((controller.signal.reason as Error)?.message || 'Connection cancelled.') : `Connection failed: ${(e as Error).message}. Check USB debugging and device authorization.`);
    } finally { connectionAbort.current=null; if(mounted.current) setBusy(false); }
  };
  const disconnect=async () => { abort.current?.abort(); try { await adb?.close(); } catch(e) { setError((e as Error).message); } current.current=null; setAdb(null); log('Connection closed.'); };
  const run=async () => {
    const executed=command.trim();
    if(!adb || !executed || running) return;
    if(!window.confirm(`Run this command on ${device}?\n\n${executed}\n\nCommands can change your device. Continue only if you understand it.`)) return;
    setError(''); setRunning(true);
    const controller=new AbortController(); abort.current=controller;
    const timer=setTimeout(() => controller.abort(new Error('Command timed out after 20 seconds. The device may still be processing it.')),20_000);
    const readers: Reader[]=[]; let outputBytes=0;
    const onAbort=() => { for(const reader of readers) void reader.cancel().catch(() => {}); };
    controller.signal.addEventListener('abort',onAbort,{ once:true });
    log(`$ ${executed}`);
    try {
      const read=async (stream: Stream) => {
        const reader=stream.getReader(); readers.push(reader); const decoder=new TextDecoder();
        try {
          while(true) {
            const { done,value }=await reader.read(); if(done) break;
            outputBytes += value?.byteLength || 0;
            if(outputBytes > 2*1024*1024) { controller.abort(new Error('Output exceeded 2 MB. Reading stopped; the device may still be running.')); break; }
            log(decoder.decode(value || new Uint8Array(),{ stream:true }));
          }
          log(decoder.decode());
        } finally { reader.releaseLock(); }
      };
      if(adb.subprocess.shellProtocol) {
        const process=await adb.subprocess.shellProtocol.spawn(executed,controller.signal);
        const exited=process.exited;
        const results=await Promise.allSettled([read(process.stdout),read(process.stderr),exited]);
        if(controller.signal.aborted) throw controller.signal.reason;
        const failure=results.find(r => r.status==='rejected'); if(failure?.status==='rejected') throw failure.reason;
        const exit=results[2]; if(exit.status==='fulfilled') log(`Process exited with code ${exit.value}.`);
      } else {
        const process=await adb.subprocess.noneProtocol.spawn(executed,controller.signal);
        await Promise.allSettled([read(process.output),process.exited]);
        if(controller.signal.aborted) throw controller.signal.reason;
        log('Output complete. This legacy shell transport does not report an exit code.');
      }
    } catch(e) {
      if(mounted.current) setError(controller.signal.aborted ? String((controller.signal.reason as Error)?.message || 'Stopped waiting. The device may still be processing the command.') : `Command failed: ${(e as Error).message}`);
    } finally {
      clearTimeout(timer); controller.signal.removeEventListener('abort',onAbort);
      for(const reader of readers) await reader.cancel().catch(() => {});
      abort.current=null; if(mounted.current) setRunning(false);
    }
  };
  const copy=async (text: string) => { try { await copyText(text); setCopied(text); } catch(e) { setError((e as Error).message); } };
  return <div className="space-y-6">
    <section className="panel p-6 space-y-4"><div className="eyebrow"><Terminal size={15}/> REAL WEBUSB TRANSPORT</div><h1 className="page-title">ADB device studio</h1><p className="muted max-w-3xl">Connect an Android device with a USB cable. Commands and output go directly between your browser and the device—not through the OpenCast server. Browsers cannot open arbitrary wireless ADB TCP sockets; use the desktop Android SDK for Wi-Fi debugging.</p><div className="notice flex gap-3"><AlertTriangle size={18} className="shrink-0"/><span>Only use hardware you own or administer. Commands may expose package information or change settings. Back up first. WebUSB requires a supported Chromium browser, HTTPS (or localhost), and USB debugging authorization.</span></div><div className="flex flex-wrap items-center gap-3"><button className="primary-button" disabled={!supported || busy || !!adb} onClick={connect}><Usb size={16}/>{busy ? 'Waiting for USB authorization…' : 'Select USB device'}</button>{busy && <button className="secondary-button" onClick={() => connectionAbort.current?.abort(new Error('Connection cancelled.'))}>Cancel connection</button>}{adb && <button className="secondary-button" onClick={disconnect}>Disconnect</button>}<span role="status" className="text-xs font-mono muted">{adb ? `Connected: ${device}` : supported ? 'No device connected' : 'WebUSB unavailable in this browser/context'}</span></div>{error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}</section>
    <div className="grid lg:grid-cols-5 gap-6"><section className="lg:col-span-2 space-y-3"><h2 className="section-title">Command presets</h2>{presets.map(p => <div key={p.name} className="panel p-4 space-y-2"><div className="flex justify-between gap-2"><h3 className="text-sm font-semibold">{p.name}</h3><button className="icon-button" aria-label={`Copy ${p.name}`} onClick={() => copy(p.command)}>{copied===p.command ? <Check size={15}/> : <Copy size={15}/>}</button></div><p className="text-xs muted">{p.note}</p><code className="block text-xs break-all text-blue-600 dark:text-blue-400">{p.command}</code><button className="secondary-button" disabled={running} onClick={() => setCommand(p.command)}>Load into terminal</button></div>)}</section>
    <section className="lg:col-span-3 panel overflow-hidden self-start"><div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between"><h2 className="section-title">Device terminal</h2><span className="text-xs font-mono muted">Actual output only</span></div><div className="bg-slate-950 text-slate-100 p-4 font-mono text-xs h-96 overflow-auto" role="log" aria-label="ADB terminal output">{logs.map((entry,i) => <pre key={i} className="whitespace-pre-wrap break-all mb-2">{entry}</pre>)}</div><form className="p-4 space-y-3" onSubmit={e => { e.preventDefault(); void run(); }}><label className="text-xs font-medium" htmlFor="adb-command">Shell command</label><input id="adb-command" className="field font-mono" value={command} disabled={running} onChange={e => setCommand(e.target.value)} maxLength={2000}/><div className="flex gap-2"><button className="primary-button" disabled={!adb || running || !command.trim()}><Play size={15}/>{running ? 'Running…' : 'Review & run'}</button>{running && <button type="button" className="secondary-button" onClick={() => abort.current?.abort(new Error('Stopped waiting. The device may still be processing the command.'))}><Square size={14}/>Stop waiting</button>}</div></form></section></div>
  </div>;
};
