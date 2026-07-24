const USERNAME = "shahariar007";
const API = "https://api.github.com";
const palette = ["#58a6ff", "#3fb950", "#d2a8ff", "#f2cc60", "#ff7b72", "#79c0ff", "#56d4dd", "#ffa657"];

const api = async (path) => {
  const response = await fetch(`${API}${path}`, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
  return response.json();
};

const metric = (label, value) => `<article class="metric"><span class="metric-value">${value}</span><span class="metric-label">${label}</span></article>`;

function languageData(repositories) {
  const counts = new Map();
  repositories.forEach(({ language }) => {
    if (language) counts.set(language, (counts.get(language) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}

function renderDonut(languages) {
  const total = languages.reduce((sum, [, count]) => sum + count, 0);
  const circumference = 2 * Math.PI * 76;
  let offset = 0;
  const rings = languages.map(([language, count], index) => {
    const length = (count / total) * circumference;
    const ring = `<circle cx="105" cy="105" r="76" fill="none" stroke="${palette[index]}" stroke-width="28" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}" />`;
    offset += length;
    return ring;
  }).join("");
  const legend = languages.map(([language, count], index) => `<div class="legend-item"><span class="swatch" style="background:${palette[index]}"></span>${language} <strong>${count}</strong></div>`).join("");
  document.querySelector("#donut").innerHTML = `<svg viewBox="0 0 210 210" role="img" aria-label="Primary languages across ${total} public repositories"><g transform="rotate(-90 105 105)">${rings}</g><text class="donut-center" x="105" y="101">${total}</text><text class="donut-subtitle" x="105" y="123">repositories</text></svg><div class="legend">${legend}</div>`;
}

function renderBars(languages) {
  const maximum = languages[0]?.[1] || 1;
  document.querySelector("#bars").innerHTML = languages.map(([language, count], index) => `<div class="bar-row"><span>${language}</span><div class="track"><div class="fill" style="width:${(count / maximum) * 100}%;background:${palette[index]}"></div></div><span class="bar-value">${count}</span></div>`).join("");
}

function renderRepositories(repositories) {
  document.querySelector("#repositories").innerHTML = repositories.slice(0, 6).map((repo) => {
    const updated = new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(new Date(repo.updated_at));
    return `<article class="repository"><div><a href="${repo.html_url}" target="_blank" rel="noreferrer">${repo.name}</a><p>${repo.description || "No public description provided."}</p></div><span class="repo-meta">${repo.language || "Code"} · ${updated}</span></article>`;
  }).join("");
}

async function loadDashboard() {
  const status = document.querySelector("#status");
  try {
    const [profile, repositories] = await Promise.all([
      api(`/users/${USERNAME}`),
      api(`/users/${USERNAME}/repos?per_page=100&sort=updated`),
    ]);
    const original = repositories.filter((repo) => !repo.fork).length;
    document.querySelector("#metrics").innerHTML = [
      metric("Public repositories", profile.public_repos),
      metric("Original repositories", original),
      metric("Forked repositories", repositories.length - original),
      metric("Followers", profile.followers),
      metric("Following", profile.following),
    ].join("");
    const languages = languageData(repositories);
    renderDonut(languages);
    renderBars(languages);
    renderRepositories(repositories);
    status.textContent = "Live data loaded from the GitHub API.";
    document.querySelector("#updated").textContent = `Last refreshed in your browser: ${new Date().toLocaleString()}. Private repositories are not included.`;
  } catch (error) {
    status.textContent = `Could not load live GitHub data. ${error.message}`;
    status.classList.add("error");
  }
}

loadDashboard();
