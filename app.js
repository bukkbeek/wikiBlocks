// Wiki data structure to hold all entries
const wikiData = {
    entries: {},
    categories: {},
    loaded: false
};

/**
 * Initialize the wiki application
 */
async function initWiki() {
    try {
        // 1. First load the index file that contains the list of all markdown files
        await loadWikiIndex();

        // 2. Build the navigation menu
        buildNavigation();

        // 3. Set up navigation event handlers
        setupEventHandlers();

        // 4. Check for hash in URL to load specific entry
        handleUrlHash();

        // Load first entry if none specified in URL
        if (!window.location.hash && Object.keys(wikiData.entries).length > 0) {
            const firstEntryId = Object.keys(wikiData.entries)[0];
            loadEntry(firstEntryId);
        }
    } catch (error) {
        console.error('Failed to initialize wiki:', error);
        document.getElementById('nav-container').innerHTML = `
            <div class="nav-loading error">
                Error loading wiki data. Please check the console for details.
            </div>
        `;
    }
}

/**
 * Load the wiki index file that contains paths to all markdown files
 */
async function loadWikiIndex() {
    try {
        const response = await fetch('wiki-index.json');
        if (!response.ok) {
            throw new Error(`Failed to load wiki index: ${response.status} ${response.statusText}`);
        }

        const indexData = await response.json();

        // Load all markdown files listed in the index
        const loadPromises = indexData.map(filePath => loadMarkdownFile(filePath));
        await Promise.all(loadPromises);

        wikiData.loaded = true;
        return true;
    } catch (error) {
        console.error('Error loading wiki index:', error);
        return false;
    }
}

/**
 * Load and parse a markdown file
 */
async function loadMarkdownFile(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`Failed to load markdown file: ${response.status} ${response.statusText}`);
        }

        const markdownContent = await response.text();
        parseMarkdownEntry(markdownContent, filePath);
    } catch (error) {
        console.error(`Error loading markdown file ${filePath}:`, error);
    }
}

/**
 * Parse a markdown file with front matter
 */
function parseMarkdownEntry(markdownContent, filePath) {
    // Check if the markdown has front matter
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = markdownContent.match(frontMatterRegex);

    if (!match) {
        console.error(`File ${filePath} doesn't have proper front matter`);
        return;
    }

    // Parse the front matter (YAML)
    const frontMatter = jsyaml.load(match[1]);
    const markdownBody = match[2];

    if (!frontMatter.id || !frontMatter.category) {
        console.error(`File ${filePath} is missing required front matter fields (id, category)`);
        return;
    }

    // Store the entry in our data structure
    const entry = {
        id: frontMatter.id,
        category: frontMatter.category,
        subcategory: frontMatter.subcategory || null,
        title: frontMatter.title || frontMatter.id,
        image: frontMatter.image || null,
        stats: frontMatter.stats || {},
        content: markdownBody,
        path: filePath
    };

    // Add to entries
    wikiData.entries[entry.id] = entry;

    // Add to categories structure
    if (!wikiData.categories[entry.category]) {
        wikiData.categories[entry.category] = {
            name: entry.category,
            subcategories: {},
            entries: {}
        };
    }

    if (entry.subcategory) {
        if (!wikiData.categories[entry.category].subcategories[entry.subcategory]) {
            wikiData.categories[entry.category].subcategories[entry.subcategory] = {
                name: entry.subcategory,
                entries: {}
            };
        }
        wikiData.categories[entry.category].subcategories[entry.subcategory].entries[entry.id] = entry;
    } else {
        wikiData.categories[entry.category].entries[entry.id] = entry;
    }
}

/**
 * Build the navigation menu based on loaded data
 */
function buildNavigation() {
    const navContainer = document.getElementById('nav-container');

    if (!wikiData.loaded || Object.keys(wikiData.categories).length === 0) {
        navContainer.innerHTML = '<div class="nav-loading">No wiki entries found.</div>';
        return;
    }

    let navHTML = '';

    // Sort categories alphabetically
    const sortedCategories = Object.keys(wikiData.categories).sort();

    for (const categoryKey of sortedCategories) {
        const category = wikiData.categories[categoryKey];

        navHTML += `
            <div class="nav-category">
                <div class="nav-category-header">
                    ${category.name}
                    <span>+</span>
                </div>
                <div class="nav-category-items">
        `;

        // Add subcategories if any
        const subcategories = Object.keys(category.subcategories).sort();

        for (const subcategoryKey of subcategories) {
            const subcategory = category.subcategories[subcategoryKey];

            navHTML += `
                <div class="nav-category">
                    <div class="nav-category-header">
                        ${subcategory.name}
                        <span>+</span>
                    </div>
                    <div class="nav-category-items">
            `;

            // Add entries in this subcategory
            const entries = Object.values(subcategory.entries).sort((a, b) => a.title.localeCompare(b.title));

            for (const entry of entries) {
                navHTML += `
                    <div class="nav-item" data-entry="${entry.id}">
                        ${entry.title}
                    </div>
                `;
            }

            navHTML += `
                    </div>
                </div>
            `;
        }

        // Add entries directly in this category (not in subcategories)
        const directEntries = Object.values(category.entries).sort((a, b) => a.title.localeCompare(b.title));

        for (const entry of directEntries) {
            navHTML += `
                <div class="nav-item" data-entry="${entry.id}">
                    ${entry.title}
                </div>
            `;
        }

        navHTML += `
                </div>
            </div>
        `;
    }

    navContainer.innerHTML = navHTML;
}

