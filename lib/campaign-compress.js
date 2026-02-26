#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const config = require('./config');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MIN_SAVINGS_BYTES = 1024; // ignore savings smaller than 1 KB

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

function collectImages(dir) {
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...collectImages(fullPath));
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (IMAGE_EXTENSIONS.has(ext)) {
                results.push(fullPath);
            }
        }
    }
    return results;
}

async function compressImage(sharp, filePath, preview = false) {
    const ext = path.extname(filePath).toLowerCase();
    const originalSize = fs.statSync(filePath).size;

    let pipeline = sharp(filePath);

    switch (ext) {
        case '.jpg':
        case '.jpeg':
            pipeline = pipeline.jpeg({ quality: 80, progressive: true });
            break;
        case '.png':
            pipeline = pipeline.png({ compressionLevel: 9, palette: true });
            break;
        case '.webp':
            pipeline = pipeline.webp({ quality: 80 });
            break;
        case '.gif':
            pipeline = pipeline.gif();
            break;
    }

    const compressedBuffer = await pipeline.toBuffer();
    const compressedSize = compressedBuffer.length;

    if (compressedSize >= originalSize || (originalSize - compressedSize) < MIN_SAVINGS_BYTES) {
        return { skipped: true, reason: 'no savings', originalSize, compressedSize: originalSize, bytesSaved: 0 };
    }

    if (!preview) {
        fs.writeFileSync(filePath, compressedBuffer);
    }
    return { skipped: false, reason: null, originalSize, compressedSize, bytesSaved: originalSize - compressedSize };
}

function formatSize(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    if (bytes >= 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return bytes + ' B';
}

function formatSaving(bytes) {
    if (bytes === 0) return '-';
    return '-' + formatSize(bytes);
}

async function main() {
    try {
        let sharp;
        try {
            sharp = require('sharp');
        } catch (e) {
            console.error('❌ The "sharp" package is required but not installed.');
            console.error('   Run: npm install sharp');
            process.exit(1);
        }

        const preview = process.argv.includes('--preview');

        console.log('\n🗜️  Campaign Image Compressor\n');
        if (preview) {
            console.log('👁️  Preview mode — no files will be modified\n');
        }

        const campaigns = config.loadCampaigns();

        console.log('Available campaigns:\n');
        campaigns.forEach((campaign, index) => {
            console.log(`  ${index + 1}. ${campaign.name} (${campaign.slug})`);
        });

        const answer = await question('\nSelect campaign number: ');
        const selectedCampaign = campaigns[parseInt(answer) - 1];

        if (!selectedCampaign) {
            console.error('❌ Invalid campaign selection');
            process.exit(1);
        }

        console.log(`\n✅ Selected: ${selectedCampaign.name}`);

        const srcPath = config.getSrcPath();
        const campaignDir = path.join(srcPath, selectedCampaign.slug);

        if (!fs.existsSync(campaignDir)) {
            console.error(`❌ Campaign directory not found: ${campaignDir}`);
            process.exit(1);
        }

        console.log(`\n🔍 Scanning for images...\n`);

        const imagePaths = collectImages(campaignDir);

        if (imagePaths.length === 0) {
            console.log('ℹ️  No images found in this campaign directory.');
            process.exit(0);
        }


        const rows = [];
        let totalOriginal = 0;
        let totalCompressed = 0;
        let totalBytesSaved = 0;
        let processedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const filePath of imagePaths) {
            const relativePath = path.relative(process.cwd(), filePath);
            try {
                const result = await compressImage(sharp, filePath, preview);
                totalOriginal += result.originalSize;
                totalCompressed += result.skipped ? result.originalSize : result.compressedSize;
                totalBytesSaved += result.bytesSaved;
                if (result.skipped) {
                    skippedCount++;
                } else {
                    processedCount++;
                }
                const pct = result.bytesSaved > 0
                    ? ((result.bytesSaved / result.originalSize) * 100).toFixed(1) + '%'
                    : '-';
                if (!result.skipped) {
                    rows.push({
                        file: relativePath,
                        before: formatSize(result.originalSize),
                        after: formatSize(result.compressedSize),
                        saved: formatSaving(result.bytesSaved),
                        pct,
                        status: preview ? '👁️' : '✅',
                    });
                }
            } catch (err) {
                errorCount++;
                rows.push({
                    file: relativePath,
                    before: '-',
                    after: '-',
                    saved: '-',
                    pct: '-',
                    status: '❌',
                    error: err.message,
                });
            }
        }

        if (rows.length === 0) {
            console.log('✅ All images already fully compressed.\n');
            process.exit(0);
        }

        console.log(`✅ Found ${processedCount} image${processedCount !== 1 ? 's' : ''} with potential compression savings.`);
        if (skippedCount > 0) {
            console.log(`⏭️  Found ${skippedCount} image${skippedCount !== 1 ? 's' : ''} already fully compressed.`);
        }
        console.log();

        // Calculate column widths
        const colFile = Math.max(4, ...rows.map(r => r.file.length));
        const colBefore = Math.max(6, ...rows.map(r => r.before.length));
        const colAfter = Math.max(5, ...rows.map(r => r.after.length));
        const colSaved = Math.max(5, ...rows.map(r => r.saved.length));
        const colPct = Math.max(4, ...rows.map(r => r.pct.length));

        const divider = [
            '-'.repeat(colFile + 2),
            '-'.repeat(colBefore + 2),
            '-'.repeat(colAfter + 2),
            '-'.repeat(colSaved + 2),
            '-'.repeat(colPct + 2),
            '-'.repeat(4),
        ].join('+');

        const header = [
            ' ' + 'File'.padEnd(colFile) + ' ',
            ' ' + 'Before'.padEnd(colBefore) + ' ',
            ' ' + 'After'.padEnd(colAfter) + ' ',
            ' ' + 'Saved'.padEnd(colSaved) + ' ',
            ' ' + '%'.padEnd(colPct) + ' ',
            '    ',
        ].join('|');

        console.log(divider);
        console.log(header);
        console.log(divider);

        for (const row of rows) {
            const line = [
                ' ' + row.file.padEnd(colFile) + ' ',
                ' ' + row.before.padEnd(colBefore) + ' ',
                ' ' + row.after.padEnd(colAfter) + ' ',
                ' ' + row.saved.padEnd(colSaved) + ' ',
                ' ' + row.pct.padEnd(colPct) + ' ',
                ' ' + row.status + ' ',
            ].join('|');
            console.log(line);
            if (row.error) {
                console.log(`  ${''.padEnd(colFile + 2)}  ${row.error}`);
            }
        }

        console.log(divider);

        const totalPct = totalOriginal > 0
            ? ((totalBytesSaved / totalOriginal) * 100).toFixed(1) + '%'
            : '-';

        const totalsLine = [
            ' ' + 'TOTAL'.padEnd(colFile) + ' ',
            ' ' + formatSize(totalOriginal).padEnd(colBefore) + ' ',
            ' ' + formatSize(totalCompressed).padEnd(colAfter) + ' ',
            ' ' + formatSaving(totalBytesSaved).padEnd(colSaved) + ' ',
            ' ' + totalPct.padEnd(colPct) + ' ',
            '    ',
        ].join('|');

        console.log(totalsLine);
        console.log(divider);
        if (preview) {
            console.log('\nℹ️  Preview only — run without preview to apply changes.');
        }
        console.log();

        if (errorCount > 0) {
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

main();
