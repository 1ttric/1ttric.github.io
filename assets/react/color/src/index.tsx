import ReactDOM from "react-dom";
import React, {FC, useState} from "react";

const App: FC = () => {
    const [cursorPos, setCursorPos] = useState<[number, number]>([Math.random(), 0.5]);
    const [scrollPos, setScrollPos] = useState(50)
    const [locked, setLocked] = useState(false)

    const bgColor = `hsl(${Math.round(cursorPos[0] * 360)}, ${Math.round((1 - cursorPos[1]) * 100)}%, ${Math.round(scrollPos)}%)`
    return <div
        className="absolute inset-0 w-screen h-screen"
        style={{backgroundColor: bgColor}}
        onClick={e => {
            const newLocked = !locked
            setLocked(newLocked)
            if (!newLocked) {
                setCursorPos([e.clientX / window.innerWidth, e.clientY / window.innerHeight])
            }
        }}
        onMouseMove={e => {
            !locked && setCursorPos([e.clientX / window.innerWidth, e.clientY / window.innerHeight])
        }}
        onTouchMove={e => {
            !locked && setCursorPos([e.touches[0].clientX / window.innerWidth, e.touches[0].clientY / window.innerHeight])
        }}
        onWheel={e => {
            !locked && setScrollPos(Math.min(Math.max(0, scrollPos + (e.deltaY > 0 ? -1 : 1)), 100))
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