/**
 * Set up event handlers for navigation
 */
function setupEventHandlers() {
    // Toggle navigation categories
    document.querySelectorAll('.nav-category-header').forEach(header => {
        header.addEventListener('click', function(event) {
            // Prevent event bubbling to parent categories
            event.stopPropagation();

            const category = this.parentElement;
            category.classList.toggle('open');

            // Update the + or - icon
            const icon = this.querySelector('span');
            icon.textContent = category.classList.contains('open') ? '-' : '+';
        });
    });

    // Set up navigation item click handlers
    document.querySelectorAll('.nav-item[data-entry]').forEach(item => {
        item.addEventListener('click', () => {
            const entryId = item.getAttribute('data-entry');
            loadEntry(entryId);

            // Update URL hash
            window.location.hash = entryId;
        });
    });

    // Listen for hash changes in the URL
    window.addEventListener('hashchange', handleUrlHash);
}

/**
 * Handle URL hash to load specific entry
 */
function handleUrlHash() {
    if (window.location.hash) {
        const entryId = window.location.hash.substring(1);
        if (wikiData.entries[entryId]) {
            loadEntry(entryId);
        }
    }
}

/**
 * Load and display a wiki entry
 */
function loadEntry(entryId) {
    const entry = wikiData.entries[entryId];

    if (!entry) {
        console.error(`Entry with ID ${entryId} not found`);
        return;
    }

    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(navItem => {
        navItem.classList.remove('active');
    });

    // Add active class to selected nav item
    const navItem = document.querySelector(`.nav-item[data-entry="${entryId}"]`);
    if (navItem) {
        navItem.classList.add('active');

        // Open parent categories
        let parent = navItem.parentElement;
        while (parent && parent.classList.contains('nav-category-items')) {
            parent.parentElement.classList.add('open');
            const icon = parent.parentElement.querySelector('.nav-category-header span');
            if (icon) icon.textContent = '-';
            parent = parent.parentElement.parentElement;
        }
    }

    // Create breadcrumb
    let breadcrumb = `${entry.category}`;
    if (entry.subcategory) {
        breadcrumb += ` > ${entry.subcategory}`;
    }
    breadcrumb += ` > <span>${entry.title}</span>`;

    // Render content
    const contentContainer = document.getElementById('content-container');
    contentContainer.innerHTML = `
        <div class="wiki-content">
            <div class="breadcrumb">
                ${breadcrumb}
            </div>

            <div class="markdown-content">
                ${marked.parse(entry.content)}
            </div>
        </div>
    `;

    // Render info panel
    const infoContainer = document.getElementById('info-container');

    // Create stats table HTML
    let statsTableHTML = '';
    if (entry.stats && Object.keys(entry.stats).length > 0) {
        statsTableHTML = '<table class="stats-table">';

        for (const [stat, value] of Object.entries(entry.stats)) {
            // Convert stat name to title case
            const formattedStat = stat.replace(/([A-Z])/g, ' $1')
                .replace(/^./, str => str.toUpperCase())
                .replace(/([a-z])([A-Z])/g, '$1 $2');

            statsTableHTML += `
                <tr>
                    <th>${formattedStat}</th>
                    <td>${value}</td>
                </tr>
            `;
        }

        statsTableHTML += '</table>';
    }

const imagePath = entry.image ? `wiki/${entry.category}/${entry.subcategory ? entry.subcategory + '/' : ''}${entry.image}` : null;

    infoContainer.innerHTML = `
        <div class="wiki-info">
            ${imagePath ?
                `<img src="${imagePath}" alt="${entry.title}" class="wiki-image">` :
                `<div class="wiki-image" style="background-color: var(--bg-light); display: flex; align-items: center; justify-content: center;">${entry.title[0]}</div>`
            }

            <div class="info-section">
                ${statsTableHTML}
            </div>
        </div>
    `;
}

// Load required JS libraries (marked and js-yaml) before initializing the app
document.addEventListener('DOMContentLoaded', () => {
    const requiredLibs = [
        { name: 'marked', path: 'lib/marked.min.js' },
        { name: 'jsyaml', path: 'lib/js-yaml.min.js' }
    ];

    let libsLoaded = 0;

    requiredLibs.forEach(lib => {
        if (window[lib.name]) {
            libsLoaded++;
            if (libsLoaded === requiredLibs.length) {
                initWiki();
            }
        } else {
            const script = document.createElement('script');
            script.src = lib.path;
            script.onload = () => {
                libsLoaded++;
                if (libsLoaded === requiredLibs.length) {
                    initWiki();
                }
            };
            document.head.appendChild(script);
        }
    });

    // Add search functionality
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filterNavigation(searchTerm);
    });

    function filterNavigation(searchTerm) {
        document.querySelectorAll('.nav-item').forEach(item => {
            const entryId = item.getAttribute('data-entry');
            const entry = wikiData.entries[entryId];
            const title = entry.title.toLowerCase();
            if (title.includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }
});
