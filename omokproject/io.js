const Server = require("socket.io");
const session = require('express-session');
const express = require("express");
const http = require("http");
const mysql = require('mysql2/promise');
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
    domain: '192.168.0.102', // 변경할 도메인 설정
    secure: false, // HTTPS를 사용할 때 true로 변경
    httpOnly: false, // JavaScript에서 쿠키에 접근 불가능
    sameSite: 'strict', // SameSite 설정
  },
}));
app.use(express.json()); 

const rooms = {};
const io = Server(server);

async function runQuery(sql,db) {
  // MySQL 데이터베이스 연결 설정
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: db
  });

  try {
    // 쿼리 실행
    const [rows, fields] = await connection.query(sql);
    
    // 여기에 다음 작업을 추가할 수 있습니다.
    
    return rows;
  } catch (error) {
    // 에러 처리
    console.error('Error querying the database:', error);
    throw error;
  } finally {
    // 연결 종료
    await connection.end();
  }
}

//웹소켓이 연결되면 시작됨
io.on("connection", (socket)=>{

  // 쿠키 값 중에서 roomid 가져오기
  const cookies = socket.request.headers.cookie;
  var arr123 = cookies.split("; ");
  var arr12 = [];
  var roomId;
  for (let a of arr123){
    arr12.push(a.split("="));
  }
  for(var i = 0 ; i < arr12.length ; i++){
    if(arr12[i][0]==="roomid"){
      roomId = arr12[i][1];
    }
  }

  
  //게임 결과를 계산하는 함수
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
        return '0';
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
  async function gameresult(){

    var sql = `SELECT gameresult FROM ${String(roomId) + "gameresult"}`;
    runQuery(sql,"coordinate").then( (result)=>{
      var gr = result.map(row => row.gameresult);
      return checkWinner(gr);
    })

    
    

    // var connection = mysql.createConnection({
    //   host: 'localhost',
    //   user: 'root',
    //   password: '',
    //   database: 'coordinate',
    // });
    // connection.connect((err) => {
    //     if (err) {
    //       console.error('Error connecting to MySQL: ' + err.stack);
    //       return;
    //     }
    //     console.log('Connected to MySQL as id ' + connection.threadId);
    // });
    // var query = `SELECT gameresult FROM ${String(roomId)+"gameresult"}`;
    // connection.query(query, (error,result) => {
    //   if (error) {
    //     console.error('Error inserting into posts table: ' + error.stack);
    //     res.status(500).json({ error: 'Internal Server Error' });
    //     return;
    //   }
    //   gr = result.map(row => row.gameresult);
      
    //   console.log("1");
    // });
  }


  //배열 똑같은거 계산하는 함수 (완)
  function countDuplicates(arr) {
    var count = new Map();
    var arrlen = arr.length;
    for(let i = 0; i<arrlen; i++){
      if(count.has(arr[i])){
        count.set(arr[i],count.get(arr[i])+1);
      }
      else{
        count.set(arr[i],1);
      }
    }
    for(let key of count.keys()){
      count.set(key,Math.floor((count.get(key)/arrlen)*100));
    }

    var result = "";

    for(let key of count.keys()){
      result += key + " " + String(count.get(key)) + " ";
    }
    return result;
  }
  //hong 계산 (완)
  function calhong(arr) {

    var count = new Map();
    var arrlen = arr.length;

    //count에 좌표와 개수를 저장함
    for(let i = 0; i<arrlen; i++){
      if(count.has(arr[i])){
        count.set(arr[i],count.get(arr[i])+1);
      }
      else{
        count.set(arr[i],1);
      }
    }

    var resultarr = [];
    var maxValue = 0;

    //count에서 개수가 가장 많은 좌표를 resultarr에 저장함
    for (let key of count.keys()){
      if(maxValue<count.get(key)){
        resultarr=[key];
      }
      else if(maxValue===count.get(key)){
        resultarr.push(key);
      }
    }

    //resultarr에 있는 것 중 랜덤으로 하나 정함
    var rand = Math.floor(Math.random()*resultarr.length);
    return resultarr[rand];
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

    //1초에 한번 좌표, 확률 보냄 (완)
    // for (let i = 0; i < 20; i++) {
    //   const query = `SELECT xy FROM ${String(roomId)+"xy"}`;  //const simplifiedResult = result.map(row => row.xy);
    //   connection.query(query, (error, results) => {
    //     if (error) throw error;

    //     var result = countDuplicates(results);
    //     io.to(roomId).emit('hwak',result);
    //   });
    //   delayedExecution();
    // }

    // let counter = 0;
    // const intervalId = setInterval(() => {
    //   const query = `SELECT xy FROM ${String(roomId)+"xy"}`;  //const simplifiedResult = result.map(row => row.xy);
    //   connection.query(query, (error, results) => {
    //     if (error) throw error;

    //     const simplifiedResult = results.map(row => row.xy);
    //     var result = countDuplicates(simplifiedResult);
    //     io.to(roomId).emit('hwak',result);
    //   });
    //   counter++;
  
    //   // 20번 보냈으면 clearInterval을 호출하여 인터벌을 중지합니다.
    //   if (counter === 20) {
    //     clearInterval(intervalId);
    //   }
    // }, 1000);

    console.log("start");
    let counter = 0;
    const intervalId = setInterval(async () => {
      const query = `SELECT xy FROM ${String(roomId) + "xy"}`;

      try {
        const results = await new Promise((resolve, reject) => {
          connection.query(query, (error, results) => {
            if (error) {
              reject(error);
            } else {
              resolve(results);
            }
          });
        });

        const simplifiedResult = results.map(row => row.xy);
        const result = countDuplicates(simplifiedResult);
        io.to(roomId).emit('hwak', result);
      } catch (error) {
        console.error(error);
      }

      counter++;

      // 20번 보냈으면 clearInterval을 호출하여 인터벌을 중지합니다.
      if (counter === 20) {
        clearInterval(intervalId);
        var hong;

        const query1 = `SELECT xy FROM ${String(roomId)+"xy"}`;

        try {
          const results = await new Promise((resolve, reject) => {
            connection.query(query1, (error, results) => {
              if (error) {
                reject(error);
              } else {
                resolve(results);
              }
            });
          });
  
          const simplifiedResult = results.map(row => row.xy);
          hong = calhong(simplifiedResult);;
        } catch (error) {
          console.error(error);
        }

        // connection.query(query1, (error, results) => {
        //   if (error) throw error;
        //   const simplifiedResult = results.map(row => row.xy);

        //   hong = calhong(simplifiedResult);
        // });

        var sql = `INSERT INTO ${String(roomId)+"gameresult"} (gameresult) VALUE ("${hong}")`;
        connection.query(sql, (error) => {
          if (error) {
            console.error('Error inserting into users table13: ' + error.stack);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
          }
        })
        
        var gameresult1 = gameresult();

        io.to(roomId).emit('100choice',hong + " " + String(gameresult1));

        var sql = `DELETE FROM ${String(roomId)+"xy"};`;
        connection.query(sql, (error) => {
          if (error) {
            console.error('Error inserting into users table: ' + error.stack);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
          }
        })
      }
    }, 1000);
    //result에서 가장 높은 확률을 가지는 값을 hong이라고 함
    
  }

  const {url} = socket.request;
  console.log(`연결된: ${url}`);


  //방 참가하기(part) (완)
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
  //방 만들기(creator) (완)
  socket.on('createRoom', () => {
    rooms[roomId] = { creator: socket.id, participants: [socket.id] };
    socket.join(roomId);
    io.to(socket.id).emit('roomCreated', roomId);

    var query = "CREATE TABLE "+String(roomId)+"gameresult(gameresult VARCHAR(255)); ";
    runQuery(query,"coordinate");
    var query = "CREATE TABLE "+String(roomId)+"xy(xy VARCHAR(255)); ";
    runQuery(query,"coordinate");
  });
  //선공을 creator가 입력함(만약 part가 선공일 경우도 포함) (완)
  socket.on('inputfirstattack',(result)=>{
    const query = `UPDATE posts SET firstattack = ${result} WHERE id = ${roomId}`;
    runQuery(query,"gameroom");

    for(let element of rooms[roomId].participants)
    {
      socket.to(element).emit('firstattack',result)
    }

    //part가 선공일 때
    if(result===0){
      showhwak_and_result();
    }

  });
  //creator가 선택할 때(선택하고 part 턴으로 넘어감) (완)
  socket.on('onechoice',(coordinate)=>{
    const sql = `INSERT INTO ${String(roomId)+"gameresult"} (gameresult) VALUE ("${coordinate}")`;
    runQuery(sql,"coordinate").then(()=>{
      gameresult().then((result)=>{
        io.to(roomId).emit('onechoice',coordinate +" "+ result);
        if(result==='0')
          showhwak_and_result();
      });

      
    })
    


  });
  //part가 선택한 것을 데이터베이스에 넣음 (완)
  socket.on('hundredchoice',(coordinate)=>{

    const query = `INSERT INTO ${String(roomId)+"xy"} (xy) VALUE ("${coordinate}")`;
    runQuery(query,"coordinate");
  });
  //연결이 끊어지면 발생함
  socket.on('disconnect', () => {
  //   var dbConnection = mysql.createConnection({
  //     host: 'localhost',
  //     user: 'root',
  //     password: '',
  //     database: 'coordinate'
  //   });
  //   dbConnection.connect((err) => {
  //     if (err) {
  //       console.error('Error connecting to MySQL: ' + err.stack);
  //       return;
  //     }
  //     console.log('Connected to MySQL as id ' + dbConnection.threadId);
  //   });
  //   var query = `DROP TABLE ${String(roomId)+"xy"};`;
  //   dbConnection.query(query, (error,result) => {
  //     if (error) {
  //       console.error('Error inserting into posts table: ' + error.stack);
  //       res.status(500).json({ error: 'Internal Server Error' });
  //       return;
  //     }
  //   });
  //   var query = `DROP TABLE ${String(roomId)+"gameresult"};`;
  //   dbConnection.query(query, (error,result) => {
  //     if (error) {
  //       console.error('Error inserting into posts table: ' + error.stack);
  //       res.status(500).json({ error: 'Internal Server Error' });
  //       return;
  //     }
  //   });

  //   var dbConnection = mysql.createConnection({
  //     host: 'localhost',
  //     user: 'root',
  //     password: '',
  //     database: 'gameroom'
  //   });
  //   dbConnection.connect((err) => {
  //     if (err) {
  //       console.error('Error connecting to MySQL: ' + err.stack);
  //       return;
  //     }
  //     console.log('Connected to MySQL as id ' + dbConnection.threadId);
  //   });
  //   var query = `DELETE FROM posts WHERE id=${roomId};`;
  //   dbConnection.query(query, (error,result) => {
  //     if (error) {
  //       console.error('Error inserting into posts table: ' + error.stack);
  //       res.status(500).json({ error: 'Internal Server Error' });
  //       return;
  //     }
  //   });
  //   console.log(`delete ${roomId}`);
  });

});
//시작 화면(로그인, 회원가입, 로그아웃, 방 참가)
app.get('/',(req,res)=>{
    res.sendFile(__dirname+"/index.html");
});

