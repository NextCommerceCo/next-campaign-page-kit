const campaignPlugin = require('./lib/campaign-plugin');

/**
 * Creates an Eleventy configuration for Campaign Cart projects.
 *
 * Usage in .eleventy.js:
 *   const { createEleventyConfig } = require('next-campaign-page-kit');
 *   module.exports = createEleventyConfig;
 */
function createEleventyConfig(eleventyConfig) {
    eleventyConfig.ignores.add("README.md");
    eleventyConfig.ignores.add("**/_layouts/**");
    eleventyConfig.ignores.add("**/_includes/**");

    eleventyConfig.addPlugin(campaignPlugin);

    eleventyConfig.setServerOptions({
        domDiff: false
    });

    return {
        dir: {
            input: "src",
            output: "_site",
            includes: ".",
            data: "../_data"
        },
        templateFormats: ["html", "md", "njk", "liquid"]
    };
}

module.exports = {
    campaignPlugin,
    createEleventyConfig,
};
