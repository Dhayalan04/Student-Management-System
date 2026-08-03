const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const StudentModel = require('./models/Student');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'students.json');
let usingMongoose = false;

async function ensureDataStore() {
  await fs.promises.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.promises.access(DATA_FILE);
  } catch {
    await fs.promises.writeFile(DATA_FILE, '[]', 'utf8');
  }
}

async function readStore() {
  await ensureDataStore();
  const content = await fs.promises.readFile(DATA_FILE, 'utf8');
  return content.trim() ? JSON.parse(content) : [];
}

async function writeStore(students) {
  await ensureDataStore();
  await fs.promises.writeFile(DATA_FILE, JSON.stringify(students, null, 2), 'utf8');
}

function createQuery(items) {
  return {
    sort(sortObj) {
      const [[field, order]] = Object.entries(sortObj || {});
      const direction = order === -1 ? -1 : 1;
      items.sort((a, b) => {
        if (a[field] === b[field]) return 0;
        return a[field] < b[field] ? 1 * direction : -1 * direction;
      });
      return items;
    },
    then(resolve) {
      return Promise.resolve(resolve(items));
    },
    catch() {
      return Promise.resolve(items);
    },
  };
}

function buildValidationError(messageMap) {
  const err = new Error('Validation failed');
  err.name = 'ValidationError';
  err.errors = {};
  Object.entries(messageMap).forEach(([key, message]) => {
    err.errors[key] = { message };
  });
  return err;
}

function buildDuplicateError(message) {
  const err = new Error(message);
  err.code = 11000;
  return err;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidSearchFilter(filter) {
  return filter && filter.$or && Array.isArray(filter.$or);
}

function doesStudentMatchSearch(student, search) {
  const regex = new RegExp(search, 'i');
  return [student.name, student.rollNumber, student.course].some((value) => regex.test(value || ''));
}

async function validateStudentData(payload, existingId = null) {
  const errors = {};
  if (!payload.name || !payload.name.trim()) {
    errors.name = 'Student name is required';
  }
  if (!payload.email || !payload.email.trim()) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(payload.email.trim())) {
    errors.email = 'Please enter a valid email';
  }
  if (!payload.rollNumber || !payload.rollNumber.trim()) {
    errors.rollNumber = 'Roll number is required';
  }
  if (!payload.course || !payload.course.trim()) {
    errors.course = 'Course is required';
  }
  if (payload.age !== undefined && payload.age !== null && payload.age !== '') {
    const age = Number(payload.age);
    if (Number.isNaN(age) || age < 10 || age > 100) {
      errors.age = 'Age must be a number between 10 and 100';
    }
  }

  const students = await readStore();

  const emailConflict = students.find((student) => {
    if (existingId && student._id === existingId) return false;
    return student.email.toLowerCase() === String(payload.email || '').trim().toLowerCase();
  });
  const rollConflict = students.find((student) => {
    if (existingId && student._id === existingId) return false;
    return student.rollNumber.toLowerCase() === String(payload.rollNumber || '').trim().toLowerCase();
  });

  if (emailConflict) {
    errors.email = 'A student with this email already exists';
  }
  if (rollConflict) {
    errors.rollNumber = 'A student with this roll number already exists';
  }

  if (Object.keys(errors).length > 0) {
    return buildValidationError(errors);
  }
  return null;
}

async function connectToDatabase() {
  const uri = process.env.MONGO_URI;
  if (!uri || uri.includes('<')) {
    console.warn('No valid MONGO_URI found. Falling back to local JSON storage.');
    await ensureDataStore();
    return;
  }

  try {
    await mongoose.connect(uri);
    usingMongoose = true;
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.warn('MongoDB connection failed. Falling back to local JSON storage.');
    console.warn(err.message);
    await ensureDataStore();
  }
}

const Student = {
  find(filter = {}) {
    if (usingMongoose) {
      return StudentModel.find(filter);
    }

    const query = readStore().then((students) => {
      if (isValidSearchFilter(filter)) {
        const searchClause = filter.$or.find((clause) => clause.name || clause.rollNumber || clause.course);
        const search = searchClause ? searchClause.name?.$regex || searchClause.rollNumber?.$regex || searchClause.course?.$regex : '';
        return students.filter((student) => doesStudentMatchSearch(student, search));
      }
      return students;
    });

    return {
      sort(sortObj) {
        return query.then((items) => createQuery(items).sort(sortObj));
      },
      then(resolve) {
        return query.then(resolve);
      },
      catch(reject) {
        return query.catch(reject);
      },
    };
  },

  async findById(id) {
    if (usingMongoose) {
      return StudentModel.findById(id);
    }
    const students = await readStore();
    return students.find((student) => student._id === id) || null;
  },

  async create(payload) {
    if (usingMongoose) {
      return StudentModel.create(payload);
    }
    const validationError = await validateStudentData(payload);
    if (validationError) throw validationError;

    const students = await readStore();
    const now = new Date().toISOString();
    const student = {
      _id: crypto.randomUUID(),
      name: String(payload.name || '').trim(),
      email: String(payload.email || '').trim().toLowerCase(),
      rollNumber: String(payload.rollNumber || '').trim(),
      course: String(payload.course || '').trim(),
      age: payload.age !== undefined && payload.age !== null && payload.age !== '' ? Number(payload.age) : undefined,
      phone: payload.phone ? String(payload.phone).trim() : '',
      address: payload.address ? String(payload.address).trim() : '',
      enrollmentDate: payload.enrollmentDate ? new Date(payload.enrollmentDate).toISOString() : now,
      createdAt: now,
      updatedAt: now,
    };
    students.unshift(student);
    await writeStore(students);
    return student;
  },

  async findByIdAndUpdate(id, payload) {
    if (usingMongoose) {
      return StudentModel.findByIdAndUpdate(id, payload, { new: true, runValidators: true });
    }
    const students = await readStore();
    const index = students.findIndex((student) => student._id === id);
    if (index === -1) return null;

    const existing = students[index];
    const validationError = await validateStudentData(payload, id);
    if (validationError) throw validationError;

    const updated = {
      ...existing,
      ...payload,
      name: payload.name !== undefined ? String(payload.name).trim() : existing.name,
      email: payload.email !== undefined ? String(payload.email).trim().toLowerCase() : existing.email,
      rollNumber: payload.rollNumber !== undefined ? String(payload.rollNumber).trim() : existing.rollNumber,
      course: payload.course !== undefined ? String(payload.course).trim() : existing.course,
      age: payload.age !== undefined && payload.age !== null && payload.age !== '' ? Number(payload.age) : existing.age,
      phone: payload.phone !== undefined ? String(payload.phone).trim() : existing.phone,
      address: payload.address !== undefined ? String(payload.address).trim() : existing.address,
      updatedAt: new Date().toISOString(),
    };

    students[index] = updated;
    await writeStore(students);
    return updated;
  },

  async findByIdAndDelete(id) {
    if (usingMongoose) {
      return StudentModel.findByIdAndDelete(id);
    }
    const students = await readStore();
    const index = students.findIndex((student) => student._id === id);
    if (index === -1) return null;
    const [deleted] = students.splice(index, 1);
    await writeStore(students);
    return deleted;
  },
};

module.exports = { connectToDatabase, Student };