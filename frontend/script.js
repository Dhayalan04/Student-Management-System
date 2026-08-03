// Base URL of the backend REST API.
// Since the backend also serves this frontend as static files, a relative
// path works both in production and local development on the same origin.
const API_URL = '/api/students';

// DOM references
const form = document.getElementById('student-form');
const formTitle = document.getElementById('form-title');
const studentIdField = document.getElementById('student-id');
const nameField = document.getElementById('name');
const emailField = document.getElementById('email');
const rollNumberField = document.getElementById('rollNumber');
const courseField = document.getElementById('course');
const ageField = document.getElementById('age');
const phoneField = document.getElementById('phone');
const addressField = document.getElementById('address');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');
const formMessage = document.getElementById('form-message');
const tbody = document.getElementById('students-tbody');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');

let isEditMode = false;
let debounceTimer = null;

// ---------- API helpers ----------

async function fetchStudents(query = '') {
  try {
    const url = query ? `${API_URL}?search=${encodeURIComponent(query)}` : API_URL;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to load students');
    renderStudents(data.data);
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

async function createStudent(payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function updateStudent(id, payload) {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function deleteStudent(id) {
  const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  return res.json();
}

// ---------- Rendering ----------

function renderStudents(students) {
  tbody.innerHTML = '';

  if (!students || students.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  students.forEach((student) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(student.rollNumber)}</td>
      <td>${escapeHtml(student.name)}</td>
      <td>${escapeHtml(student.email)}</td>
      <td>${escapeHtml(student.course)}</td>
      <td>${student.age ?? '-'}</td>
      <td>${escapeHtml(student.phone || '-')}</td>
      <td class="actions-cell">
        <button class="btn btn-edit" data-id="${student._id}">Edit</button>
        <button class="btn btn-danger" data-id="${student._id}">Delete</button>
      </td>
    `;

    tr.querySelector('.btn-edit').addEventListener('click', () => startEdit(student));
    tr.querySelector('.btn-danger').addEventListener('click', () => confirmDelete(student._id, student.name));

    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = `message ${type}`;
  setTimeout(() => {
    formMessage.className = 'message';
  }, 3500);
}

// ---------- Form logic ----------

function getFormPayload() {
  return {
    name: nameField.value.trim(),
    email: emailField.value.trim(),
    rollNumber: rollNumberField.value.trim(),
    course: courseField.value.trim(),
    age: ageField.value ? Number(ageField.value) : undefined,
    phone: phoneField.value.trim(),
    address: addressField.value.trim(),
  };
}

function resetForm() {
  form.reset();
  studentIdField.value = '';
  isEditMode = false;
  formTitle.textContent = 'Add New Student';
  submitBtn.textContent = 'Add Student';
  cancelBtn.classList.add('hidden');
}

function startEdit(student) {
  isEditMode = true;
  studentIdField.value = student._id;
  nameField.value = student.name;
  emailField.value = student.email;
  rollNumberField.value = student.rollNumber;
  courseField.value = student.course;
  ageField.value = student.age || '';
  phoneField.value = student.phone || '';
  addressField.value = student.address || '';

  formTitle.textContent = `Edit Student: ${student.name}`;
  submitBtn.textContent = 'Update Student';
  cancelBtn.classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function confirmDelete(id, name) {
  if (!confirm(`Delete student "${name}"? This cannot be undone.`)) return;
  try {
    const data = await deleteStudent(id);
    if (!data.success) throw new Error(data.message);
    showMessage('Student deleted successfully.', 'success');
    fetchStudents(searchInput.value.trim());
  } catch (err) {
    showMessage(err.message, 'error');
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = getFormPayload();

  try {
    let data;
    if (isEditMode) {
      data = await updateStudent(studentIdField.value, payload);
    } else {
      data = await createStudent(payload);
    }

    if (!data.success) throw new Error(data.message || 'Something went wrong');

    showMessage(isEditMode ? 'Student updated successfully.' : 'Student added successfully.', 'success');
    resetForm();
    fetchStudents(searchInput.value.trim());
  } catch (err) {
    showMessage(err.message, 'error');
  }
});

cancelBtn.addEventListener('click', resetForm);

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    fetchStudents(searchInput.value.trim());
  }, 300);
});

// Initial load
fetchStudents();
