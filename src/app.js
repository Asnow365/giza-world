const DATA_PATHS = {
  characters: 'data/characters.json',
  objects: 'data/objects.json',
  stories: 'data/storyMoments.json',
  workflow: 'data/reviewWorkflow.json',
  reviewNotes: 'data/expertReviewNotes.json',
  scenes: 'data/immersiveScenes.json'
};

const badgeLabels = {
  source: 'Source-based',
  reconstructed: 'Reconstructed',
  speculative: 'Speculative',
  review: 'Needs review'
};

const transcript = [];
let state = {
  activeIndex: 0,
  data: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function badgeMarkup(badges = []) {
  return badges.map((badge) => `<span class="badge ${badge}">${badgeLabels[badge] || badge}</span>`).join('');
}

function characterById(id) {
  return state.data.characters.find((character) => character.id === id);
}

function objectById(id) {
  return state.data.objects.find((object) => object.id === id);
}

function storyIndexById(id) {
  return state.data.stories.findIndex((story) => story.id === id);
}

async function loadData() {
  const entries = await Promise.all(
    Object.entries(DATA_PATHS).map(async ([key, path]) => [key, await fetch(path).then((response) => response.json())])
  );
  return Object.fromEntries(entries);
}

function renderRoute() {
  $('#route-nodes').innerHTML = state.data.stories.map((story, index) => {
    const scene = state.data.scenes.find((item) => item.id === story.sceneId);
    return `
      <button type="button" class="route-node" data-route="${index}">
        <span class="route-index">${index + 1}</span>
        <span><strong>${story.id.replaceAll('-', ' ')}</strong><br>${scene?.label || story.location}</span>
      </button>
    `;
  }).join('');

  $$('[data-route]').forEach((button) => {
    button.addEventListener('click', () => renderTour(Number(button.dataset.route)));
  });
}

function renderTour(index = 0) {
  const story = state.data.stories[index];
  const character = characterById(story.characterId);
  const object = objectById(character.objectId);
  const scene = state.data.scenes.find((item) => item.id === story.sceneId);

  state.activeIndex = index;
  $('#scene-location').textContent = scene?.label || story.location;
  $('#npc-avatar').textContent = character.displayName.charAt(0);
  $('#npc-name').textContent = `${character.displayName} guide preview`;
  $('#npc-line').textContent = character.reviewStatus;
  $('#tour-step').textContent = `Stop ${index + 1} / ${state.data.stories.length}`;
  $('#tour-progress').style.width = `${((index + 1) / state.data.stories.length) * 100}%`;
  $('#tour-name').textContent = story.id.replaceAll('-', ' ');
  $('#tour-motion').textContent = story.motionPreset;
  $('#motion-icon').textContent = story.motionIcon;
  $('#tour-accuracy').textContent = object.publicUseStatus;
  $('#current-objective').textContent = `Current objective: ${story.objective}`;
  $('#tour-badges').innerHTML = badgeMarkup(story.certaintyBadges);
  $('#tour-choices').innerHTML = story.userChoice.map((choice) => {
    const next = storyIndexById(choice.nextStoryId);
    return `<button type="button" data-next="${next}">${choice.label}</button>`;
  }).join('');

  $$('[data-next]').forEach((button) => {
    button.addEventListener('click', () => renderTour(Number(button.dataset.next)));
  });
  $$('[data-route]').forEach((button) => button.classList.toggle('active', Number(button.dataset.route) === index));
  $$('[data-hotspot]').forEach((button) => button.classList.toggle('active', Number(button.dataset.hotspot) === (scene?.hotspotIndex ?? index)));

  if (transcript.at(-1) !== story.id) transcript.push(story.id);
  $('#tour-transcript').innerHTML = transcript.map((id, transcriptIndex) => `<li><strong>${transcriptIndex + 1}.</strong> ${id.replaceAll('-', ' ')}</li>`).join('');
}

function renderStaticSections() {
  $('#character-roster').innerHTML = state.data.characters.map((character) => `
    <article class="character-card">
      <span class="avatar">${character.displayName.charAt(0)}</span>
      <h3>${character.displayName}</h3>
      <p>${character.guideRole}</p>
      <p>${character.reviewStatus}</p>
      <div class="badge-row">${badgeMarkup(character.sourceStatus.map((status) => status.includes('speculative') ? 'speculative' : status.includes('reconstructed') ? 'reconstructed' : status.includes('review') ? 'review' : 'source'))}</div>
    </article>
  `).join('');

  $('#source-grid').innerHTML = state.data.characters.map((character) => `
    <article class="source-card">
      <h3>${character.displayName}</h3>
      <dl>
        <dt>Workflow state</dt><dd>${character.reviewWorkflowState}</dd>
        <dt>Bibliography to verify</dt><dd>${character.bibliography.join('; ')}</dd>
        <dt>Before public use</dt><dd>${character.requiredBeforePublicUse.join('; ')}</dd>
      </dl>
    </article>
  `).join('');

  $('#metadata-grid').innerHTML = state.data.objects.map((object) => `
    <article class="metadata-panel">
      <h3>${object.objectName}</h3>
      <dl>
        <dt>Museum</dt><dd>${object.museum}</dd>
        <dt>Accession</dt><dd>${object.accessionNumber}</dd>
        <dt>Period</dt><dd>${object.period}</dd>
        <dt>Context</dt><dd>${object.excavationContext}</dd>
        <dt>Material</dt><dd>${object.material}</dd>
        <dt>Source URL</dt><dd><a href="${object.sourceUrl}">${object.sourceUrl}</a></dd>
        <dt>Status</dt><dd>${object.publicUseStatus}</dd>
      </dl>
    </article>
  `).join('');

  $('#review-notes').innerHTML = state.data.reviewNotes.map((note) => `
    <article class="panel">
      <h3>${note.id.replaceAll('-', ' ')}</h3>
      <p><strong>${note.reviewPriority}</strong> · ${note.note}</p>
    </article>
  `).join('');

  $('#workflow-grid').innerHTML = state.data.workflow.map((step) => `
    <article class="workflow-step" data-allowed="${step.publicDisplayAllowed}">
      <h3>${step.label}</h3>
      <p>${step.description}</p>
      <span class="badge ${step.publicDisplayAllowed ? 'source' : 'review'}">${step.publicDisplayAllowed ? 'Public display allowed' : 'No public display yet'}</span>
    </article>
  `).join('');
}

async function init() {
  state.data = await loadData();
  renderRoute();
  renderStaticSections();
  renderTour(0);
}

init().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML('afterbegin', `<p class="load-error">Unable to load Giza World prototype data. Serve this folder with a local web server.</p>`);
});
