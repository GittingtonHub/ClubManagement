<?php
 include_once 'users.php';
$email = $_POST["email"];
$password = $_POST["password"];

$size = count($data);
$loginFound = 'false';
for ($x = 0; $x < $size ; $x++) {
  if ($email == $data[$x]['email'] && password_verify($password,$data[$x]['password'])) 
    //pw_verify compares password and stored password hash to see if theyre correct
  {
    //TO DO: return AUTH token here
    $loginFound = 'true';
    break;
  }
}


if ($loginFound = 'false')
    {
        $errorcode = 'Incorrect Login Info!'
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