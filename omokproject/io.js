const Server = require("socket.io");
const session = require('express-session');
const express = require("express");
const http = require("http");
const mysql = require('mysql');
const bodyParser = require('body-parser');

const app = express();
app.get("/client", (req,res)=> res.sendFile(__dirname+"/client.html"));
const server = http.createServer(app);
app.use(bodyParser.json());

app.use(session({
  secret: '1234',
  resave: false,
  saveUninitialized: true,
  cookie: {
    domain: 'localhost', // 변경할 도메인 설정
    secure: false, // HTTPS를 사용할 때 true로 변경
    httpOnly: true, // JavaScript에서 쿠키에 접근 불가능
    sameSite: 'strict', // SameSite 설정
  },
}));
app.use(express.json()); 

const rooms = {};


const io = Server(server);
io.on("connection", (socket)=>{
    const {url} = socket.request;
    console.log(`연결된: ${url}`);

    socket.on('session',(session_value)=>{
        const sessionID = JSON.parse(session_value);
        const dbConnection1 = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'userdb'
          });
          const sql = 'INSERT INTO sessions (session_ID, user_id) VALUES (?, ?)';
    });
    socket.on('wooclick',(coordinate)=>{
        socket.emit('wooclick',{'coordinate':coordinate})
    });
    //방 참가하기(참가자)
    socket.on('joinRoom', (roomID) => {
      if (rooms[roomID]) {
        rooms[roomID].participants.push(socket.id);
        socket.join(roomID);
        io.to(socket.id).emit('joinedRoom', roomID);
        io.to(rooms[roomID].creator).emit('participantJoined', {
          roomID,
          participantID: socket.id,
        });
      } else {
        io.to(socket.id).emit('roomNotFound', roomID);
      }
    });
    //방 만들기(만든이)
    socket.on('createRoom', (roomID) => {
      rooms[roomID] = { creator: socket.id, participants: [socket.id] };
      socket.join(roomID);
      io.to(socket.id).emit('roomCreated', roomID);
    });
    //선공을 참가자 한테 알려줌
    socket.on('alertfirstattack',(roomID)=>{
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
    const query = `SELECT firstattck FROM posts WHERE id=${roomID}`;
    connection.query(query, (error,result) => {
      if (error) {
        console.error('Error inserting into users table: ' + error.stack);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      for(let element of rooms[roomID].participants)
      {
        io.to(element).emit('firstattack',result)
      }
    });
    })
    //선공을 만든이가 입력함
    socket.on('inputfirstattck',(result)=>{
      
    })
});

app.get('/',(req,res)=>{
    res.sendFile(__dirname+"/index.html");
});

app.get('/game', (req, res) => {
    res.sendfile(__dirname+"/test.html");
});

app.get('/post/:id', (req, res) => {
  const postId = req.params.id;
  // 여기에서는 실제로 데이터베이스에서 해당 ID의 게시글을 조회하여 보여주어야 합니다.
  // 여기서는 단순히 ID를 출력하도록 하겠습니다.
  res.send(`<h1>게시글 번호: ${postId}</h1>`);
});

//세션id가져오는
app.get('/getSessionID', (req, res) => {
    res.json({ sessionID: req.sessionID });
});
//user이름 가져오는
app.get('/user', (req, res) => {
  const user = req.session.user;
  if (user) {
    res.json({ username: user.username });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
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
  res.status(201).json({ 'id': result.insertId,'title': title,'author': author });
});
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
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logout successful' });
});

server.listen(5500, ()=> console.log("서버 시작"));