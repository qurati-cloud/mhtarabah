import { provisionFamily } from './firebase.js';
import { activeProfiles } from './profiles.js';
import { childFields, countryName, populateCountries } from './registration.js';

const el = id => document.getElementById(id);
const collator = new Intl.Collator(['ar', 'en'], {numeric: true, sensitivity: 'base'});
const dateFormat = new Intl.DateTimeFormat('ar', {dateStyle: 'medium'});
const sourceNames = {
  web: 'الموقع', android: 'Android', ios: 'iOS', admin: 'لوحة الإدارة', unknown: 'غير مسجل'
};
const text = (tag, content, parent) => {
  const node = document.createElement(tag);
  node.textContent = content;
  parent.append(node);
  return node;
};
function action(parent, label, handler) {
  const button = text('button', label, parent);
  button.type = 'button';
  button.onclick = handler;
  return button;
}
function compare(a, b, descending = false) {
  if (!a || !b) return a ? -1 : b ? 1 : 0;
  return collator.compare(a, b) * (descending ? -1 : 1);
}

export function mountFamilyAdmin(connection, user) {
  const {auth, authApi, data, db} = connection;
  const form = el('provisionForm');
  const children = el('provisionChildren');
  const listing = el('list');
  const stats = el('familyStats');
  const status = el('status');
  const invitation = el('invitation');
  const opened = new Set();
  const filters = ['familySearch', 'countryFilter', 'birthYearFilter', 'sourceFilter', 'familySort'];
  const login = new URL('../login.html', import.meta.url).href;
  let rows = [];
  let stopped = false;

  function report(error) {
    status.textContent = error.code === 'auth/email-already-in-use'
      ? 'هناك حساب مرتبط بهذا البريد الإلكتروني.'
      : error.code ? 'تعذّر إكمال العملية. تحقّق من الاتصال والصلاحية.' : error.message;
  }

  function invite(parent, entry) {
    const message = 'مرحبًا، هذا رابط حسابك في محمد وحبيبة. أدخل بريدك الإلكتروني واضغط "نسيت كلمة المرور؟" لتعيين كلمة مرورك.\n' + login;
    if (entry.phone) {
      const link = text('a', 'فتح رسالة واتساب', parent);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.href = 'https://wa.me/' + entry.phone.slice(1) + '?text=' + encodeURIComponent(message);
    }
    const mail = text('a', 'فتح رسالة بريد', parent);
    mail.href = 'mailto:' + encodeURIComponent(entry.email) + '?subject=' +
      encodeURIComponent('حساب محمد وحبيبة') + '&body=' + encodeURIComponent(message);
    action(parent, 'إرسال رابط تعيين كلمة المرور', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await authApi.sendPasswordResetEmail(auth, entry.email);
        status.textContent = 'أُرسل رابط تعيين كلمة المرور.';
      } catch (error) { report(error); }
      finally { button.disabled = false; }
    });
  }

  function addChildForm() {
    const fieldset = el('childTemplate').content.firstElementChild.cloneNode(true);
    fieldset.querySelector('[name=birthDate]').max = new Date().toISOString().slice(0, 10);
    fieldset.querySelector('.remove-child').onclick = () => {
      fieldset.remove();
      el('anotherChild').disabled = children.childElementCount >= 3;
    };
    children.append(fieldset);
    el('anotherChild').disabled = children.childElementCount >= 3;
  }

  function editNames(target, names, save) {
    const dialog = document.createElement('dialog');
    const editor = document.createElement('form');
    const inputs = names.map(([label, value, max]) => {
      const field = text('label', label, editor);
      const input = document.createElement('input');
      input.value = value || '';
      input.maxLength = max;
      input.required = true;
      field.append(input);
      return input;
    });
    const errorText = text('p', '', editor);
    errorText.setAttribute('role', 'status');
    const saveButton = text('button', 'حفظ الاسم', editor);
    action(editor, 'إلغاء', () => dialog.close());
    editor.onsubmit = async event => {
      event.preventDefault();
      saveButton.disabled = true;
      try {
        const values = inputs.map(input => input.value.trim());
        if (values.some(value => !value)) throw new Error('اكتب الاسم.');
        await save(values);
        dialog.close();
        render();
        status.textContent = 'حُفظ الاسم.';
      } catch (error) {
        errorText.textContent = error.code ? 'تعذّر حفظ الاسم.' : error.message;
      } finally { saveButton.disabled = false; }
    };
    dialog.onclose = () => dialog.remove();
    dialog.append(editor);
    target.append(dialog);
    dialog.showModal();
  }

  function detail(row, profiles) {
    const {uid, entry, role} = row;
    const group = document.createElement('details');
    group.open = opened.has(uid);
    group.ontoggle = () => group.open ? opened.add(uid) : opened.delete(uid);
    text('summary', [entry.parentName, entry.email || 'بريد غير مسجل', countryName(entry.country)]
      .filter(Boolean).join(' · '), group);
    const meta = [
      ['بلد التسجيل المصرّح به', countryName(entry.country)],
      ['مصدر التسجيل', sourceNames[entry.source] || sourceNames.unknown],
      ['تاريخ التسجيل', entry.registeredAt ? dateFormat.format(entry.registeredAt.toDate()) : 'غير مسجل'],
      ['رقم الهاتف', entry.phone || 'غير مسجل']
    ];
    for (const [label, value] of meta) text('p', label + ' · ' + value, group);

    const controls = document.createElement('div');
    controls.className = 'admin-actions';
    group.append(controls);
    const select = document.createElement('select');
    select.setAttribute('aria-label', 'دور الحساب');
    for (const [value, label] of [['user','مستخدم'], ['editor','محرر'], ['admin','مدير']]) {
      select.add(new Option(label, value));
    }
    const isOwner = entry.email === 'quraaty@gmail.com';
    select.value = isOwner ? 'admin' : role || 'user';
    select.disabled = isOwner;
    controls.append(select);
    action(controls, isOwner ? 'المدير الأساسي' : 'حفظ الدور', async () => {
      try {
        await data.setDoc(data.doc(db, 'roles', uid), {role: select.value});
        row.role = select.value;
        status.textContent = 'حُفظ الدور.';
      } catch (error) { report(error); }
    }).disabled = isOwner;
    if (entry.directoryRegistered || entry.legacyRegistered) {
      action(controls, 'تعديل اسم ولي الأمر', () => editNames(group,
        [['اسم ولي الأمر', entry.parentName, 80]], async ([parentName]) => {
          const ref = data.doc(db, 'directory', uid);
          if (entry.directoryRegistered) await data.updateDoc(ref, {parentName});
          else await data.setDoc(ref, {email: entry.email, parentName}, {merge: true});
          Object.assign(entry, {parentName, directoryRegistered: true});
        }));
      invite(controls, entry);
    }

    text('h4', 'الأولاد المسجلون (' + profiles.length + ')', group);
    for (const profile of profiles) {
      const card = document.createElement('div');
      card.className = 'child-card';
      text('strong', profile.name, card);
      text('p', [profile.gender === 'female' ? 'أنثى' : profile.gender === 'male' ? 'ذكر' : 'الجنس غير مسجل',
        profile.birthDate || 'تاريخ الميلاد غير مسجل'].join(' · '), card);
      const full = Boolean(profile.firstName && profile.lastName);
      action(card, 'تعديل اسم الولد', () => editNames(card, full
        ? [['الاسم', profile.firstName, 40], ['اسم العائلة', profile.lastName, 40]]
        : [['الاسم الكامل', profile.name, 80]], async ([firstName, lastName]) => {
        const fields = full ? {firstName, lastName, name: firstName + ' ' + lastName} : {name: firstName};
        if (fields.name.length > 80) throw new Error('ينبغي أن يكون الاسم الكامل ٨٠ حرفًا على الأكثر.');
        await data.updateDoc(profile.ref, fields);
        Object.assign(profile, fields);
      }));
      group.append(card);
    }
    return group;
  }

  function render() {
    if (stopped) return;
    const query = el('familySearch').value.trim().toLocaleLowerCase();
    const year = el('birthYearFilter').value;
    const country = el('countryFilter').value;
    const source = el('sourceFilter').value;
    const sort = el('familySort').value;
    const matching = [];
    for (const row of rows) {
      const {entry} = row;
      if ((country && (entry.country || 'unknown') !== country) ||
          (source && (entry.source || 'unknown') !== source)) continue;
      const profiles = year ? row.profiles.filter(p => p.birthDate?.slice(0, 4) === year) : [...row.profiles];
      if (year && !profiles.length) continue;
      const searchable = [entry.email, entry.parentName, entry.phone, countryName(entry.country),
        ...profiles.map(p => p.name)].filter(Boolean).join(' ').toLocaleLowerCase();
      if (!searchable.includes(query)) continue;
      if (sort === 'olderChild' || sort === 'youngerChild') {
        profiles.sort((a, b) => compare(a.birthDate, b.birthDate, sort === 'youngerChild'));
      } else {
        profiles.sort((a, b) => compare(a.name, b.name, sort === 'childDesc'));
      }
      matching.push({row, profiles});
    }
    matching.sort((a, b) => {
      const first = a.row.entry, second = b.row.entry;
      if (sort.startsWith('email')) return compare(first.email, second.email, sort === 'emailDesc');
      if (sort.startsWith('parent')) return compare(first.parentName, second.parentName, sort === 'parentDesc');
      if (sort.startsWith('child')) return compare(a.profiles[0]?.name, b.profiles[0]?.name, sort === 'childDesc');
      if (sort.endsWith('Child')) return compare(a.profiles[0]?.birthDate, b.profiles[0]?.birthDate, sort === 'youngerChild');
      if (!first.registeredAt || !second.registeredAt) return first.registeredAt ? -1 : second.registeredAt ? 1 : 0;
      return (first.registeredAt.toMillis() - second.registeredAt.toMillis()) * (sort === 'newest' ? -1 : 1);
    });
    stats.textContent = matching.length + ' عائلة · ' +
      matching.reduce((sum, {profiles}) => sum + profiles.length, 0) + ' ولد في النتائج';
    const groups = matching.map(({row, profiles}) => detail(row, profiles));
    listing.replaceChildren(...groups);
    if (!groups.length) text('p', 'لا توجد نتائج مطابقة.', listing);
  }

  function showMetrics() {
    const countries = new Map();
    const sources = new Map(Object.keys(sourceNames).map(source => [source, [0, 0]]));
    const count = (totals, key, profiles) => {
      const [families, children] = totals.get(key) || [0, 0];
      totals.set(key, [families + 1, children + profiles.length]);
    };
    for (const {entry, profiles} of rows) {
      count(countries, entry.country || 'unknown', profiles);
      count(sources, entry.source || 'unknown', profiles);
    }
    const root = el('metrics');
    root.replaceChildren();
    const table = (title, totals, label) => {
      const card = document.createElement('div');
      card.className = 'metric-card';
      text('h3', title, card);
      const grid = document.createElement('table');
      const head = grid.createTHead().insertRow();
      for (const heading of [title, 'عائلات', 'أولاد']) text('th', heading, head);
      const body = grid.createTBody();
      for (const [key, [families, children]] of totals) {
        const row = body.insertRow();
        for (const value of [label(key), families, children]) text('td', value, row);
      }
      card.append(grid);
      root.append(card);
    };
    const countryTotals = [...countries].sort((a, b) => b[1][0] - a[1][0]);
    table('البلد', countryTotals, code => code === 'unknown' ? 'غير مسجل' : countryName(code));
    table('مصدر التسجيل', sources, code => sourceNames[code] || sourceNames.unknown);

    const options = (id, values, label) => {
      const select = el(id), current = select.value;
      select.length = 1;
      for (const value of values) select.add(new Option(label(value), value));
      if ([...select.options].some(option => option.value === current)) select.value = current;
    };
    options('countryFilter', countryTotals.map(([code]) => code),
      code => code === 'unknown' ? 'غير مسجل' : countryName(code));
    const years = new Set(rows.flatMap(row => row.profiles.map(p => p.birthDate?.slice(0, 4)).filter(Boolean)));
    options('birthYearFilter', [...years].sort().reverse(), year => year);
    options('sourceFilter', [...sources.keys()], source => sourceNames[source]);
  }

  async function load() {
    stats.textContent = 'جارٍ تحميل العائلات…';
    try {
      const [legacy, directory, roles] = await Promise.all(
        ['families', 'directory', 'roles'].map(name => data.getDocs(data.collection(db, name))));
      const entries = new Map([[user.uid, {email: user.email}]]);
      for (const doc of legacy.docs) entries.set(doc.id, {...entries.get(doc.id), ...doc.data(), legacyRegistered: true});
      for (const doc of directory.docs) entries.set(doc.id, {...entries.get(doc.id), ...doc.data(), directoryRegistered: true});
      const rolesById = new Map(roles.docs.map(doc => [doc.id, doc.data().role]));
      const next = await Promise.all([...entries].map(async ([uid, entry]) => {
        const snapshot = await data.getDocs(data.collection(db, 'families', uid, 'profiles'));
        const profiles = activeProfiles(snapshot).map(doc => ({...doc.data(), id: doc.id, ref: doc.ref}));
        return {uid, entry, profiles, role: rolesById.get(uid)};
      }));
      if (stopped || auth.currentUser?.uid !== user.uid) return;
      rows = next;
      showMetrics();
      render();
    } catch (error) { if (!stopped) report(error); }
  }

  if (form.elements.country.options.length === 1) populateCountries(form.elements.country);
  form.reset();
  children.replaceChildren();
  invitation.replaceChildren();
  listing.replaceChildren();
  addChildForm();
  el('anotherChild').onclick = addChildForm;
  for (const id of filters) el(id).oninput = render;
  form.onsubmit = async event => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    invitation.replaceChildren();
    try {
      const entry = Object.fromEntries(['email', 'parentName', 'phone', 'country']
        .map(name => [name, form.elements[name].value.trim()]));
      if (!entry.parentName) throw new Error('اكتب اسم ولي الأمر.');
      const profiles = [...children.children].map(fieldset => {
        const values = ['firstName', 'lastName', 'gender', 'birthDate']
          .map(name => fieldset.querySelector('[name=' + name + ']').value.trim());
        return childFields(...values);
      });
      entry.email = await provisionFamily(connection, entry, profiles);
      if (stopped) return;
      status.textContent = 'أُنشئ الحساب. اختر طريقة مشاركة معلومات الدخول.';
      invite(invitation, entry);
      form.reset();
      children.replaceChildren();
      addChildForm();
      await load();
    } catch (error) { if (!stopped) report(error); }
    finally { button.disabled = false; }
  };
  load();
  return () => {
    stopped = true;
    rows = [];
    listing.replaceChildren();
    invitation.replaceChildren();
    el('metrics').replaceChildren();
  };
}
