let state = {
    institution_name: "",
    config: {
        include_saturday: false,
        periods: [],
        allow_free_periods: true
    },
    classes: [], // { name, subjects: [{name, periods_per_week}] }
    staff: []    // { name, assignments: [{class_name, subject_name}], class_teacher_for, available_until_period }
};

let classIdCounter = 0;
let staffIdCounter = 0;
const API_URL = "/api";

// Step Navigation
function nextStep(step) {
    if (step === 2) {
        state.institution_name = document.getElementById('institution-name').value || "Unnamed Institution";
    }
    if (step === 3) {
        collectScheduleConfig();
    }
    if (step === 4) {
        collectClassesData();
    }
    if (step === 5) {
        collectStaffData();
    }

    document.querySelectorAll('.step-content').forEach(el => el.classList.add('hidden'));
    document.getElementById(`step-${step}`).classList.remove('hidden');

    document.querySelectorAll('.step-indicator').forEach(el => el.classList.remove('active', 'text-indigo-600'));
    const indicator = document.getElementById(`indicator-${step}`);
    if (indicator) indicator.classList.add('active', 'text-indigo-600');
}

// Schedule Configuration
function renderTimingRows(count) {
    const timingMatrix = document.getElementById('timing-matrix');
    timingMatrix.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const row = document.createElement('div');
        row.className = "flex items-center space-x-3 p-4 bg-white rounded-2xl border border-slate-100 animate-fade-in";
        const isBreak = i === 3;
        row.innerHTML = `
            <div class="flex-1">
                <input type="text" class="period-label w-full text-xs font-bold border-0 focus:ring-0 p-0 placeholder-slate-300" value="${isBreak ? 'Break' : 'Period '+(i+1)}">
            </div>
            <div class="flex items-center space-x-2">
                <input type="time" class="period-start text-[10px] font-bold border-slate-100 rounded-lg p-1" value="${String(8+i).padStart(2,'0')}:00">
                <input type="time" class="period-end text-[10px] font-bold border-slate-100 rounded-lg p-1" value="${String(9+i).padStart(2,'0')}:00">
            </div>
            <label class="relative inline-flex items-center cursor-pointer ml-2">
                <input type="checkbox" class="period-break sr-only peer" ${isBreak ? 'checked' : ''}>
                <div class="w-8 h-4 bg-slate-100 rounded-full peer peer-checked:bg-amber-400 after:content-[''] after:absolute after:bg-white after:rounded-full after:h-3 after:w-3 after:top-[2px] after:left-[2px] peer-checked:after:translate-x-4 transition-all"></div>
            </label>
        `;
        timingMatrix.appendChild(row);
    }
}

function collectScheduleConfig() {
    state.config.include_saturday = document.getElementById('include-saturday').checked;
    state.config.allow_free_periods = document.getElementById('allow-free-periods').checked;
    state.config.periods = [];
    document.querySelectorAll('#timing-matrix > div').forEach(row => {
        state.config.periods.push({
            label: row.querySelector('.period-label').value,
            start_time: row.querySelector('.period-start').value,
            end_time: row.querySelector('.period-end').value,
            is_break: row.querySelector('.period-break').checked
        });
    });
}

// Classes & Subjects Logic
function addClassForm(data = null) {
    const id = classIdCounter++;
    const container = document.getElementById('classes-container');
    const card = document.createElement('div');
    card.className = "class-card bg-slate-50 p-6 rounded-3xl border border-slate-200 relative group animate-fade-in";
    card.dataset.id = id;
    card.innerHTML = `
        <div class="absolute top-4 right-4 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onclick="duplicateClass(${id})" class="text-slate-300 hover:text-indigo-500" title="Duplicate Class">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path></svg>
            </button>
            <button onclick="this.closest('.class-card').remove()" class="text-slate-300 hover:text-red-500" title="Remove Class">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        </div>
        <div class="mb-4">
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Class Name</label>
            <input type="text" class="class-name w-full rounded-xl border-2 border-white px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all shadow-sm" placeholder="e.g. 10th A" value="${data ? data.name : ''}">
        </div>
        <div class="subjects-list space-y-3">
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Subjects & Weekly Frequency</label>
            <!-- Subjects rows -->
        </div>
        <button onclick="addSubjectRow(this)" class="mt-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition flex items-center">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"></path></svg>
            Add Subject
        </button>
    `;
    container.appendChild(card);
    if (data && data.subjects) {
        data.subjects.forEach(sub => addSubjectRow(card.querySelector('.subjects-list'), sub));
    } else {
        addSubjectRow(card.querySelector('.subjects-list'));
    }
}

