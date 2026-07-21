export const GIZA_TOUR_MOMENTS = [
  { id: 'hathor-triad-introduction', sceneId: 'giza-gallery', characterId: 'hathor', routeLabel: 'Hathor introduces the triad', motionPreset: 'Greeting + Point to Monument', next: ['menkaure-monument-guide'] },
  { id: 'menkaure-monument-guide', sceneId: 'giza-site', characterId: 'menkaure', routeLabel: 'Menkaure at the monument', motionPreset: 'Walk / Lead + Ask Question', next: ['ranefer-tomb-sculpture', 'hathor-triad-introduction'] },
  { id: 'ranefer-tomb-sculpture', sceneId: 'comparative-old-kingdom', characterId: 'ranefer', routeLabel: 'Ranefer explains tomb sculpture', motionPreset: 'Explain Object + Invite Choice', next: ['hathor-triad-introduction'] }
];
export function createGizaWorldBridge(adapter = {}) {
  const moments = new Map(GIZA_TOUR_MOMENTS.map((m) => [m.id, m]));
  const transcript = [];
  let active = GIZA_TOUR_MOMENTS[0].id;
  const hooks = { setScene: adapter.setScene || (() => {}), focusCharacter: adapter.focusCharacter || (() => {}), playMotionPreset: adapter.playMotionPreset || (() => {}), setPromptText: adapter.setPromptText || (() => {}), updateHud: adapter.updateHud || (() => {}), updateAccuracyPanel: adapter.updateAccuracyPanel || (() => {}) };
  function activate(id) {
    const moment = moments.get(id);
    if (!moment) throw new Error(`Unknown Giza tour moment: ${id}`);
    active = id;
    if (transcript.at(-1) !== moment.routeLabel) transcript.push(moment.routeLabel);
    hooks.setScene(moment.sceneId, moment);
    hooks.focusCharacter(moment.characterId, moment);
    hooks.playMotionPreset(moment.characterId, moment.motionPreset, moment);
    hooks.setPromptText(`${moment.characterId}: ${moment.motionPreset}`);
    hooks.updateAccuracyPanel(moment.characterId, moment);
    hooks.updateHud({ activeMoment: moment, allMoments: GIZA_TOUR_MOMENTS, transcript: [...transcript] });
    return moment;
  }
  return { activate, next: (index = 0) => activate(moments.get(active).next[index] || moments.get(active).next[0]), getTranscript: () => [...transcript], getMoments: () => [...GIZA_TOUR_MOMENTS] };
}
