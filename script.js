const repoList = document.getElementById('repo-list');
const repoCount = document.getElementById('repo-count');
const statusText = document.getElementById('status');
const errorMessage = document.getElementById('error-message');

function showError(message) {
  statusText.textContent = 'Unable to load starred repositories.';
  errorMessage.hidden = false;
  errorMessage.textContent = message;
}

function setStatus(message) {
  statusText.textContent = message;
}

function normalizeRepos(data) {
  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.events)) {
    return data.events;
  }

  return [];
}

function formatDate(value) {
  if (!value) {
    return 'Unknown date';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
}

function renderRepos(repos) {
  repoList.innerHTML = '';

  if (!repos.length) {
    setStatus('No starred repositories found yet.');
    repoCount.textContent = '0';
    return;
  }

  repos
    .map((repo) => ({
      name: repo.name || repo.full_name || 'Untitled repository',
      description: repo.description || 'No description provided.',
      url: repo.url || repo.html_url || '#',
      language: repo.language || 'Not specified',
      starredAt: repo.starredAt || repo.stargazedAt || repo.created_at || repo.date,
      owner: repo.owner || repo.owner_name || 'unknown'
    }))
    .forEach((repo) => {
      const item = document.createElement('li');
      item.className = 'repo-item';

      const link = document.createElement('a');
      link.href = repo.url;
      link.target = '_blank';
      link.rel = 'noreferrer noopener';
      link.className = 'repo-link';
      link.textContent = repo.name;

      const description = document.createElement('p');
      description.className = 'repo-description';
      description.textContent = repo.description;

      const meta = document.createElement('div');
      meta.className = 'repo-meta';

      const language = document.createElement('span');
      language.textContent = repo.language;

      const date = document.createElement('time');
      date.dateTime = repo.starredAt || '';
      date.textContent = formatDate(repo.starredAt);

      meta.append(language, date);
      item.append(link, description, meta);
      repoList.appendChild(item);
    });

  repoCount.textContent = String(repos.length);
  const label = repos.length === 1 ? 'repository' : 'repositories';
  setStatus(`Loaded ${repos.length} starred ${label}.`);
}

async function loadRepos() {
  try {
    const response = await fetch('events.json', { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const json = await response.json();
    const repos = normalizeRepos(json);
    renderRepos(repos);
  } catch (error) {
    console.error('Failed to load stargazer data:', error);
    showError('The repository log could not be loaded. Please refresh or try again later.');
  }
}

loadRepos();
