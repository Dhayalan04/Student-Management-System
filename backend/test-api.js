const http = require('http');

function request(method, path, payload) {
  return new Promise((resolve, reject) => {
    const data = payload ? JSON.stringify(payload) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5050,
        method,
        path,
        headers: payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(data),
            }
          : {},
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode, body }));
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const post = await request('POST', '/api/students', {
      name: 'Test Student',
      email: 'test.student+' + Date.now() + '@example.com',
      rollNumber: 'TEST-' + Date.now(),
      course: 'Test Course',
      age: 30,
      phone: '1234567890',
      address: 'Test Address',
    });
    console.log('POST', post.statusCode, post.body);
    const get = await request('GET', '/api/students');
    console.log('GET', get.statusCode, get.body.slice(0, 500));
  } catch (err) {
    console.error(err);
  }
})();