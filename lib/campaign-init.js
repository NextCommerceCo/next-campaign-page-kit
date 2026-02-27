#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ELEVENTY_CONFIG = `const { createEleventyConfig } = require('next-campaign-page-kit');

module.exports = createEleventyConfig;
`;

const CAMPAIGNS_JSON = JSON.stringify({ campaigns: [] }, null, 2) + '\n';

const SCRIPTS = {
    'setup': 'campaign-init',
    'start': 'campaign-dev',
    'dev': 'campaign-dev',
    'build': 'eleventy',
    'clone': 'campaign-clone',
    'config': 'campaign-config',
    'compress': 'campaign-compress',
    'compress:preview': 'campaign-compress --preview',
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    console.log('\n🚀 Next Campaign Page Kit — Init\n');

    // package.json scripts
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        pkg.scripts = pkg.scripts || {};
        const missing = Object.entries(SCRIPTS).filter(([k]) => !pkg.scripts[k]);
        if (missing.length > 0) {
            missing.forEach(([k, v]) => { pkg.scripts[k] = v; });
            fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
            console.log(`✅ Added scripts to package.json: ${missing.map(([k]) => k).join(', ')}`);
        } else {
            console.log('ℹ️  Scripts already present in package.json, skipping.');
        }
    } else {
        console.log('⚠️  No package.json found — skipping scripts. Run `npm init -y` first.');
    }

    const eleventyConfigPath = path.join(process.cwd(), '.eleventy.js');
    const campaignsDataPath = path.join(process.cwd(), '_data', 'campaigns.json');

    // .eleventy.js
    if (fs.existsSync(eleventyConfigPath)) {
        const answer = await question('.eleventy.js already exists. Overwrite? (y/N): ');
        if (answer.toLowerCase() === 'y') {
            fs.writeFileSync(eleventyConfigPath, ELEVENTY_CONFIG, 'utf8');
            console.log('✅ Overwrote .eleventy.js');
        } else {
            console.log('⏭️  Skipped .eleventy.js');
        }
    } else {
        fs.writeFileSync(eleventyConfigPath, ELEVENTY_CONFIG, 'utf8');
        console.log('✅ Created .eleventy.js');
    }

    // _data/campaigns.json
    if (!fs.existsSync(campaignsDataPath)) {
        fs.mkdirSync(path.dirname(campaignsDataPath), { recursive: true });
        fs.writeFileSync(campaignsDataPath, CAMPAIGNS_JSON, 'utf8');
        console.log('✅ Created _data/campaigns.json');
    } else {
        console.log('ℹ️  campaigns.json already exists, skipping.');
    }

    rl.close();
    console.log('\n✨ Done! Next steps:');
    console.log('   1. Add campaigns to _data/campaigns.json');
    console.log('   2. Create src/{campaign-slug}/ with your campaign files');
    console.log('   3. Run `campaign-dev` to start the dev server\n');
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    rl.close();
    process.exit(1);
});
