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
  //쿠키문자열을 객체로 바꿔주는 함수
  function parseCookies(cookiesString) {
    const cookies = {};
    if (cookiesString) {
      cookiesString.split(';').forEach((cookie) => {
        const parts = cookie.split('=');
        const name = parts.shift().trim();
        const value = decodeURI(parts.join('='));
        cookies[name] = value;
      });
    }
    return cookies;
  }
  
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 1초를 늦추는 함수
  async function delayedExecution() {
    await delay(1000);
  }
  //게임 결과를 계산하는 함수
  function gameresult(){

  }
  //배열 똑같은거 계산하는 함수
  function countDuplicates(arr) {
    var count = new Map();
    for(let i = 0; i<arr.length; i++){
      if(count.has(arr[i])){
        count.set(arr[i],count.get(arr[i])+1);
      }
      else{
        count.set(arr[i],1);
      }
    }
    
  }
  //1초에 한번씩 확률 보내고 20초가 지나면 좌표랑 결과를 보냄
  function showhwak_and_result(){
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

    const cookiesString = socket.request.headers.cookie;
    const cookies = parseCookies(cookiesString);
    for (let i = 0; i < 20; i++) {
      const query = "SELECT xy FROM xy";

      connection.query(query, (error, results) => {
      if (error) throw error;
        var array = result;
      

      });
      var result;
      io.to(cookies[roomid]).emit('hwak',result);
      delayedExecution();
    }
    //result에서 가장 높은 확률을 가지는 값을 hong이라고 함
    var hong;
    const sql = `INSERT INTO posts (xy) VALUES (${hong})`;
    connection.query(sql, (error) => {
      if (error) {
        console.error('Error inserting into users table: ' + error.stack);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
    })
    var gameresult = gameresult();
    if(gameresult===2 || gameresult===3){
      io.to(cookies[roomid]).emit('100choice',hong+to_string(gameresult));
    }
    else{
      io.to(cookies[roomid]).emit('100choice',hong);
    }
  }

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
      socket.to(element).emit('firstattack',result)
    }
  });
  });
  //선공을 만든이가 입력함(만약 참가자가 선공일 경우도 포함)
  socket.on('inputfirstattck',(result)=>{
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

  const query = `INSERT INTO posts (firstattack) VALUES (${result})`;
  connection.query(query, (error,result) => {
    if (error) {
      console.error('Error inserting into posts table: ' + error.stack);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
  });
  if(result===0){
    showhwak_and_result();
  }

  });
  //만든이가 선택할 때(선택하고 참가자 턴으로 넘어감)
  socket.on('onechoice',(coordinate)=>{
    const dbConnection1 = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'coordinate'
    });
    dbConnection1.connect((err) => {
      if (err) {
        console.error('Error connecting to MySQL: ' + err.stack);
        return;
      }
      console.log('Connected to MySQL as id ' + connection.threadId);
  });
    const sql = `INSERT INTO coordinate (xy) VALUES (${coordinate})`;
    connection.query(query, (error,result) => {
      if (error) {
        console.error('Error inserting into posts table: ' + error.stack);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
    });
    var result = gameresult();
    if(result===1 || result===3){
      for(let element of rooms[roomID].participants){
        socket.to(element).emit('onechoice',coordinate + to_string(result));
      }
    }
    else{
      for(let element of rooms[roomID].participants){
        socket.to(element).emit('onechoice',coordinate);
      showhwak_and_result();
      //다시 만든이 턴
      }
    }
  });

});

app.get('/',(req,res)=>{
    res.sendFile(__dirname+"/index.html");
});

app.get('/game', (req, res) => {
    res.sendfile(__dirname+"/test.html");
});

app.get('/post/:id', (req, res) => {
  const postId = req.params.id;
  res.cookie('roomid', postId,{ httpOnly: true });
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