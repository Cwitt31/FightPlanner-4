const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const type = process.argv[2]; 
const custom = process.argv[3];

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const baseVersion = pkg.version.split('-')[0];

let nextVersion = '';

if (type === 'custom' && custom) {
    nextVersion = custom;
} else if (type === 'alpha' || type === 'beta') {
    try {
        let tagOutput = '';
        try {
            // Get tags, handle potential absence of git or tags
            tagOutput = execSync('git tag -l', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }) || '';
        } catch (err) {
            // Silently ignore git errors, fallback to default (type)1
        }
        
        const tags = tagOutput.split('\n').map(t => t.trim()).filter(t => t.length > 0);
        // Look for tags that match the current base version and type (e.g., v4.0.0-beta)
        const relevantTags = tags.filter(t => t.startsWith(`v${baseVersion}-${type}`));
        
        let maxNum = 0;
        relevantTags.forEach(tag => {
            const regex = new RegExp(`${type}(\\d+)`);
            const match = tag.match(regex);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) maxNum = num;
            }
        });
        
        nextVersion = `${baseVersion}-${type}${maxNum + 1}`;
    } catch (e) {
        nextVersion = `${baseVersion}-${type}1`;
    }
} else {
    process.exit(0);
}

if (nextVersion) {
    pkg.version = nextVersion;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log(nextVersion);
}