app.get('/game', (req, res) => {
    res.sendFile(__dirname+"/test.html");
});
//게임 하는 곳
app.get('/post/:id', (req, res) => {
  const postId = req.params.id;
  res.cookie('roomid', postId,{ httpOnly: true });
  res.sendFile(__dirname+"/시청자.html");
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
app.get('/woo',(req,res)=>{
  res.sendFile(__dirname+"/우왁굳.html");
})
app.get('/si',(req,res)=>{
  res.sendFile(__dirname+"/시청자.html");
})
//게시글 생성
app.post('/posts', (req, res) => {
  const { title, author } = req.body;

  if (!title || !author) {
    res.status(400).json({ error: 'Title and author are required' });
    return;
  }

  const query = `INSERT INTO posts (title, author) VALUES (${title + ", " + author})`;
  runQuery(query,"gameroom").then(result=>{res.status(201).json({ 'id': result.insertId,'title': title,'author': author });})
  
  
  
});
//게시글을 보여줌
app.get('/posts', (req, res) => {
  const query = 'SELECT * FROM posts';
  runQuery(query,"gameroom").then(result=>{
    res.json(result);
  });


});
//로그인 함
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
  }

  const query = `SELECT * FROM users WHERE username = ${username} AND password = ${password}`;
  runQuery(query,"userdb").then(results=>{
    if (results.length === 1) {
      req.session.user = results[0]; // 세션에 사용자 정보 저장
      res.json({ message: 'Login successful' });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  })
  
  
  

});
//회원가입 함
app.post('/signup', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const query = `INSERT INTO users (username, password) VALUES (${username}, ${password})`;
  runQuery(query,"userdb");
});
//로그아웃 함
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logout successful' });
});

server.listen(5500, ()=> console.log("서버 시작"));