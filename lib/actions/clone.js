#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../logger');

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
            const re = new RegExp(`permalink:\\s*/${oldSlug}/`, 'g');
            content = content.replace(re, `permalink: /${newSlug}/`);
            fs.writeFileSync(fullPath, content);
            logger.debug(`updated permalinks in ${entry.name}`);
        }
    }
}

async function runClone(campaigns) {
    const { select, text, isCancel, log, outro } = await import('@clack/prompts');

    const sourceSlug = await select({
        message: 'Select campaign to clone',
        options: campaigns.map(c => ({
            value: c.slug,
            label: c.name,
            hint: `/${c.slug}/`,
        })),
    });
    if (isCancel(sourceSlug)) process.exit(0);

    const sourceCampaign = campaigns.find(c => c.slug === sourceSlug);

    const newSlug = await text({
        message: 'New campaign slug',
        placeholder: 'e.g. starter-v4',
        validate: (v) => {
            if (!v.trim()) return 'Slug cannot be empty';
            if (campaigns.find(c => c.slug === v.trim())) return 'A campaign with this slug already exists';
        },
    });
    if (isCancel(newSlug)) process.exit(0);

    const newName = await text({
        message: 'New campaign name',
        placeholder: `e.g. ${sourceCampaign.name} V2`,
    });
    if (isCancel(newName)) process.exit(0);

    const newDescription = await text({
        message: 'Description',
        placeholder: 'optional',
    });
    if (isCancel(newDescription)) process.exit(0);

    const srcPath = config.getSrcPath();
    const sourceDir = path.join(srcPath, sourceCampaign.slug);
    const targetDir = path.join(srcPath, newSlug.trim());

    if (!fs.existsSync(sourceDir)) {
        logger.error(`source directory not found: ${sourceDir}`);
        process.exit(1);
    }

    if (fs.existsSync(targetDir)) {
        logger.error(`target directory already exists: ${targetDir}`);
        process.exit(1);
    }

    copyDirectory(sourceDir, targetDir);
    updatePermalinks(targetDir, sourceCampaign.slug, newSlug.trim());

    const newCampaign = {
        name: newName.trim() || newSlug.trim(),
        slug: newSlug.trim(),
        description: newDescription.trim() || `Copy of ${sourceCampaign.name}`,
    };
    campaigns.push(newCampaign);
    config.saveCampaigns(campaigns);

    log.success(`cloned ${sourceCampaign.slug} → ${newSlug.trim()}`);
    outro(`Run npm run dev to start working on ${newSlug.trim()}.`);
}

async function main() {
    const { intro } = await import('@clack/prompts');
    const campaigns = config.loadCampaigns();
    intro('Next Campaign Page Kit — clone campaign');
    await runClone(campaigns);
}

if (require.main === module) {
    main().catch(err => {
        logger.error(err.message);
        process.exit(1);
    });
}

module.exports = { runClone };
