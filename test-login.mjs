import md5 from 'md5';

async function testLogin() {
  const username = 'test';
  const password = 'test123';
  
  const salt = 'random123';
  const token = md5(password + salt);
  
  const params = new URLSearchParams({
    u: username,
    t: token,
    s: salt,
    v: '1.16.1',
    c: 'Musico',
    f: 'json'
  });

  const url = `http://localhost:5173/api/navidrome/rest/ping.view?${params.toString()}`;
  console.log('Fetching:', url);
  
  try {
    const res = await fetch(url);
    console.log('Status:', res.status, res.statusText);
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

testLogin();
