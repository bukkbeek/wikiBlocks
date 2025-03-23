//to run: node generate-index.js

const fs = require('fs');
const path = require('path');

// Base directory where markdown files are stored
const WIKI_DIR = './wiki';

// Output file for the index
const INDEX_FILE = './wiki-index.json';

/**
 * Find all markdown files recursively in a directory
 */
function findMarkdownFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            findMarkdownFiles(filePath, fileList);
        } else if (file.endsWith('.md')) {
            // Convert Windows backslashes to forward slashes for web use
            const webPath = filePath.replace(/\\/g, '/');
            fileList.push(webPath);
        }
    });
    
    return fileList;
}

/**
 * Generate the wiki index file
 */
function generateWikiIndex() {
    try {
        // Check if wiki directory exists
        if (!fs.existsSync(WIKI_DIR)) {
            console.error(`Wiki directory ${WIKI_DIR} does not exist.`);
            return;
        }
        
        // Find all markdown files
        const markdownFiles = findMarkdownFiles(WIKI_DIR);
        
        // Write to index file
        fs.writeFileSync(INDEX_FILE, JSON.stringify(markdownFiles, null, 2));
        
        console.log(`Generated wiki index with ${markdownFiles.length} entries.`);
        console.log(`Index saved to ${INDEX_FILE}`);
    } catch (error) {
        console.error('Error generating wiki index:', error);
    }
}

// Run the generator
generateWikiIndex();