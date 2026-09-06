import { calculateSimulation, CalculationError } from './calculator.js';
import { demoProtocol } from './protocols.js';

const byId = id => document.getElementById(id);
const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 });
const format = n => numberFormat.format(n);
const display = n => `${Math.abs(n - Number(n.toFixed(6))) > 1e-10 ? '≈ ' : ''}${format(n)}`;
const form = byId('calculator-form');
const weight = byId('weight');
const age = byId('age');
const ageUnit = byId('age-unit');
const confirmed = byId('confirm-demo');
const errorBox = byId('form-error');

byId('coefficient-value').textContent = format(demoProtocol.dosePerKg);
byId('maximum-value').textContent = format(demoProtocol.maximumDose);
byId('concentration-value').textContent = format(demoProtocol.concentrationPerMl);

function clearErrors() {
  errorBox.hidden = true;
  errorBox.textContent = '';
  for (const input of [weight, age, confirmed]) input.removeAttribute('aria-invalid');
}

function invalidateResult() {
  byId('result-content').hidden = true;
  byId('empty-result').hidden = false;
  byId('result-status').textContent = 'À calculer';
  byId('result-status').classList.remove('calculated');
  for (const id of ['dose-result', 'volume-result', 'result-context']) byId(id).textContent = '';
  byId('calculation-steps').replaceChildren();
  byId('cap-notice').hidden = true;
  clearErrors();
}

for (const input of [weight, age, ageUnit]) {
  input.addEventListener('input', () => {
    confirmed.checked = false;
    invalidateResult();
  });
  input.addEventListener('change', () => {
    confirmed.checked = false;
    invalidateResult();
  });
}
confirmed.addEventListener('change', invalidateResult);

byId('fill-example').addEventListener('click', () => {
  weight.value = '12,5';
  age.value = '3';
  ageUnit.value = 'years';
  confirmed.checked = false;
  invalidateResult();
  weight.focus();
});

byId('reset').addEventListener('click', () => {
  form.reset();
  invalidateResult();
  byId('result-status').textContent = 'En attente de saisie';
  weight.focus();
});

form.addEventListener('submit', event => {
  event.preventDefault();
  invalidateResult();
  try {
    const result = calculateSimulation({
      weight: weight.value,
      age: age.value,
      ageUnit: ageUnit.value,
      confirmed: confirmed.checked,
    }, demoProtocol);
    byId('dose-result').textContent = display(result.dose);
    byId('volume-result').textContent = display(result.volumeMl);
    byId('result-context').textContent = `Cas fictif · ${format(result.weightKg)} kg · ${format(result.ageMonths)} mois · ${result.protocolVersion}`;
    byId('cap-notice').hidden = !result.capped;
    const lines = [
      `Dose théorique : ${format(result.weightKg)} kg × ${format(demoProtocol.dosePerKg)} u. démo/kg = ${display(result.uncappedDose)} u. démo.`,
      `Dose après plafond : min(${display(result.uncappedDose)} ; ${format(demoProtocol.maximumDose)}) = ${display(result.dose)} u. démo.`,
      `Volume théorique : ${display(result.dose)} u. démo ÷ ${format(demoProtocol.concentrationPerMl)} u. démo/mL = ${display(result.volumeMl)} mL fictifs.`,
    ];
    byId('calculation-steps').replaceChildren(...lines.map(text => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }));
    byId('empty-result').hidden = true;
    byId('result-content').hidden = false;
    byId('result-status').textContent = 'Simulation calculée';
    byId('result-status').classList.add('calculated');
  } catch (error) {
    errorBox.textContent = error instanceof CalculationError ? error.message : 'Le calcul a échoué. Réinitialisez le formulaire et réessayez.';
    errorBox.hidden = false;
    let target;
    if (error.code === 'confirmation-required') target = confirmed;
    else if (error.code === 'age-out-of-range' || error.message?.startsWith('Âge')) target = age;
    else if (error.code === 'weight-out-of-range' || error.message?.startsWith('Poids')) target = weight;
    if (target) {
      target.setAttribute('aria-invalid', 'true');
      target.focus();
    }
  }
});

const tabs = [byId('quick-tab'), byId('catalog-tab'), byId('protocols-tab'), byId('calculator-tab')];
function activateTab(tab) {
  for (const item of tabs) {
    const active = item === tab;
    item.setAttribute('aria-selected', String(active));
    item.tabIndex = active ? 0 : -1;
    item.classList.toggle('active', active);
    byId(item.getAttribute('aria-controls')).hidden = !active;
  }
}
for (const tab of tabs) {
  tab.addEventListener('click', () => activateTab(tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = tabs[(tabs.indexOf(tab) + 1) % tabs.length];
    if (event.key === 'ArrowLeft') next = tabs[(tabs.indexOf(tab) - 1 + tabs.length) % tabs.length];
    if (event.key === 'Home') next = tabs[0];
    if (event.key === 'End') next = tabs.at(-1);
    if (next) {
      event.preventDefault();
      activateTab(next);
      next.focus();
    }
  });
}

// Clear all form values on restoration from the back/forward page cache.
window.addEventListener('pageshow', event => {
  if (event.persisted) {
    form.reset();
    invalidateResult();
  }
});
