import ReactDOM from "react-dom";
import React, {FC, useState} from "react";

const App: FC = () => {
    const [cursorPos, setCursorPos] = useState<[number, number]>([Math.random(), 0.5]);
    const [scrollPos, setScrollPos] = useState(50)
    const [locked, setLocked] = useState(false)
    const [prevTouchPairY, setPrevTouchPairY] = useState<[number, number]>([0, 0])

    const bgColor = `hsl(${Math.round(cursorPos[0] * 360)}, ${Math.round((1 - cursorPos[1]) * 100)}%, ${Math.round(scrollPos)}%)`
    return <div
        // className="absolute inset-0 w-screen h-screen select-none whitespace-pre-line font-mono text-xs" // For debugging
        className="absolute inset-0 w-screen h-screen select-none"
        style={{backgroundColor: bgColor}}
        onClick={e => {
            const newLocked = !locked
            setLocked(newLocked)
            if (!newLocked) {
                setCursorPos([e.clientX / window.innerWidth, e.clientY / window.innerHeight])
            }
        }}
        onMouseMove={e => {
            if (locked) return
            setCursorPos([e.clientX / window.innerWidth, e.clientY / window.innerHeight])
        }}
        onTouchStart={e => {
            if (e.touches.length == 2) {
                setPrevTouchPairY([e.touches[0].clientY, e.touches[1].clientY])
            }
        }}
        onTouchMove={e => {
            if (locked) return;
            if (e.touches.length == 2) {
                const y0 = (prevTouchPairY[0] + prevTouchPairY[1]) / 2
                const y1 = (e.touches[0].clientY + e.touches[1].clientY) / 2
                const diff = -Math.sign(y1 - y0)
                setScrollPos(Math.min(Math.max(0, scrollPos + diff), 100))
                setPrevTouchPairY([e.touches[0].clientY, e.touches[1].clientY])
            } else {
                setCursorPos([e.touches[0].clientX / window.innerWidth, e.touches[0].clientY / window.innerHeight])
            }
        }}
        onWheel={e => {
            if (locked) return;
            setScrollPos(Math.min(Math.max(0, scrollPos + (e.deltaY > 0 ? -1 : 1)), 100))
        }}
    >
    </div>
}

document.body.className += " overflow-hidden overscroll-contain"
const meta = document.createElement("meta");
meta.name = "viewport";
meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
document.head.appendChild(meta);


ReactDOM.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>,
    document.getElementById("react-app")
);
