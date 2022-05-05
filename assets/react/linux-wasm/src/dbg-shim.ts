export const dbg_assert = (cond: any, msg: any, level: any) => {
    if (!cond) {
        console.error("(v86) assert failed", msg, level);
    }
}

export const dbg_log = (msg: any, level: any) => {
    console.log("(v86) debug:", msg, level)
}