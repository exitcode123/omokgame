<?php
$host = 'localhost'; // 호스트 주소
$username = 'root'; // MySQL 사용자 이름
$password = ''; // MySQL 비밀번호
$database = 'coordinates'; // 사용할 데이터베이스 이름

// MySQL 서버에 연결
$conn = new mysqli($host, $username, $password, $database);

// 연결 확인
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// 여기에서 쿼리 또는 다른 작업을 수행
if(isset($_POST["coordinate"])){    //프론트엔드에서 POST로 coordinate라는 타입으로 보내면 됨
    $coordinate=$_POST['coordinate'];
    $sql = "INSERT INTO xy VALUE('$coordinate')";
    $result = $conn->query($sql);
}
if(isset($_POST["end"])){
    $sql = "SELECT * FROM xy";
    $arr=[];
    $sql = "SELECT * FROM xy";
    $result = $conn->query($sql);
    while($row = $result->fetch_assoc()) {
        array_push($arr,explode(' ',$row["xy"]));
    }

    $rresult=array(
        $coordinate="",
        $count=0
    );

    for($i=0;$i<count($arr);$i++)
    {
        for($j=0;$j<count($rresult);$j++){
            if($rresult[$j].$coordinate==$arr[$i]){
                $rresult[$j].$count++;
                break;
            }
        }
        array_push($rresult,array($coordinate=$arr[$i],$count=1));
    }
    $s="";
    for($j=0;$j<count($rresult);$j++){
        $s+=$rresult[$j].$coordinate+" "+strval($rresult[$j].$count)+" ";
    }
    echo $s;
}

if(isset($_POST["ggt"])){
    $sql = "DELETE FROM xy";
    $result = $conn->query($sql);
    $result->close();
}

$conn->close();

?>
