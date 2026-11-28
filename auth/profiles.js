export function activeProfiles(snapshot) {
  return snapshot.docs.filter(profile => !profile.data().deleting);
}

export function reconcileProfileSelection(snapshot, uid) {
  const profiles = activeProfiles(snapshot);
  const selected = localStorage.getItem('mh-selected-profile');
  let changed = false;
  if (!snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites &&
      localStorage.getItem('mh-selected-owner') === uid && selected &&
      !profiles.some(profile => profile.id === selected)) {
    if (profiles.length) localStorage.setItem('mh-selected-profile', profiles[0].id);
    else localStorage.removeItem('mh-selected-profile');
    changed = true;
  }
  return {profiles, changed};
}

export async function deleteProfile(data, db, profile) {
  const marker = data.doc(profile.parent.parent, 'deletedProfiles', profile.id);
  await data.runTransaction(db, async transaction => {
    const current = await transaction.get(profile);
    if (current.exists() && !current.data().deleting) {
      transaction.set(marker, {deleted: true});
      transaction.update(profile, {deleting: true});
    }
  });

  // The server blocks new progress writes before we start draining the collection.
  const progress = data.collection(profile, 'progress');
  const page = data.query(progress, data.limit(400));
  for (;;) {
    const snapshot = await data.getDocsFromServer(page);
    if (snapshot.empty) break;
    const batch = data.writeBatch(db);
    for (const entry of snapshot.docs) batch.delete(entry.ref);
    await batch.commit();
  }
  await data.deleteDoc(data.doc(profile.parent.parent, 'avatars', profile.id));
  await data.deleteDoc(profile);
}
