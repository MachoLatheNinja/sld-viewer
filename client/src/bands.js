export const DEFAULT_BAND_GROUPS = [
  {
    key: 'carriageway',
    title: 'Carriageway Characteristics',
    bands: [
      { key: 'surface', title: 'Surface', height: 20 },
      { key: 'aadt', title: 'AADT', height: 20 },
      { key: 'status', title: 'Status', height: 20 },
      { key: 'quality', title: 'Condition', height: 20 },
      { key: 'rowWidth', title: 'ROW Width (m)', height: 20 },
      { key: 'carriagewayWidth', title: 'Carriageway Width (m)', height: 20 },
      { key: 'lanes', title: 'Number of Lanes', height: 20 },
      { key: 'municipality', title: 'Municipality', height: 20 },
      { key: 'bridges', title: 'Bridges', height: 20 },
    ],
  },
  {
    key: 'historical',
    title: 'Historical Projects',
    bands: [],
  },
]

export const DEFAULT_BANDS = DEFAULT_BAND_GROUPS.flatMap(g => g.bands)
