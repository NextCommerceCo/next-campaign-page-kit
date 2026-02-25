/**
 * Campaign Builder Eleventy Plugin
 *
 * Provides filters and configuration for campaign-based static sites.
 */

module.exports = function campaignBuilderPlugin(eleventyConfig, options = {}) {
    const projectConfig = require('./config');

    // Load campaigns data from the consumer project's _data/campaigns.json
    const campaignsList = projectConfig.loadCampaigns(options.campaignsPath);

    // ==========================================
    // Passthrough Copy for Campaign Assets
    // ==========================================

    campaignsList.forEach(campaign => {
        // Map src/[campaign]/assets/* to [campaign]/* in output
        eleventyConfig.addPassthroughCopy({ [`src/${campaign.slug}/assets`]: campaign.slug });
    });

    // ==========================================
    // Collections
    // ==========================================

    // Create collections for each campaign
    campaignsList.forEach(campaign => {
        eleventyConfig.addCollection(campaign.slug, function (collection) {
            return collection.getFilteredByGlob(`src/${campaign.slug}/**/*.html`);
        });
    });

    // Create collection for all campaigns
    eleventyConfig.addCollection("allCampaigns", function () {
        return campaignsList;
    });

    // ==========================================
    // Filters
    // ==========================================

    // campaign_asset filter - Resolves asset paths to campaign directory
    eleventyConfig.addFilter("campaign_asset", function (filename) {
        if (!filename) return "";
        // If filename is a URL, return it as is
        if (filename.match(/^(http|https):\/\//)) return filename;

        // Get the current page URL from the context
        let url = this.page?.url || this.ctx?.page?.url;
        if (!url) return filename; // Fallback

        // Extract campaign slug from URL
        const parts = url.split('/').filter(Boolean);
        if (parts.length > 0) {
            const campaignSlug = parts[0];
            // Return absolute path to asset
            return `/${campaignSlug}/${filename}`;
        }

        return filename;
    });

    // campaign_link filter - Generates clean URLs for pages
    eleventyConfig.addFilter("campaign_link", function (filename) {
        if (!filename) return "";
        // If filename starts with #, return as is (anchor link)
        if (filename.startsWith("#")) return filename;
        // If filename is already an absolute path starting with /, return as is
        if (filename.startsWith("/")) return filename;
        // If filename is a URL, return it as is
        if (filename.match(/^(http|https):\/\//)) return filename;

        // Get the current page URL from the context
        let url = this.page?.url || this.ctx?.page?.url;
        if (!url) return filename; // Fallback

        const parts = url.split('/').filter(Boolean);
        if (parts.length > 0) {
            const campaignSlug = parts[0];

            // Remove .html extension and add trailing slash
            let cleanFilename = filename.replace(/\.html$/, '');

            // If it's just 'index', make it empty for root
            if (cleanFilename === 'index') {
                return `/${campaignSlug}/`;
            }

            return `/${campaignSlug}/${cleanFilename}/`;
        }

        return filename;
    });


    // ==========================================
    // Computed Data
    // ==========================================

    eleventyConfig.addGlobalData("eleventyComputed", {
        layout: data => {
            // Extract campaign slug from page URL
            const url = data.page?.url || '';
            const parts = url.split('/').filter(Boolean);

            if (parts.length > 0) {
                const campaignSlug = parts[0];

                // Use page_layout if specified in frontmatter, otherwise default to base.html
                const layoutFile = data.page_layout || 'base.html';

                // Return full path: campaign/_layouts/layoutFile
                return `${campaignSlug}/_layouts/${layoutFile}`;
            }

            // Fallback
            return null;
        },
        campaign: data => {
            // Extract campaign slug from page URL
            const url = data.page?.url || '';
            const parts = url.split('/').filter(Boolean);

            if (parts.length > 0) {
                const campaignSlug = parts[0];
                // Find and return the full campaign object
                return campaignsList.find(c => c.slug === campaignSlug);
            }

            return null;
        }
    });

    // ==========================================
    // Custom campaign_include tag
    // ==========================================

    eleventyConfig.addLiquidTag("campaign_include", function (liquidEngine) {
        return {
            parse: function (tagToken, remainingTokens) {
                this.args = tagToken.args;
            },

            render: function* (ctx, emitter) {
                // Get page URL from context
                const page = ctx.get(['page']);
                const url = page ? page.url : '';

                if (!url) return;

                const parts = url.split('/').filter(Boolean);
                // If we are in a campaign, parts[0] is the slug
                if (parts.length === 0) return;

                const campaignSlug = parts[0];

                // Parse arguments: expect first argument to be the filename (quoted string)
                const match = this.args.match(/^\s*(['"])([^'"]+)\1/);
                if (!match) return;
                const filename = match[2];

                // Construct path relative to campaign
                const fullPath = `${campaignSlug}/_includes/${filename}`;

                // Parse arguments manually
                let includeCtx = {};

                // Use simplified 'key=value' regex
                const userArgsRegex = /(\w+)=("[^"]*"|'[^']*'|[^\s]+)/g;
                let argMatch;

                while ((argMatch = userArgsRegex.exec(this.args)) !== null) {
                    const key = argMatch[1];
                    const rawValue = argMatch[2];

                    let val;
                    // Evaluate the value
                    if (rawValue.startsWith('"') || rawValue.startsWith("'")) {
                        val = rawValue.slice(1, -1);
                    } else if (rawValue === 'true') {
                        val = true;
                    } else if (rawValue === 'false') {
                        val = false;
                    } else {
                        // Variable lookup - use yield to evaluate
                        val = yield liquidEngine.evalValue(rawValue, ctx);
                    }
                    includeCtx[key] = val;
                }

                // Render using the liquid engine internals to preserve scope chain
                try {
                    // 1. Parse the file to get templates
                    // liquidEngine.parseFile returns a Promise, allow yield to await it if needed by LiquidJS internals
                    const templates = yield liquidEngine.parseFile(fullPath);

                    // 2. Push new scope with include args
                    ctx.push(includeCtx);

                    // 3. Render templates into the emitter
                    // renderTemplates returns things we can yield
                    yield liquidEngine.renderer.renderTemplates(templates, ctx, emitter);

                } catch (e) {
                    console.error('Error rendering campaign_include:', fullPath, e);
                } finally {
                    // 4. Pop scope
                    ctx.pop();
                }
            }

        };
    });
};
