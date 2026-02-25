#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const config = require('./config');

// Load campaigns from config
const campaigns = config.loadCampaigns();

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n🚀 Next Campaign Development Server\n');
console.log('Available campaigns:\n');

campaigns.forEach((campaign, index) => {
    console.log(`  ${index + 1}. ${campaign.name} (/${campaign.slug}/)`);
    if (campaign.description) {
        console.log(`     ${campaign.description}`);
    }
    console.log('');
});

rl.question('Select a campaign (1-' + campaigns.length + '): ', (answer) => {
    const selection = parseInt(answer);

    if (isNaN(selection) || selection < 1 || selection > campaigns.length) {
        console.error('❌ Invalid selection');
        rl.close();
        process.exit(1);
    }

    const selectedCampaign = campaigns[selection - 1];
    console.log(`\n✅ Starting dev server for: ${selectedCampaign.name}`);
    console.log(`📂 Campaign directory: src/${selectedCampaign.slug}/\n`);

    rl.close();

    // Start Eleventy dev server with piped output to detect actual server URL
    const { spawn } = require('child_process');

    const eleventy = spawn('npx', ['eleventy', '--serve'], {
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: process.cwd()
    });

    let browserOpened = false;

    const handleOutput = (data) => {
        const text = data.toString();
        process.stdout.write(text);

        // Detect the local server URL from Eleventy's output
        if (!browserOpened) {
            const match = text.match(/https?:\/\/localhost:\d+/);
            if (match) {
                browserOpened = true;
                const serverUrl = match[0];
                const url = `${serverUrl}/${selectedCampaign.slug}/`;
                console.log(`\n🌐 Campaign URL: ${url}\n`);

                const openCommand = process.platform === 'darwin' ? 'open' :
                    process.platform === 'win32' ? 'start' : 'xdg-open';

                try {
                    execSync(`${openCommand} ${url}`, { stdio: 'ignore' });
                } catch (error) {
                    console.log(`💡 Open your browser to: ${url}\n`);
                }
            }
        }
    };

    eleventy.stdout.on('data', handleOutput);
    eleventy.stderr.on('data', handleOutput);

    // Handle process termination
    process.on('SIGINT', () => {
        eleventy.kill();
        process.exit();
    });
});
