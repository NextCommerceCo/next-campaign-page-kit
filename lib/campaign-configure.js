#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const config = require('./config');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    try {
        // Load campaigns
        const campaignsData = { campaigns: config.loadCampaigns() };

        console.log('\n📦 Campaign Configuration Tool\n');
        console.log('Available campaigns:');
        campaignsData.campaigns.forEach((campaign, index) => {
            console.log(`  ${index + 1}. ${campaign.name} (${campaign.slug})`);
        });

        const campaignIndex = await question('\nSelect campaign number: ');
        const selectedCampaign = campaignsData.campaigns[parseInt(campaignIndex) - 1];

        if (!selectedCampaign) {
            console.error('❌ Invalid campaign selection');
            process.exit(1);
        }

        console.log(`\n✅ Selected: ${selectedCampaign.name}`);

        const apiKey = await question('\nEnter API key: ');

        if (!apiKey || apiKey.trim() === '') {
            console.error('❌ API key cannot be empty');
            process.exit(1);
        }

        // Update config.js
        const srcPath = config.getSrcPath();
        const configPath = path.join(srcPath, selectedCampaign.slug, 'assets', 'config.js');

        if (!fs.existsSync(configPath)) {
            console.error(`❌ Config file not found: ${configPath}`);
            process.exit(1);
        }

        let configContent = fs.readFileSync(configPath, 'utf8');

        // Replace the apiKey value
        configContent = configContent.replace(
            /apiKey:\s*['"].*?['"]/,
            `apiKey: '${apiKey.trim()}'`
        );

        fs.writeFileSync(configPath, configContent, 'utf8');

        console.log(`\n✅ API key configured successfully!`);
        console.log(`📝 Updated: src/${selectedCampaign.slug}/assets/config.js`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

main();
