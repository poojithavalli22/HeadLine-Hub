// API Configuration
const API_KEY = '33ed88d224324f3ea201fc8f741cba16';
const BASE_URL = 'https://newsapi.org/v2/top-headlines';


// App State
let currentPage = 1;
let currentCategory = 'all';
let currentSearch = '';
let allArticles = [];
let filteredArticles = [];
let nextPageToken = null;
let previousSearches = JSON.parse(localStorage.getItem('previousSearches') || '[]');

// DOM Elements
const newsContainer = document.getElementById('news-container');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const retryBtn = document.getElementById('retry-btn');
const loadMoreContainer = document.getElementById('load-more-container');
const loadMoreBtn = document.getElementById('load-more-btn');
const searchInput = document.getElementById('search-input');
const categoryBtns = document.querySelectorAll('.category-btn');
const currentDateElement = document.getElementById('current-date');
const searchBtn = document.getElementById('search-btn');
const searchSuggestions = document.createElement('div');
searchSuggestions.id = 'search-suggestions';
searchSuggestions.className = 'absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-b-lg shadow-lg max-h-48 overflow-y-auto hidden';
searchInput.parentNode.appendChild(searchSuggestions);

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    setCurrentDate();
    setupEventListeners();
    fetchNews();
});

// Set current date in header
function setCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    currentDateElement.textContent = now.toLocaleDateString('en-US', options);
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    searchInput.addEventListener('focus', showSearchSuggestions);
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
            hideSearchSuggestions();
        }
    });
    
    // Category filtering
    categoryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.dataset.category;
            setActiveCategory(category);
        });
    });
    
    // Load more button
    loadMoreBtn.addEventListener('click', loadMoreArticles);
    
    // Retry button
    retryBtn.addEventListener('click', fetchNews);
}

// Fetch news from API
async function fetchNews(isLoadMore = false) {
    if (!isLoadMore) {
        // Clear previous results immediately
        newsContainer.innerHTML = '';
        allArticles = [];
        filteredArticles = [];
    }
    showLoading(true);
    hideError();
    
    try {
        const params = new URLSearchParams({
            apiKey: API_KEY,
            country: 'us',
            page: currentPage
        });
        
        // Add category filter if not 'all'
        if (currentCategory !== 'all') {
            params.append('category', currentCategory);
        }
        
        // Add search query if exists
        if (currentSearch) {
            // For search, we need to use a different endpoint
            const searchUrl = `https://newsapi.org/v2/everything?apiKey=${API_KEY}&q=${encodeURIComponent(currentSearch)}&page=${currentPage}`;
            const response = await fetch(searchUrl);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'ok' && data.articles) {
                if (!isLoadMore) {
                    allArticles = data.articles;
                } else {
                    allArticles = [...allArticles, ...data.articles];
                }
                
                filteredArticles = [...allArticles];
                displayNews();
                
                // Show/hide load more button based on total results
                if (data.totalResults > allArticles.length) {
                    showLoadMore(true);
                } else {
                    showLoadMore(false);
                }
            } else {
                throw new Error(data.message || 'Failed to fetch news');
            }
        } else {
            // Use top-headlines endpoint for category filtering
            const response = await fetch(`${BASE_URL}?${params}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            
            const data = await response.json();
            
            if (data.status === 'ok' && data.articles) {
                if (!isLoadMore) {
                    allArticles = data.articles;
                } else {
                    allArticles = [...allArticles, ...data.articles];
                }
                
                filteredArticles = [...allArticles];
                displayNews();
                
                // Show/hide load more button based on total results
                if (data.totalResults > allArticles.length) {
                    showLoadMore(true);
                } else {
                    showLoadMore(false);
                }
            } else {
                throw new Error(data.message || 'Failed to fetch news');
            }
        }
    } catch (error) {
        console.error('Error fetching news:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Display news articles
function displayNews() {
    if (filteredArticles.length === 0) {
        newsContainer.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-search text-4xl text-gray-400 mb-4"></i>
                <h3 class="text-xl font-semibold text-gray-900 mb-2">No articles found</h3>
                <p class="text-gray-600">Try adjusting your search or category filter.</p>
            </div>
        `;
        return;
    }
    
    const newsHTML = filteredArticles.map(article => createNewsCard(article)).join('');
    
    if (currentPage === 1) {
        newsContainer.innerHTML = newsHTML;
    } else {
        newsContainer.innerHTML += newsHTML;
    }
}

// Create news card HTML
function createNewsCard(article) {
    const imageUrl = article.urlToImage || 'https://via.placeholder.com/400x250?text=No+Image';
    const publishedDate = new Date(article.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `
        <article class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div class="relative">
                <img src="${imageUrl}" 
                     alt="${article.title}" 
                     class="w-full h-48 object-cover"
                     onerror="this.src='https://via.placeholder.com/400x250?text=No+Image'">
                ${article.source && article.source.name ? `
                    <div class="absolute top-3 left-3">
                        <span class="bg-primary text-white px-2 py-1 rounded-full text-xs font-medium">
                            ${article.source.name}
                        </span>
                    </div>
                ` : ''}
            </div>
            
            <div class="p-6">
                <div class="flex items-center text-sm text-gray-500 mb-3">
                    <i class="fas fa-newspaper mr-2"></i>
                    <span>${article.source ? article.source.name : 'Unknown Source'}</span>
                    <span class="mx-2">•</span>
                    <i class="fas fa-clock mr-1"></i>
                    <span>${publishedDate}</span>
                </div>
                
                <h3 class="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
                    ${article.title}
                </h3>
                
                <p class="text-gray-600 text-sm mb-4 line-clamp-3">
                    ${article.description || 'No description available.'}
                </p>
                
                <div class="flex justify-between items-center">
                    <a href="${article.url}" 
                       target="_blank" 
                       rel="noopener noreferrer"
                       class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                        Read More
                    </a>
                    
                    ${article.author ? `
                        <span class="text-xs text-gray-500">
                            <i class="fas fa-user mr-1"></i>
                            ${article.author}
                        </span>
                    ` : ''}
                </div>
            </div>
        </article>
    `;
}

// Handle search
function handleSearch() {
    currentSearch = searchInput.value.trim();
    if (currentSearch) {
        // Save to previous searches
        previousSearches = previousSearches.filter(s => s !== currentSearch);
        previousSearches.unshift(currentSearch);
        if (previousSearches.length > 10) previousSearches = previousSearches.slice(0, 10);
        localStorage.setItem('previousSearches', JSON.stringify(previousSearches));
    }
    currentPage = 1;
    // Remove highlight from all category buttons
    categoryBtns.forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-white');
        btn.classList.add('bg-gray-100', 'text-gray-700');
    });
    fetchNews();
    hideSearchSuggestions();
}