function addSubjectRow(target, data = null) {
    const list = target.classList.contains('subjects-list') ? target : target.parentElement.querySelector('.subjects-list');
    const row = document.createElement('div');
    row.className = "flex items-center space-x-3 animate-fade-in";
    row.innerHTML = `
        <input type="text" class="sub-name flex-1 rounded-xl border-2 border-white px-4 py-2 text-xs font-bold focus:border-indigo-500 transition-all shadow-sm" placeholder="Subject" value="${data ? data.name : ''}">
        <input type="number" class="sub-freq w-20 rounded-xl border-2 border-white px-4 py-2 text-xs font-bold focus:border-indigo-500 transition-all shadow-sm" placeholder="Freq" value="${data ? data.periods_per_week : 1}">
        <button onclick="this.parentElement.remove()" class="text-slate-300 hover:text-red-400 transition">&times;</button>
    `;
    list.appendChild(row);
}

function duplicateClass(id) {
    const card = document.querySelector(`.class-card[data-id="${id}"]`);
    const name = card.querySelector('.class-name').value;
    const subjects = [];
    card.querySelectorAll('.subjects-list > div').forEach(row => {
        const subName = row.querySelector('.sub-name').value.trim();
        const subFreq = parseInt(row.querySelector('.sub-freq').value) || 1;
        if (subName) subjects.push({ name: subName, periods_per_week: subFreq });
    });
    addClassForm({ name: name + " (Copy)", subjects });
}

function collectClassesData() {
    state.classes = [];
    document.querySelectorAll('.class-card').forEach(card => {
        const name = card.querySelector('.class-name').value.trim();
        const subjects = [];
        card.querySelectorAll('.subjects-list > div').forEach(row => {
            const subName = row.querySelector('.sub-name').value.trim();
            const subFreq = parseInt(row.querySelector('.sub-freq').value) || 1;
            if (subName) subjects.push({ name: subName, periods_per_week: subFreq });
        });
        if (name) state.classes.push({ name, subjects });
    });
}

