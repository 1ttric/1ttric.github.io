import React, {FC, useEffect, useRef} from "react";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {V86Starter} from "v86";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {seabios, v86WASM, vgabios} from "v86/build/binaries";
import {createRoot} from "react-dom/client";
import {Terminal} from "xterm";


// TODO: Rice startup speed:
// TODO: Kernel params? (edd=off fastboot)
// TODO: Use squashfs?

const App: FC = () => {
    const emulatorContainerRef = useRef<HTMLDivElement>(null);
    const emulatorRef = useRef<V86Starter>();

    const terminalContainerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal>();

    // Populates emulatorRef when emulatorContainerRef changes
    useEffect(() => {
        const asyncEffect = async () => {
            if (!emulatorContainerRef.current || emulatorRef.current) {
                return
            }
            emulatorRef.current = true
            const hdaUrl = "//vtec.b-cdn.net/items/linux-wasm/archlinux";
            const emulator = new V86Starter({
                wasm_fn: async (param: any) => (await WebAssembly.instantiate(await v86WASM, param)).instance.exports,
                memory_size: 512 * 1024 * 1024,
                vga_memory_size: 8 * 1024 * 1024,
                screen_container: emulatorContainerRef.current,
                // bios: {buffer: await seabios},
                // vga_bios: {buffer: await vgabios},
                bios: {url: "//vtec.b-cdn.net/items/linux-wasm/bios.bin"},
                vga_bios: {url: "//vtec.b-cdn.net/items/linux-wasm/vgabios.bin"},
                hda: {
                    url: hdaUrl,
                    async: true,
                    // size: (await fetch(hdaUrl, {method: "HEAD"})).headers.get("Content-Length"),
                },
                acpi: false,
                autostart: true,
            });
            emulatorRef.current = emulator;
            emulator.add_listener("serial0-output-char", (data: string) => {
                // setSerialText(oldText => oldText + data)
                terminalRef.current?.write(data);
            });
            (window as any).emulator = emulator;
            // setUpdate(i => i + 1)
        }
        asyncEffect().catch(console.error)
    }, [emulatorContainerRef.current])

    // Populates terminalRef when terminalContainerRef changes
    useEffect(() => {
        if (!terminalContainerRef.current || terminalRef.current) {
            return
        }
        const terminal = new Terminal({rendererType: "canvas", fontSize: 12, rows: 8, cols: 72, bellStyle: "none"});
        (window as any).terminal = terminal
        terminalRef.current = terminal;
        terminal.onKey(e => {
            emulatorRef.current?.serial0_send(e.key)
        })
        terminal.open(terminalContainerRef?.current)
    }, [terminalContainerRef.current])

    // const saveState = () => {
    //     if (!emulatorRef.current) {
    //         return
    //     }
    //     emulatorRef.current.save_state((error: Error, state: BlobPart) => {
    //         if (error) {
    //             throw error;
    //         }
    //         const a = document.createElement("a");
    //         a.download = "state.bin";
    //         a.href = window.URL.createObjectURL(new Blob([state]));
    //         a.dataset.downloadurl = "application/octet-stream:" + a.download + ":" + a.href;
    //         a.click();
    //     });
    // }

    // const loadState = (file: File | null | undefined) => {
    //     if (!emulatorRef.current || !file) {
    //         return
    //     }
    //     if (emulatorRef.current?.is_running()) {
    //         emulatorRef.current?.stop()
    //     }
    //     const fileReader = new FileReader();
    //     fileReader.onload = () => {
    //         emulatorRef.current?.restore_state(fileReader.result);
    //         emulatorRef.current?.run()
    //     };
    //     fileReader.readAsArrayBuffer(file);
    // }

    return (
        <div className="absolute inset-0 w-screen h-screen overscroll-none flex flex-col justify-center items-center">
            <div className="overflow-hidden">
                <div className="bg-bg0" ref={emulatorContainerRef}>
                    <div className="whitespace-pre text-sm font-mono leading-4 select-none"></div>
                    <canvas onClick={() => emulatorRef.current?.lock_mouse()}></canvas>
                </div>
            </div>
            <div className="mt-4 p-2 outline outline-1">
                <div className="overflow-hidden" ref={terminalContainerRef}/>
            </div>
        </div>
    )
}

createRoot(document.getElementById("react-app") as HTMLElement).render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>,
)