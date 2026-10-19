const q = new URLSearchParams(location.search);
document.getElementById('greet').textContent = ((q.get('e') || '') + ' ' + (q.get('g') || '')).trim();