// Staff Logic
function addStaffForm(data = null) {
    const id = staffIdCounter++;
    const container = document.getElementById('staff-container');
    const card = document.createElement('div');
    card.className = "staff-card bg-slate-50 p-6 rounded-3xl border border-slate-200 relative group animate-fade-in";
    card.dataset.id = id;
    card.innerHTML = `
        <button onclick="this.parentElement.remove()" class="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
        <div class="grid md:grid-cols-2 gap-6 mb-6">
            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Teacher Name</label>
                <input type="text" class="staff-name w-full rounded-xl border-2 border-white px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all shadow-sm" placeholder="e.g. Mr. Smith" value="${data ? data.name : ''}">
            </div>
            <div>
                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Available until Period (Optional)</label>
                <input type="number" class="staff-avail w-full rounded-xl border-2 border-white px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all shadow-sm" placeholder="e.g. 6" value="${data ? data.available_until_period || '' : ''}">
            </div>
        </div>
        <div class="mb-6">
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Class Teacher For</label>
            <select class="staff-ct-for w-full rounded-xl border-2 border-white px-4 py-3 text-sm font-bold focus:border-indigo-500 transition-all shadow-sm">
                <option value="">-- None --</option>
                ${state.classes.map(c => `<option value="${c.name}" ${data && data.class_teacher_for === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select>
        </div>
        <div class="assignments-list space-y-3">
            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Assignments</label>
            <!-- Assignments rows -->
        </div>
        <button onclick="addAssignmentRow(this)" class="mt-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition flex items-center">
            <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"></path></svg>
            Add Assignment
        </button>
    `;
    container.appendChild(card);
    if (data && data.assignments) {
        data.assignments.forEach(asgn => addAssignmentRow(card.querySelector('.assignments-list'), asgn));
    } else {
        addAssignmentRow(card.querySelector('.assignments-list'));
    }
}

function addAssignmentRow(target, data = null) {
    const list = target.classList.contains('assignments-list') ? target : target.parentElement.querySelector('.assignments-list');
    const row = document.createElement('div');
    row.className = "flex items-center space-x-3 animate-fade-in";
    
    const classOptions = state.classes.map(c => `<option value="${c.name}" ${data && data.class_name === c.name ? 'selected' : ''}>${c.name}</option>`).join('');
    
    row.innerHTML = `
        <select class="asgn-class flex-1 rounded-xl border-2 border-white px-4 py-2 text-xs font-bold focus:border-indigo-500 transition-all shadow-sm" onchange="updateAssignmentSubjects(this)">
            <option value="">-- Select Class --</option>
            ${classOptions}
        </select>
        <select class="asgn-sub flex-1 rounded-xl border-2 border-white px-4 py-2 text-xs font-bold focus:border-indigo-500 transition-all shadow-sm">
            <option value="">-- Select Subject --</option>
        </select>
        <button onclick="this.parentElement.remove()" class="text-slate-300 hover:text-red-400 transition">&times;</button>
    `;
    list.appendChild(row);
    if (data) {
        updateAssignmentSubjects(row.querySelector('.asgn-class'), data.subject_name);
    }
}

function updateAssignmentSubjects(classSelect, selectedSub = null) {
    const row = classSelect.parentElement;
    const subSelect = row.querySelector('.asgn-sub');
    const className = classSelect.value;
    const cls = state.classes.find(c => c.name === className);
    
    subSelect.innerHTML = '<option value="">-- Select Subject --</option>';
    if (cls) {
        cls.subjects.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.name;
            opt.textContent = sub.name;
            if (selectedSub === sub.name) opt.selected = true;
            subSelect.appendChild(opt);
        });
    }
}

function collectStaffData() {
    state.staff = [];
    document.querySelectorAll('.staff-card').forEach(card => {
        const name = card.querySelector('.staff-name').value.trim();
        const avail = parseInt(card.querySelector('.staff-avail').value) || null;
        const ctFor = card.querySelector('.staff-ct-for').value || null;
        const assignments = [];
        card.querySelectorAll('.assignments-list > div').forEach(row => {
            const cName = row.querySelector('.asgn-class').value;
            const sName = row.querySelector('.asgn-sub').value;
            if (cName && sName) assignments.push({ class_name: cName, subject_name: sName });
        });
        if (name && assignments.length > 0) {
            state.staff.push({ name, assignments, class_teacher_for: ctFor, available_until_period: avail });
        }
    });
}

// Template Persistence
function saveTemplate() {
    collectAllData(); // Quick helper to sync current UI to state
    localStorage.setItem('tt_pro_template', JSON.stringify(state));
    alert('Template saved to browser storage!');
}

function loadTemplate() {
    const saved = localStorage.getItem('tt_pro_template');
    if (!saved) return alert('No saved template found.');
    state = JSON.parse(saved);
    applyStateToUI();
}

function collectAllData() {
    state.institution_name = document.getElementById('institution-name').value;
    collectScheduleConfig();
    collectClassesData();
    collectStaffData();
}

function applyStateToUI() {
    document.getElementById('institution-name').value = state.institution_name;
    document.getElementById('include-saturday').checked = state.config.include_saturday;
    document.getElementById('allow-free-periods').checked = state.config.allow_free_periods;
    document.getElementById('period-count').value = state.config.periods.length || 8;
    renderTimingRows(state.config.periods.length || 8);
    
    // Apply periods data to rows
    setTimeout(() => {
        const rows = document.querySelectorAll('#timing-matrix > div');
        state.config.periods.forEach((p, i) => {
            if (rows[i]) {
                rows[i].querySelector('.period-label').value = p.label;
                rows[i].querySelector('.period-start').value = p.start_time;
                rows[i].querySelector('.period-end').value = p.end_time;
                rows[i].querySelector('.period-break').checked = p.is_break;
            }
        });
    }, 100);

    document.getElementById('classes-container').innerHTML = '';
    state.classes.forEach(c => addClassForm(c));

    // For staff, we wait for a moment to ensure class data is collected for dropdowns
    document.getElementById('staff-container').innerHTML = '';
    state.staff.forEach(s => addStaffForm(s));
    
    nextStep(1);
    alert('Template loaded successfully!');
}

// API Interaction
async function generatePDF(type) {
    collectAllData();
    const loader = document.getElementById('loader');
    loader.classList.remove('hidden');
    try {
        const response = await fetch(`${API_URL}/export/${type}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(state)
        });
        if (!response.ok) throw new Error('Generation failed.');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_timetable.pdf`;
        a.click();
    } catch (e) { alert(e.message); }
    finally { loader.classList.add('hidden'); }
}

// Init
renderTimingRows(8);
addClassForm();
