#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const config = require('./config');

// Load campaigns
const campaigns = config.loadCampaigns();

// Create readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n📋 Copy Campaign\n');
console.log('Available campaigns to copy:\n');

campaigns.forEach((campaign, index) => {
    console.log(`  ${index + 1}. ${campaign.name} (${campaign.slug})`);
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    try {
        // Select source campaign
        const sourceAnswer = await askQuestion('\nSelect campaign to copy (1-' + campaigns.length + '): ');
        const sourceIndex = parseInt(sourceAnswer) - 1;

        if (isNaN(sourceIndex) || sourceIndex < 0 || sourceIndex >= campaigns.length) {
            console.error('❌ Invalid selection');
            rl.close();
            process.exit(1);
        }

        const sourceCampaign = campaigns[sourceIndex];
        console.log(`\n✅ Selected: ${sourceCampaign.name}`);

        // Get new campaign details
        const newSlug = await askQuestion('\nEnter new campaign slug (e.g., starter-v4): ');

        if (!newSlug || newSlug.trim() === '') {
            console.error('❌ Slug cannot be empty');
            rl.close();
            process.exit(1);
        }

        // Check if slug already exists
        if (campaigns.find(c => c.slug === newSlug.trim())) {
            console.error('❌ Campaign with this slug already exists');
            rl.close();
            process.exit(1);
        }

        const newName = await askQuestion('Enter new campaign name (e.g., Starter V4): ');
        const newDescription = await askQuestion('Enter description (optional): ');

        rl.close();

        // Copy directory
        const srcPath = config.getSrcPath();
        const sourceDir = path.join(srcPath, sourceCampaign.slug);
        const targetDir = path.join(srcPath, newSlug.trim());

        if (!fs.existsSync(sourceDir)) {
            console.error(`❌ Source directory not found: ${sourceDir}`);
            process.exit(1);
        }

        if (fs.existsSync(targetDir)) {
            console.error(`❌ Target directory already exists: ${targetDir}`);
            process.exit(1);
        }

        console.log(`\n📁 Copying ${sourceDir} to ${targetDir}...`);
        copyDirectory(sourceDir, targetDir);

        // Update permalinks in HTML files
        updatePermalinks(targetDir, sourceCampaign.slug, newSlug.trim());

        // Add to campaigns.json
        const newCampaign = {
            name: newName.trim() || newSlug.trim(),
            slug: newSlug.trim(),
            description: newDescription.trim() || `Copy of ${sourceCampaign.name}`
        };

        campaigns.push(newCampaign);
        config.saveCampaigns(campaigns);

        console.log('\n✅ Campaign copied successfully!');
        console.log(`\n📂 Directory: src/${newSlug.trim()}/`);
        console.log(`🌐 URL: http://localhost:8080/${newSlug.trim()}/`);
        console.log(`\n💡 Run "npm run dev" to start working on your new campaign\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        rl.close();
        process.exit(1);
    }
}

function copyDirectory(src, dest) {
    fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function updatePermalinks(dir, oldSlug, newSlug) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            updatePermalinks(fullPath, oldSlug, newSlug);
        } else if (entry.name.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');

            // Update permalink in front matter
            const permalinkRegex = new RegExp(`permalink:\\s*/${oldSlug}/`, 'g');
            content = content.replace(permalinkRegex, `permalink: /${newSlug}/`);

            fs.writeFileSync(fullPath, content);
            console.log(`  ✓ Updated permalinks in ${entry.name}`);
        }
    }
}

main();
