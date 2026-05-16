const state = {
    institution_name: "",
    config: {
        include_saturday: false,
        periods: [],
        allow_free_periods: true
    },
    classes: [],
    staff: [] // Array of { name, subject, classes: [] }
};

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
        updateSlotCounters();
    }
    if (step === 5) {
        collectStaffData();
    }

    // Hide all
    document.querySelectorAll('.step-content').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active');
    });
    
    // Show target
    const target = document.getElementById(`step-${step}`);
    target.classList.remove('hidden');
    target.classList.add('active');

    // Update indicators
    document.querySelectorAll('.step-indicator').forEach(el => {
        el.classList.remove('active', 'text-indigo-600');
        el.classList.add('text-slate-400');
    });
    const indicator = document.getElementById(`indicator-${step}`);
    if (indicator) {
        indicator.classList.add('active');
        indicator.classList.remove('text-slate-400');
        indicator.classList.add('text-indigo-600');
    }
}

// Schedule Configuration Logic
const timingMatrix = document.getElementById('timing-matrix');

function renderTimingRows(count) {
    timingMatrix.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const row = document.createElement('div');
        row.className = "flex items-center space-x-3 p-3 bg-white rounded-lg border border-slate-200 animate-fade-in";
        
        // Default labels and times for demo
        const defaultLabel = i === 3 ? "Lunch Break" : `Period ${i > 3 ? i : i + 1}`;
        const isBreak = i === 3;
        const start = 8 + i;
        const end = 9 + i;

        row.innerHTML = `
            <div class="flex-1">
                <input type="text" class="period-label w-full text-sm font-medium border-0 focus:ring-0 p-0" placeholder="Label" value="${defaultLabel}">
            </div>
            <div class="flex items-center space-x-2">
                <input type="time" class="period-start text-xs border-slate-200 rounded" value="${String(start).padStart(2, '0')}:00">
                <span class="text-slate-400">-</span>
                <input type="time" class="period-end text-xs border-slate-200 rounded" value="${String(end).padStart(2, '0')}:00">
            </div>
            <div class="flex items-center border-l border-slate-100 pl-3 ml-1">
                <label class="flex items-center cursor-pointer">
                    <input type="checkbox" class="period-break sr-only peer" ${isBreak ? 'checked' : ''}>
                    <div class="w-8 h-4 bg-slate-200 rounded-full peer peer-checked:bg-amber-400 after:content-[''] after:absolute after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 after:mt-0.5 after:ml-0.5"></div>
                    <span class="ml-2 text-[10px] font-bold text-slate-400 peer-checked:text-amber-600 uppercase">Break</span>
                </label>
            </div>
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
            label: row.querySelector('.period-label').value || "Period",
            start_time: row.querySelector('.period-start').value,
            end_time: row.querySelector('.period-end').value,
            is_break: row.querySelector('.period-break').checked
        });
    });
}

// Class Tags Logic
const classInput = document.getElementById('class-input');
const classTagsContainer = document.getElementById('class-tags');

classInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        const value = this.value.trim();
        if (value && !state.classes.includes(value)) {
            state.classes.push(value);
            renderClassTags();
            // Re-render staff forms to update checkboxes
            updateAllStaffClassOptions();
            refreshClassTeacherDropdowns();
        }
        this.value = '';
    }
});

function renderClassTags() {
    classTagsContainer.innerHTML = '';
    if(state.classes.length === 0) {
        classTagsContainer.innerHTML = '<span class="text-slate-400 text-sm italic">No classes added yet.</span>';
        return;
    }
    state.classes.forEach(cls => {
        const tag = document.createElement('div');
        tag.className = "flex items-center space-x-1 bg-indigo-100 text-indigo-800 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm transition hover:shadow";
        tag.innerHTML = `
            <span>${cls}</span>
            <button type="button" onclick="removeClass('${cls}')" class="text-indigo-400 hover:text-indigo-900 focus:outline-none transition-colors ml-1">
                <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                </svg>
            </button>
        `;
        classTagsContainer.appendChild(tag);
    });
}

function removeClass(clsToRemove) {
    state.classes = state.classes.filter(c => c !== clsToRemove);
    renderClassTags();
    updateAllStaffClassOptions();
    refreshClassTeacherDropdowns();
}

function getClassOptionsHTML(selectedClasses = []) {
    if(state.classes.length === 0) {
        return '<p class="text-sm text-slate-400 italic">No classes defined yet. Go back to step 2.</p>';
    }
    return state.classes.map(c => {
        const isChecked = selectedClasses.includes(c) ? 'checked' : '';
        return `
        <label class="inline-flex items-center mr-4 mb-2 cursor-pointer">
            <input type="checkbox" value="${c}" ${isChecked} class="staff-class-checkbox h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded" />
            <span class="ml-2 text-sm text-slate-700">${c}</span>
        </label>`
    }).join('');
}

// Staff Logic
const staffContainer = document.getElementById('staff-container');

function addStaffForm() {
    const id = staffIdCounter++;
    
    const staffCard = document.createElement('div');
    staffCard.className = "staff-card bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative group animate-fade-in";
    staffCard.dataset.id = id;
    
    staffCard.innerHTML = `
        <button onclick="removeStaffForm(this)" class="absolute top-4 right-4 text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 focus:opacity-100" title="Remove Teacher">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
        
        <div class="grid md:grid-cols-2 gap-4 mb-4 pr-6">
            <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Teacher Name</label>
                <input type="text" class="staff-name w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. John Doe">
            </div>
            <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Subject</label>
                <input type="text" class="staff-subject w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Mathematics">
            </div>
        </div>
        
        <div class="grid md:grid-cols-2 gap-4 mb-4 pr-6">
            <div class="mb-4">
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Assign as Class Teacher</label>
                <select class="class-teacher-dropdown w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" onchange="refreshClassTeacherDropdowns(); updateSlotCounters();">
                    <option value="">-- None --</option>
                </select>
            </div>
            <div class="mb-4">
                <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Periods per Day</label>
                <input type="number" class="periods-per-day w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" value="1" min="1" oninput="updateSlotCounters()">
            </div>
        </div>

        <div class="border-t border-slate-100 pt-3">
            <label class="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Assign Classes</label>
            <div class="flex flex-wrap class-options-container" onchange="updateSlotCounters()">
                ${getClassOptionsHTML()}
            </div>
        </div>
    `;
    
    staffContainer.appendChild(staffCard);
    refreshClassTeacherDropdowns();
}

function updateAllStaffClassOptions() {
    document.querySelectorAll('.staff-card').forEach(card => {
        // preserve checked state
        const selectedClasses = Array.from(card.querySelectorAll('.staff-class-checkbox:checked')).map(cb => cb.value);
        const container = card.querySelector('.class-options-container');
        if (container) {
            container.innerHTML = getClassOptionsHTML(selectedClasses);
        }
    });
}

function removeStaffForm(button) {
    const card = button.closest('.staff-card');
    card.remove();
    refreshClassTeacherDropdowns();
    updateSlotCounters();
}

function updateSlotCounters() {
    const container = document.getElementById('slot-counters-container');
    const list = document.getElementById('slot-counters-list');
    
    if (state.classes.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    container.classList.remove('hidden');
    list.innerHTML = '';
    
    // Total available slots
    const dailyPeriods = parseInt(document.getElementById('period-count').value);
    const days = document.getElementById('include-saturday').checked ? 6 : 5;
    const totalPossible = dailyPeriods * days; // Subtract breaks? 
    
    // Calculate breaks
    let breakCount = 0;
    document.querySelectorAll('.period-break:checked').forEach(() => breakCount++);
    const totalSlotsPerClass = (dailyPeriods - breakCount) * days;

    const classFrequencies = {};
    state.classes.forEach(c => classFrequencies[c] = 0);
    
    document.querySelectorAll('.staff-card').forEach(card => {
        const freqPerDay = parseInt(card.querySelector('.periods-per-day')?.value || 1);
        const freqPerWeek = freqPerDay * days;
        const selectedClasses = Array.from(card.querySelectorAll('.staff-class-checkbox:checked')).map(cb => cb.value);
        selectedClasses.forEach(c => {
            if (classFrequencies[c] !== undefined) classFrequencies[c] += freqPerWeek;
        });
    });
    
    state.classes.forEach(c => {
        const used = classFrequencies[c];
        const isOver = used > totalSlotsPerClass;
        const isFull = used === totalSlotsPerClass;
        
        const counter = document.createElement('div');
        counter.className = `p-3 rounded-lg border flex flex-col ${isOver ? 'bg-red-50 border-red-200' : isFull ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`;
        counter.innerHTML = `
            <span class="text-[10px] font-bold text-slate-500 uppercase">${c}</span>
            <div class="flex items-end space-x-1">
                <span class="text-lg font-bold ${isOver ? 'text-red-600' : isFull ? 'text-emerald-600' : 'text-slate-900'}">${used}</span>
                <span class="text-xs text-slate-400 mb-1">/ ${totalSlotsPerClass} slots</span>
            </div>
        `;
        list.appendChild(counter);
    });
}

function refreshClassTeacherDropdowns() {
    const cards = document.querySelectorAll('.staff-card');
    
    // 1. Get all currently selected class teachers
    const takenClasses = new Set();
    cards.forEach(card => {
        const val = card.querySelector('.class-teacher-dropdown').value;
        if (val) takenClasses.add(val);
    });

    // 2. Update each dropdown
    cards.forEach(card => {
        const dropdown = card.querySelector('.class-teacher-dropdown');
        const currentValue = dropdown.value;
        
        dropdown.innerHTML = '<option value="">-- None --</option>';
        
        state.classes.forEach(cls => {
            // Include class if it's not taken, OR if it's the one currently selected in THIS dropdown
            if (!takenClasses.has(cls) || cls === currentValue) {
                const opt = document.createElement('option');
                opt.value = cls;
                opt.textContent = cls;
                if (cls === currentValue) opt.selected = true;
                dropdown.appendChild(opt);
            }
        });
    });
}

function collectStaffData() {
    state.staff = [];
    document.querySelectorAll('.staff-card').forEach(card => {
        const name = card.querySelector('.staff-name').value.trim();
        const subject = card.querySelector('.staff-subject').value.trim();
        const classes = Array.from(card.querySelectorAll('.staff-class-checkbox:checked')).map(cb => cb.value);
        const classTeacherFor = card.querySelector('.class-teacher-dropdown').value || null;
        const periodsPerDay = parseInt(card.querySelector('.periods-per-day').value) || 1;
        
        if (name && subject) {
            state.staff.push({ 
                name, 
                subject, 
                classes, 
                class_teacher_for: classTeacherFor,
                periods_per_day: periodsPerDay
            });
        }
    });
}

// API Call and Download
async function generatePDF(type) {
    const loader = document.getElementById('loader');
    loader.classList.remove('hidden');
    
    try {
        const response = await fetch(`${API_URL}/export/${type}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(state)
        });

        if (!response.ok) {
            throw new Error(`Failed to generate ${type} PDF. Maybe check the backend?`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${type}_timetable.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    } catch (error) {
        alert(error.message);
    } finally {
        loader.classList.add('hidden');
    }
}

// Initial render
renderClassTags();
renderTimingRows(8);
