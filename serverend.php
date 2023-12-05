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

$arr=[];
$sql = "SELECT * FROM xy";
$result = $conn->query($sql);
while($row = $result->fetch_assoc()) {
    array_push($arr,$row["xy"]);
}
function countStringOccurrences($array) {
    
    $countMap = array();

    
    foreach ($array as $string) {
        
        $countMap[$string] = isset($countMap[$string]) ? $countMap[$string] + 1 : 1;
    }

    $s="";
    foreach ($countMap as $string => $count) {
       $s=$s.$string." ".strval(($count/count($array))*100)." ";
    }
    return $s;
}
$s=countStringOccurrences($arr);

header('content-Type: text/plain');

echo json_encode($s);

$conn->close();

?>
