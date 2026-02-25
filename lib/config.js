/**
 * Shared Configuration for Campaign Builder
 *
 * Provides default paths and configuration resolution for CLI tools and plugins.
 */

const path = require('path');
const fs = require('fs');

/**
 * Get the project root directory (current working directory)
 */
function getProjectRoot() {
    return process.cwd();
}

/**
 * Get the path to campaigns.json
 */
function getCampaignsPath(customPath) {
    if (customPath) return path.resolve(customPath);
    return path.join(getProjectRoot(), '_data', 'campaigns.json');
}

/**
 * Get the source directory path
 */
function getSrcPath(customPath) {
    if (customPath) return path.resolve(customPath);
    return path.join(getProjectRoot(), 'src');
}

/**
 * Get the output directory path
 */
function getOutputPath(customPath) {
    if (customPath) return path.resolve(customPath);
    return path.join(getProjectRoot(), '_site');
}

/**
 * Load campaigns data from campaigns.json
 */
function loadCampaigns(customPath) {
    const campaignsPath = getCampaignsPath(customPath);

    if (!fs.existsSync(campaignsPath)) {
        throw new Error(`Campaigns file not found: ${campaignsPath}`);
    }

    const data = JSON.parse(fs.readFileSync(campaignsPath, 'utf8'));
    return data.campaigns || [];
}

/**
 * Save campaigns data to campaigns.json
 */
function saveCampaigns(campaigns, customPath) {
    const campaignsPath = getCampaignsPath(customPath);
    const data = { campaigns };
    fs.writeFileSync(campaignsPath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Get full configuration object
 */
function getConfig(options = {}) {
    return {
        projectRoot: getProjectRoot(),
        campaignsPath: getCampaignsPath(options.campaignsPath),
        srcPath: getSrcPath(options.srcPath),
        outputPath: getOutputPath(options.outputPath),
        ...options
    };
}

module.exports = {
    getProjectRoot,
    getCampaignsPath,
    getSrcPath,
    getOutputPath,
    loadCampaigns,
    saveCampaigns,
    getConfig
};
