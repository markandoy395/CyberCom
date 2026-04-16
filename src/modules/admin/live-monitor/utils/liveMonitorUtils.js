export const formatSnapshotTime = value => {
  if (!value) {
    return "Waiting for first frame";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Waiting for first frame";
  }

  return parsed.toLocaleTimeString();
};

export const formatHistoryTime = value => {
  if (!value) {
    return "Unknown time";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown time";
  }

  return parsed.toLocaleString();
};

export const formatLastUpdated = value => {
  if (!value) {
    return "Waiting for first update";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Waiting for first update";
  }

  return parsed.toLocaleTimeString();
};

export const getSnapshotAspectRatio = snapshot => {
  const width = Number(snapshot?.width);
  const height = Number(snapshot?.height);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "16 / 9";
  }

  return `${width} / ${height}`;
};
