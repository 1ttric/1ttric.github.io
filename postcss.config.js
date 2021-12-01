module.exports = {
    plugins: [
        require("postcss-import-url")({modernBrowser: true}),
        require("tailwindcss"),
        require("autoprefixer"),
    ]
}