// Set active category
function setActiveCategory(category) {
    currentCategory = category;
    currentPage = 1;
    // Clear search input
    searchInput.value = '';
    currentSearch = '';
    // Update active button
    categoryBtns.forEach(btn => {
        btn.classList.remove('active', 'bg-primary', 'text-white');
        btn.classList.add('bg-gray-100', 'text-gray-700');
    });
    const activeBtn = document.querySelector(`[data-category="${category}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'bg-primary', 'text-white');
        activeBtn.classList.remove('bg-gray-100', 'text-gray-700');
    }
    fetchNews();
}

// Filter articles (for client-side filtering if needed)
function filterArticles() {
    // This function can be used for additional client-side filtering
    // Currently, filtering is handled by the API
    displayNews();
}

// Load more articles
function loadMoreArticles() {
    currentPage++;
    fetchNews(true);
}

// Utility functions
function showLoading(show) {
    loadingElement.classList.toggle('hidden', !show);
}

function showError(message) {
    errorElement.classList.remove('hidden');
    if (message) {
        errorElement.querySelector('p').textContent = message;
    } else {
        errorElement.querySelector('p').textContent = 'Unable to load news articles. Please try again later.';
    }
}

function hideError() {
    errorElement.classList.add('hidden');
}

function showLoadMore(show) {
    loadMoreContainer.classList.toggle('hidden', !show);
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Add CSS for line clamping
const style = document.createElement('style');
style.textContent = `
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
    .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }
`;
document.head.appendChild(style);

function showSearchSuggestions() {
    if (previousSearches.length === 0) {
        hideSearchSuggestions();
        return;
    }
    searchSuggestions.innerHTML = previousSearches.map(s => `<div class="px-4 py-2 cursor-pointer hover:bg-gray-100">${s}</div>`).join('');
    searchSuggestions.classList.remove('hidden');
    Array.from(searchSuggestions.children).forEach((child, idx) => {
        child.addEventListener('mousedown', (e) => {
            e.preventDefault();
            searchInput.value = previousSearches[idx];
            handleSearch();
        });
    });
}

function hideSearchSuggestions() {
    searchSuggestions.classList.add('hidden');
} 