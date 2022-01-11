import ReactDOM from "react-dom";
import React, {FC, useEffect, useRef, useState} from "react";
import Webcam from "react-webcam";
import jsQR, {QRCode} from "jsqr";
import {base64, base64url} from "rfc4648";
import pako from "pako";

const splitQR = (qr: QRCode): [string, string, string] => {
    if (qr.data.slice(0, 5) !== "shc:/") {
        throw new Error("invalid SHC header")
    }
    const jwt = qr.data.slice(5).match(/(..?)/g)?.map(i => String.fromCharCode(parseInt(i, 10) + 45)).join("")
    if (!jwt) {
        throw new Error("empty JWT")
    }
    const jwtParts = jwt.split(".")
    if (jwtParts.length !== 3) {
        throw new Error(`invalid JWT with ${jwtParts.length} parts`)
    }
    const [jwtHeaderStr, jwtBodyStr, jwtSignatureStr] = jwtParts;
    const jwtHeader = JSON.stringify(JSON.parse(new TextDecoder().decode(base64.parse(jwtHeaderStr, {loose: true}))), null, 4)
    const jwtBody = JSON.stringify(JSON.parse(new TextDecoder().decode(pako.inflate(base64url.parse(jwtBodyStr, {loose: true}), {raw: true}))), null, 4)
    const jwtSignature = jwtSignatureStr
    return [jwtHeader, jwtBody, jwtSignature]
}

const App: FC = () => {
    const webcamRef = useRef<Webcam>(null);
    const [qrData, setQrData] = useState<[string, string, string] | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const interval = setInterval(async () => {
            const canvas = webcamRef.current?.getCanvas()
            const img = canvas?.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height)
            if (!img) {
                return;
            }
            const newQr = jsQR(img.data, img.width, img.height)
            if (!newQr) {
                return
            }
            let newData: [string, string, string] | null = null
            let newError = "";
            try {
                newData = splitQR(newQr)
            } catch (e) {
                newError = (e as Error).message
            }
            setQrData(newData)
            setError(newError)
        }, 0);
        return () => clearInterval(interval);
    }, [webcamRef.current]);

    console.log("deadbeef", qrData, error)

    return (
        <div className="flex flex-col items-stretch justify-center w-screen h-screen p-4 font-mono text-fg1">
            {
                error ? (
                    <>
                        <p className="text-red-600">
                            Error
                        </p>
                        <p className="flex-1 p-2 border border-bg0 overflow-scroll whitespace-pre text-red-600">
                            {error}
                        </p>
                        <button className="p-2 mt-4 text-white bg-bg3 hover:bg-bg4 focus:outline-black"
                                onClick={() => setError(null)}>
                            Capture
                        </button>
                    </>
                ) : (
                    qrData ? (
                        <>
                            <p>
                                JWT Header
                            </p>
                            <p className="flex-1 p-2 border border-bg0 overflow-scroll whitespace-pre text-sm">
                                {qrData[0]}
                            </p>
                            <p className="mt-4">
                                Payload
                            </p>
                            <p className="flex-2 p-2 border border-bg0 overflow-scroll whitespace-pre text-sm">
                                {qrData[1]}
                            </p>
                            <p className="mt-4">
                                JWT Signature
                            </p>
                            <p className="flex-1 p-2 border border-bg0 overflow-scroll whitespace-pre text-sm">
                                {qrData[2]}
                            </p>
                            <button className="p-2 mt-4 text-white bg-bg3 hover:bg-bg4 focus:outline-black"
                                    onClick={() => setQrData(null)}>
                                Capture
                            </button>
                        </>
                    ) : (
                        <>
                            <p>
                                Scan a QR code
                            </p>
                            <div className="flex-1 mt-4 p-4 border border-bg0 flex justify-center">
                                <Webcam
                                    videoConstraints={{facingMode: "environment"}}
                                    ref={webcamRef}
                                    onUserMediaError={() => setError("could not open webcam")}
                                    // style={{position: "absolute", right: "100%"}}
                                    muted
                                    mirrored
                                    screenshotQuality={1}
                                    screenshotFormat="image/jpeg"
                                />
                            </div>
                        </>
                    )
                )
            }
        </div>
    )
}


ReactDOM.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>,
    document.getElementById("react-app")
);
