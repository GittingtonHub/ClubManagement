<?php
 include_once 'users.php'
$email = $_POST["email"]
$password = $_POST["password"] // if these dont work, change post to server

$size = count($data)
$exists = 'false'
for ($x = 0; $x < $size ; $x++) {
  if $email == $data[$x]['email']
  {
    $exists = 'true';
    break;
  }
}

if ($exists == 'false')
    {
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        $query = "INSERT INTO users ('email', 'password_hash) VALUES ($email, $password_hash)";
        $stmt = $conn->prepare($query);
        $stmt->execute();

    }
else
    {
        $errorcode = 'email already exists!'
        echo ' <div class="alert alert-danger 
            alert-dismissible fade show" role="alert">
  
        <strong>Error!</strong> '. $errorcode.'
        <button type="button" class="close" 
            data-dismiss="alert" aria-label="Close"> 
            <span aria-hidden="true">×</span> 
        </button>
       </div> '; 
    }

?>