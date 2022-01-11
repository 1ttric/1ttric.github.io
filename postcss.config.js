module.exports = {
    plugins: {
        tailwindcss: {
            purge: {
                enabled: true,
                content: [
                    "layouts/**/*.html",
                    "assets/react/*/src/**/*.tsx",
                    "themes/vtec/layouts/**/*.html",
                ]
            },
            darkMode: false,
            theme: {
                fontFamily: {
                    "mono": ["JetBrains Mono", "mono"],
                },
                extend: {
                    flex: {
                        "2": "2 2 0%",
                        "3": "3 3 0%",
                        "4": "4 4 0%",
                        "5": "5 5 0%",
                        "6": "6 6 0%",
                        "7": "7 7 0%",
                        "8": "8 8 0%",
                        "9": "9 9 0%",
                    },
                    // Add custom colors to Tailwind CSS
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
                    typography: theme => {
                        return {
                            DEFAULT: {
                                css: {
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
                                    p: {code: {backgroundColor: theme("colors.bg3.DEFAULT")}},
                                    div: {pre: {backgroundColor: theme("colors.bg1.DEFAULT") + " !important"}},
                                    pre: {backgroundColor: theme("colors.bg1.DEFAULT")},
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
        },
        autoprefixer: {}
    }
}
