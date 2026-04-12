export const DEFAULT_EDGE_TYPE = 'prerequisite';
export const VIEWPORT_KEY = 'psskill_viewport';
export const DATA_KEY = 'psskill_data';
export const GIST_CONFIG_KEY = 'psskill_gist_config';

export const defaultData = {
  nodes: [
    {
      id: 'thumb_around',
      label: 'Thumb Around',
      score: 8,
      tags: ['fundamental'],
      notes: 'Clockwise only so far',
      position: { x: 100, y: 100 },
    },
    {
      id: 'thumb_spin_1_5',
      label: 'Thumb Spin 1.5',
      score: null,
      tags: ['combo'],
      notes: '',
      position: { x: 400, y: 260 },
    },
  ],
  edges: [
    {
      id: 'e1',
      from: 'thumb_around',
      to: 'thumb_spin_1_5',
      type: 'prerequisite',
    },
  ],
  tag_styles: {
    fundamental: { color: '#4a90d9' },
    combo: { color: '#8e44ad' },
  },
  edge_styles: {
    prerequisite: { stroke: 'solid', color: '#888' },
    inspired_by: { stroke: 'dashed', color: '#aaa' },
  },
};
