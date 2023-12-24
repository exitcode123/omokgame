// server.js

const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const app = express();
const cors = require("cors");
const port = 3000;
app.use(cors());

app.use(bodyParser.json());
app.use(session({
    secret: '1234',
    resave: false,
    saveUninitialized: true,
    cookie: {
      domain: '192.168.219.104', // 변경할 도메인 설정
      secure: false, // HTTPS를 사용할 때 true로 변경
      httpOnly: true, // JavaScript에서 쿠키에 접근 불가능
      sameSite: 'strict', // SameSite 설정
    },
  }));

//회원가입
app.post('/signup', (req, res) => {
    var connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'userdb',
    });
    connection.connect((err) => {
        if (err) {
          console.error('Error connecting to MySQL: ' + err.stack);
          return;
        }
        console.log('Connected to MySQL as id ' + connection.threadId);
    });
    const { username, password } = req.body;
  
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
  
    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
    connection.query(query, [username, password], (error) => {
      if (error) {
        console.error('Error inserting into users table: ' + error.stack);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      res.status(201).json({ message: 'Signup successful' });
    });
});
  
// 로그인
app.post('/login', (req, res) => {
    var connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'userdb',
    });
    connection.connect((err) => {
        if (err) {
          console.error('Error connecting to MySQL: ' + err.stack);
          return;
        }
        console.log('Connected to MySQL as id ' + connection.threadId);
    });
    const { username, password } = req.body;

    if (!username || !password) {
        res.status(400).json({ error: 'Username and password are required' });
        return;
    }

    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
    connection.query(query, [username, password], (error, results) => {
        if (error) {
        console.error('Error querying users table: ' + error.stack);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
        }

        if (results.length === 1) {
        req.session.user = results[0]; // 세션에 사용자 정보 저장
        res.json({ message: 'Login successful' });
        } else {
        res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});
  
// 로그아웃
app.post('/logout', (req, res) => {
req.session.destroy();
res.json({ message: 'Logout successful' });
});

app.get('/',(req,res)=>{
    res.sendFile(__dirname+"/index.html")
})

app.get('/post/:id', (req, res) => {
    const postId = req.params.id;
    // 여기에서는 실제로 데이터베이스에서 해당 ID의 게시글을 조회하여 보여주어야 합니다.
    // 여기서는 단순히 ID를 출력하도록 하겠습니다.
    res.send(`<h1>게시글 번호: ${postId}</h1>`);
});

//게시글을 보여줌
app.get('/posts', (req, res) => {
    var connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gameroom',
    });
    connection.connect((err) => {
        if (err) {
          console.error('Error connecting to MySQL: ' + err.stack);
          return;
        }
        console.log('Connected to MySQL as id ' + connection.threadId);
    });
  const query = 'SELECT * FROM posts';
  connection.query(query, (error, results) => {
    if (error) {
      console.error('Error querying database: ' + error.stack);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json(results);
  });
});

//게시글 생성
app.post('/posts', (req, res) => {
    var connection = mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gameroom',
    });
    connection.connect((err) => {
        if (err) {
          console.error('Error connecting to MySQL: ' + err.stack);
          return;
        }
        console.log('Connected to MySQL as id ' + connection.threadId);
    });
  const { title, author } = req.body;

  if (!title || !author) {
    res.status(400).json({ error: 'Title and author are required' });
    return;
  }

  const query = 'INSERT INTO posts (title, author) VALUES (?, ?)';
  connection.query(query, [title, author], (error, result) => {
    if (error) {
      console.error('Error inserting into database: ' + error.stack);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.status(201).json({ id: result.insertId, title, author });
  });
});

app.get('/user', (req, res) => {
    const user = req.session.user;
    console.log(req);
    console.log(req.session);
    if (user) {
      res.json({ username: user.username });
    } else {
      res.status(401).json({ error: 'Not logged in' });
    }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
