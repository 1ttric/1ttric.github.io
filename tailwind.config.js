module.exports = {
    purge: {
        enabled: true,
        content: [
            "layouts/**/*.html",
            "themes/vtec/layouts/**/*.html",
        ]
    },
    darkMode: false,
    theme: {
        fontFamily: {
            "mono": "JetBrainsMonoNL"
        },
        // Add base colors to Tailwind CSS
        colors: {
            "bg0": {DEFAULT: "#000000"},
            "bg1": {DEFAULT: "#222d31"},
            "bg2": {DEFAULT: "#2B2C2B"},
            "bg3": {DEFAULT: "#353836"},
            "bg4": {DEFAULT: "#444444"},

            "fg1": {DEFAULT: "#f9faf9"},
            "fg2": {DEFAULT: "#FDF6E3"},
            "fg3": {DEFAULT: "#EEE8D5"},
        },
        extend: {
            typography: theme => {
                console.error("deadbeef", theme("colors"))
                return {
                    DEFAULT: {
                        css: {
                            "code::before": {content: "''"},
                            "code::after": {content: "''"},
                            h1: {color: theme("colors.fg1.DEFAULT")},
                            h2: {color: theme("colors.fg1.DEFAULT")},
                            h3: {color: theme("colors.fg1.DEFAULT")},
                            h4: {color: theme("colors.fg1.DEFAULT")},
                            h5: {color: theme("colors.fg1.DEFAULT")},
                            h6: {color: theme("colors.fg1.DEFAULT")},
                            thead: {color: theme("colors.fg1.DEFAULT")},
                            strong: {color: theme("colors.fg3.DEFAULT")},
                            a: {color: theme("colors.fg1.DEFAULT")},
                            code: {color: theme("colors.fg1.DEFAULT")},
                            "div.highlight > pre.chroma": {backgroundColor: theme("colors.bg3.DEFAULT")},
                            "div.highlight > pre.chroma > code": {
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                            },
                            "p code": {
                                paddingLeft: ".5rem",
                                paddingRight: ".5rem",
                                backgroundColor: theme("colors.bg3.DEFAULT")
                            },
                            img: {width: "100%"},
                        }
                    }
                }
            },
        },
    },
    variants: {
        extend: {},
    },
    plugins: [
        require("@tailwindcss/typography"),
    ],
}
