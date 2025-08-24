export const DEFAULT_BAND_GROUPS = [
  {
    key: 'carriageway',
    title: 'Carriageway Characteristics',
    bands: [
      { key: 'surface', title: 'Surface', height: 28 },
      { key: 'aadt', title: 'AADT', height: 28 },
      { key: 'status', title: 'Status', height: 28 },
      { key: 'quality', title: 'Condition', height: 28 },
      { key: 'rowWidth', title: 'ROW Width (m)', height: 28 },
      { key: 'carriagewayWidth', title: 'Carriageway Width (m)', height: 28 },
      { key: 'lanes', title: 'Number of Lanes', height: 28 },
      { key: 'municipality', title: 'Municipality', height: 28 },
      { key: 'bridges', title: 'Bridges', height: 24 },
    ],
  },
  {
    key: 'historical',
    title: 'Historical Projects',
    bands: [],
  },
]

export const DEFAULT_BANDS = DEFAULT_BAND_GROUPS.flatMap(g => g.bands)
