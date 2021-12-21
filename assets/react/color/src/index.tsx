import * as convert from "color-convert";
import {HSL} from "color-convert/conversions";

type State = {
    cursorPos: [number, number]
    scrollPos: number
    fingerScroll: number | null
    locked: boolean
    color: HSL
}

const state: State = {
    cursorPos: [Math.random(), 0.5],
    scrollPos: 50,
    fingerScroll: null,
    locked: false,
    color: [0, 0, 0]
};

(window as any).state = state;

document.body.className += " overflow-hidden overscroll-contain"
const meta = document.createElement("meta");
meta.name = "viewport";
meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
document.head.appendChild(meta);

const div = document.createElement("div")
div.id = "app"
div.className = "absolute inset-0 w-screen h-screen select-none"

const setToUrl = () => {
    const hsl = state.color
    const hex = convert.hsl.hex(hsl)
    window.location.hash = hex
}

const loadFromUrl = (): HSL | undefined => {
    const hex = window.location.hash;
    const hsl = convert.hex.hsl(hex)
    if (!hex || !hsl) {
        return
    }
    return hsl
}

const updateColor = (newColor?: HSL) => {
    let hsl: HSL;
    if (newColor) {
        hsl = newColor
    } else {
        hsl = [
            Math.round(state.cursorPos[0] * 360),
            Math.round((1 - state.cursorPos[1]) * 100),
            Math.round(state.scrollPos)
        ]
    }
    state.color = hsl
    div.style.backgroundColor = `hsl(${hsl[0]}, ${hsl[1]}%, ${hsl[2]}%)`
}

div.onclick = e => {
    state.locked = !state.locked
    if (state.locked) {
        setToUrl()
        return;
    }
    if (window.location.hash) {
        window.location.hash = ""
    }
    state.cursorPos = [e.clientX / window.innerWidth, e.clientY / window.innerHeight]
    updateColor()
}
div.onmousemove = e => {
    if (state.locked) return
    state.cursorPos = [e.clientX / window.innerWidth, e.clientY / window.innerHeight]
    updateColor()
}
div.ontouchstart = e => {
    if (e.touches.length == 2) {
        state.fingerScroll = (e.touches[0].clientY + e.touches[1].clientY) / 2
    }
}
div.ontouchend = e => {
    if (e.touches.length == 0) {
        state.fingerScroll = null
    }
}
div.ontouchmove = e => {
    if (state.locked) return;
    if (state.fingerScroll) {
        const y0 = state.fingerScroll
        const y1 = e.touches[0].clientY
        const diff = -Math.sign(y1 - y0)
        state.scrollPos = Math.min(Math.max(0, state.scrollPos + diff), 100)
        state.fingerScroll = y1
    } else {
        state.cursorPos = [e.touches[0].clientX / window.innerWidth, e.touches[0].clientY / window.innerHeight]
    }
    updateColor()
}
div.onwheel = e => {
    if (state.locked) return;
    state.scrollPos = Math.min(Math.max(0, state.scrollPos + (e.deltaY > 0 ? -1 : 1)), 100)
    updateColor()
}

const urlColor = loadFromUrl()
if (urlColor) {
    updateColor(urlColor)
    state.locked = true
} else {
    updateColor()
}
document.body.appendChild(div)
