const repoList = document.getElementById('repo-list');
const repoCount = document.getElementById('repo-count');
const statusText = document.getElementById('status');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const retryButton = document.getElementById('retry-button');
const searchInput = document.getElementById('repo-search');
const sortSelect = document.getElementById('repo-sort');

let repositories = [];

function formatDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    dateTime: date.toISOString(),
    label: new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date),
    timestamp: date.getTime()
  };
}

function safeRepositoryUrl(value, fullName) {
  if (typeof value === 'string' && value) {
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        return url.href;
      }
    } catch {
      // Fall back to the repository name when the provided URL is invalid.
    }
  }

  if (typeof fullName === 'string' && /^[^/]+\/[^/]+$/.test(fullName)) {
    return `https://github.com/${fullName.split('/').map(encodeURIComponent).join('/')}`;
  }

  return null;
}

function normalizeRepository(entry, index) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new TypeError(`Repository at position ${index + 1} must be an object.`);
  }

  const nestedRepository = entry.repository || entry.repo;
  const source = nestedRepository
    && typeof nestedRepository === 'object'
    && !Array.isArray(nestedRepository)
    ? nestedRepository
    : entry;
  const owner = typeof source.owner === 'string'
    ? source.owner
    : source.owner?.login || entry.owner_name || '';
  const fullName = source.full_name
    || entry.full_name
    || (typeof source.name === 'string' && source.name.includes('/')
      ? source.name
      : owner && source.name
        ? `${owner}/${source.name}`
        : source.name);

  if (typeof fullName !== 'string' || !fullName.trim()) {
    throw new TypeError(`Repository at position ${index + 1} is missing its name.`);
  }

  const starredAt = formatDate(
    entry.starred_at
      || entry.starredAt
      || entry.stargazedAt
      || entry.starred
      || entry.date
  );
  const stars = Number(source.stargazers_count ?? entry.stargazers_count);

  return {
    name: fullName.trim(),
    description: typeof source.description === 'string' && source.description.trim()
      ? source.description.trim()
      : 'No description provided.',
    language: typeof source.language === 'string' && source.language.trim()
      ? source.language.trim()
      : null,
    url: safeRepositoryUrl(source.html_url || entry.html_url || source.url || entry.url, fullName),
    starredAt,
    stars: Number.isFinite(stars) && stars >= 0 ? stars : null
  };
}

function normalizeRepositories(data) {
  const entries = Array.isArray(data) ? data : data?.events;

  if (!Array.isArray(entries)) {
    throw new TypeError('Expected events.json to contain an array of repositories.');
  }

  return entries.map(normalizeRepository);
}

function createMetaItem(className, text) {
  const item = document.createElement('span');
  item.className = className;
  item.textContent = text;
  return item;
}

function renderRepository(repository) {
  const item = document.createElement('li');
  item.className = 'repo-item';

  const heading = document.createElement('h3');
  heading.className = 'repo-title';
  if (repository.url) {
    const link = document.createElement('a');
    link.className = 'repo-link';
    link.href = repository.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = repository.name;
    heading.appendChild(link);
  } else {
    heading.textContent = repository.name;
  }

  const description = document.createElement('p');
  description.className = 'repo-description';
  description.textContent = repository.description;

  const meta = document.createElement('div');
  meta.className = 'repo-meta';
  if (repository.language) {
    meta.appendChild(createMetaItem('language-tag', repository.language));
  }
  if (repository.stars !== null) {
    meta.appendChild(createMetaItem('star-count', `${repository.stars.toLocaleString()} stars`));
  }

  if (repository.starredAt) {
    const date = document.createElement('time');
    date.className = 'starred-date';
    date.dateTime = repository.starredAt.dateTime;
    date.textContent = `Starred ${repository.starredAt.label}`;
    meta.appendChild(date);
  } else {
    meta.appendChild(createMetaItem('starred-date', 'Star date unavailable'));
  }

  item.append(heading, description, meta);
  return item;
}

function sortRepositories(items) {
  const sorted = [...items];

  if (sortSelect.value === 'name') {
    return sorted.sort((a, b) => a.name.localeCompare(b.name));
  }

  const direction = sortSelect.value === 'oldest' ? 1 : -1;
  return sorted.sort((a, b) => {
    const aDate = a.starredAt?.timestamp;
    const bDate = b.starredAt?.timestamp;

    if (aDate === undefined && bDate === undefined) {
      return a.name.localeCompare(b.name);
    }
    if (aDate === undefined) {
      return 1;
    }
    if (bDate === undefined) {
      return -1;
    }
    return (aDate - bDate) * direction;
  });
}

function renderRepositories() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const filtered = repositories.filter((repository) => (
    `${repository.name} ${repository.description} ${repository.language || ''}`
      .toLocaleLowerCase()
      .includes(query)
  ));
  const visible = sortRepositories(filtered);
  const fragment = document.createDocumentFragment();

  visible.forEach((repository) => fragment.appendChild(renderRepository(repository)));
  repoList.replaceChildren(fragment);
  repoCount.textContent = String(repositories.length);
  repoCount.setAttribute(
    'aria-label',
    `${repositories.length} ${repositories.length === 1 ? 'repository' : 'repositories'}`
  );

  if (repositories.length === 0) {
    statusText.textContent = 'No starred repositories yet. Add entries to events.json to get started.';
  } else if (visible.length === 0) {
    statusText.textContent = 'No repositories match your search.';
  } else if (visible.length !== repositories.length) {
    statusText.textContent = `Showing ${visible.length} of ${repositories.length} starred repositories.`;
  } else {
    const label = repositories.length === 1 ? 'repository' : 'repositories';
    statusText.textContent = `Showing ${repositories.length} starred ${label}.`;
  }
}

async function loadRepositories() {
  errorMessage.hidden = true;
  retryButton.disabled = true;
  statusText.textContent = 'Loading your repositories…';

  try {
    const response = await fetch('events.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}.`);
    }

    const data = await response.json();
    repositories = normalizeRepositories(data);
    renderRepositories();
  } catch (error) {
    console.error('Failed to load stargazer data:', error);
    statusText.textContent = 'Your repository log is unavailable.';
    errorText.textContent = 'Could not load events.json. Check that the file contains valid JSON and try again.';
    errorMessage.hidden = false;
  } finally {
    retryButton.disabled = false;
  }
}

searchInput.addEventListener('input', renderRepositories);
sortSelect.addEventListener('change', renderRepositories);
retryButton.addEventListener('click', loadRepositories);

loadRepositories();
