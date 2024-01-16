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

//웹소켓이 연결되면 시작됨
io.on("connection", (socket)=>{

  // 쿠키 값 중에서 roomid 가져오기
  const cookies = socket.request.headers.cookie;
  const roomId = getCookieValue(cookies, "roomid");

  // 1초를 늦추는 함수
  async function delayedExecution() {
    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    await delay(1000);
  }
  //게임 결과를 계산하는 함수
  function gameresult(){

    var gr = [];
    var connection = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'coordinate',
    });
    connection.connect((err) => {
        if (err) {
          console.error('Error connecting to MySQL: ' + err.stack);
          return;
        }
        console.log('Connected to MySQL as id ' + connection.threadId);
    });
    var query = `SELECT gameresult FROM ${to_string(roomId)+"gameresult"}`;
    connection.query(query, (error,result) => {
      if (error) {
        console.error('Error inserting into posts table: ' + error.stack);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      for(let i=0;i<result.length;i++){
        gr.push(result[i].split(" "));
      }
    });

    function checkWinner(coords) {
      const boardSize = 15;
      const gameBoard = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
    
      for (let i = 0; i < coords.length; i++) {
        const row = coords[i][0];
        const col = coords[i][1];
    
        if (gameBoard[row][col] === 0) {
          gameBoard[row][col] = i % 2 === 0 ? 1 : 2;
        } else {
          // Invalid move, return undefined or handle appropriately
          return undefined;
        }
      }
    
      // Check for a win
      for (let i = 0; i < coords.length; i++) {
        const row = coords[i][0];
        const col = coords[i][1];
    
        if (checkWin(row, col, gameBoard)) {
          return i % 2 === 0 ? '1' : '2';
        }
      }

      if (coords.length===boardSize*boardSize) {
        return '3';
      }
      
      return '0';
    }
    
    function checkWin(row, col, board) {
      const currentPlayer = board[row][col];
    
      // Check horizontally
      if (countConsecutive(row, col, 0, 1, currentPlayer, board) >= 5) {
        return true;
      }
      // Check vertically
      if (countConsecutive(row, col, 1, 0, currentPlayer, board) >= 5) {
        return true;
      }
      // Check diagonally (/)
      if (countConsecutive(row, col, 1, 1, currentPlayer, board) >= 5) {
        return true;
      }
      // Check diagonally (\)
      if (countConsecutive(row, col, 1, -1, currentPlayer, board) >= 5) {
        return true;
      }
    
      return false;
    }
    
    function countConsecutive(row, col, rowIncrement, colIncrement, currentPlayer, board) {
      let count = 0;
    
      while (
        row >= 0 && row < board.length &&
        col >= 0 && col < board[row].length &&
        board[row][col] === currentPlayer
      ) {
        count++;
        row += rowIncrement;
        col += colIncrement;
      }
    
      return count;
    }
    
    return checkWinner(gr);
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
      database: 'coordinate',
    });
    connection.connect((err) => {
        if (err) {
          console.error('Error connecting to MySQL: ' + err.stack);
          return;
        }
        console.log('Connected to MySQL as id ' + connection.threadId);
    });

    for (let i = 0; i < 20; i++) {
      const query = `SELECT * FROM ${to_string(roomId)+"xy"}`;
      connection.query(query, (error, results) => {
      if (error) throw error;

      var result = countDuplicates(results);
      io.to(rooms[roomId]).emit('hwak',result);
      });
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


  //방 참가하기(참가자)
  socket.on('joinRoom', () => {
    if (rooms[roomId]) {
      rooms[roomId].participants.push(socket.id);
      socket.join(roomId);
      io.to(socket.id).emit('joinedRoom', roomId);
      io.to(rooms[roomId].creator).emit('participantJoined', {
        roomId,
        participantID: socket.id,
      });
    } else {
      io.to(socket.id).emit('roomNotFound', roomId);
    }
  });
  //방 만들기(만든이)
  socket.on('createRoom', () => {
    rooms[roomId] = { creator: socket.id, participants: [socket.id] };
    socket.join(roomId);
    io.to(socket.id).emit('roomCreated', roomId);

    var dbConnection = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'coordinate'
    });
    dbConnection.connect((err) => {
      if (err) {
        console.error('Error connecting to MySQL: ' + err.stack);
        return;
      }
      console.log('Connected to MySQL as id ' + connection.threadId);
    });
    var query = "CREATE TABLE "+to_string(roomId)+"gameresult(gameresult VARCHAR(255)); ";
    connection.query(query, (error,result) => {
      if (error) {
        console.error('Error inserting into posts table: ' + error.stack);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
    });
    var query = "CREATE TABLE "+to_string(roomId)+"xy(gameresult VARCHAR(255)); ";
    connection.query(query, (error,result) => {
      if (error) {
        console.error('Error inserting into posts table: ' + error.stack);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
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

    const query = `UPDATE posts SET firstattack = ${result} WHERE id = ${roomId}`;
    connection.query(query, (error,result) => {
      if (error) {
        console.error('Error inserting into posts table: ' + error.stack);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
    });

    for(let element of rooms[roomId].participants)
    {
      socket.to(element).emit('firstattack',result)
    }

    //part가 선공일 때
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
  //100명이 선택한 것을 데이터베이스에 넣음
  socket.on('hundredchoice',(coordinate)=>{
    var dbConnection = mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'coordinate'
    });
    dbConnection.connect((err) => {
      if (err) {
        console.error('Error connecting to MySQL: ' + err.stack);
        return;
      }
      console.log('Connected to MySQL as id ' + connection.threadId);
    });
    const query = `INSERT INTO ${to_string(roomId)+"xy"} (gameresult) VALUE (${coordinate})`;
    connection.query(query, (error,result) => {
      if (error) {
        console.error('Error inserting into posts table: ' + error.stack);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
    });
  });

});
//시작 화면(로그인, 회원가입, 로그아웃, 방 참가)
app.get('/',(req,res)=>{
    res.sendFile(__dirname+"/index.html");
});

app.get('/game', (req, res) => {
    res.sendfile(__dirname+"/test.html");
});
//게임 하는 곳
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
//로그인 함
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
//회원가입 함
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
//로그아웃 함
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logout successful' });
});

server.listen(5500, ()=> console.log("서버 시작"));